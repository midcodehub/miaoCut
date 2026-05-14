# MiaoCut SEO Audit Findings

*Generated: 2026-05-14 · Scope: 6 landing pages + technical SEO + i18n + schema · Source-of-truth: `.agents/product-marketing-context.md`*

This is **audit-only** — no code changes have been made. Each finding includes: which page(s), what's wrong, why it matters, the concrete fix, and an estimated impact.

> **Implementation status (2026-05-14, post-implementation pass):**
> - ✅ **C1** — FAQ schema/visible-content mismatch: visible FAQ sections added to watermark + id-photo (6 and 7 entries respectively), JSON-LD synced.
> - ✅ **H7** — i18n strategy: chose **Path B** (separate `/zh/` URLs). Implemented via [scripts/build-i18n.mjs](../scripts/build-i18n.mjs); generates 6 ZH static pages + reciprocal hreflang in head and sitemap. Lang switcher updated to navigate between locales.
> - ⏳ **H1, H2, H3** — content depth on old-photo, watermark, id-photo: thin pages still need full how-to/examples/cross-link buildout. Watermark FAQ now includes the compliance disclaimer (Q&A #2), partially addressing H2.
> - ⏳ **H4, H5, H6, H8** — pending future passes (HowTo schema, Organization schema, cross-link sections on 3 pages, title length fixes).
> - ⏳ **All P2/P3 items** — pending.
> - 📦 **Bonus delivered**: sitemap.xml now auto-generated with 12 URLs (6 EN + 6 ZH) + xhtml:link annotations + fresh `lastmod` (resolves M3 + M4).

---

## TL;DR — what I found

The site has **a strong foundation** (good schema on home, OG images per page, breadcrumb on 2 pages, well-structured `_headers`, lazy + responsive images on home). But there are **two structured-data policy risks** that need to be fixed first, and **three sub-pages so thin they will struggle to rank** against established competitors.

Quick stats:
- **Pages audited:** 6 (home + 5 sub-tools)
- **Indexation blockers:** 0 (good)
- **Critical issues (P0):** 2 (Google structured-data policy violations)
- **High-priority (P1):** 8
- **Medium (P2):** 8
- **Nice-to-have (P3):** 5

---

## CRITICAL — fix first (P0)

### C1. FAQ schema references content not visible on the page

**Pages:** [watermark-remover/index.html](watermark-remover/index.html) (lines 41–72), [id-photo-maker/index.html](id-photo-maker/index.html) (lines 39–48).

**Issue:** Both pages declare a `FAQPage` JSON-LD with Q&A entries, but the visible HTML body has **no corresponding FAQ section**. The watermark page has a "Best results" tip box (line 154–157) and 3 SEO cards (line 191–203); the id-photo page has 3 SEO cards (line 240–242). Neither contains the actual Q&A text from the schema.

**Why it matters:** Google's structured data policy requires FAQ schema content to **be visible on the page to the user**. Mismatch can trigger a manual action ("Spammy structured markup") that suppresses all rich results across the domain. With AI Overviews relying heavily on FAQ schema as a citation source, this is also a missed GEO opportunity.

**Fix (pick one per page):**
- **Option A (preferred):** Add a visible `<section>` with `<h2>Frequently Asked Questions</h2>` and the same 3 Q&A entries as `<h3>` + `<p>`. This restores compliance and adds content depth, which both pages need anyway.
- **Option B:** Remove the `FAQPage` JSON-LD block entirely until visible FAQ content is added.

**Estimated impact:** Critical — protects the whole domain from manual action. Once visible FAQ + schema match, watermark and id-photo become eligible for FAQ rich results in SERP.

---

## HIGH PRIORITY — should ship in next 2–4 weeks (P1)

### H1. Old-photo-restoration page is critically thin on content

**Page:** [old-photo-restoration/index.html](old-photo-restoration/index.html) (171 lines total).

**Issue:** Page body contains hero + uploader + 3 generic capability cards. No how-to, no FAQ, no examples (before/after gallery), no tips section, no cross-links to other tools, no privacy reassurance specifically for the emotional persona ("upload my grandma's photo").

**Why it matters:** "Old photo restoration" is a **competitive emotional purchase niche** dominated by MyHeritage, Hotpot.ai, Remini, and Etsy/Fiverr restoration sellers. Per the context doc, the persona is parents/families preserving memories — high emotional, high anxiety. A 4-card landing page won't earn trust *or* rank.

**Fix:** Match the structure of `/product-photo-background-remover/` and `/portrait-background-remover/`:
- Add `<h2>How to Restore an Old Photo</h2>` 3-step section
- Add before/after example gallery (need 3–4 sample restorations as `.webp` in `/examples/`)
- Add `<h2>FAQ</h2>` with 5–6 Q&As targeting: "Will my photo be safe?", "Does it work on damaged/torn photos?", "Can I print the result?", "Does it colorize?", "How big can the original be?"
- Add visible privacy section (this persona cares disproportionately)
- Add cross-link section to `/portrait-background-remover/` and `/`
- Add `FAQPage` + `BreadcrumbList` + `HowTo` schema once visible content is in place

**Estimated impact:** High. This is the most under-developed P1 page. Realistic ceiling: top 20 within 3 months, top 10 within 6 if backed by content.

---

### H2. Watermark-remover is thin AND lacks the compliance positioning

**Page:** [watermark-remover/index.html](watermark-remover/index.html) (214 lines).

**Issue:** Two problems on one page:
1. **Content depth** — same shape as old-photo: hero + tool + 3 cards. No how-to, no visible FAQ, no examples.
2. **Compliance positioning is too soft.** Per `.agents/product-marketing-context.md`, this tool must be positioned as "remove watermarks from your own photos." Current copy says "when you have permission to edit the image" buried at line 189, but the H1 is just "AI Watermark Remover" and the keyword meta targets generic `watermark remover, remove watermark from image`. This raises Google "low-quality / piracy" risk that can drag the whole domain.

**Why it matters:** Compliance: avoid algorithmic / manual quality penalty across the domain. Content depth: ranking ceiling for "watermark remover" is intentionally lower (per context doc), but for the queries we *do* want (own-asset cleanup, screenshot artifacts, date-stamp removal) the page needs more substance.

**Fix:**
- Tighten the H1 framing: "Remove Watermarks from Your Own Photos" (preserves keyword while signaling intent)
- Add a prominent "What this tool is for / not for" callout near the hero — explicit disclaimer about not removing third-party copyright watermarks
- Add visible FAQ section (also fixes C1 for this page) with at least one Q&A explicitly addressing the legitimate-use boundary
- Add 3-step how-to ("paint the area > AI fills > download")
- Add a use-case grid: "Date stamps from old phone photos", "Logos on your own product shots", "Subtitles you burned in", "Screenshot UI artifacts"
- Add `FAQPage` + `BreadcrumbList` + `HowTo` schema (after visible content)

**Estimated impact:** High for compliance protection (whole-domain risk). Medium for ranking — this niche has a structural ceiling.

---

### H3. ID-photo-maker is functionally rich but content-thin

**Page:** [id-photo-maker/index.html](id-photo-maker/index.html) (253 lines).

**Issue:** The tool itself is **the most feature-complete on the site** (size presets, color picker, head ratio, target KB, paper layout). But the SEO content area is just a single `<section>` with H2 + paragraph + 3 cards. No how-to, no visible FAQ (despite FAQ in schema → C1 above), no per-country guidance.

**Why it matters:** "Passport photo maker free" is a **highly searched commercial intent** keyword (people about to apply for visas/jobs) competing against PassportPhotoOnline (paid) and IDPhoto4You. The tool deserves to rank but the content doesn't yet earn the position.

**Fix:**
- Add visible FAQ section (resolves C1)
- Add per-country sub-section: "China 1-inch & 2-inch", "US Passport (2x2)", "Schengen Visa", "Japan Visa", "UK Passport" — each as a small block with the actual size requirements. **This is high-converting long-tail bait.**
- Add 4-step how-to with `HowTo` schema
- Add 4–6 example screenshots showing the tool output for different presets
- Add cross-link section to `/portrait-background-remover/` and `/`

**Estimated impact:** High. ID photo is the highest commercial-intent traffic on the site. Per-country sub-sections also unlock programmatic SEO opportunities (`/id-photo-maker/us-passport-photo/`, etc., later).

---

### H4. No `HowTo` schema anywhere despite 3 pages having "How to..." sections

**Pages:** Home (line 284: "How to Remove Background from an Image"), product-photo (line 172), portrait (line 164) — all have step-by-step "How to" sections in HTML but no corresponding `HowTo` JSON-LD.

**Why it matters:** `HowTo` schema is a top citation source for both Google "how to" rich results AND AI assistants (ChatGPT, Perplexity, Claude image queries). It's also one of the easiest "free" wins.

**Fix:** Add `HowTo` JSON-LD on home, product-photo, portrait. Pattern (for home):
```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Remove Background from an Image",
  "description": "Upload a photo, let AI remove the background, and download a transparent PNG.",
  "totalTime": "PT5S",
  "tool": [{"@type": "HowToTool", "name": "MiaoCut Background Remover"}],
  "step": [
    {"@type": "HowToStep", "position": 1, "name": "Upload Your Image",
     "text": "Upload a JPG, PNG, or WebP image. No signup or credit card required.",
     "url": "https://miaocut.app/#upload"},
    {"@type": "HowToStep", "position": 2, "name": "AI Removes the Background",
     "text": "MiaoCut's AI detects the subject and removes the background automatically..."},
    {"@type": "HowToStep", "position": 3, "name": "Download Transparent PNG",
     "text": "Download your HD cutout as a transparent PNG with no watermark."}
  ]
}
```

**Estimated impact:** Medium-high. Direct lift on rich results CTR + significant GEO win (AI assistants love `HowTo`).

---

### H5. No `Organization` or author schema for E-E-A-T

**Pages:** All 6.

**Issue:** No `Organization` or `Person` JSON-LD anywhere. Google's E-E-A-T signal in 2026 (especially for AI Overviews) weighs author/publisher credibility heavily. The README explicitly positions MiaoCut as "built by an independent developer" — but no machine-readable signal communicates this.

**Fix:** Add a single `Organization` schema in `index.html` `<head>` (it propagates to the domain):
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "MiaoCut",
  "url": "https://miaocut.app/",
  "logo": "https://miaocut.app/og/home.png",
  "description": "Free, no-signup AI photo toolkit — background remover, watermark eraser, old photo restoration, product photo enhancer, and ID photo maker.",
  "founder": {"@type": "Person", "name": "<your name or handle>"},
  "sameAs": [
    "https://github.com/<repo-url>",
    "https://huggingface.co/spaces/midcodex/miao_cut"
  ]
}
```
And tighten each `WebApplication` to add `"publisher": {"@type": "Organization", "name": "MiaoCut", "url": "https://miaocut.app/"}`.

**Estimated impact:** Medium-high. Foundational for AI search citation. Cheap to ship.

---

### H6. Internal linking dead-ends on watermark, old-photo, id-photo

**Pages:** [watermark-remover/index.html](watermark-remover/index.html), [old-photo-restoration/index.html](old-photo-restoration/index.html), [id-photo-maker/index.html](id-photo-maker/index.html).

**Issue:** None of these three pages have a "More MiaoCut Tools" cross-link section at the bottom (compare to product-photo and portrait which both do). Internal link equity flowing *into* these pages goes nowhere; they don't pass link equity *back* to siblings.

**Fix:** Copy the `<section>` cross-link block from `/product-photo-background-remover/index.html` lines 322–341 to the bottom of these three pages, with appropriate sibling links (each page should link to the 2 most thematically related siblings + home).

**Estimated impact:** Medium. Improves crawl distribution and gives users next-step actions.

---

### H7. Bilingual (zh/en) is JS-toggled on a single URL — Google can only index English

**Pages:** All 6.

**Issue:** `<html lang="en">` is hardcoded; Chinese content lives entirely in `MIAOCUT_PAGE_I18N.zh` and is swapped via JS after page load. Same URL serves both languages. There is no `hreflang`, no `?lang=` parameter, and no `/zh/` URL prefix.

**Why it matters:** Per the context doc, English is the priority — that's fine. **But the current setup means Chinese content is invisible to search engines** even though it exists. Two paths:

**Decision needed:** Pick one of:
- **Path A — Stay English-first, accept zh as UX-only (recommended for now).** No code changes. Stop investing in Chinese SEO copy. Document this in `.agents/product-marketing-context.md` so future skills don't waste effort on Chinese keywords.
- **Path B — Make zh indexable.** Move to URL-based locale (`/zh/` prefix or `/zh-CN/` subdirectory), serve different static HTML per locale, add `<link rel="alternate" hreflang>` on all pages, add `xhtml:link` to sitemap. This is a meaningful architecture change (~1–2 days work) but unlocks Chinese organic traffic if you want it.

**Fix (assuming Path A):**
- Update `.agents/product-marketing-context.md` to note: "Chinese is JS-toggled UX only; not indexed; do not invest in Chinese SEO."
- Optional: Add `<meta name="robots" content="index,follow">` and consider removing the Sogou + Baidu verification meta tags (lines 6–7 of every page) since they target Chinese search engines that won't index single-URL content properly anyway.

**Estimated impact:** Medium (avoids wasted future effort) — or High if you switch to Path B and want Chinese traffic.

---

### H8. Title tags exceed 60 characters on 2 pages → SERP truncation

**Pages:**
- [old-photo-restoration/index.html:9](old-photo-restoration/index.html#L9) — "Old Photo Restoration - Restore and Upscale Photos Online | MiaoCut" (67 chars)
- [id-photo-maker/index.html:7](id-photo-maker/index.html#L7) — "ID Photo Maker - Free AI Passport Photo & Headshot Tool | MiaoCut" (65 chars)

**Why it matters:** Google truncates around 580px (~55–60 chars on desktop SERP). Truncated titles lose CTR and the most important keyword often falls off.

**Fix:**
- Old-photo: `Free AI Old Photo Restoration & Upscaler | MiaoCut` (50 chars)
- Id-photo: `Free Passport & ID Photo Maker Online | MiaoCut` (47 chars)

**Estimated impact:** Low-medium (CTR uplift + cleaner SERP appearance).

---

## MEDIUM PRIORITY — ship in 1–2 months (P2)

### M1. Missing `FAQPage` schema on portrait and product-photo pages

Both pages have visible FAQ sections in HTML (product-photo lines 282–319, portrait lines 270–310) but no `FAQPage` JSON-LD. Add it — direct rich-result eligibility.

### M2. Missing `BreadcrumbList` schema on watermark, old-photo, id-photo

Product-photo and portrait both have it (good). The other 3 don't. Same pattern, easy win — adds breadcrumb to SERP, lifts CTR.

### M3. Sitemap entries lack image annotations

[sitemap.xml](sitemap.xml) lists URLs but no `<image:image>` extension. For a visual tool, including the OG images (or example cutouts) in sitemap helps with image search indexing.

### M4. Sitemap `lastmod` dates are stale

Sitemap shows 2026-04-27 / 2026-04-29 / 2026-04-30 (today is 2026-05-14, ~2 weeks stale). Should be auto-generated as part of the Cloudflare Pages build, not hand-edited. Add a small `scripts/build-sitemap.mjs` that computes `lastmod` from each file's git mtime.

### M5. Three different header markup styles across 6 pages

- Home uses sticky header (`sticky top-0 z-30 bg-white/95 backdrop-blur`)
- Product/portrait use `relative z-10 px-8 py-6` (not sticky)
- Watermark/old-photo/id-photo use `relative bg-white border-b` with internal `mx-auto max-w-6xl` (third variant)

Not directly an SEO issue but creates UX inconsistency users notice as they navigate. Pick one — recommend the home page's sticky version for all sub-pages.

### M6. `preconnect` to api2.miaocut.app and umami inconsistent across pages

Home, watermark, old-photo include them (lines 12–13 of home). Product-photo, portrait, id-photo don't. ~100–300ms upload latency improvement on first interaction. Add the 2 `<link rel="preconnect">` lines to the 3 missing pages.

### M7. No images on watermark, old-photo, id-photo SEO content sections

These pages render zero images outside the tool UI itself. Misses (a) image-search traffic, (b) engagement signal, (c) AI assistants that surface visual examples. Add 2–4 `.webp` examples per page (before/after pairs work great) following the existing `/examples/` pattern.

### M8. No `aggregateRating` schema (because no reviews yet)

Once you collect a few user testimonials via the feedback endpoint (see context doc Open Questions), surface 5–10 of them with a `Review` + `aggregateRating` block on home. Star ratings in SERP = significant CTR uplift.

---

## NICE-TO-HAVE — when you have time (P3)

### N1. Bookmark banner overlaps sticky header on initial paint

`#bookmark-banner` is `fixed top-0` with `z-50`, the header is `z-30` — banner covers it. Visible only on first visit before user dismisses. Consider lowering banner z-index, or rendering it below the header.

