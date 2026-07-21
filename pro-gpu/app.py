"""
MiaoCut Pro — Beam serverless GPU 抠图服务。

两个入口，共用「模型加载 + 推理」:
  · @asgi       web_server    单图同步「字节→WebP」(Phase 1，付费单图)
  · @task_queue batch_cutout  批量异步:从 R2 读输入 → 抠图 → 写 R2 输出 (Phase 2)

职责:只做推理 +（批量时）读写 R2。鉴权 / 积分 / 任务编排都在 pro-api Worker。
两档模型(benchmark 锁定): fast=BiRefNet-matting@1024(1分) / fur=BiRefNet_HR-matting@2048(2分)。

⚠️ Beam SDK 装饰器/参数随版本会变(asgi / task_queue / function / secrets / gpu 取值等)，
   部署前对一下官方文档。Task Queue 的入队(Worker 侧)走 Beam REST API(带 Beam token)。
"""
import os
import json
import time as _time
import threading

# ── CUDA 环境预展 ────────────────────────────────────────────────────────────────
# 绝对不能在这里设置 CUDA_VISIBLE_DEVICES，否则会触发 PyTorch 保护机制
# 报错: "changing env variable CUDA_VISIBLE_DEVICES after program start"

# HF 权重默认缓存在镜像内 (~/.cache/huggingface)
# CuPy CUDA kernel 编译缓存：挂载到 Beam Volume /cache/cupy，实现跨冷启动持久化
os.environ["CUPY_CACHE_DIR"] = "/cache/cupy"

from beam import asgi, function, task_queue, Image, Volume

# 持久化缓存 Volume：CuPy 编译的 .cubin kernel 文件存在这里，跨冷启动共享
cache_volume = Volume(name="miaocut-kernel-cache", mount_path="/cache")

# ============================================================
# 配置（环境变量可覆盖）
# ============================================================
MODELS = {
    "fast": {"repo": "ZhengPeng7/BiRefNet-matting",    "res": 1024},
    "fur":  {"repo": "ZhengPeng7/BiRefNet_HR-matting", "res": 2048},
}
DEFAULT_PROFILE = "fast"
PROFILE_ALIASES = {"sharp": "fast"}   # 兼容线上旧值

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "15")) * 1024 * 1024
MAX_IMAGE_PIXELS = int(os.getenv("MAX_IMAGE_PIXELS", str(4096 * 4096)))
MAX_CONCURRENCY = int(os.getenv("MAX_CONCURRENCY", "1"))     # 单图 Endpoint 内并发；批量靠 Beam 扩缩
DECONTAMINATE = os.getenv("DECONTAMINATE", "1") == "1"
DECONTAM_MAX_EDGE = int(os.getenv("DECONTAM_MAX_EDGE", "2048"))
WEBP_METHOD = int(os.getenv("WEBP_METHOD", "0"))  # 0=最快编码 4=平衡压缩率

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def _log(event, **kw):
    """输出结构化 JSON 行日志，便于 Datadog/Loki 聚合分析。"""
    record = {"ts": _time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime()), "event": event}
    record.update(kw)
    print(json.dumps(record, ensure_ascii=False))

# ============================================================
# Beam 运行环境
# ============================================================
_BASE_PACKAGES = 'transformers timm einops cupy-cuda11x pillow "numpy<2.0.0" kornia'

# 单图 Endpoint 用的镜像（含 fastapi）
image = Image(
    python_version="python3.11",
    commands=[
        "pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cu118",
        f"pip install --no-cache-dir {_BASE_PACKAGES} fastapi python-multipart",
        "hf download ZhengPeng7/BiRefNet-matting",
        "hf download ZhengPeng7/BiRefNet_HR-matting"
    ]
)
# 批量 Task Queue 用的镜像（使用 urllib3 维持骨干网隧道长连接）
batch_image = Image(
    python_version="python3.11",
    commands=[
        "pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cu118",
        f"pip install --no-cache-dir {_BASE_PACKAGES} urllib3",
        "hf download ZhengPeng7/BiRefNet-matting",
        "hf download ZhengPeng7/BiRefNet_HR-matting"
    ]
)


