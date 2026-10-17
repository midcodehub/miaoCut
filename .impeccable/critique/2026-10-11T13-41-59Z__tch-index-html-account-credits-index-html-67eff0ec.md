---
target: 会员模块（定价/批量/账户/入口）
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:/private/tmp/claude-501/-Users-wuchao-git-miaoCut/8d4f64c4-4d50-40db-ab2c-f573eacba2a0/scratchpad/wt-umami/pricing/index.html batch/index.html account/credits/index.html"
timestamp: 2026-10-11T13-41-59Z
slug: tch-index-html-account-credits-index-html-67eff0ec
---
⚠️ DEGRADED: single-context (sub-agents only on explicit user request in this harness)

## Design Health Score: 30/40 (Good)  — first run 17/40
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | progress + persistent result grid, resume after refresh, bounded polling; no per-file upload bytes |
| 2 | Match System / Real World | 3 | Standard / Fine edges, platform-named outputs; "credit" still needs the FAQ |
| 3 | User Control and Freedom | 3 | remove/clear files, retry failed, new batch, check-again; cannot cancel a running batch |
| 4 | Consistency and Standards | 3 | one Tailwind system, header, ink buttons on all 3 pages; logo teal vs emerald still legacy |
| 5 | Error Prevention | 3 | cost vs balance before start, skipped-file notice, already-subscribed guard |
| 6 | Recognition Rather Than Recall | 3 | balance in header, output previews, estimator recommends packs/plans |
| 7 | Flexibility and Efficiency | 3 | switch output after processing, ←/→ viewer, single download; no folder drop |
| 8 | Aesthetic and Minimalist Design | 3 | product-specific demo with real cutouts; pricing dense when plans are on |
| 9 | Error Recovery | 3 | plain-language errors with retry / check again; per-image reasons still generic |
| 10 | Help and Documentation | 3 | 9 FAQ items on pricing, inline hints; batch page links to pricing only |

## Design Specificity
Now authored for e-commerce sellers: batch page demonstrates the three output formats on real cutouts, Amazon main image preset, per-photo price as the headline number. Detector: 0 real findings (Geist font and padding-on-rows are false positives).

## Fixed since first run
P1 batch page separate system; P1 logged-out login wall; P1 results vanish; P2 pricing green buttons + no guidance; P2 raw error codes; dark-mode logo; Pro badge; 20+ vs 200; ledger freeze/release confusion; account TDZ bug; endless resume polling.

## Remaining (P2/P3)
- [P2] Not yet verified against the real gateway / Stripe test mode (mocked end to end).
- [P3] Logo teal #1eb8a7 vs emerald brand (brand decision).
- [P3] No folder drop, no per-file upload progress.
- [P3] Pricing page shows 7 price rows when plans are enabled; consider collapsing packs behind plans later.
