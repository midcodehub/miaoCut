# ============================================================
# MiaoCut 后端 Dockerfile
# ============================================================
# 多阶段构建：builder 装依赖 → runtime 只拷成品，镜像更小。
#
# 构建：docker build -t miaocut-api .
# 运行：docker run -d --name miaocut \
#         -p 8000:8000 \
#         -e ALLOWED_ORIGINS=https://miaocut.pages.dev \
#         -e TRUST_PROXY=1 \
#         -e MAX_CONCURRENCY=2 \
#         -v miaocut-data:/app/data \
#         miaocut-api
# ============================================================

FROM python:3.12-slim AS builder

WORKDIR /build

# 先装依赖（利用 Docker 缓存，改代码不重装依赖）
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ============================================================
FROM python:3.12-slim

WORKDIR /app

# 系统依赖：opencv-python-headless 需要 libGL
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# 从 builder 拷贝已安装的 Python 包
COPY --from=builder /install /usr/local

# 拷贝应用代码
COPY main.py .
COPY index.html .
COPY output.css .
COPY app.js .
# SEO landing 子页：每加一个新子页要在这里追加一行
COPY product-photo-background-remover/ ./product-photo-background-remover/
COPY portrait-background-remover/ ./portrait-background-remover/

# 模型缓存目录（首次启动自动下载 BiRefNet ~230MB）
# 用 volume 持久化，避免每次重启都重新下载
ENV U2NET_HOME=/app/.u2net

# 反馈数据目录
VOLUME /app/data

# 单 worker，不要加 --workers！（限流和并发控制在进程内存里）
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
