"""
MiaoCut 后端：1 秒纯净抠图。

这是一个无登录的公网接口，防盗刷是重点。关键防护层（从外到内）：
  1. 反代/CDN（Nginx、Cloudflare 等，外部配置）：TLS、大包限制、黑名单。
  2. Origin/Referer 白名单：阻止第三方站点直接 fetch 白嫖我的接口。
  3. SlowAPI 限流（按"真实 IP"，IPv6 按 /64 段聚合）：扛爬虫。
  4. 请求体大小 + 图片像素上限：防内存炸弹。
  5. 并发信号量 + 线程池：防 rembg 把 worker 打满。

部署时至少要设置的环境变量：
  TRUST_PROXY=1                           # 有反向代理时必设
  ALLOWED_ORIGINS=https://miaocut.example # 逗号分隔
  MAX_UPLOAD_MB=10
  MAX_CONCURRENCY=4                       # 按机器内存拍，公式见下方注释
  ENABLE_DOCS=0                           # 生产关掉 /docs

部署方式：单机、单 uvicorn worker。
限流与并发控制都在进程内存里，不引入 Redis。对应地，必须跑单 worker：
  uvicorn main:app --host 0.0.0.0 --port 8000  # 不要加 --workers 2+

如果将来要扩到多 worker/多机，再引入 Redis（slowapi 支持 storage_uri）。
"""

import asyncio
import hashlib
import hmac
import io
import ipaddress
import json
import logging
import math
import os

# 【极度关键】解决 pip 安装 torch 后污染环境，导致 ONNX Runtime 性能下降 2-3 秒的问题！
# 哪怕我们用 ProcessPoolExecutor 把 PyTorch 隔离在了子进程，只要 `pip install torch` 跑过，
# 它带来的 Intel OpenMP (libiomp5.so) 就会被 ONNX Runtime 默认加载，取代原先的 libgomp.so。
# Intel OpenMP 默认策略是让空闲线程死循环空转（Active Spin），严重浪费 CPU 并拖慢并行效率！
# 这里必须强制所有 OpenMP 线程在闲置时立刻休眠（PASSIVE / 0），找回那丢失的 2 秒！
os.environ["OMP_WAIT_POLICY"] = "PASSIVE"
os.environ["KMP_BLOCKTIME"] = "0"

import re
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import quote
from concurrent.futures import ProcessPoolExecutor
import multiprocessing

import httpx
import onnxruntime as ort
import uvicorn
from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageFilter, ImageOps
from pydantic import BaseModel, Field
from rembg import remove
from rembg.sessions import sessions_class
# 注意：不要在顶层导入 PyTorch (SimpleLama)，否则会导致底层 OpenMP 线程池被 PyTorch 接管，
# 严重拖慢 ONNX Runtime (rembg) 的执行速度！我们在 startup 时再懒加载它。
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded


# ============================================================
# 配置（全部走环境变量，dev/prod 切换不用改代码）
# ============================================================
# 逗号分隔的源列表。示例：https://miaocut.com,https://www.miaocut.com
# 空集合表示不做来源校验（本地 dev 友好）
ALLOWED_ORIGINS = {o.strip().rstrip("/") for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()}
# 是否在反代之后。true 时从 X-Forwarded-For 取真实 IP；false（默认）用 socket 对端，防伪造头
TRUST_PROXY = os.getenv("TRUST_PROXY", "0") == "1"
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "10")) * 1024 * 1024
# 默认 4096x4096 ≈ 1677 万像素，覆盖 99% 手机和相机图
MAX_IMAGE_PIXELS = int(os.getenv("MAX_IMAGE_PIXELS", str(4096 * 4096)))
# 单进程同时跑的 rembg 任务上限。这是防止机器 OOM 的关键旋钮！
#
# 内存占用粗略估算（基于 IS-Net 模型 + alpha matting）：
#   常驻内存 ≈ 400MB（Python 进程 + FastAPI + IS-Net 模型权重 + onnxruntime）
#   每个并发任务峰值 ≈ 300~500MB
#     ├── 原始解码图片（4096×4096×4 ≈ 64MB）
#     ├── rembg 推理中间张量 + mask（约 100~200MB）
#     └── alpha matting 求解（约 100~200MB，kernel 较大时更高）
#
# 推荐取值（按机器总内存）：
#   1GB 机器  → MAX_CONCURRENCY=1，并严格限 MAX_IMAGE_PIXELS=2048×2048
#   2GB 机器  → MAX_CONCURRENCY=2
#   4GB 机器  → MAX_CONCURRENCY=4（默认）
#   8GB 机器  → MAX_CONCURRENCY=6~8
#
# 上线后 `htop` 看下 RSS 稳态 + 压测时峰值，按实际值再调。
MAX_CONCURRENCY = int(os.getenv("MAX_CONCURRENCY", "4"))
ENABLE_DOCS = os.getenv("ENABLE_DOCS", "0") == "1"
WARMUP_BIREFNET_ON_STARTUP = os.getenv("WARMUP_BIREFNET_ON_STARTUP", "1") == "1"
# INT8 动态量化开关：默认关闭。
# 实测在 HF Space Xeon 8375C（有 AVX-512 VNNI）上，动态 INT8 反而比 FP32 慢 ~2x（19s vs ~10s）：
# Swin Transformer 层数多，每层 activation 动态量化的 scale 计算开销叠加后
# 大于 VNNI 加速收益。M1 上快 4-5s 是因为模型体积减半节省了统一内存带宽，与量化本身无关。
# 如需在特定硬件上测试 INT8，设 ENABLE_INT8_MODEL=1 显式开启。
ENABLE_INT8_MODEL = os.getenv("ENABLE_INT8_MODEL", "0") == "1"



# 抠图 profile：决定 _run_rembg_sync 走哪条流水线。
#   sharp（默认）：BiRefNet 直出 + 温和 gamma 校正 + 1px 抗锯齿。
#                 ~1s/张（M1）/ ~2s/张（VPS），适合人物、商品、Logo 等"硬边"主体。
#   fur         ：BiRefNet + alpha matting + 前景色去污染。
#                 ~3~5s/张，单图内存峰值 +500MB；适合白猫/卷发/羽毛/植物等"软边"主体。
# 想做成"用户在前端按需选模式"时，把读取位置从环境变量改成 query/header 即可，pipeline 函数不感知。
_raw_profile = os.getenv("CUTOUT_PROFILE", "sharp").lower()
CUTOUT_PROFILE = _raw_profile if _raw_profile in ("sharp", "fur") else "sharp"

# 反馈写入：生产建议配置 Cloudflare Worker，把反馈统一写入 D1。
# 不配置 FEEDBACK_ENDPOINT 时退回本地 JSONL，方便开发和离线调试。
FEEDBACK_ENDPOINT = os.getenv("FEEDBACK_ENDPOINT", "").strip()
FEEDBACK_TOKEN = os.getenv("FEEDBACK_TOKEN", "").strip()
FEEDBACK_IP_HASH_SALT = os.getenv("FEEDBACK_IP_HASH_SALT", "").strip()
BACKEND_SPACE = os.getenv("BACKEND_SPACE", os.getenv("SPACE_ID", "")).strip()
FEEDBACK_TIMEOUT_SECONDS = float(os.getenv("FEEDBACK_TIMEOUT_SECONDS", "2.0"))

# 老照片修复：默认走本进程的轻量 OpenCV 兜底；生产可配置独立 GPU 服务 URL。
# 这样首页抠图的 BiRefNet 进程不会被 GFPGAN/Real-ESRGAN/CodeFormer 等大模型拖慢。
RESTORE_PROVIDER_URL = os.getenv("RESTORE_PROVIDER_URL", "").strip()
RESTORE_PROVIDER_TOKEN = os.getenv("RESTORE_PROVIDER_TOKEN", "").strip()
RESTORE_TIMEOUT_SECONDS = float(os.getenv("RESTORE_TIMEOUT_SECONDS", "90.0"))
RESTORE_MAX_CONCURRENCY = int(os.getenv("RESTORE_MAX_CONCURRENCY", "1"))

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ID_PHOTO_PRESETS = {
    "one_inch": (295, 413),
    "two_inch": (413, 579),
    "small_one_inch": (260, 378),
    "large_one_inch": (390, 567),
    "small_two_inch": (413, 531),
    "china_passport": (390, 567),
    "us_passport": (600, 600),
    "visa_square": (600, 600),
    "resume": (480, 640),
    "social_profile": (512, 512),
    "custom": None,
}
ID_PHOTO_COLORS = {
    "white": "ffffff",
    "blue": "438edb",
    "red": "d5332e",
    "gray": "f3f4f6",
    "light_blue": "dbeafe",
    "dark_blue": "1d4ed8",
    "pink": "fce7f3",
    "black": "111827",
}
ID_PHOTO_PAPERS = {
    "6inch": (1800, 1200),
    "5inch": (1500, 1050),
    "7inch": (2100, 1500),
    "a4": (2480, 3508),
}

