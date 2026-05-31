(function () {
    'use strict';

    // ============================================================
    // i18n 字典
    // ============================================================
    // 单一来源：
    //   - 运行时 applyLanguage 从这里读 <title>、<meta description/keywords>、og:*
    //   - scripts/build-i18n.mjs 也读 i18n.zh，把 zh/png-to-jpg-white-background/index.html 的对应 meta 写死
    // 改任意 key 后必须跑 `npm run build:i18n` 同步 zh 静态页，并把改动 commit 进仓库。
    const i18n = {
        en: {
            pageTitle: 'PNG to JPG Converter — Smart White Background Auto-Fill | MiaoCut',
            metaDescription: 'Convert PNG to JPG free with a smart white background. Avoid the ugly black fill that naive converters produce — pick white, gray, black, or any custom color, set quality, and download.',
            metaKeywords: 'png to jpg, png to jpg white background, png to jpeg, convert png to jpg, transparent png to jpg, png to jpg converter, png to jpg with background, png to jpeg with white background, free png to jpg',
            ogTitle: 'PNG to JPG Converter — Smart White Background Auto-Fill | MiaoCut',
            ogDescription: 'Convert PNG to JPG free with a smart white background. Avoid the ugly black fill that naive converters produce — pick white, gray, black, or any custom color, set quality, and download.',
            ogLocale: 'en_US',

            // Nav
            navBg: 'Background Remover',
            navProduct: 'Product',
            navPortrait: 'Portrait',
            navWatermark: 'Watermark',
            navId: 'ID Photo',
            navRestore: 'Old Photo',

            // Breadcrumb + hero
            breadcrumbHome: 'MiaoCut',
            breadcrumbCurrent: 'PNG to JPG Converter',
            title: 'PNG to JPG Converter with White Background',
            subtitle: "JPG doesn't store transparency. We flatten your PNG onto white (or any color you pick) so you never get a surprise black background. Runs 100% in your browser.",

            // Dropzone
            dropzoneTitle: 'Drag & drop PNG here, or click to upload',
            dropzoneSub: 'PNG / WebP / GIF — converted to JPG in your browser',

            // Editor
            paneOriginal: 'Original (PNG)',
            paneResult: 'Result (JPG)',
            bgLabel: 'Background color',
            bgWhite: 'White',
            bgGray: 'Light gray',
            bgBlack: 'Black',
            bgCustom: 'Custom',
            qualityLabel: 'JPG quality',
            qualitySmaller: 'Smaller file',
            qualityBetter: 'Better quality',
            sizeReadoutEmpty: 'Preview will update when you change settings.',
            sizeReadoutFmt: 'Estimated JPG size: {size}',
            downloadBtn: 'Download JPG',
            replaceBtn: 'Convert another',

            // Trust
            trustTitle: '100% private — runs in your browser.',
            trustSub: 'Your image never leaves your device. No upload, no server, no logs.',
            seoIntro: "MiaoCut's PNG to JPG converter runs entirely in your browser using Canvas. Transparent pixels get flattened onto a background color of your choice (white, gray, black, or custom), and JPG quality is fully adjustable. Nothing is uploaded — your image stays on your device.",

            // How-to
            howItWorks: 'How to Convert PNG to JPG with a White Background',
            howStep1Title: '1. Drop Your PNG',
            howStep1Desc: 'Drop a PNG (or WebP) into the upload zone. Everything runs in your browser — your image is not uploaded anywhere.',
            howStep2Title: '2. Pick a Background Color',
            howStep2Desc: 'White is the default. Switch to gray, black, or pick any custom color — the preview updates live.',
            howStep3Title: '3. Download JPG',
            howStep3Desc: 'Adjust JPG quality if you want, then download. The result is a clean JPG with the background color you chose.',

            // Why
            whyTitle: 'Why Use This Instead of a Generic Converter',
            why1Title: 'No Surprise Black Background',
            why1Desc: "Naive converters fill transparent pixels with black because that's the default. We default to white and let you change it before downloading.",
            why2Title: '100% Private',
            why2Desc: 'Browser-only conversion. Your file is never uploaded, logged, or seen by anyone — including us.',
            why3Title: 'Adjustable Quality',
            why3Desc: 'Slider from 60% to 100%. Find the sweet spot between file size and quality for your use case.',
            why4Title: 'Need Transparency Removed Instead?',
            // why4Desc 含 HTML 链接，不在 applyLanguage 中替换 textContent；保留以保证 build-i18n.mjs 输出 ZH 时也有这段
            why4Desc: 'If your PNG still has a background and you want a true transparent cutout, try our JPG → Transparent PNG tool.',

            // Tips
            tipsTitle: 'Tips for Different Use Cases',
            tip1: "For documents and most marketplaces, stick with white background and 92% quality — it's the universal safe default.",
            tip2: 'For e-commerce platforms that require pure white (255,255,255), the White preset is byte-exact — no tinting.',
            tip3: 'For print or archival, set quality to 100%. File size grows but encoder produces virtually no compression artifacts.',
            tip4: 'For web-bound images where size matters more than visual perfection, 75-85% drops file size dramatically with only mild quality loss.',

            // FAQ
            faqTitle: 'Frequently Asked Questions',
            faq1Q: 'Why does my PNG get a black background when I convert it to JPG?',
            faq1A: 'JPG does not support transparency. When a naive converter flattens a transparent PNG, it fills the alpha pixels with black by default. MiaoCut fills them with white (or any color you pick) so the result looks the way you expect — no surprise black blobs.',
            faq2Q: 'What background color should I pick?',
            faq2A: 'White is the safe default for documents, e-commerce, and most marketplaces. Light gray works well for product photography. Black suits dark-themed designs. The custom color picker covers brand colors.',
            faq3Q: 'Is my image uploaded to a server?',
            faq3A: 'No. This converter runs 100% in your browser using Canvas. Your image never leaves your device — nothing is uploaded, stored, or logged.',
            faq4Q: 'What JPG quality setting should I use?',
            faq4A: "92% is a balanced default — visually lossless for most photos with reasonable file size. Use 100% for print or archival. Use 75-85% if you need smaller files for the web and don't mind mild compression.",
            faq5Q: 'Can I convert WebP or other formats too?',
            faq5A: 'Yes. The converter accepts PNG, WebP, and any format your browser can decode. The output is always JPG.',

            // Cross-link
            moreTitle: 'More MiaoCut Tools',
            moreLinkJpgPngTitle: 'JPG to Transparent PNG →',
            moreLinkJpgPngDesc: 'The reverse — strip the background out of a JPG and export a transparent PNG.',
            moreLinkProductTitle: 'Product Photo Background Remover →',
            moreLinkProductDesc: 'White-background and square-canvas product images for e-commerce.',
            moreLinkHomeTitle: 'All-Purpose Background Remover →',
            moreLinkHomeDesc: 'Logos, pets, complex edges, anything else.',

            // Bookmark banner
            bookmarkText: 'Like MiaoCut? Press',
            bookmarkSuffix: 'to bookmark, next conversion is just 1 sec away!',

            // Runtime status
            errFormat: 'Unsupported file format. Use PNG, WebP, or any image format your browser supports.',
            errLoad: 'Failed to load the image. Try a different file.',
            errTooLarge: 'Image is too large. Try a file under 50 MB.',
            footerToolsTitle: "All MiaoCut Tools",
            footerCatRemove: "AI Background Removal",
            footerCatConvert: "Format Conversion",
            footerCatRepair: "Photo Repair & Enhancement",
            footerCatGuides: "Guides",
            guideHubTitle: "How to Remove a Background",
            guidePptTitle: "In PowerPoint",
            guideGimpTitle: "In GIMP",
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
            pageTitle: 'PNG 转 JPG 在线转换器 — 智能白底，免黑色背景 | MiaoCut',
            metaDescription: '免费 PNG 转 JPG，自动填充白底。避开普通转换器的黑色背景填充 — 可选白色、灰色、黑色或任意自定义颜色，并可调节 JPG 画质，浏览器内完成。',
            metaKeywords: 'PNG 转 JPG,PNG 转 JPG 白底,PNG 转 JPEG,PNG 转 JPG 在线,透明 PNG 转 JPG,PNG 转 JPG 工具,PNG 加白底转 JPG,免费 PNG 转 JPG',
            ogTitle: 'PNG 转 JPG 在线转换器 — 智能白底，免黑色背景 | MiaoCut',
            ogDescription: '免费 PNG 转 JPG，自动填充白底。避开普通转换器的黑色背景填充 — 可选白色、灰色、黑色或任意自定义颜色，并可调节 JPG 画质，浏览器内完成。',
            ogLocale: 'zh_CN',

            navBg: '背景去除',
            navProduct: '商品图',
            navPortrait: '人像',
            navWatermark: '水印擦除',
            navId: '证件照',
            navRestore: '老照片',

            breadcrumbHome: 'MiaoCut',
            breadcrumbCurrent: 'PNG 转 JPG 转换器',
            title: 'PNG 转 JPG 智能白底转换器',
            subtitle: 'JPG 格式本身不支持透明。我们把 PNG 的透明像素铺到白色（或你选的任意颜色）背景上，不再出现意外的黑色背景。100% 浏览器内完成。',

            dropzoneTitle: '将 PNG 拖拽至此，或点击上传',
            dropzoneSub: '支持 PNG / WebP / GIF，浏览器内直接转 JPG',

            paneOriginal: '原图 (PNG)',
            paneResult: '结果 (JPG)',
            bgLabel: '背景颜色',
            bgWhite: '白色',
            bgGray: '浅灰',
            bgBlack: '黑色',
            bgCustom: '自定义',
            qualityLabel: 'JPG 画质',
            qualitySmaller: '更小文件',
            qualityBetter: '更好画质',
            sizeReadoutEmpty: '修改设置后预览会实时更新。',
            sizeReadoutFmt: '预计 JPG 文件大小：{size}',
            downloadBtn: '下载 JPG',
            replaceBtn: '换一张转换',

            trustTitle: '100% 隐私 — 全部在浏览器内运行。',
            trustSub: '图片永远不会离开你的设备。零上传、零服务器、零日志。',
            seoIntro: 'MiaoCut PNG 转 JPG 工具完全在浏览器内通过 Canvas 完成。透明像素会被铺到你选的背景色（白、灰、黑或自定义）上，JPG 画质完全可调。无任何上传，图片始终留在你设备上。',

            howItWorks: '如何把 PNG 转成带白底的 JPG',
            howStep1Title: '1. 拖入 PNG',
            howStep1Desc: '把 PNG（或 WebP）拖到上传区。所有处理都在你的浏览器内完成，图片不会上传到任何地方。',
            howStep2Title: '2. 选择背景颜色',
            howStep2Desc: '默认是白色。可切换灰色、黑色，或选择任意自定义颜色 — 预览实时更新。',
            howStep3Title: '3. 下载 JPG',
            howStep3Desc: '如果需要可以调节 JPG 画质，然后下载。导出的是干净的 JPG，背景就是你选的颜色。',

            whyTitle: '为什么不用普通转换器',
            why1Title: '不会出现意外的黑色背景',
            why1Desc: '普通转换器把透明像素填成黑色（因为是底层默认值）。我们默认填成白色，并允许你在下载前自由切换颜色。',
            why2Title: '100% 隐私',
            why2Desc: '完全在浏览器内转换。文件不会被上传、记录或被任何人看到 — 包括我们自己。',
            why3Title: '可调画质',
            why3Desc: '60% 到 100% 的画质滑块。根据用途，找到画质和文件大小的平衡点。',
            why4Title: '其实你想去背景？',
            why4Desc: '如果 PNG 还带着背景而你想要真正透明的抠图，请改用我们的 JPG → 透明 PNG 工具。',

            tipsTitle: '不同场景的建议',
            tip1: '文档和大多数电商平台：保持白底 + 92% 画质，这是几乎所有场景的安全默认。',
            tip2: '需要纯白 (255,255,255) 的电商平台：白色预设是字节级精确，不会有偏色。',
            tip3: '打印或归档：把画质调到 100%。文件大一些，但几乎没有压缩损伤。',
            tip4: '面向 Web 且更在意体积：75-85% 的画质能显著降低文件大小，画质损失很轻微。',

            faqTitle: '常见问题',
            faq1Q: '为什么 PNG 转成 JPG 之后变成黑色背景了？',
            faq1A: 'JPG 格式不支持透明。普通转换器把透明像素当成 0（也就是黑色）来填，所以会出现整片黑色。MiaoCut 默认填成白色（也可以选任意颜色），让结果符合你的预期，不再出现意外的黑色。',
            faq2Q: '应该选什么背景颜色？',
            faq2A: '文档、电商和绝大多数平台用白色就好。商品摄影场景浅灰也不错。深色设计场景选黑色。自定义颜色选择器适合品牌色。',
            faq3Q: '图片会被上传到服务器吗？',
            faq3A: '不会。整个转换器在你的浏览器内通过 Canvas 完成。图片永远不会离开你的设备 — 不会被上传、保存或记录。',
            faq4Q: 'JPG 画质该选多少？',
            faq4A: '92% 是平衡的默认值 — 对大多数照片视觉上无损，文件大小合理。打印或归档用 100%。Web 用途又关心体积时 75-85% 能显著减小文件，画质损失轻微。',
            faq5Q: 'WebP 等其他格式也能转吗？',
            faq5A: '可以。本工具接受 PNG、WebP，以及你的浏览器能解码的任何格式。输出固定是 JPG。',

            moreTitle: '更多 MiaoCut 工具',
            moreLinkJpgPngTitle: 'JPG 转透明 PNG →',
            moreLinkJpgPngDesc: '反向操作 — 把 JPG 的背景抠掉，导出透明 PNG。',
            moreLinkProductTitle: '商品图抠图 →',
            moreLinkProductDesc: '电商白底图与方形画布商品图。',
            moreLinkHomeTitle: '通用背景去除 →',
            moreLinkHomeDesc: 'Logo、宠物、复杂边缘等任何场景。',

            bookmarkText: '喜欢 MiaoCut？按',
            bookmarkSuffix: '收藏，下次转换 1 秒可达！',

            errFormat: '不支持的文件格式。请使用 PNG、WebP 或其他浏览器能识别的图片格式。',
            errLoad: '图片加载失败，请换一张试试。',
            errTooLarge: '图片太大了。请使用 50 MB 以内的文件。',
            footerToolsTitle: "全部 MiaoCut 工具",
            footerCatRemove: "AI 抠图",
            footerCatConvert: "格式转换",
            footerCatRepair: "照片修复与增强",
            footerCatGuides: "使用教程",
            guideHubTitle: "如何去除背景",
            guidePptTitle: "在 PowerPoint 中去背景",
            guideGimpTitle: "在 GIMP 中去背景",
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

    // ============================================================
    // 当前语言：从 <html lang> 推断（构建时由 build-i18n.mjs 写死 zh-CN 或 en）
    // 不用 localStorage 决定语言，每个 URL 已经是预渲染好的对应语种，让 Google 能分别索引。
    // ============================================================
    const _htmlLang = (document.documentElement.lang || 'en').toLowerCase();
    const state = {
        lang: _htmlLang.startsWith('zh') ? 'zh' : 'en',
        sourceImage: null, // HTMLImageElement
        sourceFileName: 'image', // 用户原始文件名（不含扩展），用于生成下载文件名
        bgColor: '#ffffff',
        quality: 0.92,
        resultBlob: null,
        renderToken: 0, // 防止异步渲染竞态：每次重新渲染时 +1，老的回调里如果 token 对不上就丢弃
    };

    const $ = (id) => document.getElementById(id);

    // 兜底翻译查找：当前 lang → en → key 本身
    function t(key) {
        return (i18n[state.lang] && i18n[state.lang][key]) || i18n.en[key] || key;
    }

    function track(name, data) {
        if (typeof umami === 'undefined') return;
        try { data ? umami.track(name, data) : umami.track(name); } catch (_) { /* 分析不应影响主流程 */ }
    }

    // ============================================================
    // 语言切换 / i18n 应用
    // ============================================================
    function applyLanguage(lang) {
        state.lang = lang;
        if ($('lang-switch')) $('lang-switch').value = lang;

        // 文本节点
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            const text = t(key);
            // why4Desc 在 HTML 里包含 <a> 链接，直接 textContent 会把链接也吃掉；保留原 HTML
            if (key === 'why4Desc') return;
            el.textContent = text;
        });

        // SEO meta：单一来源
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

    // 语言切换：跳到对应语种 URL（让 Google 索引正确）
    function bindLangSwitch() {
        const sel = $('lang-switch');
        if (!sel) return;
        sel.value = state.lang;
        sel.addEventListener('change', (e) => {
            const target = e.target.value;
            // /png-to-jpg-white-background/ ↔ /zh/png-to-jpg-white-background/
            const path = window.location.pathname;
            const isZh = path.startsWith('/zh/');
            if (target === 'zh' && !isZh) {
                window.location.pathname = '/zh' + path;
            } else if (target === 'en' && isZh) {
                window.location.pathname = path.replace(/^\/zh/, '');
            }
        });
    }

    // ============================================================
    // 文件读取与渲染
    // ============================================================
    function readFile(file) {
        return new Promise((resolve, reject) => {
            // Canvas 限制：大多浏览器单条边 ~16384px，且 toBlob 在超大画布上会 OOM。50MB 是个稳妥上限。
            if (file.size > 50 * 1024 * 1024) {
                reject(new Error(t('errTooLarge')));
                return;
            }
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error(t('errLoad')));
            };
            img.src = url;
        });
    }

    // 把 PNG 绘制到 source 预览画布（保留透明，下层走 CSS 棋盘格背景）
    function renderSource() {
        const canvas = $('sourceCanvas');
        const ctx = canvas.getContext('2d');
        const img = state.sourceImage;
        if (!img) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    }

    // 把 PNG 铺到所选背景色上，渲染到 result 画布并生成 JPG blob
    // 异步流程会被 renderToken 保护：用户快速连点不同 swatch 时，老的 toBlob 回调不再覆盖新结果
    function renderResult() {
        const canvas = $('resultCanvas');
        const ctx = canvas.getContext('2d');
        const img = state.sourceImage;
        if (!img) return;

        const token = ++state.renderToken;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        // 1. 先铺背景色（这是 JPG 转换的关键 —— 直接 toBlob('image/jpeg') 会把 alpha 填成黑色）
        ctx.fillStyle = state.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // 2. 再把原图叠上去；alpha 像素会按其 alpha 值与背景混合
        ctx.drawImage(img, 0, 0);

        // 3. 异步生成 JPG blob，更新文件大小读数。token 检查防止快速切换时旧 blob 覆盖新 blob
        canvas.toBlob((blob) => {
            if (token !== state.renderToken) return; // 已被更新的渲染抢占
            state.resultBlob = blob;
            updateSizeReadout(blob);
        }, 'image/jpeg', state.quality);
    }

    function updateSizeReadout(blob) {
        const el = $('sizeReadout');
        if (!blob) {
            el.textContent = t('sizeReadoutEmpty');
            return;
        }
        const size = formatBytes(blob.size);
        el.textContent = t('sizeReadoutFmt').replace('{size}', size);
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    }

    // ============================================================
    // 控件交互
    // ============================================================

    // 高亮选中的 background swatch
    function setActiveSwatch(color) {
        document.querySelectorAll('.bg-swatch').forEach((btn) => {
            if (btn.getAttribute('data-bg') === color) {
                btn.classList.add('border-gray-900', 'bg-gray-50');
                btn.classList.remove('border-gray-300');
            } else {
                btn.classList.remove('border-gray-900', 'bg-gray-50');
                btn.classList.add('border-gray-300');
            }
        });
    }

    function pickBackground(color) {
        state.bgColor = color;
        $('bgColorPicker').value = color;
        setActiveSwatch(color);
        renderResult();
        track('bg-color-change', { color });
    }

    function onQualityChange() {
        const slider = $('qualitySlider');
        const val = parseInt(slider.value, 10);
        state.quality = val / 100;
        $('qualityValue').textContent = val + '%';
        renderResult();
    }

    function showEditor() {
        $('dropzone').classList.add('hidden');
        $('editor').classList.remove('hidden');
    }

    function showDropzone() {
        $('editor').classList.add('hidden');
        $('dropzone').classList.remove('hidden');
        state.sourceImage = null;
        state.resultBlob = null;
    }

    async function handleFile(file) {
        if (!file) return;
        try {
            const img = await readFile(file);
            state.sourceImage = img;
            // 记录文件名（不含扩展），供下载使用
            const dotIdx = file.name.lastIndexOf('.');
            state.sourceFileName = dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name;
            showEditor();
            renderSource();
            renderResult();
            track('file-loaded', { type: file.type, sizeKb: Math.round(file.size / 1024) });
        } catch (err) {
            alert(err.message || t('errLoad'));
        }
    }

    function downloadResult() {
        if (!state.resultBlob) return;
        const url = URL.createObjectURL(state.resultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = state.sourceFileName + '.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // revokeObjectURL 必须等浏览器完成下载流程；微任务里立刻 revoke 在某些浏览器上会导致 0 字节文件
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        track('download', { quality: state.quality, bg: state.bgColor, sizeKb: Math.round(state.resultBlob.size / 1024) });
    }

    // ============================================================
    // 初始化
    // ============================================================
    function init() {
        applyLanguage(state.lang);
        bindLangSwitch();
        setActiveSwatch(state.bgColor);

        // Dropzone 拖放 + 点击
        const dropzone = $('dropzone');
        const fileInput = $('fileInput');
        const dropContent = $('dropzone-content');

        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            handleFile(file);
        });

        ['dragenter', 'dragover'].forEach((ev) => {
            dropzone.addEventListener(ev, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('border-gray-600', 'bg-gray-100');
            });
        });
        ['dragleave', 'drop'].forEach((ev) => {
            dropzone.addEventListener(ev, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('border-gray-600', 'bg-gray-100');
            });
        });
        dropzone.addEventListener('drop', (e) => {
            const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            handleFile(file);
        });

        // 背景色 swatch
        document.querySelectorAll('.bg-swatch').forEach((btn) => {
            btn.addEventListener('click', () => pickBackground(btn.getAttribute('data-bg')));
        });
        // 自定义颜色 picker：onchange 触发太晚（关闭弹窗才触发），用 input 实时更新
        $('bgColorPicker').addEventListener('input', (e) => pickBackground(e.target.value));

        // 画质滑块
        const slider = $('qualitySlider');
        slider.addEventListener('input', onQualityChange);
        $('qualityValue').textContent = slider.value + '%';

        // 下载 / 重置
        $('downloadBtn').addEventListener('click', downloadResult);
        $('replaceBtn').addEventListener('click', () => {
            showDropzone();
            $('fileInput').value = ''; // 允许同名文件再次选择
        });

        // Bookmark banner：和其他子页一样 —— 用户按 dismiss 就走 localStorage 永久隐藏
        const banner = $('bookmark-banner');
        const dismiss = $('dismiss-banner');
        const bannerKey = 'miaocut-bookmark-dismissed-png-to-jpg';
        if (banner && localStorage.getItem(bannerKey) === '1') {
            banner.style.display = 'none';
        }
        // 根据平台显示 Cmd+D vs Ctrl+D
        const sk = $('shortcut-key');
        if (sk && /mac/i.test(navigator.platform)) sk.textContent = 'Cmd + D';
        if (dismiss) {
            dismiss.addEventListener('click', () => {
                banner.style.display = 'none';
                localStorage.setItem(bannerKey, '1');
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
