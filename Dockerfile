# ============================================================
# MiaoCut 后端 Dockerfile（Hugging Face Docker Space）
# ============================================================
# 多阶段构建：builder 装依赖 → runtime 只拷成品，镜像更小。
#
# 构建：docker build -t miaocut-api .
# 运行：docker run --rm -p 7860:7860 \
#         -e PORT=7860 \
#         -e ALLOWED_ORIGINS=https://miaocut.app,https://www.miaocut.app \
#         -e TRUST_PROXY=1 \
#         -e MAX_CONCURRENCY=1 \
#         miaocut-api
# ============================================================

FROM python:3.12-slim AS builder

WORKDIR /build

# 构建阶段也会 import rembg/mediapipe/OpenCV 来预下载模型；
# slim 镜像默认没有 libGL，缺失时会在 builder 的 python -c 里失败。
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# 先装依赖（利用 Docker 缓存，改代码不重装依赖）
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# 构建阶段预下载 BiRefNet 模型，避免容器启动后首个请求再去 GitHub 下载。
# pip --prefix 安装的包不在 builder 默认 sys.path 中，所以显式设置 PYTHONPATH。
RUN mkdir -p /model-cache && \
    U2NET_HOME=/model-cache \
    PYTHONPATH=/install/lib/python3.12/site-packages \
    python -c "from rembg.sessions import sessions_class; cls = next(sc for sc in sessions_class if sc.name() == 'birefnet-general-lite'); print(cls.download_models())"

# ============================================================
FROM python:3.12-slim

# 系统依赖：MediaPipe/OpenCV 运行时需要 libGL/libglib。
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && \
    useradd -m -u 1000 user && \
    mkdir -p /home/user/app /data && \
    chown -R user:user /home/user/app /data && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /home/user/app

# 从 builder 拷贝已安装的 Python 包
COPY --from=builder /install /usr/local
COPY --from=builder --chown=user:user /model-cache /opt/miaocut-models

# 拷贝后端运行必需文件。前端由 Cloudflare Pages 托管，不放进 Space 镜像。
COPY --chown=user:user main.py .

# INT8 量化的 BiRefNet-lite 模型（~155 MB，由 scripts/quantize_birefnet_dynamic.py 离线生成）。
# main.py 检测到 .u2net/ 下有 birefnet-general-lite-int8.onnx 时会自动启用，
# 在 AVX-512 VNNI CPU（HF Space 的 Xeon 8375C 已确认有）上预期比 FP32 快 1.5~2.5×。
# 找不到该文件时静默回退到 FP32，本地 dev / 没跑量化的 build 都能正常运行。
COPY --chown=user:user models/birefnet-general-lite-int8.onnx /opt/miaocut-models/

# Hugging Face Spaces 默认公开 7860 端口；反馈数据写 /data 以便挂载持久化存储。
# 模型已内置到镜像；如果将来缺失，main.py 会自动退到可写缓存目录。
ENV PORT=7860 \
    U2NET_HOME=/opt/miaocut-models \
    DATA_DIR=/data \
    MALLOC_ARENA_MAX=2 \
    MALLOC_TRIM_THRESHOLD_=131072

USER user

# 单 worker，不要加 --workers！（限流和并发控制在进程内存里）
EXPOSE 7860
CMD ["python", "main.py"]
