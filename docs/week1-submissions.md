# Week 1 提交清单（照着做，每条都能复制粘贴）

> 目标：开源 + 高 DR 外链。每条都标了「去哪、点哪、粘什么」。一次做一条，不用一口气做完。
> 预计总时间：约 2 小时（Show HN 当天要多花点时间回评论）。

## 先备好这几样（复制用）

- **产品名**：MiaoCut
- **官网**：https://miaocut.app
- **GitHub**：https://github.com/midcodehub/miaoCut
- **remove.bg 替代页**（外链落点）：https://miaocut.app/alternatives/remove-bg/
- **一句话标语（<10 词）**：`Free, no-signup AI background remover — open source`
- **分类标签**：`AI`, `background remover`, `image editing`, `transparent PNG`, `open source`, `photo tools`
- **Logo 图**：用 https://miaocut.app/og/home.png（1200×630）。若某站要求正方形，先用截图工具裁一张 512×512 的方图备用。

---

## ✅ 第 0 步：GitHub 仓库（已完成）

- [x] 仓库已公开
- [x] 描述 + 官网链接已填
- [x] Topics 标签已优化（17 个）
- [ ] **你只需手动确认一下**：打开 https://github.com/midcodehub/miaoCut ，看 README 显示正常、右侧 About 有 🔗 miaocut.app。

---

## 1️⃣ AlternativeTo（DR 79，最容易的高价值外链，~15 分钟）

1. 打开 https://alternativeto.net ，右上角注册/登录（可用 Google）。
2. 搜索 **remove.bg** → 进入它的页面 → 点 **"Suggest alternative"**（建议替代品）。
3. 填：
   - **Name**：`MiaoCut`
   - **URL**：`https://miaocut.app`
   - **简介（粘这段）**：
     > Free, open-source AI background remover. Removes image backgrounds in about one second with no signup, no credit limits, and no watermark — exports a full-resolution transparent PNG. Includes a Fur mode (alpha matting) for hair, plus an ID photo maker, watermark remover, and old-photo restoration. Self-hostable (MIT).
   - **License/标签**：勾选 **Free** 和 **Open Source**。
4. 同样的操作，再对 **PhotoRoom**、**Adobe Express** 各提交一次（同一段简介即可）。

---

## 2️⃣ OpenAlternative（开源替代品目录，~10 分钟）

1. 打开 https://openalternative.co → 找 **"Submit"**（提交）。
2. 填：
   - **Repository（重点，它要 GitHub 地址）**：`https://github.com/midcodehub/miaoCut`
   - **Website**：`https://miaocut.app`
   - **简介（粘这段）**：
     > MiaoCut — open-source (MIT) AI background remover and image toolkit. A free, self-hostable alternative to remove.bg. FastAPI + BiRefNet backend, static frontend. No signup, privacy-first (images processed in memory, never stored).

---

## 3️⃣ AI 工具目录（核心，3 个先做，~30 分钟）

每个都是「找 Submit → 填官网 + 简介 + 标签」。**简介统一粘这段：**
> MiaoCut is a free, AI-powered background remover that erases image backgrounds in about one second using the BiRefNet model. A Fur mode applies alpha matting to preserve hair and fur. It also includes an ID/passport photo maker, an AI watermark remover, old-photo restoration, and JPG↔PNG converters. No signup, no credit limits, no watermark. Free and open source (MIT). Try it at https://miaocut.app

先做这 3 个（DR 最高）：
- [ ] **There's An AI For That**：https://theresanaiforthat.com/submit/
- [ ] **Futurepedia**：https://www.futurepedia.io/submit-tool
- [ ] **Toolify**：https://www.toolify.ai/submit

> 这几个常常要等审核，提交完不用管，过几天会收录。

---

## 4️⃣ Show HN（Hacker News，最大的一次曝光，挑一天做）

**为什么你适合发**：你这是开源 + 有真技术料（INT8 量化 BiRefNet + alpha matting + 免登录架构），HN 吃这套。

**怎么发：**
1. 选 **周二/周三/周四**，**北京时间晚上（约 21:00–23:00，对应美西早上）** 发，曝光最高。
2. 打开 https://news.ycombinator.com/submit
3. **Title（粘这个）**：
   `Show HN: MiaoCut – Free, open-source AI background remover (no signup, self-hostable)`
4. **URL**：`https://github.com/midcodehub/miaoCut`
5. 发完后，**立刻自己发第一条评论**（粘这段）：
   > I built MiaoCut, a free AI background remover. Frontend is a static SPA on Cloudflare Pages; backend is FastAPI + BiRefNet (INT8-quantized, ~155MB) via rembg on Hugging Face Docker Spaces. Two cutout profiles: `sharp` (BiRefNet mask + gamma + 1px AA, ~1s) and `fur` (adds closed-form alpha matting + foreground estimation to kill background-color contamination on hair/fur, ~3–5s). Rate limiting and concurrency live in process memory — no Redis. No signup, no watermark, images are processed in memory and discarded. MIT-licensed and self-hostable via Docker. Live demo: https://miaocut.app — happy to answer questions about the alpha-matting pipeline or the INT8 quantization tradeoffs.
6. **接下来 2–3 小时守着，每条评论都回**。HN 看重作者是否积极回复。**不要找人来点赞**（会被封）。

---

## 5️⃣ awesome-list PR（开发者圈的 dofollow 外链，~20 分钟，可选）

1. 在 GitHub 搜 `awesome background removal` 或 `awesome ai tools`，找 star 多的那个仓库。
2. 点进 README → 看格式 → Fork → 编辑 README，加一行：
   ```
   - [MiaoCut](https://miaocut.app) - Free, open-source AI background remover. No signup, no watermark, self-hostable. [`source`](https://github.com/midcodehub/miaoCut)
   ```
3. 提 Pull Request，PR 说明写一句："Adds MiaoCut, an open-source (MIT) AI background remover."

---

## 做完后怎么记录

每提交一个，在下面打勾 + 贴上收录后的链接，方便以后查外链是否还在：

| 网站 | 状态 | 收录链接 |
|---|---|---|
| AlternativeTo (remove.bg) | ⬜ | |
| AlternativeTo (PhotoRoom) | ⬜ | |
| OpenAlternative | ⬜ | |
| There's An AI For That | ⬜ | |
| Futurepedia | ⬜ | |
| Toolify | ⬜ | |
| Show HN | ⬜ | |
| awesome-list PR | ⬜ | |

> Week 2 再刷剩下的一批 AI 目录（SaaSHub、StackShare、TopAI.tools、Supertools 等），见 `docs/` 里的完整目录清单或问我要。
