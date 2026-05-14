(function () {
    'use strict';

    const API_BASE = 'https://api2.miaocut.app';
    const i18n = {
        en: {
            navBg: 'Background Remover',
            navId: 'ID Photo',
            navRestore: 'Old Photo',
            navWatermark: 'Watermark',
            navPortrait: 'Portrait',
            navProduct: 'Product',
            eyebrow: 'Vintage photos, family albums, scanned prints',
            heroTitle: 'Old Photo Restoration',
            heroSub: 'Recover faded contrast, reduce noise, sharpen soft details, and export a cleaner high-resolution photo.',
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
        },
        zh: {
            // SEO meta（被 scripts/build-i18n.mjs 用来生成 zh/old-photo-restoration/index.html。
            // 改这些 key 后跑 npm run build:i18n 同步 zh 静态页。）
            pageTitle: '老照片修复 - 在线 AI 高清修复与放大 | MiaoCut',
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
            heroTitle: '老照片修复高清',
            heroSub: '修复褪色对比度、降低噪点、增强模糊细节，并导出更清晰的高分辨率照片。',
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
            ? '老照片修复高清 - 在线修复并放大旧照片 | MiaoCut'
            : 'Old Photo Restoration - Restore and Upscale Photos Online | MiaoCut';
        const description = lang === 'zh'
            ? 'MiaoCut 在线老照片修复工具，降低噪点、恢复对比度、增强细节并放大旧照片，无需注册。'
            : 'Restore old photos online with MiaoCut. Reduce noise, recover contrast, sharpen details, and upscale vintage family photos with no signup.';
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
