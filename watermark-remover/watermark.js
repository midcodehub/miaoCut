(function () {
    'use strict';

    const _isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE = _isLocal ? 'http://localhost:8000' : 'https://api2.miaocut.app';
    const API_URL = `${API_BASE}/api/remove-watermark`;

    // ============================================================
    // i18n 字典
    // ============================================================
    // 单一来源（single source of truth）：
    //   - 运行时 applyLanguage 从这里读 <title>、<meta description/keywords>、og:*
    //   - scripts/build-i18n.mjs 也读 i18n.zh，把 zh/watermark-remover/index.html 的对应 meta 写死
    // 改任意 key 后必须跑 `npm run build:i18n` 同步 zh 静态页，并把改动 commit 进仓库。
    //
    // 词汇策略（合规 + SEO）：
    //   把工具定位扩展到 Object Eraser / Blemish Remover / Date Stamp Removal 等"画面修复"语义，
    //   既拓宽长尾关键词，也降低被 DMCA / 版权机构定向打压的概率。Watermark Remover 仍保留作为
    //   主关键词以维持 SEO 排名，但页面文案 / FAQ / footer 都要明确"仅用于你拥有版权的图片"。
    const i18n = {
        en: {
            // SEO meta（applyLanguage 从这里读，覆盖静态 HTML 的 meta；build-i18n.mjs 不读 EN 这部分）
            pageTitle: 'AI Object Eraser & Watermark Remover - Clean Photos Online | MiaoCut',
            metaDescription: 'Free AI object eraser & blemish remover. Paint over date stamps, distracting objects, or your own watermarks — AI fills the area in cleanly. No signup, no watermark on output.',
            metaKeywords: 'object eraser, watermark remover, blemish remover, photo cleanup, image inpainting, object remover, remove date stamp, ai photo eraser, lama inpainting, clean photo background',
            ogTitle: 'Free AI Object Eraser & Watermark Remover | MiaoCut',
            ogDescription: 'Paint over date stamps, distracting objects, or watermarks on your own photos — AI fills in cleanly. Free and no signup.',
            ogLocale: 'en_US',

            navBg: 'Background Remover',
            navId: 'ID Photo',
            navRestore: 'Old Photo',
            navWatermark: 'Watermark',
            navPortrait: 'Portrait',
            navProduct: 'Product',
            eyebrow: 'Object eraser · Blemish remover · Date stamps · Distracting objects',
            heroTitle: 'AI Object Eraser & Watermark Remover',
            heroSub: 'Upload one of your own photos, paint over the unwanted object or watermark, and let AI fill in the area cleanly.',
            // 合规 callout：紧贴 hero 显示，第一时间告诉用户和爬虫这是"自有素材"工具
            ownershipNotice: 'For photos you own.',
            ownershipBody: 'Use MiaoCut to clean up your own assets — date stamps, screenshot artifacts, your own logos, distracting objects. Don\'t use it to remove third-party copyright watermarks.',
            uploadText: 'Click to upload JPG, PNG, or WebP',
            uploadHint: 'High-resolution images with small marks work best',
            replaceHint: 'Click to replace this image',
            brushLabel: 'Brush size',
            clearBtn: 'Clear mask',
            processBtn: 'Remove',
            downloadBtn: 'Download result',
            loading: 'AI is repairing the image...',
            tipsTitle: 'Best results',
            tipsBody: 'Paint slightly beyond the edge of what you want to erase. Use a smaller brush near detailed areas.',
            sourceTitle: 'Paint mask',
            sourceSub: 'Cover only the object, blemish, or watermark you want to remove.',
            resultTitle: 'Result',
            resultSub: 'The repaired image will appear here.',
            emptySource: 'Upload an image to start painting',
            emptyResult: 'No result yet',
            seoTitle: 'Erase objects, watermarks, and blemishes from your own photos',
            seoBody: 'MiaoCut\'s AI object eraser lets you mark the exact area to repair. It is useful for date stamps, screenshot artifacts, distracting objects, your own logos, and watermarks on photos you own or have explicit permission to edit.',
            seoCard1: 'Manual precision',
            seoCard1Body: 'Paint exactly where the unwanted content appears instead of guessing with unreliable auto detection.',
            seoCard2: 'LaMa inpainting',
            seoCard2Body: 'The painted area is repaired using LaMa — an open-source large-mask AI inpainting model.',
            seoCard3: 'Private workflow',
            seoCard3Body: 'Images are processed in-memory and discarded immediately. Never used for AI training.',
            // How-to 三步：用 HowTo schema 让 Google 抓取，让"如何擦除..."这类长尾词能命中
            howToTitle: 'How to Erase Objects, Watermarks, and Blemishes',
            howStep1Title: '1. Upload your image',
            howStep1Body: 'Upload a JPG, PNG, or WebP from your own collection. No signup or credit card required.',
            howStep2Title: '2. Paint over the area',
            howStep2Body: 'Use the brush to cover the object, blemish, or your own watermark. Paint slightly beyond the edges for cleaner results.',
            howStep3Title: '3. Download the cleaned image',
            howStep3Body: 'AI uses LaMa inpainting to fill the painted area based on the surrounding context. Preview the result and download.',
            uploadFirst: 'Upload an image first.',
            paintFirst: 'Paint the area you want to remove first.',
            formatErr: 'Only JPG / PNG / WebP formats are supported',
            failed: 'Processing failed',
            faqTitle: 'Frequently Asked Questions',
            faq1Q: 'What kinds of content can I erase with this tool?',
            faq1A: 'MiaoCut works on small unwanted content in your photos: distracting objects, date stamps from your phone camera, screenshot artifacts, burned-in subtitles, your own logos on product shots, and watermarks on photos you own or have explicit permission to edit.',
            faq2Q: 'Can I remove watermarks from photos I don’t own?',
            faq2A: 'No. MiaoCut is for editing photos you own or have explicit permission to edit. Do not use it to remove copyright watermarks from stock photos, social media content, AI-generated imagery, or any image you do not have the rights to — that may violate copyright law (for example, DMCA §1202 in the US) and equivalent statutes in other jurisdictions.',
            faq3Q: 'How does the AI repair the painted area?',
            faq3A: 'MiaoCut uses LaMa (Large Mask Inpainting), an open-source AI model. It analyzes the surrounding pixels and fills in the painted area to match the rest of the image.',
            faq4Q: 'What kinds of images work best?',
            faq4A: 'High-resolution photos where the mark covers a small portion of the image, and the surrounding background has enough visual context (sky, plain wall, even texture). Marks across complex content like faces or detailed patterns are harder to repair cleanly.',
            faq5Q: 'Are my images uploaded or stored anywhere?',
            faq5A: 'Images are processed in-memory on the server and discarded immediately after the result is returned. We never store your image, never use it for AI training, and there is no signup required.',
            faq6Q: 'Why does my result look blurry or unclean?',
            faq6A: 'Try painting slightly beyond the edge with a smaller brush. For very large marks or marks across detailed content, results may be limited — this tool works best on small, well-bounded areas with simple surroundings.',
            // Footer 法律声明：DMCA 避风港姿态 + 用户责任声明
            footerLegalTitle: 'Acceptable Use & Legal Notice',
            footerLegalBody1: 'MiaoCut\'s object eraser is intended for cleaning up images that you own or have explicit permission to edit. Common acceptable uses include removing date stamps from your own phone photos, erasing your own logos for redesign, removing screenshot artifacts, and cleaning up your own product shots.',
            footerLegalBody2: 'Do not use this tool to remove copyright watermarks from stock photos, social media content, AI-generated imagery, or any image you do not own or have rights to. Removing copyright notices may violate copyright law (for example, DMCA §1202 in the United States) and equivalent statutes in other jurisdictions.',
            footerLegalBody3: 'MiaoCut processes uploaded images in-memory and discards them immediately. We do not store or train on user uploads. By using this tool, you confirm that you have the right to edit the image you upload. We comply with DMCA takedown procedures — if you believe content has been processed in violation of your rights, please contact us.',
            // Cross-link section
            moreTitle: 'More MiaoCut Tools',
            moreLinkBgTitle: 'AI Background Remover →',
            moreLinkBgDesc: 'One-click transparent PNG cutout for any photo.',
            moreLinkOldPhotoTitle: 'Old Photo Restoration →',
            moreLinkOldPhotoDesc: 'Restore faded family photos, reduce noise, sharpen details.',
            footerToolsTitle: "All MiaoCut Tools",
            footerCatRemove: "AI Background Removal",
            footerCatConvert: "Format Conversion",
            footerCatRepair: "Photo Repair & Enhancement",
            footerTagline: "MiaoCut · Free AI image tools that respect your privacy.",
            toolBgTitle: "Remove Background",
            toolProductTitle: "Product",
            toolPortraitTitle: "Portrait",
            toolIdTitle: "ID Photo",
            toolJpgPngTitle: "JPG → Transparent PNG",
            toolPngJpgTitle: "PNG → JPG",
            toolWatermarkTitle: "Watermark",
            toolRestoreTitle: "Old Photo",
        },
        zh: {
            // SEO meta（被 scripts/build-i18n.mjs 用来生成 zh/<page>/index.html 的
            // <title>、<meta description/keywords>、og:title/description/locale。
            // 改这些 key 后跑 npm run build:i18n 同步 zh 静态页。）
            pageTitle: 'AI 物体擦除 & 去水印 - 免费图片瑕疵清理工具 | MiaoCut',
            metaDescription: '免费 AI 物体擦除与瑕疵修复工具。涂抹日期戳、干扰物或自有水印，AI 智能填补 —— 仅用于你自己拥有版权的照片。无需注册、无水印。',
            metaKeywords: '物体擦除,去水印,瑕疵修复,图片清理,AI 修图,LaMa 修复,日期戳擦除,画面修复,自有水印清理,AI 照片擦除',
            ogTitle: '免费 AI 物体擦除 & 去水印工具 | MiaoCut',
            ogDescription: '涂抹日期戳、干扰物或自有水印，AI 智能填补 —— 只用于你自己的照片，免费、无需注册。',
            ogLocale: 'zh_CN',
            navBg: 'AI 抠图',
            navId: '证件照',
            navRestore: '老照片修复',
            navWatermark: '去水印',
            navPortrait: '人像',
            navProduct: '商品图',
            eyebrow: '物体擦除 · 瑕疵修复 · 日期戳 · 干扰物清理',
            heroTitle: 'AI 物体擦除与去水印工具',
            heroSub: '上传你自己拥有的照片，涂抹想要清除的物体、瑕疵或水印，AI 自动智能填补该区域。',
            ownershipNotice: '仅限你自己拥有的照片。',
            ownershipBody: '本工具适合处理你拥有版权的图片：日期戳、截图残留、自家 Logo、干扰物等。请勿用于去除第三方版权水印。',
            uploadText: '点击上传 JPG、PNG 或 WebP',
            uploadHint: '水印较小、背景纹理连续的图片效果更好',
            replaceHint: '点击可替换图片',
            brushLabel: '画笔大小',
            clearBtn: '清除遮罩',
            processBtn: '去除水印',
            downloadBtn: '下载结果',
            loading: 'AI 正在修复图片...',
            tipsTitle: '效果建议',
            tipsBody: '涂抹时略微覆盖目标边缘；细节区域建议调小画笔。',
            sourceTitle: '涂抹遮罩',
            sourceSub: '只覆盖你想去除的物体、瑕疵或水印。',
            resultTitle: '处理结果',
            resultSub: '修复后的图片会显示在这里。',
            emptySource: '上传图片后开始涂抹',
            emptyResult: '暂无处理结果',
            seoTitle: '从你自己的照片中擦除物体、水印和瑕疵',
            seoBody: 'MiaoCut 的 AI 物体擦除工具支持手动标记需要修复的精确区域，适合处理日期戳、截图残留、干扰物、自家 Logo，以及你拥有版权或获得授权的照片上的水印。',
            seoCard1: '手动精确标记',
            seoCard1Body: '哪里有瑕疵就涂哪里，不依赖不稳定的自动识别。',
            seoCard2: 'LaMa 智能修复',
            seoCard2Body: '使用开源 LaMa 大遮罩图像修复 AI 模型，根据涂抹区域和上下文自动补全。',
            seoCard3: '隐私优先',
            seoCard3Body: '图片纯内存处理，结果返回后立即销毁，绝不用于 AI 训练。',
            howToTitle: '如何擦除物体、水印和瑕疵',
            howStep1Title: '1. 上传你的照片',
            howStep1Body: '上传你拥有版权的 JPG、PNG 或 WebP 照片，无需注册、无需信用卡。',
            howStep2Title: '2. 涂抹要清除的区域',
            howStep2Body: '用画笔覆盖物体、瑕疵或自有水印；涂抹时略微超出边缘，效果更干净。',
            howStep3Title: '3. 下载清理后的图片',
            howStep3Body: 'AI 用 LaMa 图像修复算法根据周围像素自动填补涂抹区域。预览结果后即可下载。',
            uploadFirst: '请先上传图片。',
            paintFirst: '请先涂抹需要去除的区域。',
            formatErr: '仅支持 JPG / PNG / WebP 格式的图片',
            failed: '处理失败',
            faqTitle: '常见问题',
            faq1Q: '这个工具能擦除哪些类型的内容？',
            faq1A: 'MiaoCut 适合处理你照片里小范围的多余内容：干扰物、手机相机的日期戳、截图残留、烧录字幕、自家商品图上的 Logo，以及你拥有版权或获得授权的照片上的水印。',
            faq2Q: '可以去除我没有版权的图片上的水印吗？',
            faq2A: '不可以。MiaoCut 仅用于编辑你拥有或明确获得授权的照片。请勿用它去除图库素材、社交媒体内容、AI 生成图像或任何你没有版权的图片上的水印 —— 这可能违反版权法（例如美国 DMCA §1202）以及其他司法辖区的相应法规。',
            faq3Q: 'AI 是怎么修复涂抹区域的？',
            faq3A: 'MiaoCut 使用 LaMa（Large Mask Inpainting）开源 AI 模型，根据周围像素分析并填补涂抹区域，让它与画面其余部分自然衔接。',
            faq4Q: '什么样的图片处理效果最好？',
            faq4A: '高分辨率照片、水印只占画面一小块、周围背景有足够视觉信息（天空、纯色墙面、均匀纹理）。如果水印横跨人脸或复杂图案，修复效果会受限。',
            faq5Q: '我的图片会被上传或保存吗？',
            faq5A: '图片在服务器内存里处理，结果返回后立即销毁。我们绝不存储你的图片、绝不用于 AI 训练，也无需注册账号。',
            faq6Q: '处理结果看起来模糊或不干净怎么办？',
            faq6A: '试试画笔调小一点、涂抹时略微超出边缘。对于范围特别大或穿过复杂细节的水印，效果会有限 —— 本工具最适合背景简单、边界清晰的小范围区域。',
            footerLegalTitle: '使用规范与法律声明',
            footerLegalBody1: 'MiaoCut 物体擦除工具仅用于清理你拥有版权或已获得编辑授权的图片。常见的合规用途包括：去除手机照片的日期戳、清除你自家 Logo 以便重新设计、清理截图残留、整理自己拍摄的商品图等。',
            footerLegalBody2: '请勿使用本工具去除图库素材、社交媒体内容、AI 生成图像，以及任何你不拥有版权或未获授权图片上的版权水印。去除版权标识可能违反版权法律（例如美国 DMCA §1202）以及其他司法辖区的相应法规。',
            footerLegalBody3: 'MiaoCut 在服务器内存中处理上传的图片，处理完成后立即销毁。我们不存储用户上传的图片，也不用其训练模型。使用本工具即表示你确认拥有所上传图片的编辑权利。我们遵守 DMCA 下架程序 —— 如认为内容处理侵犯了你的权益，请联系我们。',
            moreTitle: '更多 MiaoCut 工具',
            moreLinkBgTitle: 'AI 抠图 →',
            moreLinkBgDesc: '一键生成透明 PNG 抠图。',
            moreLinkOldPhotoTitle: '老照片修复 →',
            moreLinkOldPhotoDesc: '修复褪色家庭照片，降噪并增强细节。',
            footerToolsTitle: "全部 MiaoCut 工具",
            footerCatRemove: "AI 抠图",
            footerCatConvert: "格式转换",
            footerCatRepair: "照片修复与增强",
            footerTagline: "MiaoCut · 免费、注重隐私的 AI 图片工具集。",
            toolBgTitle: "去除背景",
            toolProductTitle: "商品图",
            toolPortraitTitle: "人像",
            toolIdTitle: "证件照",
            toolJpgPngTitle: "JPG → 透明 PNG",
            toolPngJpgTitle: "PNG → JPG",
            toolWatermarkTitle: "去水印",
            toolRestoreTitle: "老照片",
        },
    };

    // 当前语言从静态 HTML 的 <html lang> 推断（构建时由 scripts/build-i18n.mjs 写死）。
    // 不再用 localStorage 决定语言：每个 URL（/watermark-remover/ vs /zh/watermark-remover/）已经
    // 是预渲染好的对应语种，让 Google 能分别索引，JS 只负责动态文案。
    const _htmlLang = (document.documentElement.lang || 'en').toLowerCase();
    const state = {
        lang: _htmlLang.startsWith('zh') ? 'zh' : 'en',
        file: null,
        sourceObjectUrl: null,
        resultObjectUrl: null,
        drawing: false,
        lastPoint: null,
        hasPaint: false,
    };

    const $ = (id) => document.getElementById(id);
    const imageInput = $('imageInput');
    const brushSize = $('brushSize');
    const brushValue = $('brushValue');
    const clearButton = $('clearButton');
    const processButton = $('processButton');
    const downloadButton = $('downloadButton');
    const emptyState = $('emptyState');
    const imageWrap = $('imageWrap');
    const sourceImage = $('sourceImage');
    const drawCanvas = $('drawCanvas');
    const resultBox = $('resultBox');
    const loading = $('loading');
    const statusText = $('status');
    const langSwitch = $('lang-switch');
    const fileName = $('file-name');
    const uploadHint = $('upload-hint');
    const drawCtx = drawCanvas.getContext('2d');

    function t(key) {
        return (i18n[state.lang] && i18n[state.lang][key]) || i18n.en[key] || key;
    }

    function track(name, data) {
        if (typeof umami === 'undefined') return;
        try {
            if (data) umami.track(name, data); else umami.track(name);
        } catch (_) { /* analytics should not affect editing */ }
    }

    function applyLanguage(lang) {
        state.lang = lang;
        localStorage.setItem('lang', lang);
        if (langSwitch) langSwitch.value = lang;
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });
        if (!state.file) {
            fileName.textContent = t('uploadText');
            uploadHint.textContent = t('uploadHint');
        }
        // 从字典读 <title>、meta description/keywords、og:* —— 单一来源，避免和 i18n 字典 + 静态 HTML 漂移
        document.title = t('pageTitle');
        const setMeta = (selector, value) => {
            const el = document.querySelector(selector);
            if (el && value) el.setAttribute('content', value);
        };
        setMeta('meta[name="description"]', t('metaDescription'));
        setMeta('meta[name="keywords"]', t('metaKeywords'));
        setMeta('meta[property="og:title"]', t('ogTitle'));
        setMeta('meta[property="og:description"]', t('ogDescription'));
        setMeta('meta[property="og:locale"]', t('ogLocale'));
        // <html lang> 由静态 HTML 在构建时写死（zh-CN / en）；不再 JS 动态覆盖
    }

    function setStatus(text) {
        statusText.textContent = text || '';
    }

    brushSize.addEventListener('input', () => {
        brushValue.textContent = brushSize.value;
    });

    imageInput.addEventListener('change', () => {
        const file = imageInput.files && imageInput.files[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setStatus(t('formatErr'));
            return;
        }

        state.file = file;
        state.hasPaint = false;
        setStatus('');
        clearResult();

        if (state.sourceObjectUrl) URL.revokeObjectURL(state.sourceObjectUrl);
        state.sourceObjectUrl = URL.createObjectURL(file);
        sourceImage.src = state.sourceObjectUrl;
        fileName.textContent = file.name;
        uploadHint.textContent = t('replaceHint');
        track('watermark-uploaded', { type: file.type.replace('image/', '') });
    });

    sourceImage.addEventListener('load', () => {
        emptyState.hidden = true;
        imageWrap.hidden = false;
        resizeCanvasToImage();
        clearDrawing();
        clearButton.disabled = false;
        processButton.disabled = false;
    });

    window.addEventListener('resize', () => {
        if (!imageWrap.hidden) {
            const snapshot = document.createElement('canvas');
            snapshot.width = drawCanvas.width;
            snapshot.height = drawCanvas.height;
            snapshot.getContext('2d').drawImage(drawCanvas, 0, 0);
            resizeCanvasToImage();
            drawCtx.drawImage(snapshot, 0, 0, drawCanvas.width, drawCanvas.height);
        }
    });

    clearButton.addEventListener('click', () => {
        clearDrawing();
        setStatus('');
    });

    processButton.addEventListener('click', processImage);

    downloadButton.addEventListener('click', () => {
        if (!state.resultObjectUrl) return;
        const a = document.createElement('a');
        const baseName = (state.file && state.file.name ? state.file.name : 'image').replace(/\.[^.]+$/, '');
        a.href = state.resultObjectUrl;
        a.download = `${baseName}_cleaned.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        track('watermark-downloaded');
    });

    drawCanvas.addEventListener('pointerdown', (event) => {
        if (!state.file) return;
        state.drawing = true;
        drawCanvas.setPointerCapture(event.pointerId);
        state.lastPoint = getCanvasPoint(event);
        paintLine(state.lastPoint, state.lastPoint);
    });

    drawCanvas.addEventListener('pointermove', (event) => {
        if (!state.drawing || !state.lastPoint) return;
        const nextPoint = getCanvasPoint(event);
        paintLine(state.lastPoint, nextPoint);
        state.lastPoint = nextPoint;
    });

    drawCanvas.addEventListener('pointerup', stopDrawing);
    drawCanvas.addEventListener('pointercancel', stopDrawing);
    drawCanvas.addEventListener('pointerleave', stopDrawing);

    async function processImage() {
        if (!state.file) {
            setStatus(t('uploadFirst'));
            return;
        }
        if (!state.hasPaint) {
            setStatus(t('paintFirst'));
            return;
        }

        setBusy(true);
        setStatus('');

        try {
            const maskBlob = await createBlackWhiteMaskBlob();
            const formData = new FormData();
            formData.append('image', state.file, state.file.name || 'image.png');
            formData.append('mask', maskBlob, 'mask.png');

            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || t('failed'));
            }

            const resultBlob = await response.blob();
            if (state.resultObjectUrl) URL.revokeObjectURL(state.resultObjectUrl);
            state.resultObjectUrl = URL.createObjectURL(resultBlob);
            resultBox.innerHTML = '';
            const resultImage = document.createElement('img');
            resultImage.src = state.resultObjectUrl;
            resultImage.alt = state.lang === 'zh' ? '去水印结果' : 'Watermark removal result';
            resultImage.className = 'block max-h-[560px] max-w-full object-contain';
            resultBox.appendChild(resultImage);
            downloadButton.classList.remove('hidden');
            track('watermark-success');
        } catch (error) {
            setStatus(`${t('failed')}: ${error.message}`);
            track('watermark-failed', { reason: error.message || 'unknown' });
        } finally {
            setBusy(false);
        }
    }

    function resizeCanvasToImage() {
        const rect = sourceImage.getBoundingClientRect();
        drawCanvas.width = Math.max(1, Math.round(rect.width));
        drawCanvas.height = Math.max(1, Math.round(rect.height));
        drawCanvas.style.width = `${rect.width}px`;
        drawCanvas.style.height = `${rect.height}px`;
    }

    function clearDrawing() {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        state.hasPaint = false;
    }

    function clearResult() {
        if (state.resultObjectUrl) URL.revokeObjectURL(state.resultObjectUrl);
        state.resultObjectUrl = null;
        downloadButton.classList.add('hidden');
        resultBox.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'px-8 text-center text-sm text-gray-400';
        empty.setAttribute('data-i18n', 'emptyResult');
        empty.textContent = t('emptyResult');
        resultBox.appendChild(empty);
    }

    function stopDrawing() {
        state.drawing = false;
        state.lastPoint = null;
    }

    function getCanvasPoint(event) {
        const rect = drawCanvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    function paintLine(from, to) {
        drawCtx.strokeStyle = 'rgba(220, 38, 38, 0.48)';
        drawCtx.lineWidth = Number(brushSize.value);
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.beginPath();
        drawCtx.moveTo(from.x, from.y);
        drawCtx.lineTo(to.x, to.y);
        drawCtx.stroke();
        state.hasPaint = true;
    }

    async function createBlackWhiteMaskBlob() {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = sourceImage.naturalWidth;
        maskCanvas.height = sourceImage.naturalHeight;
        const maskCtx = maskCanvas.getContext('2d');

        maskCtx.fillStyle = '#000000';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

        const displayPixels = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
        const whitePixels = maskCtx.createImageData(drawCanvas.width, drawCanvas.height);

        for (let i = 0; i < displayPixels.data.length; i += 4) {
            if (displayPixels.data[i + 3] > 0) {
                whitePixels.data[i] = 255;
                whitePixels.data[i + 1] = 255;
                whitePixels.data[i + 2] = 255;
                whitePixels.data[i + 3] = 255;
            }
        }

        const displayMaskCanvas = document.createElement('canvas');
        displayMaskCanvas.width = drawCanvas.width;
        displayMaskCanvas.height = drawCanvas.height;
        displayMaskCanvas.getContext('2d').putImageData(whitePixels, 0, 0);
        maskCtx.imageSmoothingEnabled = false;
        maskCtx.drawImage(displayMaskCanvas, 0, 0, maskCanvas.width, maskCanvas.height);

        const strictMask = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        for (let i = 0; i < strictMask.data.length; i += 4) {
            const value = strictMask.data[i] > 0 ? 255 : 0;
            strictMask.data[i] = value;
            strictMask.data[i + 1] = value;
            strictMask.data[i + 2] = value;
            strictMask.data[i + 3] = 255;
        }
        maskCtx.putImageData(strictMask, 0, 0);

        return new Promise((resolve, reject) => {
            maskCanvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Mask creation failed'));
            }, 'image/png');
        });
    }

    function setBusy(isBusy) {
        loading.classList.toggle('hidden', !isBusy);
        processButton.disabled = isBusy || !state.file;
        clearButton.disabled = isBusy || !state.file;
        imageInput.disabled = isBusy;
    }

    if (langSwitch) {
        // 切语言 = 跳到另一语种的 URL（不要在原 URL 里 JS 替换文案）。
        // 这样 / 和 /zh/* 才能各自被 Google 索引为独立语种页。
        langSwitch.addEventListener('change', (e) => {
            const target = e.target.value;
            if (target === state.lang) return;
            const path = window.location.pathname;
            const isZhPath = path === '/zh' || path === '/zh/' || path.startsWith('/zh/');
            let nextPath;
            if (target === 'zh') {
                nextPath = isZhPath ? path : '/zh' + (path === '/' ? '/' : path);
            } else {
                nextPath = isZhPath ? (path === '/zh' || path === '/zh/' ? '/' : path.slice(3)) : path;
            }
            localStorage.setItem('lang', target);
            window.location.assign(nextPath + window.location.search + window.location.hash);
        });
    }
    applyLanguage(state.lang);
})();
