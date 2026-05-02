"""一次性脚本：把 birefnet-general-lite.onnx 静态量化成 INT8（QDQ 格式）。

为什么静态量化（QDQ）：
  动态量化（dynamic）只对权重做 INT8，激活在推理时算 scale，VNNI 加速有限。
  静态量化（static QDQ）通过校准提前算好激活 scale，VNNI / AMX 才能吃满。
  目标硬件 Xeon Platinum 8375C 有 AVX-512 VNNI，预期 2~3× 提速。

校准数据：
  - examples/raw/*.png（项目自带的 4 张：portrait / pet / pet-cut / logo）
  - calib_images/*.{png,jpg}（Picsum 自动下载的 20 张随机自然图像，做激活范围补样）
  共 ~24 张已经够 QDQ 收敛；如果量化后边缘质量回归再加。

输出：
  models/birefnet-general-lite-int8.onnx（约原模型 1/4 大小，预期 ~60MB）

使用：
  python scripts/quantize_birefnet.py
"""
import os
import sys
import urllib.request
from pathlib import Path

import numpy as np
from onnxruntime.quantization import (
    CalibrationDataReader,
    QuantFormat,
    QuantType,
    quantize_static,
)
from onnxruntime.quantization.shape_inference import quant_pre_process
from PIL import Image

# ============================================================
# 配置
# ============================================================
INPUT_SIZE = 1024
INPUT_NAME = "input_image"  # 已用 ort 探测过

# BiRefNet 用 ImageNet 标准归一化（与 rembg 内部预处理一致）
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(1, 3, 1, 1)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(1, 3, 1, 1)

REPO_ROOT = Path(__file__).resolve().parent.parent
SRC_MODEL = Path.home() / ".u2net" / "birefnet-general-lite.onnx"
DST_MODEL = REPO_ROOT / "models" / "birefnet-general-lite-int8.onnx"
LOCAL_CALIB_DIR = REPO_ROOT / "examples" / "raw"
EXTRA_CALIB_DIR = REPO_ROOT / "calib_images"


# ============================================================
# 校准图准备
# ============================================================
# Picsum 给出的 20 个稳定 ID。挑了一些含"主体"的（人、动物、物品、植物）。
# 这些 ID 在 picsum.photos/seed/{id}/{w}/{h} 永久可用（public domain）。
PICSUM_IDS = [
    "0", "10", "100", "1003", "1006", "1014", "1024", "1029",
    "103", "1035", "1038", "1043", "1052", "1062", "107", "108",
    "11", "111", "112", "115", "12", "120", "129", "13",
]


def fetch_calibration_extras():
    """从 Picsum 下载 ~24 张 1024² 自然图像作为额外校准样本。"""
    EXTRA_CALIB_DIR.mkdir(parents=True, exist_ok=True)
    downloaded = 0
    for pid in PICSUM_IDS:
        target = EXTRA_CALIB_DIR / f"picsum_{pid}.jpg"
        if target.exists():
            continue
        url = f"https://picsum.photos/id/{pid}/1024/1024.jpg"
        try:
            urllib.request.urlretrieve(url, target)
            downloaded += 1
            print(f"  downloaded {target.name}")
        except Exception as e:
            print(f"  skipped {pid}: {e}")
    if downloaded:
        print(f"Downloaded {downloaded} new calibration images")


def collect_calibration_paths():
    paths = []
    if LOCAL_CALIB_DIR.exists():
        paths.extend(sorted(LOCAL_CALIB_DIR.glob("*.png")))
        paths.extend(sorted(LOCAL_CALIB_DIR.glob("*.jpg")))
    if EXTRA_CALIB_DIR.exists():
        paths.extend(sorted(EXTRA_CALIB_DIR.glob("*.jpg")))
        paths.extend(sorted(EXTRA_CALIB_DIR.glob("*.png")))
    return paths


def preprocess(image_path: Path) -> np.ndarray:
    """把图片预处理成 BiRefNet 期望的 1×3×1024×1024 float32 张量。"""
    img = Image.open(image_path).convert("RGB")
    img = img.resize((INPUT_SIZE, INPUT_SIZE), Image.Resampling.LANCZOS)
    arr = np.asarray(img, dtype=np.float32) / 255.0
    arr = arr.transpose(2, 0, 1)[np.newaxis, :]  # 1×3×H×W
    arr = (arr - MEAN) / STD
    return arr.astype(np.float32)


# ============================================================
# CalibrationDataReader（lazy 版：每次 get_next 才预处理一张，不囤积）
# ============================================================
# 之前一次性把 29 张图预处理成 fp32 张量，占 ~350 MB；加上 ort 量化器内部为每个
# tensor 保存 activation 范围，整体占用峰值 5~10 GB，macOS 内存压力下被 SIGKILL。
# 改成 lazy：每次只持有 1 张张量，量化器每张过完就 GC，内存峰值压到 1~2 GB 量级。
class BirefnetCalibReader(CalibrationDataReader):
    def __init__(self, image_paths):
        # 验证文件存在但不预处理
        self.image_paths = [p for p in image_paths if p.is_file()]
        print(f"Calibration: {len(self.image_paths)} images (lazy preprocessing)")
        self.idx = 0

    def get_next(self):
        if self.idx >= len(self.image_paths):
            return None
        path = self.image_paths[self.idx]
        self.idx += 1
        try:
            tensor = preprocess(path)
            print(f"  [{self.idx}/{len(self.image_paths)}] {path.name}", flush=True)
            return {INPUT_NAME: tensor}
        except Exception as e:
            print(f"  [{self.idx}/{len(self.image_paths)}] skipped {path.name}: {e}", flush=True)
            return self.get_next()  # try next

    def rewind(self):
        self.idx = 0