# PIL 全局像素上限：超过会抛 DecompressionBombWarning，2 倍以上直接抛 Error。
# 我们自己也会校验一次 w*h，这里作为保底（给 PIL 留 2 倍空间，避免误杀我们主动检查能放行的图）。
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS * 2


# ============================================================
# 日志
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("miaocut")


def _ensure_writable_model_cache() -> None:
    """Make rembg/pooch model downloads land in a writable directory."""
    configured = Path(os.getenv("U2NET_HOME", "/data/.u2net"))
    bundled_model = configured / "birefnet-general-lite.onnx"
    if bundled_model.is_file():
        os.environ["U2NET_HOME"] = str(configured)
        logger.info("Using bundled model cache: %s", configured)
        return

    fallback = Path("/tmp/miaocut-u2net")
    for candidate in (configured, fallback):
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            probe = candidate / ".write-test"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink(missing_ok=True)
            os.environ["U2NET_HOME"] = str(candidate)
            if candidate != configured:
                logger.warning("U2NET_HOME is not writable; using fallback cache: %s", candidate)
            return
        except Exception as exc:
            logger.warning("Model cache is not writable (%s): %s", candidate, exc)
    raise RuntimeError("No writable model cache directory found")


_ensure_writable_model_cache()


def _log_cpu_info() -> None:
    """启动时打印一次 CPU 硬件能力 + onnxruntime build 信息。

    用途：验证 HF Space 跑在哪一代至强、能用哪些 SIMD 指令集（AVX-512 / VNNI / AMX）。
    决定后续是否值得做 INT8 量化、切 OpenVINO EP、或启用 AMX 加速。

    关注的几个 flag：
      avx2          —— 第二代 SIMD，几乎所有现代 Intel 都有
      avx512f       —— AVX-512 基础集，3 代至强（Ice Lake）起标配
      avx512_vnni   —— INT8 加速指令，3 代至强起，量化模型必看这个
      amx_tile      —— AMX 矩阵乘单元，仅 4 代至强（Sapphire Rapids）+ 才有
      amx_int8/bf16 —— AMX 在 INT8 / BF16 模式下的支持，量化后能吃满 amx_int8

    零性能影响：仅在 import 时跑一次，纯 IO + 字符串处理。
    """
    import platform

    cpu_model = platform.processor() or "unknown"
    cpu_count = os.cpu_count() or 0

    flags_of_interest = ("avx2", "avx512f", "avx512_vnni", "amx_tile", "amx_int8", "amx_bf16")
    cpu_flags: dict = {}
    try:
        with open("/proc/cpuinfo") as f:
            content = f.read()
        # 同一物理 CPU 的所有逻辑核 flags 一致，第一段就够
        for line in content.splitlines():
            if line.startswith("flags") and not cpu_flags:
                actual = set(line.split(":", 1)[1].strip().split())
                cpu_flags = {flag: flag in actual for flag in flags_of_interest}
            elif line.startswith("model name"):
                cpu_model = line.split(":", 1)[1].strip()
            if cpu_flags and cpu_model != "unknown" and not cpu_model.startswith("arm"):
                break
    except (FileNotFoundError, OSError):
        # 非 Linux（如本地 macOS dev）没有 /proc/cpuinfo，跳过 flag 探测
        pass

    logger.info("=" * 64)
    logger.info("CPU model     : %s", cpu_model)
    logger.info("CPU count     : %d vCPU", cpu_count)
    if cpu_flags:
        on = [k for k, v in cpu_flags.items() if v]
        off = [k for k, v in cpu_flags.items() if not v]
        logger.info("CPU SIMD ON   : %s", ", ".join(on) or "(none)")
        logger.info("CPU SIMD OFF  : %s", ", ".join(off) or "(none)")
    else:
        logger.info("CPU SIMD      : (skipped - /proc/cpuinfo unavailable, likely macOS)")
    logger.info("ort version   : %s", ort.__version__)
    logger.info("ort providers : %s", ort.get_available_providers())
    try:
        logger.info("ort build_info: %s", ort.get_build_info())
    except Exception as exc:
        logger.info("ort build_info: (unavailable: %s)", exc)
    logger.info("=" * 64)


_log_cpu_info()


# ============================================================
# AI 模型初始化
# ============================================================
# BiRefNet (Bilateral Reference Network) 是 2024 年图像分割领域的 SOTA 模型。
# 相比 IS-Net / U2-Net，BiRefNet 在以下方面有本质提升：
#   - 边缘精度：发丝、毛绒、半透明物体的边界极其锐利
#   - 细节保留：小物件、镂空区域不会被误删
#   - 泛化能力：人物、商品、动物、建筑等场景通吃
#
# birefnet-general-lite（swin_v1_tiny backbone）约 224MB，首次运行时 rembg 自动下载到 U2NET_HOME。
# 之前用 birefnet-general（swin_v1_large，~480MB），M1 上 ~17s/张、Linux x86 4核 ~25s+/张，
# 太慢；切到 lite 后 M1 ~9s、Linux 估 ~12~17s（按 HF Space 套餐档位变动），
# 边缘质量肉眼几乎察觉不到差异。还原历史用 isnet-general-use（~1.2s/张）但发丝边缘会回到粗糙。
#
# providers=["CPUExecutionProvider"]：强制 CPU 推理。
# Apple Silicon 上 onnxruntime 默认尝试 CoreML EP，但部分算子不支持会报错。
# 纯 CPU 在 M1/M2 上单张图 1~3 秒，完全够用。
def _create_birefnet_session():
    """加载 BiRefNet-lite 模型，使用 onnxruntime 默认的 arena/mem_pattern（速度优先）。

    rembg 自带的 new_session() 内部硬写 ort.SessionOptions()，没法外部覆盖；
    这里直接构造 session 类，是为了把 MIAOCUT_OMP_NUM_THREADS 注入 sess_opts
    （Hugging Face Space 不允许使用 OMP_NUM_THREADS 这个保留变量名，所以加了一个别名）。

    ⚠️ 模型选型踩坑：项目历史用过三种模型，速度差异巨大（M1 实测同一张 1024² 图）：
        isnet-general-use     ~1.2s/张  发丝边缘粗糙，需要换底色时毛边明显
        birefnet-general-lite ~9s/张    边缘细腻，与 general 视觉差异极小（当前选择）
        birefnet-general      ~17.8s/张 SOTA 质量，但 CPU 推理太慢
    HF Space 是 CPU 推理，速度优先 → lite 是最佳折中。换成 general 之前先想清楚 14× 慢。

    ⚠️ 内存设置踩坑：曾设过 enable_cpu_mem_arena=False + enable_mem_pattern=False 来压 RSS，
    Linux 上每次推理耗时翻倍（arena 关 → 大块反复 malloc/free；mem_pattern 关 → 每次重算
    分配模式）。线上速度优先 → 保持默认开启，用 RSS 换响应时间。
    """
    sess_opts = ort.SessionOptions()
    # Hugging Face Space 不允许用户配置 OMP_NUM_THREADS 这类保留变量；
    # 用自己的变量名控制 onnxruntime 线程数，同时兼容本地开发里的 OMP_NUM_THREADS。
    threads = os.getenv("MIAOCUT_OMP_NUM_THREADS") or os.getenv("OMP_NUM_THREADS")
    if threads:
        n = int(threads)
        sess_opts.inter_op_num_threads = n
        sess_opts.intra_op_num_threads = n

    cls = next((sc for sc in sessions_class if sc.name() == "birefnet-general-lite"), None)
    if cls is None:
        raise RuntimeError("birefnet-general-lite session class not found in rembg")
    sess = cls("birefnet-general-lite", sess_opts, ["CPUExecutionProvider"])

    # ---- INT8 量化模型（需显式设 ENABLE_INT8_MODEL=1 才加载）----
    # 实测在 HF Space Xeon 8375C（有 AVX-512 VNNI）上，动态 INT8 比 FP32 慢 ~2x（19s vs ~10s）：
    # Swin Transformer 层数多，每层 activation 动态量化的 scale 计算开销叠加后大于 VNNI 收益。
    # M1 上快 4-5s 是因为模型体积减半节省了统一内存带宽，与量化算法本身无关。
    # 默认保持 FP32；只在确认目标硬件有收益时才设 ENABLE_INT8_MODEL=1。
    if not ENABLE_INT8_MODEL:
        logger.info("INT8 model disabled (ENABLE_INT8_MODEL=0); using FP32")
        return sess

    # 候选路径：U2NET_HOME 优先，其次工作目录下的 models/ 子目录
    # （upload_model_to_hf.py 上传到 HF Space 仓库的 models/ 路径，
    #  运行时落盘为 <WORKDIR>/models/；.gitignore 排除了 *.onnx，
    #  Dockerfile COPY 构建上下文拿不到，需额外检查工作目录）
    _int8_candidates = [
        Path(os.environ["U2NET_HOME"]) / "birefnet-general-lite-int8.onnx",
        Path(__file__).parent / "models" / "birefnet-general-lite-int8.onnx",
    ]
    int8_path = next((p for p in _int8_candidates if p.is_file()), None)
    if int8_path is not None:
        try:
            int8_session = ort.InferenceSession(
                str(int8_path),
                sess_options=sess_opts,
                providers=["CPUExecutionProvider"],
            )
            sess.inner_session = int8_session
            logger.info("Loaded INT8 quantized model: %s (%.0f MB)",
                        int8_path, int8_path.stat().st_size / 1024 / 1024)
        except Exception as exc:
            logger.warning("INT8 model found but failed to load (%s); falling back to FP32", exc)
    else:
        logger.info("INT8 model not found (checked: %s); using FP32",
                    ", ".join(str(p) for p in _int8_candidates))
    return sess



