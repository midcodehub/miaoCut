"""
MiaoCut Pro — Beam serverless GPU 抠图服务（平台适配层）。

⚠️ 图片处理逻辑全部在 cutout_core.py，这里**只**负责 Beam 平台的胶水：
   声明镜像 / GPU / Volume / Secret，把请求参数转成对 core 的调用。
   Modal 版是 modal_app.py，跑的是同一份 cutout_core —— 这样双平台对比
   测出来的差异才能归因到平台本身，而不是两边代码漂移。
   改抠图算法请改 cutout_core.py，两边同时生效。

两个入口，共用「模型加载 + 推理」:
  · @asgi       web_server    单图同步「字节→WebP」(Phase 1，付费单图)
  · @task_queue batch_cutout  批量异步:从 R2 读输入 → 抠图 → 写 R2 输出 (Phase 2)

职责:只做推理 +（批量时）读写 R2。鉴权 / 积分 / 任务编排都在 pro-api Worker。
两档模型(benchmark 锁定): fast=BiRefNet-matting@1024(1分) / fur=BiRefNet_HR-matting@2048(2分)。

⚠️ Beam SDK 装饰器/参数随版本会变(asgi / task_queue / function / secrets / gpu 取值等)，
   部署前对一下官方文档。Task Queue 的入队(Worker 侧)走 Beam REST API(带 Beam token)。
"""
import os

# 平台标记：必须在 import cutout_core 之前设置，core 会在日志和回调里带上它，
# 网关据此把每张图的耗时/成败归到对应平台的日统计里。
os.environ.setdefault("MIAOCUT_PLATFORM", "beam")

from beam import asgi, task_queue, Image, Volume

from cutout_core import (
    DEFAULT_PROFILE,
    MAX_CONCURRENCY,
    MAX_UPLOAD_BYTES,
    HF_PREFETCH_REPOS,
    PIP_BASE,
    PIP_BATCH,
    PIP_TORCH,
    PIP_TORCH_INDEX,
    PIP_WEB,
    load_models,
    normalize_profile,
    run_batch_task,
    run_cutout,
)

# 持久化缓存 Volume：CuPy 编译的 .cubin kernel 文件存在这里，跨冷启动共享
cache_volume = Volume(name="miaocut-kernel-cache", mount_path="/cache")


# ============================================================
# Beam 运行环境
# ============================================================
def _build_image(extra_packages):
    """按 cutout_core 里的统一依赖清单拼 Beam 镜像。
    两个平台用同一份清单，避免「Beam 上是 torch 2.4、Modal 上是 2.6」这种
    污染对比结论的差异。"""
    pkgs = " ".join(f'"{p}"' for p in PIP_BASE + extra_packages)
    return Image(
        python_version="python3.11",
        commands=[
            f"pip install --no-cache-dir {' '.join(PIP_TORCH)} --index-url {PIP_TORCH_INDEX}",
            f"pip install --no-cache-dir {pkgs}",
            *[f"hf download {repo}" for repo in HF_PREFETCH_REPOS],
        ],
    )


image = _build_image(PIP_WEB)         # 单图 Endpoint 用的镜像（含 fastapi）
batch_image = _build_image(PIP_BATCH)  # 批量 Task Queue 用的镜像（含 urllib3）


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
                png = await asyncio.to_thread(run_cutout, runners, img_bytes, profile)
        except ValueError as e:
            return _err(422, "invalid_image", str(e))
        except Exception as e:
            return _err(500, "internal_error", str(e)[:200])

        ms = int((time.perf_counter() - t0) * 1000)
        return Response(
            content=png, media_type="image/webp",
            headers={
                "X-Profile-Used": normalize_profile(profile),
                "X-Processing-Ms": str(ms),
                "X-Request-Id": rid,
                "X-Platform": "beam",
            },
        )

    return api


# ============================================================
# 批量异步 Task Queue（Phase 2）
# ============================================================
# Worker 入队(Beam REST API)时传一条任务的参数;每张图一个 task。
# 彻底移除 Boto3 依赖，使用 Cloudflare Worker 隧道走 Argo 骨干网传输。
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
        "BATCH_CALLBACK_SECRET",
    ],
)
def batch_cutout(context, job_id, image_id, input_key, output_key, dl_url, up_url,
                 profile="fast", platform="beam"):
    """处理单张图片的抠图任务。job_id == 'warmup' 时只拉起容器直接返回。

    platform 由网关下发（双平台轮换时用来标记这张图跑在哪个平台），
    缺省 "beam" 兼容老版本网关。
    """
    return run_batch_task(
        context.on_start_value,
        job_id=job_id, image_id=image_id,
        input_key=input_key, output_key=output_key,
        dl_url=dl_url, up_url=up_url,
        profile=profile, platform=platform,
    )
