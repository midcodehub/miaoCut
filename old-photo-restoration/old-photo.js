(function () {
    'use strict';

    const API_BASE = 'https://api2.miaocut.app';
    const i18n = {
        en: {
            // SEO meta（applyLanguage 从这里读 <title>/<meta>，覆盖静态 HTML；
            // build-i18n.mjs 不读 EN 这部分，但保留作为单一来源）
            pageTitle: 'Free AI Old Photo Restoration & Upscaler | MiaoCut',
            metaDescription: 'Free AI old photo restoration online. Reduce noise, recover faded contrast, sharpen soft details, and upscale vintage family photos to print-ready resolution. No signup, in-memory processing.',
            metaKeywords: 'old photo restoration, restore old photos, photo enhancer, photo upscale, repair old photo, vintage photo restoration, ai photo repair, fix faded photos, family photo restore',
            ogTitle: 'Free AI Old Photo Restoration & Upscaler | MiaoCut',
            ogDescription: 'Reduce noise, recover faded contrast, sharpen details, and upscale vintage family photos. Free, no signup.',
            ogLocale: 'en_US',
            navBg: 'Background Remover',
            navId: 'ID Photo',
            navRestore: 'Old Photo',
            navWatermark: 'Watermark',
            navPortrait: 'Portrait',
            navProduct: 'Product',
            eyebrow: 'Vintage photos, family albums, scanned prints',
            heroTitle: 'AI Old Photo Restoration & Upscaler',
            heroSub: 'Recover faded contrast, reduce noise, sharpen soft details, and upscale vintage family photos to print-ready resolution.',
            // 隐私 callout：老照片人群对家庭回忆的隐私敏感度最高，hero 旁边显眼放一个安心条
            privacyNotice: 'Your family memories stay private.',
            privacyBody: 'Photos are processed in-memory on the server and discarded immediately after the result is returned. No storage, no AI training, no signup required.',
            breadcrumbHome: 'MiaoCut',
            breadcrumbCurrent: 'Old Photo Restoration',
            uploadText: 'Click to upload JPG, PNG, or WebP',
            uploadHint: 'Scanned photos and phone captures both work',
            replaceHint: 'Click the preview to replace this photo',
            strengthLabel: 'Repair strength',
            strengthGentle: 'Gentle',
            strengthBalanced: 'Balanced',
            strengthStrong: 'Strong',
            scaleLabel: 'Output scale',
            restoreBtn: 'Restore Photo',
            previewTitle: 'Preview',
            previewSub: 'Compare the uploaded photo with the restored output.',
            downloadBtn: 'Download',
            beforeLabel: 'Before',
            afterLabel: 'After',
            beforeEmpty: 'Original photo will appear here',
            afterEmpty: 'Restored photo will appear here',
            flow1: 'Restore texture',
            flow1Body: 'Reduce scan noise and bring faded tonal range back into the photo.',
            flow2: 'Enhance details',
            flow2Body: 'Sharpen soft edges and prepare old prints for larger screens.',
            flow3: 'Keep private',
            flow3Body: 'Images follow the same in-memory processing policy as other MiaoCut tools.',
            uploadFirst: 'Upload a photo first.',
            formatErr: 'Only JPG / PNG / WebP formats are supported',
            uploading: 'Uploading...',
            processing: 'Restoring...',
            ready: 'Ready',
            failed: 'Restore failed. Please try another photo.',
            // How-to 三步：对应 head 中的 HowTo schema
            howToTitle: 'How to Restore an Old Photo',
            howStep1Title: '1. Upload your old photo',
            howStep1Body: 'Upload a scanned print or phone capture in JPG, PNG, or WebP. Both work — though scanned originals usually give the best result.',
            howStep2Title: '2. Choose repair strength and scale',
            howStep2Body: 'Pick a repair strength (gentle / balanced / strong) based on how damaged the photo is, plus an output scale (1x / 2x / 4x) for prints or screen display.',
            howStep3Title: '3. Compare before/after and download',
            howStep3Body: 'Side-by-side preview shows the original and restored result. If you like it, download the restored image.',
            faqTitle: 'Frequently Asked Questions',
            faq1Q: 'How does AI old photo restoration work?',
            faq1A: 'Upload your old photo, choose a repair strength (gentle, balanced, or strong), and select an output scale. MiaoCut applies AI denoising, contrast recovery, and detail sharpening to bring faded or noisy photos back to a cleaner state.',
            faq2Q: 'Will it modify or damage my original photo?',
            faq2A: 'No. Your original is never modified. MiaoCut processes a copy on the server, shows you a before/after preview, and you decide whether to download the restored version.',
            faq3Q: 'Is my photo private and safe?',
            faq3A: 'Yes. Photos are processed in-memory on the server and discarded immediately after the restored result is returned. We never store your image, never use it for AI training, and there is no signup required. Your family memories never leave your control.',
            faq4Q: 'Can it restore heavily damaged or torn photos?',
            faq4A: 'MiaoCut works best on faded, noisy, or low-contrast photos. For very heavy damage (large tears or missing areas), results are limited — for filling small damaged areas you can try the watermark remover (paint-and-fill).',
            faq5Q: 'Can I print the restored photo?',
            faq5A: 'Yes. The restored output is exported at your chosen scale (1x, 2x, or 4x). Use 2x or 4x if you plan to print at larger sizes or display on high-resolution screens.',
            faq6Q: 'Does it colorize black-and-white photos?',
            faq6A: 'Not yet. The current MiaoCut focus is denoising, sharpening, and contrast recovery. If colorization would be useful for you, let us know via the feedback widget.',
            // Cross-link section（H6）
            moreTitle: 'More MiaoCut Tools',
            moreLinkPortraitTitle: 'Portrait Background Remover →',
            moreLinkPortraitDesc: 'Make clean headshots, profile pictures, and resume photos.',
            moreLinkBgTitle: 'AI Background Remover →',
            moreLinkBgDesc: 'One-click transparent PNG cutout for any photo.',
            footerToolsTitle: "All MiaoCut Tools",
            footerCatRemove: "AI Background Removal",
            footerCatConvert: "Format Conversion",
            footerCatRepair: "Photo Repair & Enhancement",
            footerCatGuides: "Guides",
            guideHubTitle: "How to Remove a Background",
            guidePptTitle: "In PowerPoint",
            guideGimpTitle: "In GIMP",
            footerTagline: "MiaoCut · Free AI image tools that respect your privacy.",
            footerPrivacy: "Privacy",
            footerTerms: "Terms",
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
            // SEO meta（被 scripts/build-i18n.mjs 用来生成 zh/old-photo-restoration/index.html。
            // 改这些 key 后跑 npm run build:i18n 同步 zh 静态页。）
            pageTitle: '免费 AI 老照片修复与高清放大 | MiaoCut',
            metaDescription: '在线修复老照片：降噪、还原褪色对比度、增强细节、放大褪色或破损的家庭老照片，免费、无需注册，导出高分辨率图片。',
            metaKeywords: '老照片修复,照片修复,老照片高清,照片增强,照片放大,AI 修复老照片,免费修复老照片,旧照片修复',
            ogTitle: '免费 AI 老照片修复 | MiaoCut',
            ogDescription: '降噪、还原褪色、增强细节，把老家庭照片重新变清晰。免费、无需注册。',
            ogLocale: 'zh_CN',
            navBg: 'AI 抠图',
            navId: '证件照',
            navRestore: '老照片修复',
            navWatermark: '去水印',
            navPortrait: '人像',
            navProduct: '商品图',
            eyebrow: '老照片、家庭相册、扫描照片',
            heroTitle: 'AI 老照片修复与高清放大',
            heroSub: '还原褪色对比度、降低扫描噪点、增强模糊细节，并放大老家庭照片到适合打印的高分辨率。',
            privacyNotice: '你的家庭记忆完全私密。',
            privacyBody: '照片在服务器内存中处理，结果返回后立即销毁。绝不存储、绝不用于 AI 训练、无需注册账号。',
            breadcrumbHome: 'MiaoCut',
            breadcrumbCurrent: '老照片修复',
            uploadText: '点击上传 JPG、PNG 或 WebP',
            uploadHint: '扫描件和手机翻拍照片都可以',
            replaceHint: '点击预览可替换照片',
            strengthLabel: '修复强度',
            strengthGentle: '轻柔',
            strengthBalanced: '均衡',
            strengthStrong: '强力',
            scaleLabel: '输出倍率',
            restoreBtn: '修复照片',
            previewTitle: '预览',
            previewSub: '对比原图和修复后的高清结果。',
            downloadBtn: '下载',
            beforeLabel: '修复前',
            afterLabel: '修复后',
            beforeEmpty: '原图会显示在这里',
            afterEmpty: '修复结果会显示在这里',
            flow1: '恢复质感',
            flow1Body: '降低扫描噪点，让褪色照片重新拉开明暗层次。',
            flow2: '增强细节',
            flow2Body: '锐化柔软边缘，让旧照片更适合大屏查看和保存。',
            flow3: '保护隐私',
            flow3Body: '沿用 MiaoCut 的纯内存处理策略，照片不会用于训练。',
            uploadFirst: '请先上传照片。',
            formatErr: '仅支持 JPG / PNG / WebP 格式的图片',
            uploading: '上传中...',
            processing: '修复中...',
            ready: '已完成',
            failed: '修复失败，请换一张照片再试。',
            howToTitle: '如何修复一张老照片',
            howStep1Title: '1. 上传你的老照片',
            howStep1Body: '扫描件或手机翻拍照片均可，支持 JPG、PNG、WebP。一般来说扫描原件效果更好。',
            howStep2Title: '2. 选择修复强度和倍率',
            howStep2Body: '根据照片损伤程度选择修复强度（轻柔 / 均衡 / 强力），并选择输出倍率（1x / 2x / 4x），打印或大屏显示推荐高倍率。',
            howStep3Title: '3. 对比效果并下载',
            howStep3Body: '左右对比预览原图与修复后效果，满意后下载修复版本。',
            faqTitle: '常见问题',
            faq1Q: 'AI 老照片修复是怎么工作的？',
            faq1A: '上传你的老照片，选择修复强度（轻柔 / 均衡 / 强力）和输出倍率，MiaoCut 会用 AI 自动降噪、还原对比度、增强细节，让褪色或噪点严重的老照片更清晰。',
            faq2Q: '会修改或损坏我的原图吗？',
            faq2A: '不会。原图永远不会被修改。MiaoCut 在服务器上处理一份副本，给你看修复前后对比，由你决定是否下载修复版本。',
            faq3Q: '我的照片安全吗？',
            faq3A: '安全。照片纯内存处理，修复结果返回后立即销毁。我们绝不存储你的图片、绝不用于 AI 训练，也无需注册账号。你的家庭回忆始终在你掌控之中。',
            faq4Q: '能修复严重破损或撕裂的老照片吗？',
            faq4A: 'MiaoCut 最适合处理褪色、噪点、低对比度的老照片。如果损伤特别严重（大面积撕裂或缺失），效果会受限 —— 小范围破损可以试试去水印工具的"涂抹修复"。',
            faq5Q: '修复后的照片可以打印吗？',
            faq5A: '可以。修复结果按你选择的倍率（1x / 2x / 4x）导出。打印大尺寸照片或在高分辨率屏幕显示时建议用 2x 或 4x。',
            faq6Q: '可以给黑白老照片上色吗？',
            faq6A: '暂时不支持。当前老照片修复聚焦在降噪、增强、还原对比度。如果需要照片上色，欢迎通过反馈组件告诉我们。',
            moreTitle: '更多 MiaoCut 工具',
            moreLinkPortraitTitle: '人像抠图 →',
            moreLinkPortraitDesc: '制作干净的头像、简历照、社媒头像。',
            moreLinkBgTitle: 'AI 抠图 →',
            moreLinkBgDesc: '一键生成透明 PNG 抠图。',
            footerToolsTitle: "全部 MiaoCut 工具",
            footerCatRemove: "AI 抠图",
            footerCatConvert: "格式转换",
            footerCatRepair: "照片修复与增强",
            footerCatGuides: "使用教程",
            guideHubTitle: "如何去除背景",
            guidePptTitle: "在 PowerPoint 中去背景",
            guideGimpTitle: "在 GIMP 中去背景",
            footerTagline: "MiaoCut · 免费、注重隐私的 AI 图片工具集。",
            footerPrivacy: "隐私政策",
            footerTerms: "服务条款",
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
    // 不再用 localStorage 决定语言：每个 URL（/old-photo-restoration/ vs /zh/old-photo-restoration/）
    // 已经是预渲染好的对应语种，让 Google 能分别索引，JS 只负责动态文案。
    const _htmlLang = (document.documentElement.lang || 'en').toLowerCase();
    const state = {
        file: null,
        inputUrl: null,
        outputUrl: null,
        outputBlob: null,
        lang: _htmlLang.startsWith('zh') ? 'zh' : 'en',
    };

    const $ = (id) => document.getElementById(id);
    const fileInput = $('restore-file');
    const uploadCard = $('upload-card');
    const uploadIcon = $('upload-icon');
    const uploadPreview = $('upload-preview');
    const fileName = $('file-name');
    const uploadHint = $('upload-hint');
    const beforeImg = $('before-img');
    const beforeEmpty = $('before-empty');
    const afterImg = $('after-img');
    const afterEmpty = $('after-empty');
    const statusEl = $('status');
    const restoreBtn = $('restore-btn');
    const downloadBtn = $('download-btn');
    const langSwitch = $('lang-switch');

    function t(key) {
        return (i18n[state.lang] && i18n[state.lang][key]) || i18n.en[key] || key;
    }

    function track(name, data) {
        if (typeof umami === 'undefined') return;
        try {
            if (data) umami.track(name, data); else umami.track(name);
        } catch (_) { /* analytics must not affect the tool */ }
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
        // 从字典读 <title>、meta —— 单一来源；<html lang> 由静态 HTML 在构建时写死，不再 JS 覆盖
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
    }

    function setStatus(text) {
        statusEl.textContent = text || '';
    }

    function showInputPreview(file) {
        if (state.inputUrl) URL.revokeObjectURL(state.inputUrl);
        state.inputUrl = URL.createObjectURL(file);
        uploadPreview.src = state.inputUrl;
        beforeImg.src = state.inputUrl;
        uploadPreview.classList.remove('hidden');
        beforeImg.classList.remove('hidden');
        beforeEmpty.classList.add('hidden');
        uploadIcon.classList.add('hidden');
        uploadCard.classList.remove('py-6');
        uploadCard.classList.add('p-3');
        fileName.textContent = file.name;
        uploadHint.textContent = t('replaceHint');
    }

    function clearOutput() {
        if (state.outputUrl) URL.revokeObjectURL(state.outputUrl);
        state.outputUrl = null;
        state.outputBlob = null;
        afterImg.src = '';
        afterImg.classList.add('hidden');
        afterEmpty.classList.remove('hidden');
        downloadBtn.classList.add('hidden');
    }

    function uploadWithProgress(formData) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE}/api/old-photo/restore`);
            xhr.responseType = 'blob';
            xhr.upload.onprogress = (e) => {
                if (!e.lengthComputable) return;
                const pct = Math.round((e.loaded / e.total) * 100);
                setStatus(`${t('uploading')} ${pct}%`);
            };
            xhr.upload.onload = () => setStatus(t('processing'));
            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.response);
                    return;
                }
                let message = t('failed');
                try {
                    const text = await xhr.response.text();
                    const data = JSON.parse(text);
                    if (data && data.detail) message = data.detail;
                } catch (_) { /* keep fallback */ }
                reject(new Error(message));
            };
            xhr.onerror = () => reject(new Error(t('failed')));
            xhr.send(formData);
        });
    }

    async function restorePhoto() {
        if (!state.file) {
            setStatus(t('uploadFirst'));
            return;
        }
        restoreBtn.disabled = true;
        clearOutput();
        try {
            const form = new FormData();
            form.append('file', state.file);
            form.append('scale', $('restore-scale').value);
            form.append('strength', $('restore-strength').value);
            const startedAt = performance.now();
            const blob = await uploadWithProgress(form);
            state.outputBlob = blob;
            state.outputUrl = URL.createObjectURL(blob);
            afterImg.src = state.outputUrl;
            afterImg.classList.remove('hidden');
            afterEmpty.classList.add('hidden');
            downloadBtn.classList.remove('hidden');
            setStatus(t('ready'));
            track('old-photo-success', {
                scale: $('restore-scale').value,
                strength: $('restore-strength').value,
                duration: Math.round((performance.now() - startedAt) / 1000),
            });
        } catch (err) {
            console.error(err);
            setStatus(err.message || t('failed'));
            track('old-photo-failed', { reason: err.message || 'unknown' });
        } finally {
            restoreBtn.disabled = false;
        }
    }

    fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setStatus(t('formatErr'));
            return;
        }
        state.file = file;
        showInputPreview(file);
        clearOutput();
        setStatus('');
        track('old-photo-uploaded', { type: file.type.replace('image/', '') });
    });

    restoreBtn.addEventListener('click', restorePhoto);
    downloadBtn.addEventListener('click', () => {
        if (!state.outputBlob) return;
        const a = document.createElement('a');
        a.href = state.outputUrl;
        const baseName = (state.file && state.file.name ? state.file.name : 'photo').replace(/\.[^.]+$/, '');
        a.download = `${baseName}_restored.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        track('old-photo-downloaded');
    });

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
