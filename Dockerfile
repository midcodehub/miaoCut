# ============================================================
# Dockerfile.openvino — OpenVINO EP variant (A/B image for one Space)
# ============================================================
# 与主 Dockerfile 唯一的差异（两处）：
#   1) builder 阶段：装完 requirements.txt 后，把 rembg[cpu] 顺带装进来的 onnxruntime 移除，
#      再装 onnxruntime-openvino。这个 wheel 里 bundle 了 OpenVINO 2025.4.1 CPU 内核，
#      同时保留标准 CPUExecutionProvider 作为兜底。
#      ⚠️ 不能把两个 wheel 共存：它们共享 top-level 模块名 `onnxruntime`，共存时
#         import 结果依赖安装顺序，行为不可预测——必须先 rm 掉旧的 site-packages 目录
#         再装新的（pip uninstall 在 --prefix 模式下不工作，故用 rm）。
#   2) 运行时 ENV 追加 USE_OPENVINO_EP=1，让 main.py 的 _resolve_providers() 首选
#      OpenVINOExecutionProvider，CPU EP 依然作为兜底（不可用时静默回退）。
#
# 其余（jemalloc、模型预置、big-lama 预下载、其他 ENV 变量）与主 Dockerfile 完全一致。
#
# ---- 构建 & 使用 ----
#   docker build -t miaocut-api-openvino -f Dockerfile.openvino .
#   # Space 端：把 3 个 Space 中的一个（e.g. miao_cut3）换成这个镜像做灰度，
#   # 另外两个继续跑默认 Dockerfile 做对照。
#
# ---- 期望收益（待 Space 端验证）----
#   BiRefNet-lite（Swin Transformer 结构）在 Xeon 8375C（含 AVX-512 VNNI）上，
#   OpenVINO CPU 内核对比 onnxruntime MLAS 通常快 1.5~3× at FP32。见
#   docs/cutout-perf-followups.md 的 §1 里的完整测量协议和决策规则。
#
# ---- 验证 checklist（部署后第一件事）----
#   看容器启动日志。main.py 的 _log_session_providers 会打印每个 session 用的 EP：
#     Session 'sharp/birefnet-general-lite-768' providers: ['OpenVINOExecutionProvider', 'CPUExecutionProvider']
#   如果看到 providers 只有 CPUExecutionProvider，说明 OpenVINO EP 未生效
#   （可能是 onnxruntime-openvino 装错了、USE_OPENVINO_EP=0 被下游覆盖了、或 EP 初始化失败），
#   参考 docs/cutout-perf-followups.md 的排错步骤。
#
# ---- 回退 ----
#   删除本文件、切回默认 Dockerfile 重建镜像即可。main.py 里没有任何 OpenVINO 专属代码——
#   `_resolve_providers()` 在 OpenVINO EP 不可用时自动回退到纯 CPU，完全对称。
# ============================================================

FROM python:3.11-slim AS builder

WORKDIR /build

# 构建阶段也会 import rembg/mediapipe/OpenCV 来预下载模型；缺 libGL 时 python -c 报错。
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# 先装完常规依赖（复用主 Dockerfile 的 requirements.txt，避免依赖表分叉维护）
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt && \
    # rembg[cpu] 会连带装 onnxruntime；OpenVINO 变体不能与之共存（同一 top-level 模块名）
    # pip uninstall 在 --prefix 模式下不工作，只能物理 rm site-packages 里的 onnxruntime 目录
    rm -rf /install/lib/python3.11/site-packages/onnxruntime* && \
    # 装 onnxruntime-openvino：wheel 里 bundle 了 OpenVINO 2025.4.1 CPU/GPU 库（Linux 单独 84MB wheel），
    # 不需要在系统层单独装 openvino。pin 到 >=1.20,<2.0 覆盖当前 stable 且避免大版本跳跃。
    pip install --no-cache-dir --prefix=/install "onnxruntime-openvino>=1.20,<2.0"

# 模型预下载：与主 Dockerfile 完全一致
RUN mkdir -p /model-cache && \
    U2NET_HOME=/model-cache \
    PYTHONPATH=/install/lib/python3.11/site-packages \
    python -c "from rembg.sessions import sessions_class; \
names=['isnet-general-use','birefnet-general-lite']; \
[print(next(sc for sc in sessions_class if sc.name()==n).download_models()) for n in names]"

# big-lama.pt（去水印 inpainting 模型，196MB）也预下载，避免容器重启后首个去水印请求触发 GitHub 下载
RUN PYTHONPATH=/install/lib/python3.11/site-packages \
    python -c "from torch.hub import download_url_to_file; \
download_url_to_file('https://github.com/enesmsahin/simple-lama-inpainting/releases/download/v0.1.0/big-lama.pt', '/model-cache/big-lama.pt')"

# ============================================================
FROM python:3.11-slim

# 与主 Dockerfile 同一套 apt 依赖（jemalloc 曾用过,后来发现 2 vCPU Space 上会拖慢 sharp 推理,已撤,见主 Dockerfile 注释）
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

# INT8 量化的 BiRefNet-lite 模型（详见主 Dockerfile 该行注释）
COPY --chown=user:user models/birefnet-general-lite-int8.onnx /opt/miaocut-models/

# fur 档 BiRefNet_lite-matting 模型（详见主 Dockerfile 该行注释）
COPY --chown=user:user models/birefnet-lite-matting.onnx /opt/miaocut-models/

# sharp 折中档 BiRefNet-general-lite @ 768² 模型（详见主 Dockerfile 该行注释）
COPY --chown=user:user models/birefnet-general-lite-768.onnx /opt/miaocut-models/

# ---- ENV：与主 Dockerfile 完全一致，只是最后加了 USE_OPENVINO_EP=1 ----
# USE_OPENVINO_EP=1 让 main.py 的 _resolve_providers() 首选 OpenVINOExecutionProvider，
# CPU EP 依然在 providers 列表末尾兜底——两者共存互不干扰。
# jemalloc 已从主 Dockerfile 撤回,本变体也一样,见主 Dockerfile 注释。
ENV PORT=7860 \
    U2NET_HOME=/opt/miaocut-models \
    LAMA_MODEL=/opt/miaocut-models/big-lama.pt \
    DATA_DIR=/data \
    MALLOC_ARENA_MAX=2 \
    MALLOC_TRIM_THRESHOLD_=131072 \
    USE_OPENVINO_EP=1

USER user

# 单 worker，不要加 --workers！（限流和并发控制在进程内存里）
EXPOSE 7860
CMD ["python", "main.py"]