def _load_runner(repo, res):
    import torch
    import torch.nn.functional as F
    from torchvision import transforms
    from transformers import AutoModelForImageSegmentation

    torch.set_float32_matmul_precision("high")
    # cuDNN 自动选最优卷积算法（适合固定输入尺寸 1024/2048），预热后推理提速 10-20ms
    torch.backends.cudnn.benchmark = True

    # ⚠️ 显式统一 dtype：当前 transformers 上 from_pretrained 可能直接加载成 fp16，
    #    不统一就会崩「Input type (float) and bias type (Half) should be the same」。
    #    注意：新版 transformers 已将 torch_dtype 参数改名为 dtype。
    try:
        model = AutoModelForImageSegmentation.from_pretrained(
            repo, trust_remote_code=True, dtype=torch.float16, local_files_only=True
        )
        _log("model_cache_hit", repo=repo)
    except Exception:
        model = AutoModelForImageSegmentation.from_pretrained(
            repo, trust_remote_code=True, dtype=torch.float16, local_files_only=False
        )
        _log("model_downloaded", repo=repo)

    model = model.half().eval().to("cuda")
    tf = transforms.Compose([
        transforms.Resize((res, res)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])
    return {"model": model, "tf": tf, "res": res}


def _load_runner_once(repo, res):
    """加载模型（无重试）。
    CUDA 一旦初始化失败就进入永久 error state，同进程内任何重试都会立即失败。
    正确做法：直接 raise，让 Beam 换机器重试。"""
    return _load_runner(repo, res)


def _check_gpu_health():
    """在 import torch 之前用 subprocess 调 nvidia-smi 预检 GPU 健康状态。

    原理：nvidia-smi 直接调用 NVIDIA 驱动 ioctl，不经过 CUDA runtime。
    如果 nvidia-smi 都挂了，说明这台机器的 GPU 驱动/设备本身有问题，
    必须换机器——PyTorch 怎么重试都救不了。
    在 import torch 之前做这个检查，CUDA runtime 尚未初始化，
    所以不存在「runtime 已污染」的问题。
    """
    import subprocess

    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total,memory.free,temperature.gpu,pstate",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"nvidia-smi exited {result.returncode}: {result.stderr.strip()[:200]}"
            )
        lines = [l.strip() for l in result.stdout.strip().splitlines() if l.strip()]
        if not lines:
            raise RuntimeError("nvidia-smi returned no GPU info")
        # 打印 GPU 信息便于调试
        for line in lines:
            parts = [p.strip() for p in line.split(",")]
            _log("gpu_health", gpu=parts[0], name=parts[1],
                 mem_total_mib=parts[2], mem_free_mib=parts[3],
                 temp_c=parts[4], pstate=parts[5])
        _log("gpu_health_ok", gpu_count=len(lines))
    except FileNotFoundError:
        # 容器里没有 nvidia-smi —— 极少见，跳过预检，让 torch 自己报错
        _log("gpu_health_skip", reason="nvidia-smi not found")
    except subprocess.TimeoutExpired:
        raise RuntimeError(
            "[gpu_health] nvidia-smi timed out (15s) — GPU driver may be hung, forcing reschedule"
        )
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"[gpu_health] nvidia-smi check failed: {e}") from e


