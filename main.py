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

import uvicorn
from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image
from rembg import new_session, remove
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
logger.info("Loading BiRefNet (SOTA) AI model for background removal...")
high_quality_session = new_session(
    "birefnet-general",
    providers=["CPUExecutionProvider"],
)


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


def _guided_filter(guide: 'np.ndarray', src: 'np.ndarray', radius: int, eps: float) -> 'np.ndarray':
    """
    边缘感知引导滤波 (Guided Filter)。

    与高斯模糊的本质区别：
      - 高斯模糊：所有像素一视同仁地平滑 → 边缘也被糊掉。
      - 引导滤波：以原图（guide）的边缘结构为"指引"，只在平坦区域平滑，
        在边缘附近保持锐利。效果类似双边滤波，但速度快得多（O(N)）。

    在抠图场景中：
      guide = 原始 RGB 图（提供边缘信息）
      src   = rembg 输出的 alpha 通道
      输出  = 边缘锐利、平坦区域平滑的精修 alpha

    参数：
      radius: 滤波窗口半径。越大平滑越强，但边缘保持不变。推荐 4~8。
      eps:    正则化参数。越小越忠于 guide 的边缘，推荐 1e-4 ~ 1e-2。
    """
    import cv2
    import numpy as np

    guide_f = guide.astype(np.float64) / 255.0
    src_f = src.astype(np.float64) / 255.0

    ksize = 2 * radius + 1

    mean_g = cv2.boxFilter(guide_f, -1, (ksize, ksize))
    mean_s = cv2.boxFilter(src_f, -1, (ksize, ksize))
    mean_gs = cv2.boxFilter(guide_f * src_f, -1, (ksize, ksize))
    mean_gg = cv2.boxFilter(guide_f * guide_f, -1, (ksize, ksize))

    cov_gs = mean_gs - mean_g * mean_s
    var_g = mean_gg - mean_g * mean_g

    a = cov_gs / (var_g + eps)
    b = mean_s - a * mean_g

    mean_a = cv2.boxFilter(a, -1, (ksize, ksize))
    mean_b = cv2.boxFilter(b, -1, (ksize, ksize))

    result = mean_a * guide_f + mean_b
    return np.clip(result * 255, 0, 255).astype(np.uint8)


def _run_rembg_sync(data: bytes) -> bytes:
    """
    三阶段顶级抠图流水线：

    第一阶段 - BiRefNet (SOTA) 直出 mask：
      不开 alpha_matting。BiRefNet 原生 mask 已经足够锐利，
      alpha_matting 反而会在边缘产生过宽的半透明过渡带（"光晕"）。

    第二阶段 - 引导滤波 (Guided Filter) 轻度精修：
      以原图灰度为引导，只消除平坦区域的细小噪点，
      不影响边缘锐度。参数非常保守 (eps=1e-2)。

    第三阶段 - 前景色去污染 (Color Decontamination)：
      这是消除"杂边/白边"的关键技术，也是 Adobe 等专业工具的核心差异。
      原理：在半透明边缘像素中，RGB 通道包含了背景色的混合信息。
      即使 alpha 值正确，显示时仍会看到背景色"渗透"出来（光晕效果）。
      去污染通过估算纯前景色并替换受污染的 RGB 值来消除这个问题。
    """
    import cv2
    import numpy as np

    # ---- 第一阶段：BiRefNet 直出（不开 alpha_matting）----
    output_data = remove(
        data,
        session=high_quality_session,
        alpha_matting=False,
    )

    # ---- 解码结果 ----
    result_img = np.frombuffer(output_data, np.uint8)
    result_img = cv2.imdecode(result_img, cv2.IMREAD_UNCHANGED)

    if result_img is None or result_img.ndim < 3 or result_img.shape[2] < 4:
        return output_data

    # 读取原图
    original = np.frombuffer(data, np.uint8)
    original = cv2.imdecode(original, cv2.IMREAD_COLOR)

    if original is None:
        return output_data

    # 确保尺寸一致
    h, w = result_img.shape[:2]
    if original.shape[:2] != (h, w):
        original = cv2.resize(original, (w, h), interpolation=cv2.INTER_LINEAR)

    alpha = result_img[:, :, 3].astype(np.float64)

    # ---- 第二阶段：Alpha 曲线重映射（Adobe 式硬边策略）----
    # 问题的根源：BiRefNet 输出的边缘有 5~20px 宽的半透明过渡带，
    # 这些半透明像素混合了背景色，在任何底色上都会显示为深色毛边。
    #
    # Adobe 的策略不是去"修复"这些像素的颜色，
    # 而是直接用陡峭的 S 曲线把半透明区域压缩到极窄的 1~2px：
    #   alpha < 20% → 0（全透明，直接裁掉）
    #   alpha > 80% → 255（全不透明，完全保留）
    #   中间部分 → 线性拉伸到 0~255
    #
    # 效果：边缘干净利落，像用剪刀剪的，没有任何毛边。
    low_thresh = 0.20   # alpha 低于 20% 的像素直接透明
    high_thresh = 0.80  # alpha 高于 80% 的像素直接不透明

    alpha_norm = alpha / 255.0
    # 线性重映射：[low, high] → [0, 1]
    alpha_remapped = (alpha_norm - low_thresh) / (high_thresh - low_thresh)
    alpha_remapped = np.clip(alpha_remapped, 0.0, 1.0)

    # 转回 uint8
    alpha_clean = (alpha_remapped * 255).astype(np.uint8)

    # ---- 第三阶段：1px 抗锯齿 ----
    # 硬边之后用极轻的高斯模糊做 1px 的亚像素抗锯齿，
    # 让边缘在视觉上平滑而非锯齿状（但仍然是锐利的）
    alpha_clean = cv2.GaussianBlur(alpha_clean, (3, 3), sigmaX=0.5)

    # 合成最终结果（RGB 保持原样，只改 alpha）
    result_img[:, :, 3] = alpha_clean
    _, output_png = cv2.imencode(".png", result_img)

    return output_png.tobytes()


async def run_rembg(data: bytes) -> bytes:
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
        return await asyncio.to_thread(_run_rembg_sync, data)


# ============================================================
# 路由
# ============================================================
@app.get("/")
async def root():
    return FileResponse("index.html")


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
    try:
        output_data = await run_rembg(input_data)
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
