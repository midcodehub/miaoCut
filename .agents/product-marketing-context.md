# Product Marketing Context

*Last updated: 2026-05-14 (revised: ZH promoted from "JS-toggled UX only" to second indexed language with `/zh/*` URLs and reciprocal hreflang)*

> This file is read by other marketing skills (`seo-audit`, `ai-seo`, `schema-markup`, `content-strategy`, `programmatic-seo`, `copywriting`, etc.) to avoid re-asking the same questions. Update it whenever positioning, audience, or product scope changes.

---

## Product Overview

**One-liner (English, primary):**
> MiaoCut is a free, no-signup AI photo toolkit — background remover, watermark eraser, old photo restoration, product photo enhancer, and ID photo maker — all in your browser, no watermark, no usage limits.

**One-liner (Chinese, secondary translation):**
> MiaoCut（猫剪）是一款免登录的免费 AI 图像工具集 —— 抠图、去水印、老照片修复、商品图增强、证件照制作，全部浏览器内完成，无水印、无次数限制。

**What it does:**
A web-based suite of single-purpose AI photo tools. Each tool is a dedicated page that does one job well — remove a background, erase a watermark, restore an old photo, prep a product image for e-commerce, generate an ID photo. No account, no install, no credit card, no watermark on output, no resolution downgrade. Per-request processing in memory; no images stored or used for training.

**Product category (the "shelf" we sit on):**
- Primary: **Free online AI background remover** (head term, biggest search volume)
- Secondary: **Free AI photo toolkit / AI photo editor**
- Per-tool category shelves: product photo editor, watermark remover, old photo restorer, passport/ID photo maker

**Product type:** Web app (no install, no signup). Cloudflare Pages frontend + FastAPI backend on Hugging Face Docker Spaces (3 instances: `miao_cut`, `miao_cut2`, `miao_cut3`).

**Business model:** **Free, no monetization yet.** Built by an independent developer as a genuinely free alternative to subscription tools (remove.bg, PhotoRoom, Adobe Express). Rate-limited to 5 req/min, 50 req/day per IP to control compute cost. Future monetization (donations, optional pro tier, API) is open but not the current focus.

---

## Sub-Tools Map

The site is **not a single tool** — it is a hub-and-spoke of 6 dedicated landing pages. Each has its own ICP, search intent, and SEO/GEO play. All share the same backend.

| Tool | URL | One-line positioning (English) | Tech under the hood |
|------|-----|-------------------------------|---------------------|
| BG remover | `/` | A free AI background remover with a fine-detail mode for hair and fur — full-resolution PNG, no signup. | BiRefNet-General-Lite INT8 (~155MB), `sharp` ~1s / `fur` ~3-5s with alpha matting |
| Product photo | `/product-photo-background-remover/` | A free product photo editor that removes background, adds white backdrop, square crop, and natural shadows for e-commerce listings. | BiRefNet + post-processing (white BG, square crop, drop shadow) |
| Portrait | `/portrait-background-remover/` | A free portrait background remover optimized for profile pictures, resumes, and social media. | BiRefNet (`fur` mode for hair edges) |
| Watermark remover | `/watermark-remover/` | A free in-browser watermark remover — paint over the mark and AI fills it in. | LaMa Inpainting |
| Old photo restoration | `/old-photo-restoration/` | A free AI tool that restores faded, scratched, and damaged old photos. | Restoration + denoising + detail enhancement |
| ID photo | `/id-photo-maker/` | A free passport/ID photo maker with country-specific size presets. | BiRefNet + MediaPipe Face Mesh for eye-line detection and crop |

---

## Target Audience

**Geo/language priority:** **English-first growth, Chinese as secondary indexed language.**
- English (Google global, Reddit, ChatGPT/Perplexity AI search) is the primary growth target. Domain `.app` is global.
- Chinese has its own indexable URLs at `/zh/*` (e.g., `/zh/`, `/zh/watermark-remover/`) with hreflang annotations linking the EN ↔ ZH pairs. The two locales are reciprocally declared in both `<head>` `<link rel="alternate" hreflang>` tags AND in `sitemap.xml` `<xhtml:link>` annotations. `x-default` points to the English version.
- ZH static HTML is **generated** from EN HTML + i18n dicts via `npm run build:i18n` ([scripts/build-i18n.mjs](../scripts/build-i18n.mjs)). Single source of truth: edit EN HTML or zh i18n dicts, then rebuild.
- Lang switcher in the header navigates between locales (e.g., `/watermark-remover/` ↔ `/zh/watermark-remover/`); it does NOT swap content via JS. This is what lets Google index both versions independently.