def load_models():
    """容器启动跑一次：加载模型 + 预热 GPU forward + 预热 CuPy 去彩边。

    ⚠️ CUDA 初始化策略（重要）：
    Beam "CUDA unknown error" 的根本原因不是竞争条件（sleep 解决不了），
    而是这台机器的 GPU 驱动/CUDA driver 本身处于异常状态（前一个容器
    的残留 GPU context 没有彻底清理，或者驱动本身崩溃）。

    正确解法（三步）：
      1. import torch 之前用 nvidia-smi 预检 GPU 健康状态（不触碰 CUDA runtime）
         → nvidia-smi 失败 = 这台机器有问题，立即 raise 让 Beam 换机器
      2. import torch 后立即 torch.cuda.init()，失败也立即 raise（不重试）
         → 一旦 CUDA runtime 进入 error state，同进程内所有后续 CUDA 调用都会失败
      3. 由 Beam 在新进程/新机器上重试（平台层换机器，才能真正恢复）

    为什么 sleep 无效：
      sleep 只能解决「Beam 异步设置 CUDA_VISIBLE_DEVICES」这类竞争条件，
      无法恢复「CUDA driver 本身已损坏」的状态——那需要驱动重置或换机器。
    """
    t0 = _time.perf_counter()

    # ── 0. GPU 健康预检（在 import torch 之前！）──────────────────────────
    # nvidia-smi 直接走驱动 ioctl，不经过 CUDA runtime，
    # 失败说明这台机器 GPU 根本不可用，立即让 Beam 换机器。
    _log("warmup_start", step="gpu_health_check")
    _check_gpu_health()   # 失败则 raise，Beam 换机器重试

    # ── 1. 现在才 import torch，CUDA runtime 才真正初始化 ──────────────────
    import torch

    try:
        torch.cuda.init()
        dev = torch.cuda.get_device_name(0)
        _log("cuda_init_ok", device=dev)
    except Exception as e:
        # nvidia-smi 已通过但 CUDA runtime 仍失败——极罕见，同样换机器
        raise RuntimeError(
            f"[load_models] CUDA runtime init failed after nvidia-smi passed "
            f"(forcing Beam reschedule): {e}"
        ) from e

    # ── 2. 加载模型（直接加载，不做 CUDA 错误重试）────────────────────────
    # CUDA 已经 init 成功，此后出现的错误是真实的模型加载错误，直接 raise。
    r = _load_runner_once(MODELS["fast"]["repo"], MODELS["fast"]["res"])
    _log("model_loaded", profile="fast", elapsed_s=round(_time.perf_counter()-t0, 1))

    # ── 3. 预热 GPU forward ───────────────────────────────────────────────
    t1 = _time.perf_counter()
    with torch.no_grad():
        x = torch.zeros(1, 3, r["res"], r["res"], dtype=torch.float16, device="cuda")
        r["model"](x)
    torch.cuda.synchronize()
    _log("gpu_warmup", elapsed_s=round(_time.perf_counter()-t1, 1))

    # ── 4. 预热 CuPy 去彩边 ──────────────────────────────────────────────
    t_cupy = _time.perf_counter()
    try:
        import numpy as np
        from estimate_foreground_ml_cupy import estimate_foreground_ml_cupy
        a = np.zeros((10, 10), dtype=np.uint8)
        rgb = np.zeros((10, 10, 3), dtype=np.uint8)
        estimate_foreground_ml_cupy(rgb, a)
        _log("cupy_warmup", elapsed_s=round(_time.perf_counter()-t_cupy, 1))
    except Exception as e:
        _log("cupy_warmup_skip", reason=str(e))

    runners = {"fast": r}
    runners["_configs"] = MODELS      # 懒加载时查找模型配置
    runners["_lock"] = threading.Lock()  # 保护懒加载并发安全

    # ── 5. 预热 HTTP 长连接池 ─────────────────────────────────────────────
    try:
        import urllib3
        http = urllib3.PoolManager(maxsize=10, retries=urllib3.Retry(3, backoff_factor=0.5))
        runners["http"] = http
        _log("http_pool_init")
    except Exception as e:
        _log("http_pool_skip", reason=str(e))

    _log("warmup_done", total_elapsed_s=round(_time.perf_counter()-t0, 1))
    return runners


# ============================================================
# 推理核心（单图 Endpoint 与 批量 Task Queue 共用）
# ============================================================
def _decontaminate(rgb, a):
    """GPU 极速去污染 + 去彩边。
    恢复使用 CuPy 的高质量去彩边算法（estimate_foreground_ml_cupy）。
    完美对齐 benchmark 逻辑，不破坏发丝效果。
    全程使用 float32 对齐 CuPy kernel 内部精度。"""
    import numpy as np
    from estimate_foreground_ml_cupy import estimate_foreground_ml_cupy
    from PIL import Image as PILImage
    
    # 纯硬边直接跳过
    if np.sum((a > 0.05) & (a < 0.95)) < 100:
        return rgb
        
    h, w = a.shape
    s = min(1.0, DECONTAM_MAX_EDGE / max(h, w))
    if s < 1.0:
        sw, sh = int(w * s), int(h * s)
        srgb = np.asarray(PILImage.fromarray((rgb * 255).astype(np.uint8)).resize((sw, sh)), np.float32) / 255.0
        sa = np.asarray(PILImage.fromarray((a * 255).astype(np.uint8)).resize((sw, sh)), np.float32) / 255.0
    else:
        srgb, sa = rgb, a
        
    F = np.clip(estimate_foreground_ml_cupy(srgb, sa), 0, 1)
    
    if s < 1.0:
        F = np.asarray(PILImage.fromarray((F * 255).astype(np.uint8)).resize((w, h)), np.float32) / 255.0
        
    return F