### N2. Add `<image:image>` to sitemap (see M3 expansion)

### N3. Add `Person` author schema with `sameAs` to GitHub repo

Strengthens "indie developer" trust signal called out in the context doc. Sample shape under H5.

### N4. Robots.txt `Disallow:` line is a no-op

Line 3 of [robots.txt](robots.txt) is just `Disallow:` (empty) — equivalent to nothing. Either remove it or write what you actually want disallowed (e.g., nothing — robots is fine being just User-agent + Sitemap).

### N5. No explicit `<meta name="robots" content="index,follow">` on pages

Default behavior is index+follow so this is purely cosmetic, but explicit is clearer for audit tools.

---

## What's already good (don't change)

- ✅ All 6 pages have unique title, description, canonical, OG tags, Twitter card
- ✅ Per-page OG images exist (`/og/*.png`)
- ✅ All 6 pages have `WebApplication` JSON-LD
- ✅ Home has rich `FAQPage` JSON-LD (8 entries)
- ✅ Product-photo and portrait have `BreadcrumbList` schema
- ✅ Home example images use webp + 256/512 srcset + lazy + decoding async + width/height (textbook responsive image)
- ✅ `output.css` is 21KB minified (small CSS budget)
- ✅ Umami analytics is `defer`-loaded (non-blocking)
- ✅ Cloudflare Pages `_headers` has thoughtful caching strategy
- ✅ Domain has Google + Sogou + Baidu verification
- ✅ Sitemap includes all 6 main URLs with `priority` and `changefreq`
- ✅ Internal nav links to all sub-tools from every page
- ✅ Single H1 per page; H2/H3 hierarchy is clean
- ✅ No render-blocking JS (all scripts at end of body or `defer`)

