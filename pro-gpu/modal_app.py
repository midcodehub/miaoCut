"""
MiaoCut Pro — Modal serverless GPU 抠图服务（平台适配层）。

⚠️ 图片处理逻辑全部在 cutout_core.py，跟 Beam 版 (app.py) 共用同一份代码。
   这里只负责 Modal 平台的胶水。改抠图算法请改 cutout_core.py。

为什么要有这个文件：
   做 Beam vs Modal 的双平台 A/B —— 网关 (pro-gateway) 按 UTC 日期奇偶把批量
   任务轮流投给两个平台，跑一段时间后对比「稳定性（失败率/冷启动率）」和
   「单张成本」，再决定长期落到哪家。

三个入口:
  · CutoutEndpoint.web      单图同步 ASGI 端点（对齐 Beam 的 @asgi web_server）
  · BatchWorker.cutout      批量单图 GPU 任务（对齐 Beam 的 @task_queue batch_cutout）
  · batch_enqueue_app       给网关用的入队 HTTP 端点（Modal 没有 Beam 那种
                            「POST 到队列 URL 即入队」的原生 HTTP 队列，
                            所以用一个 CPU 小函数收请求，再 .spawn() 出 GPU 任务）

部署:
    pip install modal && modal token new
    modal secret create miaocut-batch \
        BATCH_CALLBACK_URL=https://pro-api.miaocut.app/internal/batch-callback \
        BATCH_CALLBACK_SECRET=<与 Worker 同值> \
        MIAOCUT_MODAL_TOKEN=<自己生成的长随机串，网关调入队端点时带>
    MIAOCUT_GPU=L40S modal deploy modal_app.py

    部署完 Modal 会打印两个 URL:
      ...-cutoutendpoint-web.modal.run       → 网关 MODAL_ENDPOINT
      ...-batch-enqueue-app.modal.run        → 网关 MODAL_BATCH_URL

GPU 选型（Modal 没有 RTX 4090，用 MIAOCUT_GPU 环境变量在部署时指定）:
  · L40S（默认）48GB，fp16 算力与 4090 最接近，单张耗时基本可比 —— 对比首选
  · A10G       24GB，更便宜但算力约 4090 的 1/3，fur@2048 会明显变慢
  · L4         24GB，最便宜也最慢，只适合测 fast@1024 的成本下限
⚠️ 变量名不要用 MODAL_ 前缀 —— 那是 Modal CLI 自己的配置命名空间。
"""
import os

# 平台标记：必须在 import cutout_core 之前设置。
# 注意这行在「本地部署时」和「远程容器里」都会执行，两边都拿到 "modal"。
os.environ.setdefault("MIAOCUT_PLATFORM", "modal")

import modal

from cutout_core import (
    DEFAULT_PROFILE,
    HF_PREFETCH_REPOS,
    MAX_CONCURRENCY,
    MAX_UPLOAD_BYTES,
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

# ============================================================
# 部署期配置（装饰器在本地求值，所以这些环境变量读的是你部署机器上的值）
# ============================================================
GPU_TYPE = os.environ.get("MIAOCUT_GPU", "L40S")
# 批量任务最多并行拉起多少个 GPU 容器。Beam 侧靠 max_pending_tasks + 自动扩缩，
# Modal 这边用 max_containers 卡住成本上限，避免一批 200 张瞬间烧出 200 个容器。
MAX_GPU_CONTAINERS = int(os.environ.get("MIAOCUT_MAX_CONTAINERS", "5"))
# 容器空闲多久缩到 0。对齐 Beam 的 keep_warm_seconds=60，保证两边冷启动率可比。
SCALEDOWN_WINDOW = int(os.environ.get("MIAOCUT_SCALEDOWN_S", "60"))

app = modal.App("miaocut-pro")

# 持久化缓存 Volume：CuPy 编译的 .cubin kernel 存这里，跨冷启动共享（对齐 Beam）
cache_volume = modal.Volume.from_name("miaocut-kernel-cache", create_if_missing=True)

# 回调地址 / 回调密钥 / 入队端点鉴权 token，都放在这个 Modal Secret 里
batch_secret = modal.Secret.from_name("miaocut-batch")


def _build_image(extra_packages):
    """按 cutout_core 里的统一依赖清单拼 Modal 镜像。

    ⚠️ 层顺序有讲究：add_local_python_source 必须放最后。Modal 把本地源码
       作为「local 层」处理，它后面不能再挂 run_commands 之类的远程构建步骤。
    ⚠️ Modal 1.x 起不再自动上传本地模块，cutout_core 和 estimate_foreground_ml_cupy
       必须显式声明，否则容器里 import 会 ModuleNotFoundError。
    """
    return (
        modal.Image.debian_slim(python_version="3.11")
        .pip_install(*PIP_TORCH, index_url=PIP_TORCH_INDEX)
        .pip_install(*PIP_BASE, *extra_packages)
        # CuPy kernel 缓存指到持久化 Volume 的挂载点（cutout_core 里也 setdefault 了，
        # 这里显式写一遍是为了让构建期也一致，避免 kernel 编到镜像临时目录里）
        .env({"CUPY_CACHE_DIR": "/cache/cupy", "MIAOCUT_PLATFORM": "modal"})
        # 权重烤进镜像，省掉线上首个冷启动去 HF 拉 ~1GB
        .run_commands(*[f"hf download {repo}" for repo in HF_PREFETCH_REPOS])
        .add_local_python_source("cutout_core", "estimate_foreground_ml_cupy")
    )


gpu_image = _build_image(PIP_WEB + PIP_BATCH)
# 入队端点不碰 GPU，用最小镜像，冷启动几百毫秒
enqueue_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("fastapi[standard]")
)


