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
import ctypes
import gc
import io
import ipaddress
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import onnxruntime as ort
import uvicorn
from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image
from rembg import remove
from rembg.sessions import sessions_class
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

# 抠图 profile：决定 _run_rembg_sync 走哪条流水线。
#   sharp（默认）：BiRefNet 直出 + 温和 gamma 校正 + 1px 抗锯齿。
#                 ~1s/张（M1）/ ~2s/张（VPS），适合人物、商品、Logo 等"硬边"主体。
#   fur         ：BiRefNet + alpha matting + 前景色去污染。
#                 ~3~5s/张，单图内存峰值 +500MB；适合白猫/卷发/羽毛/植物等"软边"主体。
# 想做成"用户在前端按需选模式"时，把读取位置从环境变量改成 query/header 即可，pipeline 函数不感知。
_raw_profile = os.getenv("CUTOUT_PROFILE", "sharp").lower()
CUTOUT_PROFILE = _raw_profile if _raw_profile in ("sharp", "fur") else "sharp"

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

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


# ============================================================
# AI 模型初始化
# ============================================================
# BiRefNet (Bilateral Reference Network) 是 2024 年图像分割领域的 SOTA 模型。
# 相比 IS-Net / U2-Net，BiRefNet 在以下方面有本质提升：
#   - 边缘精度：发丝、毛绒、半透明物体的边界极其锐利
#   - 细节保留：小物件、镂空区域不会被误删
#   - 泛化能力：人物、商品、动物、建筑等场景通吃
#
# birefnet-general 模型权重约 230MB，首次运行时自动下载到 U2NET_HOME 目录。
#
# providers=["CPUExecutionProvider"]：强制 CPU 推理。
# Apple Silicon 上 onnxruntime 默认尝试 CoreML EP，但部分算子不支持会报错。
# 纯 CPU 在 M1/M2 上单张图 1~3 秒，完全够用。
def _create_birefnet_session():
    """加载 BiRefNet 并禁用 onnxruntime 的两个内存大坑。

    rembg 自带的 new_session() 内部硬写 ort.SessionOptions()，没法外部覆盖；
    所以这里直接构造 session 类，复刻 new_session 中需要保留的 OMP 线程配置。

    enable_cpu_mem_arena=False
      ort 默认 CPU 内存池会"缓存推理峰值"——第一次跑大图后，arena 永久持有那个峰值的内存量，
      即使后续都是小图也不释放。实测 RSS 从 ~5.5GB → ~3GB（macOS）/ 预计 ~9GB → ~5GB（Linux），
      推理时间无回归（甚至略快，arena 的池化收益没起作用）。
    enable_mem_pattern=False
      mem_pattern 是针对"固定 shape 反复推理"做的分配模式缓存；我们每张图大小都不同，
      它反而会按最大见过的 shape 预留缓冲，纯负担。
    """
    sess_opts = ort.SessionOptions()
    sess_opts.enable_cpu_mem_arena = False
    sess_opts.enable_mem_pattern = False
    # 兼容 OMP_NUM_THREADS（new_session 原生支持，这里手动复刻）
    if "OMP_NUM_THREADS" in os.environ:
        n = int(os.environ["OMP_NUM_THREADS"])
        sess_opts.inter_op_num_threads = n
        sess_opts.intra_op_num_threads = n

    cls = next((sc for sc in sessions_class if sc.name() == "birefnet-general"), None)
    if cls is None:
        raise RuntimeError("birefnet-general session class not found in rembg")
    return cls("birefnet-general", sess_opts, ["CPUExecutionProvider"])


logger.info("Loading BiRefNet (SOTA) AI model for background removal... (cutout_profile=%s)", CUTOUT_PROFILE)
high_quality_session = _create_birefnet_session()


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


# ============================================================
# 主动内存回收
# ============================================================
# Linux glibc 默认要等"堆顶有 8MB 连续 free 块"才把页归还内核（M_TRIM_THRESHOLD=128KB×64）。
# 抠图任务的临时缓冲多是几百 MB 大块，free 之后散落在堆中间，RSS 长时间不下降。
# 显式跑 malloc_trim(0) 立即触发 trim，配合 Docker 端 MALLOC_ARENA_MAX=2 效果最佳。
#
# macOS/Windows/musl libc 上 dlopen 会失败，置 None → _release_memory 退化为只跑 gc.collect。
try:
    _libc_malloc_trim = ctypes.CDLL("libc.so.6").malloc_trim
    _libc_malloc_trim.argtypes = [ctypes.c_size_t]
    logger.info("malloc_trim hook ready (glibc detected)")
except (OSError, AttributeError):
    _libc_malloc_trim = None


