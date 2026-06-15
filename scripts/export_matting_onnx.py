"""把 BiRefNet_lite-matting 导出成 onnxruntime-CPU 可跑的 ONNX（fur 档底座）。

为什么需要这个脚本：
  - fur 档想要"逐根毛丝的软 alpha"，得用抠图训练版 BiRefNet_lite-matting，而不是
    sharp 档那个分割版 birefnet-general-lite。
  - 官方 GitHub release 只放了 full-matting（swin_large, 973MB, CPU ~17-25s/张, 太慢）的 ONNX，
    lite-matting 只放了 PyTorch 权重（.pth / HF safetensors），**没有 ONNX**。所以得自己导。
  - lite-matting 与 lite-general 完全同架构，所以导出后体积一样 ~224MB、onnxruntime CPU 同速 ~9s。

两个踩坑（都已在本脚本里用 monkeypatch 解决，不需要手改任何安装包）：
  1) BiRefNet 解码器用了 torchvision 的可变形卷积 deform_conv2d。onnxruntime **不实现** ONNX 原生的
     DeformConv 算子，所以必须用 masamitsu-murase 的 deform_conv2d_onnx_exporter 把它**分解**成
     GatherND/ScatterND 等基础算子（这正是官方 lite-general.onnx 的做法，опset 17）。
  2) 该 exporter 是为旧版 torch 写的，在 torch 2.x 上有两处不兼容：
       - JitScalarType 的导入路径变了 → 回退到旧 dtype 分支后 KeyError；
       - 动态 shape 下 get_tensor_dim_size 返回 None → 相加报 TypeError。
     下面分别 monkeypatch 修掉。

一次性环境（仅离线导出需要，**不进 requirements.txt / 不进 Space 镜像**）：
    pip install "transformers>=4.40" timm einops kornia huggingface_hub safetensors \
                deform_conv2d_onnx_exporter onnx onnxruntime

用法：
    python scripts/export_matting_onnx.py
产物：models/birefnet-lite-matting.onnx（已 gitignore）。维护方式和 int8 一致：
  - 跑 scripts/upload_model_to_hf.py 把它推到三个 Space 的 models/ 目录
    （同一个脚本现在 int8 + matting 一起推）；Dockerfile 会像 int8 那样 COPY 进镜像；
  - 本地 cp 到 ~/.u2net/birefnet-lite-matting.onnx，fur 档即可直接生效。
"""
import time
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

import numpy as np
import torch
import torch.nn as nn

REPO_ID = "ZhengPeng7/BiRefNet_lite-matting"
SIZE = 1024
MEAN = (0.485, 0.456, 0.406)
STD = (0.229, 0.224, 0.225)
REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = REPO_ROOT / "models" / "birefnet-lite-matting.onnx"


def _patch_deform_conv_exporter():
    """让 deform_conv2d_onnx_exporter 在 torch 2.x 上能用（见模块顶部踩坑 2）。"""
    import deform_conv2d_onnx_exporter as dce

    # 踩坑 2a：torch 2.x 把 JitScalarType 挪了位置，注入回去让 exporter 走现代 dtype 分支
    from torch.onnx._internal.torchscript_exporter._type_utils import JitScalarType
    dce.JitScalarType = JitScalarType

    # 踩坑 2b：get_tensor_dim_size 在 trace 期可能返回 None，按 strides 兜底（官方 notebook 的补丁）
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
    """只输出最终 alpha（最后一路 side output 过 sigmoid），[1,1,H,W]。

    注意：sigmoid 烤进图里 → main.py 的 _run_matting_pipeline 直接拿输出当 alpha，不再 sigmoid。
    """

    def __init__(self, m):
        super().__init__()
        self.m = m

    def forward(self, x):
        out = self.m(x)
        if isinstance(out, (list, tuple)):
            out = out[-1]
        return out.sigmoid()


def main():
    _patch_deform_conv_exporter()

    from transformers import AutoModelForImageSegmentation
    print(f">> loading {REPO_ID} ...")
    model = AutoModelForImageSegmentation.from_pretrained(REPO_ID, trust_remote_code=True)
    model.float()   # 权重以 fp16 发布，CPU 导出需 fp32
    model.eval()
    wrapped = _Wrapper(model).eval()

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f">> exporting ONNX (opset 17, deform_conv 分解) -> {OUT_PATH}")
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

    print("\n下一步（和 int8 维护方式一致）：")
    print(f"  1) 把 {OUT_PATH} 手动传到三个 Space 的 models/ 目录（HF Web UI / huggingface-cli upload）")
    print(f"  2) cp {OUT_PATH} ~/.u2net/birefnet-lite-matting.onnx  # 本地 fur 档即可生效")


if __name__ == "__main__":
    main()
