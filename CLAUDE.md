# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

MiaoCut 是一个免登录的在线 AI 抠图服务（[miaocut.app](https://miaocut.app)）。仓库同时包含前端和后端，但部署到不同的位置：

- **前端**：单文件 [index.html](index.html) + 编译后的 [output.css](output.css) → 部署到 Cloudflare Pages
- **后端**：FastAPI [main.py](main.py) + BiRefNet（rembg）→ Docker 镜像 → VPS（GHCR 自动部署）
- 前端通过 `https://api.miaocut.app` 调后端；本地开发时切到 `http://127.0.0.1:8000`（判断逻辑在 [index.html:357](index.html#L357)）

跨进程的状态（限流计数、并发信号量、模型权重）全部在后端 Python 进程内存里，**不**依赖 Redis 等外部存储。

## 常用命令

### 后端（Python）

```bash
# 启动后端开发服务（已加载 .venv 中的依赖）
python main.py
# 模型首次加载会下载 ~930MB BiRefNet 权重到 .u2net/

# 安装依赖
pip install -r requirements.txt

# 构建并本地运行 Docker 镜像
docker build -t miaocut-api .
docker run -d -p 8000:8000 -e MAX_CONCURRENCY=2 -v miaocut-data:/app/data miaocut-api
```

注意：
- 不要用 `uvicorn main:app` 字符串形式启动 —— 会让 uvicorn 二次 import `main.py`，导致 BiRefNet 模型被加载两次。本地 dev 用 `python main.py`（`__main__` 里直接传 app 对象）。
- 不要加 `--reload` —— onnxruntime 的线程池在 fork 后会死锁。需要热重载就重启进程。
- 不要加 `--workers 2+` —— 限流和并发控制都在进程内存里，多 worker 会让额度被乘上 worker 数。

### 前端（Tailwind）

```bash
# 一次性构建（CI / 上线前必跑）
npm run build:css

# 改 index.html 时开 watch
npm run watch:css
```

**重要**：改 [index.html](index.html) 的任何 class 之后，必须重新跑 `npm run build:css` 并把新生成的 [output.css](output.css) 一起提交。生产环境由 Cloudflare Pages 直接 serve `output.css`，不会在线上构建。Tailwind 只扫描 `index.html`（见 [tailwind.config.js](tailwind.config.js)），后端 Python 字符串里的 class 不会被识别。

### 部署

`main` 分支 push 后，[.github/workflows/deploy-backend.yml](.github/workflows/deploy-backend.yml) 自动触发：GitHub Actions 上 build Docker 镜像 → push 到 GHCR → SSH 到 VPS pull + 重启容器。只在改了 `main.py / requirements.txt / Dockerfile / index.html / output.css / 该 workflow 文件` 时触发。手动 redeploy 走 GitHub Actions UI 的 `workflow_dispatch`。

前端由 Cloudflare Pages 直接 serve `index.html` + `output.css`，没有单独的 CI。

## 架构关键点

### 后端：抠图流水线

`POST /api/remove-background` 的请求处理顺序（见 [main.py:612](main.py#L612)）：

1. **来源校验** `verify_origin` ([main.py:242](main.py#L242))：检查 `Origin`/`Referer` 在 `ALLOWED_ORIGINS` 白名单里。本地 dev 时该变量为空，会跳过校验。
2. **限流** `@limiter.limit("5/minute;50/day")`：按 `get_real_ip` ([main.py:147](main.py#L147)) 提取真实 IP。`TRUST_PROXY=1` 时取 `X-Forwarded-For`，否则用 socket 对端；IPv6 聚合到 `/64` 防地址跳变。
3. **大小+像素校验**：先看 `Content-Length`，再边读边截断，最后用 PIL `verify()` 兜底，避免内存炸弹。
4. **抢信号量再进线程池** `run_rembg` ([main.py:581](main.py#L581))：`rembg_semaphore` 限并发到 `MAX_CONCURRENCY`，然后 `asyncio.to_thread` 跑 CPU 密集的 BiRefNet 推理，避免阻塞 event loop。
5. **抠图后处理** `_run_rembg_sync` ([main.py:527](main.py#L527))：根据 `CUTOUT_PROFILE` 走两条路径：
   - **默认 `sharp`**：`_apply_sharp_alpha_cutout` —— 直出 BiRefNet mask + alpha 曲线锐化 + 微细节回填，速度快、边缘锐。
   - **`fur`**：开 alpha matting + `_refine_rgba_cutout`（连通域筛选 + 内部不透明修复 + 边缘 RGB 去污染）—— 适合白猫/卷发等极细毛发，但更慢、边缘更软。
6. 编码为 PNG 返回（不用 WebP，因为 alpha plane 编码会多耗 ~100ms，反而拖慢体感）。

### 后端：内存与并发预算

`MAX_CONCURRENCY` 是防 OOM 的关键旋钮（[main.py:74](main.py#L74) 有详细注释表）。粗算：常驻 ~1GB + 每个并发任务峰值 300~500MB。生产 VPS 在 [.github/workflows/deploy-backend.yml:121](.github/workflows/deploy-backend.yml#L121) 配的是 `MAX_CONCURRENCY=8` + `--memory=12g --memory-swap=12g`（禁 swap，因为模型权重一旦被换出，下次推理 latency 从 1~3s 涨到 30s+）。

### 前端：单文件 SPA

[index.html](index.html) 把模板、样式钩子、脚本都塞在一起：

- **i18n**：`i18nData` 字典（zh/en） + `data-i18n` / `data-i18n-ph` 属性。语言来自 `localStorage.lang` 或浏览器语言（[index.html:303](index.html#L303)）。**新增任何用户可见文案都需要在 `i18nData.zh` 和 `i18nData.en` 都加一条**，否则切语言时会显示 key。
- **进度条**：用 `XMLHttpRequest` 而非 `fetch`，因为 `fetch` 至今没有 upload progress 事件。三段式：压缩 0→15%、上传 15→70%（真实字节进度）、AI 推理直接跳 90%（不做软爬假进度）。详见 [index.html:454](index.html#L454)。
- **图片压缩**：客户端先用 Canvas 压成 WebP `q=0.95` 再上传（[index.html:435](index.html#L435) 附近），减小带宽。
- [rewrite_html.py](rewrite_html.py) 是一次性把中文版 HTML 改成英文 + 注入 i18n key 的脚本，**不会**在构建/部署中跑，可以视作历史脚本，不要再依赖它。

### 反馈接口

`POST /api/feedback` ([main.py:686](main.py#L686)) 把留言写到 `data/feedback.json`（JSON Lines 追加）。`data/` 在 Docker 里是 named volume `miaocut-data`，重启不丢。`data/` 已在 `.gitignore`，不要提交。

## 配置（环境变量）

后端可识别的环境变量集中在 [main.py:47-93](main.py#L47-L93)。生产至少要设：

```
TRUST_PROXY=1
ALLOWED_ORIGINS=https://miaocut.app,https://www.miaocut.app
MAX_CONCURRENCY=<按机器内存>
ENABLE_DOCS=0          # 关掉 /docs 防接口枚举
CUTOUT_PROFILE=sharp   # 或 fur，开毛发模式（慢但软）
```

本地 dev 时把 `ALLOWED_ORIGINS` 留空可跳过来源校验，并自动允许任意 origin。

## 写代码时记得

- 后端代码注释已经非常详细，多处带"为什么这么做"和踩坑记录 —— 改动这些注释覆盖的逻辑前先看注释（特别是 `main.py` 里 BiRefNet 配置、限流、并发、PNG vs WebP、`uvicorn.run(app, ...)` 等几处带 ⚠️ 的部分）。
- 前端的 `data-i18n` / `data-i18n-ph` 必须配对：HTML 里挂属性 + `i18nData` 里加 key。
- 改了任何会触发后端镜像变更的文件（见 workflow `paths` 列表），push 到 `main` 即上线，VPS 会有 ~30s 的滚动重启窗口。本地先跑通再 push。