_high_quality_session = None
_high_quality_session_lock = threading.Lock()


def get_high_quality_session():
    """按需加载 BiRefNet，避免 Hugging Face Space 冷启动时阻塞健康检查。"""
    global _high_quality_session
    if _high_quality_session is None:
        with _high_quality_session_lock:
            if _high_quality_session is None:
                logger.info("Loading birefnet-general-lite AI model for background removal... (cutout_profile=%s)", CUTOUT_PROFILE)
                _high_quality_session = _create_birefnet_session()
    return _high_quality_session


async def warmup_high_quality_session() -> None:
    """启动完成后后台预热 BiRefNet，避免首个真实用户请求承担模型加载及首次推理的编译时间。"""
    try:
        await asyncio.to_thread(get_high_quality_session)
        logger.info("BiRefNet model warmup complete")
    except Exception as exc:
        logger.warning("BiRefNet model warmup failed; first request will retry lazy loading: %s", exc)


# ============================================================
# 真实客户端 IP 提取（限流 key）
# ============================================================
def get_real_ip(request: Request) -> str:
    """
    取"真实"客户端 IP，作为限流 key。

    为什么不能直接用 slowapi 默认的 get_remote_address？
      - 生产一般在 Nginx/LB 之后，request.client.host 拿到的是代理 IP。
        所有用户共用一个 key → 要么全被限流，要么限流完全失效。

    为什么默认不信任 X-Forwarded-For？
      - 客户端可以随便伪造这个 header。只有在反代会覆盖/追加它时才能信任。
      - 所以用 TRUST_PROXY 开关，部署时显式开启。

    为什么 IPv6 要聚合到 /64？
      - 运营商通常给用户分配一整个 /64 前缀（2^64 个地址）。
      - 攻击者在前缀内切换地址 0 成本，按单 IP 限流形同虚设。
    """
    if TRUST_PROXY:
        xff = request.headers.get("x-forwarded-for", "")
        # XFF 第一个是最原始的客户端，后面的是一层层代理
        ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "0.0.0.0")
    else:
        ip = request.client.host if request.client else "0.0.0.0"

    try:
        addr = ipaddress.ip_address(ip)
        if isinstance(addr, ipaddress.IPv6Address):
            network = ipaddress.ip_network(f"{ip}/64", strict=False)
            return str(network.network_address)
    except ValueError:
        # ip 串不合法，直接当字符串 key，别让限流挂掉
        pass
    return ip


# ============================================================
# 限流器
# ============================================================
# 默认 memory://，所有限流计数存进程内。单 worker 部署下完全够用。
# 注意：必须跑单 worker（uvicorn 不带 --workers 或 --workers 1），
# 否则每个进程独立计数，实际额度会被乘上 worker 数。
# 将来要扩到多 worker/多机时，再传 storage_uri="redis://..."。
limiter = Limiter(key_func=get_real_ip)
logger.info("RateLimiter storage: memory (single-process), trust_proxy=%s", TRUST_PROXY)


# ============================================================
# 并发控制
# ============================================================
# rembg + alpha matting 是 CPU 密集型（单张图几百 ms 到几秒）。
# 不限并发，100 个请求涌入会把 worker 打死。
# 用信号量排队，超出的请求会 await 等待，不会报错（行为更友好）。
# 若想直接拒绝，可以改成 wait_for(acquire, timeout) + 429。
rembg_semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
restore_semaphore = asyncio.Semaphore(RESTORE_MAX_CONCURRENCY)
watermark_semaphore = asyncio.Semaphore(int(os.getenv("WATERMARK_MAX_CONCURRENCY", "1")))

lama_executor = None
_lama_model = None

def _init_lama_worker():
    global _lama_model
    import torch
    # 独立进程中限制线程，防止打满 CPU
    torch.set_num_threads(2)
    from simple_lama_inpainting import SimpleLama
    _lama_model = SimpleLama()

def _prepare_lama_mask(mask_image: Image.Image, source_size: tuple[int, int]) -> Image.Image:
    """清理并适度扩张用户涂抹的遮罩，减少水印边缘残留。"""
    import cv2
    import numpy as np

    if mask_image.size != source_size:
        mask_image = mask_image.resize(source_size, Image.Resampling.NEAREST)

    mask = np.array(mask_image.convert("L"), dtype=np.uint8)
    mask = np.where(mask > 8, 255, 0).astype(np.uint8)
    if not np.any(mask):
        return Image.fromarray(mask, mode="L")

    long_edge = max(source_size)
    radius = max(2, min(14, round(long_edge * 0.003)))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (radius * 2 + 1, radius * 2 + 1))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.dilate(mask, kernel, iterations=1)
    return Image.fromarray(mask, mode="L")


def _composite_lama_result(
    source_image: Image.Image,
    inpainted_image: Image.Image,
    mask_image: Image.Image,
) -> Image.Image:
    """只把修复区域羽化合回原图，避免 LaMa 全图输出污染未涂抹区域。"""
    long_edge = max(source_image.size)
    feather_radius = max(2, min(10, round(long_edge * 0.0015)))
    blend_mask = mask_image.filter(ImageFilter.GaussianBlur(radius=feather_radius))
    return Image.composite(inpainted_image.convert("RGB"), source_image.convert("RGB"), blend_mask)


def _run_lama_worker(source_image, mask_image):
    global _lama_model
    mask_image = _prepare_lama_mask(mask_image, source_image.size)
    result = _lama_model(source_image, mask_image)
    if result.size != source_image.size:
        result = result.crop((0, 0, source_image.width, source_image.height))
    return _composite_lama_result(source_image, result, mask_image)


# ============================================================
# FastAPI 应用
# ============================================================
app = FastAPI(
    title="miaoCut API",
    description="1秒纯净抠图后端 API",
    # 生产关闭 /docs 与 /openapi.json，避免接口被枚举
    docs_url="/docs" if ENABLE_DOCS else None,
    redoc_url="/redoc" if ENABLE_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_DOCS else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

SERVE_STATIC_FRONTEND = os.getenv("SERVE_STATIC_FRONTEND", "auto").lower()
STATIC_FRONTEND_AVAILABLE = Path("index.html").exists()
SERVE_STATIC = (
    SERVE_STATIC_FRONTEND == "1"
    or (SERVE_STATIC_FRONTEND == "auto" and STATIC_FRONTEND_AVAILABLE)
)
if SERVE_STATIC and Path("examples").exists():
    app.mount("/examples", StaticFiles(directory="examples"), name="examples")

# ============================================================
# CORS（前后端分离部署时必须）
# ============================================================
# 前端部署在 Cloudflare Pages，后端在 VPS，浏览器会发 CORS 预检请求。
# ALLOWED_ORIGINS 为空时允许所有来源（本地 dev 友好）。
if ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(ALLOWED_ORIGINS),
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        max_age=3600,  # 预检缓存 1 小时，减少 OPTIONS 请求
    )
else:
    # 本地开发：允许所有来源
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )


@app.on_event("startup")
async def schedule_model_warmup() -> None:
    global lama_executor
    logger.info("Starting isolated ProcessPool for SimpleLama to prevent PyTorch thread contention...")
    
    # 必须使用 spawn，否则 fork 会带上主进程已经被初始化的各种线程锁和状态，容易死锁
    ctx = multiprocessing.get_context("spawn")
    lama_executor = ProcessPoolExecutor(max_workers=1, mp_context=ctx, initializer=_init_lama_worker)
    logger.info("SimpleLama worker process initialized")

    if WARMUP_BIREFNET_ON_STARTUP:
        logger.info("Scheduling BiRefNet warmup after startup")
        asyncio.create_task(warmup_high_quality_session())


