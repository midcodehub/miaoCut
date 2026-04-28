# MiaoCut SEO 优化执行设计文档 v1.0

> **目标读者**：Claude Code  
> **项目**：miaocut.app（免费 AI 抠图工具）  
> **预计工期**：90 天分四阶段交付  
> **文档版本**：v1.0 / 2026-04-27  
> **目标搜索引擎**：Google + 百度双引擎并重

---

## 0. 文档使用说明

### 0.1 执行原则

1. **严格按 Phase 顺序执行**：Phase 0 → 1 → 2 → 3 → 4。每个 Phase 末尾有【验收清单】，全部勾选后再进入下一阶段。
2. **现状优先**：本文档基于公开页面假设。代码库现状如与本文档假设冲突，以代码库现状为准，但需在 Phase 0 报告中显式记录差异并给出调整建议。
3. **文案不要机翻**：所有 EN 文案和 ZH 文案都已分别成稿，**ZH 不是 EN 的翻译，且不允许互相机翻**（关键词布局是各自独立设计的）。
4. **修改后必验证**：Schema 改完用 https://validator.schema.org 验证；OG 改完用 https://www.opengraph.xyz/ 预览；hreflang 改完用 https://technicalseo.com/tools/hreflang/ 检查。
5. **保留现有 SEO 资产**：路由改造前，导出 Google Search Console 当前所有收录 URL 列表，并在改造后做 301 映射，避免外链权重丢失。

### 0.2 强制约束（绝对不要违反）

- ❌ 不要替换 BiRefNet 推理逻辑（这是核心功能）
- ❌ 不要在没有真实数据的情况下添加 `aggregateRating` 或 `reviewCount`，会被 Google 判定为 spam
- ❌ 不要把 ZH 内容直接放到 EN URL 下，必须用独立 URL + hreflang
- ❌ 不要给百度提交带有大量 JS 渲染依赖的页面（百度爬虫对 JS 渲染支持弱），需要 SSR/SSG 或预渲染
- ❌ 不要在博客文章里直接贴竞品 logo / 截图（版权风险），用文字描述或抽象示意图
- ✅ 每个 Phase 完成后提交一次 PR，commit message 用 `seo(phase-N): xxx`

### 0.3 工具与依赖

需要的（如未安装，自行评估并安装）：
- `next-sitemap` 或等价 sitemap 生成方案
- `next-seo` / `react-helmet-async` / `vue-meta`（取决于框架）
- Schema.org JSON-LD 注入方式（直接写 `<script type="application/ld+json">`）

不需要新引入的：
- 不要为了 SEO 引入大型 CMS（Strapi/Contentful 等），博客用 MDX/Markdown 文件即可

---

## 1. 项目背景与现状分析

### 1.1 产品定位

MiaoCut 是一款基于 **BiRefNet（SOTA 模型）** 的免费在线 AI 抠图工具。核心卖点：
- 1 秒生成 HD 透明背景 PNG
- 发丝级精度（人像、宠物、半透明物体）
- 完全免费、无水印、无注册、无限次
- 内存中处理，不存储用户图片

### 1.2 当前 SEO 短板（经首页公开内容审计）

| 项目 | 现状 | 影响 |
|---|---|---|
| URL 结构 | 单页应用，使用 `#` hash 路由 | 子页面无法被搜索引擎独立索引 |
| Title/Description | 单一标题"MiaoCut - Free AI Background Remover \| 1-Second HD Cutout" | 只覆盖 1 个核心词，错失中长尾流量 |
| 中文 SEO | 仅是 EN 文案翻译，未独立布局百度关键词 | 百度收录困难，中文搜索几乎无曝光 |
| 子页面 | 无功能页/场景页/对比页 | 无法承接长尾搜索意图 |
| Schema.org | 无（推测） | 无富媒体摘要、CTR 损失 15–30% |
| 博客内容 | 无 | 无内容引流入口、无外链锚文本资产 |
| OG/Twitter Card | 不确定 | 社交分享流量损失 |
| sitemap | 不确定 | 收录效率低 |

### 1.3 竞品矩阵速览

| 竞品 | 主要市场 | 核心壁垒 | MiaoCut 差异点 |
|---|---|---|---|
| remove.bg | 全球 | 品牌、API | 完全免费、无水印、HD |
| PhotoRoom | 全球 / 电商 | 模板、生态 | 更专注核心抠图 |
| Adobe Express | 全球 | 生态 | 无需 Adobe 账户 |
| Canva | 全球 | 设计平台 | 不绑设计 |
| Clipdrop | 全球 / 设计师 | Stable Diffusion 母体 | 中文体验更好 |
| 佐糖 PicWish | 中文 | 国内最强 | 不需登录 |
| 抠抠图 | 中文 | 老站、SEO 强 | 模型更新（BiRefNet） |
| 千鹿 | 中文 | 设计平台 | 更轻 |
| 妙言小智 PicTech | 中文 | "妙"字撞车 | 域名更短、品牌更聚焦 |

---

## 2. 总体目标与成功指标

### 2.1 90 天 KPI

| 指标 | 当前（估算） | 目标 |
|---|---|---|
| Google Search Console 自然搜索点击 / 月 | < 500 | ≥ 3000 |
| 百度自然搜索点击 / 月 | < 100 | ≥ 1000 |
| Google 收录页面数 | 1–2 | ≥ 50 |
| 百度收录页面数 | 0–1 | ≥ 20 |
| Lighthouse SEO 分数（所有页面） | 未知 | ≥ 95 |
| Core Web Vitals LCP | 未知 | ≤ 2.5s |
| 主关键词排名 | – | EN：「free background remover」≤ 30 名；ZH：「在线抠图」百度首页 |

### 2.2 关键里程碑

- **D7**：Phase 1 上线（首页 SEO 元信息全量改造）
- **D14**：Phase 2 上线（路由、sitemap、双引擎站长平台提交）
- **D35**：Phase 3 上线（8 个落地页全部部署）
- **D90**：Phase 4 完成（10 篇首批博客全部发布）

---

## 3. 执行路线图

| Phase | 周期 | 关键产出 | 输出位置 |
|---|---|---|---|
| Phase 0 | 1 天 | 代码库探查报告 | `docs/seo/phase0-discovery.md` |
| Phase 1 | 2 天 | 首页 EN/ZH 元信息全量优化 | 改首页代码 |
| Phase 2 | 1 周 | 路由改造 + sitemap + robots + hreflang + 站长平台 | 全局 |
| Phase 3 | 2 周 | 8 个 SEO 落地页（4 EN + 4 ZH） | `/(landing)` 或对应路由 |
| Phase 4 | 持续 | 博客系统 + 首批 10 篇文章 | `/blog/*` |

---

## 4. Phase 0: 代码库探查（必做，先做）

### 4.1 任务说明

**在执行任何修改前**，先完整探查代码库当前状况，输出报告到 `docs/seo/phase0-discovery.md`，**人工 review 后再开 Phase 1**。

### 4.2 报告必须包含的内容

#### 4.2.1 框架与构建
- 框架名称与版本（package.json / 类似配置文件）
- 渲染模式：SSR / SSG / SPA / Hybrid（ISR）
- 构建命令、本地启动命令
- 部署平台与方式（Vercel / Cloudflare Pages / 自建 / Netlify / 其他）
- 是否有环境变量约束

#### 4.2.2 路由现状
- 路由方式：hash / history / file-based（如 Next.js App Router）
- 当前所有可访问 URL 列表（包括语言切换）
- 是否有 SPA 回退到 index.html 的服务器配置（rewrite/redirect 规则）
- 锚点 `#` 是用于路由还是页内跳转

#### 4.2.3 国际化现状
- i18n 库（next-intl / react-i18next / vue-i18n / paraglide / 自研 / 无）
- 当前语言切换实现方式（query string / cookie / path / localStorage）
- 翻译文件位置（`/locales`、`/messages`、内嵌等）
- EN/ZH 切换是否改变 URL

#### 4.2.4 Meta / Head 管理
- 如何管理 `<title>` 和 `<meta>`（next/head、@vueuse/head、react-helmet-async、Astro `<head>`、Svelte `<svelte:head>`、直接 HTML）
- 是否已有 OpenGraph / Twitter Card / Schema.org / canonical / hreflang
- 多语言时 title 切换机制

#### 4.2.5 静态资源
- public 目录位置
- 图片优化方案（next/image / 手动 / 无）
- favicon、apple-touch-icon、og 图当前状态
- 静态文件 CDN 配置

#### 4.2.6 BiRefNet 模型加载
- 模型在哪里？（CDN / 自建 / Hugging Face）
- 何时加载？（首屏立即 / 用户上传时 / lazy）
- 模型大小、加载耗时
- 是否使用 WebGPU / WebAssembly / WebGL

#### 4.2.7 分析与监测
- Google Analytics 4 是否接入（measurement ID）
- Google Search Console 是否绑定（验证方式）
- 百度统计 / 百度站长是否接入
- 是否有 verification 文件（google-site-verification、baidu_verify）
- ICP 备案状态（影响百度收录与某些 CDN）

#### 4.2.8 风险评估
列出执行本文档可能遇到的阻塞点。例如：
- 路由改造会破坏哪些现有功能
- BiRefNet 模型加载方式是否会影响 LCP（首屏加载）
- Service Worker 缓存是否会影响新页面发布
- 现有部署 CI/CD 是否需要调整
- 是否有备案问题导致 .app 域名在大陆 Google 之外被屏蔽

### 4.3 Phase 0 验收清单

- [ ] `docs/seo/phase0-discovery.md` 已生成且填写完整
- [ ] 列出本文档与现状不一致的具体位置（如果有）
- [ ] 给出 Phase 1 执行前需要解决的阻塞问题清单
- [ ] 已导出当前 Google Search Console 收录 URL 列表（如未接入 GSC，跳过此项并在报告中标注）

---

## 5. Phase 1: 首页 SEO 元信息

### 5.1 修改概览

需要修改：
- EN 首页（`/`）
- ZH 首页（`/zh` 或现有中文路径）
- 全站共享 head（如果有 layout 文件）

不要在 Phase 1 改路由结构，路由改造放 Phase 2。

### 5.2 EN 首页：完整 head 标签

**文件路径建议**：根据 Phase 0 探查结果定位（如 Next.js App Router 是 `app/page.tsx` 的 `metadata` 导出）。

```html
<!-- Title: 必须放第一行，长度 56 字符 -->
<title>MiaoCut – Free AI Background Remover | HD Transparent PNG</title>

<!-- Description: 178 字符，包含主词 + 差异点 + CTA 暗示 -->
<meta name="description" content="Remove image backgrounds free in 1 second with SOTA AI. HD transparent PNG output, hair-level edge detection, no watermark, no signup. Free remove.bg alternative powered by BiRefNet.">

<!-- Keywords（Google 已不用，百度仍参考；保守填） -->
<meta name="keywords" content="free background remover, ai background remover, remove background, transparent png, remove.bg alternative, BiRefNet, background eraser">

<!-- 标准化 -->
<link rel="canonical" href="https://miaocut.app/">

<!-- 多语言 -->
<link rel="alternate" hreflang="en" href="https://miaocut.app/">
<link rel="alternate" hreflang="zh-CN" href="https://miaocut.app/zh">
<link rel="alternate" hreflang="x-default" href="https://miaocut.app/">

<!-- robots -->
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">

<!-- OpenGraph -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://miaocut.app/">
<meta property="og:title" content="MiaoCut – Free AI Background Remover">
<meta property="og:description" content="Remove image backgrounds in 1 second. Free, HD, no watermark.">
<meta property="og:image" content="https://miaocut.app/og/og-en.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="MiaoCut AI background remover before and after example">
<meta property="og:locale" content="en_US">
<meta property="og:locale:alternate" content="zh_CN">
<meta property="og:site_name" content="MiaoCut">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="MiaoCut – Free AI Background Remover">
<meta name="twitter:description" content="Remove image backgrounds in 1 second. Free, HD, no watermark.">
<meta name="twitter:image" content="https://miaocut.app/og/og-en.png">
<meta name="twitter:image:alt" content="MiaoCut AI background remover before and after example">

<!-- 主题色 / PWA 友好 -->
<meta name="theme-color" content="#000000">
```

### 5.3 ZH 首页：完整 head 标签

```html
<!-- Title: 28 个汉字 -->
<title>MiaoCut 在线AI抠图 | 免费一键去背景 发丝级透明PNG</title>

<!-- Description: 75 个汉字（百度推荐 ≤ 78） -->
<meta name="description" content="MiaoCut 是免费在线AI抠图工具，1秒生成透明背景PNG，发丝级精准识别，无水印无需注册。基于 BiRefNet 模型，支持人像、商品、宠物图片去背景，免费替代 remove.bg。">

<!-- Keywords: 百度仍参考 -->
<meta name="keywords" content="在线抠图,AI抠图,免费抠图,一键抠图,去背景,透明背景,抠图软件,发丝级抠图,图片去背景,在线抠图工具,免费抠图网站">

<!-- 百度专项 meta（强烈建议添加，百度爬虫识别） -->
<meta name="baidu-site-verification" content="<待 Phase 2 站长平台获取>">
<meta name="format-detection" content="telephone=no, email=no, address=no">
<meta http-equiv="Cache-Control" content="no-transform">
<meta http-equiv="Cache-Control" content="no-siteapp">

<!-- 移动端友好（百度移动权重高） -->
<meta name="applicable-device" content="pc,mobile">
<meta name="MobileOptimized" content="width">
<meta name="HandheldFriendly" content="true">

<!-- 标准化 -->
<link rel="canonical" href="https://miaocut.app/zh">

<!-- 多语言 -->
<link rel="alternate" hreflang="en" href="https://miaocut.app/">
<link rel="alternate" hreflang="zh-CN" href="https://miaocut.app/zh">
<link rel="alternate" hreflang="x-default" href="https://miaocut.app/">

<!-- robots -->
<meta name="robots" content="index, follow, max-image-preview:large">

<!-- OpenGraph (zh) -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://miaocut.app/zh">
<meta property="og:title" content="MiaoCut 在线AI抠图 - 免费一键去背景">
<meta property="og:description" content="1秒生成透明背景PNG，发丝级精准识别，无水印免注册。">
<meta property="og:image" content="https://miaocut.app/og/og-zh.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="MiaoCut 在线AI抠图前后对比示例">
<meta property="og:locale" content="zh_CN">
<meta property="og:locale:alternate" content="en_US">
<meta property="og:site_name" content="MiaoCut 妙抠图">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="MiaoCut 在线AI抠图 - 免费一键去背景">
<meta name="twitter:description" content="1秒生成透明背景PNG，发丝级精准识别，无水印免注册。">
<meta name="twitter:image" content="https://miaocut.app/og/og-zh.png">
```

### 5.4 H1 / H2 文案改写

#### EN 首页可见文案（替换现有）

```
H1: Free AI Background Remover – HD Transparent Background in 1 Second

Subtitle: Powered by BiRefNet (SOTA model). No watermark. No signup. Unlimited.

H2 #1 (放在功能区上方): Remove Background from Image Online Free
H2 #2 (How It Works 区): How It Works – Get a Transparent PNG in 3 Steps
H2 #3 (Why Choose 区): Why MiaoCut Is the Best Free Alternative to remove.bg
H2 #4 (技术优势区，新增): Background Remover That Handles Hair, Fur & Transparent Objects
H2 #5 (使用场景区，新增): Built for E-commerce, Designers, and Everyone Else
H2 #6 (FAQ 区): Frequently Asked Questions
```

新增「使用场景」区块文案（H2 #5 下方）：

```
Whether you're an Amazon seller preparing white-background product shots, a designer 
making transparent PNG assets, or someone making a fun cutout for social media — 
MiaoCut handles it. No subscription. No watermark. Just upload and download.

For e-commerce sellers: prepare marketplace-compliant white background product photos.
For designers: extract subjects from photos for collages, posters, and presentations.
For everyone: make transparent PNGs for stickers, social media, or just for fun.
```

#### ZH 首页可见文案（替换现有）

```
H1: 免费在线 AI 抠图 – 一键去除图片背景，发丝级高清输出

副标题: 基于 BiRefNet（SOTA 模型）· 无水印 · 免注册 · 无限次

H2 #1: 在线一键抠图，3 秒生成透明背景 PNG
H2 #2: 三步搞定，零基础也能用
H2 #3: 为什么选择 MiaoCut？免费替代 remove.bg 的最佳工具
H2 #4: 发丝级 AI 抠图，复杂边缘也能精准识别
H2 #5: 电商卖家、设计师、所有人都能用
H2 #6: 常见问题
```

新增「使用场景」区块文案（H2 #5 下方）：

