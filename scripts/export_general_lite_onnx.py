"""把 BiRefNet-general-lite 在 768² 输入下重新导出成 onnxruntime-CPU 可跑的 ONNX（sharp 折中档底座）。

为什么需要这个脚本：
  - sharp 档要在"毛发边缘质量"和"CPU 速度"之间取折中：
      isnet-general-use            1.4s   毛尖被切平、边缘锯齿（硬边够用，软边露怯）
      birefnet-general-lite(1024)  12s    发丝级最细，但 2 vCPU 的 HF Space 上 25s+
      birefnet-general-lite-768    3.8s   毛丝清晰、接近 1024²，速度只要 1024² 的 ~1/3（甜点）
  - rembg 自带的 birefnet-general-lite.onnx 把输入**固定**成 1024²（[1,3,1024,1024]），没法直接喂
    768²，所以必须从 PyTorch 权重重新导出一个固定 768² 输入的 onnx。
  - 上游权重就是 rembg birefnet-general-lite 对应的 swin_v1_tiny general 版：ZhengPeng7/BiRefNet_lite。

与 fur 档 export_matting_onnx.py 的唯一区别：
  - REPO_ID 换成 general 分割版（不是 matting 版），SIZE 换成 768；
  - _Wrapper **不**把 sigmoid 烤进图（输出 raw logits），和 rembg 对 birefnet 的处理保持一致：
    main.py 的 _BiRefNet768Session.predict 会自己做 sigmoid + min-max 归一化。
  两个 deform_conv 的 torch 2.x 兼容 monkeypatch 与 export_matting_onnx.py 完全相同。

一次性环境（仅离线导出需要，**不进 requirements.txt / 不进 Space 镜像**）：
    pip install "transformers>=4.40" timm einops kornia huggingface_hub safetensors \
                deform_conv2d_onnx_exporter onnx onnxruntime

用法：
    python scripts/export_general_lite_onnx.py
产物：models/birefnet-general-lite-768.onnx（已 gitignore，~196MB）。维护方式和 int8 / matting 一致：
  1) 跑 scripts/upload_model_to_hf.py 把它推到三个 Space 的 models/ 目录；
     Dockerfile 会像 int8 / matting 那样 COPY 进镜像。
  2) cp models/birefnet-general-lite-768.onnx ~/.u2net/  # 本地 sharp 折中档即可生效
"""
import time
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

import numpy as np
import torch
import torch.nn as nn

REPO_ID = "ZhengPeng7/BiRefNet_lite"   # swin_v1_tiny general 分割版（= rembg birefnet-general-lite 权重源）
SIZE = 768
MEAN = (0.485, 0.456, 0.406)
STD = (0.229, 0.224, 0.225)
REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = REPO_ROOT / "models" / "birefnet-general-lite-768.onnx"


def _jit_scalar_type():
    """torch 不同版本 JitScalarType 的导入路径不一样，挨个试。"""
    for path in (
        "torch.onnx._internal.torchscript_exporter._type_utils",
        "torch.onnx._type_utils",
        "torch.onnx._internal._type_utils",
    ):
        try:
            return __import__(path, fromlist=["JitScalarType"]).JitScalarType
        except Exception:
            continue
    return None


def _patch_deform_conv_exporter():
    """让 deform_conv2d_onnx_exporter 在 torch 2.x 上能用（与 export_matting_onnx.py 同款补丁）。"""
    import deform_conv2d_onnx_exporter as dce

    js = _jit_scalar_type()
    if js is not None:
        dce.JitScalarType = js

    def _patched_dim(tensor, dim):
        size = dce.sym_help._get_tensor_dim_size(tensor, dim)
        if size is None and dim in (2, 3):
            import typing
            from torch import _C
            x_strides = typing.cast(_C.TensorType, tensor.type()).strides()
            size = x_strides[2] if dim == 3 else x_strides[1] // x_strides[2]
        elif size is None and dim == 0:
            import typing
            from torch import _C
            x_strides = typing.cast(_C.TensorType, tensor.type()).strides()
            size = x_strides[3]
        return size

    dce.get_tensor_dim_size = _patched_dim
    dce.register_deform_conv2d_onnx_op()


class _Wrapper(nn.Module):
    """只输出最终一路 side output 的 **raw logits**（不 sigmoid），[1,1,H,W]。

    注意：sigmoid 故意不烤进图 → main.py 的 _BiRefNet768Session.predict 自己 sigmoid + min-max，
    与 rembg BiRefNetSessionGeneral.predict 对 birefnet 的处理完全一致。
    """

    def __init__(self, m):
        super().__init__()
        self.m = m

    def forward(self, x):
        out = self.m(x)
        if isinstance(out, (list, tuple)):
            out = out[-1]
        return out


def main():
    _patch_deform_conv_exporter()

    from transformers import AutoModelForImageSegmentation
    print(f">> loading {REPO_ID} ...")
    model = AutoModelForImageSegmentation.from_pretrained(REPO_ID, trust_remote_code=True)
    model.float()   # 权重以 fp16 发布，CPU 导出需 fp32
    model.eval()
    wrapped = _Wrapper(model).eval()

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f">> exporting ONNX (opset 17, {SIZE}², deform_conv 分解) -> {OUT_PATH}")
    t0 = time.perf_counter()
    torch.onnx.export(
        wrapped, torch.randn(1, 3, SIZE, SIZE), str(OUT_PATH), verbose=False,
        input_names=["input_image"], output_names=["output_image"],
        opset_version=17, dynamo=False,
    )
    print(f"   export OK in {time.perf_counter()-t0:.1f}s  size={OUT_PATH.stat().st_size/1e6:.0f}MB")

    # 校验：图里不能有 DeformConv（否则 onnxruntime 跑不了）
    import onnx
    import collections
    ops = collections.Counter(n.op_type for n in onnx.load(str(OUT_PATH)).graph.node)
    assert "DeformConv" not in ops, "DeformConv 仍在图里，onnxruntime 无法运行；检查 deform_conv 分解是否生效"
    print(f"   ops check: DeformConv absent ✓ (GatherND={ops.get('GatherND',0)}, Conv={ops.get('Conv',0)})")

    # 一致性 + 速度：onnxruntime CPU vs PyTorch
    import onnxruntime as ort
    rng = np.random.default_rng(0)
    inp = rng.standard_normal((1, 3, SIZE, SIZE)).astype(np.float32)
    with torch.no_grad():
        ref = wrapped(torch.from_numpy(inp)).cpu().numpy()
    sess = ort.InferenceSession(str(OUT_PATH), providers=["CPUExecutionProvider"])
    name = sess.get_inputs()[0].name
    sess.run(None, {name: inp})  # warmup
    ts = []
    for _ in range(3):
        t = time.perf_counter()
        out = sess.run(None, {name: inp})[0]
        ts.append(time.perf_counter() - t)
    diff = np.abs(ref - out)
    print(f">> onnxruntime CPU: {min(ts):.2f}s/张 (best of 3)")
    print(f">> consistency vs PyTorch: max|diff|={diff.max():.5f} (应 ~0)")

    print("\n下一步（和 int8 / matting 维护方式一致）：")
    print(f"  1) python scripts/upload_model_to_hf.py   # 把 {OUT_PATH.name} 推到三个 Space 的 models/")
    print(f"  2) cp {OUT_PATH} ~/.u2net/   # 本地 sharp 折中档即可生效")


if __name__ == "__main__":
    main()