# ============================================================
# 来源校验（防第三方站点盗用接口）
# ============================================================
def verify_origin(request: Request) -> None:
    """
    校验 Origin / Referer 是否在白名单。

    浏览器安全模型：跨源请求必带 Origin，攻击者在自己的网站里没法伪造。
    所以这层能挡住"别的站点把我的 API 嵌进他们的前端"。

    curl/脚本不带 Origin，不在这里拦，由限流 + （后续接入的）人机验证兜底。

    ALLOWED_ORIGINS 为空时跳过全部检查，本地 dev 友好。
    """
    if not ALLOWED_ORIGINS:
        return

    origin = request.headers.get("origin")
    if origin:
        if origin.rstrip("/") not in ALLOWED_ORIGINS:
            logger.warning("Blocked origin: %s", origin)
            raise HTTPException(status_code=403, detail="禁止的来源")
        return

    # 没 Origin 时，退而用 Referer。允许精确匹配或作为前缀
    referer = request.headers.get("referer")
    if referer:
        ok = any(referer == o or referer.startswith(o + "/") for o in ALLOWED_ORIGINS)
        if not ok:
            logger.warning("Blocked referer: %s", referer)
            raise HTTPException(status_code=403, detail="禁止的来源")
        return

    # Origin 和 Referer 都没有：可能是命令行/同源直接导航，放行由限流兜底
    return


# ============================================================
# 工具函数
# ============================================================
# 文件名清洗：只保留英数、中文、下划线、横线，其余替换成下划线，防止头注入/乱码
_FILENAME_UNSAFE = re.compile(r"[^\w一-龥\-]")
_ASCII_UNSAFE = re.compile(r"[^A-Za-z0-9_\-]")


def safe_basename(name: Optional[str]) -> str:
    """从上传的文件名中提取安全的基名（不含扩展名）。"""
    if not name:
        return "image"
    # rsplit 只切最后一个点，"foo.bar.png" → "foo.bar"
    stem = name.rsplit(".", 1)[0]
    stem = _FILENAME_UNSAFE.sub("_", stem)[:50]
    return stem or "image"


def _run_rembg_sync(data: bytes, profile: Optional[str] = None) -> bytes:
    """
    根据 profile 选择抠图流水线：
      - sharp（默认）：BiRefNet 直出 + 温和 gamma + 1px 抗锯齿，速度优先
      - fur          ：BiRefNet + alpha matting + 前景色去污染，毛发细腻优先

    profile 取值优先级：调用方显式传入 > CUTOUT_PROFILE 环境变量 > "sharp"。
    详见 _run_sharp_pipeline / _run_fur_pipeline 头注释。
    """
    chosen = profile if profile in ("sharp", "fur") else CUTOUT_PROFILE
    if chosen == "fur":
        return _run_fur_pipeline(data)
    return _run_sharp_pipeline(data)


def _run_sharp_pipeline(data: bytes) -> bytes:
    """
    Sharp 模式：BiRefNet 直出 mask + 温和 gamma 校正 + 1px 高斯抗锯齿。

    历史踩坑：早期版本用陡峭 S 曲线 [0.20, 0.80] 把半透明带压成 1~2px"硬边"。
    这对人物/商品有效，但对毛发是灾难——
      1. alpha < 20% 的细毛全部被砍 → 毛尖出现"啃过似的"断裂
      2. 自然的 0~1 渐变被强行拉伸到 60% 区间 → 边缘看起来像阶梯
      3. 半透明像素 RGB 仍混着旧背景色 → 换底色时发灰
    现在改为：
      - 极窄死区 [0.02, 0.98]：仅清除 BiRefNet 输出端点的浮点噪声
      - gamma = 0.85：把中段 alpha 略微抬一点，让主体扎实但保留软过渡

    速度同前（~1s/张 on M1，~2s/张 on VPS），适合人物、商品、Logo 等"硬边"主体。
    对毛发场景请改用 CUTOUT_PROFILE=fur。
    """
    import time
    import cv2
    import numpy as np

    img_size_kb = len(data) / 1024
    t0 = time.perf_counter()
    logger.info(">>> sharp pipeline BEGIN (input=%.0fKB)", img_size_kb)

    output_data = remove(
        data,
        session=get_high_quality_session(),
        alpha_matting=False,
    )
    t1 = time.perf_counter()

    result_img = np.frombuffer(output_data, np.uint8)
    result_img = cv2.imdecode(result_img, cv2.IMREAD_UNCHANGED)
    if result_img is None or result_img.ndim < 3 or result_img.shape[2] < 4:
        logger.info("sharp pipeline: rembg=%.2fs (input=%.0fKB) [early return]", t1 - t0, img_size_kb)
        return output_data

    alpha = result_img[:, :, 3].astype(np.float32) / 255.0
    # 极窄死区：去 BiRefNet 输出端点的浮点噪声，不影响真正的过渡区域
    alpha = np.where(alpha < 0.02, 0.0, alpha)
    alpha = np.where(alpha > 0.98, 1.0, alpha)
    # 温和 gamma：中段抬一点点，主体更扎实；端点不变；软过渡完整保留
    alpha = np.power(alpha, 0.85)
    alpha_u8 = (alpha * 255).astype(np.uint8)

    # 1px 抗锯齿：极轻的高斯（kernel 3, sigma 0.5）做亚像素抗锯齿
    alpha_u8 = cv2.GaussianBlur(alpha_u8, (3, 3), sigmaX=0.5)

    result_img[:, :, 3] = alpha_u8

    # 用 PNG 而非 WebP：实测 cv2.imencode 对带 alpha 的高质量 WebP 比 PNG 慢 ~100ms
    # （libwebp 要单独编 alpha plane）。WebP 文件小 70% 但用户感知不到下载差异，
    # 反而 encode 多出来的 100ms 直接叠加在"AI 处理中"进度末尾，体感变慢。
    _, output_png = cv2.imencode(".png", result_img)
    t2 = time.perf_counter()

    logger.info(
        "sharp pipeline: rembg=%.2fs post=%.2fs total=%.2fs (input=%.0fKB output_px=%dx%d)",
        t1 - t0, t2 - t1, t2 - t0,
        img_size_kb, result_img.shape[1], result_img.shape[0],
    )
    return output_png.tobytes()


def _run_fur_pipeline(data: bytes) -> bytes:
    """
    Fur 模式：alpha matting（保留软过渡）+ 前景色去污染（消背景色调）。

    解决 sharp 模式无法处理的两个问题：

    1. BiRefNet 直出 mask 的"未知带"只有 1~2px，毛发末端会被一刀切。
       alpha_matting=True 让 rembg 用 BiRefNet mask 自动生成 trimap，
       再用 pymatting closed-form 解算法在 trimap "未知带"求 alpha，
       逐根毛的透明度才精准——这是图 1（Adobe）效果的第一半秘密。

    2. 半透明像素 RGB = α·前景 + (1-α)·背景；直接换底色时会带旧背景色调
       （白猫黑底 → 毛尖发灰；卷发亮底 → 发尾偏白）。
       estimate_foreground_ml 用迭代法解出"纯前景色"，换底色后毛尖才干净——
       这是图 1 效果的第二半秘密，也是 sharp 模式无法补救的根本差距。

    成本：~3~5s/张（VPS），单图内存峰值 +500MB。开 fur 后 MAX_CONCURRENCY 要按
    内存重新拍（建议除以 1.5）。

    参数（已实测 cat / 长发人物）：
      foreground_threshold=240：mask >= 240 当确定前景
      background_threshold=15 ：mask <= 15  当确定背景
      erode_size=8            ：trimap 未知带 8px，刚够覆盖一般毛发宽度
                              （再大 pymatting 会慢且产生光晕）
    """
    import time
    import cv2
    import numpy as np
    from pymatting import estimate_foreground_ml

    img_size_kb = len(data) / 1024
    t0 = time.perf_counter()

    output_data = remove(
        data,
        session=get_high_quality_session(),
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=15,
        alpha_matting_erode_size=8,
    )
    t1 = time.perf_counter()

    result_img = np.frombuffer(output_data, np.uint8)
    result_img = cv2.imdecode(result_img, cv2.IMREAD_UNCHANGED)
    if result_img is None or result_img.ndim < 3 or result_img.shape[2] < 4:
        logger.info("fur pipeline: rembg+matting=%.2fs (input=%.0fKB) [early return]", t1 - t0, img_size_kb)
        return output_data

    alpha_norm = result_img[:, :, 3].astype(np.float32) / 255.0

    t2 = time.perf_counter()
    # 仅当存在真正的半透明区域时才跑前景估算（纯硬边图省 0.5~1.5s）
    if np.any((alpha_norm > 0.02) & (alpha_norm < 0.98)):
        # pymatting 期望 RGB 顺序、范围 [0, 1]
        rgb_norm = cv2.cvtColor(result_img[:, :, :3], cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        fg_rgb = estimate_foreground_ml(rgb_norm, alpha_norm)
        fg_bgr = cv2.cvtColor(
            (fg_rgb * 255.0).clip(0, 255).astype(np.uint8),
            cv2.COLOR_RGB2BGR,
        )
        result_img[:, :, :3] = fg_bgr
    t3 = time.perf_counter()

    # 清理 trimap 求解后零星的浮点 noise（< ~1% 透明度直接归零，避免暗色像素散点）
    alpha_u8 = result_img[:, :, 3]
    alpha_u8 = np.where(alpha_u8 < 3, 0, alpha_u8).astype(np.uint8)
    result_img[:, :, 3] = alpha_u8

    _, output_png = cv2.imencode(".png", result_img)
    t4 = time.perf_counter()

    logger.info(
        "fur pipeline: rembg+matting=%.2fs fg_est=%.2fs post=%.2fs total=%.2fs (input=%.0fKB output_px=%dx%d)",
        t1 - t0, t3 - t2, t4 - t3, t4 - t0,
        img_size_kb, result_img.shape[1], result_img.shape[0],
    )
    return output_png.tobytes()


def _image_to_base64(img: Image.Image, fmt: str = "PNG", quality: int = 95, dpi: int = 300) -> str:
    buf = io.BytesIO()
    save_kwargs = {}
    if fmt.upper() in ("JPEG", "JPG"):
        save_kwargs["quality"] = quality
        save_kwargs["optimize"] = True
    if dpi:
        save_kwargs["dpi"] = (dpi, dpi)
    img.save(buf, format=fmt, **save_kwargs)
    import base64

    return base64.b64encode(buf.getvalue()).decode("ascii")


def _base64_to_image(value: str) -> Image.Image:
    import base64

    if "," in value and value.lstrip().startswith("data:"):
        value = value.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(value))).convert("RGBA")


