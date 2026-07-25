# pro-gpu — serverless GPU 抠图推理服务（Beam / Modal 双平台）

MiaoCut Pro 付费路径的 **GPU 数据面**。无状态：只做推理（BiRefNet-matting + 去彩边 → 透明 WebP，lossless），
鉴权/积分在 `pro-api` Worker（见 [docs/feature-pro-gpu-service.md](../docs/feature-pro-gpu-service.md)）。

```
浏览器 → Cloudflare → pro-api Worker(验JWT+查余额) → 本服务(Beam 或 Modal) → WebP → 扣分 → 返回
```

## 文件结构

| 文件 | 角色 |
|---|---|
| [cutout_core.py](cutout_core.py) | **抠图核心逻辑，平台无关**。模型加载、推理、去彩边、批量任务全流程都在这里。不含任何平台 SDK。 |
| [app.py](app.py) | Beam 适配层：`@asgi` 单图端点 + `@task_queue` 批量任务 |
| [modal_app.py](modal_app.py) | Modal 适配层：`@app.cls` 单图端点 + 批量任务 + 入队端点 |
| [estimate_foreground_ml_cupy.py](estimate_foreground_ml_cupy.py) | CuPy 去彩边 kernel（两平台共用） |

> ⚠️ **改抠图算法只改 `cutout_core.py`**，两个平台自动同步。适配层里只放平台胶水。
> 这是双平台对比能成立的前提：两边跑的是像素级一致的同一份代码，
> 测出来的耗时/失败率差异才能归因到平台本身，而不是代码漂移。

## 两档模型（benchmark 锁定）

| profile | 模型 | 分辨率 | 积分（Worker 侧） |
|---|---|---|---|
| `fast`（默认） | `ZhengPeng7/BiRefNet-matting` | 1024 | 1 |
| `fur` | `ZhengPeng7/BiRefNet_HR-matting` | 2048 | 2 |

## 为什么有两个平台

批量抠图（Phase 2）现在做 **Beam vs Modal 的 A/B 对比**：网关按 UTC 日期奇偶轮换，
偶数天投 Beam、奇数天投 Modal，跑一段时间后比「稳定性（失败率 / 冷启动率）」和「单张成本」，
再决定长期落到哪家。付费**单图同步**路径不参与轮换，始终走 Beam —— 那是用户实时等着的链路，不拿它做实验。

轮换规则和统计接口在 [pro-gateway/src/index.js](../pro-gateway/src/index.js)（搜 `pickBatchPlatform`）。

## 部署 · Beam

```bash
pip install beam-client          # Beam SDK（包名以官方为准）
./setup-beam.sh                  # 登录 + 创建 BATCH_CALLBACK_URL / BATCH_CALLBACK_SECRET

beam deploy app.py:web_server    # 单图同步端点  → 网关 BEAM_ENDPOINT
beam deploy app.py:batch_cutout  # 批量 Task Queue → 网关 BEAM_BATCH_URL
```

两个端点都要 `Authorization: Bearer <BEAM_TOKEN>`，token 配到网关 secret `BEAM_TOKEN`。

## 部署 · Modal

```bash
pip install modal
modal token new

# Secret：回调地址/密钥 + 入队端点自己的鉴权 token
#   BATCH_CALLBACK_SECRET 必须与 Beam 侧、Worker 侧完全同值
#   MIAOCUT_MODAL_TOKEN 自己生成（openssl rand -hex 32），配到网关 secret MODAL_TOKEN
modal secret create miaocut-batch \
    BATCH_CALLBACK_URL=https://pro-api.miaocut.app/internal/batch-callback \
    BATCH_CALLBACK_SECRET=<与 Beam/Worker 同值> \
    MIAOCUT_MODAL_TOKEN=<openssl rand -hex 32>

MIAOCUT_GPU=L40S modal deploy modal_app.py
```

部署完 Modal 打印两个 URL：

| Modal 打印的 URL | 配到网关 |
|---|---|
| `...-cutoutendpoint-web.modal.run` | （暂不用，单图仍走 Beam） |
| `...-batch-enqueue-app.modal.run` | `MODAL_BATCH_URL`（wrangler.toml vars） |

然后 `wrangler secret put MODAL_TOKEN`（填 `MIAOCUT_MODAL_TOKEN` 的值）。

### Modal 侧部署期变量（在**你本地**设，装饰器是本地求值的）

| 变量 | 默认 | 说明 |
|---|---|---|
| `MIAOCUT_GPU` | `L40S` | Modal 没有 RTX 4090。`L40S`(48G，fp16 算力最接近 4090，对比首选) / `A10G`(便宜但约 1/3 算力) / `L4`(最便宜最慢) |
| `MIAOCUT_MAX_CONTAINERS` | 5 | 批量最多并行多少个 GPU 容器，卡住成本上限 |
| `MIAOCUT_SCALEDOWN_S` | 60 | 空闲多久缩到 0，对齐 Beam 的 `keep_warm_seconds=60`，保证冷启动率可比 |

