---
title: miaoCut
sdk: docker
app_port: 7860
---

# MiaoCut — 免费在线 AI 抠图工具

<p align="center">
  <strong>🔗 <a href="https://miaocut.app">miaocut.app</a></strong>
</p>

MiaoCut 是一个**免登录**的在线 AI 图像处理平台，核心功能是**一键去除图片背景**，同时提供证件照制作、去水印、老照片修复等实用工具。

- 🚀 **极速抠图** — 1 秒出图，无需等待
- 🎨 **高清无损** — 输出原始分辨率透明 PNG，无水印
- 🔒 **隐私优先** — 图片纯内存处理，用完即销毁，绝不用于 AI 训练
- 🆓 **完全免费** — 无隐藏收费、无订阅陷阱

## ✨ 功能列表

| 工具 | 路径 | 说明 |
|------|------|------|
| **AI 抠图** | `/` | 上传图片一键去除背景，支持 Sharp（快速）和 Fur（毛发细腻）两种模式 |
| **商品图抠图** | `/product-photo-background-remover/` | 电商商品白底图、方图裁切 |
| **人像抠图** | `/portrait-background-remover/` | 头像、简历照、社媒人像 |
| **去水印** | `/watermark-remover/` | 涂抹水印区域，AI 智能修复（基于 LaMa Inpainting） |
| **证件照制作** | `/id-photo-maker/` | 自动抠图 + 换底色 + 排版，支持多种证件照规格 |
| **老照片修复** | `/old-photo-restoration/` | 修复褪色、降噪、增强细节，导出高清图片 |

## 🏗️ 技术架构

```
┌─────────────────────────────────┐     ┌──────────────────────────────────┐
│      Frontend (Static)          │     │       Backend (API)               │
│                                 │     │                                  │
│  HTML + Tailwind CSS + JS       │────▶│  FastAPI + BiRefNet (rembg)       │
│  Deployed on Cloudflare Pages   │     │  Deployed on HF Docker Spaces    │
│                                 │     │  (miao_cut / miao_cut2 / miao_cut3)│
└─────────────────────────────────┘     └──────────────────────────────────┘
```

### 前端

- **单文件 SPA**：`index.html` + 编译后的 `output.css`（Tailwind CSS）
- **多语言**：内置中英文 i18n（`data-i18n` 属性 + JS 字典切换）
- **部署**：Cloudflare Pages 直接 serve 静态文件

### 后端

- **框架**：FastAPI + Uvicorn（单 Worker）
- **AI 模型**：BiRefNet-General-Lite（INT8 量化，~155MB）通过 rembg 加载
- **抠图模式**：
  - `sharp`（默认）— BiRefNet 直出 mask + gamma 校正 + 抗锯齿，~1s/张
  - `fur`（细腻）— Alpha Matting + 前景色去污染，~3-5s/张，适合毛发/婚纱等
- **人脸检测**：MediaPipe Face Mesh（证件照裁切）
- **去水印**：LaMa Inpainting
- **限流**：SlowAPI（5/min, 50/day per IP）
- **并发控制**：进程内信号量，不依赖 Redis
- **部署**：Hugging Face Docker Spaces × 3 实例

## 🚀 快速开始

### 环境要求

- Python 3.11+
- Node.js 18+（仅前端构建需要）

### 后端启动

```bash
# 安装 Python 依赖
pip install -r requirements.txt

# 启动后端开发服务器（⚠️ 不要用 uvicorn main:app，会导致模型加载两次）
python main.py

# 模型首次加载会自动下载 ~224MB 权重到 .u2net/
# 服务默认监听 http://127.0.0.1:8000
```

> **注意**：
> - 不要加 `--reload`（onnxruntime 线程池 fork 后会死锁）
> - 不要加 `--workers 2+`（限流和并发控制在进程内存中）

### 前端构建

```bash
# 安装 Node 依赖
npm install

# 构建 CSS（CI / 上线前必跑）
npm run build:css

# 开发时 watch 模式
npm run watch:css
```

> 修改任何 HTML 文件的 class 后，必须重新 `npm run build:css` 并提交 `output.css`。

### Docker 运行

```bash
docker build -t miaocut-api .
docker run --rm -p 7860:7860 \
  -e PORT=7860 \
  -e MAX_CONCURRENCY=1 \
  -v miaocut-data:/data \
  miaocut-api
```

## ⚙️ 配置（环境变量）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8000` | 服务监听端口 |
| `TRUST_PROXY` | `0` | 设为 `1` 时从 `X-Forwarded-For` 提取真实 IP |
| `ALLOWED_ORIGINS` | 空（跳过校验） | 允许的前端来源域名，逗号分隔 |
| `MAX_CONCURRENCY` | `1` | 最大并发推理数（防 OOM 关键旋钮） |
| `CUTOUT_PROFILE` | `sharp` | 默认抠图模式（`sharp` / `fur`） |
| `DATA_DIR` | `.` | 反馈数据持久化目录 |
| `ENABLE_DOCS` | `1` | 设为 `0` 关闭 `/docs` 接口文档 |
| `FEEDBACK_ENDPOINT` | — | Cloudflare Worker 反馈接收地址 |
| `FEEDBACK_TOKEN` | — | Worker 鉴权 Token |

## 🔄 CI/CD 部署

- **后端**：`main` 分支 push 触发 GitHub Actions，自动将 `Dockerfile` / `main.py` / `requirements.txt` / `README.md` 推送至 3 个 Hugging Face Docker Spaces
- **前端**：Cloudflare Pages 自动部署静态文件
- **触发条件**：仅在 `main.py` / `requirements.txt` / `Dockerfile` / `README.md` / workflow 文件变更时触发后端部署

## 📁 项目结构

```
miaoCut/
├── index.html                   # 首页（AI 抠图）
├── app.js                       # 前端核心逻辑（上传、i18n、进度条）
├── feedback.js                  # 反馈组件
├── output.css                   # Tailwind 编译产物
├── main.py                      # 后端 API（FastAPI）
├── requirements.txt             # Python 依赖
├── Dockerfile                   # 后端 Docker 镜像
├── tailwind.config.js           # Tailwind 配置
├── src/input.css                # Tailwind 源文件
├── models/                      # INT8 量化模型
├── id-photo-maker/              # 证件照工具页
├── watermark-remover/           # 去水印工具页
├── portrait-background-remover/ # 人像抠图工具页
├── product-photo-background-remover/ # 商品图工具页
├── old-photo-restoration/       # 老照片修复工具页
├── og/                          # OpenGraph 社交分享图
├── examples/                    # 示例图片
├── scripts/                     # 构建脚本（OG 图片生成等）
└── .github/workflows/           # CI/CD 工作流
```

## 🛡️ 隐私与安全

- 所有图片**纯内存处理**，处理完毕立即销毁
- **不存储**任何用户上传的图片
- **不使用**用户数据进行 AI 模型训练
- 来源校验 + IP 限流防止滥用

## 📄 License

本项目为独立开发者作品，保留所有权利。

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/midcodehub">midcodehub</a>
</p>