def _parse_hex_color(value: str) -> tuple[int, int, int]:
    color = (value or "ffffff").strip().lower().lstrip("#")
    color = ID_PHOTO_COLORS.get(color, color)
    if not re.fullmatch(r"[0-9a-f]{6}", color):
        raise HTTPException(status_code=400, detail="Invalid background color")
    return int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16)


def _get_alpha_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise HTTPException(status_code=422, detail="No foreground detected")
    return bbox


def _detect_mediapipe_anchors(original: Image.Image, cutout: Image.Image) -> Optional[dict]:
    """用 MediaPipe Face Mesh 检测脸部关键点。

    关键点映射：
      - 33 / 263：左右眼外眼角，估算眼睛水平线和旋转角度。
      - 152：下巴。
      - 10：额头上方；头顶仍优先用 alpha bbox 顶部，以保留真实头发高度。
    """
    try:
        import mediapipe as mp
        import numpy as np

        rgb = np.array(original.convert("RGB"))
        h, w = rgb.shape[:2]
        with mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.55,
        ) as face_mesh:
            result = face_mesh.process(rgb)

        if not result.multi_face_landmarks:
            return None

        lm = result.multi_face_landmarks[0].landmark

        def pt(index: int) -> tuple[float, float]:
            return lm[index].x * w, lm[index].y * h

        left_eye = pt(33)
        right_eye = pt(263)
        chin = pt(152)
        forehead = pt(10)
        alpha_bbox = _get_alpha_bbox(cutout)

        eye_y = (left_eye[1] + right_eye[1]) / 2
        face_center_x = (left_eye[0] + right_eye[0] + chin[0] + forehead[0]) / 4
        eye_angle_deg = math.degrees(math.atan2(right_eye[1] - left_eye[1], right_eye[0] - left_eye[0]))
        head_top_y = min(float(alpha_bbox[1]), forehead[1])
        chin_y = min(float(alpha_bbox[3]), chin[1])

        if chin_y <= head_top_y:
            return None

        return {
            "source": "mediapipe",
            "face_center_x": float(face_center_x),
            "eye_y": float(eye_y),
            "head_top_y": float(head_top_y),
            "chin_y": float(chin_y),
            "left_eye": (float(left_eye[0]), float(left_eye[1])),
            "right_eye": (float(right_eye[0]), float(right_eye[1])),
            "eye_angle_deg": float(eye_angle_deg),
        }
    except ImportError:
        logger.info("MediaPipe not installed; using fallback face alignment")
        return None
    except Exception as exc:
        logger.info("MediaPipe face alignment skipped: %s", exc)
        return None


def _detect_haar_anchors(original: Image.Image, cutout: Image.Image) -> Optional[dict]:
    """轻量检测脸框和眼睛线，用于证件照构图。

    这里使用 OpenCV 自带 Haar cascade，不新增大模型依赖。检测失败时返回 None，
    上层会退回透明主体居中方案。
    """
    try:
        import cv2
        import numpy as np

        rgb = np.array(original.convert("RGB"))
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
        if face_cascade.empty() or eye_cascade.empty():
            return None

        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5, minSize=(60, 60))
        if len(faces) == 0:
            return None

        x, y, w, h = max(faces, key=lambda rect: rect[2] * rect[3])
        face_center_x = x + w / 2

        upper = gray[y : y + int(h * 0.62), x : x + w]
        eyes = eye_cascade.detectMultiScale(upper, scaleFactor=1.08, minNeighbors=5, minSize=(18, 18))
        eye_y = y + h * 0.42
        if len(eyes) >= 2:
            eyes = sorted(eyes, key=lambda rect: rect[2] * rect[3], reverse=True)[:2]
            eye_y = sum(y + ey + eh / 2 for _, ey, _, eh in eyes) / len(eyes)

        alpha_bbox = _get_alpha_bbox(cutout)
        # 头顶优先用透明主体顶部；下巴用脸框下沿略向下估算，并限制在主体区域内。
        head_top_y = min(alpha_bbox[1], y)
        chin_y = min(alpha_bbox[3], y + h * 1.08)
        if chin_y - head_top_y < h * 0.65:
            chin_y = min(alpha_bbox[3], y + h * 1.18)

        return {
            "source": "haar",
            "face_center_x": float(face_center_x),
            "eye_y": float(eye_y),
            "head_top_y": float(head_top_y),
            "chin_y": float(chin_y),
        }
    except Exception as exc:
        logger.info("Face alignment detection skipped: %s", exc)
        return None


def _detect_face_anchors(original: Image.Image, cutout: Image.Image) -> Optional[dict]:
    return _detect_mediapipe_anchors(original, cutout) or _detect_haar_anchors(original, cutout)


def _transform_rotated_point(
    x: float,
    y: float,
    cx: float,
    cy: float,
    angle_rad: float,
    min_x: float,
    min_y: float,
) -> tuple[float, float]:
    dx = x - cx
    dy = y - cy
    rx = cx + math.cos(angle_rad) * dx + math.sin(angle_rad) * dy
    ry = cy - math.sin(angle_rad) * dx + math.cos(angle_rad) * dy
    return rx - min_x, ry - min_y


def _rotate_cutout_and_anchors(cutout: Image.Image, anchors: dict) -> tuple[Image.Image, dict]:
    angle = float(anchors.get("eye_angle_deg") or 0.0)
    if abs(angle) < 1.0 or abs(angle) > 18.0:
        return cutout, anchors

    cx = cutout.width / 2
    cy = cutout.height / 2
    angle_rad = math.radians(angle)
    corners = [
        _transform_rotated_point(0, 0, cx, cy, angle_rad, 0, 0),
        _transform_rotated_point(cutout.width, 0, cx, cy, angle_rad, 0, 0),
        _transform_rotated_point(0, cutout.height, cx, cy, angle_rad, 0, 0),
        _transform_rotated_point(cutout.width, cutout.height, cx, cy, angle_rad, 0, 0),
    ]
    min_x = min(p[0] for p in corners)
    min_y = min(p[1] for p in corners)
    rotated = cutout.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)

    updated = dict(anchors)
    for x_key, y_key in (
        ("face_center_x", None),
        ("eye_y", None),
        ("head_top_y", None),
        ("chin_y", None),
    ):
        # These scalar anchors are recomputed from transformed points below.
        updated.pop(x_key, None)
        if y_key:
            updated.pop(y_key, None)

    left_eye = _transform_rotated_point(*anchors["left_eye"], cx, cy, angle_rad, min_x, min_y)
    right_eye = _transform_rotated_point(*anchors["right_eye"], cx, cy, angle_rad, min_x, min_y)
    face_center = _transform_rotated_point(anchors["face_center_x"], anchors["eye_y"], cx, cy, angle_rad, min_x, min_y)
    head_top = _transform_rotated_point(anchors["face_center_x"], anchors["head_top_y"], cx, cy, angle_rad, min_x, min_y)
    chin = _transform_rotated_point(anchors["face_center_x"], anchors["chin_y"], cx, cy, angle_rad, min_x, min_y)
    updated.update(
        {
            "face_center_x": float(face_center[0]),
            "eye_y": float((left_eye[1] + right_eye[1]) / 2),
            "head_top_y": float(head_top[1]),
            "chin_y": float(chin[1]),
            "left_eye": left_eye,
            "right_eye": right_eye,
            "eye_angle_deg": 0.0,
            "rotation_applied_deg": angle,
        }
    )
    return rotated, updated


