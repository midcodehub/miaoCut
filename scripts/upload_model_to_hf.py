"""手动把量化好的 INT8 模型上传到 3 个 HF Space。

为什么不放 GitHub workflow：模型文件 ~108MB，超过 GitHub 普通 git 单文件上限（100MB）；
走 git-lfs 又要每次 workflow 都拉一遍大文件、推到 HF 还会触发 LFS 配置。
干脆模型由 owner 手动用 HF API 推一次，代码改动由 workflow 用 huggingface_hub.upload_folder
推增量。两条流水线解耦后部署快、出错少。

用法：
  export HF_TOKEN=hf_xxxxx     # 有 write 权限的 token
  python scripts/upload_model_to_hf.py

可选环境变量：
  HF_SPACES   逗号分隔的 space 名（默认 miao_cut,miao_cut2,miao_cut3）
  MODEL_PATH  本地模型路径（默认 models/birefnet-general-lite-int8.onnx）

模型变更后只需要重跑这个脚本；HF Space 会自动重新 build Docker（因为 Dockerfile 里 COPY
的文件 sha256 变了）。
"""
import os
import sys
import time
from pathlib import Path

from huggingface_hub import HfApi

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL = REPO_ROOT / "models" / "birefnet-general-lite-int8.onnx"
PATH_IN_REPO = "models/birefnet-general-lite-int8.onnx"


def main():
    token = os.environ.get("HF_TOKEN")
    if not token:
        sys.exit(
            "❌ HF_TOKEN env var not set.\n"
            "   Create a token at https://huggingface.co/settings/tokens (write scope),\n"
            "   then: export HF_TOKEN=hf_xxxxx"
        )

    model_path = Path(os.environ.get("MODEL_PATH", DEFAULT_MODEL))
    if not model_path.is_file():
        sys.exit(f"❌ Model file not found: {model_path}\n"
                 f"   Run scripts/quantize_birefnet.py first.")

    spaces_csv = os.environ.get("HF_SPACES", "miao_cut,miao_cut2,miao_cut3")
    spaces = [s.strip() for s in spaces_csv.split(",") if s.strip()]

    api = HfApi(token=token)
    size_mb = model_path.stat().st_size / 1024 / 1024
    print(f"Uploading {model_path.name} ({size_mb:.0f} MB) to {len(spaces)} space(s)...")

    for space in spaces:
        repo_id = f"midcodex/{space}"
        print(f"\n==> {repo_id}")
        t0 = time.perf_counter()
        api.upload_file(
            path_or_fileobj=str(model_path),
            path_in_repo=PATH_IN_REPO,
            repo_id=repo_id,
            repo_type="space",
            commit_message=f"Update INT8 quantized model ({size_mb:.0f} MB)",
        )
        elapsed = time.perf_counter() - t0
        print(f"    done in {elapsed:.0f}s")

    print(f"\n✅ All {len(spaces)} space(s) updated. Each will trigger a Docker rebuild.")


if __name__ == "__main__":
    main()