---

## Suggested execution order

This isn't priority order — it's *dependency* order: each step compounds with the next.

1. **Week 1, Day 1–2 (Critical):** Fix C1 — add visible FAQ sections to watermark and id-photo pages (or remove the FAQ schema). Pick one approach now.
2. **Week 1, Day 3:** Fix H8 (title length) and H7 (decide Path A or B for i18n). These are 30-minute decisions/edits.
3. **Week 1, Day 4–5:** Fix H4 (HowTo schema on home/product/portrait) and H5 (Organization schema). Pure JSON additions, no copy work.
4. **Week 2:** Fix H1, H2, H3 — content depth on the 3 thin pages. This is the biggest investment but the biggest payoff. Order by ROI: H3 (id-photo, highest commercial intent) → H1 (old-photo, distinct persona) → H2 (watermark, ceiling-limited).
5. **Week 3:** Fix H6 (cross-links), M1 + M2 (FAQPage + BreadcrumbList schema gaps), M5 (header consistency), M6 (preconnect).
6. **Week 4+:** M3, M4, M7 (sitemap improvements + add images to sub-pages). Then nice-to-haves as bandwidth allows.

After this run, kick off **`ai-seo`** (GEO/AEO/LLMO optimization) — most of its recommendations build on H4 + H5 being in place.

---

## Files referenced

- [index.html](index.html) — home
- [product-photo-background-remover/index.html](product-photo-background-remover/index.html)
- [portrait-background-remover/index.html](portrait-background-remover/index.html)
- [watermark-remover/index.html](watermark-remover/index.html)
- [old-photo-restoration/index.html](old-photo-restoration/index.html)
- [id-photo-maker/index.html](id-photo-maker/index.html)
- [robots.txt](robots.txt)
- [sitemap.xml](sitemap.xml)
- [_headers](_headers)
- [tailwind.config.js](tailwind.config.js)
- Context: [.agents/product-marketing-context.md](.agents/product-marketing-context.md)