**Implication for marketing skills:**
- Content-strategy / programmatic-SEO / copywriting can target both English AND Chinese keyword clusters. Chinese is now real organic surface, not just UX nicety.
- When adding new content/copy to a page, add both `i18nData.en` AND `i18nData.zh` keys, then run `npm run build:i18n`. Otherwise the ZH version drifts behind.
- For competitive analysis, include 稿定 / 佐糖 / PicWish (Chinese-first competitors) more seriously now that we're targeting Chinese organic traffic.

**Decision-maker:** N/A — this is a B2C utility tool. The user is the buyer. No procurement, no demo, no signup friction. They search → land → upload → download. Whole funnel is one page.

**Primary use case:** "I need to do one specific thing to a photo, right now, for free, without signing up or watching ads." MiaoCut wins when the user does not want to start a Canva trial, install PhotoRoom on their phone, or hand a credit card to remove.bg.

**Jobs to be done (per tool):**
- "Help me get a transparent PNG of this so I can drop it into [slide / poster / listing / chat]." (BG remover)
- "Help me make my product look like a real Amazon/Etsy listing photo." (Product photo)
- "Help me make a clean profile picture for my resume / LinkedIn / Discord." (Portrait)
- "Help me erase this watermark from a photo I own / a photo I screenshotted." (Watermark)
- "Help me bring my parents'/grandparents' damaged old photo back to life." (Old photo)
- "Help me get a passport / visa / ID photo without going to a photo studio." (ID photo)

---

## Personas (audience-segment, not B2B buying-committee)

Each persona maps to one or more sub-tools. Priority labels (P0/P1/P2) drive content, SEO, and feature investment order.

| Persona | Tool | Priority | Cares about | Their challenge | Value we promise |
|---------|------|----------|-------------|-----------------|------------------|
| **E-commerce seller** (Etsy / Shopify / Amazon / eBay / Mercari) | Product photo | **P0** | Clean white-background listing photos that look professional and convert; consistent shadows; square format for marketplaces | Hires nobody, has no Photoshop skills, won't pay $19/mo for PhotoRoom for occasional use | One-shot product photo cleanup that looks marketplace-ready, no app install, no subscription |
| **Designer / student / office worker** | BG remover | **P0** | A transparent PNG to drop into a slide, poster, or design mockup, fast | remove.bg free tier downgrades resolution; Canva requires login; in-house design tools are clunky | Full-resolution transparent PNG in 1 second, no signup, no watermark |
| **Adult child preserving family memories** | Old photo restoration | **P1** | Restoring damaged photos of parents/grandparents; emotional, gift-driven, often time-sensitive (anniversary, funeral, birthday) | Restoration services on Fiverr / Etsy cost $20–$100 and take days; AI tools usually charge or watermark | Free, instant restoration of treasured photos; no skill required; emotional payoff |
| **Job seeker / social creator** | Portrait | **P1** | Clean headshot background for LinkedIn, resume, Discord, IG | Smartphone "portrait mode" creates fake bokeh, not a transparent cutout; pro headshots are $200+ | Free, transparent-background headshot from any selfie |
| **Visa applicant / job applicant** | ID photo | **P1** | Correct dimensions for a specific country/document (US visa, China 1-inch/2-inch, JP visa, passport) | Photo studios are slow and expensive; phone apps charge per export | Country-preset ID photo with auto face alignment, free, downloadable |
| **Social creator / student** | Watermark remover | **P2 (handle with care)** | Remove a stock-photo watermark from an image *they own*, or clean up a screenshot artifact | Manual content-aware fill in Photoshop is hard; commercial AI inpainters cost money | Brush-and-fill in browser, free | 

⚠️ **Watermark remover compliance constraint** — see *Anti-personas* below.

---

## Problems & Pain Points

**Core problem we solve:**
"I just want to do one quick photo edit and every tool wants me to sign up, install an app, pay a subscription, or stamps a watermark on the result."

**Why alternatives fall short:**
- **remove.bg** — free tier outputs only low-resolution previews; HD requires credits/subscription.
- **PhotoRoom** — phone-app first; web version is limited; subscription gates serious use.
- **Canva / Adobe Express** — require account creation, all-in-one editor when the user just wants one operation.
- **稿定 / 佐糖 (Chinese competitors)** — login walls, paid tiers, ad-heavy, Chinese-only.
- **Photoshop / GIMP** — overkill for a single transparent PNG; steep skill curve.
- **Fiverr / Etsy restoration services** — $20–$100 and 1–7 days for old photo restoration.

