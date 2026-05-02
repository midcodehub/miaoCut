(function () {
    'use strict';

    const _isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE = _isLocal ? 'http://localhost:8000' : 'https://api2.miaocut.app';
    const API_URL = `${API_BASE}/api/remove-watermark`;

    const i18n = {
        en: {
            navBg: 'Background Remover',
            navId: 'ID Photo',
            navRestore: 'Old Photo',
            navWatermark: 'Watermark',
            navPortrait: 'Portrait',
            navProduct: 'Product',
            eyebrow: 'Watermarks, text overlays, logos, stamps',
            heroTitle: 'AI Watermark Remover',
            heroSub: 'Upload an image, paint over the unwanted mark, and let AI repair the selected area.',
            uploadText: 'Click to upload JPG, PNG, or WebP',
            uploadHint: 'High-resolution images with small marks work best',
            replaceHint: 'Click to replace this image',
            brushLabel: 'Brush size',
            clearBtn: 'Clear mask',
            processBtn: 'Remove',
            downloadBtn: 'Download result',
            loading: 'AI is repairing the image...',
            tipsTitle: 'Best results',
            tipsBody: 'Paint slightly beyond the watermark edges. Use a smaller brush near detailed areas.',
            sourceTitle: 'Paint mask',
            sourceSub: 'Cover only the watermark or unwanted object.',
            resultTitle: 'Result',
            resultSub: 'The repaired image will appear here.',
            emptySource: 'Upload an image to start painting',
            emptyResult: 'No result yet',
            seoTitle: 'Remove watermarks and unwanted marks from images',
            seoBody: 'MiaoCut\'s watermark remover lets you mark the exact area to repair. It is useful for small text overlays, date stamps, logos, and distracting objects when you have permission to edit the image.',
            seoCard1: 'Manual precision',
            seoCard1Body: 'Paint exactly where the mark appears instead of guessing with auto detection.',
            seoCard2: 'AI repair',
            seoCard2Body: 'The selected area is repaired using image inpainting.',
            seoCard3: 'Private workflow',
            seoCard3Body: 'Images follow the same MiaoCut upload and processing policy.',
            uploadFirst: 'Upload an image first.',
            paintFirst: 'Paint the area you want to remove first.',
            formatErr: 'Only JPG / PNG / WebP formats are supported',
            failed: 'Processing failed',
        },
        zh: {
            navBg: 'AI 抠图',
            navId: '证件照',
            navRestore: '老照片修复',
            navWatermark: '去水印',
            navPortrait: '人像',
            navProduct: '商品图',
            eyebrow: '水印、文字、Logo、印章、日期',
            heroTitle: 'AI 图片去水印',
            heroSub: '上传图片，涂抹需要去除的水印或杂物区域，交给 AI 智能修复。',
            uploadText: '点击上传 JPG、PNG 或 WebP',
            uploadHint: '水印较小、背景纹理连续的图片效果更好',
            replaceHint: '点击可替换图片',
            brushLabel: '画笔大小',
            clearBtn: '清除遮罩',
            processBtn: '去除水印',
            downloadBtn: '下载结果',
            loading: 'AI 正在修复图片...',
            tipsTitle: '效果建议',
            tipsBody: '涂抹时略微覆盖水印边缘；细节区域建议调小画笔。',
            sourceTitle: '涂抹遮罩',
            sourceSub: '只覆盖水印或需要去除的物体。',
            resultTitle: '处理结果',
            resultSub: '修复后的图片会显示在这里。',
            emptySource: '上传图片后开始涂抹',
            emptyResult: '暂无处理结果',
            seoTitle: '在线去除图片水印和多余标记',
            seoBody: 'MiaoCut 去水印工具支持手动标记需要修复的精确区域，适合处理小范围文字水印、日期印章、Logo 和干扰物。请确保你拥有编辑该图片的权利。',
            seoCard1: '手动精确标记',
            seoCard1Body: '哪里有水印就涂哪里，不依赖不稳定的自动识别。',
            seoCard2: 'AI 智能修复',
            seoCard2Body: '根据遮罩区域进行图像修复和内容补全。',
            seoCard3: '隐私工作流',
            seoCard3Body: '沿用 MiaoCut 的图片上传与处理策略。',
            uploadFirst: '请先上传图片。',
            paintFirst: '请先涂抹需要去除的区域。',
            formatErr: '仅支持 JPG / PNG / WebP 格式的图片',
            failed: '处理失败',
        },
    };

    const state = {
        lang: localStorage.getItem('lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en'),
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
        document.documentElement.lang = lang;
        if (langSwitch) langSwitch.value = lang;
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });
        if (!state.file) {
            fileName.textContent = t('uploadText');
            uploadHint.textContent = t('uploadHint');
        }
        document.title = lang === 'zh'
            ? '图片去水印 - 免费 AI 在线去除水印 | MiaoCut'
            : 'Watermark Remover - Free AI Image Cleanup Tool | MiaoCut';
        const description = lang === 'zh'
            ? 'MiaoCut 免费在线图片去水印工具，上传图片后涂抹水印、文字、Logo 或印章区域，AI 自动修复图片。'
            : 'Remove watermarks, logos, text, stamps, and unwanted marks from images online with MiaoCut. Paint the area and let AI repair the image.';
        const setMeta = (selector, value) => {
            const el = document.querySelector(selector);
            if (el) el.setAttribute('content', value);
        };
        setMeta('meta[name="description"]', description);
        setMeta('meta[property="og:description"]', description);
        setMeta('meta[property="og:title"]', document.title);
        setMeta('meta[property="og:locale"]', lang === 'zh' ? 'zh_CN' : 'en_US');
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
        langSwitch.addEventListener('change', (e) => applyLanguage(e.target.value));
    }
    applyLanguage(state.lang);
})();