def _run_cutout(runners, img_bytes, profile):
    """字节 → 透明 WebP 字节。两个入口都调它。抛 ValueError 表示图片不合法。"""
    import io
    import time
    import numpy as np
    import torch
    import torch.nn.functional as F
    from PIL import Image as PILImage

    # ── profile 解析 + 懒加载 ──────────────────────────────────────────────
    profile = PROFILE_ALIASES.get(profile, profile)
    if profile not in MODELS:
        raise ValueError(f"unknown_profile:{profile}")
    if profile not in runners:
        with runners["_lock"]:
            if profile not in runners:  # double-check locking
                _log("lazy_load_start", profile=profile)
                cfg = runners["_configs"][profile]
                runners[profile] = _load_runner_once(cfg["repo"], cfg["res"])
                # 预热新加载的模型
                import torch as _th
                with _th.no_grad():
                    _x = _th.zeros(1, 3, cfg["res"], cfg["res"], dtype=_th.float16, device="cuda")
                    runners[profile]["model"](_x)
                _th.cuda.synchronize()
                _log("lazy_load_done", profile=profile)

    t0 = time.perf_counter()
    # 快速文件头签名校验（比 PIL verify() 快几个数量级，且避免双重解析开销）
    _MAGIC_PREFIXES = (b'\xff\xd8\xff', b'\x89PNG', b'RIFF', b'GIF8', b'BM')
    if not img_bytes[:4].startswith(_MAGIC_PREFIXES):
        raise ValueError("invalid_image")
    try:
        pil = PILImage.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception:
        raise ValueError("invalid_image")
    if pil.width * pil.height > MAX_IMAGE_PIXELS:
        raise ValueError("too_many_pixels")
    t_decode = time.perf_counter()

    r = runners[profile]
    # inference_mode 比 no_grad 更快：额外跳过 autograd 元数据分配
    with torch.inference_mode():
        x = r["tf"](pil).unsqueeze(0).half().to("cuda")
        alpha_t = r["model"](x)[-1].sigmoid()          # [1,1,H',W'] float16，仍在 GPU
        # GPU 直接双线性上采样到原图尺寸，避免 CPU PIL resize + uint8 精度损失
        a_full = F.interpolate(
            alpha_t.float(),
            size=(pil.height, pil.width),
            mode="bilinear",
            align_corners=False,
        ).squeeze().cpu().numpy()                       # [H,W] float32 in [0,1]
    torch.cuda.synchronize()
    t_gpu = time.perf_counter()

    rgb = np.asarray(pil, np.float32) / 255.0
    if DECONTAMINATE:
        rgb = _decontaminate(rgb, a_full)
    t_decontam = time.perf_counter()

    out = np.dstack([np.clip(rgb, 0, 1), a_full])
    rgba = (out * 255).astype(np.uint8)

    # 向量化置零：alpha=0 的像素 RGB 直接清零（一步完成，无需 .any() 额外扫描）
    rgba[rgba[:, :, 3] == 0, :3] = 0

    buf = io.BytesIO()
    PILImage.fromarray(rgba, "RGBA").save(buf, format="WEBP", lossless=True, method=WEBP_METHOD)
    t_encode = time.perf_counter()

    _log("cutout", width=pil.width, height=pil.height, profile=profile,
         decode_ms=int((t_decode-t0)*1000), gpu_ms=int((t_gpu-t_decode)*1000),
         decontam_ms=int((t_decontam-t_gpu)*1000), encode_ms=int((t_encode-t_decontam)*1000),
         total_ms=int((t_encode-t0)*1000))
    return buf.getvalue()


# ============================================================
# 单图同步 Endpoint（Phase 1，付费单图）
# ============================================================
@asgi(
    name="miaocut-cutout",
    image=image,
    gpu="RTX4090",
    on_start=load_models,
    keep_warm_seconds=60,
    volumes=[cache_volume],   # CuPy .cubin 编译缓存，跨冷启动持久化
)
def web_server(context):
    import time
    import uuid
    import asyncio
    from fastapi import FastAPI, Request, Response, Query
    from fastapi.responses import JSONResponse

    runners = context.on_start_value
    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    api = FastAPI()

    def _err(status, error, message, **extra):
        return JSONResponse(status_code=status, content={"error": error, "message": message, **extra})

    @api.get("/healthz")
    def healthz():
        return {"ok": True}

    @api.get("/readyz")
    def readyz():
        return {"ready": runners is not None}

    @api.post("/v1/remove-background")
    async def remove_background(request: Request, profile: str = Query(DEFAULT_PROFILE)):
        rid = str(uuid.uuid4())
        ctype = request.headers.get("content-type", "")
        if ctype.startswith("multipart/form-data"):
            form = await request.form()
            up = form.get("image")
            if up is None:
                return _err(400, "bad_request", "missing 'image' field")
            img_bytes = await up.read()
        else:
            img_bytes = await request.body()
        if not img_bytes:
            return _err(400, "bad_request", "empty body")
        if len(img_bytes) > MAX_UPLOAD_BYTES:
            return _err(413, "payload_too_large", f"max {MAX_UPLOAD_BYTES} bytes")

        t0 = time.perf_counter()
        try:
            async with sem:
                png = await asyncio.to_thread(_run_cutout, runners, img_bytes, profile)
        except ValueError as e:
            return _err(422, "invalid_image", str(e))
        except Exception as e:
            return _err(500, "internal_error", str(e)[:200])

        ms = int((time.perf_counter() - t0) * 1000)
        norm = PROFILE_ALIASES.get(profile, profile)
        if norm not in MODELS:
            norm = DEFAULT_PROFILE
        return Response(
            content=png, media_type="image/webp",
            headers={"X-Profile-Used": norm, "X-Processing-Ms": str(ms), "X-Request-Id": rid},
        )

    return api


