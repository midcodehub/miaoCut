"""动态量化 birefnet-general-lite：备用方案，不需要 calibration。

为什么用动态而非静态：
  静态量化（quantize_static + QDQ）需要在 calibration 阶段把整个模型的所有激活值
  跟踪一遍，对 BiRefNet 这种 233MB 大模型，单次 calibration 内存峰值 ~5~10GB，
  在 macOS 上会被内存压力 SIGKILL，无论给多少校准图都跑不通。

  动态量化（quantize_dynamic）只量化权重，激活保留 FP32 在推理时算 scale，没有
  calibration 阶段、内存峰值跟原模型相当。在 AVX-512 VNNI CPU 上预期 1.3~1.5×
  提速（不如静态的 2~3×，但稳）。

  如果以后能在 Linux 容器里跑静态量化，再切回 quantize_birefnet.py（静态版）。
"""
import sys
from pathlib import Path

from onnxruntime.quantization import QuantType, quantize_dynamic
from onnxruntime.quantization.shape_inference import quant_pre_process

REPO_ROOT = Path(__file__).resolve().parent.parent
SRC_MODEL = Path.home() / ".u2net" / "birefnet-general-lite.onnx"
DST_MODEL = REPO_ROOT / "models" / "birefnet-general-lite-int8.onnx"


def main():
    if not SRC_MODEL.exists():
        print(f"❌ Source model not found at {SRC_MODEL}")
        print("   Run the app once to trigger rembg auto-download, then re-run.")
        sys.exit(1)

    DST_MODEL.parent.mkdir(parents=True, exist_ok=True)

    # ---- Step 1: 预处理 ----
    # 与静态量化一样需要预处理（fix shape inference + graph optimize），
    # 否则 transformer 内部 dynamic shape 算子会让量化器算错。
    pre_processed = SRC_MODEL.parent / "birefnet-general-lite.preprocessed.onnx"
    if not pre_processed.exists():
        print(f"=== Step 1: Pre-process model ===")
        quant_pre_process(
            input_model_path=str(SRC_MODEL),
            output_model_path=str(pre_processed),
            skip_optimization=False,
            skip_onnx_shape=False,
            skip_symbolic_shape=True,  # Swin transformer 内部硬不出符号 shape，跳过
        )
        print(f"  preprocessed: {pre_processed.stat().st_size // 1024 // 1024} MB\n")
    else:
        print(f"=== Step 1: Skipped (preprocessed model exists at {pre_processed}) ===\n")

    # ---- Step 2: 动态量化 ----
    # 只对 MatMul/Conv/Gemm 这些"算力大头 + 权重大头"算子做权重量化。
    # 不传 op_types_to_quantize 的话默认全量化，但部分算子（如 LayerNorm）量化收益小、
    # 风险大，明确白名单更稳。
    print("=== Step 2: Dynamic quantization (weights only, no calibration) ===")
    print(f"  src: {pre_processed}")
    print(f"  dst: {DST_MODEL}")
    try:
        # ⚠️ 不要加 "Conv"！会生成 ConvInteger 算子，ORT CPU EP 没实现，运行时直接报错
        # NOT_IMPLEMENTED。BiRefNet 是 Swin transformer + 轻量 conv decoder，MatMul 占
        # >85% FLOPs，单独量化 MatMul/Gemm 已经能拿到大部分加速。
        # 想量化 Conv 必须走 QDQ 格式（quantize_static）+ Linux 容器。
        quantize_dynamic(
            model_input=str(pre_processed),
            model_output=str(DST_MODEL),
            op_types_to_quantize=["MatMul", "Gemm"],
            weight_type=QuantType.QInt8,  # 权重 INT8（VNNI 友好）
            reduce_range=True,             # 7-bit 实际范围；硬件兼容性最好
        )
    except Exception:
        import traceback
        print("\n!!! quantize_dynamic failed:")
        traceback.print_exc()
        sys.exit(1)

    src_mb = SRC_MODEL.stat().st_size // 1024 // 1024
    dst_mb = DST_MODEL.stat().st_size // 1024 // 1024
    print(f"\n=== Done ===")
    print(f"  Original FP32: {src_mb} MB")
    print(f"  Quantized INT8: {dst_mb} MB ({dst_mb / src_mb * 100:.0f}% of original)")
    print(f"  → {DST_MODEL}")


if __name__ == "__main__":
    main()
