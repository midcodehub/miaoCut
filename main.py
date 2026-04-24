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
import logging
import os
import re
from typing import Optional
from urllib.parse import quote

import uvicorn
from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
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
# isnet-general-use 相比默认 u2net 边缘更锐利、细节更好（如发丝）
logger.info("Loading high-quality IS-Net AI model for background removal...")
high_quality_session = new_session("isnet-general-use")


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


def _run_rembg_sync(data: bytes) -> bytes:
    """同步跑 rembg，独立抽出来方便丢线程池。"""
    return remove(
        data,
        session=high_quality_session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10,
    )


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


if __name__ == "__main__":
    # dev 模式：reload=True 改代码自动重启。
    # 生产请用： gunicorn -k uvicorn.workers.UvicornWorker -w 4 main:app
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
