# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

MiaoCut 是一个免登录的在线 AI 抠图服务（[miaocut.app](https://miaocut.app)）。本仓库（`midcodehub/miaoCut`，**公开、MIT**）包含免费版的三部分，各自部署到不同位置：

- **前端**：首页 [index.html](index.html) + 共用脚本 [app.js](app.js) + 编译后的 [output.css](output.css)，加上各 SEO 子页 / 子工具（`id-photo-maker/`、`watermark-remover/` 等）和多语言静态页（`zh/`、`hi/`、`pt-br/` 等）→ Cloudflare Pages
- **免费 API 网关**：Cloudflare Worker [url-proxy/](url-proxy/)（`api2.miaocut.app`），排队、重试，并给后端带上 `X-Gateway-Secret`
- **免费后端**：FastAPI [main.py](main.py) + BiRefNet（rembg，CPU）→ Hugging Face Docker Spaces（[midcodex/miao_cut](https://huggingface.co/spaces/midcodex/miao_cut)、[midcodex/miao_cut2](https://huggingface.co/spaces/midcodex/miao_cut2)、[midcodex/miao_cut3](https://huggingface.co/spaces/midcodex/miao_cut3)）
- 前端通过 `https://api2.miaocut.app` 调后端；本地开发时切到 `http://localhost:8000`（判断逻辑在 [app.js](app.js) 的 `API_BASE`）

跨进程的状态（限流计数、并发信号量、模型权重）全部在后端 Python 进程内存里，**不**依赖 Redis 等外部存储。

### 两个仓库：Pro 版是闭源的

付费的 Pro 版（批量抠图、积分、订阅、GPU 抠图）的**后端**在私有仓库 `midcodehub/miaoCut-pro`：`pro-gateway`（`pro-api.miaocut.app`）、`pro-gpu`（Beam / Modal）、`gpu-scheduler`、数据库迁移、`PRODUCT.md` 和相关文档。本仓库只放 Pro 的**前端页面**（`batch/`、`pricing/`、`account/`、`pro-account.js`、`pro-i18n.js`）。

- **Pro 后端代码、密钥、内部文档绝对不能提交到本仓库。** 本地可能还有 `pro-gateway/`、`pro-gpu/`、`gpu-scheduler/`、`PRODUCT.md` 的副本，已在 `.gitignore` 里，不要 `git add -f`。
- 本仓库是公开的，**任何密钥都不能写进文件**：Worker 用 `wrangler secret put`（Cloudflare **Secret** 类型），后端用 Hugging Face Space 的 Secrets。
- 批量和定价入口目前对外关闭（首页是「批量抠图 Pro 即将上线」候补名单，`/pricing/`、`/batch/` 不在菜单和 sitemap 里），等私有仓库后端上线并测试通过后再打开。

## 常用命令

### 后端（Python）

```bash
# 启动后端开发服务（已加载 .venv 中的依赖）
python main.py
# 模型首次加载会下载 ~224MB birefnet-general-lite 权重到 .u2net/

# 安装依赖
pip install -r requirements.txt

# 构建并本地运行 Docker 镜像
docker build -t miaocut-api .
docker run --rm -p 7860:7860 -e PORT=7860 -e MAX_CONCURRENCY=1 -v miaocut-data:/data miaocut-api
```

注意：
- 不要用 `uvicorn main:app` 字符串形式启动 —— 会让 uvicorn 二次 import `main.py`，导致 BiRefNet 模型被加载两次。本地 dev 用 `python main.py`（`__main__` 里直接传 app 对象）。
- 不要加 `--reload` —— onnxruntime 的线程池在 fork 后会死锁。需要热重载就重启进程。
- 不要加 `--workers 2+` —— 限流和并发控制都在进程内存里，多 worker 会让额度被乘上 worker 数。

### 前端（Tailwind + i18n）

```bash
# 一站式：CSS + 多语言静态页 + 资源版本戳（上线前必跑）
npm run build

# 单独构建
npm run build:css      # Tailwind CSS
npm run build:i18n     # 从 EN HTML + i18n 字典生成各语言静态页（zh/、hi/ 等）+ sitemap.xml
npm run build:assets   # 给 output.css / app.js 等引用加 ?v= 内容哈希，避免长缓存吃到旧文件

# SEO 守卫：对比 origin/main，检查 title / description / robots / canonical / hreflang / h1 / JSON-LD / sitemap 有没有被改
npm run check:seo

# 改 index.html 时开 watch
npm run watch:css
```

**重要**：
- 改 [index.html](index.html)、SEO 子页或 [id-photo-maker/index.html](id-photo-maker/index.html) 的任何 class 之后，必须重新跑 `npm run build:css` 并把新生成的 [output.css](output.css) 一起提交。生产环境由 Cloudflare Pages 直接 serve `output.css`，不会在线上构建。Tailwind 扫描范围见 [tailwind.config.js](tailwind.config.js)，后端 Python 字符串里的 class 不会被识别。
- 改任何 EN HTML（首页 + 5 个子工具）或 zh i18n 字典（HTML 内联的 `window.MIAOCUT_PAGE_I18N.zh` 或 `watermark.js / id-photo.js / old-photo.js` 里的 `i18n.zh`）之后，必须跑 `npm run build:i18n` 重新生成 `zh/*/index.html` 和 `sitemap.xml`，并把生成结果一起提交。否则中文静态页会和英文版漂移、Google 索引到的中文版会落后。脚本是幂等的，原理见 [scripts/build-i18n.mjs](scripts/build-i18n.mjs) 顶部注释。
- 不要手动编辑 `zh/*/index.html` 等语言目录下的页面和 `sitemap.xml` —— 它们都是 build:i18n 的产物，下次 build 会被覆盖。改翻译要改源 i18n 字典。
- 站点已有 SEO 排名。改任何可被收录的页面前后都跑 `npm run check:seo`，确认没有误改 title、description、h1、canonical 或删掉 sitemap 里的 URL；有意修改要先和用户确认。

### 部署

**`main` 一合并，下面几样会自动上线**，合并 PR 就等于改线上：

| 改了什么 | 自动发生什么 |
|---|---|
| 任何文件 | Cloudflare Pages 重新发布网站 |
| 任何文件（Cloudflare Workers Builds 连着本仓库） | 重新部署 `url-proxy` Worker（`api2.miaocut.app`）。`wrangler.toml` 的 `[vars]` 会覆盖后台的普通变量，所以密钥只能用 **Secret** 类型。详见 [url-proxy/README.md](url-proxy/README.md) |
| `main.py` / `requirements.txt` / `Dockerfile` / workflow 文件 | 重新构建 3 个 Hugging Face Space（见下） |
| 任何 `index.html` 页面 | [indexnow.yml](.github/workflows/indexnow.yml) 把改动的 URL 提交给 IndexNow（Bing 等）重新抓取 |

⚠️ 2026-10-18 教训：从 `url-proxy/wrangler.toml` 删掉明文密钥的 PR 合并后，Worker 被自动重部署、密钥随之消失，免费抠图全部 403 约 45 分钟。改 `url-proxy/` 前先确认 Cloudflare 上需要的 Secret 已经就位。

后端：`main` 分支 push 后，[.github/workflows/deploy-backend.yml](.github/workflows/deploy-backend.yml) 自动触发：GitHub Actions 只打包 `Dockerfile / README.md / main.py / requirements.txt` 这几个后端运行文件，并分发推送到 Hugging Face Docker Spaces `midcodex/miao_cut`、`midcodex/miao_cut2`、`midcodex/miao_cut3`，由各 Space 分别构建和启动容器（重建期间该 Space 暂时不可用，建议在流量低时合并）。GitHub Actions 需要配置 `HF_TOKEN` secret，且 token 需要有这 3 个 Space 的写权限。只在改了 `main.py / requirements.txt / Dockerfile / 该 workflow 文件` 时触发。手动 redeploy 走 GitHub Actions UI 的 `workflow_dispatch`。

测试 Space 由 [deploy-backend-dev.yml](.github/workflows/deploy-backend-dev.yml) 在 push 到 `dev` 分支时部署（目前公开仓库没有 `dev` 分支）。

前端由 Cloudflare Pages 直接 serve 静态文件，不会打进 Hugging Face Space 镜像。`python main.py` 本地启动时，如果当前目录存在 `index.html`，后端仍会顺手服务静态前端；Space 镜像里没有这些文件，根路径只返回健康检查 JSON。

## 架构关键点

### 后端：抠图流水线

`POST /api/remove-background` 的请求处理顺序（在 [main.py](main.py) 里搜 `@app.post("/api/remove-background"`）：

1. **来源校验** `verify_origin`：检查 `Origin`/`Referer` 在 `ALLOWED_ORIGINS` 白名单里。本地 dev 时该变量为空，会跳过校验。随后 `verify_gateway` 校验 `X-Gateway-Secret` 头必须等于 `GATEWAY_SECRET`（只放行经 `api2` 网关的请求）。
2. **限流** `@limiter.limit("10/minute;60/day")`（每个 Space 各算）：按 `get_real_ip` 提取真实 IP。`TRUST_PROXY=1` 时取 `X-Forwarded-For`，否则用 socket 对端；IPv6 聚合到 `/64` 防地址跳变。
3. **大小+像素校验**：先看 `Content-Length`，再边读边截断，最后用 PIL `verify()` 兜底，避免内存炸弹。
4. **抢信号量再进线程池** `run_rembg`：`rembg_semaphore` 限并发到 `MAX_CONCURRENCY`，然后 `asyncio.to_thread` 跑 CPU 密集的 BiRefNet 推理，避免阻塞 event loop。
5. **抠图分流** `_run_rembg_sync`：按 profile 派发，profile 来自 `?profile=` query 参数（前端 toggle 控制） > `CUTOUT_PROFILE` 环境变量 > 默认 `sharp`：
   - **`sharp`**（默认快）：`_run_sharp_pipeline` —— 分割模型直出 mask + 温和 gamma=0.85 + 极窄死区 [0.02, 0.98] + 1px 高斯抗锯齿。底座模型由 `SHARP_MODEL` 环境变量决定，默认 `birefnet-general-lite-768`（BiRefNet-general-lite 在 768² 输入重导出的"折中档"，M1 ~3.8s，毛发质量接近 1024² BiRefNet、远好于 isnet）。它是裸 onnx（固定 768² 输入），由 `_BiRefNet768Session` 鸭子类型包装成 rembg 兼容 session 接入；模型文件按 `_find_sharp_768_model_path` 查找，缺失时回退 `SHARP_768_FALLBACK`（默认 `isnet-general-use`）。`SHARP_MODEL` 也可填任何 rembg 内置名：`isnet-general-use`（最快 ~1.3s，硬边够用、软边糙）或 `birefnet-general-lite`（1024² 发丝级最细，但 2 vCPU 上 25s+）。三档模型权重在 Docker 镜像里都预置，切换不用重新构建。后处理末尾还有一步**前景色去污染**（`_decontaminate_foreground`，`SHARP_DECONTAMINATE` 默认开）：用 pymatting `estimate_foreground_ml` 解出纯前景色替换半透明边缘被旧背景污染的 RGB，消除毛发/边缘的"灰黑脏边"，实测只 +~0.1s；纯硬边图自动跳过，大图（>`SHARP_DECONTAM_MAX_EDGE`）先下采样估计再放大，控耗时/内存。
   - **`fur`**（细腻慢）：`_run_fur_pipeline` —— `alpha_matting=True` 让 pymatting 在 trimap 未知带做闭式求解 + `estimate_foreground_ml` 解出纯前景色（消除半透明像素的背景色污染，这是 Adobe 那种"细腻"的关键）。~3~5s/张，适合白猫/卷发/羽毛/植物等"软边"主体。
6. 编码为 PNG 返回（不用 WebP，因为 alpha plane 编码会多耗 ~100ms，反而拖慢体感）。

### 后端：内存与并发预算

`MAX_CONCURRENCY` 是防 OOM 的关键旋钮（[main.py](main.py) 里 `MAX_CONCURRENCY` 定义处有详细注释表）。粗算：
  - 常驻 ~1GB（Python + FastAPI + BiRefNet 权重）
  - sharp 单请求峰值 ~300~500MB
  - fur 单请求峰值 ~1~1.5GB（alpha matting + foreground estimation 是大头）

Hugging Face Space 建议先配 `MAX_CONCURRENCY=1`，稳定后再压测上调到 2。Space 侧不能像 VPS 一样通过 `docker run --memory` 精细控内存，所以并发旋钮要保守。

### 前端：首页 + app.js

[index.html](index.html) 放页面结构，逻辑在 [app.js](app.js)（首页和 inline 型子页共用）：

- **i18n**：[app.js](app.js) 里的 `BASE_I18N` 是共用字典，页面在 `<head>` 内联的 `window.MIAOCUT_PAGE_I18N` 放页面专属文案，运行时合并成 `i18nData`；HTML 上用 `data-i18n` / `data-i18n-ph` 属性。语言来自 `localStorage.lang` 或浏览器语言。**新增任何用户可见文案都需要在每种语言里都加一条**（至少 en 和 zh），否则切语言时会显示 key。`watermark-remover / old-photo-restoration / id-photo-maker` 的字典在各自的 JS 里。
- **进度条**：用 `XMLHttpRequest` 而非 `fetch`，因为 `fetch` 至今没有 upload progress 事件。三段式：压缩 0→15%、上传 15→70%（真实字节进度）、AI 推理直接跳 90%（不做软爬假进度）。
- **图片压缩**：客户端先用 Canvas 压成 WebP `q=0.95` 再上传，减小带宽。
- **质量切换**：dropzone 上方有 sharp/fur 切换按钮，状态存 `localStorage.cutoutProfile`，上传时拼到 URL 的 `?profile=`。后端非法值/缺失会静默回退到 `CUTOUT_PROFILE` 环境变量，所以老前端兼容。

### 反馈接口

`POST /api/feedback` ([main.py](main.py)) 只在请求内完成校验和排队，然后用 FastAPI `BackgroundTasks` 异步投递到 Cloudflare Worker（`FEEDBACK_ENDPOINT`），由 Worker 写入 D1。未配置 Worker 时退回 `${DATA_DIR}/feedback.json`；Worker 投递失败时写 `${DATA_DIR}/feedback-failed.json`。Hugging Face Space 上设置 `DATA_DIR=/data` 并开启 Persistent Storage 后，本地兜底文件重启不丢。`data/` 已在 `.gitignore`，不要提交。

### 证件照工具

[id-photo-maker/index.html](id-photo-maker/index.html) 是 Cloudflare Pages 上的证件照工具页，前端逻辑在 [id-photo-maker/id-photo.js](id-photo-maker/id-photo.js)。当前 MVP 后端接口在 [main.py](main.py)：

- `POST /api/id-photo/create`：复用现有 rembg/BiRefNet 生成透明底人像，优先用 MediaPipe Face Mesh 关键点检测眼睛线、头顶和下巴，必要时轻微旋转到双眼水平后裁切；MediaPipe 失败时退回 OpenCV Haar，再失败退回 PIL 透明主体居中裁切。
- `POST /api/id-photo/add-background`：给透明底证件照合成纯色背景，可选目标 KB。
- `POST /api/id-photo/layout`：生成 6-inch 排版照。
- `POST /api/id-photo/human-matting`：证件照场景的人像抠图接口。

⚠️ `requirements.txt` 把 Linux 上的 mediapipe 钉在 `0.10.18`：0.10.30 起删掉了 `mp.solutions`（包括 Face Mesh），装新版不会报错，但证件照会悄悄退回精度较差的 Haar。后端启动日志会打印 `mediapipe <版本>: face_mesh available`，没看到这行就说明退回了。要升级 mediapipe，得先把代码改成新的 Tasks API（`FaceLandmarker`）。

注意：当前版本尚未接入 HivisionIDPhotos 的原生证件照模型；脸部关键点使用 MediaPipe Face Mesh。后续若要更接近 Hivision 的严格证件照规范，可以继续接入其人脸检测/裁切模块作为内部服务或独立 Space。

## 配置（环境变量）

后端可识别的环境变量集中在 [main.py](main.py) 开头（文件顶部注释有生产配置示例）。生产至少要设：

```
TRUST_PROXY=1
ALLOWED_ORIGINS=https://miaocut.app,https://www.miaocut.app   # 建议不再列 *.hf.space，避免给直连后端留 Origin 白名单
GATEWAY_SECRET=<长随机串>   # 与 Cloudflare Worker 网关同一个值；后端据此只放行经网关的请求，封死直连 *.hf.space。留空=不校验
MAX_CONCURRENCY=1
ENABLE_DOCS=0          # 关掉 /docs 防接口枚举
CUTOUT_PROFILE=sharp   # 默认；前端 toggle 可按请求覆盖到 fur
SHARP_MODEL=birefnet-general-lite-768  # sharp 档底座，默认 768²折中（毛发好+快）；可设 isnet-general-use(最快)/birefnet-general-lite(1024²最细但慢)
DATA_DIR=/data          # Space Persistent Storage
PORT=7860               # Hugging Face Docker Space
MIAOCUT_OMP_NUM_THREADS=2
FEEDBACK_ENDPOINT=https://<worker-domain>/feedback
FEEDBACK_TOKEN=<same-secret-as-worker>
FEEDBACK_IP_HASH_SALT=<random-secret-for-ip-hmac>
BACKEND_SPACE=miao_cut  # 每个 Space 分别设 miao_cut / miao_cut2 / miao_cut3
```

`CUTOUT_PROFILE` 只是默认值，前端可以通过 `?profile=sharp|fur` query 参数按请求覆盖。非法/缺失值会静默回退到 env 默认。

本地 dev 时把 `ALLOWED_ORIGINS` 留空可跳过来源校验，并自动允许任意 origin。

## 写代码时记得

- 后端代码注释已经非常详细，多处带"为什么这么做"和踩坑记录 —— 改动这些注释覆盖的逻辑前先看注释（特别是 `main.py` 里 BiRefNet 配置、限流、并发、PNG vs WebP、`uvicorn.run(app, ...)` 等几处带 ⚠️ 的部分）。
- 前端的 `data-i18n` / `data-i18n-ph` 必须配对：HTML 里挂属性 + `i18nData` 里加 key。
- 改了任何会触发后端镜像变更的文件（见 workflow `paths` 列表），push 到 `main` 即上线到三个 Hugging Face Spaces。本地先跑通再 push。