def _release_memory() -> None:
    """每次推理结束后主动归还内存：gc 收循环引用，malloc_trim 把 free 页还给 OS。

    单次开销 ~5ms（gc 主导），相对 1~5s 的推理可忽略。
    在信号量内调用，确保下一个排队请求拿到的是已 trim 过的状态，不是峰值后的胖进程。
    """
    gc.collect()
    if _libc_malloc_trim is not None:
        _libc_malloc_trim(0)


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
    import cv2
    import numpy as np

    output_data = remove(
        data,
        session=high_quality_session,
        alpha_matting=False,
    )

    result_img = np.frombuffer(output_data, np.uint8)
    result_img = cv2.imdecode(result_img, cv2.IMREAD_UNCHANGED)
    if result_img is None or result_img.ndim < 3 or result_img.shape[2] < 4:
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
    import cv2
    import numpy as np
    from pymatting import estimate_foreground_ml

    output_data = remove(
        data,
        session=high_quality_session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=15,
        alpha_matting_erode_size=8,
    )

    result_img = np.frombuffer(output_data, np.uint8)
    result_img = cv2.imdecode(result_img, cv2.IMREAD_UNCHANGED)
    if result_img is None or result_img.ndim < 3 or result_img.shape[2] < 4:
        return output_data

    alpha_norm = result_img[:, :, 3].astype(np.float32) / 255.0

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

    # 清理 trimap 求解后零星的浮点 noise（< ~1% 透明度直接归零，避免暗色像素散点）
    alpha_u8 = result_img[:, :, 3]
    alpha_u8 = np.where(alpha_u8 < 3, 0, alpha_u8).astype(np.uint8)
    result_img[:, :, 3] = alpha_u8

    _, output_png = cv2.imencode(".png", result_img)
    return output_png.tobytes()


async def run_rembg(data: bytes, profile: Optional[str] = None) -> bytes:
    """
    在线程池里跑 rembg，同时用信号量限并发。

    为什么要丢线程池：
      rembg.remove() 是同步 CPU 密集函数；在 async 路由里直接调用会阻塞整个事件循环，
      其他请求全都卡住。

    为什么先抢信号量再进线程池：
      信号量排队是 await 级别的，成本极低；线程池资源有限（默认 40 线程），
      先抢令牌能让超额请求在 await 这里排队，不占线程。

    为什么 finally 里跑 _release_memory：
      推理产生的 numpy/pymatting 临时大块在 Python 层 free 之后，glibc 不会立刻归还内核。
      在信号量内做 trim，下一个排队的请求拿到的就是瘦身后的进程，避免 RSS 持续累积。
    """
    async with rembg_semaphore:
        try:
            return await asyncio.to_thread(_run_rembg_sync, data, profile)
        finally:
            _release_memory()


# ============================================================
# 路由
# ============================================================
@app.get("/")
async def root():
    return FileResponse("index.html")


@app.get("/output.css")
async def output_css():
    """本地 dev 时 index.html 通过后端 / 返回，样式同源加载需要这个端点；
    生产由 Cloudflare Pages 直接服务静态文件，此路径无人访问。"""
    return FileResponse("output.css", media_type="text/css")


@app.get("/app.js")
async def app_js():
    """共享前端逻辑（dropzone、上传、i18n 合并等）；同样仅本地 dev 路径，
    生产由 Cloudflare Pages 直接服务。"""
    return FileResponse("app.js", media_type="application/javascript")


# ---------- SEO landing 子页 ----------
# 每加一个 use case 子页都要在这里登记一行；不用 StaticFiles 是为了避免暴露整个项目目录
# （main.py / Dockerfile / requirements.txt 等不该被 HTTP 访问到）。
@app.get("/product-photo-background-remover/")
@app.get("/product-photo-background-remover")
async def landing_product_photo():
    return FileResponse("product-photo-background-remover/index.html")


@app.get("/portrait-background-remover/")
@app.get("/portrait-background-remover")
async def landing_portrait():
    return FileResponse("portrait-background-remover/index.html")


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


# ============================================================
# Feedback API
# ============================================================
FEEDBACK_FILE = Path("data/feedback.json")
FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)


@app.post("/api/feedback")
@limiter.limit("3/minute")  # anti-spam
async def submit_feedback(request: Request):
    """
    Save user feedback to a local JSON file.

    Request body (JSON):
      { "message": "...", "email": "..." }   // email is optional

    Storage: data/feedback.json (append-only JSON Lines format)
    Each line is one JSON object with: message, email, ip, timestamp.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    message = (body.get("message") or "").strip()
    if not message or len(message) > 2000:
        raise HTTPException(status_code=400, detail="Message is required (max 2000 chars)")

    email = (body.get("email") or "").strip()[:200]

    entry = {
        "message": message,
        "email": email or None,
        "ip": get_real_ip(request),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # Append as JSON Lines (one JSON object per line, easy to parse)
    with open(FEEDBACK_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    logger.info("Feedback received: %s", entry)
    return {"ok": True}


if __name__ == "__main__":
    # ⚠️ 这里必须传 app 对象，而不是字符串 "main:app"。
    #    字符串形式会让 uvicorn 再 import 一次 main 模块，导致顶层代码
    #    （包括 new_session 加载 IS-Net 模型）执行两遍，模型被加载两次、
    #    启动时间翻倍、内存占用翻倍。
    # ⚠️ 默认不开 reload：uvicorn 的 --reload 会 fork 子进程，onnxruntime 的
    #    线程池在 fork 后经常死锁（进程占 CPU 但永远不 listen）。
    #    需要热重载时改用命令行： uvicorn main:app --reload
    # 生产：uvicorn main:app --host 0.0.0.0 --port 8000  （单 worker！内存限流不能跨进程）
    uvicorn.run(app, host="0.0.0.0", port=8000)
