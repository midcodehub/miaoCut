# Old Photo Restoration Design

## Goal

Add a MiaoCut tool for old photo restoration and HD export without destabilizing the existing background remover. The first shipped slice should be usable today, while the architecture must be ready for a stronger AI provider.

## Model Choice

Recommended production pipeline:

1. Face restoration: GFPGAN for public/commercial-safe face repair, or CodeFormer only if its license fits the deployment.
2. Whole-image upscaling: Real-ESRGAN 2x/4x for background, clothes, texture, and non-face regions.
3. Composition: blend restored faces back into the Real-ESRGAN output with face masks, then final JPEG/PNG encoding.

Why this choice:

- GFPGAN is a widely used blind face restoration model from TencentARC and pairs naturally with Real-ESRGAN for the whole image.
- Real-ESRGAN is the practical default for general photo super-resolution and has mature open-source implementations.
- CodeFormer has strong quality controls for faces, but it needs an explicit license review before public commercial use.
- The older "Bringing Old Photos Back to Life" style pipeline is useful for scratches and severe degradation, but it is harder to productize as a fast public web tool.

## Backend Architecture

Do not load restoration models in the current `main.py` process by default. The existing Hugging Face CPU Space already runs BiRefNet and has strict memory/concurrency assumptions.

Implementation shape:

- Public API: `POST /api/old-photo/restore`
- Default provider: local OpenCV fallback for denoise, contrast recovery, sharpening, and Lanczos upscale.
- Production AI provider: configure `RESTORE_PROVIDER_URL` and optional `RESTORE_PROVIDER_TOKEN`.
- Isolation: host GFPGAN/Real-ESRGAN on a separate GPU Space, Replicate/Fal endpoint, or a private worker.
- Concurrency: separate `RESTORE_MAX_CONCURRENCY` from `MAX_CONCURRENCY` so restoration cannot starve background removal.
- Limits: reuse upload MIME, size, pixel, Origin, CORS, and IP rate-limit patterns from existing APIs.

This gives us a working feature now and a clean switch to stronger restoration later.

## Frontend UX

Use a dedicated route: `/old-photo-restoration/`.

First viewport:

- Same restrained MiaoCut navigation as the ID photo tool.
- Left: upload card and compact controls.
- Right: before/after preview.
- Primary action: `Restore Photo`.
- Controls: repair strength and output scale.
- Result: preview in page plus explicit download button.

The page is intentionally a tool surface, not a marketing landing page. SEO support lives below the working UI in three small cards.

## Rollout

Phase 1:

- Ship route, page, new API, local fallback, sitemap, navigation, and CSS build.
- Track upload/success/failure/download events through Umami.

Phase 2:

- Deploy a separate restoration provider.
- Set `RESTORE_PROVIDER_URL` in production.
- Add provider health logging and latency buckets.

Phase 3:

- Add face/detail toggles only after the provider exposes real face restoration controls.
- Add sample gallery with before/after assets.