# ============================================================
# 批量异步 Task Queue（Phase 2）
# ============================================================
def _batch_callback(payload):
    """把单图结果回调给 pro-api Worker（→ 结算/释放积分 + 更新任务进度）。失败静默。
    需 Beam env/secret: BATCH_CALLBACK_URL（Worker 的 /internal/batch-callback）、BATCH_CALLBACK_SECRET。"""
    import json
    import urllib.request

    url = os.environ.get("BATCH_CALLBACK_URL")
    if not url:
        return
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "X-Batch-Secret": os.environ["BATCH_CALLBACK_SECRET"],
                "User-Agent": "MiaoCut-Beam-Worker/1.0",
            },
        )
        urllib.request.urlopen(req, timeout=10).read()
    except Exception as e:
        _log("callback_error", error=str(e))


# Worker 入队(Beam REST API)时传一条任务的参数;每张图一个 task。
# 彻底移除 Boto3 依赖，使用 Cloudflare Worker 隧道走 Argo 骨干网传输
@task_queue(
    name="miaocut-batch",
    image=batch_image,
    gpu="RTX4090",
    on_start=load_models,
    keep_warm_seconds=60,
    max_pending_tasks=1000,
    volumes=[cache_volume],   # CuPy .cubin 编译缓存，跨冷启动持久化
    secrets=[
        "BATCH_CALLBACK_URL",
        "BATCH_CALLBACK_SECRET"
    ],
)
def batch_cutout(context, job_id, image_id, input_key, output_key, dl_url, up_url, profile="fast"):
    """
    处理单张图片的抠图任务。
    如果 job_id 为 'warmup'，则直接返回以完成预热。
    """
    if job_id == "warmup":
        _log("batch_warmup")
        return
        
    runners = context.on_start_value
    import time
    import urllib3
    
    http = runners.get("http")
    if not http:
        http = urllib3.PoolManager(maxsize=10, retries=urllib3.Retry(3, backoff_factor=0.5))
    
    cb_url = os.environ.get("BATCH_CALLBACK_URL", "")
    secret = os.environ.get("BATCH_CALLBACK_SECRET", "")
    headers = {"X-Batch-Secret": secret}
    
    try:
        t0 = time.perf_counter()
        # 1. 边缘直连极速下载 (预签名，流式读取减少峰值内存占用)
        res_dl = http.request('GET', dl_url, preload_content=False)
        try:
            if res_dl.status != 200:
                raise ValueError(f"Download failed: {res_dl.status}")
            img_bytes = res_dl.read()
        finally:
            res_dl.release_conn()
        t_dl = time.perf_counter()
        
        # 2. GPU 抠图
        png = _run_cutout(runners, img_bytes, profile)
        t_cut = time.perf_counter()
        
        # 3. 边缘直连极速上传 (预签名)
        res_up = http.request('PUT', up_url, headers={"Content-Type": "image/webp"}, body=png)
        if res_up.status != 200:
            raise ValueError(f"Upload failed: {res_up.status} - {res_up.data.decode('utf-8', 'ignore')[:100]}")
        t_up = time.perf_counter()
        
        _log("batch_done", job_id=job_id, image_id=image_id,
             r2_dl_ms=int((t_dl-t0)*1000), cutout_ms=int((t_cut-t_dl)*1000),
             r2_up_ms=int((t_up-t_cut)*1000))
        result = {"job_id": job_id, "image_id": image_id, "status": "done", "output_key": output_key}
    except ValueError as e:
        result = {"job_id": job_id, "image_id": image_id, "status": "failed", "error": str(e)}
    except Exception as e:
        result = {"job_id": job_id, "image_id": image_id, "status": "failed", "error": str(e)[:200]}

    _log("batch_result", **result)
    _batch_callback(result)
    return result
