"""量化后对比脚本：FP32 vs INT8 在同一张图上的耗时 + 视觉质量。

用法（量化后跑）：
  python scripts/bench_int8_vs_fp32.py

输出：
  - 控制台：两个模型的均值耗时 + 提速比
  - bench_out/{model}_dark.png / _white.png / _magenta.png：合成到不同底色的输出
    用来眼睛比对边缘是否退化（特别是发丝、半透明区）
"""
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image
from rembg import remove
from rembg.sessions import sessions_class

REPO_ROOT = Path(__file__).resolve().parent.parent
FP32_MODEL = Path.home() / ".u2net" / "birefnet-general-lite.onnx"
INT8_MODEL = REPO_ROOT / "models" / "birefnet-general-lite-int8.onnx"
TEST_IMAGE = REPO_ROOT / "examples" / "raw" / "pet.png"
OUT_DIR = REPO_ROOT / "bench_out"

BACKGROUNDS = {
    "dark": (45, 45, 45),
    "white": (255, 255, 255),
    "magenta": (200, 60, 220),
}


def make_session(model_path: Path):
    """构造 rembg session 并热替换 inner_session 为指定模型路径。"""
    cls = next((sc for sc in sessions_class if sc.name() == "birefnet-general-lite"), None)
    if cls is None:
        sys.exit("birefnet-general-lite session class not found in rembg")
    sess_opts = ort.SessionOptions()
    sess = cls("birefnet-general-lite", sess_opts, ["CPUExecutionProvider"])
    sess.inner_session = ort.InferenceSession(
        str(model_path), sess_options=sess_opts, providers=["CPUExecutionProvider"]
    )
    return sess


def composite_to_bg(rgba_bytes: bytes, bg_color: tuple, out_path: Path):
    """把 RGBA PNG 字节合成到指定底色，写文件。"""
    arr = np.frombuffer(rgba_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if img is None or img.shape[2] < 4:
        print(f"  skip composite (decode failed)")
        return
    fg = img[:, :, :3].astype(np.float32)
    a = img[:, :, 3:].astype(np.float32) / 255.0
    bg = np.full_like(fg, bg_color, dtype=np.float32)
    out = (fg * a + bg * (1 - a)).clip(0, 255).astype(np.uint8)
    cv2.imwrite(str(out_path), out)


def main():
    if not FP32_MODEL.exists():
        sys.exit(f"FP32 model missing: {FP32_MODEL}")
    if not INT8_MODEL.exists():
        sys.exit(f"INT8 model missing: {INT8_MODEL}\n  Run scripts/quantize_birefnet.py first.")
    if not TEST_IMAGE.exists():
        sys.exit(f"Test image missing: {TEST_IMAGE}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    raw = TEST_IMAGE.read_bytes()
    print(f"Test image: {TEST_IMAGE} ({Image.open(TEST_IMAGE).size})\n")

    results = {}
    for label, model_path in [("FP32", FP32_MODEL), ("INT8", INT8_MODEL)]:
        print(f"=== {label} ({model_path.stat().st_size//1024//1024} MB) ===")
        sess = make_session(model_path)
        # warmup
        out = remove(raw, session=sess, alpha_matting=False)
        # 3 次稳态计时
        times = []
        for _ in range(3):
            t0 = time.perf_counter()
            out = remove(raw, session=sess, alpha_matting=False)
            times.append((time.perf_counter() - t0) * 1000)
        avg = sum(times) / 3
        print(f"  inference x3: {[f'{t:.0f}ms' for t in times]}  avg={avg:.0f}ms")
        results[label] = avg

        # 合成到三种底色，便于眼睛对比
        for bg_name, bg_color in BACKGROUNDS.items():
            out_file = OUT_DIR / f"{label}_{bg_name}.png"
            composite_to_bg(out, bg_color, out_file)
        print(f"  output composites: {OUT_DIR}/{label}_*.png\n")

    speedup = results["FP32"] / results["INT8"]
    print(f"=== Speedup ===")
    print(f"  FP32: {results['FP32']:.0f} ms")
    print(f"  INT8: {results['INT8']:.0f} ms")
    print(f"  → INT8 is {speedup:.2f}× {'faster' if speedup > 1 else 'slower'}")
    print(f"\n请人工眼比对边缘质量：")
    for bg_name in BACKGROUNDS:
        print(f"  diff {OUT_DIR}/FP32_{bg_name}.png {OUT_DIR}/INT8_{bg_name}.png")


if __name__ == "__main__":
    main()