def _alpha_composite_clipped(canvas: Image.Image, src: Image.Image, x: int, y: int) -> None:
    left = max(0, -x)
    top = max(0, -y)
    right = min(src.width, canvas.width - x)
    bottom = min(src.height, canvas.height - y)
    if right <= left or bottom <= top:
        return
    cropped = src.crop((left, top, right, bottom))
    canvas.alpha_composite(cropped, (max(0, x), max(0, y)))


def _fit_subject_to_canvas(
    cutout: Image.Image,
    width: int,
    height: int,
    head_height_ratio: float = 0.72,
    top_margin_ratio: float = 0.08,
    anchors: Optional[dict] = None,
) -> Image.Image:
    """把透明底主体缩放到证件照画布。

    有人脸锚点时：按头顶-下巴高度缩放，并让双眼线/脸中心更接近证件照构图；
    无锚点时：退回 alpha bbox 主体居中。
    """
    bbox = _get_alpha_bbox(cutout)
    if anchors:
        if "left_eye" in anchors and "right_eye" in anchors:
            cutout, anchors = _rotate_cutout_and_anchors(cutout, anchors)
            bbox = _get_alpha_bbox(cutout)
        head_top_y = anchors["head_top_y"]
        chin_y = anchors["chin_y"]
        head_h = max(1.0, chin_y - head_top_y)
        target_head_h = max(1, height * min(max(head_height_ratio, 0.5), 0.86))
        scale = target_head_h / head_h
        max_scale_by_width = (width * 0.96) / max(1, bbox[2] - bbox[0])
        scale = min(scale, max_scale_by_width)

        scaled_w = max(1, int(cutout.width * scale))
        scaled_h = max(1, int(cutout.height * scale))
        scaled = cutout.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)

        target_top = height * min(max(top_margin_ratio, 0.03), 0.2)
        target_eye_y = height * 0.43
        y_by_top = target_top - head_top_y * scale
        y_by_eye = target_eye_y - anchors["eye_y"] * scale
        y = int(y_by_top * 0.72 + y_by_eye * 0.28)
        x = int(width / 2 - anchors["face_center_x"] * scale)

        canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        _alpha_composite_clipped(canvas, scaled, x, y)
        return canvas

    subject = cutout.crop(bbox)
    subject_w, subject_h = subject.size
    if subject_w <= 0 or subject_h <= 0:
        raise HTTPException(status_code=422, detail="Invalid foreground")

    target_h = max(1, int(height * min(max(head_height_ratio, 0.45), 0.9)))
    target_w_limit = max(1, int(width * 0.92))
    scale = min(target_h / subject_h, target_w_limit / subject_w)
    new_w = max(1, int(subject_w * scale))
    new_h = max(1, int(subject_h * scale))

    subject = subject.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    x = (width - new_w) // 2
    y = int(height * min(max(top_margin_ratio, 0.02), 0.22))
    y = min(max(0, y), max(0, height - new_h))
    _alpha_composite_clipped(canvas, subject, x, y)
    return canvas


def _compose_background(img: Image.Image, color: str) -> Image.Image:
    rgb = _parse_hex_color(color)
    bg = Image.new("RGBA", img.size, (*rgb, 255))
    bg.alpha_composite(img.convert("RGBA"))
    return bg.convert("RGB")


def _encode_jpeg_to_target_kb(img: Image.Image, dpi: int = 300, kb: Optional[int] = None) -> str:
    if not kb:
        return _image_to_base64(img, fmt="JPEG", quality=94, dpi=dpi)

    target = max(8, min(int(kb), 1024)) * 1024
    low, high = 35, 95
    best = None
    for _ in range(8):
        q = (low + high) // 2
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=q, optimize=True, dpi=(dpi, dpi))
        data = buf.getvalue()
        if len(data) <= target:
            best = data
            low = q + 1
        else:
            high = q - 1

    if best is None:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=35, optimize=True, dpi=(dpi, dpi))
        best = buf.getvalue()

    import base64

    return base64.b64encode(best).decode("ascii")


def _generate_id_photo_sync(
    input_data: bytes,
    width: int,
    height: int,
    dpi: int,
    profile: str,
    head_height_ratio: float,
    top_margin_ratio: float,
    face_alignment: bool,
) -> dict:
    cutout_bytes = _run_rembg_sync(input_data, profile=profile)
    cutout = Image.open(io.BytesIO(cutout_bytes)).convert("RGBA")
    original = Image.open(io.BytesIO(input_data)).convert("RGB")
    anchors = _detect_face_anchors(original, cutout) if face_alignment else None
    standard = _fit_subject_to_canvas(cutout, width, height, head_height_ratio, top_margin_ratio, anchors)
    hd = _fit_subject_to_canvas(cutout, width * 2, height * 2, head_height_ratio, top_margin_ratio, anchors)
    return {
        "image_base64_standard": _image_to_base64(standard, "PNG", dpi=dpi),
        "image_base64_hd": _image_to_base64(hd, "PNG", dpi=dpi),
        "face_alignment": bool(anchors),
    }


async def run_id_photo(
    input_data: bytes,
    width: int,
    height: int,
    dpi: int,
    profile: str,
    head_height_ratio: float,
    top_margin_ratio: float,
    face_alignment: bool,
) -> dict:
    async with rembg_semaphore:
        return await asyncio.to_thread(
            _generate_id_photo_sync,
            input_data,
            width,
            height,
            dpi,
            profile,
            head_height_ratio,
            top_margin_ratio,
            face_alignment,
        )


class AddBackgroundRequest(BaseModel):
    image_base64: str
    color: str = "438edb"
    dpi: int = Field(default=300, ge=72, le=600)
    kb: Optional[int] = Field(default=None, ge=8, le=1024)


class LayoutRequest(BaseModel):
    image_base64: str
    color: str = "ffffff"
    dpi: int = Field(default=300, ge=72, le=600)
    kb: Optional[int] = Field(default=None, ge=8, le=2048)
    paper: str = "6inch"


async def run_rembg(data: bytes, profile: Optional[str] = None) -> bytes:
    """
    在线程池里跑 rembg，同时用信号量限并发。

    为什么要丢线程池：
      rembg.remove() 是同步 CPU 密集函数；在 async 路由里直接调用会阻塞整个事件循环，
      其他请求全都卡住。

    为什么先抢信号量再进线程池：
      信号量排队是 await 级别的，成本极低；线程池资源有限（默认 40 线程），
      先抢令牌能让超额请求在 await 这里排队，不占线程。
    """
    async with rembg_semaphore:
        return await asyncio.to_thread(_run_rembg_sync, data, profile)


def _normalize_restore_scale(value: str) -> int:
    try:
        scale = int(value)
    except (TypeError, ValueError):
        scale = 2
    return scale if scale in (1, 2, 4) else 2


def _normalize_restore_strength(value: str) -> str:
    return value if value in ("gentle", "balanced", "strong") else "balanced"


