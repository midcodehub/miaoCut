# MiaoCut — 免费在线 AI 抠图工具

<p align="center">
  <a href="https://miaocut.app"><img src="https://miaocut.app/og/home.png" alt="MiaoCut — 免费在线 AI 抠图工具" width="640"></a>
</p>
<p align="center">
  <a href="https://trendshift.io/repositories/10645" target="_blank"><img src="https://trendshift.io/api/badge/repositories/10645" alt="idootop%2Fmi-gpt | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
</p>
<p align="center">
  <strong>👉 在线体验 <a href="https://miaocut.app">免费 AI 抠图工具</a>（免登录）</strong>
</p>

<p align="center">
  <a href="https://miaocut.app"><img src="https://img.shields.io/badge/在线使用-miaocut.app-2563eb" alt="免费 AI 抠图工具"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT 协议"></a>
  <img src="https://img.shields.io/badge/注册-无需-brightgreen" alt="免注册">
  <img src="https://img.shields.io/badge/水印-无-brightgreen" alt="无水印">
</p>

<p align="center">
  <a href="README.md">English</a> · <b>简体中文</b>
</p>

**MiaoCut** 是一个**免登录**的在线 AI 图像处理工具集，核心功能是**一键去除图片背景**——上传任意图片，AI 分割模型（BiRefNet）约 1 秒抠好图并返回透明 PNG。同时提供证件照制作、去水印、老照片修复、格式转换等一系列实用工具。