**What it costs the user (when they pick the wrong alternative):**
- Time spent creating yet another account
- Money spent on a subscription they won't use after this one task
- Quality loss from free-tier resolution caps and watermarks
- Privacy unease over uploading photos (especially family photos, ID photos) to platforms that may train on them

**Emotional tension:**
- *Designer/student/seller:* "Why is something this simple this annoying."
- *Family memory persona:* "I'm scared to lose this photo. I don't trust my hands. I don't trust the cheap tools."
- *Visa applicant:* "If I get this wrong I have to redo my appointment."

---

## Competitive Landscape

**Direct competitors (same solution, same problem):**
- **remove.bg** — industry standard. Falls short: HD output paywalled, watermarks on free tier, signup pushes, single-purpose only.
- **PhotoRoom** — strong on product photos. Falls short: app-first, subscription model, account required, mobile-centric UX.
- **Pixian.AI / BackgroundCut / various free BG removers** — most are thin wrappers, often ad-heavy, lower quality on hair/fur, or rate-limited harder.
- **Adobe Express background remover** — Falls short: requires Adobe account, slow, in-product cross-sell of subscription.
- **Canva BG remover** — Falls short: paywalled in free tier (Canva Pro feature), account required.
- **稿定设计 / 佐糖 (Gaoding / PicWish / Tucao)** — Chinese-language competitors. Falls short: login walls, paid tier pressure, Chinese-only UI for English users, ad-heavy.

**Per-tool direct competitors:**
- *Product photo:* PhotoRoom, Pebblely, Booth.ai (paid), ZMO.AI
- *Watermark remover:* Watermarkremover.io, Dewatermark.ai, HitPaw (mostly paid or watermarked output)
- *Old photo restoration:* MyHeritage Photo Enhancer (paid), Hotpot.ai, Remini (subscription)
- *ID photo:* IDPhoto4You, PassportPhotoOnline (paid), HivisionIDPhotos (open source — closest in spirit)

**Secondary competitors (different solution, same problem):**
- Photoshop / Affinity Photo / GIMP — manual mask + content-aware fill
- Smartphone apps (PhotoRoom mobile, Snapseed)
- "Make me a cutout" requests in ChatGPT / Gemini / Claude with image input

**Indirect competitors (alternative approaches):**
- Hiring a freelancer on Fiverr / Upwork (especially for old photo restoration — $20-$100/photo)
- Going to a physical photo studio (ID photos)
- Just not doing the edit ("good enough")

**The competitive frame to anchor on:**
> "A free, no-signup, no-watermark, full-resolution alternative to remove.bg / PhotoRoom — and a multi-tool toolkit, not a single feature."

---

## Differentiation

**Key differentiators:**
1. **Truly free** — not a freemium tease. No HD paywall, no watermark, no per-day cap visible to user (rate limit is 50/day per IP, generous for any human use).
2. **No signup, ever.** Land → upload → download. Whole flow is one page.
3. **Privacy-first, transparent.** Per-request processing in memory; no storage, no AI training. Stated openly on the page.
4. **Two quality modes** — `sharp` (1s) for hard edges and `fur` (3-5s) with alpha matting for hair, fur, soft edges. Most free tools have only one mode, often the worse one.
5. **Multi-tool toolkit, not a single feature** — a small but coherent suite (BG, product, portrait, watermark, old photo, ID photo) under one brand. Visit once, bookmark once, use many times.
6. **Open about the tech stack** — README names BiRefNet, LaMa, MediaPipe. Builds trust with technical users who'd otherwise wonder if it's a wrapper around someone's API.

**How we do it differently:**
- Hosted on Hugging Face Spaces (3 replicas behind a custom domain) instead of expensive GPU clusters → keeps cost sustainable for a free product
- Single-purpose landing pages (one tool per page) instead of one-app-many-tools → faster, less cognitive overhead, better SEO

**Why customers choose us over alternatives:**
- Over remove.bg: "I get HD output for free, no signup."
- Over PhotoRoom: "I don't have to install an app for a one-time edit."
- Over Canva: "I just want a transparent PNG, not an editor."
- Over Photoshop: "I don't want to learn a tool for a 30-second job."
- Over Fiverr restoration: "I get the result in seconds, not days, for free."

---

## Objections & Anti-Personas

**Top objections:**

