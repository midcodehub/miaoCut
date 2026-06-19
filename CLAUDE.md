# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

MiaoCut 是一个免登录的在线 AI 抠图服务（[miaocut.app](https://miaocut.app)）。仓库同时包含前端和后端，但部署到不同的位置：

- **前端**：单文件 [index.html](index.html) + 编译后的 [output.css](output.css) → 部署到 Cloudflare Pages
- **后端**：FastAPI [main.py](main.py) + BiRefNet（rembg）→ Hugging Face Docker Spaces（[midcodex/miao_cut](https://huggingface.co/spaces/midcodex/miao_cut)、[midcodex/miao_cut2](https://huggingface.co/spaces/midcodex/miao_cut2)、[midcodex/miao_cut3](https://huggingface.co/spaces/midcodex/miao_cut3)）
- 前端通过 `https://api2.miaocut.app` 调后端；本地开发时切到 `http://127.0.0.1:8000`（判断逻辑在 [app.js](app.js)）

跨进程的状态（限流计数、并发信号量、模型权重）全部在后端 Python 进程内存里，**不**依赖 Redis 等外部存储。

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
# 一站式：CSS + 中文静态页（CI / 上线前必跑）
npm run build

# 单独构建
npm run build:css      # Tailwind CSS
npm run build:i18n     # 从 EN HTML + i18n 字典生成 zh/*/index.html + sitemap.xml

# 改 index.html 时开 watch
npm run watch:css
```

**重要**：
- 改 [index.html](index.html)、SEO 子页或 [id-photo-maker/index.html](id-photo-maker/index.html) 的任何 class 之后，必须重新跑 `npm run build:css` 并把新生成的 [output.css](output.css) 一起提交。生产环境由 Cloudflare Pages 直接 serve `output.css`，不会在线上构建。Tailwind 扫描范围见 [tailwind.config.js](tailwind.config.js)，后端 Python 字符串里的 class 不会被识别。
- 改任何 EN HTML（首页 + 5 个子工具）或 zh i18n 字典（HTML 内联的 `window.MIAOCUT_PAGE_I18N.zh` 或 `watermark.js / id-photo.js / old-photo.js` 里的 `i18n.zh`）之后，必须跑 `npm run build:i18n` 重新生成 `zh/*/index.html` 和 `sitemap.xml`，并把生成结果一起提交。否则中文静态页会和英文版漂移、Google 索引到的中文版会落后。脚本是幂等的，原理见 [scripts/build-i18n.mjs](scripts/build-i18n.mjs) 顶部注释。
- 不要手动编辑 `zh/*/index.html` 和 `sitemap.xml` —— 它们都是 build:i18n 的产物，下次 build 会被覆盖。改翻译要改源 i18n 字典。

### 部署

`main` 分支 push 后，[.github/workflows/deploy-backend.yml](.github/workflows/deploy-backend.yml) 自动触发：GitHub Actions 只打包 `Dockerfile / README.md / main.py / requirements.txt` 这几个后端运行文件，并分发推送到 Hugging Face Docker Spaces `midcodex/miao_cut`、`midcodex/miao_cut2`、`midcodex/miao_cut3`，由各 Space 分别构建和启动容器。GitHub Actions 需要配置 `HF_TOKEN` secret，且 token 需要有这 3 个 Space 的写权限。只在改了 `main.py / requirements.txt / Dockerfile / README.md / 该 workflow 文件` 时触发。手动 redeploy 走 GitHub Actions UI 的 `workflow_dispatch`。

前端由 Cloudflare Pages 直接 serve `index.html` + `output.css`，不会打进 Hugging Face Space 镜像。`python main.py` 本地启动时，如果当前目录存在 `index.html`，后端仍会顺手服务静态前端；Space 镜像里没有这些文件，根路径只返回健康检查 JSON。

## 架构关键点

### 后端：抠图流水线

`POST /api/remove-background` 的请求处理顺序（见 [main.py:437](main.py#L437)）：

1. **来源校验** `verify_origin` ([main.py:222](main.py#L222))：检查 `Origin`/`Referer` 在 `ALLOWED_ORIGINS` 白名单里。本地 dev 时该变量为空，会跳过校验。
2. **限流** `@limiter.limit("5/minute;50/day")`：按 `get_real_ip` ([main.py:127](main.py#L127)) 提取真实 IP。`TRUST_PROXY=1` 时取 `X-Forwarded-For`，否则用 socket 对端；IPv6 聚合到 `/64` 防地址跳变。
3. **大小+像素校验**：先看 `Content-Length`，再边读边截断，最后用 PIL `verify()` 兜底，避免内存炸弹。
4. **抢信号量再进线程池** `run_rembg` ([main.py:404](main.py#L404))：`rembg_semaphore` 限并发到 `MAX_CONCURRENCY`，然后 `asyncio.to_thread` 跑 CPU 密集的 BiRefNet 推理，避免阻塞 event loop。
5. **抠图分流** `_run_rembg_sync` ([main.py:274](main.py#L274))：按 profile 派发，profile 来自 `?profile=` query 参数（前端 toggle 控制） > `CUTOUT_PROFILE` 环境变量 > 默认 `sharp`：
   - **`sharp`**（默认快）：`_run_sharp_pipeline` ([main.py:289](main.py#L289)) —— 分割模型直出 mask + 温和 gamma=0.85 + 极窄死区 [0.02, 0.98] + 1px 高斯抗锯齿。底座模型由 `SHARP_MODEL` 环境变量决定，默认 `birefnet-general-lite-768`（BiRefNet-general-lite 在 768² 输入重导出的"折中档"，M1 ~3.8s，毛发质量接近 1024² BiRefNet、远好于 isnet）。它是裸 onnx（固定 768² 输入），由 `_BiRefNet768Session` 鸭子类型包装成 rembg 兼容 session 接入；模型文件按 `_find_sharp_768_model_path` 查找，缺失时回退 `SHARP_768_FALLBACK`（默认 `isnet-general-use`）。`SHARP_MODEL` 也可填任何 rembg 内置名：`isnet-general-use`（最快 ~1.3s，硬边够用、软边糙）或 `birefnet-general-lite`（1024² 发丝级最细，但 2 vCPU 上 25s+）。三档模型权重在 Docker 镜像里都预置，切换不用重新构建。后处理末尾还有一步**前景色去污染**（`_decontaminate_foreground`，`SHARP_DECONTAMINATE` 默认开）：用 pymatting `estimate_foreground_ml` 解出纯前景色替换半透明边缘被旧背景污染的 RGB，消除毛发/边缘的"灰黑脏边"，实测只 +~0.1s；纯硬边图自动跳过，大图（>`SHARP_DECONTAM_MAX_EDGE`）先下采样估计再放大，控耗时/内存。
   - **`fur`**（细腻慢）：`_run_fur_pipeline` ([main.py:339](main.py#L339)) —— `alpha_matting=True` 让 pymatting 在 trimap 未知带做闭式求解 + `estimate_foreground_ml` 解出纯前景色（消除半透明像素的背景色污染，这是 Adobe 那种"细腻"的关键）。~3~5s/张，适合白猫/卷发/羽毛/植物等"软边"主体。
6. 编码为 PNG 返回（不用 WebP，因为 alpha plane 编码会多耗 ~100ms，反而拖慢体感）。

### 后端：内存与并发预算

`MAX_CONCURRENCY` 是防 OOM 的关键旋钮（[main.py:74](main.py#L74) 有详细注释表）。粗算：
  - 常驻 ~1GB（Python + FastAPI + BiRefNet 权重）
  - sharp 单请求峰值 ~300~500MB
  - fur 单请求峰值 ~1~1.5GB（alpha matting + foreground estimation 是大头）

Hugging Face Space 建议先配 `MAX_CONCURRENCY=1`，稳定后再压测上调到 2。Space 侧不能像 VPS 一样通过 `docker run --memory` 精细控内存，所以并发旋钮要保守。

### 前端：单文件 SPA

[index.html](index.html) 把模板、样式钩子、脚本都塞在一起：

- **i18n**：`i18nData` 字典（zh/en） + `data-i18n` / `data-i18n-ph` 属性。语言来自 `localStorage.lang` 或浏览器语言（[index.html:428](index.html#L428)）。**新增任何用户可见文案都需要在 `i18nData.zh` 和 `i18nData.en` 都加一条**，否则切语言时会显示 key。
- **进度条**：用 `XMLHttpRequest` 而非 `fetch`，因为 `fetch` 至今没有 upload progress 事件。三段式：压缩 0→15%、上传 15→70%（真实字节进度）、AI 推理直接跳 90%（不做软爬假进度）。详见 [index.html:696](index.html#L696)。
- **图片压缩**：客户端先用 Canvas 压成 WebP `q=0.95` 再上传（[index.html:596](index.html#L596) 附近），减小带宽。
- **质量切换**：dropzone 上方有 sharp/fur 切换按钮，状态存 `localStorage.cutoutProfile`，上传时拼到 URL 的 `?profile=`。后端非法值/缺失会静默回退到 `CUTOUT_PROFILE` 环境变量，所以老前端兼容。
- [rewrite_html.py](rewrite_html.py) 是一次性把中文版 HTML 改成英文 + 注入 i18n key 的脚本，**不会**在构建/部署中跑，可以视作历史脚本，不要再依赖它。

### 反馈接口

`POST /api/feedback` ([main.py](main.py)) 只在请求内完成校验和排队，然后用 FastAPI `BackgroundTasks` 异步投递到 Cloudflare Worker（`FEEDBACK_ENDPOINT`），由 Worker 写入 D1。未配置 Worker 时退回 `${DATA_DIR}/feedback.json`；Worker 投递失败时写 `${DATA_DIR}/feedback-failed.json`。Hugging Face Space 上设置 `DATA_DIR=/data` 并开启 Persistent Storage 后，本地兜底文件重启不丢。`data/` 已在 `.gitignore`，不要提交。

### 证件照工具

[id-photo-maker/index.html](id-photo-maker/index.html) 是 Cloudflare Pages 上的证件照工具页，前端逻辑在 [id-photo-maker/id-photo.js](id-photo-maker/id-photo.js)。当前 MVP 后端接口在 [main.py](main.py)：

- `POST /api/id-photo/create`：复用现有 rembg/BiRefNet 生成透明底人像，优先用 MediaPipe Face Mesh 关键点检测眼睛线、头顶和下巴，必要时轻微旋转到双眼水平后裁切；MediaPipe 失败时退回 OpenCV Haar，再失败退回 PIL 透明主体居中裁切。
- `POST /api/id-photo/add-background`：给透明底证件照合成纯色背景，可选目标 KB。
- `POST /api/id-photo/layout`：生成 6-inch 排版照。
- `POST /api/id-photo/human-matting`：证件照场景的人像抠图接口。

注意：当前版本尚未接入 HivisionIDPhotos 的原生证件照模型；脸部关键点使用 MediaPipe Face Mesh。后续若要更接近 Hivision 的严格证件照规范，可以继续接入其人脸检测/裁切模块作为内部服务或独立 Space。

## 配置（环境变量）

后端可识别的环境变量集中在 [main.py:47-85](main.py#L47-L85)。生产至少要设：

```
TRUST_PROXY=1
ALLOWED_ORIGINS=https://miaocut.app,https://www.miaocut.app,https://midcodex-miao-cut.hf.space,https://midcodex-miao-cut2.hf.space,https://midcodex-miao-cut3.hf.space
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