# ============================================================
# 单图同步端点（对齐 Beam 的 @asgi web_server）
# ============================================================
@app.cls(
    image=gpu_image,
    gpu=GPU_TYPE,
    volumes={"/cache": cache_volume},
    secrets=[batch_secret],
    scaledown_window=SCALEDOWN_WINDOW,
    timeout=600,
)
# max_inputs=MAX_CONCURRENCY：GPU 串行，跟 Beam 侧的 asyncio.Semaphore 等价。
# 并发靠 Modal 横向扩容，而不是单容器里塞多个请求（会抢显存）。
@modal.concurrent(max_inputs=MAX_CONCURRENCY)
class CutoutEndpoint:
    @modal.enter()
    def start(self):
        """容器启动钩子，等价于 Beam 的 on_start=load_models。"""
        self.runners = load_models()

    @modal.asgi_app()
    def web(self):
        import time
        import uuid
        import asyncio
        from fastapi import FastAPI, Request, Response, Query
        from fastapi.responses import JSONResponse

        runners = self.runners
        sem = asyncio.Semaphore(MAX_CONCURRENCY)
        api = FastAPI()

        def _err(status, error, message, **extra):
            return JSONResponse(status_code=status,
                                content={"error": error, "message": message, **extra})

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
                    "X-Platform": "modal",
                },
            )

        return api


# ============================================================
# 批量 GPU 任务（对齐 Beam 的 @task_queue batch_cutout）
# ============================================================
@app.cls(
    image=gpu_image,
    gpu=GPU_TYPE,
    volumes={"/cache": cache_volume},
    secrets=[batch_secret],
    scaledown_window=SCALEDOWN_WINDOW,
    max_containers=MAX_GPU_CONTAINERS,
    timeout=900,          # 单张最坏情况（冷启动 + fur@2048）也够
    retries=1,            # GPU 机器偶发故障时换机器重试一次；业务错误不会重试（函数内已 try 住）
)
@modal.concurrent(max_inputs=MAX_CONCURRENCY)
class BatchWorker:
    @modal.enter()
    def start(self):
        self.runners = load_models()

    @modal.method()
    def cutout(self, job_id, image_id, input_key, output_key, dl_url, up_url,
               profile="fast", platform="modal"):
        """处理单张图片：下载 → 抠图 → 上传 → 回调网关。
        job_id == 'warmup' 时只拉起容器直接返回（预热用）。"""
        return run_batch_task(
            self.runners,
            job_id=job_id, image_id=image_id,
            input_key=input_key, output_key=output_key,
            dl_url=dl_url, up_url=up_url,
            profile=profile, platform=platform,
        )


# ============================================================
# 入队端点（网关 → Modal）
# ============================================================
# Beam 的 task_queue 自带一个「POST 到这个 URL 就等于入队」的 HTTP 接口，
# Modal 没有对应物：Modal 的异步派发是 SDK 侧的 .spawn()。
# 所以这里起一个 CPU-only 的小 ASGI 函数，收网关的 JSON（格式与 Beam 完全一致），
# 校验 token 后 .spawn() 出 GPU 任务，立即返回 —— 网关两边的调用代码就能长一样。
@app.function(
    image=enqueue_image,
    secrets=[batch_secret],
    scaledown_window=300,   # 入队端点便宜，多热一会儿减少网关侧的冷启动等待
    timeout=60,
)
@modal.concurrent(max_inputs=100)   # 纯 IO，单容器扛并发入队没问题
@modal.asgi_app()
def batch_enqueue_app():
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse

    api = FastAPI()

    @api.get("/healthz")
    def healthz():
        return {"ok": True}

    @api.post("/")
    @api.post("/enqueue")
    async def enqueue(request: Request):
        # 鉴权：网关带 Authorization: Bearer <MIAOCUT_MODAL_TOKEN>，
        # 与 Beam 侧带 BEAM_TOKEN 的形状一致，网关不用分叉写两套 header 逻辑。
        expected = os.environ.get("MIAOCUT_MODAL_TOKEN", "")
        auth = request.headers.get("authorization", "")
        token = auth[7:] if auth[:7].lower() == "bearer " else ""
        if not expected or token != expected:
            return JSONResponse(status_code=401, content={"error": "unauthorized"})

        body = await request.json()
        try:
            call = BatchWorker().cutout.spawn(
                job_id=str(body["job_id"]),
                image_id=str(body["image_id"]),
                input_key=body.get("input_key"),
                output_key=body.get("output_key"),
                dl_url=body.get("dl_url"),
                up_url=body.get("up_url"),
                profile=body.get("profile", "fast"),
                platform=body.get("platform", "modal"),
            )
        except KeyError as e:
            return JSONResponse(status_code=400, content={"error": f"missing_field:{e.args[0]}"})
        except Exception as e:
            # 入队失败要让网关知道（它会当即释放这张图冻结的积分）
            return JSONResponse(status_code=502, content={"error": "spawn_failed",
                                                          "message": str(e)[:200]})

        return {"ok": True, "task_id": call.object_id}

    return api