| Objection | Response |
|-----------|----------|
| "Is this actually free, or is it free-then-paywall?" | Yes, truly free. No account. Rate-limited to 50/day per IP to manage server cost — generous for any human use. |
| "Does the result have a watermark?" | No. Output is full-resolution transparent PNG with no watermark. |
| "Will my photo be used to train AI / leaked?" | No. Per-request in-memory processing. No storage, no training. (State this prominently — it's a top objection for ID photos and family photos.) |
| "Is the quality as good as remove.bg?" | For most images, yes — same class of model (BiRefNet). For hair/fur, switch on `fur` mode for alpha-matting quality comparable to or better than free competitors. |
| "Why is it free? What's the catch?" | Built by an independent developer as a free alternative to subscription tools. No catch. Donations / optional pro features may come later but the core stays free. |
| "Why should I trust a tool with a Chinese name for English use?" | Domain is `.app` (global). UI is fully English. Server is global edge (Cloudflare + HF). Built openly — the stack is documented in the GitHub repo. |

**Anti-personas (NOT a good fit):**
- **Enterprise / agency teams** needing API access, SLA, batch processing, white-label. We have no API and no SLA.
- **Power Photoshop users** wanting layer-level control. We do one operation per tool, not a full editor.
- **Users who want to remove watermarks from copyrighted material they don't own** — we explicitly do not support this. See compliance note below.

**⚠️ Compliance constraint — Watermark remover:**
- Position the tool exclusively as **"Remove watermarks from photos you own"** (legacy watermarks on your own assets, screenshot artifacts you created, etc.).
- FAQ on `/watermark-remover/` must explicitly disclaim use for removing third-party copyright watermarks.
- Do **not** make `watermark remover` a primary keyword theme for the umbrella site — Google has long applied "low quality / piracy" signals to this niche, and over-targeting it can drag the whole domain down.
- Do **not** rank-target queries like "remove getty watermark," "remove shutterstock watermark," "remove tiktok watermark," etc.
- Keep the page well-built and trustworthy, but treat its SEO ceiling as inherently lower than the other tools.

---

## Switching Dynamics (JTBD Four Forces)

**Push (frustrations driving them away from current solution):**
- "remove.bg downgraded my image to 612px — useless for my poster"
- "PhotoRoom wants me to install an app for one photo"
- "Canva says this is a Pro feature"
- "I can't believe Adobe wants me to make an account just to remove a background"

**Pull (what attracts them to MiaoCut):**
- "Free" + "no signup" + "no watermark" appearing together in search results / AI answers
- The specific tool match (e.g., "passport photo maker free" → ID photo page)
- AI search engines citing MiaoCut by name when users ask "what's a free background remover"

**Habit (what keeps them stuck with current approach):**
- Already-installed Photoshop / Canva → friction to try something new
- Bookmarked remove.bg → muscle memory
- Skepticism that a free unknown tool will be as good as a paid one

**Anxiety (what worries them about switching):**
- "Will the quality be worse?"
- "Will my photo be leaked or used for training?" (especially family photos, ID photos)
- "Why is this free? What's the catch?"
- "Is a Chinese-named tool safe for my English-language work?"

---

## Customer Language

**How customers describe the problem:**
- "I just want to remove the background from this photo"
- "make this transparent" / "make a transparent PNG"
- "cut out the [object/person]"
- "white background for my [Etsy/Amazon/Shopify] listing"
- "passport photo / visa photo / 2 inch photo"
- "fix my grandma's old photo" / "restore old photos"
- "remove the watermark" (specifically from own assets)
- "background remover that's actually free"
- "free alternative to remove.bg / PhotoRoom"

**How customers describe us (target language for AI citations):**
- "MiaoCut — a free no-signup background remover"
- "free AI photo toolkit"
- "free remove.bg alternative with no watermark"
- "free passport photo maker"

**Words to use (English):**
- "free", "no signup", "no watermark", "no usage limits", "full resolution", "transparent PNG", "in your browser", "private", "no account needed"
- Tool-category words: "background remover", "watermark eraser", "ID photo maker", "old photo restoration", "product photo editor"
- Emotional (old photo persona only): "restore", "bring back", "preserve", "memories"

**Words to avoid:**
- "platform", "solution", "leverage", "synergy", "empower", "revolutionize", "next-generation" — generic SaaS jargon dilutes credibility
- "AI-powered" as a standalone claim — by 2026 this is wallpaper; show what the AI does specifically
- "Premium", "Pro", "Plus" — implies a paywall the product doesn't have
- "Sign up", "create account", "register", "free trial" — even saying these words on a no-signup product is jarring
- "Disrupt", "game-changer" — over-claiming undermines trust on a free utility

**Glossary:**

| Term | Meaning |
|------|---------|
| BiRefNet | Open-source segmentation model (Bilateral Reference Network). The `birefnet-general-lite` INT8 quantized version (~155MB) is what we use for masking. |
| Sharp mode | Default 1s mode — BiRefNet mask + gentle gamma + 1px anti-alias. Good for products, logos, hard edges. |
| Fur mode | 3–5s mode — adds alpha matting and ML foreground estimation to clean up hair/fur/soft edges and remove halo color contamination. |
| LaMa | Open-source inpainting model used by the watermark remover for paint-and-fill. |
| MediaPipe Face Mesh | Google's facial landmark model used by the ID photo tool to find eye-line and crown for correct cropping. |
| HF Space | Hugging Face Docker Space — where the backend runs (3 replicas behind one custom-domain API). |
| `?profile=sharp\|fur` | URL query parameter the frontend sends to pick the backend pipeline per request. |

---

## Brand Voice

**Tone:** Direct, practical, transparent, slightly understated. Not salesy. Not "AI hype." Not corporate.

**Style:** Plain English. Short sentences. Specific over abstract ("1-second background removal" beats "lightning-fast AI"). Tell the user exactly what happens and what doesn't. Show the underlying tech name (BiRefNet, LaMa) where it builds trust.

**Personality (3–5 adjectives):** Honest · Useful · Quietly competent · Indie · Trustworthy

**What we sound like:**
- ✅ "Free background remover. Drop a photo, get a transparent PNG. No signup."
- ✅ "We don't store your photos. Per-request processing, deleted after the response."
- ✅ "Use `fur` mode for hair, pets, and soft edges. It's slower (~3s) but the edges are cleaner."

**What we don't sound like:**
- ❌ "Revolutionize your photo editing workflow with our cutting-edge AI-powered platform!"
- ❌ "Empowering creators with next-generation visual intelligence."
- ❌ "Unlock premium features by upgrading today!"

---

## Proof Points

**Metrics:** *(TBD — need to gather)*
- Monthly active users / unique IPs
- Total cutouts processed
- Median latency (sharp / fur)
- Avg user satisfaction (from feedback endpoint)

**Customers / logos:** N/A — consumer utility, no logo wall. Could surface "made with MiaoCut" gallery if creators opt in.

**Testimonials:** *(TBD — surface from feedback endpoint backlog. Source candidates: feedback endpoint stored at `${DATA_DIR}/feedback.json` in HF Space.)*

**Value themes (use as content & messaging pillars):**

| Theme | Proof |
|-------|-------|
| **Truly free, forever** | No signup, no watermark, no resolution downgrade, no credit card. Compare to remove.bg HD paywall. |
| **Privacy first** | Per-request memory processing; no storage; no AI training. Stated on every page. |
| **Quality on hard edges** | `fur` mode uses alpha matting + ML foreground estimation. Show before/after on hair/fur/glass. |
| **One thing per page** | Single-purpose tools beat all-in-one editors for one-shot tasks. Show the URL maps to the job. |
| **Independent and transparent** | Built by one developer; tech stack is documented; no VC pressure to paywall. |

---

## Goals

**Primary business goal (next 6 months):**
1. Establish MiaoCut as a top-3 organic + AI-cited result for "free background remover" in English
2. Establish presence on each per-tool keyword cluster (product photo, old photo restoration, passport photo maker)
3. Validate Reddit / Product Hunt as awareness channels for English audience

**Conversion action:** A successful task completion (uploaded → downloaded). There's no signup or purchase to track. Proxy metrics: unique-IP daily count, downloads/uploads ratio, % of users who try a second tool.

**Current metrics:** *(TBD — instrumentation status to be confirmed)*

---

## Open Questions / TBD

These are things to resolve as we go — flag for the user when they come up:
- [ ] Pricing/monetization plan (donations? optional pro? API?) — currently zero, but worth defining the boundary so SEO/content doesn't promise "free forever" if that may change
- [ ] Analytics setup — what's tracked, what isn't (drives `analytics-tracking` skill scope)
- [ ] Feedback / testimonial harvesting from `${DATA_DIR}/feedback.json` for proof-points section
- [ ] Whether to surface a "made with MiaoCut" creator gallery as social proof
- [ ] HivisionIDPhotos integration roadmap (would strengthen ID photo positioning if shipped)
