---
target: 会员模块（定价/批量/账户/入口）
total_score: 17
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/private/tmp/claude-501/-Users-wuchao-git-miaoCut/8d4f64c4-4d50-40db-ab2c-f573eacba2a0/scratchpad/wt-umami/pricing/index.html batch/index.html account/credits/index.html"
timestamp: 2026-10-11T09-21-50Z
slug: tch-index-html-account-credits-index-html-67eff0ec
---
⚠️ DEGRADED: single-context (sub-agents only on explicit user request in this harness)

## Design Health Score: 17/40 (Poor)
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | showResults() hides progress card; thumbnails vanish after completion |
| 2 | Match System / Real World | 2 | "Pro" badge with no Pro plan; "Batch (reserved)" jargon; "Fine hair" meaningless for product photos |
| 3 | User Control and Freedom | 1 | cannot remove a single selected file or clear selection; no cancel |
| 4 | Consistency and Standards | 1 | batch page separate CSS/system font/lowercase teal logo/no dark mode; login implemented 3 ways |
| 5 | Error Prevention | 2 | cost not compared to balance; >200 / wrong type files silently dropped |
| 6 | Recognition Rather Than Recall | 3 | options visible; balance in batch header |
| 7 | Flexibility and Efficiency | 2 | no folder drop, no per-image retry, transparent WebP only |
| 8 | Aesthetic and Minimalist Design | 2 | generic 4 identical pricing cards; blank logged-out batch page |
| 9 | Error Recovery | 1 | raw codes (create_500, upload_network); alert() on checkout failure; failed image only ✕ |
| 10 | Help and Documentation | 1 | no FAQ, no "how many credits do I need", no mode explanation |

## Design Specificity
Category-interchangeable SaaS pricing; no product imagery or checkerboard anywhere in the paid module. Detector: pricing 11 low-contrast (#059669 buttons/prices 3.8:1), account 5 (green button, "or" 2.4:1, placeholder 2.5:1), batch 12 design-system drifts (radius 14/10px, font sizes 13/15/17/20/26/28px, teal #14b8a6 2.4:1). False positives: overused-font Geist (intentional), broken-image src="" (hidden placeholder).

## Priority Issues
1. [P1] Batch page is a separate design system (own <style>, system font, teal lowercase logo, no dark mode, no footer). Fix: rebuild on shared Tailwind/header/footer + DESIGN.md components. Cmd: shape → polish.
2. [P1] Logged-out batch page is only a login box; it is the target of the rate-day modal and home batch door. Fix: show sample before/after grid (examples/*.webp), 3-step flow, 100 free credits ≈ 100 images, price per image, then login. Cmd: onboard.
3. [P1] Results vanish on completion (progress card hidden), failed images show no reason and cannot be retried. Fix: keep grid on checkerboard, compare view, failure reason, "retry N failed", single download. Cmd: harden.
4. [P2] Pricing does not help choose; 4 green primary buttons violate One Accent and fail contrast. Fix: ink pill buttons, per-image price as headline, volume hint, short FAQ, slot for monthly subscription. Cmd: layout + clarify.
5. [P2] No recovery: raw error codes, alert(), cannot deselect files, silent drop of unsupported/over-limit files. Cmd: clarify + harden.

## Persona Red Flags
- Lin (cross-border Amazon seller): batch outputs transparent WebP only; Amazon main image needs white background JPEG/PNG; editor presets exist for single image but not batch.
- Alex (power user): no folder drop, no single-file removal, no per-image retry; ZIP renames to _removed.webp.
- Jordan (first-timer): rate-day modal → login wall; "Pro" badge with no Pro plan; "20+ images" vs "up to 200".

## Minor Observations
- Dark mobile header: cat logo nearly invisible, wordmark hidden.
- Ledger shows "Batch (reserved) -25" then "Returned +1"; should collapse per batch.
- Lightbox close lacks aria-label; chips not keyboard-focusable.
- Cost line not compared with balance.
- Per-image price is small gray text though it is the strongest argument.

## Questions to Consider
- Could the batch page itself be the paid module's storefront (value when logged out, work when logged in)?
- Should the results view be designed around review rather than ZIP download?
- Would white-background/square presets in batch move paid conversion more than any visual polish?