> 🔗 **用 [免费在线抠图工具](https://miaocut.app) 一键去除图片背景** —— 无需账号、无需信用卡、输出无水印。

---

## ✨ 为什么选 MiaoCut

- 🚀 **极速** —— 约 1 秒出图，不用排队等待。
- 🎨 **高清无损** —— 输出原始分辨率透明 PNG，**无水印**。
- 🔒 **隐私优先** —— 图片**纯内存处理、用完即销毁**，不存储、不用于 AI 训练。
- 🆓 **完全免费** —— 无隐藏收费、无订阅陷阱、无需注册。
- 🌍 **随处可用** —— 任意浏览器，桌面端、移动端都能用。

## 🧰 功能列表

每个工具都可在 [MiaoCut 免费 AI 图片工具集](https://miaocut.app) 中使用：

| 工具 | 链接 | 说明 |
|------|------|------|
| **AI 抠图** | [免费 AI 抠图工具](https://miaocut.app) | 一键去除背景。两种模式：**Sharp**（快速、硬边）和 **Fur**（毛发/卷发/软边细腻）。 |
| **商品图抠图** | [/product-photo-background-remover/](https://miaocut.app/product-photo-background-remover/) | 电商白底图、方图裁切。 |
| **人像抠图** | [/portrait-background-remover/](https://miaocut.app/portrait-background-remover/) | 头像、简历照、社媒人像。 |
| **证件照制作** | [/id-photo-maker/](https://miaocut.app/id-photo-maker/) | 自动抠图 + 换底色 + 排版，支持多种证件照规格。 |
| **去水印** | [/watermark-remover/](https://miaocut.app/watermark-remover/) | 涂抹水印区域，AI 智能修复（基于 LaMa Inpainting）。 |
| **老照片修复** | [/old-photo-restoration/](https://miaocut.app/old-photo-restoration/) | 修复褪色、降噪、增强细节。 |
| **JPG → 透明 PNG** | [/jpg-to-transparent-png/](https://miaocut.app/jpg-to-transparent-png/) | 把 JPG 转成带真实 alpha 通道的透明 PNG。 |
| **PNG → JPG（白底）** | [/png-to-jpg-white-background/](https://miaocut.app/png-to-jpg-white-background/) | 把透明 PNG 铺到白底（或任意颜色）导出 JPG。 |

📚 **使用教程：** [如何去除图片背景](https://miaocut.app/how-to-remove-background/)（PowerPoint、GIMP 等分步教程）。

## 🔬 抠图原理

抠图流水线按请求选择两种 profile 之一：

- **`sharp`**（默认，约 1 秒）—— BiRefNet 直出 mask，配合温和 gamma 校正 + 1px 抗锯齿。适合人物、商品、Logo 等硬边主体。
- **`fur`**（约 3–5 秒）—— 在此基础上加 **alpha matting**（在 trimap 未知带做闭式求解）+ 前景色估计，消除半透明像素的背景色污染。适合白猫、卷发、羽毛、植物等软边主体。

## 🏗️ 技术架构

```
┌─────────────────────────────────┐      ┌────────────────────────────────────┐
│      前端（静态）                 │      │       后端（API）                   │
│  HTML + Tailwind CSS + 原生 JS   │ ───▶ │  FastAPI + BiRefNet (rembg)         │
│  部署在 Cloudflare Pages         │      │  部署在 Hugging Face Docker Spaces  │
│                                 │      │  ×3（miao_cut / 2 / 3）             │
└─────────────────────────────────┘      └────────────────────────────────────┘
```

- **前端** —— 静态 HTML 页面（`index.html` + 编译后的 `output.css`），内置英文、中文、印地语、印尼语、巴西葡语、孟加拉语、Filipino、乌尔都语 i18n，客户端图片压缩，XHR 真实上传进度。Cloudflare Pages 直接 serve。
- **后端** —— FastAPI（单 Worker）。AI 模型：**BiRefNet-General-Lite**（INT8 量化）经 rembg 抠图、**MediaPipe Face Mesh** 做证件照裁切、**LaMa** 做去水印修复。限流（SlowAPI）和并发控制都在进程内存里，**不依赖 Redis 等外部存储**。

## 🚀 自部署

**环境要求：** Python 3.11+（后端）、Node.js 18+（仅前端构建）。

### 后端

```bash
pip install -r requirements.txt

# 启动开发服务器。⚠️ 用 `python main.py`，不要用 `uvicorn main:app`
# （字符串形式会二次 import main.py，导致 BiRefNet 加载两次）。
python main.py
# 首次运行会下载模型权重到 .u2net/，默认监听 http://127.0.0.1:8000
```

> 不要加 `--reload`（onnxruntime 线程池 fork 后会死锁），也不要加 `--workers 2+`（限流和并发预算在进程内存里）。

### 前端

```bash
npm install
npm run build        # 构建 output.css + 生成多语言页面 + sitemap
npm run watch:css    # 改 HTML 时开 watch
```

> 改了任何 HTML 的 class 后，必须重新 `npm run build:css` 并提交 `output.css`，生产环境直接 serve。

### Docker

```bash
docker build -t miaocut-api .
docker run --rm -p 7860:7860 -e PORT=7860 -e MAX_CONCURRENCY=1 -v miaocut-data:/data miaocut-api
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

## 🛡️ 隐私与安全

- 所有图片**纯内存处理**，处理完毕立即销毁。
- **不存储**任何用户上传的图片。
- **绝不**使用用户数据训练 AI 模型。
- 来源校验 + IP 限流防止滥用。

## 🤝 参与贡献

欢迎提 Issue 和 PR。如果 MiaoCut 对你有帮助，给个 ⭐ 并在你的项目/博客里链接到 **[免费在线 AI 抠图工具](https://miaocut.app)** 将非常感激 —— 能帮更多人找到这个免费、尊重隐私的抠图工具。

## 📄 开源协议

本项目基于 [MIT 协议](LICENSE) 开源，可自由使用、修改、自部署。欢迎（但不强制）注明来源 [miaocut.app](https://miaocut.app)。

---

<p align="center">
  <strong><a href="https://miaocut.app">miaocut.app</a></strong> · 免费、尊重隐私的 AI 图片工具集<br>
  Made with ❤️ by <a href="https://github.com/midcodehub">midcodehub</a>
</p>
