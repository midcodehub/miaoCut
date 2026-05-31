(function () {
    'use strict';

    const API_BASE = 'https://api2.miaocut.app';
    const presets = {
        one_inch: [295, 413],
        small_one_inch: [260, 378],
        large_one_inch: [390, 567],
        two_inch: [413, 579],
        small_two_inch: [413, 531],
        china_passport: [390, 567],
        us_passport: [600, 600],
        visa_square: [600, 600],
        resume: [480, 640],
        social_profile: [512, 512],
    };

    const i18n = {
        en: {
            // SEO meta（applyLanguage 从这里读 <title>/<meta>，覆盖静态 HTML）
            pageTitle: 'Free Passport & ID Photo Maker Online | MiaoCut',
            metaDescription: 'Free AI passport, visa, and ID photo maker online. Country-specific size presets (China 1-inch/2-inch, US passport, Schengen visa, Japan visa). Choose background color, target KB, print layouts. No signup.',
            metaKeywords: 'id photo maker, passport photo maker, visa photo maker, one inch photo, two inch photo, ai id photo, china passport photo, us passport photo, schengen visa photo, japan visa photo, change photo background, printable id photo sheet',
            ogTitle: 'Free AI Passport & ID Photo Maker | MiaoCut',
            ogDescription: 'Country-specific ID photo presets: China 1-inch / 2-inch, US passport, Schengen visa, Japan visa. Free, no signup.',
            ogLocale: 'en_US',
            navBg: 'Background Remover',
            navId: 'ID Photo',
            navRestore: 'Old Photo',
            navWatermark: 'Watermark',
            navPortrait: 'Portrait',
            navProduct: 'Product',
            eyebrow: 'Passport photos · Visa photos · One-inch · Two-inch · Print layouts',
            heroTitle: 'AI Passport & ID Photo Maker',
            heroSub: 'Upload a portrait, pick a country-specific size preset, set the background color and target KB, and download standard, HD, or printable layout photos.',
            breadcrumbHome: 'MiaoCut',
            breadcrumbCurrent: 'ID Photo Maker',
            portraitLabel: 'Portrait',
            uploadText: 'Click to upload JPG, PNG, or WebP',
            uploadHint: 'Front-facing portrait works best',
            replaceHint: 'Click the preview to replace this portrait',
            sizeLabel: 'Photo size',
            widthLabel: 'Width',
            heightLabel: 'Height',
            bgLabel: 'Background',
            subjectLabel: 'Subject',
            topLabel: 'Top margin',
            kbLabel: 'Target KB',
            qualityLabel: 'Quality',
            alignLabel: 'Face alignment',
            paperLabel: 'Print paper',
            generateBtn: 'Generate ID Photo',
            standardTitle: 'Standard',
            hdTitle: 'HD',
            layoutTitle: 'Layout',
            downloadJpg: 'Download JPG',
            downloadPng: 'Download PNG',
            downloadLayout: 'Download Layout',
            standardEmpty: 'Standard photo will appear here',
            hdEmpty: 'HD transparent photo will appear here',
            layoutEmpty: 'Printable layout will appear here',
            seoTitle: 'Make ID photos for documents, resumes, and online forms',
            seoBody: 'MiaoCut\'s ID photo maker helps you create passport photos, visa photos, one-inch photos, two-inch photos, resume photos, and printable photo sheets. Choose a preset size, adjust the portrait placement, switch background colors, and download both standard and high-resolution outputs.',
            seoCard1: 'Common sizes',
            seoCard1Body: 'One inch, two inch, passport, visa, resume, and custom pixel sizes.',
            seoCard2: 'Background colors',
            seoCard2Body: 'White, blue, red, gray, light blue, dark blue, pink, black, and custom HEX colors.',
            seoCard3: 'Print sheets',
            seoCard3Body: 'Generate 5-inch, 6-inch, 7-inch, or A4 printable layouts.',
            uploadFirst: 'Upload a portrait first.',
            processing: 'Removing background and framing...',
            applying: 'Applying background...',
            layouting: 'Creating print layout...',
            ready: 'Ready',
            faqTitle: 'Frequently Asked Questions',
            faq1Q: 'What ID photo sizes does MiaoCut support?',
            faq1A: 'China 1-inch (295×413), 2-inch (413×579), small/large 1-inch and 2-inch variants, China passport (390×567), US passport (600×600), Schengen visa (600×600), resume photo (480×640), social profile (512×512), plus any custom pixel size.',
            faq2Q: 'What background colors are supported?',
            faq2A: 'White, blue, red, gray, light blue, dark blue, pink, black, and any custom HEX color.',
            faq3Q: 'Can I print multiple ID photos on one sheet?',
            faq3A: 'Yes. Choose 5-inch, 6-inch, 7-inch, or A4 paper to generate a printable layout sheet with multiple copies arranged for cutting.',
            faq4Q: 'Will my photo meet official document requirements?',
            faq4A: 'MiaoCut produces correctly sized photos with neutral backgrounds, but always check your specific document or visa office\'s latest requirements (head size, expression, glasses rules, file format) before submitting.',
            faq5Q: 'Does MiaoCut detect my face automatically?',
            faq5A: 'Yes. MediaPipe Face Mesh detects your eye line and head position, then the photo is auto-cropped and aligned to fit the chosen size preset. You can fine-tune subject size and top margin with the sliders.',
            faq6Q: 'Is my photo private?',
            faq6A: 'Photos are processed in-memory on the server and discarded immediately after the result is returned. We don\'t store your image, don\'t use it for AI training, and there is no signup required.',
            faq7Q: 'Can I set a max file size in KB for online forms?',
            faq7A: 'Yes. The "Target KB" input lets you cap the output file size — useful for visa or job application forms with strict file size limits.',
            // How-to 三步：对应 head 中的 HowTo schema
            howToTitle: 'How to Make a Passport or ID Photo',
            howStep1Title: '1. Upload your portrait',
            howStep1Body: 'Upload a front-facing portrait in JPG, PNG, or WebP. Even, neutral lighting works best.',
            howStep2Title: '2. Pick size and background',
            howStep2Body: 'Choose a country preset (or enter custom dimensions), pick a background color, and adjust subject size or top margin if needed.',
            howStep3Title: '3. Generate, fit KB, download',
            howStep3Body: 'MiaoCut auto-detects your face and produces a standard photo, an HD transparent version, and a printable layout. Set Target KB if your form requires a specific file size.',
            // Per-country presets（H3 重点：分国家长尾流量入口）
            // 每条 6 个字段保持精简：title + 尺寸 + 背景规则 + 适用场景。
            // ⚠️ 各国官方规格随政策更新，文案里务必保留"以官方为准"声明。
            countryTitle: 'ID Photo Specs by Country & Document',
            countrySubtitle: 'Common document sizes and background rules. Always check your specific consulate, embassy, or office\'s latest requirements before submitting — rules change.',
            cnOneInchTitle: 'China 1-inch (一寸)',
            cnOneInchBody: '295 × 413 px · White / blue / red background · For ID cards, school documents, simple application forms.',
            cnTwoInchTitle: 'China 2-inch (二寸)',
            cnTwoInchBody: '413 × 579 px · White / blue / red background · For resumes, diplomas, employment forms, medical reports.',
            cnPassportTitle: 'China Passport (中国护照)',
            cnPassportBody: '390 × 567 px · White background, neutral expression, no glasses recommended · For passport, visa applications submitted in China.',
            usPassportTitle: 'US Passport',
            usPassportBody: '600 × 600 px (2 × 2 inch) · Plain white or off-white background · No glasses (since 2016), neutral expression, full face visible.',
            schengenVisaTitle: 'Schengen Visa (EU)',
            schengenVisaBody: '413 × 531 px (35 × 45 mm) · Light gray or off-white background · 70-80% face coverage, neutral expression.',
            japanVisaTitle: 'Japan Visa',
            japanVisaBody: '600 × 600 px (45 × 45 mm) · White or off-white background · Front-facing, no head covering, taken within 6 months.',
            // Cross-link section（H6）
            moreTitle: 'More MiaoCut Tools',
            moreLinkPortraitTitle: 'Portrait Background Remover →',
            moreLinkPortraitDesc: 'Make clean LinkedIn or social profile pictures.',
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
            // SEO meta（被 scripts/build-i18n.mjs 用来生成 zh/id-photo-maker/index.html。
            // 改这些 key 后跑 npm run build:i18n 同步 zh 静态页。）
            pageTitle: '免费护照照 / 签证照 / 一寸二寸证件照制作 | MiaoCut',
            metaDescription: '免费在线制作证件照、护照照、签证照、一寸照、二寸照和打印排版照。可选尺寸、背景色、KB 大小，AI 自动抠图换底，无需注册。',
            metaKeywords: '证件照制作,护照照片,签证照片,一寸照,二寸照,AI 证件照,在线证件照,换证件照背景,证件照排版打印',
            ogTitle: '免费 AI 证件照制作工具 | MiaoCut',
            ogDescription: '在线制作护照照、签证照、一寸二寸照和排版打印照，可选尺寸和背景色。',
            ogLocale: 'zh_CN',
            navBg: 'AI 抠图',
            navId: '证件照',
            navRestore: '老照片修复',
            navWatermark: '去水印',
            navPortrait: '人像',
            navProduct: '商品图',
            eyebrow: '护照照 · 签证照 · 一寸 · 二寸 · 排版打印',
            heroTitle: 'AI 护照 / 签证 / 证件照制作工具',
            heroSub: '上传人像，选择各国证件照预设、背景颜色和文件 KB，一次生成标准照、高清照和排版打印照。',
            breadcrumbHome: 'MiaoCut',
            breadcrumbCurrent: '证件照制作',
            portraitLabel: '人像照片',
            uploadText: '点击上传 JPG、PNG 或 WebP',
            uploadHint: '正面半身照效果最好',
            replaceHint: '点击预览可替换照片',
            sizeLabel: '证件照尺寸',
            widthLabel: '宽度',
            heightLabel: '高度',
            bgLabel: '背景色',
            subjectLabel: '主体大小',
            topLabel: '顶部留白',
            kbLabel: '目标 KB',
            qualityLabel: '质量',
            alignLabel: '人脸对齐',
            paperLabel: '打印相纸',
            generateBtn: '生成证件照',
            standardTitle: '标准照',
            hdTitle: '高清照',
            layoutTitle: '排版照',
            downloadJpg: '下载 JPG',
            downloadPng: '下载 PNG',
            downloadLayout: '下载排版照',
            standardEmpty: '标准照会显示在这里',
            hdEmpty: '高清透明底照片会显示在这里',
            layoutEmpty: '可打印排版照会显示在这里',
            seoTitle: '制作证件、简历和线上表单所需的证件照',
            seoBody: 'MiaoCut 证件照工具支持护照照、签证照、一寸照、二寸照、简历照和打印排版照。你可以选择预设尺寸，调整人物位置，切换背景颜色，并下载标准照与高清照。',
            seoCard1: '常用尺寸',
            seoCard1Body: '一寸、二寸、护照、签证、简历、自定义像素尺寸。',
            seoCard2: '背景颜色',
            seoCard2Body: '白、蓝、红、灰、浅蓝、深蓝、粉、黑，也支持自定义 HEX。',
            seoCard3: '打印排版',
            seoCard3Body: '支持 5 寸、6 寸、7 寸和 A4 排版照。',
            uploadFirst: '请先上传人像照片。',
            processing: '正在抠图并生成证件照...',
            applying: '正在合成背景...',
            layouting: '正在生成排版照...',
            ready: '已完成',
            faqTitle: '常见问题',
            faq1Q: 'MiaoCut 支持哪些证件照尺寸？',
            faq1A: '一寸（295×413）、二寸（413×579）、小一寸、大一寸、小二寸、中国护照（390×567）、美国护照（600×600）、申根签证（600×600）、简历照（480×640）、社交头像（512×512），以及任意自定义像素尺寸。',
            faq2Q: '支持哪些背景颜色？',
            faq2A: '白、蓝、红、灰、浅蓝、深蓝、粉、黑，也支持自定义任意 HEX 颜色。',
            faq3Q: '可以把多张证件照排在一张相纸上打印吗？',
            faq3A: '可以。选择 5 寸、6 寸、7 寸或 A4 相纸即可生成包含多张证件照的可打印排版照，方便冲印后裁切。',
            faq4Q: '生成的照片符合官方证件要求吗？',
            faq4A: 'MiaoCut 生成尺寸准确、背景纯净的证件照，但提交前请务必核对你具体证件或签证机构的最新要求（头部比例、表情、眼镜规定、文件格式）。',
            faq5Q: 'MiaoCut 会自动识别人脸吗？',
            faq5A: '会。MediaPipe Face Mesh 自动识别双眼连线和头部位置，并按选定尺寸预设自动裁切对齐。你也可以用滑杆微调主体大小和顶部留白。',
            faq6Q: '我的照片安全吗？',
            faq6A: '照片在服务器内存里处理，结果返回后立即销毁。我们绝不存储你的图片、绝不用于 AI 训练，也无需注册账号。',
            faq7Q: '可以设置文件大小（KB）以满足线上表单要求吗？',
            faq7A: '可以。"目标 KB" 输入框允许你限制输出文件大小 —— 对于有严格文件大小限制的签证或求职申请表单非常实用。',
            howToTitle: '如何制作护照照或证件照',
            howStep1Title: '1. 上传你的人像',
            howStep1Body: '上传 JPG / PNG / WebP 正面人像，光线均匀、表情自然效果最好。',
            howStep2Title: '2. 选择尺寸和背景',
            howStep2Body: '从国家预设里选（或自定义像素尺寸），挑选背景色，必要时微调主体大小和顶部留白。',
            howStep3Title: '3. 生成、控制 KB、下载',
            howStep3Body: 'MiaoCut 自动识别人脸，生成标准照、HD 透明底版本和打印排版照。需要严格文件大小时设置"目标 KB"。',
            countryTitle: '各国证件照规格速查',
            countrySubtitle: '常见证件尺寸与背景规则。提交前务必核对你具体证件、签证或办公室的最新要求 —— 规则可能更新。',
            cnOneInchTitle: '中国一寸',
            cnOneInchBody: '295 × 413 px · 白 / 蓝 / 红底 · 适合身份证、学生证、普通申请表。',
            cnTwoInchTitle: '中国二寸',
            cnTwoInchBody: '413 × 579 px · 白 / 蓝 / 红底 · 适合简历、毕业证、入职表、体检表。',
            cnPassportTitle: '中国护照',
            cnPassportBody: '390 × 567 px · 白底，表情自然，建议不戴眼镜 · 适合在国内办理护照、签证申请。',
            usPassportTitle: '美国护照',
            usPassportBody: '600 × 600 px（2 × 2 英寸）· 纯白或米白背景 · 不戴眼镜（2016 年后规定），表情自然，露出整张脸。',
            schengenVisaTitle: '申根签证（欧盟）',
            schengenVisaBody: '413 × 531 px（35 × 45 mm）· 浅灰或米白背景 · 面部占 70~80%，表情自然。',
            japanVisaTitle: '日本签证',
            japanVisaBody: '600 × 600 px（45 × 45 mm）· 白色或米白背景 · 正面，无头饰，6 个月内拍摄。',
            moreTitle: '更多 MiaoCut 工具',
            moreLinkPortraitTitle: '人像抠图 →',
            moreLinkPortraitDesc: '制作干净的 LinkedIn 或社交头像。',
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
    // 不再用 localStorage 决定语言：每个 URL（/id-photo-maker/ vs /zh/id-photo-maker/）已经
    // 是预渲染好的对应语种，让 Google 能分别索引，JS 只负责动态文案。
    const _htmlLang = (document.documentElement.lang || 'en').toLowerCase();
    const state = {
        file: null,
        transparentStandard: null,
        transparentHd: null,
        standard: null,
        layout: null,
        color: '438edb',
        previewUrl: null,
        lang: _htmlLang.startsWith('zh') ? 'zh' : 'en',
    };

    const $ = (id) => document.getElementById(id);
    const fileInput = $('id-file');
    const fileName = $('file-name');
    const uploadCard = $('upload-card');
    const uploadIcon = $('upload-icon');
    const uploadPreview = $('upload-preview');
    const uploadHint = $('upload-hint');
    const preset = $('preset');
    const customSize = $('custom-size');
    const widthInput = $('width');
    const heightInput = $('height');
    const colorInput = $('custom-color');
    const statusEl = $('status');
    const generateBtn = $('generate');
    const standardPreview = $('standard-preview');
    const hdPreview = $('hd-preview');
    const layoutPreview = $('layout-preview');
    const standardEmpty = $('standard-empty');
    const hdEmpty = $('hd-empty');
    const layoutEmpty = $('layout-empty');
    const layoutMeta = $('layout-meta');
    const downloadStandard = $('download-standard');
    const downloadHd = $('download-hd');
    const downloadLayout = $('download-layout');
    const langSwitch = $('lang-switch');

    function t(key) {
        return (i18n[state.lang] && i18n[state.lang][key]) || i18n.en[key] || key;
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
        // 从字典读 <title>、meta —— 单一来源；<html lang> 由静态 HTML 在构建时写死
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

    function selectedSize() {
        if (preset.value === 'custom') {
            return [Number(widthInput.value || 295), Number(heightInput.value || 413)];
        }
        return presets[preset.value] || presets.one_inch;
    }

    function dataUrl(base64, mime) {
        return `data:${mime};base64,${base64}`;
    }

    function downloadBase64(base64, filename, mime) {
        const a = document.createElement('a');
        a.href = dataUrl(base64, mime);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async function postJson(path, body) {
        const res = await fetch(API_BASE + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
            throw new Error(data.detail || data.message || `Request failed (${res.status})`);
        }
        return data;
    }

    function showImage(img, empty, base64, mime) {
        img.src = dataUrl(base64, mime);
        img.classList.remove('hidden');
        empty.classList.add('hidden');
    }

    async function refreshOutputs() {
        if (!state.transparentStandard) return;
        setStatus(t('applying'));
        const kb = $('target-kb').value ? Number($('target-kb').value) : null;
        const bg = await postJson('/api/id-photo/add-background', {
            image_base64: state.transparentStandard,
            color: state.color,
            kb,
        });
        state.standard = bg.image_base64;
        showImage(standardPreview, standardEmpty, state.standard, 'image/jpeg');
        downloadStandard.classList.remove('hidden');

        showImage(hdPreview, hdEmpty, state.transparentHd || state.transparentStandard, 'image/png');
        downloadHd.classList.remove('hidden');

        setStatus(t('layouting'));
        const layout = await postJson('/api/id-photo/layout', {
            image_base64: state.transparentStandard,
            color: state.color,
            paper: $('paper').value,
        });
        state.layout = layout.image_base64;
        showImage(layoutPreview, layoutEmpty, state.layout, 'image/jpeg');
        downloadLayout.classList.remove('hidden');
        layoutMeta.textContent = `${layout.paper_width} x ${layout.paper_height}px · ${layout.copies} copies`;
        setStatus(t('ready'));
    }

    async function generate() {
        if (!state.file) {
            setStatus(t('uploadFirst'));
            return;
        }
        generateBtn.disabled = true;
        setStatus(t('processing'));
        try {
            const [w, h] = selectedSize();
            const form = new FormData();
            form.append('file', state.file);
            form.append('preset', preset.value);
            form.append('width', String(w));
            form.append('height', String(h));
            form.append('dpi', '300');
            form.append('profile', $('profile').value);
            form.append('head_height_ratio', String(Number($('head-ratio').value) / 100));
            form.append('top_margin_ratio', String(Number($('top-margin').value) / 100));
            form.append('face_alignment', $('face-alignment').checked ? '1' : '0');

            const res = await fetch(API_BASE + '/api/id-photo/create', {
                method: 'POST',
                body: form,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
                throw new Error(data.detail || `Request failed (${res.status})`);
            }
            state.transparentStandard = data.image_base64_standard;
            state.transparentHd = data.image_base64_hd;
            await refreshOutputs();
            if (typeof umami !== 'undefined') {
                umami.track('id-photo-success', { preset: preset.value, paper: $('paper').value });
            }
        } catch (err) {
            console.error(err);
            setStatus(err.message || 'Failed to generate ID photo.');
            if (typeof umami !== 'undefined') {
                umami.track('id-photo-failed', { reason: err.message || 'unknown' });
            }
        } finally {
            generateBtn.disabled = false;
        }
    }

    fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
        state.file = file;
        state.previewUrl = URL.createObjectURL(file);
        uploadPreview.src = state.previewUrl;
        uploadPreview.classList.remove('hidden');
        uploadIcon.classList.add('hidden');
        uploadCard.classList.remove('py-6');
        uploadCard.classList.add('p-3');
        fileName.textContent = file.name;
        uploadHint.textContent = t('replaceHint');
        setStatus('');
    });

    preset.addEventListener('change', () => {
        customSize.classList.toggle('hidden', preset.value !== 'custom');
        const size = selectedSize();
        widthInput.value = String(size[0]);
        heightInput.value = String(size[1]);
    });

    document.querySelectorAll('.color-swatch').forEach((button) => {
        button.addEventListener('click', async () => {
            state.color = button.dataset.color;
            colorInput.value = state.color;
            document.querySelectorAll('.color-swatch').forEach((el) => {
                el.classList.remove('border-gray-900');
                el.classList.add('border-transparent');
            });
            button.classList.add('border-gray-900');
            button.classList.remove('border-transparent');
            try {
                await refreshOutputs();
            } catch (err) {
                setStatus(err.message || 'Failed to update background.');
            }
        });
    });

    colorInput.addEventListener('change', async () => {
        state.color = colorInput.value.replace('#', '') || '438edb';
        try {
            await refreshOutputs();
        } catch (err) {
            setStatus(err.message || 'Failed to update background.');
        }
    });

    generateBtn.addEventListener('click', generate);
    downloadStandard.addEventListener('click', () => {
        if (state.standard) downloadBase64(state.standard, 'miaocut-id-photo-standard.jpg', 'image/jpeg');
    });
    downloadHd.addEventListener('click', () => {
        if (state.transparentHd) downloadBase64(state.transparentHd, 'miaocut-id-photo-hd.png', 'image/png');
    });
    downloadLayout.addEventListener('click', () => {
        if (state.layout) downloadBase64(state.layout, 'miaocut-id-photo-layout.jpg', 'image/jpeg');
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
