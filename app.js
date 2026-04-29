// ============================================================
// MiaoCut 共享前端逻辑
// ============================================================
// 设计初衷：
//   首页 + use case 子页（/product-photo-background-remover/、/portrait-background-remover/...）
//   都需要同一套 dropzone + 上传 + 多语言 + 反馈逻辑，但 SEO 文案/title/i18n 各不相同。
//
// 约定：每个 HTML 在加载本脚本之前，先在 <head> 内联：
//   window.MIAOCUT_PAGE_I18N = { zh: { ... }, en: { ... } }   // 页面专属 i18n（见下方 PAGE_REQUIRED_KEYS）
//   window.MIAOCUT_PAGE_TITLES = { zh: "...", en: "..." }     // <title> 文本
// 共享 chrome 文案（dropzone 提示、上传状态、反馈表单等）由本文件内置 BASE_I18N 提供，
// 与 PAGE_I18N 浅合并后形成最终 i18n 字典。
//
// DOM 约定：每个页面必须包含以下 ID 的元素，否则相关功能会静默 no-op（不抛错）：
//   #dropzone #fileInput #dropzone-content
//   #profile-toggle #profile-hint  （可选；缺失则跳过质量切换）
//   #lang-switch
//   #bookmark-banner #dismiss-banner #shortcut-key  （可选）
//   #feedback-widget #feedback-trigger #feedback-panel #feedback-form
//   #feedback-msg #feedback-email #feedback-thanks  （可选）

