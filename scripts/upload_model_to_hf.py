"""手动把 models/ 下的大模型 onnx 上传到 3 个 HF Space。

为什么不放 GitHub workflow：模型文件 ~100~224MB，超过 GitHub 普通 git 单文件上限（100MB）；
走 git-lfs 又要每次 workflow 都拉一遍大文件、推到 HF 还会触发 LFS 配置。
干脆模型由 owner 手动用 HF API 推一次，代码改动由 workflow 用 huggingface_hub.upload_folder
推增量。两条流水线解耦后部署快、出错少。

默认会把这两个模型都推上去（磁盘上有哪个推哪个，缺的跳过、不报错）：
  - models/birefnet-general-lite-int8.onnx （sharp 档 INT8，scripts/quantize_birefnet*.py 产出）
  - models/birefnet-lite-matting.onnx       （fur 档 matting，scripts/export_matting_onnx.py 产出）

用法：
  export HF_TOKEN=hf_xxxxx     # 有 write 权限的 token
  python scripts/upload_model_to_hf.py

可选环境变量：
  HF_SPACES    逗号分隔的 space 名（默认 miao_cut,miao_cut2,miao_cut3）
  MODEL_PATHS  逗号分隔的本地模型路径，覆盖默认列表（只想推某一个时用）
  MODEL_PATH   单个本地模型路径（向后兼容；等价于只填一个的 MODEL_PATHS）
  注：repo 内路径一律取文件名 → models/<basename>，所以加新模型只要往 DEFAULT_MODELS 加一行。

模型变更后只需要重跑这个脚本；HF Space 会自动重新 build Docker（因为 Dockerfile 里 COPY
的文件 sha256 变了）。
"""
import os
import sys
import time
from pathlib import Path

from huggingface_hub import HfApi

REPO_ROOT = Path(__file__).resolve().parent.parent
# 默认推送 models/ 下的这些 onnx；磁盘上存在哪个就推哪个，缺的跳过（不报错）。
# repo 内路径一律取文件名 → models/<basename>，所以加新模型只要往这里加一行。
DEFAULT_MODELS = [
    REPO_ROOT / "models" / "birefnet-general-lite-int8.onnx",  # sharp 档 INT8
    REPO_ROOT / "models" / "birefnet-lite-matting.onnx",       # fur 档 matting
    REPO_ROOT / "models" / "birefnet-general-lite-768.onnx",   # sharp 折中档（768²，默认底座）
]


def _resolve_models() -> list[Path]:
    """MODEL_PATHS（逗号分隔）> MODEL_PATH（单个，向后兼容）> DEFAULT_MODELS。"""
    env_paths = os.environ.get("MODEL_PATHS") or os.environ.get("MODEL_PATH")
    if env_paths:
        return [Path(p.strip()) for p in env_paths.split(",") if p.strip()]
    return DEFAULT_MODELS


def main():
    token = os.environ.get("HF_TOKEN")
    if not token:
        sys.exit(
            "❌ HF_TOKEN env var not set.\n"
            "   Create a token at https://huggingface.co/settings/tokens (write scope),\n"
            "   then: export HF_TOKEN=hf_xxxxx"
        )

    models = _resolve_models()
    present = [m for m in models if m.is_file()]
    for m in models:
        if not m.is_file():
            print(f"⚠️  skip (not found on disk): {m}")
    if not present:
        sys.exit("❌ No model files found to upload.\n"
                 "   Run scripts/quantize_birefnet*.py (int8) / scripts/export_matting_onnx.py (matting) "
                 "first, or set MODEL_PATH(S).")

    spaces_csv = os.environ.get("HF_SPACES", "miao_cut,miao_cut2,miao_cut3")
    spaces = [s.strip() for s in spaces_csv.split(",") if s.strip()]

    api = HfApi(token=token)
    print(f"Uploading {len(present)} model(s) to {len(spaces)} space(s)...")

    for space in spaces:
        repo_id = f"midcodex/{space}"
        print(f"\n==> {repo_id}")
        for model_path in present:
            path_in_repo = f"models/{model_path.name}"  # repo 内路径取文件名
            size_mb = model_path.stat().st_size / 1024 / 1024
            t0 = time.perf_counter()
            api.upload_file(
                path_or_fileobj=str(model_path),
                path_in_repo=path_in_repo,
                repo_id=repo_id,
                repo_type="space",
                commit_message=f"Update model {model_path.name} ({size_mb:.0f} MB)",
            )
            print(f"    {model_path.name} ({size_mb:.0f} MB) done in {time.perf_counter()-t0:.0f}s")

    print(f"\n✅ All {len(spaces)} space(s) updated. Each will trigger a Docker rebuild.")


if __name__ == "__main__":
    main()