> ⚠️ 别用 `MODAL_` 前缀命名自定义变量 —— 那是 Modal CLI 自己的配置命名空间。

### Modal ≠ Beam 的几处适配

| 能力 | Beam | Modal |
|---|---|---|
| 容器启动钩子 | `on_start=load_models` | `@modal.enter()` |
| 单图 HTTP | `@asgi` | `@modal.asgi_app()`（在 `@app.cls` 里） |
| 异步批量 | `@task_queue`，自带「POST 队列 URL 即入队」 | 没有原生 HTTP 队列 → 额外起一个 CPU-only 的 `batch_enqueue_app`，收同样格式的 JSON 后 `.spawn()` 出 GPU 任务 |
| 本地模块 | 自动同步工作目录 | 必须显式 `add_local_python_source("cutout_core", "estimate_foreground_ml_cupy")`，否则容器里 `ModuleNotFoundError` |
| 持久卷 | `Volume(name=..., mount_path="/cache")` | `Volume.from_name(..., create_if_missing=True)` + `volumes={"/cache": vol}` |
| 单容器并发 | `asyncio.Semaphore(MAX_CONCURRENCY)` | `@modal.concurrent(max_inputs=1)` |

## 接口（仅 Worker 调用）

`POST /v1/remove-background?profile=fast|fur` — body 为图片字节（raw 或 multipart `image` 字段）。
返回 `image/webp`(RGBA) + 头 `X-Profile-Used` / `X-Processing-Ms` / `X-Request-Id` / `X-Platform`。
错误：`400` 空/缺图、`413` 超大、`422` 图片损坏/像素超限、`500` 推理异常。

`GET /healthz` 存活；`GET /readyz` 模型就绪。

批量入队 body（两平台格式一致）：

```json
{"job_id":"...","image_id":"...","input_key":"...","output_key":"...",
 "dl_url":"<R2 预签名 GET>","up_url":"<R2 预签名 PUT>","profile":"fast","platform":"modal"}
```

`job_id === "warmup"` 是网关下发的空任务：只拉起容器跑 `load_models`，不读写 R2、不动积分。

处理完回调 `POST $BATCH_CALLBACK_URL`，body 除了 `status/output_key/error`，还带 A/B 观测字段：
`platform`、`total_ms`、`cutout_ms`、`cold`（本容器第 1 个任务 = 刚冷启动）、`task_seq`。

## 配置（运行时环境变量，两平台通用）

| 变量 | 默认 | 说明 |
|---|---|---|
| `MAX_UPLOAD_MB` | 15 | 上限（Worker 侧也会先拦 `Content-Length`） |
| `MAX_IMAGE_PIXELS` | 16777216 | 4096×4096 像素上限 |
| `MAX_CONCURRENCY` | 1 | GPU 串行；并发靠平台横向扩容 |
| `DECONTAMINATE` | 1 | 去污染+去彩边，纯硬边图自动跳过 |
| `DECONTAM_MAX_EDGE` | 2048 | 前景色估计的最大边长，大图先降采样 |
| `WEBP_METHOD` | 0 | 0=最快编码，4=平衡压缩率 |
| `MIAOCUT_PLATFORM` | 适配层写死 | 日志/回调里的平台标记，网关据此归类统计 |

## 看对比结果

```bash
curl -H "X-Batch-Secret: $BATCH_CALLBACK_SECRET" \
  "https://pro-api.miaocut.app/v1/batch/platform-stats?days=14"
```

返回每天每平台的 `succeeded / failed / fail_rate / cold_rate / total_ms(avg,p50,p95) / gpu_busy_s`。
`gpu_busy_s` 是成功任务的 GPU 占用秒数之和，用来和各平台账单的计费时长对账、算单张成本。

## 关键约束

- **GPU**：Beam 用 RTX 4090（24GB）；Modal 用 `MIAOCUT_GPU` 指定（默认 L40S 48GB）。单图 bs1 显存富余（HR@2048 ~5GB、两模型常驻 ~7~8GB，16GB 都够）。
- **纯 scale-to-zero**：闲置缩到 0，零常驻成本；首请求遇冷启动（容器+模型加载约数秒），两边都设 60s 保温窗口让连续请求复用热容器。
- **不批处理**：BiRefNet 算力受限，凑批 0 收益，单张串行即可。
- **不落盘**：单图全程内存，保住「不存图」承诺（大批量 Phase 2 才落 R2）。

> ⚠️ Beam / Modal 的 SDK 装饰器和参数名随版本变化（`gpu` 取值、`on_start`、`keep_warm_seconds` / `scaledown_window`、`@modal.concurrent`、`add_local_python_source`、deploy 子命令等），部署前对一下当前官方文档。