(function () {
    'use strict';

    // ============================================================
    // 共享 i18n（chrome / 上传状态 / 反馈表单）
    // ============================================================
    const BASE_I18N = {
        zh: {
            dropzoneTitle: "将图片拖拽至此，或点击上传",
            dropzoneSub: "（支持 JPG / PNG / WebP）",
            trustTitle: "你的图片绝对安全。",
            trustSub: "纯内存处理，15分钟后自动销毁，绝不用于 AI 训练。",
            navRestore: "老照片修复",
            profileLabel: "质量：",
            profileSharp: "快速",
            profileFur: "细腻（毛发/发丝）",
            profileHintSharp: "约 1 秒 · 适合日常照片",
            profileHintFur: "约 3~5 秒 · 适合宠物、长发、羽毛、植物",
            bookmarkText: "喜欢 MiaoCut 吗？按",
            bookmarkSuffix: "加入书签，下次抠图只需 1 秒！",
            fbTitle: "☕ 提出建议",
            fbPlaceholder: "有什么想法？",
            fbEmail: "邮箱（选填，方便我们回复你）",
            fbSend: "发送",
            fbThanks: "感谢你的建议！",
            fbThanksSub: "我们会认真对待每一条反馈",
            compressing: "压缩中...",
            uploading: "上传中...",
            processing: "AI 处理中...",
            done: "完成!",
            formatErr: "仅支持 JPG / PNG / WebP 格式的图片",
            successTitle: "处理成功！",
            successSub: "正在为您自动下载...",
            failTitle: "抱歉，处理失败",
            alertSize: "仅支持 JPG / PNG / WebP 格式的图片"
        },
        en: {
            dropzoneTitle: "Drag & drop image here, or click to upload",
            dropzoneSub: "(Supports JPG / PNG / WebP)",
            trustTitle: "Your images are 100% safe.",
            trustSub: "Processed in-memory, destroyed automatically. Never used for AI training.",
            navRestore: "Old Photo",
            profileLabel: "Quality:",
            profileSharp: "Fast",
            profileFur: "Fine (hair / fur)",
            profileHintSharp: "~1s · everyday photos",
            profileHintFur: "~3-5s · pets, long hair, feathers, plants",
            bookmarkText: "Like MiaoCut? Press",
            bookmarkSuffix: "to bookmark, next cutout is just 1 sec away!",
            fbTitle: "☕ Feedback",
            fbPlaceholder: "What's on your mind?",
            fbEmail: "Email (Optional)",
            fbSend: "Send",
            fbThanks: "Thanks for your feedback!",
            fbThanksSub: "We read every single message.",
            compressing: "Compressing...",
            uploading: "Uploading...",
            processing: "AI Processing...",
            done: "Done!",
            formatErr: "Only JPG / PNG / WebP formats are supported",
            successTitle: "Success!",
            successSub: "Downloading automatically...",
            failTitle: "Sorry, processing failed",
            alertSize: "Only JPG / PNG / WebP formats are supported"
        }
    };

    // 每个页面 PAGE_I18N 至少要提供这些 key，否则 meta 标签和切语言时会显示 key 名
    // (开发期 console 会提示缺失，但不会阻断运行)
    const PAGE_REQUIRED_KEYS = ['title', 'subtitle', 'metaDescription', 'metaKeywords', 'ogTitle', 'ogLocale'];

    const PAGE_I18N = window.MIAOCUT_PAGE_I18N || { zh: {}, en: {} };
    const PAGE_TITLES = window.MIAOCUT_PAGE_TITLES || {};

    const i18nData = {
        zh: Object.assign({}, BASE_I18N.zh, PAGE_I18N.zh || {}),
        en: Object.assign({}, BASE_I18N.en, PAGE_I18N.en || {})
    };

    // 开发期校验：page-specific 必填 key 缺失时给个警告，避免线上才发现 meta 没设
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        ['zh', 'en'].forEach(lang => {
            const missing = PAGE_REQUIRED_KEYS.filter(k => !PAGE_I18N[lang] || PAGE_I18N[lang][k] === undefined);
            if (missing.length) console.warn(`[MiaoCut] PAGE_I18N.${lang} 缺少 key:`, missing);
        });
    }

    // ============================================================
    // DOM 引用（部分元素可选，缺失则跳过对应初始化）
    // ============================================================
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const dropzoneContent = document.getElementById('dropzone-content');

    // dropzone 是核心，缺失就直接放弃后续初始化（子页可能是纯内容页）
    if (!dropzone || !fileInput || !dropzoneContent) {
        console.warn('[MiaoCut] dropzone DOM 不存在，跳过上传逻辑初始化');
        return;
    }

    // ============================================================
    // 埋点 (Umami custom events)
    // ============================================================
    // umami 脚本异步加载，未就绪/被广告拦截时直接 no-op，不让分析故障影响主流程。
    function track(name, data) {
        if (typeof umami === 'undefined') return;
        try {
            if (data) umami.track(name, data); else umami.track(name);
        } catch (_) { /* analytics 失败不影响业务 */ }
    }
    function sizeBucket(bytes) {
        if (bytes < 500 * 1024) return '<500K';
        if (bytes < 2 * 1024 * 1024) return '500K-2M';
        if (bytes < 5 * 1024 * 1024) return '2M-5M';
        return '5M-10M';
    }
    function durationBucket(ms) {
        const s = ms / 1000;
        if (s < 2) return '<2s';
        if (s < 5) return '2-5s';
        if (s < 10) return '5-10s';
        return '>10s';
    }

    // ============================================================
    // i18n 切换
    // ============================================================
    let currentLang = localStorage.getItem('lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en');

    function t(key) {
        return i18nData[currentLang][key] || key;
    }

    function updateLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('lang', lang);
        document.documentElement.lang = lang;

        // 页面 title 来自 PAGE_TITLES；缺失时 fallback 到 ogTitle，再 fallback 到原 <title>
        if (PAGE_TITLES[lang]) {
            document.title = PAGE_TITLES[lang];
        } else if (PAGE_I18N[lang] && PAGE_I18N[lang].ogTitle) {
            document.title = PAGE_I18N[lang].ogTitle;
        }

        // 同步 SEO/分享卡片相关 meta：搜索引擎 + 社交分享抓取时主要看这些
        const pack = i18nData[lang];
        const setMeta = (selector, value) => {
            const el = document.querySelector(selector);
            if (el && value) el.setAttribute('content', value);
        };
        setMeta('meta[name="description"]', pack.metaDescription);
        setMeta('meta[name="keywords"]', pack.metaKeywords);
        setMeta('meta[property="og:title"]', pack.ogTitle);
        setMeta('meta[property="og:description"]', pack.metaDescription);
        setMeta('meta[property="og:locale"]', pack.ogLocale);

        const selectEl = document.getElementById('lang-switch');
        if (selectEl) selectEl.value = lang;

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18nData[lang][key]) {
                el.textContent = i18nData[lang][key];
            }
        });
        document.querySelectorAll('[data-i18n-ph]').forEach(el => {
            const key = el.getAttribute('data-i18n-ph');
            if (i18nData[lang][key]) {
                el.placeholder = i18nData[lang][key];
            }
        });

        // dropzone 处于初始状态时，刷新里面的提示文案
        if (!dropzone.classList.contains('pointer-events-none')) {
            resetDropzone();
        }
    }

    function resetDropzone() {
        dropzoneContent.innerHTML = `
            <svg class="w-12 h-12 text-gray-400 mb-4 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
            </svg>
            <p class="text-lg font-medium text-gray-700 mb-1" data-i18n="dropzoneTitle">${t('dropzoneTitle')}</p>
            <p class="text-sm text-gray-400" data-i18n="dropzoneSub">${t('dropzoneSub')}</p>
        `;
    }

    updateLanguage(currentLang);
    const langSwitch = document.getElementById('lang-switch');
    if (langSwitch) {
        langSwitch.addEventListener('change', (e) => {
            const from = currentLang;
            const to = e.target.value;
            updateLanguage(to);
            track('lang-switched', { from, to });
        });
    }

    // ============================================================
    // 抠图质量 profile（sharp / fur）
    // ============================================================
    // 持久化到 localStorage，跨页面/刷新都保留用户偏好；子页不带 toggle 也会沿用同一个值。
    let currentProfile = localStorage.getItem('cutoutProfile');
    if (currentProfile !== 'sharp' && currentProfile !== 'fur') currentProfile = 'sharp';

    const profileToggle = document.getElementById('profile-toggle');
    if (profileToggle) {
        const updateProfileButtons = () => {
            document.querySelectorAll('.profile-btn').forEach(btn => {
                const active = btn.dataset.profile === currentProfile;
                btn.classList.toggle('bg-gray-900', active);
                btn.classList.toggle('text-white', active);
                btn.classList.toggle('border-gray-900', active);
                btn.classList.toggle('text-gray-700', !active);
                btn.classList.toggle('border-gray-300', !active);
            });
            const hint = document.getElementById('profile-hint');
            if (hint) {
                const hintKey = currentProfile === 'fur' ? 'profileHintFur' : 'profileHintSharp';
                hint.setAttribute('data-i18n', hintKey);
                hint.textContent = t(hintKey);
            }
        };

        document.querySelectorAll('.profile-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const next = btn.dataset.profile;
                if (next !== 'sharp' && next !== 'fur') return;
                if (next === currentProfile) return;
                const from = currentProfile;
                currentProfile = next;
                localStorage.setItem('cutoutProfile', next);
                updateProfileButtons();
                track('profile-switched', { from, to: next });
            });
        });
        updateProfileButtons();
    }

    // ============================================================
    // API 配置
    // ============================================================
    const API_BASE = 'https://api2.miaocut.app';

    // ============================================================
    // 拖拽 / 点击交互
    // ============================================================
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('border-gray-600', 'bg-gray-100');
            dropzone.classList.remove('border-gray-300', 'bg-white', 'hover:border-gray-400', 'hover:bg-gray-50');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('border-gray-600', 'bg-gray-100');
            dropzone.classList.add('border-gray-300', 'bg-white', 'hover:border-gray-400', 'hover:bg-gray-50');
        }, false);
    });

    dropzone.addEventListener('click', () => {
        if (dropzone.classList.contains('pointer-events-none')) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', function () {
        if (this.files && this.files.length > 0) {
            handleFiles(this.files);
        }
    });

    dropzone.addEventListener('drop', function (e) {
        let dt = e.dataTransfer;
        let files = dt.files;
        handleFiles(files);
    });

    // ============================================================
    // 客户端压缩
    // ============================================================
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_CLIENT_DIMENSION = 2048;
    const MAX_CLIENT_IMAGE_PIXELS = 2048 * 2048;

    async function compressImage(file, maxDimension = MAX_CLIENT_DIMENSION, maxPixels = MAX_CLIENT_IMAGE_PIXELS) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                let width = img.width;
                let height = img.height;

                if (!width || !height) {
                    reject(new Error('图片解析失败，尺寸无效'));
                    return;
                }

                const scale = Math.min(
                    1,
                    maxDimension / width,
                    maxDimension / height,
                    Math.sqrt(maxPixels / (width * height))
                );

                if (scale >= 1 && file.size <= 500 * 1024) {
                    img.onload = null;
                    img.onerror = null;
                    img.src = '';
                    resolve(file);
                    return;
                }

                width = Math.max(1, Math.round(width * scale));
                height = Math.max(1, Math.round(height * scale));

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('压缩失败，浏览器不支持 Canvas'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                img.onload = null;
                img.onerror = null;
                img.src = '';

                canvas.toBlob((blob) => {
                    canvas.width = 0;
                    canvas.height = 0;
                    if (!blob) {
                        reject(new Error('压缩失败，浏览器可能不支持 WebP 编码'));
                        return;
                    }
                    resolve(new File([blob], file.name.split('.')[0] + '.webp', { type: 'image/webp' }));
                }, 'image/webp', 0.95);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('图片解析失败，文件可能已损坏'));
            };
            img.src = url;
        });
    }

    // ============================================================
    // 进度 UI
    // ============================================================
    function showProgress(percent, label) {
        let fill = document.getElementById('progress-fill');
        if (!fill) {
            dropzoneContent.innerHTML = `
                <svg class="animate-spin w-10 h-10 text-gray-800 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p id="progress-label" class="text-lg font-medium text-gray-700 mb-3">${label}</p>
                <div class="w-64 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div id="progress-fill" class="h-full bg-gray-900 transition-all duration-300 ease-out" style="width: ${percent}%"></div>
                </div>
            `;
        } else {
            fill.style.width = percent + '%';
            document.getElementById('progress-label').textContent = label;
        }
    }

    // ============================================================
    // 上传（带真实进度）
    // ============================================================
    function uploadWithProgress(formData) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const url = `${API_BASE}/api/remove-background?profile=${encodeURIComponent(currentProfile)}`;
            xhr.open('POST', url);
            xhr.responseType = 'blob';

            xhr.upload.onprogress = (e) => {
                if (!e.lengthComputable) return;
                const ratio = e.loaded / e.total;
                const pct = 15 + Math.round(ratio * 55);
                showProgress(pct, `${t('uploading')} ${Math.round(ratio * 100)}%`);
            };

            xhr.upload.onload = () => {
                showProgress(90, t('processing'));
            };

            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    showProgress(100, t('done'));
                    resolve(xhr.response);
                } else {
                    let message = `请求失败（${xhr.status}）`;
                    try {
                        const text = await xhr.response.text();
                        const data = JSON.parse(text);
                        if (data && typeof data.detail === 'string') message = data.detail;
                        else message = text || message;
                    } catch (_) { /* 解析失败用兜底 message */ }
                    const err = new Error(message);
                    err.status = xhr.status;
                    reject(err);
                }
            };

            const failWith = (msg, kind) => { const e = new Error(msg); e.kind = kind; return e; };
            xhr.onerror = () => reject(failWith('网络错误，请检查连接', 'network'));
            xhr.ontimeout = () => reject(failWith('请求超时，请重试', 'timeout'));
            xhr.onabort = () => reject(failWith('请求被中断', 'abort'));

            xhr.send(formData);
        });
    }

    async function handleFiles(files) {
        const file = files[0];

        if (!ALLOWED_TYPES.includes(file.type)) {
            track('format-rejected', { type: file && file.type ? file.type : 'unknown' });
            alert(t('alertSize'));
            return;
        }

        console.log(`[MiaoCut] 原始图片: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        const fileExt = file.type.replace('image/', '');
        // 子页打点带 page 维度，便于在 Umami 后台分析"哪个 landing page 转化最高"
        const page = (window.MIAOCUT_PAGE_KEY || 'home');
        track('upload-started', { type: fileExt, size: sizeBucket(file.size), profile: currentProfile, page });
        const startedAt = performance.now();

        dropzone.classList.add('pointer-events-none');

        try {
            showProgress(5, t('compressing'));
            let uploadFile = file;
            uploadFile = await compressImage(file);
            console.log(`[MiaoCut] 上传图片: ${uploadFile.name} (${(uploadFile.size / 1024).toFixed(2)} KB)`);
            showProgress(15, t('uploading'));

            const formData = new FormData();
            formData.append('file', uploadFile);
            const blob = await uploadWithProgress(formData);

            const resultUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = resultUrl;
            const originalName = file.name.split('.')[0];
            a.download = `${originalName}_nobg.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(resultUrl), 1000);

            track('cutout-success', {
                type: fileExt,
                size: sizeBucket(file.size),
                duration: durationBucket(performance.now() - startedAt),
                page,
            });

            dropzoneContent.innerHTML = `
                <svg class="w-12 h-12 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-lg font-medium text-gray-800 mb-1">${t('successTitle')}</p>
                <p class="text-sm text-gray-500">${t('successSub')}</p>
            `;
            showBookmarkBanner();

        } catch (error) {
            console.error("API Error:", error);
            const reason = error.status ? `http-${error.status}`
                : (error.kind || (error.message && /压缩|WebP/.test(error.message) ? 'compress' : 'unknown'));
            track('cutout-failed', { type: fileExt, reason, page });
            // 用 DOM 拼装而不是 innerHTML 拼字符串，防止 error.message 里若含 HTML 被当标签执行（XSS）
            dropzoneContent.innerHTML = '';
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('class', 'w-12 h-12 text-red-500 mb-4');
            icon.setAttribute('fill', 'none');
            icon.setAttribute('stroke', 'currentColor');
            icon.setAttribute('viewBox', '0 0 24 24');
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
            const title = document.createElement('p');
            title.className = 'text-lg font-medium text-gray-800 mb-1';
            title.textContent = t('failTitle');
            const detail = document.createElement('p');
            detail.className = 'text-sm text-gray-500 max-w-xs px-4 truncate';
            detail.textContent = error.message;
            dropzoneContent.append(icon, title, detail);
        } finally {
            setTimeout(() => {
                resetDropzone();
                dropzone.classList.remove('pointer-events-none');
                fileInput.value = '';
            }, 2000);
        }
    }

    // ============================================================
    // Bookmark Banner
    // ============================================================
    let bannerShown = false;
    function showBookmarkBanner() {
        const banner = document.getElementById('bookmark-banner');
        if (!banner || bannerShown) return;
        bannerShown = true;
        const isMac = navigator.platform.toUpperCase().includes('MAC')
            || navigator.userAgent.toUpperCase().includes('MAC');
        const shortcut = document.getElementById('shortcut-key');
        if (shortcut) shortcut.textContent = isMac ? '⌘ + D' : 'Ctrl + D';
        setTimeout(() => banner.classList.add('show'), 1000);
        setTimeout(() => banner.classList.remove('show'), 9000);
    }
    const dismissBtn = document.getElementById('dismiss-banner');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            document.getElementById('bookmark-banner').classList.remove('show');
            track('bookmark-banner-dismissed');
        });
    }

    // ============================================================
    // Feedback Widget
    // ============================================================
    const feedbackTrigger = document.getElementById('feedback-trigger');
    const feedbackPanel = document.getElementById('feedback-panel');
    const feedbackForm = document.getElementById('feedback-form');
    const feedbackThanks = document.getElementById('feedback-thanks');

    if (feedbackTrigger && feedbackPanel && feedbackForm && feedbackThanks) {
        feedbackTrigger.addEventListener('click', () => {
            const opening = !feedbackPanel.classList.contains('open');
            feedbackPanel.classList.toggle('open');
            if (opening) track('feedback-opened');
        });
        document.addEventListener('click', (e) => {
            const widget = document.getElementById('feedback-widget');
            if (widget && !widget.contains(e.target)) {
                feedbackPanel.classList.remove('open');
            }
        });
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgEl = document.getElementById('feedback-msg');
            const emailEl = document.getElementById('feedback-email');
            const msg = msgEl ? msgEl.value.trim() : '';
            if (!msg) return;
            const email = emailEl ? emailEl.value.trim() : '';

            try {
                await fetch(API_BASE + '/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: msg,
                        email: email || undefined,
                        page: window.MIAOCUT_PAGE_KEY || 'home',
                        profile: currentProfile
                    })
                });
            } catch (err) {
                console.warn('[MiaoCut] Feedback send failed:', err);
            }

            track('feedback-submitted', { has_email: email ? 'yes' : 'no' });

            feedbackForm.classList.add('hidden');
            feedbackThanks.classList.remove('hidden');
            setTimeout(() => {
                feedbackPanel.classList.remove('open');
                setTimeout(() => {
                    feedbackForm.classList.remove('hidden');
                    feedbackThanks.classList.add('hidden');
                    feedbackForm.reset();
                }, 300);
            }, 2000);
        });
    }
})();