def _restore_old_photo_local_sync(input_data: bytes, scale: int, strength: str) -> tuple[bytes, str]:
    """轻量本地修复兜底：去噪、对比度恢复、锐化和 Lanczos 放大。

    这不是完整的生成式 AI 老照片修复，但它能在无外部 GPU Provider 时提供可用结果，
    并保持线上 Space 的镜像体积和冷启动稳定。真正的 AI 高清修复通过
    RESTORE_PROVIDER_URL 接入独立服务。
    """
    import cv2
    import numpy as np

    arr = np.frombuffer(input_data, np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    h, w = bgr.shape[:2]
    max_side = max(h, w)
    target_scale = scale
    if max_side * target_scale > 4096:
        target_scale = max(1.0, 4096 / max_side)

    if target_scale != 1:
        bgr = cv2.resize(
            bgr,
            (max(1, int(w * target_scale)), max(1, int(h * target_scale))),
            interpolation=cv2.INTER_LANCZOS4,
        )

    params = {
        "gentle": {"denoise": 4, "clip": 1.35, "sharp": 0.35},
        "balanced": {"denoise": 7, "clip": 1.65, "sharp": 0.55},
        "strong": {"denoise": 10, "clip": 2.0, "sharp": 0.75},
    }[strength]

    denoised = cv2.fastNlMeansDenoisingColored(
        bgr,
        None,
        params["denoise"],
        params["denoise"],
        7,
        21,
    )

    lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=params["clip"], tileGridSize=(8, 8))
    l = clahe.apply(l)
    restored = cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)

    blur = cv2.GaussianBlur(restored, (0, 0), sigmaX=1.2)
    amount = params["sharp"]
    restored = cv2.addWeighted(restored, 1 + amount, blur, -amount, 0)

    ok, encoded = cv2.imencode(".jpg", restored, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    if not ok:
        raise HTTPException(status_code=500, detail="Image encoding failed")
    return encoded.tobytes(), "image/jpeg"


async def _restore_old_photo_external(
    input_data: bytes,
    filename: str,
    content_type: str,
    scale: int,
    strength: str,
) -> tuple[bytes, str]:
    headers = {}
    if RESTORE_PROVIDER_TOKEN:
        headers["Authorization"] = f"Bearer {RESTORE_PROVIDER_TOKEN}"

    files = {"file": (filename or "photo.jpg", input_data, content_type or "application/octet-stream")}
    data = {"scale": str(scale), "strength": strength}
    async with httpx.AsyncClient(timeout=RESTORE_TIMEOUT_SECONDS) as client:
        resp = await client.post(RESTORE_PROVIDER_URL, headers=headers, data=data, files=files)
        resp.raise_for_status()

    media_type = resp.headers.get("content-type", "image/jpeg").split(";", 1)[0].strip()
    if not media_type.startswith("image/"):
        raise HTTPException(status_code=502, detail="Restore provider returned a non-image response")
    return resp.content, media_type


async def run_old_photo_restore(
    input_data: bytes,
    filename: str,
    content_type: str,
    scale: int,
    strength: str,
) -> tuple[bytes, str]:
    async with restore_semaphore:
        if RESTORE_PROVIDER_URL:
            return await _restore_old_photo_external(input_data, filename, content_type, scale, strength)
        return await asyncio.to_thread(_restore_old_photo_local_sync, input_data, scale, strength)


# ============================================================
# 路由
# ============================================================
@app.get("/")
async def root():
    if not SERVE_STATIC:
        return {"ok": True, "service": "miaocut-api"}
    return FileResponse("index.html")


if SERVE_STATIC:
    @app.get("/output.css")
    async def output_css():
        """本地 dev 时 index.html 通过后端 / 返回，样式同源加载需要这个端点；
        生产由 Cloudflare Pages 直接服务静态文件，此路径无人访问。"""
        return FileResponse("output.css", media_type="text/css")


    @app.get("/app.js")
    async def app_js():
        return FileResponse("app.js", media_type="application/javascript")


    @app.get("/product-photo-background-remover/")
    async def product_photo_background_remover():
        return FileResponse("product-photo-background-remover/index.html")


    @app.get("/portrait-background-remover/")
    async def portrait_background_remover():
        return FileResponse("portrait-background-remover/index.html")


    @app.get("/id-photo-maker/")
    async def id_photo_maker():
        return FileResponse("id-photo-maker/index.html")


    @app.get("/id-photo-maker/id-photo.js")
    async def id_photo_js():
        return FileResponse("id-photo-maker/id-photo.js", media_type="application/javascript")


    @app.get("/old-photo-restoration/")
    async def old_photo_restoration():
        return FileResponse("old-photo-restoration/index.html")


    @app.get("/old-photo-restoration/old-photo.js")
    async def old_photo_js():
        return FileResponse("old-photo-restoration/old-photo.js", media_type="application/javascript")


    @app.get("/watermark-remover/")
    async def watermark_remover():
        return FileResponse("watermark-remover/index.html")


@app.post("/api/remove-background", dependencies=[Depends(verify_origin)])
@limiter.limit("5/minute;50/day")  # 按真实 IP 限流：每分钟 5 次，每天 50 次
async def remove_background(request: Request, file: UploadFile = File(...)):
    # ---------- 1. MIME 初筛 ----------
    # 注意：content_type 是客户端声明的，可以伪造。真正把关靠后面的 PIL 解析。
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式: {file.content_type}。仅支持 JPG, PNG, WebP。",
        )

    # ---------- 2. 大小校验（双保险） ----------
    # 2a. 先看声明的 Content-Length，大文件直接拒，不浪费带宽和内存
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="文件过大，请压缩后再上传。")

    # 2b. 边读边截断：防止客户端伪造/不发 Content-Length。多读一字节，超了就是超了。
    input_data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(input_data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="文件过大，请压缩后再上传。")
    if not input_data:
        raise HTTPException(status_code=400, detail="空文件。")

    # ---------- 3. 图片解析校验 ----------
    # verify() 只校验 header，不解码像素；之后再用一次 Image.open 拿 size 做像素上限。
    try:
        with Image.open(io.BytesIO(input_data)) as img:
            img.verify()
        with Image.open(io.BytesIO(input_data)) as img2:
            w, h = img2.size
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="无效的图片文件。")

    if w * h > MAX_IMAGE_PIXELS:
        raise HTTPException(
            status_code=413,
            detail=f"图片尺寸过大（{w}x{h}），请压缩后再试。",
        )

    # ---------- 4. 真正处理 ----------
    # profile 来自 query param ?profile=sharp|fur；非法值（含拼写错）静默回退到 env 默认。
    # 故意不报 400：这是个体验向开关，前端老版本可能根本没传，不应破坏既有调用。
    profile_param = request.query_params.get("profile")
    profile = profile_param if profile_param in ("sharp", "fur") else None
    try:
        output_data = await run_rembg(input_data, profile=profile)
    except Exception as e:
        logger.exception("rembg failed: %s", e)
        raise HTTPException(status_code=500, detail="图片处理失败，可能图片过于复杂，请重试。")

    # ---------- 5. 返回结果 ----------
    # Content-Disposition 的 filename 走 RFC 5987，兼容老浏览器 + 支持中文
    basename = safe_basename(file.filename)
    ascii_name = _ASCII_UNSAFE.sub("_", basename) or "image"
    return Response(
        content=output_data,
        media_type="image/png",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{ascii_name}_nobg.png"; '
                f"filename*=UTF-8''{quote(basename)}_nobg.png"
            ),
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
        },
    )


def _read_lama_image(file_bytes: bytes, mode: str) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(file_bytes))
        image = ImageOps.exif_transpose(image)
        return image.convert(mode)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="无效的图片文件。") from exc


def _run_watermark_removal_sync(source_image: Image.Image, mask_image: Image.Image) -> Image.Image:
    # 实际上我们不再直接调这个 sync 函数了，而是让 executor 跑 _run_lama_worker
    pass


@app.post("/api/remove-watermark", dependencies=[Depends(verify_origin)])
@limiter.limit("3/minute;30/day")
async def remove_watermark(request: Request, image: UploadFile = File(...), mask: UploadFile = File(...)):
    image_bytes = await image.read(MAX_UPLOAD_BYTES + 1)
    mask_bytes = await mask.read(MAX_UPLOAD_BYTES + 1)
    if len(image_bytes) > MAX_UPLOAD_BYTES or len(mask_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="文件过大，请压缩后再上传。")
    if not image_bytes or not mask_bytes:
        raise HTTPException(status_code=400, detail="图片和遮罩不能为空。")

    source_image = _read_lama_image(image_bytes, "RGB")
    mask_image = _read_lama_image(mask_bytes, "L")

    if source_image.width * source_image.height > MAX_IMAGE_PIXELS:
        raise HTTPException(status_code=413, detail="图片尺寸过大，请压缩后再试。")
    if mask_image.size != source_image.size:
        mask_image = mask_image.resize(source_image.size, Image.Resampling.NEAREST)

    try:
        async with watermark_semaphore:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(lama_executor, _run_lama_worker, source_image, mask_image)
    except Exception as exc:
        logger.exception("watermark removal failed: %s", exc)
        raise HTTPException(status_code=500, detail="去水印处理失败，请重试。")

    output = io.BytesIO()
    result.save(output, format="PNG")
    return Response(
        content=output.getvalue(),
        media_type="image/png",
        headers={"X-Content-Type-Options": "nosniff"},
    )


@app.post("/api/old-photo/restore", dependencies=[Depends(verify_origin)])
@limiter.limit("3/minute;20/day")
async def restore_old_photo(request: Request, file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式: {file.content_type}。仅支持 JPG, PNG, WebP。",
        )

    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="文件过大，请压缩后再上传。")

    input_data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(input_data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="文件过大，请压缩后再上传。")
    if not input_data:
        raise HTTPException(status_code=400, detail="空文件。")

    try:
        with Image.open(io.BytesIO(input_data)) as img:
            img.verify()
        with Image.open(io.BytesIO(input_data)) as img2:
            w, h = img2.size
    except Exception:
        raise HTTPException(status_code=400, detail="无效的图片文件。")

    if w * h > MAX_IMAGE_PIXELS:
        raise HTTPException(status_code=413, detail=f"图片尺寸过大（{w}x{h}），请压缩后再试。")

    form = await request.form()
    scale = _normalize_restore_scale(str(form.get("scale") or "2"))
    strength = _normalize_restore_strength(str(form.get("strength") or "balanced"))

    try:
        output_data, media_type = await run_old_photo_restore(
            input_data,
            file.filename or "photo.jpg",
            file.content_type or "application/octet-stream",
            scale,
            strength,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("old photo restore failed: %s", exc)
        raise HTTPException(status_code=500, detail="照片修复失败，请稍后重试。")

    basename = safe_basename(file.filename)
    ascii_name = _ASCII_UNSAFE.sub("_", basename) or "photo"
    ext = "png" if media_type == "image/png" else "jpg"
    return Response(
        content=output_data,
        media_type=media_type,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{ascii_name}_restored.{ext}"; '
                f"filename*=UTF-8''{quote(basename)}_restored.{ext}"
            ),
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
        },
    )


