# MiaoCut SEO 内容方案：「How to Remove Background」教程中心

> 状态：执行中（P0 已落地：Hub + PowerPoint + GIMP）
> 最后更新：2026-05-31
> 负责人：midcodex

## 0. 一句话策略

针对 Ahrefs 标记为 **Easy / 高量** 的「how to remove background in <软件>」教程词，建一个
hub-and-spoke 教程中心，**先把竞品软件的真实操作教透（赢得排名与信任），再在用户感到"这工具好麻烦"
的那一刻插入 MiaoCut 一键方案做截流**，并用内链把权重灌向核心工具页（首页 + 各 use-case 工具页）。

---

## 1. 核心判断：这是"教竞品工具"的词，必须截流而非硬广

`how to remove background in powerpoint / gimp / canva / photoshop` 的搜索者，**当下想要的是在那个
软件里完成操作**，不是来换工具的。所以页面逻辑固定为：

```
真实分步教程（截图 + 编号步骤）
  → "这个方法的局限"（抠不干净 / 步骤多 / 要付费 / 要装软件）
  → ⚡ 截流 CTA：在浏览器里一键完成（MiaoCut，免登录、无水印）
  → 对比表（该软件 vs MiaoCut）
  → FAQ
```

只塞落地页 = 既排不上、也不转化。教程必须真有用。

---

## 2. 已拍板的关键决策（2026-05-31）