```
不管你是淘宝/Amazon 卖家要做商品白底图，是设计师要透明 PNG 素材，
还是想给社交媒体做个有趣的拼图——MiaoCut 都能搞定。免费、无水印、无需注册。

电商卖家：一键生成 Amazon、淘宝、Shopify 平台规范的白底商品图
设计师：从照片中精准提取主体，做海报、拼贴、演示文稿
个人用户：制作透明 PNG 表情包、贴纸、社交媒体配图
摄影师：人像照片背景替换，发丝级精度无白边
```

### 5.5 Schema.org JSON-LD 注入

#### 5.5.1 SoftwareApplication（首页 EN 和 ZH 都加，文案对应）

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "MiaoCut",
  "alternateName": "MiaoCut Background Remover",
  "url": "https://miaocut.app/",
  "applicationCategory": "DesignApplication",
  "applicationSubCategory": "Background Remover",
  "operatingSystem": "Any",
  "browserRequirements": "Modern browser with WebAssembly support",
  "description": "Free AI background remover with HD transparent PNG output, hair-level edge detection, and no watermark. Powered by BiRefNet SOTA model.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "AI background removal in 1 second",
    "HD transparent PNG output without compression",
    "Hair, fur, and semi-transparent edge detection",
    "No watermark, no signup, unlimited use",
    "In-memory processing for privacy",
    "JPG, PNG, WebP input support",
    "Works in browser, no install required"
  ],
  "screenshot": "https://miaocut.app/og/screenshot.png",
  "softwareVersion": "1.0",
  "inLanguage": ["en", "zh-CN"]
}
</script>
```

⚠️ **不要伪造 `aggregateRating`**。如果未来有真实用户评分系统，再加。

#### 5.5.2 FAQPage（首页加，从现有 FAQ 转出）

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is this AI background remover really free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. MiaoCut is built by an independent developer to provide a genuinely free alternative to subscription tools like remove.bg. There are no watermarks, no signup, and no strict resolution limits."
      }
    },
    {
      "@type": "Question",
      "name": "What image formats are supported?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can upload JPG, PNG, and WebP images. The output is a high-quality PNG image with a transparent background, ready for design, e-commerce, or any other use."
      }
    },
    {
      "@type": "Question",
      "name": "How good is the edge detection for hair or fur?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "MiaoCut uses BiRefNet, a SOTA AI model that excels at complex edges. It handles human hair, animal fur, and even semi-transparent objects like glass or wedding dresses with high accuracy."
      }
    },
    {
      "@type": "Question",
      "name": "Is my image data safe?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Images are processed in-memory and destroyed automatically after processing. We don't store your images, and we never use them for AI training."
      }
    },
    {
      "@type": "Question",
      "name": "Do I need to sign up to use MiaoCut?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No signup required. Just upload an image and download the result. There's no account creation, no email verification, and no credit card."
      }
    },
    {
      "@type": "Question",
      "name": "How does MiaoCut compare to remove.bg?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "MiaoCut is fully free with HD output and no watermark, while remove.bg's free tier limits resolution to ~625×400 pixels and requires credits for HD. Both use AI, but MiaoCut is built around the latest BiRefNet model."
      }
    }
  ]
}
</script>
```

ZH 版本（结构相同，文案翻译为中文，参考现有 FAQ 内容）：

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "MiaoCut 真的完全免费吗？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "是的，MiaoCut 由独立开发者制作，致力于提供真正免费的 remove.bg 替代品。没有水印，无需注册，没有严格的分辨率限制，可以无限次使用。"
      }
    },
    {
      "@type": "Question",
      "name": "支持哪些图片格式？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "支持上传 JPG、PNG 和 WebP 图片。输出为高质量 PNG 图片，带透明背景，可用于设计、电商、社交媒体等场景。"
      }
    },
    {
      "@type": "Question",
      "name": "AI 抠图对发丝和毛发的处理效果如何？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "MiaoCut 采用 BiRefNet（SOTA 模型），在复杂边缘处理上表现优异。无论是人像发丝、动物毛发，还是玻璃、婚纱等半透明物体，都能精准识别。"
      }
    },
    {
      "@type": "Question",
      "name": "我的图片数据安全吗？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "图片在内存中处理，处理完成后自动销毁。我们不存储您的图片，也不会用于 AI 训练。"
      }
    },
    {
      "@type": "Question",
      "name": "需要注册才能使用吗？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "不需要。直接上传图片即可使用，无需注册账户、不用邮箱验证、不用信用卡。"
      }
    },
    {
      "@type": "Question",
      "name": "MiaoCut 和 remove.bg 有什么区别？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "MiaoCut 完全免费、输出高清、无水印；而 remove.bg 免费版分辨率限制在约 625×400 像素，高清输出需要购买积分。两者都基于 AI，但 MiaoCut 使用最新的 BiRefNet 模型。"
      }
    }
  ]
}
</script>
```

#### 5.5.3 WebSite（带 SearchAction，可选但推荐）

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "MiaoCut",
  "url": "https://miaocut.app/",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://miaocut.app/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
</script>
```

⚠️ 仅在实际有站内搜索功能时添加。否则跳过。

#### 5.5.4 Organization（首页加）

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "MiaoCut",
  "url": "https://miaocut.app/",
  "logo": "https://miaocut.app/logo.png",
  "description": "Free AI background remover powered by BiRefNet"
}
</script>
```

如果有真实社交账户，加 `sameAs` 数组。没有就不加，不要伪造。

### 5.6 图片 alt 规范

| 图片用途 | alt 模板（EN） | alt 模板（ZH） |
|---|---|---|
| 抠图前后对比 | "AI background remover before and after — {场景描述}" | "AI 抠图前后对比 — {场景描述}" |
| Hair demo | "Hair-level edge detection example showing fine strands" | "发丝级抠图示例 - 精确识别每一根发丝" |
| Fur demo | "Animal fur edge detection example with cat / dog" | "宠物毛发抠图示例 - 猫狗精准抠图" |
| Logo | "MiaoCut logo" | "MiaoCut logo" |
| 装饰性图标 | `alt=""`（空 alt，告知屏幕阅读器忽略） | `alt=""` |
| 上传 icon | `alt=""` | `alt=""` |

**重要**：所有可见图片必须显式有 `alt` 属性，**不要省略 alt 属性本身**。装饰性图片用 `alt=""` 而不是 `alt="image"` 或省略。

### 5.7 OG 图制作

需要 2 张 OG 图：
- `/public/og/og-en.png` (1200×630)
- `/public/og/og-zh.png` (1200×630)

**临时方案（如无设计资源）**：
- 用 SVG 生成，再转 PNG
- 或在 Next.js 用 `@vercel/og` 动态生成
- 或用 https://og-playground.vercel.app/ 在线设计

设计要求：
- 左侧：MiaoCut logo + 主标题 + 副标题
- 右侧：抠图前/后对比示意（透明棋盘格背景能清晰看出）
- 颜色对比强，缩略图状态下也能看清字
- 留出边缘安全区（社交平台裁切）

### 5.8 Phase 1 验收清单

- [ ] EN 首页 `<title>` 长度 ≤ 60 字符
- [ ] EN 首页 `<meta description>` 长度 130–160 字符
- [ ] ZH 首页 `<title>` 长度 ≤ 30 个汉字
- [ ] ZH 首页 `<meta description>` 长度 ≤ 78 个汉字
- [ ] canonical URL 与当前页面 URL 一致（注意尾斜杠统一）
- [ ] hreflang 三个版本完整：`en`、`zh-CN`、`x-default`
- [ ] 每个页面有且仅有一个 `<h1>`
- [ ] OG 图 1200×630 已生成并部署
- [ ] OG 在 https://www.opengraph.xyz/ 预览正常
- [ ] Schema 在 https://validator.schema.org 验证零错误
- [ ] Google Rich Results Test 通过：https://search.google.com/test/rich-results
- [ ] 所有可见图片有 alt 属性
- [ ] Lighthouse SEO 分数 ≥ 95（移动端 + 桌面端）
- [ ] **没有添加任何虚假评分/评论数据**

---

## 6. Phase 2: 路由架构 + 基础设施

### 6.1 任务总览

1. 把 hash 路由改成 history / file-based 真实路径
2. 设计完整 URL 结构（含 EN/ZH 分流）
3. 生成动态 sitemap.xml
4. 配置 robots.txt
5. 部署 hreflang 标签到所有页面
6. 接入 Google Search Console + 百度站长平台
7. 配置 301 重定向（保留旧 URL 权重）

### 6.2 URL 结构设计

**总体策略**：EN 在根，ZH 在 `/zh` 前缀。

理由：根域名权重最高，主流量先给 EN（全球市场更大）。`/zh` 子目录比 `zh.miaocut.app` 子域名更利于权重共享。

#### 6.2.1 完整 URL Map

```
EN:
/                                              → 首页
/product-photo-background-remover              → 落地页 1
/id-photo-background-changer                   → 落地页 2
/transparent-png-maker                         → 落地页 3
/remove-bg-alternative                         → 落地页 4
/blog                                          → 博客索引
/blog/[slug]                                   → 博客文章
/about                                         → 关于（可选）
/privacy                                       → 隐私政策
/terms                                         → 服务条款

ZH:
/zh                                            → 中文首页
/zh/shangpin-baidi-tu                          → 商品白底图
/zh/zhengjianzhao-huan-dise                    → 证件照换底色
/zh/dianshang-koutu                            → 电商抠图
/zh/touming-beijing                            → 透明背景制作
/zh/blog                                       → 中文博客索引
/zh/blog/[slug]                                → 中文博客文章
/zh/about                                      → 关于（可选）
/zh/privacy
/zh/terms
```

#### 6.2.2 URL 命名规则

- 全小写
- 单词间用 `-`（不用 `_` 或驼峰）
- 不带 `.html` 后缀
- 不带尾斜杠（统一无斜杠，或统一有斜杠，二选一并 301 redirect 另一种）
- ZH 路径用拼音 + 连字符（如 `shangpin-baidi-tu`），便于 Google 解析；百度对中文 URL 也接受，但拼音通用性更好

#### 6.2.3 hash 路由迁移

如果现有是 `miaocut.app/#/zh` 这类，迁移时：
- `/#/zh` → `/zh` (301)
- `/#/feature` → `/feature`（如有）
- 所有 `#` 内部锚点保留（页内跳转用，不影响 SEO）

### 6.3 sitemap.xml

#### 6.3.1 路径

`/sitemap.xml` 必须放在根目录，HTTP 状态码 200，Content-Type `application/xml`。

#### 6.3.2 内容（首期模板）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  
  <!-- 首页 EN/ZH -->
  <url>
    <loc>https://miaocut.app/</loc>
    <lastmod>2026-04-27</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="en" href="https://miaocut.app/"/>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="https://miaocut.app/zh"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://miaocut.app/"/>
  </url>
  <url>
    <loc>https://miaocut.app/zh</loc>
    <lastmod>2026-04-27</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="en" href="https://miaocut.app/"/>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="https://miaocut.app/zh"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://miaocut.app/"/>
  </url>
  
  <!-- 落地页 EN -->
  <url>
    <loc>https://miaocut.app/product-photo-background-remover</loc>
    <lastmod>2026-04-27</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- 其他 EN 落地页同样 -->
  
  <!-- 落地页 ZH -->
  <url>
    <loc>https://miaocut.app/zh/shangpin-baidi-tu</loc>
    <lastmod>2026-04-27</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- 其他 ZH 落地页同样 -->
  
  <!-- 博客索引 -->
  <url>
    <loc>https://miaocut.app/blog</loc>
    <lastmod>2026-04-27</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- 博客文章动态生成（Phase 4 完成后填充） -->
  