@app.post("/api/id-photo/create", dependencies=[Depends(verify_origin)])
@limiter.limit("3/minute;30/day")
async def create_id_photo(
    request: Request,
    file: UploadFile = File(...),
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image format")

    input_data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(input_data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large")
    if not input_data:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        with Image.open(io.BytesIO(input_data)) as img:
            img.verify()
        with Image.open(io.BytesIO(input_data)) as img2:
            w, h = img2.size
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    if w * h > MAX_IMAGE_PIXELS:
        raise HTTPException(status_code=413, detail=f"Image too large ({w}x{h})")

    form = await request.form()
    preset = str(form.get("preset") or "one_inch")
    if preset != "custom" and preset not in ID_PHOTO_PRESETS:
        raise HTTPException(status_code=400, detail="Unsupported ID photo preset")

    if preset == "custom":
        width = int(form.get("width") or 295)
        height = int(form.get("height") or 413)
    else:
        width, height = ID_PHOTO_PRESETS[preset]

    width = max(120, min(width, 1600))
    height = max(120, min(height, 2200))
    dpi = max(72, min(int(form.get("dpi") or 300), 600))
    profile = str(form.get("profile") or "sharp")
    if profile not in ("sharp", "fur"):
        profile = "sharp"

    head_height_ratio = float(form.get("head_height_ratio") or 0.72)
    top_margin_ratio = float(form.get("top_margin_ratio") or 0.08)
    face_alignment = str(form.get("face_alignment") or "1") == "1"

    try:
        result = await run_id_photo(
            input_data,
            width,
            height,
            dpi,
            profile,
            head_height_ratio,
            top_margin_ratio,
            face_alignment,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("id photo failed: %s", exc)
        raise HTTPException(status_code=500, detail="ID photo processing failed")

    return {
        "ok": True,
        "width": width,
        "height": height,
        "dpi": dpi,
        "preset": preset,
        **result,
    }


@app.post("/api/id-photo/add-background", dependencies=[Depends(verify_origin)])
@limiter.limit("10/minute;100/day")
async def add_id_photo_background(request: Request, body: AddBackgroundRequest):
    try:
        transparent = _base64_to_image(body.image_base64)
        colored = _compose_background(transparent, body.color)
        image_base64 = await asyncio.to_thread(_encode_jpeg_to_target_kb, colored, body.dpi, body.kb)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("id photo background failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid ID photo image")

    return {"ok": True, "image_base64": image_base64, "format": "jpeg"}


@app.post("/api/id-photo/layout", dependencies=[Depends(verify_origin)])
@limiter.limit("10/minute;100/day")
async def create_id_photo_layout(request: Request, body: LayoutRequest):
    try:
        src = _base64_to_image(body.image_base64)
        photo = _compose_background(src, body.color)
        paper_w, paper_h = ID_PHOTO_PAPERS.get(body.paper, ID_PHOTO_PAPERS["6inch"])
        margin = 36
        gap = 24
        cols = max(1, (paper_w - margin * 2 + gap) // (photo.width + gap))
        rows = max(1, (paper_h - margin * 2 + gap) // (photo.height + gap))
        layout = Image.new("RGB", (paper_w, paper_h), (255, 255, 255))
        used_w = cols * photo.width + (cols - 1) * gap
        used_h = rows * photo.height + (rows - 1) * gap
        start_x = (paper_w - used_w) // 2
        start_y = (paper_h - used_h) // 2
        for row in range(rows):
            for col in range(cols):
                x = start_x + col * (photo.width + gap)
                y = start_y + row * (photo.height + gap)
                layout.paste(photo, (x, y))
        image_base64 = await asyncio.to_thread(_encode_jpeg_to_target_kb, layout, body.dpi, body.kb)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("id photo layout failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid ID photo image")

    return {
        "ok": True,
        "image_base64": image_base64,
        "format": "jpeg",
        "paper_width": paper_w,
        "paper_height": paper_h,
        "copies": rows * cols,
    }


@app.post("/api/id-photo/human-matting", dependencies=[Depends(verify_origin)])
@limiter.limit("5/minute;50/day")
async def id_photo_human_matting(request: Request, file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image format")
    input_data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(input_data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large")
    profile = request.query_params.get("profile")
    if profile not in ("sharp", "fur"):
        profile = "sharp"
    try:
        output = await run_rembg(input_data, profile=profile)
        img = Image.open(io.BytesIO(output)).convert("RGBA")
        return {"ok": True, "image_base64": _image_to_base64(img, "PNG")}
    except Exception as exc:
        logger.exception("id photo matting failed: %s", exc)
        raise HTTPException(status_code=500, detail="Human matting failed")


# ============================================================
# Feedback API
# ============================================================
DATA_DIR = Path(os.getenv("DATA_DIR", "data"))
FEEDBACK_FILE = DATA_DIR / "feedback.json"
FEEDBACK_FAILED_FILE = DATA_DIR / "feedback-failed.json"
FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)


def _append_jsonl(path: Path, entry: dict) -> None:
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _hash_ip(ip: str) -> Optional[str]:
    """用 HMAC-SHA256 存 IP 指纹，不把明文 IP 写进反馈库。"""
    if not ip:
        return None
    key = FEEDBACK_IP_HASH_SALT or FEEDBACK_TOKEN
    if not key:
        return None
    return hmac.new(key.encode("utf-8"), ip.encode("utf-8"), hashlib.sha256).hexdigest()


async def _deliver_feedback(entry: dict) -> None:
    if not FEEDBACK_ENDPOINT:
        _append_jsonl(FEEDBACK_FILE, entry)
        logger.info("Feedback saved locally: %s", entry["id"])
        return

    headers = {"Content-Type": "application/json"}
    if FEEDBACK_TOKEN:
        headers["Authorization"] = f"Bearer {FEEDBACK_TOKEN}"

    try:
        async with httpx.AsyncClient(timeout=FEEDBACK_TIMEOUT_SECONDS) as client:
            resp = await client.post(FEEDBACK_ENDPOINT, json=entry, headers=headers)
            resp.raise_for_status()
        logger.info("Feedback delivered to Cloudflare Worker: %s", entry["id"])
    except Exception as exc:
        logger.warning("Feedback delivery failed, saved to fallback file: %s", exc)
        failed_entry = {
            **entry,
            "delivery_error": str(exc)[:500],
            "delivery_failed_at": datetime.now(timezone.utc).isoformat(),
        }
        _append_jsonl(FEEDBACK_FAILED_FILE, failed_entry)


@app.post("/api/feedback", dependencies=[Depends(verify_origin)])
@limiter.limit("3/minute")  # anti-spam
async def submit_feedback(request: Request, background_tasks: BackgroundTasks):
    """
    Queue user feedback for asynchronous delivery.

    Request body (JSON):
      { "message": "...", "email": "..." }   // email is optional

    Production storage: Cloudflare Worker -> D1 (configured by FEEDBACK_ENDPOINT).
    Fallback storage: JSON Lines under DATA_DIR.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    message = (body.get("message") or "").strip()
    if not message or len(message) > 2000:
        raise HTTPException(status_code=400, detail="Message is required (max 2000 chars)")

    email = (body.get("email") or "").strip()[:200]
    real_ip = get_real_ip(request)

    entry = {
        "id": str(uuid.uuid4()),
        "message": message,
        "email": email or None,
        "ip_hash": _hash_ip(real_ip),
        "user_agent": request.headers.get("user-agent", "")[:500] or None,
        "origin": (request.headers.get("origin") or "").rstrip("/") or None,
        "referer": request.headers.get("referer", "")[:500] or None,
        "page": body.get("page") if isinstance(body.get("page"), str) else None,
        "profile": body.get("profile") if body.get("profile") in ("sharp", "fur") else None,
        "backend_space": BACKEND_SPACE or None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    background_tasks.add_task(_deliver_feedback, entry)
    logger.info("Feedback queued: %s", entry["id"])
    return {"ok": True, "queued": True}


if __name__ == "__main__":
    # ⚠️ 这里必须传 app 对象，而不是字符串 "main:app"。
    #    字符串形式会让 uvicorn 再 import 一次 main 模块，导致顶层代码
    #    （包括 new_session 加载 IS-Net 模型）执行两遍，模型被加载两次、
    #    启动时间翻倍、内存占用翻倍。
    # ⚠️ 默认不开 reload：uvicorn 的 --reload 会 fork 子进程，onnxruntime 的
    #    线程池在 fork 后经常死锁（进程占 CPU 但永远不 listen）。
    #    需要热重载时改用命令行： uvicorn main:app --reload
    # 生产：python main.py（单 worker！内存限流不能跨进程）
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