| 决策点 | 结论 | 影响 |
|---|---|---|
| video / gif 词（后端不支持） | **暂缓**，先吃能转化的词 | P0–P2 不做 video/gif；GIF 列入产品 backlog（拆帧→批量 sharp→重组，技术可行）；video 不建议做 |
| 教程簇语言 | **EN 优先，zh 按需再补** | 教程页做成纯静态英文，不进现有 `PAGES`（那会强制生成 zh），改走新增的 `EN_ONLY_PAGES` |
| 实现形态 | 纯静态英文 HTML，不引 `app.js` | 教程页无上传组件；`app.js` 在缺 `#dropzone` 时会 early-return（[app.js:302](../app.js#L302)），所以也不引它；去掉失效的语言切换器 |

---

## 3. 信息架构（hub-and-spoke）

URL 用目录式（匹配 Cloudflare Pages 路由），Hub 在 `/how-to-remove-background/`，Spoke 嵌在其下：

```
                    首页 / (核心一键抠图工具，转化终点)
                          ▲  ▲  ▲
          ┌───────────────┘  │  └───────────────┐
   /portrait-...        /product-...        /jpg-to-transparent-png/
          ▲                  ▲                    ▲
          │   (Spoke 正文 CTA 精准内链到最相关工具页) │
   ┌──────┴───────────────── HUB ───────────────┴──────┐
   │        /how-to-remove-background/  (方法总览 + 导流)  │
   └──┬────┬────┬────┬────┬────┬───────────────────────┘
      │    │    │    │    │    │
  powerpoint gimp canva photoshop adobe-express iphone   (gif/video 暂缓)
```

内链规则：
- **Spoke ↔ Hub 双向**（Spoke 顶部面包屑回 Hub；Hub 列出所有 Spoke）。
- **Spoke 正文截流 CTA → 最相关工具页**（如 PowerPoint→透明 PNG / 首页；iPhone→首页）。
- **Hub → 首页核心工具**（"最简单的方法"）。
- **现有工具页/首页 → Hub**（待办，见第 6 节，给 Hub 灌入站内权重）。

---

## 4. 关键词与页面映射

### 桶 A：竞品软件教程词（截流型，纯信息意图）

| 关键词 | 量级 / 难度 | Buyer Stage | Spoke URL | 截流落点 | 阶段 |
|---|---|---|---|---|---|
| how to remove background in powerpoint | >10k / Easy | Awareness | `/how-to-remove-background/powerpoint/` | 首页 + transparent-png | **P0** |
| how to remove background in gimp | >10k / Easy | Awareness | `/how-to-remove-background/gimp/` | 首页 | **P0** |
| how to remove background in canva | 中 | Awareness | `/how-to-remove-background/canva/` | 首页 + product-photo | P1 |
| adobe express remove background | >1k / Easy | Consideration | `/how-to-remove-background/adobe-express/` | 首页 | P1 |
| how to remove background in photoshop | 大 / 高 | Awareness | `/how-to-remove-background/photoshop/` | 首页 | P2 |

### 桶 B：设备 / 格式场景词

| 关键词 | Spoke URL | 能力匹配 | 阶段 |
|---|---|---|---|
| remove background from image iphone | `/how-to-remove-background/iphone/` | ✅ 教 iOS 相册原生法 + MiaoCut 网页版（无需 App）截流 | P1 |
| remove background from gif | `/how-to-remove-background/gif/` | ❌ 后端不支持，暂缓（待 GIF 拆帧能力） | P3 |
| remove background from video | `/how-to-remove-background/video/` | ❌ 后端不支持，不建议做 | — |

---

## 5. 落地工程规范（贴合本仓库构建体系）

1. **页面形态**：纯静态英文 HTML，复用现有工具页的 `<head>` / header / footer 结构与 class（保证
   Tailwind 扫得到）。**不引 `app.js`**；语言切换器 `<select id="lang-switch">` 去掉（无 zh 版本，避免死控件）。
2. **Schema**：每个 Spoke 带 `HowTo`（针对该软件的真实步骤）+ `FAQPage` + `BreadcrumbList`；
   Hub 带 `BreadcrumbList`（+ 可选 `ItemList`）。FAQ 的 JSON-LD 必须与可见 FAQ 文本一致。
3. **canonical / hreflang**：EN-only 页**自指 canonical**，**不发 hreflang**（只有一种语言版本时不应声明 alternate）。
4. **sitemap 接入**：教程页注册到 [scripts/build-i18n.mjs](../scripts/build-i18n.mjs) 新增的 `EN_ONLY_PAGES`，
   `buildSitemap()` 会把它们作为单条 `<loc>`（无 `xhtml:link` alternate）写进 `sitemap.xml`。
   **不要**把它们加进 `PAGES`（那会触发 zh 生成并要求 zh 字典）。
5. **Tailwind**：[tailwind.config.js](../tailwind.config.js) 的 `content` 加 `./how-to-remove-background/**/*.html`，
   然后 `npm run build:css` 重新生成并提交 `output.css`。
6. **构建**：跑 `npm run build`（CSS + i18n 一把梭）并提交 `output.css` 与 `sitemap.xml`。
   禁止手改 `zh/*` 和 `sitemap.xml`。

---

## 6. 待办：把 Hub 接入站内链接（给它灌权重）

sitemap 只负责"被发现"，**内链才传递权重**。P0 页上线后需补：

- [ ] 首页 + 各工具页 footer 的"All MiaoCut Tools"区加一条 → `/how-to-remove-background/`（"How-To Guides"分类）。
- [ ] 首页正文合适位置加一句话链接到 Hub（如 FAQ 附近 "Using another tool? See our guides for PowerPoint, GIMP…"）。

> 注意：footer 链接文案在各页用 `data-i18n`，新增条目要在 `BASE_I18N`（[app.js](../app.js)）或对应页字典补 en+zh key。

---

## 7. 分阶段与衡量

| 阶段 | 页面 | 触发条件 |
|---|---|---|
| **P0**（已落地） | Hub + PowerPoint + GIMP | 验证模板与截流转化率 |
| P1 | Canva + Adobe Express + iPhone | P0 进 GSC 索引、有曝光后 |
| P2 | Photoshop | Hub 攒到内链权重后再上大词 |
| P3（待定） | GIF（若补拆帧能力） | 产品决定做 GIF 支持后 |

**衡量**：GSC 看各 Spoke 的曝光 / 点击 / 排名；用 Umami 看 Spoke → 工具页的点击率；
对截流 CTA 文案做 A/B（"Try free" vs "Skip these steps"），再决定扩量。
（A/B 可用 `marketing-skills:ab-test-setup`，schema 细化用 `marketing-skills:schema-markup` / `ai-seo`。）