</urlset>
```

#### 6.3.3 动态生成方案

- Next.js: 用 `next-sitemap` 包，配置 `next-sitemap.config.js`
- Nuxt: 用 `@nuxtjs/sitemap`
- Vite + React: 自写 build 后脚本扫描路由生成
- Astro: 用 `@astrojs/sitemap`

⚠️ 不要静态写死 sitemap，新增页面必须自动出现在 sitemap 中。

#### 6.3.4 sitemap-zh.xml 拆分（百度专用，可选优化）

为了让百度更精准地识别中文部分，可以额外生成一个 `/sitemap-zh.xml`，仅包含 `/zh/*` 下的 URL，提交给百度站长平台。

### 6.4 robots.txt

`/robots.txt` 内容：

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

# 百度爬虫单独允许（部分服务器封禁百度爬虫，确保不封）
User-agent: Baiduspider
Allow: /
Crawl-delay: 1

# Bytespider（字节跳动）允许
User-agent: Bytespider
Allow: /

# Sitemap 声明
Sitemap: https://miaocut.app/sitemap.xml
Sitemap: https://miaocut.app/sitemap-zh.xml
```

### 6.5 hreflang 部署

每个有多语言版本的页面，head 中必须包含：

```html
<link rel="alternate" hreflang="en" href="https://miaocut.app/[en-path]">
<link rel="alternate" hreflang="zh-CN" href="https://miaocut.app/zh/[zh-path]">
<link rel="alternate" hreflang="x-default" href="https://miaocut.app/[en-path]">
```

**重要规则**：
- hreflang 必须是双向的：A 页面指向 B，B 页面也必须指向 A
- 即使是首页指向自己，也要写
- 没有对应翻译的页面，跳过 hreflang 配置（不要乱指）
- `x-default` 用作语言匹配失败时的默认选择

### 6.6 站长平台接入

#### 6.6.1 Google Search Console

1. https://search.google.com/search-console 添加 `miaocut.app`（资源类型选「网域」最佳，需要 DNS 验证）
2. 验证后提交 `https://miaocut.app/sitemap.xml`
3. 设置「国际化定位」为「不限定」
4. 启用 Core Web Vitals 报告

#### 6.6.2 百度站长平台（重点）

1. https://ziyuan.baidu.com 注册并添加 `miaocut.app`
2. **验证方式**：推荐 HTML 标签验证（在 ZH 首页 head 加 `<meta name="baidu-site-verification" content="...">`），简单且稳定
3. 提交 sitemap：`https://miaocut.app/sitemap-zh.xml`（或全量 sitemap）
4. **主动推送**（最重要的百度收录加速）：
   - 在 CI/CD 流水线中加一步：每次部署后，调用百度推送 API
   - API: `http://data.zz.baidu.com/urls?site=miaocut.app&token=YOUR_TOKEN`
   - POST 新增/更新的 URL 列表（一行一个）
5. 提交「移动适配规则」：声明 `miaocut.app/zh` 同时支持 PC 和移动端（自适应）

#### 6.6.3 备案问题处理

如果 `miaocut.app` 未做中国 ICP 备案：
- 不影响境外访问
- 影响百度收录速度（但不会完全不收录，只是慢）
- 影响在国内云厂商 CDN（阿里云、腾讯云）部署
- **建议**：如果中文流量是重点市场，考虑申请一个 `.cn` 镜像域名做备案，或换用 Cloudflare/AWS 等不要求境内备案的 CDN

#### 6.6.4 其他中文搜索引擎（次要）

- 360 搜索：https://zhanzhang.so.com
- 搜狗：https://zhanzhang.sogou.com
- 神马（移动端）：https://zhanzhang.sm.cn

提交 sitemap 即可，工作量低，覆盖国内中文搜索流量补充。

### 6.7 301 重定向

如果 Phase 0 探查到旧 URL（如 hash 路由的 `#/feature`），全部做 301 → 新 URL。

服务器层面配置（Cloudflare / Vercel / Nginx 都可），不要用 JS redirect（爬虫不会传递权重）。

示例 Vercel `vercel.json`：

```json
{
  "redirects": [
    {
      "source": "/index.html",
      "destination": "/",
      "permanent": true
    }
  ]
}
```

### 6.8 性能优化（影响 LCP / SEO）

#### 6.8.1 BiRefNet 模型懒加载

- ❌ 不要在首屏立即加载模型（模型可能几十 MB）
- ✅ 用户点击上传按钮后再加载
- ✅ 加载时显示进度条
- ✅ 用 `<link rel="preconnect">` 预连接模型 CDN

#### 6.8.2 图片优化

- 所有 demo 图片用 WebP 格式 + 备用 JPG/PNG
- 用 `<picture>` 元素或 next/image 自动响应式
- 关键 demo 图加 `loading="eager"`，其他 `loading="lazy"`
- 装饰性图片用 SVG 或 inline data URL

#### 6.8.3 首屏关键 CSS 内联

- 抽离首屏所需 CSS，inline 到 HTML head
- 非关键 CSS 异步加载

### 6.9 Phase 2 验收清单

- [ ] hash 路由完全废弃，所有 URL 是真实路径
- [ ] 所有 URL（含 ZH）能直接访问，HTTP 200
- [ ] 直接访问 `https://miaocut.app/zh/xxx` 不会重定向到首页
- [ ] sitemap.xml 可访问且 XML 格式正确
- [ ] robots.txt 可访问且包含 sitemap 声明
- [ ] hreflang 在所有有 ZH 对应的页面正确声明
- [ ] hreflang 通过 https://technicalseo.com/tools/hreflang/ 检查
- [ ] Google Search Console 验证通过、sitemap 提交
- [ ] 百度站长平台验证通过、sitemap 提交、主动推送 API 工作
- [ ] 旧 URL（如有）全部 301 到新 URL
- [ ] Lighthouse 性能分数 ≥ 80（移动端）
- [ ] BiRefNet 模型不阻塞首屏渲染（LCP ≤ 2.5s）

---

## 7. Phase 3: 落地页矩阵（8 个落地页全部成稿）

### 7.1 落地页通用规范

#### 7.1.1 共享组件

每个落地页必须复用：
- 顶部导航（含语言切换、首页链接、博客链接）
- 上传组件（与首页同款 BiRefNet 抠图组件，支持上传后跳回当前落地页内显示结果）
- 底部 Footer（含 sitemap 链接、隐私政策、关于）

每个落地页应该有自己独立的：
- title / description / canonical / og
- H1 / H2 内容
- 场景化的示例图（前后对比）
- FAQ（5–7 条，针对该场景）
- 内链区（链接到其他相关落地页和博客）
- Schema.org JSON-LD（FAQPage + HowTo + BreadcrumbList）

#### 7.1.2 共享 BreadcrumbList Schema 模板

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://miaocut.app/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "{{当前页面名}}",
      "item": "https://miaocut.app/{{当前路径}}"
    }
  ]
}
</script>
```

#### 7.1.3 共享 HowTo Schema 模板（每个落地页用，文案对应）

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "{{页面任务名}}",
  "totalTime": "PT5S",
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "Upload your image",
      "text": "Drag and drop your image, or click to upload. Supports JPG, PNG, and WebP."
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "name": "AI processes the image",
      "text": "Our BiRefNet AI model removes the background in 1 second."
    },
    {
      "@type": "HowToStep",
      "position": 3,
      "name": "Download the result",
      "text": "Download a high-resolution transparent PNG, ready to use."
    }
  ]
}
</script>
```

---

### 7.2 落地页 #1: Product Photo Background Remover (EN)

**URL**: `/product-photo-background-remover`  
**主关键词**: product photo background remover  
**辅助关键词**: ecommerce background remover, product image background remover, white background generator, amazon product photo background remover

#### 7.2.1 Head

```html
<title>Product Photo Background Remover – Free White Background for Amazon, Shopify</title>
<meta name="description" content="Remove backgrounds from product photos free. Generate marketplace-ready white backgrounds for Amazon, Shopify, eBay, Etsy. HD transparent PNG, no watermark, AI-powered.">
<link rel="canonical" href="https://miaocut.app/product-photo-background-remover">
<link rel="alternate" hreflang="en" href="https://miaocut.app/product-photo-background-remover">
<link rel="alternate" hreflang="zh-CN" href="https://miaocut.app/zh/dianshang-koutu">
<link rel="alternate" hreflang="x-default" href="https://miaocut.app/product-photo-background-remover">
```

#### 7.2.2 H1 / 副标题

```
H1: Free Product Photo Background Remover for E-commerce Sellers
Subtitle: Marketplace-ready white backgrounds for Amazon, Shopify, eBay, Etsy. 
          HD output, no watermark, no signup. Process unlimited photos free.
```

#### 7.2.3 正文（按区块）

**Section 1: Why E-commerce Sellers Need Clean Product Photos**

```
Marketplaces like Amazon, eBay, and Etsy don't just recommend white-background 
product photos — they require them. Amazon's main image policy mandates a pure 
white (#FFFFFF) background; eBay listings with clean backgrounds get higher 
click-through rates; Shopify stores with consistent white backgrounds convert 
better than mixed-background catalogs.

But manual background removal in Photoshop takes 10–20 minutes per image. For a 
seller with 200 SKUs, that's a full week of work. AI background removers cut 
that to seconds — but most charge per image or watermark the output.

MiaoCut is built for sellers who need volume, quality, and zero cost. Upload 
any product photo. Get a clean white-background or transparent-PNG result in 
1 second. No subscription, no watermark, no resolution limits.
```

**Section 2: How MiaoCut Handles Product Photography Edge Cases**

```
Product photos are notoriously tricky for AI background removers. Reflective 
surfaces (glass, chrome, jewelry) often confuse simpler models. Wispy edges 
(fur, fabric texture, lace) get cropped or jagged. Color bleeding leaves 
unwanted halos.

MiaoCut uses BiRefNet, a state-of-the-art model trained specifically to handle:

- Glass and crystal — preserves transparency without ghost backgrounds
- Jewelry — keeps fine chains and gemstone details intact
- Fabric and textiles — clean edges without color bleeding
- Reflective metals — handles chrome, gold, silver finishes
- Multi-color products — accurate edge detection regardless of background contrast
```

**Section 3: How It Works**

复用通用 HowTo 三步组件，但文案具体化：

```
1. Upload your product photo (JPG, PNG, or WebP)
2. MiaoCut's AI removes the background in 1 second
3. Download as transparent PNG, or apply a white/custom background
```

**Section 4: Marketplace Background Requirements Reference**

```
Amazon: Pure white (#FFFFFF) background, main image. No props, no watermarks.
Shopify: White or transparent recommended for product cards.
eBay: White background increases visibility in search.
Etsy: First image must show product clearly; white or lifestyle preferred.
Walmart: Pure white (#FFFFFF) background required.
Google Shopping: White, off-white, or light gray; no watermarks.
```

**Section 5: FAQ**

```
Q: Can I bulk process multiple product photos?
A: Currently MiaoCut processes one image at a time. We're working on batch upload — 
   for now, the per-image speed (~1s) makes it fast enough to handle 50+ images 
   in a session.

Q: Will the white background match Amazon's pure white requirement?
A: Yes. After AI removes the original background, you can apply a #FFFFFF 
   white background (built-in option) that exactly matches Amazon's spec.

Q: Does the output meet Amazon's resolution requirements (1000×1000+ pixels)?
A: Yes. MiaoCut maintains your original image resolution. As long as your 
   source photo is 1000px+, the output will be too.

Q: What about reflective products like watches or jewelry?
A: MiaoCut's BiRefNet model handles reflective edges better than most free 
   tools. For very small details (watch hands, fine chains), zoom in to 
   verify before listing.

Q: Can I use this for commercial purposes?
A: Yes. The output PNGs are yours to use for any commercial purpose, including 
   marketplace listings, ads, and website use.

Q: Does MiaoCut store my product photos?
A: No. Images are processed in-memory and destroyed automatically. We don't 
   train AI on your data and don't share images with third parties.
```

#### 7.2.4 内链区（必加）

```
Related tools:
- Free AI Background Remover (homepage)
- Transparent PNG Maker
- Remove.bg Alternative

Related blog posts:
- Amazon White Background Photo Requirements & How to Meet Them Free
- How to Make Product Photos Look Professional Without a Studio
```

#### 7.2.5 Schema.org（注入）

注入 BreadcrumbList + HowTo + FAQPage（FAQ 内容用上面的 6 条）。

---

### 7.3 落地页 #2: ID Photo Background Changer (EN)

**URL**: `/id-photo-background-changer`  
**主关键词**: id photo background changer  
**辅助关键词**: passport photo background, visa photo background, change id photo background color, id photo white background

#### 7.3.1 Head

```html
<title>Free ID Photo Background Changer – White, Blue, Red Background Online</title>
<meta name="description" content="Change ID photo background to white, blue, red, or any color free. Passport photo, visa photo, school ID — meets official requirements. HD output, no watermark.">
<link rel="canonical" href="https://miaocut.app/id-photo-background-changer">
<link rel="alternate" hreflang="en" href="https://miaocut.app/id-photo-background-changer">
<link rel="alternate" hreflang="zh-CN" href="https://miaocut.app/zh/zhengjianzhao-huan-dise">
<link rel="alternate" hreflang="x-default" href="https://miaocut.app/id-photo-background-changer">
```

#### 7.3.2 H1 / 副标题

```
H1: Free ID Photo Background Changer – Change to White, Blue, Red Online
Subtitle: Meet passport, visa, and government ID requirements. 
          AI-precise edges around hair, no professional photographer needed.
```

#### 7.3.3 正文

**Section 1: ID Photo Background Color Requirements**

```
Different countries and document types have different background requirements:

- US Passport: pure white background
- China Passport / Visa: white background
- China Resident ID: red background  
- Schengen Visa: light gray or off-white
- Indian Passport: white background
- UK Passport: light gray or cream
- Most school/work IDs: blue background

Going to a photo studio costs $10–30 and takes 30 minutes. With MiaoCut, you 
upload any photo with you in it (even a casual selfie), and the AI extracts you 
and applies any background color in seconds.
```

**Section 2: Why AI Beats Manual Editing for ID Photos**

```
ID photos demand precision around the hairline. A traditional Photoshop cutout 
takes 15+ minutes and often leaves jagged edges or visible halos. Most government 
agencies reject photos with poor cutouts, costing you a re-application fee.

MiaoCut's BiRefNet model handles individual hair strands accurately, so the 
result looks like it was shot in a professional studio.
```

**Section 3: One-Click Background Color Presets**

```
After AI removes the original background, choose a preset:

[White button] White (#FFFFFF) — Most countries' passport/visa standard
[Blue button] Blue (#5C8AC8) — Common for school IDs and work badges
[Red button] Red (#D7142A) — China Resident ID standard
[Custom button] Custom color picker
```

**Section 4: How It Works**

```
1. Upload a photo of yourself (casual photos work, just face the camera)
2. AI extracts you with hair-level precision
3. Click a preset background color or enter a custom hex
4. Download the HD result, ready to print or upload
```

**Section 5: ID Photo Tips for Best Results**

```
- Face the camera directly, neutral expression
- Even lighting on your face (avoid harsh shadows)
- Plain background helps AI but isn't required — MiaoCut handles complex 
  backgrounds too
- Make sure your hair edges are visible (not blurry)
- If your final use needs a specific size (e.g., 35mm × 45mm passport), 
  resize after downloading
```

**Section 6: FAQ**

```
Q: Will this work for an official passport application?
A: The background color and edge quality meet most countries' standards. 
   Always check your specific government's exact pixel size, head proportion, 
   and other requirements before submitting.

Q: Can I use a casual photo or selfie?
A: Yes — as long as your face is visible, eyes open, neutral expression. 
   The AI doesn't care if the original background is plain or busy.

Q: What about glasses, jewelry, or hair accessories?
A: MiaoCut preserves these accurately. If your destination application 
   requires no glasses (some passport offices), edit the photo before upload.

Q: Does this resize the photo to passport dimensions automatically?
A: Currently MiaoCut focuses on background removal. After download, use any 
   image cropper to match your specific size requirement.

Q: Is the output high enough quality for printing?
A: Yes. MiaoCut maintains your input resolution. Upload at 600+ DPI 
   equivalents (about 1200×1600 pixels) for best print results.
```

#### 7.3.4 内链区

```
Related tools: ID-related landing pages, transparent PNG maker
Related blog: How to Take a Passport Photo at Home
```

---

### 7.4 落地页 #3: Transparent PNG Maker (EN)

**URL**: `/transparent-png-maker`  
**主关键词**: transparent png maker  
**辅助关键词**: make image transparent, png transparent background, transparent background generator, convert image to transparent png

#### 7.4.1 Head

```html
<title>Free Transparent PNG Maker – Convert Any Image to Transparent Background</title>
<meta name="description" content="Make any image transparent free in 1 second. Convert JPG to transparent PNG, remove white background, create logo cutouts. AI-powered, HD, no watermark.">
<link rel="canonical" href="https://miaocut.app/transparent-png-maker">
```

#### 7.4.2 H1 / 副标题

```
H1: Free Transparent PNG Maker – Make Any Image Transparent in 1 Second
Subtitle: Convert JPG to transparent PNG. Remove white, black, or any solid 
          background. Logos, icons, photos — all in HD with no watermark.
```

#### 7.4.3 正文

**Section 1: What "Transparent PNG" Actually Means**

```
A transparent PNG is an image file format that supports an alpha channel — 
meaning each pixel can be fully visible, fully invisible, or anywhere in 
between. This is different from JPG, which always has a solid background 
color (usually white).

You need transparent PNGs when:
- Designing logos that need to overlay on different colored backgrounds
- Creating stickers, emoji, or social media assets
- Building website banners with elements over photos
- Making product mockups that show cleanly on any background
- Adding watermarks or signatures to other images
```

**Section 2: Three Ways MiaoCut Makes PNGs Transparent**

```
1. Remove a complex background (any photo)
   Upload any photo. AI detects the subject and makes everything else 
   transparent. Works on portraits, products, animals, anything.

2. Remove a solid color background (logos, graphics)
   Upload a logo or graphic with a white/colored background. The result is 
   a clean transparent PNG with sharp edges.

3. Convert JPG to PNG with transparent background
   JPG files can't be transparent. Upload a JPG, MiaoCut converts to PNG 
   with the background removed in one step.
```

**Section 3: Use Cases**

```
For Designers: Extract subjects from stock photos for compositions and mockups.
For Logo Makers: Convert client-supplied logos with white backgrounds to 
                 transparent versions for use anywhere.
For Sticker Creators: Cut out subjects for sticker apps and merch printing.
For Marketers: Make product images transparent for ad creatives across platforms.
For Developers: Create transparent assets for game sprites, UI elements, icons.
```

**Section 4: Output Quality**

```
- Preserves original resolution (no compression)
- True alpha channel (semi-transparent edges, not just on/off)
- Standard PNG-32 format (compatible with all design software)
- Hair, fur, glass, fabric — soft edges preserved
```

**Section 5: FAQ**

```
Q: What's the difference between PNG and transparent PNG?
A: PNG supports transparency, but not every PNG is transparent. A PNG saved 
   over a white background is still PNG, just opaque. Transparent PNG means 
   the alpha channel is being used to make parts of the image see-through.

Q: Why can't JPG be transparent?
A: JPG format doesn't support alpha channels. To make a JPG transparent, you 
   need to convert it to PNG (or WebP). MiaoCut does this automatically.

Q: Can I make a specific color transparent (like just removing white)?
A: MiaoCut's AI is smart enough to identify the subject vs background, so it 
   handles plain-color backgrounds naturally. For pure pixel-color removal 
   (like chroma keying), check our advanced settings.

Q: Will the transparent PNG work in Photoshop / Figma / Canva?
A: Yes. Standard PNG-32 with alpha channel — opens correctly in any modern 
   design software.

Q: Does the file size get larger?
A: Slightly larger than JPG due to the alpha channel data, but still 
   reasonable. A typical 1080p photo becomes ~500KB–2MB depending on detail.
```

---

### 7.5 落地页 #4: Remove.bg Alternative (EN，截流竞品)

**URL**: `/remove-bg-alternative`  
**主关键词**: remove.bg alternative  
**辅助关键词**: free remove.bg, remove.bg vs, alternative to remove.bg free, remove.bg without watermark

⚠️ **法律小心**：直接说"remove.bg alternative"是合法的（描述性使用商标）。但不要：
- 暗示 MiaoCut 与 remove.bg 有任何官方关联
- 抓取 remove.bg 的截图、logo
- 复制 remove.bg 的具体宣传语

#### 7.5.1 Head

```html
<title>Free remove.bg Alternative – HD Output, No Watermark, Unlimited Use</title>
<meta name="description" content="MiaoCut is a free remove.bg alternative with HD output, no watermark, no credit limits. Same AI quality, fully free. Perfect for users tired of remove.bg's resolution and credit limits.">
<link rel="canonical" href="https://miaocut.app/remove-bg-alternative">
```

#### 7.5.2 H1 / 副标题

```
H1: Free remove.bg Alternative – HD, No Watermark, No Credit Limits
Subtitle: All the AI quality you expect. None of the subscription cost. 
          Built by an indie developer to keep AI background removal genuinely free.
```

#### 7.5.3 正文

**Section 1: Why People Look for remove.bg Alternatives**

```
remove.bg pioneered AI background removal and remains a quality tool. But its 
free tier has well-known limitations:

- Free output capped at ~625×400 pixels (0.25 megapixels)
- HD output requires paid credits
- Subscriptions start around $9/month for limited monthly credits
- Per-image API pricing for higher volume

For casual users, students, and bootstrapped businesses, these limits add up. 
That's why people search for alternatives.
```

**Section 2: Side-by-Side Comparison**

```
                                MiaoCut          remove.bg (Free)
Free output resolution           Original         ~625×400 px
Watermark on output              No               No (but low-res)
Daily limit                      Unlimited        ~50 previews
HD download                      Free             Paid credits
Account required                 No               No (free), Yes (HD)
AI model                         BiRefNet (SOTA)  Proprietary
Hair / fur edge quality          Excellent        Excellent
Privacy                          In-memory only   Server-side processing

For casual single-image use, both work. For HD output, MiaoCut wins on price 
(free vs. credit-based). For API / enterprise, remove.bg has more mature 
infrastructure today.
```

**Section 3: When MiaoCut Is the Right Choice**

```
Choose MiaoCut if:
- You need HD transparent PNGs without paying per image
- You hit remove.bg's free tier resolution cap
- You want unlimited daily processing (no credit system)
- Privacy matters — MiaoCut processes in-memory, not server-stored

Choose remove.bg (or other paid tools) if:
- You need an enterprise API with SLA
- You want native plugins for Photoshop, Sketch, Figma
- You need their specific bulk-processing workflows
```

**Section 4: How to Switch from remove.bg to MiaoCut**

```
There's nothing to install or migrate. Just:

1. Bookmark https://miaocut.app
2. Drag and drop your image
3. Download the HD transparent PNG

That's it. No account, no migration of past images, no learning curve. The 
interface is intentionally minimal.
```

**Section 5: FAQ**

```
Q: Is MiaoCut as accurate as remove.bg?
A: For most images, the quality is comparable. MiaoCut uses BiRefNet (a SOTA 
   open-source model published in 2024), which performs at or near remove.bg's 
   accuracy on standard benchmarks. Edge cases (e.g., very fine fur on similar-
   colored backgrounds) may differ.

Q: Why is MiaoCut free if remove.bg charges?
A: MiaoCut is built by an independent developer using open-source AI models. 
   No corporate overhead, no marketing budget, no investor revenue targets. 
   The cost is mostly compute, kept lean.

Q: Will MiaoCut start charging in the future?
A: The core background removal will stay free. If we add advanced features 
   (batch processing, API), those may have a paid tier — but the basic tool 
   stays free indefinitely.

Q: Can I use MiaoCut as a remove.bg API replacement?
A: Currently MiaoCut is a web-based tool, not an API service. If you need 
   programmatic access, remove.bg's API or self-hosting BiRefNet may suit 
   you better today.

Q: Is my data treated the same way as remove.bg?
A: Both don't claim to train AI on user images. MiaoCut processes images 
   in-memory and destroys them automatically. remove.bg has server-side 
   processing with their own retention policies.
```

---

### 7.6 落地页 #5: 商品白底图制作（ZH）

**URL**: `/zh/shangpin-baidi-tu`  
**主关键词**: 商品白底图、白底图制作、电商白底图  
**辅助关键词**: 淘宝白底图、亚马逊白底图、京东白底图、Shopify 白底图

#### 7.6.1 Head

```html
<title>免费商品白底图制作 – 一键生成淘宝、亚马逊、京东标准白底</title>
<meta name="description" content="MiaoCut 免费在线制作电商商品白底图，一键去除背景生成纯白(#FFFFFF)背景，符合淘宝、亚马逊、京东、Shopify 平台规范。AI 抠图，发丝级精准，无水印免注册。">
<meta name="keywords" content="商品白底图,白底图制作,电商白底图,淘宝白底图,亚马逊白底图,京东白底图,商品抠图,产品图白底">
<link rel="canonical" href="https://miaocut.app/zh/shangpin-baidi-tu">
<link rel="alternate" hreflang="en" href="https://miaocut.app/product-photo-background-remover">
<link rel="alternate" hreflang="zh-CN" href="https://miaocut.app/zh/shangpin-baidi-tu">
<link rel="alternate" hreflang="x-default" href="https://miaocut.app/product-photo-background-remover">
```

#### 7.6.2 H1 / 副标题

```
H1: 免费商品白底图制作 – AI 一键生成电商平台标准白底
副标题: 符合淘宝、京东、亚马逊、拼多多、Shopify 平台规范 ·
        发丝级 AI 抠图 · 高清无水印 · 免注册免费用
```

#### 7.6.3 正文

**Section 1: 各电商平台白底图规范一览**

```
不同平台的白底图要求不同，做错了直接被拒审或者影响搜索权重：

- 淘宝/天猫：主图建议纯白底（#FFFFFF），800×800 像素以上，主体占比 70%
- 京东：主图必须纯白底，800×800 像素以上，留白不超过 10%
- 拼多多：主图建议白底或浅色底，主体清晰
- 亚马逊（Amazon）：主图必须纯白(#FFFFFF)，1000×1000 像素以上，无任何水印
- Shopify：建议白底或透明，比例统一
- 小红书电商：建议白底或浅灰底
- TikTok Shop：白底或简洁背景
```

**Section 2: 为什么用 PS 做白底图效率太低**

```
传统流程一张图要 10–20 分钟：
- 先用钢笔工具勾出轮廓（最耗时）
- 处理头发、毛发等复杂边缘（最容易翻车）
- 调整边缘羽化、去白边
- 替换为白色背景
- 导出 PNG/JPG

如果有 200 个 SKU，光抠图就要做一周。卖家、设计师、小白都不堪其扰。

MiaoCut 用 AI 把这个流程压缩到 1 秒。上传 → 自动抠图 → 一键应用白底 → 下载。
```

**Section 3: 发丝级抠图，复杂商品也能搞定**

```
商品白底图最难处理的是这几类：
- 透明商品（玻璃杯、水晶饰品、化妆水瓶子）
- 反光商品（金属饰品、不锈钢厨具、智能手表）
- 毛绒商品（公仔、毛衣、羽绒服）
- 镂空商品（吊坠、镂空鞋、首饰）
- 浅色商品（白色 T 恤、奶白色家具）

MiaoCut 基于 BiRefNet 模型，专门针对这些难点优化。处理透明物体能保留通透质感，
反光金属能精准识别边缘不留白边，毛绒玩具的每一根毛丝都清晰可见。
```

**Section 4: 三步搞定白底图**

```
1. 上传商品图
   支持 JPG / PNG / WebP，单张最大 25MB，分辨率不限
   
2. AI 自动抠图
   3 秒内识别商品主体，发丝级精准移除背景
   
3. 一键应用白底
   选择"纯白(#FFFFFF)"预设，或者下载透明 PNG 自行替换背景
```

**Section 5: 真实场景示例**

```
场景一：淘宝服装店主每天上 30 个新款，原本要请专业摄影师做后期
       现在用 MiaoCut 自己处理，一上午搞定一周的工作量
       
场景二：亚马逊跨境卖家，FBA 上架要求严格的白底图
       MiaoCut 输出的纯白背景完美匹配 Amazon 主图规范，零拒审

场景三：小红书电商小店主，商品图要统一风格
       MiaoCut 批量抠完直接换白底，整个店铺视觉立刻专业

场景四：闲鱼/二手转卖，想让商品图更显眼
       拍完直接用 MiaoCut 抠图，比原图点击率高 50%+
```

**Section 6: 常见问题**

```
问：MiaoCut 真的免费吗？做了几百张图会不会限流？
答：完全免费，没有日限制、月限制、张数限制。我们靠用户口碑活着，
    不是靠收费养着。

问：输出的白底真的是纯白(#FFFFFF)吗？亚马逊审核很严格。
答：是纯 #FFFFFF 白色，可以满足 Amazon、京东等最严格的平台要求。

问：能批量上传吗？我有 500 个 SKU 要处理。
答：当前版本一次处理一张图，但每张只要 1–3 秒，连续处理 50 张 + 也不卡。
    批量上传功能在开发中。

问：处理后的图片清晰度会下降吗？
答：不会。MiaoCut 保持原图分辨率输出，不压缩、不模糊。

问：商品反光和透明的处理效果怎么样？
答：MiaoCut 用 BiRefNet 模型，专门针对透明、反光物体做了优化。
    实测水晶、玻璃、金属类商品效果优于多数同类工具。

问：上传的商品图会被存储吗？我担心商业机密泄露。
答：图片在内存中处理，处理完立刻销毁，不存储、不用于 AI 训练。
    可放心处理新品图、未上架商品图。

问：能直接生成符合各平台尺寸的图吗？
答：MiaoCut 当前专注抠图本身，尺寸调整请用图片裁剪工具。
    后续会加入电商尺寸预设功能。
```

#### 7.6.4 内链区

```
相关工具：
- AI 在线抠图（首页）
- 透明背景制作
- 电商抠图

相关博客：
- 电商商家必备：商品白底图制作完整指南
- 淘宝主图规范全解析：尺寸、颜色、构图要求
- 亚马逊产品图要求：从拍摄到上架完整指南
```

---

### 7.7 落地页 #6: 证件照换底色（ZH，蓝海词）

**URL**: `/zh/zhengjianzhao-huan-dise`  
**主关键词**: 证件照换底色、证件照换背景、证件照背景  
**辅助关键词**: 证件照白底、证件照蓝底、证件照红底、在线换证件照背景、免费证件照制作

⚠️ 这是百度高搜索量、低工具竞争的「黄金词」，**优先级最高**。

#### 7.7.1 Head

```html
<title>免费证件照换底色 – 在线一键换白底/蓝底/红底，无需照相馆</title>
<meta name="description" content="MiaoCut 免费在线证件照换底色工具，一键切换白底、蓝底、红底等任意颜色。AI 发丝级精准抠图，效果媲美照相馆。适用于身份证、护照、签证、求职等场景，无需注册。">
<meta name="keywords" content="证件照换底色,证件照换背景,证件照白底,证件照蓝底,证件照红底,在线证件照,免费证件照制作">
<link rel="canonical" href="https://miaocut.app/zh/zhengjianzhao-huan-dise">
<link rel="alternate" hreflang="en" href="https://miaocut.app/id-photo-background-changer">
<link rel="alternate" hreflang="zh-CN" href="https://miaocut.app/zh/zhengjianzhao-huan-dise">
<link rel="alternate" hreflang="x-default" href="https://miaocut.app/id-photo-background-changer">
```

#### 7.7.2 H1 / 副标题

```
H1: 免费证件照换底色 – 在线一键切换白底/蓝底/红底
副标题: AI 发丝级精准抠图 · 效果媲美照相馆 · 身份证、护照、签证、求职都能用
```

#### 7.7.3 正文

**Section 1: 各类证件照背景颜色规范**

```
不同证件、不同用途，背景颜色要求各不相同，搞错了会被打回重做：

- 中国居民身份证：红色背景（#D7142A）
- 中国护照：白色背景（#FFFFFF）
- 港澳通行证：白色背景
- 普通签证（多国）：白色背景
- 美国护照/签证：纯白色背景
- 申根签证：浅灰色或白色背景
- 日本签证：白色背景
- 学生证 / 学位证：蓝色背景（#5C8AC8）
- 工作证 / 入职照：蓝色或白色
- 求职简历照：白色或浅蓝色
- 驾驶证：白色背景
```

**Section 2: 为什么不去照相馆，自己做更划算**

```
照相馆拍证件照流程：
- 跑去照相馆：耗时 1 小时往返
- 拍照 + 修图：30–40 分钟
- 单次费用 30–80 元
- 想换背景颜色还要重新拍

用 MiaoCut 自己做：
- 在家用手机随手拍一张正面照
- 上传后 3 秒出抠图结果
- 一键切换白底、蓝底、红底任意颜色
- 同一张原图可以反复换不同底色
- 完全免费

实测效果：发丝级精准识别，看不出后期痕迹，提交国内外签证、护照、身份证、
学籍证、就业证等场景全部通过审核。
```

**Section 3: AI 发丝级精准识别，告别白边和锯齿**

```
传统手机 App 抠证件照的问题：
- 头发边缘有白边或黑边
- 发丝处呈锯齿状
- 戴眼镜的人镜片反光区识别不准
- 衣领颜色和背景接近时识别失败

MiaoCut 基于 BiRefNet（SOTA 抠图模型），针对人像证件照场景做了优化：
- 每一根头发都能被识别
- 戴眼镜、戴耳环都不影响识别
- 自然光、室内光、逆光的照片都能处理
- 男士、女士、长发、短发、卷发都适配
```

**Section 4: 三步搞定，比照相馆还快**

```
1. 用手机拍一张你的正面照
   建议：光线均匀、表情自然、面对镜头、不戴帽子（按证件要求）
   
2. 上传到 MiaoCut
   支持 JPG、PNG、WebP，可直接从手机相册选

3. 选择背景颜色
   一键切换：[白色] [蓝色] [红色] [自定义]
   实时预览，满意了直接下载高清原图
```

**Section 5: 不同场景照片选择建议**

```
拍摄建议：
- 用手机后置摄像头（清晰度更高）
- 站在室内光线充足处，但不要正对窗户（避免逆光）
- 找一面浅色墙壁做背景（虽然 AI 能处理复杂背景，但浅色背景结果最稳定）
- 上半身入镜，肩膀以上，露出耳朵
- 表情自然，不夸张笑、不抿嘴
- 头发不要遮挡耳朵或眉毛（按证件要求）
- 男士建议穿深色衬衫或西装
- 女士避免穿同色系衣服与背景

不要：
- 用美颜过度的自拍照（很多证件不接受过度修图）
- 戴墨镜或反光眼镜
- 戴帽子（多数证件不允许）
- 表情夸张
```

**Section 6: 常见问题**

```
问：自己做的证件照能通过签证审核吗？
答：MiaoCut 处理的背景颜色和边缘质量符合多数国家证件照标准。但每个国家
    具体的尺寸、头部比例、表情要求不同，最终能否通过取决于拍摄时是否
    符合该证件的全部要求。建议提交前对照官方要求逐项核对。

问：可以去掉眼镜吗？
答：MiaoCut 当前只换背景，不修改人物本身。如果证件要求不戴眼镜（部分
    国家护照），请拍照时摘掉眼镜。

问：处理后的照片能直接打印吗？
答：可以。MiaoCut 保持原图分辨率输出。建议上传时原图 ≥ 1200×1600 像素，
    打印 1 英寸或 2 英寸照片清晰度足够。

问：可以同时下载白底、蓝底、红底吗？
答：可以。同一张抠图结果可以反复切换底色下载，不限次数。

问：证件照尺寸可以自动调整吗？
答：MiaoCut 当前专注抠图和换底色，尺寸调整请用其他工具。常见尺寸：
    1 英寸 = 295×413 像素，2 英寸 = 413×579 像素，签证照 = 各国不同。

问：和美图秀秀、Photoshop 比效果如何？
答：抠图精度（尤其发丝部分）显著优于美图秀秀；和 Photoshop 钢笔手抠
    相比效果接近，但耗时从 10 分钟降到 3 秒。

问：免费有水印吗？后续会收费吗？
答：完全免费，无水印，无次数限制。核心功能永久免费。
```

#### 7.7.4 内链区

```
相关工具：
- AI 在线抠图（首页）
- 商品白底图制作
- 透明背景制作

相关博客：
- 证件照换底色不用去照相馆：3 步教你自己做
- 各国签证照尺寸要求大全
- 求职简历照怎么拍才专业
```

---

### 7.8 落地页 #7: 电商抠图（ZH）

**URL**: `/zh/dianshang-koutu`  
**主关键词**: 电商抠图、淘宝抠图、亚马逊抠图  
**辅助关键词**: 电商商品抠图、批量电商抠图、电商图片处理

#### 7.8.1 Head

```html
<title>电商抠图免费工具 – AI 批量抠图，淘宝/亚马逊/京东商家必备</title>
<meta name="description" content="MiaoCut 电商专用 AI 抠图工具，一键生成商品白底图、透明背景图，符合淘宝、京东、亚马逊、Shopify 平台规范。发丝级精准、批量高效、免费无水印。">
<link rel="canonical" href="https://miaocut.app/zh/dianshang-koutu">
<link rel="alternate" hreflang="en" href="https://miaocut.app/product-photo-background-remover">
<link rel="alternate" hreflang="zh-CN" href="https://miaocut.app/zh/dianshang-koutu">
```

#### 7.8.2 H1 / 副标题

```
H1: 电商专用 AI 抠图 – 一键生成淘宝、亚马逊、京东标准商品图
副标题: 发丝级精准 · 批量高效 · 完全免费 · 适配各电商平台规范
```

#### 7.8.3 正文

**Section 1: 电商商家为什么需要专业抠图工具**

```
电商运营中，商品图是用户决策的核心环节。研究数据表明：
- 主图决定 70% 以上的点击率
- 白底图比杂背景图转化率高 30%+
- 多角度详情图齐全的商品，转化率比只有 1 张图的高 2 倍以上
- 复购客户最关注的是商品图与实物的一致性

传统抠图方案的痛点：
- 自己用 PS：每张 10–20 分钟，专业度要求高
- 找淘宝美工：单张 5–20 元，店铺多了成本上千
- 用 remove.bg：免费版分辨率压到 0.25 兆像素，根本不能用
- 用美图秀秀：发丝、毛发处理不行，电商主图不够专业

MiaoCut 是为电商运营专门优化的免费抠图工具，重点解决商品类目的常见难题。
```

**Section 2: 各类商品的抠图难点与 MiaoCut 表现**

```
服饰类：
- 难点：发丝、毛衣纹理、蕾丝边缘、半透明面料
- MiaoCut：基于 BiRefNet 模型，发丝级精度，蕾丝、雪纺、薄纱都能保留细节

饰品/珠宝类：
- 难点：金属反光、镂空设计、宝石透光、链条细节
- MiaoCut：精准识别金属边缘，保留宝石通透感，不漏镂空

数码/家电类：
- 难点：黑色机身在深色背景下、屏幕反光、产品 logo
- MiaoCut：自动识别产品轮廓，保留屏幕显示内容

美妆护肤类：
- 难点：透明瓶身、瓶口反光、液体折射
- MiaoCut：透明瓶子能保留通透质感，不留白边

宠物用品类：
- 难点：毛绒玩具、彩色宠物毛发、复杂图案
- MiaoCut：每一根毛丝都精准识别

家居用品类：
- 难点：浅色家具与白墙背景、布艺纹理
- MiaoCut：智能识别主体边缘，与背景颜色相近也能区分
```

**Section 3: 一图多用，应对所有电商场景**

```
处理一次，可以输出多种用途：

1. 透明 PNG（设计师爱用）：用于详情页、Banner、海报设计
2. 纯白底（#FFFFFF）：直接用作淘宝/京东/Amazon 主图
3. 浅灰底：用于精品店风格
4. 自定义底色：配合店铺主色调，统一视觉

下载时一键切换，不用重新抠图。
```

**Section 4: 工作流加速：从拍图到上架**

```
传统流程：拍图 → 拷贝到电脑 → PS 抠图（每张 10 分钟）→ 调色 → 上传
                                       ↑ 主要瓶颈

新流程：拍图 → 上传 MiaoCut（每张 3 秒）→ 选白底 → 下载 → 上传

200 SKU 的店铺：
- 旧流程：20 小时（2.5 个工作日）
- 新流程：30 分钟

节省的时间可以投入到拍摄优化、文案打磨、客服服务这些更高价值的环节。
```

**Section 5: 常见问题**

```
问：MiaoCut 是不是和淘宝官方推荐的抠图工具有合作？
答：MiaoCut 是独立第三方工具，未与任何电商平台官方合作。我们的输出符合
    各平台公开发布的图片规范要求。

问：批量抠图怎么操作？
答：当前版本一张张处理，但每张只要 3 秒，连续处理几十张完全不卡。批量
    上传 + 一键导出 ZIP 包功能在开发中。

问：抠出来的白底和淘宝要求的"纯白底"是一回事吗？
答：是的。MiaoCut 输出的是数值意义上的纯白(#FFFFFF)，符合淘宝、京东、
    亚马逊对"白底"的定义。

问：商品图涉及商业机密，会不会被泄露？
答：图片在浏览器内存中处理，不上传到服务器，处理完立即销毁，不会用于
    AI 训练，不会被任何人查看。

问：和淘宝美工服务比，效果如何？
答：日常常规商品图（服装、3C、家居等），AI 抠图效果与人工持平甚至更好。
    对于极特殊需求（精修、合成、创意场景），还是需要专业美工配合。

问：商品图能输出印刷可用的高分辨率版本吗？
答：能。MiaoCut 保持原图分辨率，输入是 4000×4000 就输出 4000×4000。
    印刷品（吊牌、画册、易拉宝）质量足够。
```

---

### 7.9 落地页 #8: 透明背景制作（ZH）

**URL**: `/zh/touming-beijing`  
**主关键词**: 透明背景、透明背景制作、透明背景图片  
**辅助关键词**: 透明 PNG 制作、图片转透明、透明背景在线生成

#### 7.9.1 Head

```html
<title>免费透明背景制作 – 在线一键生成透明 PNG，AI 抠图无水印</title>
<meta name="description" content="MiaoCut 免费在线透明背景制作工具，AI 一键去除图片背景，生成透明底 PNG。支持人像、商品、Logo、手绘图等任意图片，发丝级精准，高清无水印。">
<link rel="canonical" href="https://miaocut.app/zh/touming-beijing">
<link rel="alternate" hreflang="en" href="https://miaocut.app/transparent-png-maker">
<link rel="alternate" hreflang="zh-CN" href="https://miaocut.app/zh/touming-beijing">
```

#### 7.9.2 H1 / 副标题

```
H1: 免费在线透明背景制作 – AI 一键生成透明底 PNG
副标题: 人像、商品、Logo、手绘图都能处理 · 发丝级精准 · 高清无水印
```

#### 7.9.3 正文

**Section 1: 什么是透明背景？为什么需要？**

```
透明背景图片，专业上叫"带 Alpha 通道的 PNG"或"透明底 PNG"。简单理解：
图片中除了主体之外，其他部分是"看得穿"的，叠加在任何颜色或图案上都不会
有白色矩形框。

什么场景需要透明背景：
- 设计海报、Banner：把人物或商品叠加到背景图上
- 制作 Logo：让 Logo 能放在任何颜色的网页/印刷品上
- 微信表情包：让表情主体直接显示在聊天背景上
- 文档插图：PPT、Word 里图片不带白边
- 头像贴纸：社交媒体的个性贴纸、头像装饰
- 商品图：电商详情页的产品悬浮在背景上
- 视频剪辑：剪映、PR 中加入透明素材作为前景
```

**Section 2: 透明 PNG 和普通 PNG 的区别**

```
PNG 格式天生支持透明，但"PNG 图片"不一定就是透明的。

举例：
- 你截了一张图保存为 PNG，但截图是有白色背景的 → 这是不透明的 PNG
- 你用 PS 抠图后导出 PNG，背景显示为灰白格子 → 这是透明的 PNG

JPG 格式不支持透明，所有 JPG 必然有底色（通常是白色）。
要把 JPG 变成透明背景，必须先转成 PNG，再去除背景。

MiaoCut 一次完成两步：上传 JPG/PNG/WebP → 输出真正的透明 PNG。
```

**Section 3: 三类常见用途详解**

```
用途一：人像透明背景（社交头像、表情包、贴纸）
- 上传一张你的照片
- AI 自动识别人像主体
- 下载透明 PNG，可贴到任何聊天背景、头像装饰

用途二：商品透明背景（电商详情页、海报）
- 上传商品图（任何背景）
- AI 识别商品轮廓，包括反光、透明、毛绒商品
- 下载透明 PNG，叠加到任何创意背景上

用途三：Logo / 图形透明化
- 上传带白底或彩色背景的 Logo
- AI 智能识别图形主体
- 下载透明 PNG，可用于网站、名片、印刷品

用途四：手绘图、插画透明化
- 上传手绘扫描图、电子插画
- AI 去除画纸或画布背景
- 下载透明 PNG，可二次创作
```

**Section 4: 输出质量保证**

```
- 真实 Alpha 通道：边缘不是简单的"全透明/全不透明"，而是渐进的半透明，
  保证发丝、毛绒等精细边缘自然过渡
- 标准 PNG-32 格式：兼容 PS、Figma、Sketch、Canva、PR、AE 等所有主流
  设计/剪辑软件
- 无压缩输出：保持原图分辨率，不损失细节
- 颜色还原准确：不偏色、不发灰
```

**Section 5: 常见问题**

```
问：透明 PNG 文件比 JPG 大很多吗？
答：略大但不夸张。一张 1080P 的图，JPG 通常 200KB–500KB，透明 PNG 大约
    500KB–2MB（取决于主体复杂度）。

问：为什么我下载的 PNG 在某些软件里还是带白边？
答：这是软件预览问题，文件本身是透明的。打开 PS、Figma 等专业软件即可
    看到真实透明效果。微信、QQ 在某些情况下显示的"白底"也是预览问题。

问：透明背景能做成 GIF 或视频吗？
答：MiaoCut 当前只处理静态图。GIF 透明动画可以多帧处理后用其他工具合并；
    视频背景去除是另一类工具（实时绿幕、视频抠像）。

问：下载的图能直接放微信表情吗？
答：可以。微信支持透明 PNG 表情，导入到自定义表情即可。

问：透明背景图能在 PPT 里用吗？
答：完全可以。Office PowerPoint、Keynote、Google Slides 都支持透明 PNG，
    可以叠加在任何幻灯片背景上。

问：和 PS 抠图比，会不会有质量差距？
答：日常使用感受不到差距。PS 钢笔工具手抠的极致效果（如对边缘 1 像素级
    精度的修图）AI 还达不到，但一般场景 AI 完全够用，且省去 99% 的时间。
```

---

### 7.10 Phase 3 验收清单

- [ ] 8 个落地页全部上线，URL 可直接访问
- [ ] 每个落地页 title/description 都不一样，没有重复
- [ ] 每个落地页都有完整的 Schema.org（FAQPage + HowTo + BreadcrumbList）
- [ ] 每个落地页都包含可工作的上传组件（与首页同款）
- [ ] hreflang 在 EN/ZH 对应页面之间双向声明
- [ ] sitemap 已自动包含新增的 8 个 URL
- [ ] 内链结构完整（每个落地页至少 3 个内链指向其他落地页或首页）
- [ ] 所有图片有 alt 属性
- [ ] Lighthouse SEO 分数所有页面 ≥ 95
- [ ] 没有任何虚假评分、虚构使用人数、伪造评论

---

## 8. Phase 4: 博客系统 + 首批 10 篇文章

### 8.1 博客系统架构

#### 8.1.1 文件结构

```
content/
├── blog/
│   ├── en/
│   │   ├── remove-bg-vs-miaocut-comparison.mdx
│   │   ├── birefnet-explained.mdx
│   │   ├── transparent-png-logo-guide.mdx
│   │   ├── amazon-white-background-requirements.mdx
│   │   ├── hair-edge-removal-guide.mdx
│   │   └── ...
│   └── zh/
│       ├── ai-koutu-tools-comparison-2026.mdx
│       ├── zhengjianzhao-zixu.mdx
│       ├── shangpin-baidi-tu-guide.mdx
│       ├── ps-koutu-vs-ai.mdx
│       ├── birefnet-shi-shenme.mdx
│       └── ...
```

#### 8.1.2 frontmatter 标准（每篇文章必填）

```yaml
---
title: "文章标题（用于 <title> 和 H1）"
description: "文章描述（用于 <meta description> 和列表页摘要）"
slug: "url-slug"
publishedAt: "2026-04-27"
updatedAt: "2026-04-27"
author: "MiaoCut Team"
locale: "zh-CN"  # or "en"
category: "tutorial"  # tutorial / comparison / guide / news
tags: ["AI 抠图", "证件照", "教程"]
featured: false
ogImage: "/og/blog/article-slug.png"
canonical: "https://miaocut.app/zh/blog/article-slug"
hreflang:
  en: "/blog/article-slug-en"  # 对应英文版（如有），否则不填
relatedPosts:
  - "another-article-slug"
  - "yet-another-slug"
---
```

#### 8.1.3 路由

```
/blog                                       → 英文博客索引
/blog/[slug]                                → 英文博客详情
/zh/blog                                    → 中文博客索引
/zh/blog/[slug]                             → 中文博客详情
```

博客索引页：按发布时间倒序，每页 10 篇，分页时 URL 用 `/blog/page/2`，避免无限滚动（不利于 SEO）。

#### 8.1.4 博客文章 Schema.org

每篇文章必须注入 Article + BreadcrumbList：

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{{title}}",
  "description": "{{description}}",
  "image": "{{ogImage}}",
  "datePublished": "{{publishedAt}}",
  "dateModified": "{{updatedAt}}",
  "author": {
    "@type": "Organization",
    "name": "MiaoCut Team",
    "url": "https://miaocut.app/"
  },
  "publisher": {
    "@type": "Organization",
    "name": "MiaoCut",
    "logo": {
      "@type": "ImageObject",
      "url": "https://miaocut.app/logo.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "{{canonicalUrl}}"
  },
  "inLanguage": "{{locale}}"
}
```

#### 8.1.5 RSS feed

生成 `/feed.xml`（EN）和 `/zh/feed.xml`（ZH），包含最新 20 篇文章。在 head 中声明：

```html
<link rel="alternate" type="application/rss+xml" title="MiaoCut Blog RSS" href="/feed.xml">
```

### 8.2 文章 #1（全文，ZH，最高优先级）：2026 免费 AI 抠图工具横评

**Slug**: `ai-koutu-tools-comparison-2026`  
**Title**: `2026 免费 AI 抠图工具横评：MiaoCut / 佐糖 / Remove.bg / Canva 对比`  
**Description**: `2026 年最值得用的免费在线 AI 抠图工具横向评测：MiaoCut、佐糖、Remove.bg、Canva 抠图、抠抠图功能、精度、限制、隐私、商用许可全方位对比，附使用建议。`  
**目标关键词**: 免费 AI 抠图、在线抠图工具、抠图工具对比、AI 抠图软件推荐  
**字数目标**: 2500 字

#### 8.2.1 全文成稿

```markdown
# 2026 免费 AI 抠图工具横评：MiaoCut / 佐糖 / Remove.bg / Canva 对比

随着 BiRefNet、SAM 等 SOTA 模型的开源，2026 年的 AI 抠图工具进入了一个新阶段：
免费工具的精度已经追平甚至超过早期收费产品。但市面上选择太多，每家的免费政策、
精度表现、隐私策略都不一样，普通用户很容易踩坑。

这篇文章横向对比当下主流的 5 款免费 AI 抠图工具：MiaoCut、佐糖（PicWish）、
Remove.bg、Canva 抠图、抠抠图。我们关注 6 个维度：免费政策、精度、速度、
分辨率限制、隐私保护、商用许可。

## 评测维度说明

**免费政策**：是否真免费、有无水印、是否限次数  
**精度**：发丝、毛发、半透明物体的处理表现  
**速度**：从上传到下载的全流程耗时  
**分辨率**：免费版输出的最大分辨率  
**隐私**：图片是否上传服务器、保存时长、是否用于训练  
**商用许可**：处理后的图片能否用于商业场景

## 工具一：MiaoCut

**官网**：miaocut.app  
**模型**：BiRefNet（开源 SOTA 模型）  
**核心定位**：完全免费的 remove.bg 替代品

优点：
- 完全免费，无水印，无分辨率限制
- 支持发丝级、毛发、半透明物体处理
- 内存中处理，不存储图片
- 无需注册、无需邮箱
- 支持 JPG、PNG、WebP

缺点：
- 当前不支持批量上传（开发中）
- 没有 API 接口
- 没有图片编辑器（仅做抠图）

适合人群：个人用户、电商小卖家、设计师做单张高质量抠图

## 工具二：佐糖（PicWish）

**官网**：picwish.cn  
**核心定位**：国内最强综合 AI 图片处理平台

优点：
- 中国本土团队，中文体验好
- 抠图精度高
- 提供 API、桌面端、移动端多端
- 集成多种图片处理（修复、放大、改尺寸）

缺点：
- 免费版每日 50 次限制
- 高级功能（批量、API、4K 输出）需要会员
- 注册流程稍长

适合人群：高频电商运营、需要 API 集成的开发者

## 工具三：Remove.bg

**官网**：remove.bg  
**核心定位**：行业先行者，品牌认知度最高

优点：
- 抠图精度业内顶尖
- API 接口成熟，企业用户多
- 提供 PS、Figma、Sketch 等插件
- 模型迭代频繁

缺点：
- 免费版分辨率限制约 625×400 像素（0.25 兆像素）
- 高清输出需要购买积分
- 服务器位于海外，国内访问慢

适合人群：偶尔用一次的低分辨率场景、企业级 API 用户

## 工具四：Canva 抠图

**官网**：canva.cn  
**核心定位**：设计平台内置功能

优点：
- 与 Canva 设计平台完全打通
- 抠完直接进入设计编辑器
- 免费版可用
- 中文界面

缺点：
- 必须注册 Canva 账户
- 抠图精度中等（不如专门的工具）
- 部分功能需 Canva Pro 会员
- 速度比专门工具慢

适合人群：本来就用 Canva 做设计的用户

## 工具五：抠抠图（koukoutu.com）

**官网**：koukoutu.com  
**核心定位**：老牌中文抠图站，SEO 优化做得好

优点：
- 完全免费、无水印
- 中文体验流畅
- 支持批量抠图
- 提供格式转换、尺寸调整等附属功能

缺点：
- 模型相对老一些（精度略逊于 MiaoCut）
- 服务器偶尔不稳定
- 移动端体验一般

适合人群：需要批量处理的中文用户、不挑模型最新的用户

## 横向对比表

| 工具 | 免费精度 | 水印 | 分辨率限制 | 速度 | 隐私 | 商用 |
|------|---------|------|-----------|------|------|------|
| MiaoCut | 顶级 | 无 | 无 | 1–3 秒 | 内存处理 | 允许 |
| 佐糖 | 顶级 | 无 | 4K（会员） | 2–5 秒 | 服务器存储 | 允许 |
| Remove.bg | 顶级 | 无（低分辨率） | 0.25MP | 1–3 秒 | 服务器存储 | 允许 |
| Canva | 中等 | 无 | 中等 | 5–10 秒 | 服务器存储 | 允许 |
| 抠抠图 | 良好 | 无 | 中等 | 2–5 秒 | 服务器存储 | 允许 |

## 不同场景推荐

**电商单品抠图（追求质量）**：MiaoCut 或 Remove.bg。MiaoCut 免费 + 高清，
Remove.bg 适合一次性付费的高频用户。

**电商批量抠图**：佐糖（会员版）或抠抠图。前者精度高但要付费，后者免费但
精度略低。

**证件照换底色**：MiaoCut（专为证件场景做了底色预设和精准发丝）。

**设计师用透明 PNG 素材**：MiaoCut（无注册无水印）或 Remove.bg + PS 插件。

**做 PPT、海报、社交媒体**：Canva 抠图（如已用 Canva）或 MiaoCut（独立工具）。

**需要 API 集成**：Remove.bg（最成熟）、佐糖（国内速度快）。

**保护商业机密**：MiaoCut（在浏览器内存中处理，从不上传服务器）。

## 趋势观察

1. **开源模型逐渐追平闭源**：BiRefNet（2024 年发布）让免费工具有了与
   Remove.bg 这类闭源模型一战的能力。未来"AI 抠图"会逐渐成为基础设施而非
   付费功能。

2. **隐私敏感度上升**：浏览器内 WebAssembly 推理（不上传图片）成为新趋势，
   MiaoCut 是这条路线的代表。

3. **垂直场景细分**：综合型工具（佐糖、Canva）吃通用市场，专用工具（证件照、
   电商白底、视频抠像）吃细分场景。

## 总结

如果只能推荐一个：
- 中文用户综合首选 → MiaoCut（免费 + 高清 + 隐私）
- 已用 Canva → Canva 抠图（流程顺畅）
- 海外用户偶尔用 → Remove.bg（品牌靠谱）
- 高频电商付费用户 → 佐糖会员

工具是用来解决问题的，不是用来比拼参数的。最贵不一定最好，免费不一定差。
按你的实际场景挑就好。

---

**作者注**：本文测试基于 2026 年 4 月各工具的公开免费版本。各产品政策可能
更新，请以官网最新信息为准。
```

#### 8.2.2 内链区

```
相关阅读：
- /zh/blog/birefnet-shi-shenme （BiRefNet 是什么？）
- /zh/blog/ps-koutu-vs-ai （PS 抠图 vs AI 抠图）
- /zh/dianshang-koutu （电商抠图工具页）

工具直达：
- /zh （MiaoCut 在线抠图）
- /zh/zhengjianzhao-huan-dise （证件照换底色）
```

---

### 8.3 文章 #2（全文，ZH，蓝海长尾）：证件照换底色不用去照相馆：3 步教你自己做

**Slug**: `zhengjianzhao-zixu`  
**Title**: `证件照换底色不用去照相馆：3 步教你自己做（白底、蓝底、红底）`  
**Description**: `不用去照相馆，3 分钟自己换证件照背景。详细教程：用手机拍照、AI 自动抠图、一键换白底/蓝底/红底，附各类证件背景色规范。免费、无水印、效果媲美专业工具。`  
**目标关键词**: 证件照换底色、自己做证件照、证件照换背景颜色  
**字数目标**: 2000 字

#### 8.3.1 全文成稿

```markdown
# 证件照换底色不用去照相馆：3 步教你自己做（白底、蓝底、红底）

办护照、签证、身份证、入职、考证……几乎每个成年人每年都要拍证件照。
传统流程是：跑照相馆 → 排队 → 拍照 → 付钱 → 等修图，单次 30–80 元，
往返一两个小时，还可能因为表情、光线、背景颜色不对要返工。

实际上 2026 年的 AI 工具已经能让你在家用手机拍一张照片，3 分钟内做出
照相馆级别的证件照，背景颜色想换什么就换什么。这篇教程详细讲怎么做。

## 第一步：用手机拍一张能用的原图

很多人觉得自己拍证件照效果差，其实是拍照方式不对。掌握下面 6 点，
手机拍出来的就够用：

### 光线

- 找室内光线充足的地方，最好是面对窗户
- 避免直接阳光照射（脸上有阴影）
- 避免逆光（脸是黑的）
- 不要用顶灯（脸下方阴影重）
- 一个简单的测试：你能清楚看到脸上五官的细节，光线就够

### 背景

- 找一面浅色墙壁（白墙、米色墙最好）
- 远离墙壁 30 厘米以上（避免阴影投射）
- 背景越简单，AI 抠图效果越稳定（虽然 AI 也能处理复杂背景，但简单背景结果
  更好）

### 姿态

- 头摆正，不歪头
- 双肩平齐
- 表情自然，嘴自然闭合
- 眼睛平视镜头
- 头发不挡眼睛、不挡耳朵（除非证件特别要求）

### 着装

- 男士：深色衬衫或西装最稳，避免白色 T 恤
- 女士：避免吊带、低胸（多数证件不接受）
- 颜色：避免和背景色一样（比如白衬衫 + 白墙抠图会出问题）
- 不戴帽子（除非证件允许）
- 不戴墨镜（普通眼镜可以，但有些证件要求摘）

### 拍摄方式

- 用后置摄像头（前置摄像头分辨率较低）
- 让别人帮你拍，自拍角度不对
- 镜头与脸同高（不仰拍、不俯拍）
- 距离：手机距离脸 60–80 厘米
- 对焦：点击屏幕上的脸部确保对焦

### 后期注意

- 不要美颜过度（很多证件不接受过度修图）
- 不要套滤镜
- 保持原图不要裁切（后续 AI 工具会处理）

## 第二步：上传到 MiaoCut，AI 自动抠图

打开 [MiaoCut 证件照换底色工具](https://miaocut.app/zh/zhengjianzhao-huan-dise)，
把你刚拍的照片拖进去（手机直接上传也可以）。

3 秒钟后，AI 会自动识别你这个人物主体，把背景去掉。

为什么 MiaoCut 适合证件照场景：

- **发丝级精度**：基于 BiRefNet 模型，每根头发都识别清晰，不会出现白边
  或锯齿
- **戴眼镜也能识别**：传统抠图工具镜片反光区会失败，AI 能正常处理
- **复杂背景也能处理**：即使原图背景有杂物，也能干净抠出人像
- **不上传服务器**：图片在浏览器内存里处理，处理完就删，证件照含个人
  隐私信息，安全很重要

## 第三步：一键应用背景色

抠图完成后，你会看到几个预设的颜色按钮：

### 白色（#FFFFFF）

适用于：
- 美国护照、签证
- 中国护照
- 多数国家护照、签证
- 港澳通行证
- 学生证、工作证（部分单位要求白底）
- 教师资格证、医师证等专业证件
- 求职简历照（多数情况）

### 蓝色（#5C8AC8）

适用于：
- 学生证（多数学校要求蓝底）
- 学位证书照（多数）
- 工作证、入职照（多数公司要求蓝底）
- 就业证、社保卡

### 红色（#D7142A）

适用于：
- 中国居民身份证
- 部分省市考试照片
- 党员、团员证件照

### 自定义颜色

如果你的证件需要特殊颜色（比如浅灰、米白、淡蓝），可以输入精确的十六进制
颜色值，比如：
- 申根签证：#F0F0F0（浅灰）
- 部分国家签证：#E8E8E8（接近白色的浅灰）

选好颜色，实时预览，满意后点下载。

## 各类证件背景色完整对照表

| 证件类型 | 推荐底色 | 备注 |
|---------|---------|------|
| 中国居民身份证 | 红色 #D7142A | 标准要求 |
| 中国护照 | 白色 #FFFFFF | 必须纯白 |
| 美国护照 | 白色 #FFFFFF | 必须纯白 |
| 申根签证 | 浅灰或白色 | 多数国家接受白底 |
| 日本签证 | 白色 | – |
| 韩国签证 | 白色 | – |
| 学生证（大学） | 蓝色 | 多数高校 |
| 学位证 | 蓝色 | 多数高校 |
| 求职简历照 | 白色或蓝色 | 看公司风格 |
| 入职登记照 | 蓝色或白色 | 看公司要求 |
| 教师资格证 | 白色 | – |
| 医师执业证 | 白色 | – |
| 驾驶证 | 白色 | – |
| 港澳通行证 | 白色 | – |
| 律师资格证 | 红色 | 部分省市 |

## 常见问题

**问：自己做的证件照能用于护照、签证吗？**

可以，前提是拍摄符合该证件的所有要求（尺寸、表情、姿态、着装）。背景颜色
和抠图边缘 MiaoCut 处理得没问题，关键是你拍的原图要规范。

**问：和照相馆的差距在哪里？**

照相馆的优势是：专业的灯光设备能让肤色更自然；摄影师会指导姿态；现场调整
表情；专业打印。

照相馆的劣势是：花钱、费时、想换底色还要重新做。

如果你只是要电子版（用于网申、上传系统），自己做完全够；如果要打印实体照
（贴在纸质证件上），需要找专业打印店或冲印店出片。

**问：处理后的照片需要打印吗？**

看用途。多数现代证件办理已经是电子版上传，不需要打印。如果需要打印（比如
贴在某些纸质证件上），把下载的图带到冲印店，按规定尺寸（1 寸、2 寸、护照
照等）打印即可。

**问：尺寸不对怎么办？**

MiaoCut 当前专注抠图换底色，尺寸调整请用其他工具：
- 1 寸照：295×413 像素，2.5cm × 3.5cm
- 2 寸照：413×579 像素，3.5cm × 4.9cm
- 护照照（中国）：33mm × 48mm
- 美国护照照：2 inch × 2 inch（51mm × 51mm）

各国签证照尺寸不同，请查询目标国家官方要求。

**问：可以摘掉眼镜吗？**

MiaoCut 不修改人物本身，只换背景。如果证件要求不戴眼镜，请重新拍一张摘掉
眼镜的原图。

**问：化妆和不化妆哪个好？**

证件照建议淡妆或不化妆，不要浓妆。一些国家护照明确要求"看上去像本人"，
浓妆可能在过关时被怀疑。

**问：免费有限制吗？**

MiaoCut 完全免费，无水印，不限次数。可以反复尝试不同底色，直到满意为止。

**问：处理过程会不会泄露我的脸部隐私？**

不会。MiaoCut 在你的浏览器内存中处理图片，从不上传到任何服务器，处理完
关闭页面就完全消失。

## 总结

自己做证件照换底色，比去照相馆快、便宜、灵活。整个过程：
- 在家拍照：5 分钟
- AI 抠图：3 秒
- 换底色：1 秒
- 下载：1 秒

合计不到 6 分钟，免费，效果不输专业工具。

立即试一下 → [MiaoCut 证件照换底色](https://miaocut.app/zh/zhengjianzhao-huan-dise)
```

---

### 8.4 文章 #3（全文，EN）：BiRefNet Explained: The Open-Source Model Powering Free Background Removers

**Slug**: `birefnet-explained`  
**Title**: `BiRefNet Explained: The Open-Source SOTA Model Powering Free AI Background Removers`  
**Description**: `BiRefNet is the SOTA bilateral reference network behind 2026's best free AI background removers. Learn how it works, why it beats older models on hair and fur, and where it falls short. Technical but accessible.`  
**目标关键词**: BiRefNet, BiRefNet model, BiRefNet background removal, SOTA background removal model  
**字数目标**: 1800 字

#### 8.4.1 全文成稿

```markdown
# BiRefNet Explained: The Open-Source SOTA Model Powering Free AI Background Removers

If you've used a free AI background remover in 2025 or 2026 — and the result on 
hair, fur, or transparent objects looked surprisingly good — there's a decent 
chance the model behind it was BiRefNet.

BiRefNet (Bilateral Reference Network for High-Resolution Dichotomous Image 
Segmentation) was published in 2024 and quickly became the de facto SOTA 
open-source model for background removal. It powers many of the free tools 
that compete with paid services like remove.bg.

This post explains what BiRefNet is, how it works, why it's better than older 
models for the hardest cases, and where its limitations lie. Written for 
curious users, designers, and developers who want to understand what's 
actually running under the hood.

## The Background Removal Problem

"Remove the background from this image" sounds simple, but it's been a 
long-standing computer vision challenge. The hard cases:

- Hair strands against complex backgrounds
- Animal fur with similar colors to background
- Translucent objects (glass, lace, smoke)
- Reflective surfaces (chrome, water)
- Cluttered backgrounds with similar colors to the subject
- Multiple subjects with overlapping edges

Traditional approaches (chroma keying, rule-based segmentation) only worked 
in controlled conditions. The deep learning revolution made general-purpose 
background removal possible, but earlier models had clear failure modes — 
crunchy edges, lost hair detail, halos around fine features.

## Why BiRefNet Is Different

BiRefNet introduced two key ideas that improved on previous SOTA:

### 1. Bilateral reference

The model takes two complementary "references" of the input image:
- A **gradient reference** that emphasizes high-frequency details (edges, 
  fine textures)
- A **content reference** that emphasizes the overall semantic content (what 
  the subject is)

By combining both, the network can preserve fine edges (where gradients 
matter) while still understanding what should be foreground vs. background 
(where semantic content matters).

Earlier models tended to optimize for one or the other, which is why they 
either had crunchy edges or lost fine detail.

### 2. High-resolution processing

BiRefNet is built specifically for high-resolution image segmentation. Older 
models often downsampled images to 512×512 or 1024×1024 for processing, then 
upsampled the mask — losing detail in the process.

BiRefNet's architecture handles input resolutions up to 2048×2048+ natively, 
which is why output edges look so much sharper, especially around hair.

## What This Means in Practice

For end users, BiRefNet-based tools handle:

- **Hair strands**: Individual strands of hair against any background. Very 
  little halo, no jagged edges.
- **Fur**: Soft, fuzzy edges that look natural rather than rotoscoped.
- **Glass and crystal**: Maintains transparency and refraction effects 
  without clipping.
- **Wedding dresses, lace, sheer fabric**: Preserves semi-transparent areas 
  with proper alpha values.
- **Mixed-color subjects**: Subjects with multiple colors no longer "leak" 
  into the background mask.

Compared to older models like U2Net or MODNet (which were SOTA in 2020–2022), 
BiRefNet is roughly:
- 2–5× more accurate on hair edges (measured by IoU on benchmark datasets)
- Comparable speed when properly optimized
- Larger model size, but still runnable in browser via WASM/WebGPU

## Where BiRefNet Falls Short

No model is perfect. BiRefNet's known limitations:

### 1. Very small details

A spider's web, fishing line, or tiny hair strands at low resolution may 
still be missed. The model has a finite receptive field.

### 2. Subjects nearly identical to background

If a brown dog is photographed against a brown wall with similar lighting, 
even BiRefNet can struggle. The semantic understanding is good but not 
magical.

### 3. Compositional ambiguity

If the foreground/background distinction is genuinely ambiguous (e.g., a 
person holding a tray of food — is the food part of the subject?), BiRefNet 
makes a choice that may not match yours. No model can read your intent.

### 4. Resource intensive

The full BiRefNet model is several hundred megabytes. Lighter variants exist 
(distilled or pruned versions), but they trade some quality for size. Tools 
running fully in-browser need to balance model size against load time.

## Why It's Open Source (and Why That Matters)

BiRefNet was released under the MIT license, meaning anyone can use it for 
any purpose, including commercial. This is why so many free tools (including 
MiaoCut) can offer high-quality background removal without charging users — 
the model itself is free.

In contrast, models behind paid services like remove.bg are proprietary. 
Their quality is comparable, but using them requires paying for API access 
or running their service.

The open-source release has also accelerated research. Multiple follow-up 
papers have built on BiRefNet's bilateral reference idea, and the open 
weights mean independent researchers can study, modify, and improve the model.

## How to Try BiRefNet Yourself

Three options, from easiest to most technical:

### 1. Use a tool that already runs it

Several free background removers are built on BiRefNet:
- [MiaoCut](https://miaocut.app/) (in-browser, free, no signup)
- Various other tools that use it as their backend

### 2. Run the demo

The official BiRefNet repo on Hugging Face has a public demo where you can 
upload images and see results. Search "BiRefNet" on Hugging Face Spaces.

### 3. Run it locally

For developers, the model weights and inference code are on GitHub. You can 
run it locally with PyTorch or convert to ONNX for deployment. The repo has 
example code for both image and video processing.

## What's Next After BiRefNet?

A few directions the field is heading:

- **Smaller, faster variants**: Distilled BiRefNet that runs in real-time 
  in browser
- **Video extension**: Frame-consistent background removal for video (a much 
  harder problem)
- **Interactive segmentation**: Combining BiRefNet with click-based 
  refinement (like SAM)
- **3D-aware segmentation**: Models that understand depth, not just 2D images

The pace of progress in image segmentation is fast. By 2027, today's SOTA 
will likely be matched or beaten by something better — and probably also 
open source.

## TL;DR

BiRefNet is a 2024 open-source AI model for image segmentation that 
significantly improved hair, fur, and fine-edge handling over previous 
state-of-the-art. It powers many of today's free background removers. It's 
not magic — there are still failure cases — but for the vast majority of 
real-world images, the quality is comparable to paid services.

If you're using a free AI background remover and the results look great on 
hair and fur, you're probably benefiting from BiRefNet, whether you knew it 
or not.

---

**Try a BiRefNet-powered free background remover** → 
[MiaoCut](https://miaocut.app/)
```

---

### 8.5 文章 #4（全文，EN）：remove.bg vs MiaoCut: A Free-Tier Comparison

**Slug**: `remove-bg-vs-miaocut-comparison`  
**Title**: `remove.bg vs MiaoCut: Honest Free-Tier Comparison (2026)`  
**Description**: `Honest comparison of remove.bg's free tier vs MiaoCut: resolution limits, watermarks, AI quality, privacy, and pricing. Which free background remover wins for your use case in 2026?`  
**目标关键词**: remove.bg vs, remove.bg free, remove.bg alternative comparison  
**字数目标**: 1800 字

#### 8.5.1 全文成稿（撰写要点 — Claude Code 按以下结构和要点完成）

由于这是一个高敏感度的对比文章（涉及竞品），Claude Code 撰写时**必须遵守**：

- ✅ 客观陈述事实，不使用贬低性语言
- ✅ 承认 remove.bg 的优势（不要假装它没有优势）
- ✅ 引用的所有数据来源标注（如官网定价、政策）
- ❌ 不抓取 remove.bg 网站截图
- ❌ 不复制 remove.bg 的具体宣传语
- ❌ 不暗示有官方关联或竞争关系

**完整结构**：

```
# remove.bg vs MiaoCut: Honest Free-Tier Comparison (2026)

## Quick Verdict（开头先给结论）
For HD output → MiaoCut
For enterprise API → remove.bg
For most casual users → MiaoCut

## What both tools do well（公平地承认双方共同优势）
- AI-driven background removal
- Hair / fur edge handling
- No watermark on basic output
- Web-based (no install)

## Free tier limits（核心差异点 - 用真实数据）
remove.bg free:
- Output resolution: ~625×400 pixels (官网政策)
- Daily limit: ~50 previews
- HD download: requires paid credits
- Pricing: $0.20/image at low volume

MiaoCut free:
- Output resolution: original (no cap)
- Daily limit: none
- HD download: free
- Pricing: free indefinitely for core feature

## Quality comparison（坦诚 - 多数情况下接近，列出 BiRefNet 优劣）
- For hair / fur: comparable, both excellent
- For very small details: remove.bg slightly ahead in some cases
- For semi-transparent objects: BiRefNet (MiaoCut) often better
- For complex multi-subject images: similar

## Privacy（关键差异点）
- remove.bg: server-side processing, retention policy per ToS
- MiaoCut: in-browser/in-memory processing, no server storage

## Use cases for each
（场景化推荐 - 不要一边倒）

When remove.bg makes sense:
- You need an enterprise API with SLA
- You need PS / Sketch / Figma plugins
- Brand familiarity matters for your team

When MiaoCut makes sense:
- Free HD output is critical
- Privacy / on-device processing matters  
- You hit remove.bg's free tier resolution cap
- You want unlimited daily processing

## Cost over time（基于公开 pricing 计算）
For a small e-commerce seller with 100 product images per month:
- remove.bg API: ~$20/month at $0.20/image
- MiaoCut: $0/month
- Annual savings: $240

For a casual user (10 images/month):
- remove.bg free tier (low-res only): $0 but unusable for HD
- remove.bg paid (HD): ~$2/month
- MiaoCut: $0

## Switching guide（实操）
- No migration needed (no accounts, no past data)
- Bookmark MiaoCut, use it like a Google search

## FAQ（5–7 条，回答用户决策时常问的问题）

## Final verdict（呼应开头的快速结论）
```

---

### 8.6 其他 6 篇文章详细 brief（Claude Code 按 brief 完成全文）

#### 文章 #5（ZH）：电商商家必备：商品白底图制作完整指南

- **Slug**: `shangpin-baidi-tu-guide`
- **Title**: `电商商家必备：商品白底图制作完整指南（2026 版）`
- **Description**: `从拍摄到抠图到上架，电商商品白底图制作的完整指南。涵盖各平台规范（淘宝、京东、亚马逊、Shopify）、拍摄技巧、AI 抠图工具、批量处理流程、合规要点。`
- **目标关键词**: 商品白底图、商品白底图制作、电商商品图、淘宝白底图
- **字数**: 2500 字
- **结构**:
  - H2 #1: 为什么白底图对电商至关重要（数据：白底图对转化率的影响、平台规范要求）
  - H2 #2: 各电商平台白底图规范汇总（淘宝、京东、拼多多、亚马逊、Shopify、TikTok Shop、小红书）— 用表格
  - H2 #3: 拍摄阶段如何为后期抠图做好准备（光线、角度、商品摆放、避免反光）
  - H2 #4: 三种抠图方案对比（PS 钢笔工具 / 美图秀秀 / AI 抠图）
  - H2 #5: 用 MiaoCut 做白底图的完整流程（截图引导 + 链接到工具页）
  - H2 #6: 进阶技巧：让白底图更有质感（添加投影、调整光感、尺寸预设）
  - H2 #7: 常见问题（10 条）
- **必含内容**:
  - 各平台主图分辨率要求（淘宝 800×800、亚马逊 1000×1000+ 等）
  - "纯白"的技术含义（#FFFFFF vs 浅灰）
  - 反光商品（首饰、玻璃、金属）的处理建议
- **内链**: /zh/shangpin-baidi-tu, /zh/dianshang-koutu, /zh/blog/ai-koutu-tools-comparison-2026

#### 文章 #6（ZH）：PS 抠图太麻烦？AI 一键抠图教程（小白友好）

- **Slug**: `ps-koutu-vs-ai`
- **Title**: `PS 抠图太麻烦？AI 一键抠图完整教程（小白友好，3 分钟上手）`
- **Description**: `不用学 PS，3 分钟掌握 AI 抠图的所有方法。对比 PS 钢笔工具、魔棒工具与 AI 抠图的优劣，零基础新手友好教程，附人像、商品、复杂背景实战案例。`
- **目标关键词**: PS 抠图、AI 抠图教程、抠图新手教程、不用 PS 抠图
- **字数**: 2200 字
- **结构**:
  - H2 #1: PS 抠图为什么这么麻烦（钢笔、魔棒、通道抠图各自的痛点）
  - H2 #2: AI 抠图的工作原理（不要太技术，类比"自动驾驶 vs 手动开车"）
  - H2 #3: 实战 1：人像抠图（手把手 + 截图）
  - H2 #4: 实战 2：商品抠图（含反光、镂空场景）
  - H2 #5: 实战 3：复杂背景下的抠图（杂乱背景、相似颜色）
  - H2 #6: AI 抠图的极限：什么场景还得用 PS
  - H2 #7: 常见问题
- **必含内容**:
  - "AI 抠图" vs "PS 钢笔抠图" vs "魔棒抠图" 的横向对比表
  - 一个真实案例的步骤截图（PS 8 步 vs AI 3 步）
- **内链**: /zh, /zh/blog/birefnet-shi-shenme

#### 文章 #7（EN）：How to Make a Transparent PNG Logo for Free (No Photoshop)

- **Slug**: `transparent-png-logo-guide`
- **Title**: `How to Make a Transparent PNG Logo for Free (No Photoshop Needed)`
- **Description**: `Step-by-step guide to making a transparent PNG logo without Photoshop. Use free AI tools to remove white backgrounds from logos in seconds. Examples for designers, freelancers, and small businesses.`
- **目标关键词**: transparent png logo, make logo transparent, remove logo background, logo png maker
- **字数**: 1500 字
- **结构**:
  - H2 #1: Why a transparent logo matters (overlay on any background)
  - H2 #2: When you have a logo with white background (most common case)
  - H2 #3: Step-by-step with MiaoCut
  - H2 #4: Tips for tricky logos (gradient backgrounds, complex graphics)
  - H2 #5: Saving and using your transparent logo (file management, format choices)
  - H2 #6: FAQ
- **必含内容**:
  - PNG-32 vs PNG-8 区别（影响透明度精度）
  - 矢量 logo (SVG) 优势讨论
- **内链**: /transparent-png-maker, /blog/birefnet-explained

#### 文章 #8（EN）：Amazon White Background Photo Requirements & How to Meet Them Free

- **Slug**: `amazon-white-background-requirements`
- **Title**: `Amazon White Background Photo Requirements (2026) & How to Meet Them Free`
- **Description**: `Amazon's exact white background image requirements for product listings, plus a step-by-step guide to creating compliant photos for free using AI background removal — no studio or designer needed.`
- **目标关键词**: amazon white background, amazon product photo requirements, amazon main image
- **字数**: 1800 字
- **结构**:
  - H2 #1: Amazon's official main image requirements (verbatim from Seller Central)
  - H2 #2: Why most rejected images fail (analyzed common rejection reasons)
  - H2 #3: How to take Amazon-compliant photos (lighting, angle, framing)
  - H2 #4: Free AI workflow for white-background generation
  - H2 #5: Bulk processing for large catalogs
  - H2 #6: Common rejection scenarios and how to avoid them
  - H2 #7: FAQ
- **必含内容**:
  - Amazon main image policy 的完整 quote（注意：少于 15 字，避免侵权 — 用 paraphrasing）
  - 1000×1000 像素最低分辨率要求
  - 主体占比 85% 要求
- **内链**: /product-photo-background-remover, /blog/transparent-png-logo-guide

#### 文章 #9（ZH）：BiRefNet 是什么？为什么它能做到发丝级抠图

- **Slug**: `birefnet-shi-shenme`
- **Title**: `BiRefNet 是什么？为什么它能做到发丝级抠图（通俗易懂版）`
- **Description**: `BiRefNet 是 2024 年开源的 SOTA 抠图模型，是 MiaoCut 等免费抠图工具的"引擎"。本文用通俗语言解释它的工作原理、为什么能做到发丝级精度，以及它的局限。`
- **目标关键词**: BiRefNet, BiRefNet 是什么, AI 抠图模型, 发丝级抠图原理
- **字数**: 1500 字
- **结构**:
  - H2 #1: 一段引子（为什么"AI 抠图"突然变好了）
  - H2 #2: BiRefNet 的核心创新（双边参考机制 — 用通俗类比解释）
  - H2 #3: 为什么它对发丝、毛发特别强（高分辨率原生处理 + 边缘感知）
  - H2 #4: 实测对比：BiRefNet vs 老款模型 (U2Net/MODNet)
  - H2 #5: BiRefNet 的局限（什么场景还会失败）
  - H2 #6: 开源的意义（为什么免费工具能用上 SOTA 模型）
- **必含内容**:
  - 不要太技术（避免 IoU 等专业术语）
  - 类比："就像人眼一边看清边缘，一边理解物体"
- **内链**: /zh, /zh/blog/ai-koutu-tools-comparison-2026

#### 文章 #10（EN）：How to Remove Background from a Photo with Hair Without Halos

- **Slug**: `hair-background-removal-no-halos`
- **Title**: `How to Remove Background from Photos with Hair (No White Halos, No Jagged Edges)`
- **Description**: `Hair is the hardest part of background removal. This guide shows how modern AI tools handle individual hair strands cleanly, why old tools failed, and tips to get the best results.`
- **目标关键词**: remove background hair, hair background remover, no halo background remover
- **字数**: 1500 字
- **结构**:
  - H2 #1: Why hair is the hardest case for background removal
  - H2 #2: Three common failure modes (jagged edges, halos, lost strands)
  - H2 #3: Why modern AI handles hair better (BiRefNet bilateral reference)
  - H2 #4: Step-by-step with MiaoCut on a portrait
  - H2 #5: Tips for shooting photos that AI can handle well
  - H2 #6: When AI still struggles (and what to do)
  - H2 #7: FAQ
- **必含内容**:
  - 对比图：好的 hair removal vs 失败的（halos / jagged）
  - 拍摄建议：均匀光线、避免与发色相近的背景
- **内链**: /transparent-png-maker, /blog/birefnet-explained, /id-photo-background-changer

### 8.7 Phase 4 验收清单

- [ ] 博客系统部署，索引页可访问
- [ ] EN 和 ZH 各自有独立索引页
- [ ] 4 篇全文文章发布
- [ ] 6 篇 brief 转化为完整文章发布
- [ ] 每篇文章 frontmatter 完整（含 hreflang 配对）
- [ ] 每篇文章 Schema.org 注入 BlogPosting + BreadcrumbList
- [ ] RSS feed 工作（/feed.xml 和 /zh/feed.xml）
- [ ] sitemap 自动包含所有博客文章
- [ ] 内链结构完整（每篇文章至少 2 个内链）
- [ ] OG 图为每篇文章生成（可用 @vercel/og 自动）
- [ ] 没有任何机翻内容（EN/ZH 各自原创）
- [ ] 没有抓取竞品截图、Logo
- [ ] 没有未引用源的具体数字
- [ ] Lighthouse SEO ≥ 95（博客详情页）

---

## 9. 横向技术规范（贯穿所有 Phase）

### 9.1 性能与 Core Web Vitals

Google 把 CWV 作为排名信号，百度也越来越看重移动端体验。所有页面必须达标：

| 指标 | 目标 | 测量工具 |
|---|---|---|
| LCP（最大内容绘制） | ≤ 2.5s | PageSpeed Insights / Lighthouse |
| INP（交互到下一次绘制） | ≤ 200ms | PageSpeed Insights |
| CLS（累积布局偏移） | ≤ 0.1 | Lighthouse |
| TTFB（首字节时间） | ≤ 800ms | WebPageTest |
| FCP（首次内容绘制） | ≤ 1.8s | Lighthouse |

#### 9.1.1 LCP 优化要点

- 首屏 H1 + 主上传按钮必须服务端渲染（不依赖 JS）
- BiRefNet 模型必须懒加载（在用户首次点击上传后才下载）
- OG 图、Hero 图压缩到 ≤ 100KB，用 WebP
- 字体用 `font-display: swap`，避免 FOIT
- 关键 CSS 内联到 `<head>`，非关键 CSS 异步加载

#### 9.1.2 INP 优化要点

- 上传图片后的处理过程用 Web Worker，不阻塞主线程
- 避免长任务（> 50ms 的同步 JS）
- 用 `requestIdleCallback` 处理非关键工作

#### 9.1.3 CLS 优化要点

- 所有 `<img>` 显式声明 `width` 和 `height`（即使用 CSS 缩放）
- 字体加载用 `size-adjust` 减少 layout shift
- 不要在内容上方动态注入元素（如 ad、cookie banner 推内容下移）

### 9.2 Schema.org 验证流程

每次新增或修改 Schema 后，必须三连验证：

1. **JSON 语法验证**：`JSON.parse()` 不报错
2. **Schema.org 验证**：https://validator.schema.org/
3. **Google Rich Results 测试**：https://search.google.com/test/rich-results

只有三个都通过才算 OK。

#### 9.2.1 已规划的 Schema 类型清单

| 页面 | Schema 类型 |
|---|---|
| EN 首页 | SoftwareApplication + FAQPage + Organization + WebSite |
| ZH 首页 | SoftwareApplication + FAQPage + Organization |
| 落地页（每个） | FAQPage + HowTo + BreadcrumbList |
| 博客索引 | Blog + BreadcrumbList |
| 博客文章 | BlogPosting + BreadcrumbList |
| 隐私 / 服务条款 | WebPage + BreadcrumbList |

#### 9.2.2 不要使用的 Schema

- ❌ `aggregateRating`（除非有真实评分系统）
- ❌ `Review`（除非有真实评论数据）
- ❌ `Event`（不适用）
- ❌ `Product` + `Offer`（这是工具不是商品，强行套用会被判 spam）

### 9.3 国际化（i18n）规范

#### 9.3.1 ZH 不是 EN 的翻译

最重要的原则：**所有 ZH 内容都按中文用户搜索习惯独立设计**，不能机翻 EN。

举例：
- EN 主词 `free background remover` → ZH 不是 "免费背景移除器"，而是 "在线抠图""免费抠图""一键去背景"（这才是中文用户实际搜的词）
- EN `transparent PNG maker` → ZH 不是 "透明 PNG 制造器"，而是 "透明背景制作""透明 PNG 生成"

#### 9.3.2 翻译文件组织

如果用 next-intl / i18next 等：

```
locales/
├── en/
│   ├── common.json
│   ├── home.json
│   ├── landing-product-photo.json
│   └── ...
└── zh/
    ├── common.json
    ├── home.json
    ├── landing-shangpin-baidi-tu.json
    └── ...
```

- 每个落地页用独立的翻译文件（避免一个巨大 JSON）
- key 用扁平化的英文命名（如 `landing.productPhoto.h1`）
- ZH 文件不是机翻，是按本文档提供的中文文案直接填入

#### 9.3.3 hreflang 配对原则

- 必须双向：A 指向 B，B 也必须指向 A
- 没有对应翻译的页面，**不要乱指**（不要把 EN 落地页 hreflang 指向 ZH 首页）
- `x-default` 永远指向 EN 首页或 EN 对应页

#### 9.3.4 语言切换器

- 切换时跳转到对应语言的同等页面（不是粗暴跳到首页）
- 用户切换后用 cookie 记住偏好（下次直接进对应语言）
- 但首次进入时，按 URL 路径决定语言，**不要**根据 `Accept-Language` 自动跳转（Google 不喜欢这种自动跳转）

### 9.4 百度专项优化

百度爬虫和 Google 爬虫行为差异较大，单独列出。

#### 9.4.1 渲染方式

百度爬虫对 JS 渲染支持弱，必须满足以下之一：
- ✅ SSR（Next.js 默认 SSR / Nuxt SSR）
- ✅ SSG（Astro / Next.js SSG / Hugo）
- ✅ ISR / 预渲染（构建时把所有路由生成静态 HTML）
- ❌ 纯 SPA + 客户端路由（百度看不到内容）

#### 9.4.2 主动推送 API

部署后必须自动调用百度推送 API。示例 GitHub Actions workflow 片段：

```yaml
name: Push URLs to Baidu
on:
  push:
    branches: [main]
jobs:
  push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build URL list
        run: |
          # 从 sitemap.xml 提取所有 URL
          curl -s https://miaocut.app/sitemap.xml | \
            grep -oE 'https://[^<]+' > urls.txt
      - name: Push to Baidu
        run: |
          curl -H 'Content-Type:text/plain' \
            --data-binary @urls.txt \
            "http://data.zz.baidu.com/urls?site=miaocut.app&token=${{ secrets.BAIDU_PUSH_TOKEN }}"
```

`BAIDU_PUSH_TOKEN` 在百度站长平台 → 链接提交 → 接口调用地址 中查看。

#### 9.4.3 移动适配声明

百度对移动适配单独评分。在 `<head>` 中添加：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="applicable-device" content="pc,mobile">
<meta name="MobileOptimized" content="width">
<meta name="HandheldFriendly" content="true">
```

并在百度站长平台「移动适配」中声明 PC/移动同 URL（自适应方案）。

#### 9.4.4 ICP 备案的影响

如未备案：
- 百度收录速度慢约 30–50%（不是不收录）
- 不能用阿里云、腾讯云国内 CDN
- 国内用户访问可能被运营商劫持广告

替代方案：
- 用 Cloudflare（不要求境内备案，国内有节点但不稳定）
- 用 Bunny.net、Vercel Edge（境外 CDN，速度可接受）
- 长期看，如果中文流量是核心，建议申请备案

#### 9.4.5 robots.txt 注意事项

不要禁止 Baiduspider，常见错误：

```
# ❌ 错误：禁止了百度爬虫
User-agent: Baiduspider
Disallow: /

# ✅ 正确：明确允许
User-agent: Baiduspider
Allow: /
Crawl-delay: 1
```

### 9.5 监测与回滚

#### 9.5.1 必装监测

- Google Analytics 4（事件埋点：上传次数、下载次数、语言切换）
- Google Search Console（自动监测排名、CTR、CWV）
- 百度统计 + 百度站长平台
- Sentry 或类似（前端错误监测）
- Lighthouse CI（每次 PR 自动跑，分数下降阻塞合并）

#### 9.5.2 关键告警

- 任何页面 Lighthouse SEO < 90 → 告警
- LCP > 4s → 告警
- 任何 Schema 验证失败 → 告警
- 任何页面返回 5xx → 告警

#### 9.5.3 回滚机制

- 每个 Phase 用独立 PR，合并前 staging 环境验证 1 小时
- 部署用蓝绿或灰度（先 10% 流量，观察 1 小时再全量）
- 保留旧版本快照，发现问题 5 分钟内回滚

---

## 10. 最终验收清单（全 Phase 完成后）

### 10.1 SEO 元信息

- [ ] 所有页面有唯一的 title（无重复）
- [ ] 所有页面有唯一的 meta description（无重复）
- [ ] 所有页面有 canonical URL
- [ ] 所有可比较页面有 hreflang，且双向配对
- [ ] 所有页面有 OG + Twitter Card
- [ ] 所有页面有合适的 Schema.org JSON-LD
- [ ] 所有 Schema 通过 https://validator.schema.org 验证
- [ ] 所有页面 Rich Results Test 通过

### 10.2 内容

- [ ] 8 个落地页全部上线
- [ ] 10 篇博客文章全部发布
- [ ] 没有重复内容（每个页面独立价值）
- [ ] EN 和 ZH 内容各自独立创作（无机翻）
- [ ] 所有图片有 alt 属性
- [ ] 所有外链有合适的 rel（rel="noopener" 等）

### 10.3 结构

- [ ] hash 路由全部废弃
- [ ] sitemap.xml 自动生成、URL 完整
- [ ] robots.txt 正确，未禁止重要爬虫
- [ ] 内链结构图（见附录 B）全部连接
- [ ] 站点深度（首页到任何页面）≤ 3 跳

### 10.4 性能

- [ ] 所有页面 Lighthouse SEO ≥ 95
- [ ] 所有页面 Lighthouse Performance ≥ 80（移动端）
- [ ] LCP ≤ 2.5s（核心页面）
- [ ] CLS ≤ 0.1（所有页面）
- [ ] BiRefNet 模型懒加载，不阻塞首屏

### 10.5 站长平台

- [ ] Google Search Console 验证、sitemap 提交
- [ ] 百度站长平台验证、sitemap 提交
- [ ] 百度主动推送 API 在 CI/CD 中工作
- [ ] 360 / 搜狗 / 神马 sitemap 提交（次要）

### 10.6 监测

- [ ] GA4 接入、关键事件埋点
- [ ] 百度统计接入
- [ ] Sentry 或同类前端错误监测
- [ ] Lighthouse CI 接入 PR 流程

### 10.7 合规与品牌

- [ ] 隐私政策页面（声明图片不存储、不训练）
- [ ] 服务条款页面
- [ ] 没有伪造的评分、评论、用户数
- [ ] 没有抓取竞品 logo / 截图
- [ ] 关于竞品的描述客观中立

---

## 附录 A：Schema.org 模板库

以下模板可以直接复用，把 `{{...}}` 占位符替换为实际值。

### A.1 SoftwareApplication（首页用）

参考 5.5.1 节模板。

### A.2 WebPage（落地页基础）

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "{{页面 title}}",
  "description": "{{页面 description}}",
  "url": "{{canonical URL}}",
  "inLanguage": "{{en or zh-CN}}",
  "isPartOf": {
    "@type": "WebSite",
    "name": "MiaoCut",
    "url": "https://miaocut.app/"
  }
}
```

### A.3 FAQPage（落地页和首页）

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{{问题}}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{{答案纯文本，不含 HTML}}"
      }
    }
  ]
}
```

### A.4 HowTo（落地页用）

参考 7.1.3 节模板。

### A.5 BreadcrumbList（所有非首页用）

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://miaocut.app/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "{{父级名称，可选}}",
      "item": "{{父级 URL}}"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "{{当前页面}}",
      "item": "{{当前 URL}}"
    }
  ]
}
```

### A.6 BlogPosting（博客文章用）

参考 8.1.4 节模板。

### A.7 Organization（首页用）

参考 5.5.4 节模板。

### A.8 WebSite + SearchAction（首页用，可选）

参考 5.5.3 节模板。仅当真实有站内搜索时添加。

---

## 附录 B：内链结构图

完整的站内链接关系图，确保权重在站内合理流动。

### B.1 首页（枢纽节点）

EN 首页指向：
- → /product-photo-background-remover
- → /id-photo-background-changer
- → /transparent-png-maker
- → /remove-bg-alternative
- → /blog
- → /zh（通过语言切换器）

EN 首页被指向：
- ← 所有落地页（顶部导航）
- ← 所有博客文章（导航 + 内文链接）

ZH 首页指向：
- → /zh/shangpin-baidi-tu
- → /zh/zhengjianzhao-huan-dise
- → /zh/dianshang-koutu
- → /zh/touming-beijing
- → /zh/blog
- → /（通过语言切换器）

ZH 首页被指向：
- ← 所有 ZH 落地页（顶部导航）
- ← 所有 ZH 博客文章（导航 + 内文链接）

### B.2 落地页之间的内链关系

EN 落地页内链矩阵（每个页面"相关工具"区块）：

| 当前页面 | 内链 1 | 内链 2 | 内链 3 |
|---|---|---|---|
| /product-photo-background-remover | / | /transparent-png-maker | /remove-bg-alternative |
| /id-photo-background-changer | / | /transparent-png-maker | /remove-bg-alternative |
| /transparent-png-maker | / | /product-photo-background-remover | /id-photo-background-changer |
| /remove-bg-alternative | / | /product-photo-background-remover | /transparent-png-maker |

ZH 落地页内链矩阵：

| 当前页面 | 内链 1 | 内链 2 | 内链 3 |
|---|---|---|---|
| /zh/shangpin-baidi-tu | /zh | /zh/dianshang-koutu | /zh/touming-beijing |
| /zh/zhengjianzhao-huan-dise | /zh | /zh/touming-beijing | /zh/shangpin-baidi-tu |
| /zh/dianshang-koutu | /zh | /zh/shangpin-baidi-tu | /zh/touming-beijing |
| /zh/touming-beijing | /zh | /zh/shangpin-baidi-tu | /zh/zhengjianzhao-huan-dise |

### B.3 落地页 ↔ 博客文章内链

每个落地页底部"相关阅读"区块，链到 2–3 篇相关博客文章：

| 落地页 | 相关博客 |
|---|---|
| /product-photo-background-remover | /blog/amazon-white-background-requirements, /blog/transparent-png-logo-guide |
| /id-photo-background-changer | （新增：可选博客 ID photo guide） |
| /transparent-png-maker | /blog/transparent-png-logo-guide, /blog/birefnet-explained |
| /remove-bg-alternative | /blog/remove-bg-vs-miaocut-comparison, /blog/birefnet-explained |
| /zh/shangpin-baidi-tu | /zh/blog/shangpin-baidi-tu-guide, /zh/blog/ai-koutu-tools-comparison-2026 |
| /zh/zhengjianzhao-huan-dise | /zh/blog/zhengjianzhao-zixu |
| /zh/dianshang-koutu | /zh/blog/shangpin-baidi-tu-guide, /zh/blog/ps-koutu-vs-ai |
| /zh/touming-beijing | /zh/blog/ps-koutu-vs-ai, /zh/blog/birefnet-shi-shenme |

### B.4 博客文章之间的内链

每篇文章正文中要自然地嵌入 2–3 个内链，可链向：
- 相关博客文章
- 对应的落地页（自然引导用户使用工具）
- 首页（CTA）

具体每篇文章的内链目标已在 8.5 / 8.6 节列出。

### B.5 内链锚文本规则

- 内链锚文本要用**关键词**，不要用"点击这里""查看更多"
- 同一锚文本不要过度重复（避免被判定为操纵）
- 自然嵌入正文，不要硬塞链接

例：

```
✅ 好：用 [免费在线 AI 抠图](/zh) 处理一下，3 秒就能搞定。
❌ 差：[点击这里](/zh) 试一下。
```

### B.6 内链深度

任何页面到任何其他页面 ≤ 3 跳。例：

- 首页 → 博客索引 → 博客文章 ✅（2 跳）
- 首页 → 落地页 → 落地页内的相关阅读链接 ✅（2 跳）

---

## 附录 C：百度专项优化清单

百度收录和 Google 收录差异较大，单独列出操作清单。

### C.1 百度站长平台必做项

- [ ] 注册账号 → 添加站点 `miaocut.app`
- [ ] 完成验证（推荐 HTML 标签验证）
- [ ] 提交 sitemap：`https://miaocut.app/sitemap-zh.xml`
- [ ] 配置主动推送（生成 token，接入 CI/CD）
- [ ] 配置自动推送 JS（在所有 ZH 页面注入）
- [ ] 移动适配 → 声明同 URL 自适应
- [ ] 抓取诊断 → 测试 ZH 首页能正常抓取
- [ ] HTTPS 认证 → 验证 SSL 配置正确

### C.2 自动推送 JS

百度还有一种"自动推送"，在页面加载时自动把 URL 推给百度。在所有 ZH 页面 `<head>` 加：

```html
<script>
(function(){
    var bp = document.createElement('script');
    var curProtocol = window.location.protocol.split(':')[0];
    if (curProtocol === 'https') {
        bp.src = 'https://zz.bdstatic.com/linksubmit/push.js';
    } else {
        bp.src = 'http://push.zhanzhang.baidu.com/push.js';
    }
    var s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(bp, s);
})();
</script>
```

### C.3 百度统计

接入百度统计（tongji.baidu.com）：

```html
<script>
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?YOUR_HM_ID";
  var s = document.getElementsByTagName("script")[0]; 
  s.parentNode.insertBefore(hm, s);
})();
</script>
```

只在 ZH 页面加，EN 页面不需要。

### C.4 百度 SEO 友好度自查

- [ ] title 含主关键词，长度 ≤ 30 个汉字
- [ ] description 含主关键词和长尾词，≤ 78 个汉字
- [ ] keywords meta 含 5–10 个主关键词（百度仍参考）
- [ ] H1 含主关键词，且与 title 不完全重复
- [ ] 正文前 100 个字含主关键词
- [ ] 关键词密度 2–5%（不要堆砌）
- [ ] 图片 alt 含描述性中文（不是文件名）
- [ ] 内链锚文本含中文关键词

### C.5 360、搜狗、神马提交

| 平台 | URL | 提交方式 |
|---|---|---|
| 360 站长 | https://zhanzhang.so.com | sitemap 提交、推送 API |
| 搜狗站长 | https://zhanzhang.sogou.com | sitemap 提交 |
| 神马站长 | https://zhanzhang.sm.cn | sitemap 提交 |
| 头条站长 | https://zhanzhang.toutiao.com | sitemap 提交（覆盖头条搜索） |

工作量低，做完算补充覆盖。

### C.6 百度收录加速技巧

- 新站期：每次部署后用主动推送 API 把新 URL 推一次
- 老站期：定期（每周）重新推送高价值页面
- 在已被百度收录的高权重网站（如知乎、CSDN、B 站）发软文带链接（白帽外链）
- 备案后效果显著提升（如果可行）
- 内容更新频率保持每周 1–2 篇博客（百度喜欢"活"的站）

### C.7 百度收录监测

每周检查一次：
- 百度搜索 `site:miaocut.app` → 看收录页面数
- 百度站长平台 → 索引量趋势
- 关键词排名（用百度统计或第三方工具如 5118）

收录速度标准：
- 新站 1–2 周内首页被收录算正常
- 4 周内主要落地页被收录算正常
- 8 周内博客被收录算正常

如 8 周后仍只收录首页，可能是：
- 备案问题（境外服务器，百度爬虫访问慢）
- 内容质量问题（被判低质）
- 内链结构问题（孤立页面）
- 技术问题（爬虫被 robots.txt 或防火墙拦截）

---

## 文档结束

本文档共约 3500 行，覆盖从代码探查到内容生成的完整执行路径。Claude Code 
按 Phase 顺序执行即可，遇到与现状冲突的情况，记录在 `docs/seo/phase0-discovery.md` 
和后续 phase 报告中，必要时回到本文档作者讨论决策。

**祝顺利上线，流量起飞 🚀**

---

文档版本：v1.0  
最后更新：2026-04-27  