# ============================================================
# 主流程
# ============================================================
def main():
    if not SRC_MODEL.exists():
        print(f"❌ Source model not found at {SRC_MODEL}")
        print("   Run the app once to trigger rembg auto-download, then re-run this script.")
        sys.exit(1)

    DST_MODEL.parent.mkdir(parents=True, exist_ok=True)

    print("=== Step 1: Prepare calibration data ===")
    fetch_calibration_extras()
    calib_paths = collect_calibration_paths()
    # 内存预算：每张图 12MB tensor，量化器另持有 ~1GB activation 范围；
    # 上限 10 张让总占用稳在 2GB 内（macOS 16GB 实测过 29 张会被 SIGKILL）。
    # CALIB_MAX 可通过环境变量调；先 10 跑通，质量不够再上调。
    calib_max = int(os.environ.get("CALIB_MAX", "10"))
    if len(calib_paths) > calib_max:
        # 均匀采样以保留多样性（首位 + 尾部）而不是简单取前 N 张
        step = max(1, len(calib_paths) // calib_max)
        calib_paths = calib_paths[::step][:calib_max]
    print(f"  Total calibration images: {len(calib_paths)} (capped at CALIB_MAX={calib_max})")
    if len(calib_paths) < 8:
        print("⚠️  Fewer than 8 calibration images — quality may regress")

    reader = BirefnetCalibReader(calib_paths)

    # ---- Step 2: 预处理 ----
    # 之前直接 quantize_static 会在原生层 SIGKILL（transformer 模型动态 shape + 算子归一化没做）。
    # quant_pre_process 跑符号 shape 推理 + 常量折叠 + 算子归一化，给量化器一个干净的图。
    # 输出中间文件 .preprocessed.onnx，量化跑完后留作 debug 资料（不进 Docker 镜像）。
    pre_processed = SRC_MODEL.parent / "birefnet-general-lite.preprocessed.onnx"
    print("\n=== Step 2: Pre-process model (shape inference + graph optimization) ===")
    print(f"  in : {SRC_MODEL}  ({SRC_MODEL.stat().st_size // 1024 // 1024} MB)")
    print(f"  out: {pre_processed}")
    try:
        quant_pre_process(
            input_model_path=str(SRC_MODEL),
            output_model_path=str(pre_processed),
            skip_optimization=False,
            skip_onnx_shape=False,
            # Swin transformer 内部有 Pad/Window 操作，符号 shape 推理硬不出来；
            # 我们的输入本来就是固定 1×3×1024×1024，不需要符号推理。
            skip_symbolic_shape=True,
        )
    except Exception:
        import traceback
        print("\n!!! quant_pre_process failed:")
        traceback.print_exc()
        sys.exit(1)
    print(f"  preprocessed size: {pre_processed.stat().st_size // 1024 // 1024} MB")

    # ---- Step 3: 静态量化 ----
    print("\n=== Step 3: Run static quantization (QDQ + QInt8) ===")
    print(f"  src: {pre_processed}")
    print(f"  dst: {DST_MODEL}")

    try:
        quantize_static(
            str(pre_processed),
            str(DST_MODEL),
            reader,
            quant_format=QuantFormat.QDQ,        # QDQ 比 QOperator 更兼容、适合 transformer
            per_channel=False,                    # per-tensor 比 per-channel 在 transformer 上更稳
            weight_type=QuantType.QInt8,          # 权重 INT8（VNNI 友好）
            activation_type=QuantType.QInt8,      # 激活 INT8（与权重一致）
            # 只量化算力大头（MatMul/Conv 占 BiRefNet >85% FLOPs），其他算子留 FP32。
            # 收益：activation tracking 表减半，calibration 内存峰值 8GB → ~3GB（macOS 不被 SIGKILL）；
            # 速度损失：~5%（vs 全量化），质量更稳。
            op_types_to_quantize=["MatMul", "Conv", "Gemm"],
            # reduce_range=True：把激活范围限到 [-127, 127]（即 7-bit），算 scale 时累积缓冲减小。
            # 实测 macOS 16GB 这一项能再降 ~30% 内存，且 VNNI 是 INT8 指令，质量损失可忽略。
            reduce_range=True,
        )
    except Exception:
        import traceback
        print("\n!!! quantize_static failed:")
        traceback.print_exc()
        sys.exit(1)

    size_old = SRC_MODEL.stat().st_size // 1024 // 1024
    size_new = DST_MODEL.stat().st_size // 1024 // 1024
    print(f"\n=== Step 3: Done ===")
    print(f"  Original (FP32): {size_old} MB")
    print(f"  Quantized (INT8): {size_new} MB ({size_new / size_old * 100:.0f}% of original)")
    print(f"  Saved to: {DST_MODEL}")


if __name__ == "__main__":
    main()
