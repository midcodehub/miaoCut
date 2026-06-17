// ============================================================
// MiaoCut 共享前端逻辑
// ============================================================
// 设计初衷：
//   首页 + use case 子页（/product-photo-background-remover/、/portrait-background-remover/...）
//   都需要同一套 dropzone + 上传 + 多语言 + 反馈逻辑，但 SEO 文案/title/i18n 各不相同。
//
// 约定：每个 HTML 在加载本脚本之前，先在 <head> 内联：
//   window.MIAOCUT_PAGE_I18N = { zh: { ... }, en: { ... }, ... }   // 页面专属 i18n（见下方 PAGE_REQUIRED_KEYS）
//   window.MIAOCUT_PAGE_TITLES = { zh: "...", en: "...", ... }     // <title> 文本
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

    const LOCALES = [
        { code: 'en', htmlLang: 'en', prefix: '' },
        { code: 'zh', htmlLang: 'zh-CN', prefix: '/zh' },
        { code: 'hi', htmlLang: 'hi-IN', prefix: '/hi' },
        { code: 'id', htmlLang: 'id-ID', prefix: '/id' },
        { code: 'pt-br', htmlLang: 'pt-BR', prefix: '/pt-br' },
        { code: 'bn', htmlLang: 'bn-BD', prefix: '/bn' },
        { code: 'fil', htmlLang: 'fil-PH', prefix: '/fil' },
        { code: 'ur', htmlLang: 'ur-PK', prefix: '/ur' },
    ];
    const LOCALE_PREFIXES = LOCALES
        .filter(locale => locale.prefix)
        .map(locale => locale.prefix)
        .sort((a, b) => b.length - a.length);
    const LOCALE_BY_CODE = Object.fromEntries(LOCALES.map(locale => [locale.code, locale]));

    function localeFromHtmlLang(lang) {
        const normalized = (lang || 'en').toLowerCase();
        const exact = LOCALES.find(locale => locale.htmlLang.toLowerCase() === normalized || locale.code === normalized);
        if (exact) return exact.code;
        if (normalized.startsWith('pt')) return 'pt-br';
        if (normalized.startsWith('zh')) return 'zh';
        if (normalized.startsWith('hi')) return 'hi';
        if (normalized.startsWith('id')) return 'id';
        if (normalized.startsWith('bn')) return 'bn';
        if (normalized.startsWith('fil') || normalized.startsWith('tl')) return 'fil';
        if (normalized.startsWith('ur')) return 'ur';
        return 'en';
    }

    function stripLocalePrefix(path) {
        for (const prefix of LOCALE_PREFIXES) {
            if (path === prefix) return '/';
            if (path.startsWith(prefix + '/')) return path.slice(prefix.length) || '/';
        }
        return path;
    }

    function localizePath(path, targetLang) {
        const locale = LOCALE_BY_CODE[targetLang] || LOCALE_BY_CODE.en;
        if (!locale.prefix) return stripLocalePrefix(path);
        const basePath = stripLocalePrefix(path);
        return basePath === '/' ? `${locale.prefix}/` : `${locale.prefix}${basePath}`;
    }

    // ============================================================
    // 共享 i18n（chrome / 上传状态 / 反馈表单）
    // ============================================================
    const BASE_I18N = {
    "zh": {
        "dropzoneTitle": "将图片拖拽至此，或点击上传",
        "dropzoneSub": "（支持 JPG / PNG / WebP）",
        "trustTitle": "你的图片绝对安全。",
        "trustSub": "纯内存处理，15分钟后自动销毁，绝不用于 AI 训练。",
        "navBg": "AI 抠图",
        "navId": "证件照",
        "navRestore": "老照片修复",
        "navWatermark": "去水印",
        "navPortrait": "人像",
        "navProduct": "商品图",
        "profileLabel": "质量：",
        "profileSharp": "快速",
        "profileFur": "细腻（毛发/发丝）",
        "profileHintSharp": "约 1 秒 · 适合日常照片",
        "profileHintFur": "约 3~5 秒 · 适合宠物、长发、羽毛、植物",
        "bookmarkText": "喜欢 MiaoCut 吗？按",
        "bookmarkSuffix": "加入书签，下次抠图只需 1 秒！",
        "fbTitle": "☕ 提出建议",
        "fbPlaceholder": "有什么想法？",
        "fbEmail": "邮箱（选填，方便我们回复你）",
        "fbSend": "发送",
        "fbThanks": "感谢你的建议！",
        "fbThanksSub": "我们会认真对待每一条反馈",
        "compressing": "压缩中...",
        "uploading": "上传中...",
        "processing": "AI 处理中...",
        "done": "完成!",
        "formatErr": "仅支持 JPG / PNG / WebP 格式的图片",
        "successTitle": "处理成功！",
        "successSub": "可以继续编辑或下载。",
        "failTitle": "抱歉，处理失败",
        "alertSize": "仅支持 JPG / PNG / WebP 格式的图片",
        "editorHomeTitle": "结果已生成",
        "editorHomeSub": "下载透明 PNG，或先换一个简单背景再保存。",
        "editorProductTitle": "商品图已准备好",
        "editorProductSub": "快速生成白底、方形画布和阴影版商品图。",
        "editorPortraitTitle": "人像抠图已准备好",
        "editorPortraitSub": "切换职业头像背景、尺寸和圆形头像预览。",
        "backgroundLabel": "背景",
        "outputSizeLabel": "输出尺寸",
        "subjectPaddingLabel": "主体边距",
        "shadowLabel": "阴影",
        "shapeLabel": "形状",
        "portraitScaleLabel": "头肩占比",
        "bgImage": "图片",
        "uploadBgImage": "上传背景图",
        "replaceBgImage": "更换背景图",
        "bgScaleLabel": "背景缩放",
        "dragBgHint": "拖动画布可移动背景",
        "amazonPreset": "Amazon-safe 白底预设",
        "bgTransparent": "透明",
        "bgWhite": "白色",
        "bgBlack": "黑色",
        "bgLightGray": "浅灰",
        "bgBlue": "蓝色",
        "bgGradient": "渐变",
        "bgBlur": "虚化原图",
        "bgCustom": "自定义",
        "sizeOriginal": "原始尺寸",
        "sizeSquare1080": "1:1 · 1080",
        "sizeSquare2000": "1:1 · 2000",
        "sizeSquare2048": "1:1 · 2048",
        "sizeAvatar512": "头像 · 512",
        "sizeAvatar1024": "头像 · 1024",
        "sizeResume": "简历 · 480×640",
        "shadowNone": "无",
        "shadowSoft": "柔和",
        "shadowFloat": "悬浮",
        "shapeSquare": "方形",
        "shapeCircle": "圆形",
        "downloadTransparent": "下载透明 PNG",
        "downloadEdited": "下载当前效果",
        "downloadSquare": "下载方形 PNG",
        "downloadCircle": "下载圆形 PNG",
        "startOver": "换一张图",
        "footerToolsTitle": "全部 MiaoCut 工具",
        "footerCatRemove": "AI 抠图",
        "footerCatConvert": "格式转换",
        "footerCatRepair": "照片修复与增强",
        "footerCatGuides": "使用教程",
        "guideHubTitle": "如何去除背景",
        "guidePptTitle": "在 PowerPoint 中去背景",
        "guideGimpTitle": "在 GIMP 中去背景",
        "guidesPromoText": "在用别的软件？看我们的分步教程：",
        "guidesPromoLink": "如何在 PowerPoint、GIMP 等工具里去除背景",
        "footerTagline": "MiaoCut · 免费、注重隐私的 AI 图片工具集。",
        "footerPrivacy": "隐私政策",
        "footerTerms": "服务条款",
        "toolBgTitle": "去除背景",
        "toolProductTitle": "商品图",
        "toolPortraitTitle": "人像",
        "toolIdTitle": "证件照",
        "toolJpgPngTitle": "JPG → 透明 PNG",
        "toolPngJpgTitle": "PNG → JPG",
        "toolWatermarkTitle": "去水印",
        "toolRestoreTitle": "老照片"
    },
    "en": {
        "dropzoneTitle": "Drag & drop image here, or click to upload",
        "dropzoneSub": "(Supports JPG / PNG / WebP)",
        "trustTitle": "Your images are 100% safe.",
        "trustSub": "Processed in-memory, destroyed automatically. Never used for AI training.",
        "navBg": "Background Remover",
        "navId": "ID Photo",
        "navRestore": "Old Photo",
        "navWatermark": "Watermark",
        "navPortrait": "Portrait",
        "navProduct": "Product",
        "profileLabel": "Quality:",
        "profileSharp": "Fast",
        "profileFur": "Fine (hair / fur)",
        "profileHintSharp": "~1s · everyday photos",
        "profileHintFur": "~3-5s · pets, long hair, feathers, plants",
        "bookmarkText": "Like MiaoCut? Press",
        "bookmarkSuffix": "to bookmark, next cutout is just 1 sec away!",
        "fbTitle": "☕ Feedback",
        "fbPlaceholder": "What's on your mind?",
        "fbEmail": "Email (Optional)",
        "fbSend": "Send",
        "fbThanks": "Thanks for your feedback!",
        "fbThanksSub": "We read every single message.",
        "compressing": "Compressing...",
        "uploading": "Uploading...",
        "processing": "AI Processing...",
        "done": "Done!",
        "formatErr": "Only JPG / PNG / WebP formats are supported",
        "successTitle": "Success!",
        "successSub": "Ready to edit or download.",
        "failTitle": "Sorry, processing failed",
        "alertSize": "Only JPG / PNG / WebP formats are supported",
        "editorHomeTitle": "Your cutout is ready",
        "editorHomeSub": "Download the transparent PNG, or add a simple background first.",
        "editorProductTitle": "Product photo ready",
        "editorProductSub": "Create a white-background, square-canvas, or shadowed product image.",
        "editorPortraitTitle": "Portrait cutout ready",
        "editorPortraitSub": "Switch profile backgrounds, output sizes, and circular avatar previews.",
        "backgroundLabel": "Background",
        "outputSizeLabel": "Output size",
        "subjectPaddingLabel": "Subject padding",
        "shadowLabel": "Shadow",
        "shapeLabel": "Shape",
        "portraitScaleLabel": "Head / shoulder size",
        "bgImage": "Image",
        "uploadBgImage": "Upload background",
        "replaceBgImage": "Replace background",
        "bgScaleLabel": "Background scale",
        "dragBgHint": "Drag the canvas to move the background",
        "amazonPreset": "Amazon-safe white preset",
        "bgTransparent": "Transparent",
        "bgWhite": "White",
        "bgBlack": "Black",
        "bgLightGray": "Light gray",
        "bgBlue": "Blue",
        "bgGradient": "Gradient",
        "bgBlur": "Blur original",
        "bgCustom": "Custom",
        "sizeOriginal": "Original size",
        "sizeSquare1080": "1:1 · 1080",
        "sizeSquare2000": "1:1 · 2000",
        "sizeSquare2048": "1:1 · 2048",
        "sizeAvatar512": "Avatar · 512",
        "sizeAvatar1024": "Avatar · 1024",
        "sizeResume": "Resume · 480×640",
        "shadowNone": "None",
        "shadowSoft": "Soft",
        "shadowFloat": "Floating",
        "shapeSquare": "Square",
        "shapeCircle": "Circle",
        "downloadTransparent": "Download transparent PNG",
        "downloadEdited": "Download current version",
        "downloadSquare": "Download square PNG",
        "downloadCircle": "Download circular PNG",
        "startOver": "Choose another image",
        "footerToolsTitle": "All MiaoCut Tools",
        "footerCatRemove": "AI Background Removal",
        "footerCatConvert": "Format Conversion",
        "footerCatRepair": "Photo Repair & Enhancement",
        "footerCatGuides": "Guides",
        "guideHubTitle": "How to Remove a Background",
        "guidePptTitle": "In PowerPoint",
        "guideGimpTitle": "In GIMP",
        "guidesPromoText": "Using another app? See our step-by-step guides for ",
        "guidesPromoLink": "removing backgrounds in PowerPoint, GIMP, and more",
        "footerTagline": "MiaoCut · Free AI image tools that respect your privacy.",
        "footerPrivacy": "Privacy",
        "footerTerms": "Terms",
        "toolBgTitle": "Remove Background",
        "toolProductTitle": "Product",
        "toolPortraitTitle": "Portrait",
        "toolIdTitle": "ID Photo",
        "toolJpgPngTitle": "JPG → Transparent PNG",
        "toolPngJpgTitle": "PNG → JPG",
        "toolWatermarkTitle": "Watermark",
        "toolRestoreTitle": "Old Photo"
    },
    "hi": {
        "dropzoneTitle": "छवि को यहां खींचें और छोड़ें, या अपलोड करने के लिए क्लिक करें",
        "dropzoneSub": "(JPG / PNG / WebP का समर्थन करता है)",
        "trustTitle": "आपकी छवियां 100% सुरक्षित हैं.",
        "trustSub": "मेमोरी में संसाधित, स्वचालित रूप से नष्ट हो जाता है। AI प्रशिक्षण के लिए कभी भी उपयोग नहीं किया गया।",
        "navBg": "पृष्ठभूमि हटानेवाला",
        "navId": "ID फोटो",
        "navRestore": "पुरानी फोटो",
        "navWatermark": "वाटर-मार्क",
        "navPortrait": "चित्र",
        "navProduct": "उत्पाद",
        "profileLabel": "गुणवत्ता:",
        "profileSharp": "तेज़",
        "profileFur": "बढ़िया (बाल/फर)",
        "profileHintSharp": "~1s · रोजमर्रा की तस्वीरें",
        "profileHintFur": "~3-5 सेकंड · पालतू जानवर, लंबे बाल, पंख, पौधे",
        "bookmarkText": "MiaoCut की तरह? प्रेस",
        "bookmarkSuffix": "बुकमार्क करने के लिए, अगला कटआउट केवल 1 सेकंड दूर है!",
        "fbTitle": "☕ प्रतिक्रिया",
        "fbPlaceholder": "आपके दिमाग में क्या है?",
        "fbEmail": "ईमेल वैकल्पिक)",
        "fbSend": "भेजना",
        "fbThanks": "आपकी प्रतिक्रिया के लिए धन्यवाद!",
        "fbThanksSub": "हम हर एक संदेश पढ़ते हैं.",
        "compressing": "संपीड़न...",
        "uploading": "अपलोड हो रहा है...",
        "processing": "AI प्रसंस्करण...",
        "done": "हो गया!",
        "formatErr": "केवल JPG / PNG / WebP प्रारूप समर्थित हैं",
        "successTitle": "सफलता!",
        "successSub": "संपादित या डाउनलोड करने के लिए तैयार.",
        "failTitle": "क्षमा करें, प्रसंस्करण विफल रहा",
        "alertSize": "केवल JPG / PNG / WebP प्रारूप समर्थित हैं",
        "editorHomeTitle": "आपका कटआउट तैयार है",
        "editorHomeSub": "पारदर्शी PNG डाउनलोड करें, या पहले एक साधारण पृष्ठभूमि जोड़ें।",
        "editorProductTitle": "उत्पाद फोटो तैयार",
        "editorProductSub": "एक सफ़ेद-पृष्ठभूमि, चौकोर-कैनवास, या छायांकित उत्पाद छवि बनाएं।",
        "editorPortraitTitle": "पोर्ट्रेट कटआउट तैयार",
        "editorPortraitSub": "प्रोफ़ाइल पृष्ठभूमि, आउटपुट आकार और गोलाकार अवतार पूर्वावलोकन बदलें।",
        "backgroundLabel": "पृष्ठभूमि",
        "outputSizeLabel": "आउटपुट आकार",
        "subjectPaddingLabel": "विषय पैडिंग",
        "shadowLabel": "छाया",
        "shapeLabel": "आकार",
        "portraitScaleLabel": "सिर/कंधे का आकार",
        "bgImage": "छवि",
        "uploadBgImage": "पृष्ठभूमि अपलोड करें",
        "replaceBgImage": "पृष्ठभूमि बदलें",
        "bgScaleLabel": "पृष्ठभूमि पैमाना",
        "dragBgHint": "पृष्ठभूमि को स्थानांतरित करने के लिए कैनवास को खींचें",
        "amazonPreset": "Amazon-सुरक्षित सफेद प्रीसेट",
        "bgTransparent": "पारदर्शी",
        "bgWhite": "सफ़ेद",
        "bgBlack": "काला",
        "bgLightGray": "हल्का ग्रे",
        "bgBlue": "नीला",
        "bgGradient": "ढाल",
        "bgBlur": "मूल को धुंधला करें",
        "bgCustom": "रिवाज़",
        "sizeOriginal": "मूल आकार",
        "sizeSquare1080": "1:1 · 1080",
        "sizeSquare2000": "1:1 · 2000",
        "sizeSquare2048": "1:1 · 2048",
        "sizeAvatar512": "अवतार · 512",
        "sizeAvatar1024": "अवतार · 1024",
        "sizeResume": "बायोडाटा · 480×640",
        "shadowNone": "कोई नहीं",
        "shadowSoft": "कोमल",
        "shadowFloat": "चल",
        "shapeSquare": "वर्ग",
        "shapeCircle": "घेरा",
        "downloadTransparent": "पारदर्शी PNG डाउनलोड करें",
        "downloadEdited": "वर्तमान संस्करण डाउनलोड करें",
        "downloadSquare": "वर्ग PNG डाउनलोड करें",
        "downloadCircle": "परिपत्र PNG डाउनलोड करें",
        "startOver": "कोई अन्य छवि चुनें",
        "footerToolsTitle": "सभी MiaoCut उपकरण",
        "footerCatRemove": "AI पृष्ठभूमि हटाना",
        "footerCatConvert": "प्रारूप रूपांतरण",
        "footerCatRepair": "फोटो मरम्मत एवं संवर्द्धन",
        "footerCatGuides": "गाइड",
        "guideHubTitle": "बैकग्राउंड कैसे हटाएं",
        "guidePptTitle": "PowerPoint में",
        "guideGimpTitle": "जीआईएमपी में",
        "guidesPromoText": "किसी अन्य ऐप का उपयोग कर रहे हैं? इसके लिए हमारी चरण-दर-चरण मार्गदर्शिकाएँ देखें ",
        "guidesPromoLink": "PowerPoint, GIMP और अन्य में पृष्ठभूमि हटाना",
        "footerTagline": "MiaoCut · मुफ़्त AI छवि उपकरण जो आपकी गोपनीयता का सम्मान करते हैं।",
        "footerPrivacy": "गोपनीयता",
        "footerTerms": "शर्तें",
        "toolBgTitle": "पृष्ठभूमि निकालें",
        "toolProductTitle": "उत्पाद",
        "toolPortraitTitle": "चित्र",
        "toolIdTitle": "ID फोटो",
        "toolJpgPngTitle": "JPG → पारदर्शी PNG",
        "toolPngJpgTitle": "PNG → JPG",
        "toolWatermarkTitle": "वाटर-मार्क",
        "toolRestoreTitle": "पुरानी फोटो"
    },
    "id": {
        "dropzoneTitle": "Seret & letakkan gambar di sini, atau klik untuk mengunggah",
        "dropzoneSub": "(Mendukung JPG / PNG / WebP)",
        "trustTitle": "Gambar Anda 100% aman.",
        "trustSub": "Diproses dalam memori, dimusnahkan secara otomatis. Tidak pernah digunakan untuk pelatihan AI.",
        "navBg": "Penghapus Latar Belakang",
        "navId": "Foto ID",
        "navRestore": "Foto lama",
        "navWatermark": "Tanda air",
        "navPortrait": "Potret",
        "navProduct": "Produk",
        "profileLabel": "Kualitas:",
        "profileSharp": "Cepat",
        "profileFur": "Halus (rambut/bulu)",
        "profileHintSharp": "~1s · foto sehari-hari",
        "profileHintFur": "~3-5s · hewan peliharaan, rambut panjang, bulu, tanaman",
        "bookmarkText": "Seperti MiaoCut? Tekan",
        "bookmarkSuffix": "untuk menandai, potongan berikutnya hanya berjarak 1 detik!",
        "fbTitle": "☕ Umpan balik",
        "fbPlaceholder": "Apa yang ada di pikiranmu?",
        "fbEmail": "Email (Opsional)",
        "fbSend": "Mengirim",
        "fbThanks": "Terima kasih atas tanggapan Anda!",
        "fbThanksSub": "Kami membaca setiap pesan.",
        "compressing": "Mengompresi...",
        "uploading": "Mengunggah...",
        "processing": "Pemrosesan AI...",
        "done": "Selesai!",
        "formatErr": "Hanya format JPG / PNG / WebP yang didukung",
        "successTitle": "Kesuksesan!",
        "successSub": "Siap untuk diedit atau diunduh.",
        "failTitle": "Maaf, pemrosesan gagal",
        "alertSize": "Hanya format JPG / PNG / WebP yang didukung",
        "editorHomeTitle": "Potongan Anda sudah siap",
        "editorHomeSub": "Unduh PNG transparan, atau tambahkan latar belakang sederhana terlebih dahulu.",
        "editorProductTitle": "Foto produk sudah siap",
        "editorProductSub": "Buat gambar produk berlatar belakang putih, kanvas persegi, atau berbayang.",
        "editorPortraitTitle": "Potongan potret sudah siap",
        "editorPortraitSub": "Ganti latar belakang profil, ukuran keluaran, dan pratinjau avatar melingkar.",
        "backgroundLabel": "Latar belakang",
        "outputSizeLabel": "Ukuran keluaran",
        "subjectPaddingLabel": "Bantalan subjek",
        "shadowLabel": "Bayangan",
        "shapeLabel": "Membentuk",
        "portraitScaleLabel": "Ukuran kepala/bahu",
        "bgImage": "Gambar",
        "uploadBgImage": "Unggah latar belakang",
        "replaceBgImage": "Ganti latar belakang",
        "bgScaleLabel": "Skala latar belakang",
        "dragBgHint": "Seret kanvas untuk memindahkan latar belakang",
        "amazonPreset": "Preset putih aman Amazon",
        "bgTransparent": "Transparan",
        "bgWhite": "Putih",
        "bgBlack": "Hitam",
        "bgLightGray": "Abu-abu muda",
        "bgBlue": "Biru",
        "bgGradient": "Gradien",
        "bgBlur": "Buramkan yang asli",
        "bgCustom": "Kebiasaan",
        "sizeOriginal": "Ukuran asli",
        "sizeSquare1080": "1:1 · 1080",
        "sizeSquare2000": "1:1 · 2000",
        "sizeSquare2048": "1:1 · 2048",
        "sizeAvatar512": "Avatar · 512",
        "sizeAvatar1024": "Avatar · 1024",
        "sizeResume": "Lanjutkan · 480×640",
        "shadowNone": "Tidak ada",
        "shadowSoft": "Lembut",
        "shadowFloat": "Mengapung",
        "shapeSquare": "Persegi",
        "shapeCircle": "Lingkaran",
        "downloadTransparent": "Unduh PNG transparan",
        "downloadEdited": "Unduh versi saat ini",
        "downloadSquare": "Unduh kotak PNG",
        "downloadCircle": "Unduh melingkar PNG",
        "startOver": "Pilih gambar lain",
        "footerToolsTitle": "Semua Alat MiaoCut",
        "footerCatRemove": "Penghapusan Latar Belakang AI",
        "footerCatConvert": "Konversi Format",
        "footerCatRepair": "Perbaikan & Peningkatan Foto",
        "footerCatGuides": "Panduan",
        "guideHubTitle": "Cara Menghapus Latar Belakang",
        "guidePptTitle": "Di PowerPoint",
        "guideGimpTitle": "Di GIMP",
        "guidesPromoText": "Menggunakan aplikasi lain? Lihat panduan langkah demi langkah kami untuk ",
        "guidesPromoLink": "menghapus latar belakang di PowerPoint, GIMP, dan lainnya",
        "footerTagline": "MiaoCut · Alat gambar AI gratis yang menghormati privasi Anda.",
        "footerPrivacy": "Pribadi",
        "footerTerms": "Ketentuan",
        "toolBgTitle": "Hapus Latar Belakang",
        "toolProductTitle": "Produk",
        "toolPortraitTitle": "Potret",
        "toolIdTitle": "Foto ID",
        "toolJpgPngTitle": "JPG → PNG Transparan",
        "toolPngJpgTitle": "PNG → JPG",
        "toolWatermarkTitle": "Tanda air",
        "toolRestoreTitle": "Foto lama"
    },
    "pt-br": {
        "dropzoneTitle": "Arraste e solte a imagem aqui ou clique para fazer upload",
        "dropzoneSub": "(Suporta JPG/PNG/WebP)",
        "trustTitle": "Suas imagens são 100% seguras.",
        "trustSub": "Processado na memória, destruído automaticamente. Nunca usado para treinamento AI.",
        "navBg": "Removedor de fundo",
        "navId": "Foto ID",
        "navRestore": "Foto antiga",
        "navWatermark": "Marca d’água",
        "navPortrait": "Retrato",
        "navProduct": "Produto",
        "profileLabel": "Qualidade:",
        "profileSharp": "Rápido",
        "profileFur": "Fino (cabelo/pele)",
        "profileHintSharp": "~1s · fotos do dia a dia",
        "profileHintFur": "~3-5s · animais de estimação, cabelos longos, penas, plantas",
        "bookmarkText": "Gosta do MiaoCut? Imprensa",
        "bookmarkSuffix": "para marcar, o próximo recorte estará a apenas 1 segundo de distância!",
        "fbTitle": "☕ Feedback",
        "fbPlaceholder": "O que está em sua mente?",
        "fbEmail": "E-mail (opcional)",
        "fbSend": "Enviar",
        "fbThanks": "Obrigado pelo seu feedback!",
        "fbThanksSub": "Lemos cada mensagem.",
        "compressing": "Comprimindo...",
        "uploading": "Fazendo upload...",
        "processing": "Processamento AI...",
        "done": "Feito!",
        "formatErr": "Apenas os formatos JPG/PNG/WebP são suportados",
        "successTitle": "Sucesso!",
        "successSub": "Pronto para editar ou baixar.",
        "failTitle": "Desculpe, o processamento falhou",
        "alertSize": "Apenas os formatos JPG/PNG/WebP são suportados",
        "editorHomeTitle": "Seu recorte está pronto",
        "editorHomeSub": "Baixe o PNG transparente ou adicione primeiro um fundo simples.",
        "editorProductTitle": "Foto do produto pronta",
        "editorProductSub": "Crie uma imagem de produto com fundo branco, tela quadrada ou sombreada.",
        "editorPortraitTitle": "Recorte de retrato pronto",
        "editorPortraitSub": "Alterne planos de fundo de perfil, tamanhos de saída e visualizações circulares de avatar.",
        "backgroundLabel": "Fundo",
        "outputSizeLabel": "Tamanho de saída",
        "subjectPaddingLabel": "Preenchimento de assunto",
        "shadowLabel": "Sombra",
        "shapeLabel": "Forma",
        "portraitScaleLabel": "Tamanho da cabeça/ombro",
        "bgImage": "Imagem",
        "uploadBgImage": "Carregar plano de fundo",
        "replaceBgImage": "Substituir plano de fundo",
        "bgScaleLabel": "Escala de fundo",
        "dragBgHint": "Arraste a tela para mover o fundo",
        "amazonPreset": "Predefinição de branco seguro para Amazon",
        "bgTransparent": "Transparente",
        "bgWhite": "Branco",
        "bgBlack": "Preto",
        "bgLightGray": "Cinza claro",
        "bgBlue": "Azul",
        "bgGradient": "Gradiente",
        "bgBlur": "Desfocar original",
        "bgCustom": "Personalizado",
        "sizeOriginal": "Tamanho original",
        "sizeSquare1080": "1:1 · 1080",
        "sizeSquare2000": "1:1 · 2000",
        "sizeSquare2048": "1:1 · 2048",
        "sizeAvatar512": "Avatar · 512",
        "sizeAvatar1024": "Avatar · 1024",
        "sizeResume": "Currículo · 480×640",
        "shadowNone": "Nenhum",
        "shadowSoft": "Macio",
        "shadowFloat": "Flutuante",
        "shapeSquare": "Quadrado",
        "shapeCircle": "Círculo",
        "downloadTransparent": "Baixe PNG transparente",
        "downloadEdited": "Baixe a versão atual",
        "downloadSquare": "Baixar quadrado PNG",
        "downloadCircle": "Baixar circular PNG",
        "startOver": "Escolha outra imagem",
        "footerToolsTitle": "Todas as ferramentas MiaoCut",
        "footerCatRemove": "Remoção de fundo AI",
        "footerCatConvert": "Conversão de formato",
        "footerCatRepair": "Reparo e aprimoramento de fotos",
        "footerCatGuides": "Guias",
        "guideHubTitle": "Como remover um plano de fundo",
        "guidePptTitle": "Em PowerPoint",
        "guideGimpTitle": "No GIMP",
        "guidesPromoText": "Usando outro aplicativo? Veja nossos guias passo a passo para ",
        "guidesPromoLink": "removendo fundos em PowerPoint, GIMP e mais",
        "footerTagline": "MiaoCut · Ferramentas de imagem AI gratuitas que respeitam sua privacidade.",
        "footerPrivacy": "Privacidade",
        "footerTerms": "Termos",
        "toolBgTitle": "Remover fundo",
        "toolProductTitle": "Produto",
        "toolPortraitTitle": "Retrato",
        "toolIdTitle": "Foto ID",
        "toolJpgPngTitle": "JPG → Transparente PNG",
        "toolPngJpgTitle": "PNG → JPG",
        "toolWatermarkTitle": "Marca d’água",
        "toolRestoreTitle": "Foto antiga"
    },
    "bn": {
        "dropzoneTitle": "ছবিটি এখানে টেনে আনুন এবং ড্রপ করুন, অথবা আপলোড করতে ক্লিক করুন",
        "dropzoneSub": "(JPG / PNG / WebP সমর্থন করে)",
        "trustTitle": "আপনার ছবি 100% নিরাপদ.",
        "trustSub": "মেমরির মধ্যে প্রক্রিয়াকরণ, স্বয়ংক্রিয়ভাবে ধ্বংস. AI প্রশিক্ষণের জন্য কখনই ব্যবহার করা হয় না।",
        "navBg": "ব্যাকগ্রাউন্ড রিমুভার",
        "navId": "ID ছবি",
        "navRestore": "পুরানো ছবি",
        "navWatermark": "জলছাপ",
        "navPortrait": "প্রতিকৃতি",
        "navProduct": "পণ্য",
        "profileLabel": "গুণমান:",
        "profileSharp": "দ্রুত",
        "profileFur": "সূক্ষ্ম (চুল / পশম)",
        "profileHintSharp": "~1s · প্রতিদিনের ছবি",
        "profileHintFur": "~3-5s · পোষা প্রাণী, লম্বা চুল, পালক, গাছপালা",
        "bookmarkText": "MiaoCut মত? চাপুন",
        "bookmarkSuffix": "বুকমার্ক করতে, পরবর্তী কাটআউট মাত্র 1 সেকেন্ড দূরে!",
        "fbTitle": "☕ প্রতিক্রিয়া",
        "fbPlaceholder": "আপনার মনে কি আছে?",
        "fbEmail": "ইমেল (ঐচ্ছিক)",
        "fbSend": "পাঠান",
        "fbThanks": "আপনার প্রতিক্রিয়া জন্য ধন্যবাদ!",
        "fbThanksSub": "আমরা প্রতিটি একক বার্তা পড়ি।",
        "compressing": "সংকুচিত হচ্ছে...",
        "uploading": "আপলোড হচ্ছে...",
        "processing": "AI প্রক্রিয়াকরণ...",
        "done": "সম্পন্ন !",
        "formatErr": "শুধুমাত্র JPG / PNG / WebP ফর্ম্যাটগুলি সমর্থিত",
        "successTitle": "সফলতার !",
        "successSub": "সম্পাদনা বা ডাউনলোড করার জন্য প্রস্তুত।",
        "failTitle": "দুঃখিত, প্রক্রিয়াকরণ ব্যর্থ হয়েছে",
        "alertSize": "শুধুমাত্র JPG / PNG / WebP ফর্ম্যাটগুলি সমর্থিত",
        "editorHomeTitle": "আপনার কাটআউট প্রস্তুত",
        "editorHomeSub": "স্বচ্ছ PNG ডাউনলোড করুন, অথবা প্রথমে একটি সাধারণ পটভূমি যোগ করুন।",
        "editorProductTitle": "পণ্যের ছবি প্রস্তুত",
        "editorProductSub": "একটি সাদা-পটভূমি, বর্গাকার-ক্যানভাস বা ছায়াযুক্ত পণ্যের ছবি তৈরি করুন।",
        "editorPortraitTitle": "পোর্ট্রেট কাটআউট প্রস্তুত",
        "editorPortraitSub": "প্রোফাইল ব্যাকগ্রাউন্ড, আউটপুট আকার, এবং বৃত্তাকার অবতার পূর্বরূপ পরিবর্তন করুন।",
        "backgroundLabel": "পটভূমি",
        "outputSizeLabel": "আউটপুট আকার",
        "subjectPaddingLabel": "বিষয় প্যাডিং",
        "shadowLabel": "ছায়া",
        "shapeLabel": "আকৃতি",
        "portraitScaleLabel": "মাথা / কাঁধের আকার",
        "bgImage": "ছবি",
        "uploadBgImage": "পটভূমি আপলোড করুন",
        "replaceBgImage": "পটভূমি প্রতিস্থাপন করুন",
        "bgScaleLabel": "ব্যাকগ্রাউন্ড স্কেল",
        "dragBgHint": "পটভূমি সরাতে ক্যানভাস টেনে আনুন",
        "amazonPreset": "Amazon- নিরাপদ সাদা প্রিসেট",
        "bgTransparent": "স্বচ্ছ",
        "bgWhite": "সাদা",
        "bgBlack": "কালো",
        "bgLightGray": "হালকা ধূসর",
        "bgBlue": "নীল",
        "bgGradient": "গ্রেডিয়েন্ট",
        "bgBlur": "অস্পষ্ট মূল",
        "bgCustom": "কাস্টম",
        "sizeOriginal": "আসল আকার",
        "sizeSquare1080": "1:1 · 1080",
        "sizeSquare2000": "1:1 · 2000",
        "sizeSquare2048": "1:1 · 2048",
        "sizeAvatar512": "অবতার · 512",
        "sizeAvatar1024": "অবতার · 1024",
        "sizeResume": "পুনরায় শুরু করুন · 480×640",
        "shadowNone": "কোনোটিই নয়",
        "shadowSoft": "নরম",
        "shadowFloat": "ভাসমান",
        "shapeSquare": "বর্গক্ষেত্র",
        "shapeCircle": "বৃত্ত",
        "downloadTransparent": "স্বচ্ছ PNG ডাউনলোড করুন",
        "downloadEdited": "বর্তমান সংস্করণ ডাউনলোড করুন",
        "downloadSquare": "স্কোয়ার PNG ডাউনলোড করুন",
        "downloadCircle": "সার্কুলার PNG ডাউনলোড করুন",
        "startOver": "অন্য ইমেজ চয়ন করুন",
        "footerToolsTitle": "সমস্ত MiaoCut টুল",
        "footerCatRemove": "AI পটভূমি অপসারণ",
        "footerCatConvert": "ফর্ম্যাট রূপান্তর",
        "footerCatRepair": "ফটো মেরামত এবং বর্ধন",
        "footerCatGuides": "গাইড",
        "guideHubTitle": "কিভাবে একটি পটভূমি সরান",
        "guidePptTitle": "PowerPoint-এ",
        "guideGimpTitle": "জিম্পে",
        "guidesPromoText": "অন্য অ্যাপ ব্যবহার করছেন? এর জন্য আমাদের ধাপে ধাপে নির্দেশিকা দেখুন ",
        "guidesPromoLink": "PowerPoint, GIMP, এবং আরও অনেক কিছুতে ব্যাকগ্রাউন্ড অপসারণ করা হচ্ছে",
        "footerTagline": "MiaoCut · বিনামূল্যে AI ছবি টুল যা আপনার গোপনীয়তাকে সম্মান করে।",
        "footerPrivacy": "গোপনীয়তা",
        "footerTerms": "শর্তাবলী",
        "toolBgTitle": "পটভূমি সরান",
        "toolProductTitle": "পণ্য",
        "toolPortraitTitle": "প্রতিকৃতি",
        "toolIdTitle": "ID ছবি",
        "toolJpgPngTitle": "JPG → স্বচ্ছ PNG",
        "toolPngJpgTitle": "PNG → JPG",
        "toolWatermarkTitle": "জলছাপ",
        "toolRestoreTitle": "পুরানো ছবি"
    },
    "fil": {
        "dropzoneTitle": "I-drag at i-drop ang larawan dito, o i-click para mag-upload",
        "dropzoneSub": "(Sinusuportahan ang JPG / PNG / WebP)",
        "trustTitle": "Ang iyong mga larawan ay 100% ligtas.",
        "trustSub": "Naproseso sa memorya, awtomatikong nawasak. Hindi kailanman ginamit para sa AI na pagsasanay.",
        "navBg": "Background Remover",
        "navId": "ID Larawan",
        "navRestore": "Lumang Larawan",
        "navWatermark": "Watermark",
        "navPortrait": "Larawan",
        "navProduct": "produkto",
        "profileLabel": "Kalidad:",
        "profileSharp": "Mabilis",
        "profileFur": "Fine (buhok / balahibo)",
        "profileHintSharp": "~1s · araw-araw na mga larawan",
        "profileHintFur": "~3-5s · mga alagang hayop, mahabang buhok, balahibo, halaman",
        "bookmarkText": "Tulad ng MiaoCut? Pindutin",
        "bookmarkSuffix": "para i-bookmark, ang susunod na cutout ay 1 segundo lang ang layo!",
        "fbTitle": "☕ Feedback",
        "fbPlaceholder": "Ano ang nasa isip mo?",
        "fbEmail": "Email (Opsyonal)",
        "fbSend": "Ipadala",
        "fbThanks": "Salamat sa iyong feedback!",
        "fbThanksSub": "Binabasa namin ang bawat mensahe.",
        "compressing": "Kino-compress...",
        "uploading": "Ina-upload...",
        "processing": "Pinoproseso ng AI...",
        "done": "Tapos na!",
        "formatErr": "Tanging JPG / PNG / WebP format ang sinusuportahan",
        "successTitle": "Tagumpay!",
        "successSub": "Handa nang i-edit o i-download.",
        "failTitle": "Paumanhin, nabigo ang pagproseso",
        "alertSize": "Tanging JPG / PNG / WebP format ang sinusuportahan",
        "editorHomeTitle": "Handa na ang iyong cutout",
        "editorHomeSub": "I-download ang transparent na PNG, o magdagdag muna ng simpleng background.",
        "editorProductTitle": "Handa na ang larawan ng produkto",
        "editorProductSub": "Gumawa ng white-background, square-canvas, o shadowed na larawan ng produkto.",
        "editorPortraitTitle": "Handa na ang portrait cutout",
        "editorPortraitSub": "Lumipat ng mga background ng profile, laki ng output, at pabilog na mga preview ng avatar.",
        "backgroundLabel": "Background",
        "outputSizeLabel": "Laki ng output",
        "subjectPaddingLabel": "Padding ng paksa",
        "shadowLabel": "anino",
        "shapeLabel": "Hugis",
        "portraitScaleLabel": "Laki ng ulo/balikat",
        "bgImage": "Imahe",
        "uploadBgImage": "Mag-upload ng background",
        "replaceBgImage": "Palitan ang background",
        "bgScaleLabel": "Background scale",
        "dragBgHint": "I-drag ang canvas para ilipat ang background",
        "amazonPreset": "Amazon-safe na puting preset",
        "bgTransparent": "Transparent",
        "bgWhite": "Puti",
        "bgBlack": "Itim",
        "bgLightGray": "Banayad na kulay abo",
        "bgBlue": "Asul",
        "bgGradient": "Gradient",
        "bgBlur": "I-blur ang orihinal",
        "bgCustom": "Custom",
        "sizeOriginal": "Orihinal na sukat",
        "sizeSquare1080": "1:1 · 1080",
        "sizeSquare2000": "1:1 · 2000",
        "sizeSquare2048": "1:1 · 2048",
        "sizeAvatar512": "Avatar · 512",
        "sizeAvatar1024": "Avatar · 1024",
        "sizeResume": "Ipagpatuloy · 480×640",
        "shadowNone": "wala",
        "shadowSoft": "Malambot",
        "shadowFloat": "Lumulutang",
        "shapeSquare": "Square",
        "shapeCircle": "Bilog",
        "downloadTransparent": "I-download ang transparent na PNG",
        "downloadEdited": "I-download ang kasalukuyang bersyon",
        "downloadSquare": "I-download ang square PNG",
        "downloadCircle": "I-download ang pabilog na PNG",
        "startOver": "Pumili ng ibang larawan",
        "footerToolsTitle": "Lahat ng MiaoCut Tools",
        "footerCatRemove": "AI Pag-alis ng Background",
        "footerCatConvert": "Conversion ng Format",
        "footerCatRepair": "Pag-aayos at Pagpapahusay ng Larawan",
        "footerCatGuides": "Mga gabay",
        "guideHubTitle": "Paano Mag-alis ng Background",
        "guidePptTitle": "Sa PowerPoint",
        "guideGimpTitle": "Sa GIMP",
        "guidesPromoText": "Gumagamit ng ibang app? Tingnan ang aming step-by-step na gabay para sa ",
        "guidesPromoLink": "pag-aalis ng mga background sa PowerPoint, GIMP, at higit pa",
        "footerTagline": "MiaoCut · Libreng AI image tool na gumagalang sa iyong privacy.",
        "footerPrivacy": "Pagkapribado",
        "footerTerms": "Mga tuntunin",
        "toolBgTitle": "Alisin ang Background",
        "toolProductTitle": "produkto",
        "toolPortraitTitle": "Larawan",
        "toolIdTitle": "ID Larawan",
        "toolJpgPngTitle": "JPG → Transparent na PNG",
        "toolPngJpgTitle": "PNG → JPG",
        "toolWatermarkTitle": "Watermark",
        "toolRestoreTitle": "Lumang Larawan"
    },
    "ur": {
        "dropzoneTitle": "تصویر کو یہاں گھسیٹیں اور چھوڑیں، یا اپ لوڈ کرنے کے لیے کلک کریں۔",
        "dropzoneSub": "(JPG / PNG / WebP کو سپورٹ کرتا ہے)",
        "trustTitle": "آپ کی تصاویر 100% محفوظ ہیں۔",
        "trustSub": "میموری میں پروسیس شدہ، خود بخود تباہ ہو گیا۔ AI ٹریننگ کے لیے کبھی استعمال نہیں کیا گیا۔",
        "navBg": "پس منظر ہٹانے والا",
        "navId": "ID تصویر",
        "navRestore": "پرانی تصویر",
        "navWatermark": "واٹر مارک",
        "navPortrait": "پورٹریٹ",
        "navProduct": "پروڈکٹ",
        "profileLabel": "معیار:",
        "profileSharp": "تیز",
        "profileFur": "ٹھیک (بال / کھال)",
        "profileHintSharp": "~1s · روزمرہ کی تصاویر",
        "profileHintFur": "~3-5s · پالتو جانور، لمبے بال، پنکھ، پودے",
        "bookmarkText": "MiaoCut کی طرح؟ دبائیں",
        "bookmarkSuffix": "بک مارک کرنے کے لیے، اگلا کٹ آؤٹ صرف 1 سیکنڈ کی دوری پر ہے!",
        "fbTitle": "☕ تاثرات",
        "fbPlaceholder": "آپ کے دماغ میں کیا ہے؟",
        "fbEmail": "ای میل (اختیاری)",
        "fbSend": "بھیجیں۔",
        "fbThanks": "آپ کی رائے کا شکریہ!",
        "fbThanksSub": "ہم ایک ایک پیغام پڑھتے ہیں۔",
        "compressing": "سکیڑ رہا ہے...",
        "uploading": "اپ لوڈ ہو رہا ہے...",
        "processing": "AI پروسیسنگ...",
        "done": "ہو گیا!",
        "formatErr": "صرف JPG / PNG / WebP فارمیٹس تعاون یافتہ ہیں",
        "successTitle": "کامیابی!",
        "successSub": "ترمیم کرنے یا ڈاؤن لوڈ کرنے کے لیے تیار ہیں۔",
        "failTitle": "معذرت، پروسیسنگ ناکام ہوگئی",
        "alertSize": "صرف JPG / PNG / WebP فارمیٹس تعاون یافتہ ہیں",
        "editorHomeTitle": "آپ کا کٹ آؤٹ تیار ہے۔",
        "editorHomeSub": "شفاف PNG ڈاؤن لوڈ کریں، یا پہلے ایک سادہ پس منظر شامل کریں۔",
        "editorProductTitle": "مصنوعات کی تصویر تیار ہے۔",
        "editorProductSub": "ایک سفید پس منظر، مربع کینوس، یا پروڈکٹ کی سایہ دار تصویر بنائیں۔",
        "editorPortraitTitle": "پورٹریٹ کٹ آؤٹ تیار ہے۔",
        "editorPortraitSub": "پروفائل کے پس منظر، آؤٹ پٹ سائز، اور سرکلر اوتار کے پیش نظارہ کو تبدیل کریں۔",
        "backgroundLabel": "پس منظر",
        "outputSizeLabel": "آؤٹ پٹ سائز",
        "subjectPaddingLabel": "سبجیکٹ پیڈنگ",
        "shadowLabel": "سایہ",
        "shapeLabel": "شکل",
        "portraitScaleLabel": "سر / کندھے کا سائز",
        "bgImage": "تصویر",
        "uploadBgImage": "پس منظر اپ لوڈ کریں۔",
        "replaceBgImage": "پس منظر کو تبدیل کریں۔",
        "bgScaleLabel": "پس منظر کا پیمانہ",
        "dragBgHint": "پس منظر کو منتقل کرنے کے لیے کینوس کو گھسیٹیں۔",
        "amazonPreset": "Amazon-محفوظ سفید پیش سیٹ",
        "bgTransparent": "شفاف",
        "bgWhite": "سفید",
        "bgBlack": "سیاہ",
        "bgLightGray": "ہلکا بھوری رنگ",
        "bgBlue": "نیلا",
        "bgGradient": "میلان",
        "bgBlur": "اصل کو دھندلا کریں۔",
        "bgCustom": "حسب ضرورت",
        "sizeOriginal": "اصل سائز",
        "sizeSquare1080": "1:1 · 1080",
        "sizeSquare2000": "1:1 · 2000",
        "sizeSquare2048": "1:1 · 2048",
        "sizeAvatar512": "اوتار · 512",
        "sizeAvatar1024": "اوتار · 1024",
        "sizeResume": "دوبارہ شروع کریں · 480×640",
        "shadowNone": "کوئی نہیں۔",
        "shadowSoft": "نرم",
        "shadowFloat": "تیرتا ہوا",
        "shapeSquare": "مربع",
        "shapeCircle": "دائرہ",
        "downloadTransparent": "شفاف PNG ڈاؤن لوڈ کریں۔",
        "downloadEdited": "موجودہ ورژن ڈاؤن لوڈ کریں۔",
        "downloadSquare": "مربع PNG ڈاؤن لوڈ کریں۔",
        "downloadCircle": "سرکلر PNG ڈاؤن لوڈ کریں۔",
        "startOver": "دوسری تصویر منتخب کریں۔",
        "footerToolsTitle": "تمام MiaoCut ٹولز",
        "footerCatRemove": "AI پس منظر کو ہٹانا",
        "footerCatConvert": "فارمیٹ کنورژن",
        "footerCatRepair": "تصویر کی مرمت اور اضافہ",
        "footerCatGuides": "رہنما",
        "guideHubTitle": "پس منظر کو کیسے ہٹایا جائے۔",
        "guidePptTitle": "PowerPoint میں",
        "guideGimpTitle": "GIMP میں",
        "guidesPromoText": "کوئی اور ایپ استعمال کر رہے ہیں؟ کے لیے ہماری مرحلہ وار گائیڈز دیکھیں ",
        "guidesPromoLink": "PowerPoint، GIMP، اور مزید میں پس منظر کو ہٹانا",
        "footerTagline": "MiaoCut · مفت AI تصویری ٹولز جو آپ کی رازداری کا احترام کرتے ہیں۔",
        "footerPrivacy": "رازداری",
        "footerTerms": "شرائط",
        "toolBgTitle": "پس منظر کو ہٹا دیں۔",
        "toolProductTitle": "پروڈکٹ",
        "toolPortraitTitle": "پورٹریٹ",
        "toolIdTitle": "ID تصویر",
        "toolJpgPngTitle": "JPG → شفاف PNG",
        "toolPngJpgTitle": "PNG → JPG",
        "toolWatermarkTitle": "واٹر مارک",
        "toolRestoreTitle": "پرانی تصویر"
    }
};

    // 每个页面 PAGE_I18N 至少要提供这些 key，否则 meta 标签和切语言时会显示 key 名
    // (开发期 console 会提示缺失，但不会阻断运行)
    const PAGE_REQUIRED_KEYS = ['title', 'subtitle', 'metaDescription', 'metaKeywords', 'ogTitle', 'ogLocale'];

    const PAGE_I18N = window.MIAOCUT_PAGE_I18N || { zh: {}, en: {} };
    const PAGE_TITLES = window.MIAOCUT_PAGE_TITLES || {};

    const i18nData = {};
    LOCALES.forEach(locale => {
        const code = locale.code;
        i18nData[code] = Object.assign(
            {},
            BASE_I18N.en || {},
            PAGE_I18N.en || {},
            BASE_I18N[code] || {},
            PAGE_I18N[code] || {}
        );
    });

    // 开发期校验：page-specific 必填 key 缺失时给个警告，避免线上才发现 meta 没设
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        LOCALES.forEach(locale => {
            const lang = locale.code;
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
    let resultState = null;

    const EDITOR_CONFIGS = {
        home: {
            titleKey: 'editorHomeTitle',
            subKey: 'editorHomeSub',
            backgrounds: ['transparent', 'white', 'black', 'custom'],
            sizes: ['original'],
            defaultBg: 'transparent',
            defaultSize: 'original',
            defaultMargin: 0,
            defaultShadow: 'none',
            showMargin: false,
            showShadow: false,
            showShape: false,
            fitSubject: false,
            downloadSuffix: 'edited',
        },
        'product-photo': {
            titleKey: 'editorProductTitle',
            subKey: 'editorProductSub',
            backgrounds: ['white', 'transparent', 'lightGray', 'image', 'custom'],
            sizes: ['square2000', 'square2048', 'square1080', 'original'],
            defaultBg: 'white',
            defaultSize: 'square2000',
            defaultMargin: 12,
            defaultShadow: 'soft',
            showMargin: true,
            showShadow: true,
            showShape: false,
            showAmazonPreset: true,
            showBackgroundUpload: true,
            fitSubject: true,
            downloadSuffix: 'product',
            marginLabelKey: 'subjectPaddingLabel',
        },
        portrait: {
            titleKey: 'editorPortraitTitle',
            subKey: 'editorPortraitSub',
            backgrounds: ['lightGray', 'white', 'blue', 'gradient', 'blur', 'transparent', 'custom'],
            sizes: ['avatar1024', 'avatar512', 'resume', 'original'],
            defaultBg: 'lightGray',
            defaultSize: 'avatar1024',
            defaultMargin: 10,
            defaultShadow: 'none',
            showMargin: true,
            showShadow: false,
            showShape: true,
            showPortraitDownloads: true,
            fitSubject: true,
            downloadSuffix: 'portrait',
            marginLabelKey: 'portraitScaleLabel',
            defaultShape: 'circle',
        },
    };

    const BACKGROUND_VALUES = {
        transparent: null,
        white: '#ffffff',
        black: '#111827',
        lightGray: '#f3f4f6',
        blue: '#dbeafe',
    };

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
    // 当前语言来自静态 HTML 的 <html lang>（构建时由 scripts/build-i18n.mjs 写死）。
    // 不再用 localStorage 决定语言 —— 每个 URL 已经预渲染好了对应语种的完整 HTML，
    // 让 Google 能分别索引各语种；JS 只负责动态文案（编辑器 UI、状态提示）。
    const htmlLang = (document.documentElement.lang || 'en').toLowerCase();
    let currentLang = localeFromHtmlLang(htmlLang);

    function t(key) {
        return (i18nData[currentLang] && i18nData[currentLang][key]) || (i18nData.en && i18nData.en[key]) || key;
    }

    // 把当前 URL 转成另一语种的对应 URL，给 lang switcher 用。
    // 例：'/' ↔ '/zh/'、'/watermark-remover/' ↔ '/id/watermark-remover/'
    function alternateUrlFor(targetLang) {
        return localizePath(window.location.pathname, targetLang);
    }

    function updateLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('lang', lang);

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
            if (i18nData[lang] && i18nData[lang][key]) {
                el.textContent = i18nData[lang][key];
            }
        });
        document.querySelectorAll('[data-i18n-ph]').forEach(el => {
            const key = el.getAttribute('data-i18n-ph');
            if (i18nData[lang] && i18nData[lang][key]) {
                el.placeholder = i18nData[lang][key];
            }
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (i18nData[lang] && i18nData[lang][key]) {
                el.title = i18nData[lang][key];
            }
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            if (i18nData[lang] && i18nData[lang][key]) {
                el.setAttribute('aria-label', i18nData[lang][key]);
            }
        });

        // dropzone 处于初始状态时，刷新里面的提示文案
        if (!dropzone.classList.contains('pointer-events-none') && !resultState) {
            resetDropzone();
        } else if (resultState) {
            syncEditorControls();
        }
    }

    function resetDropzone() {
        dropzone.classList.add('cursor-pointer', 'border-dashed', 'hover:border-gray-400', 'hover:bg-gray-50');
        dropzone.classList.remove('cursor-default', 'border-solid');
        dropzoneContent.classList.add('pointer-events-none');
        dropzoneContent.classList.remove('w-full');
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
        // 切语言 = 跳到另一语种 URL（不要在原 URL 里 JS 替换文案）。
        // 这样 Google 才能把 / 和 /zh/* 当作两个独立语种页面分别索引。
        langSwitch.addEventListener('change', (e) => {
            const from = currentLang;
            const to = e.target.value;
            if (to === currentLang) return;
            track('lang-switched', { from, to });
            const target = alternateUrlFor(to) + window.location.search + window.location.hash;
            // 用 localStorage 记住偏好，下次直接打开根域名时可以让用户感知（虽然不再用作语言判定的源）
            localStorage.setItem('lang', to);
            window.location.assign(target);
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
    const _isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE = _isLocal ? 'http://localhost:8000' : 'https://api2.miaocut.app';

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
        if (resultState) return;
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

    function getEditorMode() {
        const page = window.MIAOCUT_PAGE_KEY || 'home';
        return EDITOR_CONFIGS[page] ? page : 'home';
    }

    function cleanupResultState() {
        if (!resultState) return;
        if (resultState.cutoutUrl) URL.revokeObjectURL(resultState.cutoutUrl);
        if (resultState.sourceUrl) URL.revokeObjectURL(resultState.sourceUrl);
        if (resultState.bgImageUrl) URL.revokeObjectURL(resultState.bgImageUrl);
        resultState = null;
    }

    function loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Image preview failed'));
            img.src = url;
        });
    }

    function basenameFromFile(file) {
        const name = file && file.name ? file.name : 'image';
        return name.replace(/\.[^.]+$/, '') || 'image';
    }

    function downloadUrl(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function autoDownloadTransparentResult(file, blob, page) {
        const url = URL.createObjectURL(blob);
        downloadUrl(url, `${basenameFromFile(file)}_transparent.png`);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        track('transparent-download', { page, mode: 'auto' });
    }

    function bgLabelKey(bg) {
        return {
            transparent: 'bgTransparent',
            white: 'bgWhite',
            black: 'bgBlack',
            lightGray: 'bgLightGray',
            blue: 'bgBlue',
            image: 'bgImage',
            gradient: 'bgGradient',
            blur: 'bgBlur',
            custom: 'bgCustom',
        }[bg] || 'bgWhite';
    }

    function sizeLabelKey(size) {
        return {
            original: 'sizeOriginal',
            square1080: 'sizeSquare1080',
            square2000: 'sizeSquare2000',
            square2048: 'sizeSquare2048',
            avatar512: 'sizeAvatar512',
            avatar1024: 'sizeAvatar1024',
            resume: 'sizeResume',
        }[size] || 'sizeOriginal';
    }

    function swatchStyle(bg) {
        if (bg === 'transparent') {
            return 'background-color:#fff;background-image:linear-gradient(45deg,#d1d5db 25%,transparent 25%),linear-gradient(-45deg,#d1d5db 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d1d5db 75%),linear-gradient(-45deg,transparent 75%,#d1d5db 75%);background-size:8px 8px;background-position:0 0,0 4px,4px -4px,-4px 0;';
        }
        if (bg === 'gradient') return 'background:linear-gradient(135deg,#e0f2fe,#f8fafc 55%,#fce7f3);';
        if (bg === 'blur') return 'background:linear-gradient(135deg,#dbeafe,#f3f4f6);';
        if (bg === 'image') return 'background:linear-gradient(135deg,#f3f4f6,#dbeafe);';
        return `background:${BACKGROUND_VALUES[bg] || '#ffffff'};`;
    }

    function backgroundOptionHtml(bg) {
        const key = bgLabelKey(bg);
        return `
            <button type="button" data-bg="${bg}" class="bg-option flex items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:border-gray-400">
                <span class="h-4 w-4 shrink-0 rounded border border-gray-300" style="${swatchStyle(bg)}"></span>
                <span data-i18n="${key}">${t(key)}</span>
            </button>
        `;
    }

    function computeAlphaBBox(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                if (data[(y * width + x) * 4 + 3] > 8) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }
        canvas.width = 0;
        canvas.height = 0;
        if (maxX < minX || maxY < minY) {
            return { x: 0, y: 0, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
        }
        return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
    }

    function outputDimensions(state) {
        const img = state.cutoutImage;
        if (state.size === 'square1080') return { width: 1080, height: 1080 };
        if (state.size === 'square2000') return { width: 2000, height: 2000 };
        if (state.size === 'square2048') return { width: 2048, height: 2048 };
        if (state.size === 'avatar512') return { width: 512, height: 512 };
        if (state.size === 'avatar1024') return { width: 1024, height: 1024 };
        if (state.size === 'resume') return { width: 480, height: 640 };
        return { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
    }

    function previewDimensions(dimensions) {
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(dimensions.width, dimensions.height));
        return {
            width: Math.max(1, Math.round(dimensions.width * scale)),
            height: Math.max(1, Math.round(dimensions.height * scale)),
        };
    }

    function drawCover(ctx, img, width, height, overscan = 1) {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const scale = Math.max(width / iw, height / ih) * overscan;
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
    }

    function drawTransformedCover(ctx, img, width, height, scaleMultiplier = 1, offsetX = 0, offsetY = 0) {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const baseScale = Math.max(width / iw, height / ih);
        const scale = baseScale * Math.max(1, scaleMultiplier || 1);
        const dw = iw * scale;
        const dh = ih * scale;
        const maxX = Math.max(0, (dw - width) / 2);
        const maxY = Math.max(0, (dh - height) / 2);
        const x = Math.max(-maxX, Math.min(maxX, offsetX || 0));
        const y = Math.max(-maxY, Math.min(maxY, offsetY || 0));
        ctx.drawImage(img, (width - dw) / 2 + x, (height - dh) / 2 + y, dw, dh);
    }

    function drawBackground(ctx, state, width, height) {
        if (state.bg === 'transparent') return;
        if (state.bg === 'gradient') {
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#e0f2fe');
            gradient.addColorStop(0.55, '#f8fafc');
            gradient.addColorStop(1, '#fce7f3');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            return;
        }
        if (state.bg === 'blur' && state.sourceImage) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, width, height);
            ctx.save();
            ctx.filter = `blur(${Math.max(14, Math.round(Math.max(width, height) * 0.025))}px)`;
            drawCover(ctx, state.sourceImage, width, height, 1.08);
            ctx.restore();
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(0, 0, width, height);
            return;
        }
        if (state.bg === 'image' && state.bgImage) {
            drawTransformedCover(ctx, state.bgImage, width, height, state.bgScale, (state.bgOffsetX || 0) * width, (state.bgOffsetY || 0) * height);
            return;
        }
        ctx.fillStyle = state.bg === 'custom' ? state.customColor : (BACKGROUND_VALUES[state.bg] || '#ffffff');
        ctx.fillRect(0, 0, width, height);
    }

    function drawSubject(ctx, state, width, height) {
        const img = state.cutoutImage;
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const cfg = state.config;

        if (!cfg.fitSubject && state.size === 'original') {
            ctx.drawImage(img, 0, 0, width, height);
            return;
        }

        const bbox = cfg.fitSubject ? state.alphaBBox : { x: 0, y: 0, width: iw, height: ih };
        const padding = cfg.fitSubject ? Math.min(35, Math.max(0, state.margin)) / 100 : 0;
        const maxW = width * (1 - padding * 2);
        const maxH = height * (1 - padding * 2);
        const scale = Math.min(maxW / bbox.width, maxH / bbox.height);
        const dw = bbox.width * scale;
        const dh = bbox.height * scale;
        const dx = (width - dw) / 2;
        const dy = (height - dh) / 2;

        ctx.save();
        if (state.shadow === 'soft') {
            ctx.shadowColor = 'rgba(17,24,39,0.18)';
            ctx.shadowBlur = Math.max(18, width * 0.025);
            ctx.shadowOffsetY = Math.max(10, height * 0.018);
        } else if (state.shadow === 'float') {
            ctx.shadowColor = 'rgba(17,24,39,0.24)';
            ctx.shadowBlur = Math.max(28, width * 0.04);
            ctx.shadowOffsetY = Math.max(24, height * 0.035);
        }
        ctx.drawImage(img, bbox.x, bbox.y, bbox.width, bbox.height, dx, dy, dw, dh);
        ctx.restore();
    }

    function drawComposition(canvas, state, dimensions) {
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, dimensions.width, dimensions.height);

        const draw = () => {
            drawBackground(ctx, state, dimensions.width, dimensions.height);
            drawSubject(ctx, state, dimensions.width, dimensions.height);
        };

        if (state.shape === 'circle') {
            ctx.save();
            ctx.beginPath();
            ctx.arc(dimensions.width / 2, dimensions.height / 2, Math.min(dimensions.width, dimensions.height) / 2, 0, Math.PI * 2);
            ctx.clip();
            draw();
            ctx.restore();
        } else {
            draw();
        }
    }

    function renderPreview() {
        if (!resultState) return;
        const canvas = document.getElementById('result-canvas');
        if (!canvas) return;
        drawComposition(canvas, resultState, previewDimensions(outputDimensions(resultState)));
        syncEditorControls();
    }

    function syncEditorControls() {
        if (!resultState) return;
        document.querySelectorAll('.bg-option').forEach(btn => {
            const active = btn.dataset.bg === resultState.bg;
            btn.classList.toggle('border-gray-900', active);
            btn.classList.toggle('bg-gray-50', active);
            btn.classList.toggle('border-gray-200', !active);
        });
        const customWrap = document.getElementById('editor-custom-wrap');
        if (customWrap) {
            const visible = resultState.bg === 'custom';
            customWrap.hidden = !visible;
            customWrap.classList.toggle('hidden', !visible);
            customWrap.classList.toggle('flex', visible);
        }
        const bgUploadWrap = document.getElementById('editor-bg-upload-wrap');
        if (bgUploadWrap) {
            bgUploadWrap.hidden = false;
            bgUploadWrap.classList.remove('hidden');
        }
        const bgUploadButton = document.getElementById('editor-bg-upload');
        if (bgUploadButton) bgUploadButton.textContent = resultState.bgImage ? t('replaceBgImage') : t('uploadBgImage');
        const bgScaleWrap = document.getElementById('editor-bg-scale-wrap');
        if (bgScaleWrap) {
            const visible = resultState.bg === 'image' && !!resultState.bgImage;
            bgScaleWrap.hidden = !visible;
            bgScaleWrap.classList.toggle('hidden', !visible);
        }
        const bgDragHint = document.getElementById('editor-bg-drag-hint');
        if (bgDragHint) {
            const visible = resultState.bg === 'image' && !!resultState.bgImage;
            bgDragHint.hidden = !visible;
            bgDragHint.classList.toggle('hidden', !visible);
        }
        const bgScaleValue = document.getElementById('editor-bg-scale-value');
        if (bgScaleValue) bgScaleValue.textContent = `${Math.round((resultState.bgScale || 1) * 100)}%`;
        const previewCanvas = document.getElementById('result-canvas');
        if (previewCanvas) {
            const draggable = resultState.bg === 'image' && !!resultState.bgImage;
            previewCanvas.classList.toggle('cursor-grab', draggable);
        }
        const marginValue = document.getElementById('editor-margin-value');
        if (marginValue) {
            marginValue.textContent = resultState.config.marginLabelKey === 'portraitScaleLabel'
                ? `${Math.round((1 - Math.min(35, Math.max(0, resultState.margin)) / 100 * 2) * 100)}%`
                : `${resultState.margin}%`;
        }
    }

    function downloadCurrentVersion(shapeOverride) {
        if (!resultState) return;
        const canvas = document.createElement('canvas');
        let dimensions = outputDimensions(resultState);
        if ((shapeOverride === 'square' || shapeOverride === 'circle') && dimensions.width !== dimensions.height) {
            const side = Math.max(dimensions.width, dimensions.height);
            dimensions = { width: side, height: side };
        }
        const drawState = shapeOverride ? Object.assign({}, resultState, { shape: shapeOverride }) : resultState;
        drawComposition(canvas, drawState, dimensions);
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const suffix = shapeOverride || resultState.config.downloadSuffix;
            downloadUrl(url, `${resultState.basename}_${suffix}.png`);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            track('edited-download', { page: resultState.mode, bg: resultState.bg, size: resultState.size, shape: shapeOverride || resultState.shape });
        }, 'image/png');
    }

    async function setBackgroundImage(file) {
        if (!resultState || !file) return;
        if (!ALLOWED_TYPES.includes(file.type)) {
            alert(t('alertSize'));
            return;
        }
        const nextUrl = URL.createObjectURL(file);
        let nextImage;
        try {
            nextImage = await loadImage(nextUrl);
        } catch (error) {
            URL.revokeObjectURL(nextUrl);
            throw error;
        }
        if (resultState.bgImageUrl) URL.revokeObjectURL(resultState.bgImageUrl);
        resultState.bgImageUrl = nextUrl;
        resultState.bgImage = nextImage;
        resultState.bg = 'image';
        resultState.bgScale = 1;
        resultState.bgOffsetX = 0;
        resultState.bgOffsetY = 0;
        const scaleInput = document.getElementById('editor-bg-scale');
        if (scaleInput) scaleInput.value = '100';
        renderPreview();
        track('background-image-uploaded', { page: resultState.mode, type: file.type.replace('image/', '') });
    }

    function renderResultEditor() {
        if (!resultState) return;
        const cfg = resultState.config;
        const sizeOptions = cfg.sizes.map(size => {
            const key = sizeLabelKey(size);
            return `<option value="${size}" data-i18n="${key}">${t(key)}</option>`;
        }).join('');
        const shadowControl = cfg.showShadow ? `
            <label class="block">
                <span class="mb-1.5 block text-xs font-semibold text-gray-500" data-i18n="shadowLabel">${t('shadowLabel')}</span>
                <select id="editor-shadow" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800">
                    <option value="none" data-i18n="shadowNone">${t('shadowNone')}</option>
                    <option value="soft" data-i18n="shadowSoft">${t('shadowSoft')}</option>
                    <option value="float" data-i18n="shadowFloat">${t('shadowFloat')}</option>
                </select>
            </label>
        ` : '';
        const shapeControl = cfg.showShape ? `
            <div>
                <span class="mb-1.5 block text-xs font-semibold text-gray-500" data-i18n="shapeLabel">${t('shapeLabel')}</span>
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" data-shape="square" class="shape-option rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700" data-i18n="shapeSquare">${t('shapeSquare')}</button>
                    <button type="button" data-shape="circle" class="shape-option rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700" data-i18n="shapeCircle">${t('shapeCircle')}</button>
                </div>
            </div>
        ` : '';
        const marginLabelKey = cfg.marginLabelKey || 'subjectPaddingLabel';
        const marginInputValue = marginLabelKey === 'portraitScaleLabel'
            ? 30 - resultState.margin
            : resultState.margin;
        const marginControl = cfg.showMargin ? `
            <label class="block">
                <span class="mb-1.5 flex items-center justify-between text-xs font-semibold text-gray-500">
                    <span data-i18n="${marginLabelKey}">${t(marginLabelKey)}</span>
                    <span id="editor-margin-value">${resultState.margin}%</span>
                </span>
                <input id="editor-margin" type="range" min="0" max="30" value="${marginInputValue}" class="w-full accent-gray-900">
            </label>
        ` : '';
        const amazonControl = cfg.showAmazonPreset ? `
            <button type="button" id="amazon-preset" class="w-full rounded-lg border border-gray-900 bg-white px-3 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50" data-i18n="amazonPreset">${t('amazonPreset')}</button>
        ` : '';
        const backgroundUploadControl = cfg.showBackgroundUpload ? `
            <div id="editor-bg-upload-wrap" class="mt-3">
                <input id="editor-bg-file" type="file" accept="image/jpeg, image/png, image/webp" class="hidden">
                <button type="button" id="editor-bg-upload" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-500" data-i18n="uploadBgImage">${resultState.bgImage ? t('replaceBgImage') : t('uploadBgImage')}</button>
                <p id="editor-bg-drag-hint" class="mt-1.5 hidden text-xs text-gray-400" hidden data-i18n="dragBgHint">${t('dragBgHint')}</p>
                <label id="editor-bg-scale-wrap" class="mt-3 block hidden" hidden>
                    <span class="mb-1.5 flex items-center justify-between text-xs font-semibold text-gray-500">
                        <span data-i18n="bgScaleLabel">${t('bgScaleLabel')}</span>
                        <span id="editor-bg-scale-value">${Math.round((resultState.bgScale || 1) * 100)}%</span>
                    </span>
                    <input id="editor-bg-scale" type="range" min="100" max="300" value="${Math.round((resultState.bgScale || 1) * 100)}" class="w-full accent-gray-900">
                </label>
            </div>
        ` : '';
        const downloadButtons = cfg.showPortraitDownloads ? `
            <div class="space-y-2 pt-1">
                <button type="button" id="download-square" class="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700" data-i18n="downloadSquare">${t('downloadSquare')}</button>
                <button type="button" id="download-circle" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-500" data-i18n="downloadCircle">${t('downloadCircle')}</button>
                <button type="button" id="download-transparent" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-500" data-i18n="downloadTransparent">${t('downloadTransparent')}</button>
                <button type="button" id="editor-start-over" class="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900" data-i18n="startOver">${t('startOver')}</button>
            </div>
        ` : `
            <div class="space-y-2 pt-1">
                <button type="button" id="download-edited" class="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700" data-i18n="downloadEdited">${t('downloadEdited')}</button>
                <button type="button" id="download-transparent" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-500" data-i18n="downloadTransparent">${t('downloadTransparent')}</button>
                <button type="button" id="editor-start-over" class="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900" data-i18n="startOver">${t('startOver')}</button>
            </div>
        `;

        dropzoneContent.classList.remove('pointer-events-none');
        dropzoneContent.classList.add('w-full');
        dropzone.classList.add('cursor-default', 'border-solid');
        dropzone.classList.remove('cursor-pointer', 'border-dashed', 'hover:border-gray-400', 'hover:bg-gray-50');
        dropzoneContent.innerHTML = `
            <div id="result-editor" class="w-full text-left">
                <div class="mb-5 text-center">
                    <p class="text-xl font-bold text-gray-900" data-i18n="${cfg.titleKey}">${t(cfg.titleKey)}</p>
                    <p class="mt-1 text-sm text-gray-500" data-i18n="${cfg.subKey}">${t(cfg.subKey)}</p>
                </div>
                <div class="grid gap-5 md:grid-cols-3">
                    <div class="md:col-span-2">
                        <div class="flex min-h-[300px] items-center justify-center rounded-xl border border-gray-200 p-3" style="background-color:#f9fafb;background-image:linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0;">
                            <canvas id="result-canvas" class="max-h-[520px] max-w-full rounded-lg shadow-sm"></canvas>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <span class="mb-1.5 block text-xs font-semibold text-gray-500" data-i18n="backgroundLabel">${t('backgroundLabel')}</span>
                            <div class="grid grid-cols-2 gap-2">${cfg.backgrounds.map(backgroundOptionHtml).join('')}</div>
                            ${backgroundUploadControl}
                            <div id="editor-custom-wrap" class="mt-3 hidden items-center gap-2" hidden>
                                <input id="editor-custom-color" type="color" value="${resultState.customColor}" class="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white p-1">
                                <input id="editor-custom-text" type="text" value="${resultState.customColor}" class="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800" maxlength="7">
                            </div>
                        </div>
                        ${amazonControl}
                        <label class="block">
                            <span class="mb-1.5 block text-xs font-semibold text-gray-500" data-i18n="outputSizeLabel">${t('outputSizeLabel')}</span>
                            <select id="editor-size" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800">${sizeOptions}</select>
                        </label>
                        ${marginControl}
                        ${shadowControl}
                        ${shapeControl}
                        ${downloadButtons}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('editor-size').value = resultState.size;
        const shadow = document.getElementById('editor-shadow');
        if (shadow) shadow.value = resultState.shadow;

        document.querySelectorAll('.bg-option').forEach(btn => {
            btn.addEventListener('click', () => {
                resultState.bg = btn.dataset.bg;
                renderPreview();
                if (resultState.bg === 'image' && !resultState.bgImage) {
                    const bgFile = document.getElementById('editor-bg-file');
                    if (bgFile) bgFile.click();
                }
            });
        });
        const bgUploadButton = document.getElementById('editor-bg-upload');
        const bgFileInput = document.getElementById('editor-bg-file');
        if (bgUploadButton && bgFileInput) {
            bgUploadButton.addEventListener('click', () => {
                resultState.bg = 'image';
                renderPreview();
                bgFileInput.click();
            });
            bgFileInput.addEventListener('change', async () => {
                const bgFile = bgFileInput.files && bgFileInput.files[0];
                try {
                    await setBackgroundImage(bgFile);
                } catch (error) {
                    console.error('Background image load failed:', error);
                } finally {
                    bgFileInput.value = '';
                }
            });
        }
        const bgScale = document.getElementById('editor-bg-scale');
        if (bgScale) {
            bgScale.addEventListener('input', () => {
                resultState.bgScale = Math.max(1, Number(bgScale.value || 100) / 100);
                renderPreview();
            });
        }
        const previewCanvas = document.getElementById('result-canvas');
        if (previewCanvas && cfg.showBackgroundUpload) {
            let draggingBg = false;
            let lastX = 0;
            let lastY = 0;
            const pointerMove = (event) => {
                if (!draggingBg || !resultState || resultState.bg !== 'image' || !resultState.bgImage) return;
                const canvas = document.getElementById('result-canvas');
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                resultState.bgOffsetX += (event.clientX - lastX) / rect.width;
                resultState.bgOffsetY += (event.clientY - lastY) / rect.height;
                lastX = event.clientX;
                lastY = event.clientY;
                renderPreview();
            };
            const stopDrag = () => {
                if (!draggingBg) return;
                draggingBg = false;
                previewCanvas.classList.remove('cursor-grabbing');
                window.removeEventListener('pointermove', pointerMove);
                window.removeEventListener('pointerup', stopDrag);
            };
            previewCanvas.addEventListener('pointerdown', (event) => {
                if (!resultState || resultState.bg !== 'image' || !resultState.bgImage) return;
                draggingBg = true;
                lastX = event.clientX;
                lastY = event.clientY;
                previewCanvas.classList.add('cursor-grabbing');
                previewCanvas.setPointerCapture(event.pointerId);
                window.addEventListener('pointermove', pointerMove);
                window.addEventListener('pointerup', stopDrag);
            });
        }
        const amazonPreset = document.getElementById('amazon-preset');
        if (amazonPreset) {
            amazonPreset.addEventListener('click', () => {
                resultState.bg = 'white';
                resultState.size = 'square2000';
                resultState.margin = 6;
                resultState.shadow = 'none';
                const size = document.getElementById('editor-size');
                if (size) size.value = resultState.size;
                const margin = document.getElementById('editor-margin');
                if (margin) margin.value = resultState.margin;
                const shadowSelect = document.getElementById('editor-shadow');
                if (shadowSelect) shadowSelect.value = resultState.shadow;
                renderPreview();
                track('amazon-preset-applied', { page: resultState.mode });
            });
        }
        const customColor = document.getElementById('editor-custom-color');
        const customText = document.getElementById('editor-custom-text');
        const updateCustom = (value) => {
            if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
            resultState.customColor = value;
            if (customColor) customColor.value = value;
            if (customText) customText.value = value;
            renderPreview();
        };
        if (customColor) customColor.addEventListener('input', () => updateCustom(customColor.value));
        if (customText) customText.addEventListener('input', () => updateCustom(customText.value));
        document.getElementById('editor-size').addEventListener('change', (event) => {
            resultState.size = event.target.value;
            renderPreview();
        });
        const margin = document.getElementById('editor-margin');
        if (margin) {
            margin.addEventListener('input', () => {
                const rawValue = Number(margin.value || 0);
                resultState.margin = resultState.config.marginLabelKey === 'portraitScaleLabel'
                    ? 30 - rawValue
                    : rawValue;
                renderPreview();
            });
        }
        if (shadow) {
            shadow.addEventListener('change', () => {
                resultState.shadow = shadow.value;
                renderPreview();
            });
        }
        document.querySelectorAll('.shape-option').forEach(btn => {
            btn.addEventListener('click', () => {
                resultState.shape = btn.dataset.shape;
                document.querySelectorAll('.shape-option').forEach(shapeBtn => {
                    const active = shapeBtn.dataset.shape === resultState.shape;
                    shapeBtn.classList.toggle('border-gray-900', active);
                    shapeBtn.classList.toggle('bg-gray-50', active);
                });
                renderPreview();
            });
        });
        document.getElementById('download-transparent').addEventListener('click', () => {
            downloadUrl(resultState.cutoutUrl, `${resultState.basename}_transparent.png`);
            track('transparent-download', { page: resultState.mode });
        });
        const downloadEdited = document.getElementById('download-edited');
        if (downloadEdited) downloadEdited.addEventListener('click', () => downloadCurrentVersion());
        const downloadSquare = document.getElementById('download-square');
        if (downloadSquare) downloadSquare.addEventListener('click', () => downloadCurrentVersion('square'));
        const downloadCircle = document.getElementById('download-circle');
        if (downloadCircle) downloadCircle.addEventListener('click', () => downloadCurrentVersion('circle'));
        document.getElementById('editor-start-over').addEventListener('click', () => {
            cleanupResultState();
            resetDropzone();
            fileInput.click();
        });

        document.querySelectorAll('.shape-option').forEach(shapeBtn => {
            const active = shapeBtn.dataset.shape === resultState.shape;
            shapeBtn.classList.toggle('border-gray-900', active);
            shapeBtn.classList.toggle('bg-gray-50', active);
        });
        renderPreview();
    }

    async function showResultEditor(originalFile, sourceFile, blob) {
        cleanupResultState();
        const mode = getEditorMode();
        const config = EDITOR_CONFIGS[mode];
        const cutoutUrl = URL.createObjectURL(blob);
        const sourceUrl = URL.createObjectURL(sourceFile || originalFile);
        let cutoutImage;
        let sourceImage;
        try {
            [cutoutImage, sourceImage] = await Promise.all([
                loadImage(cutoutUrl),
                loadImage(sourceUrl),
            ]);
        } catch (error) {
            URL.revokeObjectURL(cutoutUrl);
            URL.revokeObjectURL(sourceUrl);
            throw error;
        }
        const alphaBBox = computeAlphaBBox(cutoutImage);
        resultState = {
            mode,
            config,
            cutoutUrl,
            sourceUrl,
            cutoutImage,
            sourceImage,
            bgImageUrl: null,
            bgImage: null,
            alphaBBox,
            basename: basenameFromFile(originalFile),
            bg: config.defaultBg,
            customColor: '#f3f4f6',
            size: config.defaultSize,
            margin: config.defaultMargin,
            shadow: config.defaultShadow,
            shape: config.defaultShape || 'square',
        };
        renderResultEditor();
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

        cleanupResultState();
        dropzoneContent.classList.add('pointer-events-none');
        dropzoneContent.classList.remove('w-full');
        dropzone.classList.add('pointer-events-none');
        let shouldResetDropzone = false;

        try {
            showProgress(5, t('compressing'));
            let uploadFile = file;
            uploadFile = await compressImage(file);
            console.log(`[MiaoCut] 上传图片: ${uploadFile.name} (${(uploadFile.size / 1024).toFixed(2)} KB)`);
            showProgress(15, t('uploading'));

            const formData = new FormData();
            formData.append('file', uploadFile);
            const blob = await uploadWithProgress(formData);

            track('cutout-success', {
                type: fileExt,
                size: sizeBucket(file.size),
                duration: durationBucket(performance.now() - startedAt),
                page,
            });

            if (page === 'home') {
                autoDownloadTransparentResult(file, blob, page);
                shouldResetDropzone = true;
            } else {
                await showResultEditor(file, uploadFile, blob);
            }
            showBookmarkBanner();

        } catch (error) {
            shouldResetDropzone = true;
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
            dropzone.classList.remove('pointer-events-none');
            fileInput.value = '';
            if (shouldResetDropzone) {
                setTimeout(() => {
                    if (!resultState) resetDropzone();
                }, 2000);
            }
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

    })();
