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
        "editorHomeSub": "直接下载透明 PNG，或先加背景、阴影、调整画布再保存。",
        "editorProductTitle": "商品图已准备好",
        "editorProductSub": "快速生成白底、方形画布和阴影版商品图。",
        "editorPortraitTitle": "人像抠图已准备好",
        "editorPortraitSub": "切换职业头像背景、尺寸和圆形头像预览。",
        "backgroundLabel": "背景",
        "shadowLabel": "阴影",
        "shapeLabel": "形状",
        "uploadBgImage": "上传背景图",
        "replaceBgImage": "更换背景图",
        "bgScaleLabel": "背景缩放",
        "dragBgHint": "拖动画布可移动背景",
        "amazonPreset": "Amazon-safe 白底预设",
        "bgTransparent": "透明",
        "bgWhite": "白色",
        "bgBlack": "黑色",
        "bgLightGray": "浅灰",
        "bgBlur": "虚化原图",
        "bgCustom": "自定义",
        "shadowNone": "无",
        "shapeSquare": "方形",
        "shapeCircle": "圆形",
        "downloadTransparent": "下载透明 PNG",
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
        "toolRestoreTitle": "老照片",
        "batchDoorButton": "批量抠图",
        "batchDoorBadge": "Pro",
        "batchDoorHint": "一次处理 20+ 张图片。",
        "batchModalTitle": "批量抠图 Pro 即将上线",
        "batchModalBody": "目标速度：每秒 1-2 张。留下邮箱，上线后免费获得 100 积分体验。",
        "batchModalEmailLabel": "邮箱",
        "batchModalEmailPlaceholder": "you@example.com",
        "batchModalSubmit": "加入候补名单",
        "batchModalSending": "提交中...",
        "batchModalNoThanks": "稍后再说",
        "batchModalThanksTitle": "已加入名单",
        "batchModalThanksBody": "上线后我们会通知你，并赠送 100 积分。",
        "batchModalError": "提交失败，请稍后再试。",
        "batchModalInvalidEmail": "请输入有效邮箱。",
        "batchModalClose": "关闭",
        "rateDayModalTitle": "今日免费额度已用完",
        "rateDayModalBody": "免费版每天有抠图次数上限，你今天的额度已经用完了（明天会自动重置，不是永久用完）。升级 Pro 即可解除每日限制，还能一次性批量处理、享受更高速度与并发。留下邮箱，Pro 开放时第一时间通知你，并赠送 100 积分。",
        "rateDayModalSubmit": "预约 Pro",
        "rateDayModalThanksTitle": "已加入 Pro 候补名单",
        "rateDayModalThanksBody": "Pro 开放后我们会第一时间通知你，并赠送 100 积分。",
        "rateBurstTitle": "手速太快啦",
        "rateBurstBody": "请等约 {s} 秒再试 —— 今天的免费额度还没用完，放心。",
        "rateBurstProCta": "想更快 / 批量处理？升级 Pro",
        "bgSnow": "极简浅灰",
        "bgIdBlue": "证件蓝",
        "bgIdRed": "证件红",
        "bgStudioLabel": "影棚柔光",
        "gradStudioTop": "顶部柔光",
        "gradCove": "无缝背景纸",
        "gradWarmGray": "轻奢暖灰",
        "gradSpotlight": "聚光灯",
        "gradCoolMist": "冷调晨雾",
        "shadowContact": "轻柔落地",
        "shadowDrop": "立体投影",
        "shadowAdvanced": "微调阴影",
        "contactShadowLabel": "接地阴影",
        "sliderOpacity": "浓度",
        "sliderSoftness": "柔和度",
        "sliderSpread": "宽度",
        "sliderLength": "影长",
        "sliderBlur": "模糊",
        "sliderOffsetX": "水平偏移",
        "sliderOffsetY": "垂直偏移",
        "contactShadowCroppedHint": "主体底部被裁切，已自动贴住画布底边，接地阴影不生效。",
        "canvasLabel": "画布",
        "ratioOriginal": "原图尺寸",
        "ratioSquare": "1:1 方图",
        "ratioPortrait": "4:5 竖图",
        "ratioStory": "9:16 竖屏",
        "ratio34": "3:4 证件照",
        "subjectSizeLabel": "主体大小",
        "qualityLabel": "画质",
        "centerH": "水平居中",
        "centerV": "垂直居中",
        "dragSubjectHint": "拖动预览图可调整主体位置",
        "exportLabel": "导出",
        "exportSizeLabel": "尺寸",
        "sizeAuto": "自动",
        "jpgMatteHint": "JPG 不支持透明，透明区域会填充为白色。",
        "webpFallbackHint": "你的浏览器不支持保存 WebP，已改为下载 PNG。",
        "exportFailed": "导出失败，请换一个尺寸或格式再试。",
        "downloadImage": "下载",
        "exporting": "正在生成…",
        "editBgShadow": "编辑背景 / 阴影",
        "homeDoneTitle": "透明 PNG 已下载",
        "homeDoneSub": "需要白底、阴影或方图？可以在这里继续编辑，或拖入下一张图片。"
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
        "editorHomeSub": "Download the transparent PNG, or add a background, shadow or new canvas size first.",
        "editorProductTitle": "Product photo ready",
        "editorProductSub": "Create a white-background, square-canvas, or shadowed product image.",
        "editorPortraitTitle": "Portrait cutout ready",
        "editorPortraitSub": "Switch profile backgrounds, output sizes, and circular avatar previews.",
        "backgroundLabel": "Background",
        "shadowLabel": "Shadow",
        "shapeLabel": "Shape",
        "uploadBgImage": "Upload background",
        "replaceBgImage": "Replace background",
        "bgScaleLabel": "Background scale",
        "dragBgHint": "Drag the canvas to move the background",
        "amazonPreset": "Amazon-safe white preset",
        "bgTransparent": "Transparent",
        "bgWhite": "White",
        "bgBlack": "Black",
        "bgLightGray": "Light gray",
        "bgBlur": "Blur original",
        "bgCustom": "Custom",
        "shadowNone": "None",
        "shapeSquare": "Square",
        "shapeCircle": "Circle",
        "downloadTransparent": "Download transparent PNG",
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
        "toolRestoreTitle": "Old Photo",
        "batchDoorButton": "Batch Process",
        "batchDoorBadge": "Pro",
        "batchDoorHint": "Remove backgrounds from 20+ images at once.",
        "batchModalTitle": "Batch Process Pro is coming soon",
        "batchModalBody": "Target speed: 1-2 images per second. Leave your email and get 100 free credits when it opens.",
        "batchModalEmailLabel": "Email",
        "batchModalEmailPlaceholder": "you@example.com",
        "batchModalSubmit": "Join waitlist",
        "batchModalSending": "Joining...",
        "batchModalNoThanks": "Maybe later",
        "batchModalThanksTitle": "You are on the list",
        "batchModalThanksBody": "We will notify you when it opens and add 100 free credits.",
        "batchModalError": "Could not submit. Please try again.",
        "batchModalInvalidEmail": "Enter a valid email.",
        "batchModalClose": "Close",
        "rateDayModalTitle": "Today's free quota is used up",
        "rateDayModalBody": "The free plan has a daily limit on cutouts, and you've used today's quota (it resets automatically tomorrow — it's not gone for good). Upgrade to Pro to remove the daily limit, process images in batches, and get higher speed and concurrency. Leave your email and we'll notify you the moment Pro opens — plus 100 free credits.",
        "rateDayModalSubmit": "Get Pro early access",
        "rateDayModalThanksTitle": "You're on the Pro list",
        "rateDayModalThanksBody": "We'll notify you the moment Pro opens and add 100 free credits.",
        "rateBurstTitle": "Whoa, slow down a little",
        "rateBurstBody": "Please wait about {s}s and try again — you still have free quota left today.",
        "rateBurstProCta": "Need it faster / in batches? Get Pro",
        "bgSnow": "Soft gray",
        "bgIdBlue": "ID blue",
        "bgIdRed": "ID red",
        "bgStudioLabel": "Studio lighting",
        "gradStudioTop": "Top softbox",
        "gradCove": "Seamless paper",
        "gradWarmGray": "Warm gray",
        "gradSpotlight": "Spotlight",
        "gradCoolMist": "Cool mist",
        "shadowContact": "Soft ground",
        "shadowDrop": "Drop shadow",
        "shadowAdvanced": "Fine-tune shadows",
        "contactShadowLabel": "Ground shadow",
        "sliderOpacity": "Opacity",
        "sliderSoftness": "Softness",
        "sliderSpread": "Width",
        "sliderLength": "Length",
        "sliderBlur": "Blur",
        "sliderOffsetX": "Horizontal offset",
        "sliderOffsetY": "Vertical offset",
        "contactShadowCroppedHint": "The subject is cut off at the bottom, so it sits on the bottom edge and the ground shadow is skipped.",
        "canvasLabel": "Canvas",
        "ratioOriginal": "Original",
        "ratioSquare": "1:1 Square",
        "ratioPortrait": "4:5 Portrait",
        "ratioStory": "9:16 Story",
        "ratio34": "3:4 ID photo",
        "subjectSizeLabel": "Subject size",
        "qualityLabel": "Quality",
        "centerH": "Center horizontally",
        "centerV": "Center vertically",
        "dragSubjectHint": "Drag the image to reposition the subject",
        "exportLabel": "Export",
        "exportSizeLabel": "Size",
        "sizeAuto": "Auto",
        "jpgMatteHint": "JPG has no transparency, so transparent areas will be filled with white.",
        "webpFallbackHint": "Your browser can't save WebP, so a PNG was downloaded instead.",
        "exportFailed": "Export failed. Try a smaller size or another format.",
        "downloadImage": "Download",
        "exporting": "Preparing…",
        "editBgShadow": "Edit background & shadow",
        "homeDoneTitle": "Transparent PNG downloaded",
        "homeDoneSub": "Need a white background, a shadow or a square canvas? Edit it here, or drop another image."
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
        "editorHomeSub": "पारदर्शी PNG डाउनलोड करें, या पहले पृष्ठभूमि, छाया या नया कैनवास आकार जोड़ें।",
        "editorProductTitle": "उत्पाद फोटो तैयार",
        "editorProductSub": "एक सफ़ेद-पृष्ठभूमि, चौकोर-कैनवास, या छायांकित उत्पाद छवि बनाएं।",
        "editorPortraitTitle": "पोर्ट्रेट कटआउट तैयार",
        "editorPortraitSub": "प्रोफ़ाइल पृष्ठभूमि, आउटपुट आकार और गोलाकार अवतार पूर्वावलोकन बदलें।",
        "backgroundLabel": "पृष्ठभूमि",
        "shadowLabel": "छाया",
        "shapeLabel": "आकार",
        "uploadBgImage": "पृष्ठभूमि अपलोड करें",
        "replaceBgImage": "पृष्ठभूमि बदलें",
        "bgScaleLabel": "पृष्ठभूमि पैमाना",
        "dragBgHint": "पृष्ठभूमि को स्थानांतरित करने के लिए कैनवास को खींचें",
        "amazonPreset": "Amazon-सुरक्षित सफेद प्रीसेट",
        "bgTransparent": "पारदर्शी",
        "bgWhite": "सफ़ेद",
        "bgBlack": "काला",
        "bgLightGray": "हल्का ग्रे",
        "bgBlur": "मूल को धुंधला करें",
        "bgCustom": "रिवाज़",
        "shadowNone": "कोई नहीं",
        "shapeSquare": "वर्ग",
        "shapeCircle": "घेरा",
        "downloadTransparent": "पारदर्शी PNG डाउनलोड करें",
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
        "toolRestoreTitle": "पुरानी फोटो",
        "batchDoorButton": "बैच प्रोसेस",
        "batchDoorBadge": "Pro",
        "batchDoorHint": "एक साथ 20+ छवियों से बैकग्राउंड हटाएं।",
        "rateDayModalTitle": "आज का मुफ़्त कोटा खत्म हो गया",
        "rateDayModalBody": "मुफ़्त प्लान में हर दिन कटआउट की सीमा होती है, और आपका आज का कोटा पूरा हो चुका है (यह कल अपने-आप रीसेट हो जाएगा, हमेशा के लिए खत्म नहीं हुआ है)। Pro में अपग्रेड करने पर दैनिक सीमा हट जाती है, एक साथ कई छवियां प्रोसेस की जा सकती हैं, और ज़्यादा गति व एक साथ ज़्यादा प्रोसेसिंग मिलती है। अपना ईमेल छोड़ें, Pro शुरू होते ही हम आपको सबसे पहले बताएंगे — साथ में 100 मुफ्त क्रेडिट भी।",
        "rateDayModalSubmit": "Pro की अर्ली एक्सेस पाएं",
        "rateDayModalThanksTitle": "आप Pro सूची में हैं",
        "rateDayModalThanksBody": "Pro शुरू होते ही हम आपको सबसे पहले सूचित करेंगे और 100 मुफ्त क्रेडिट जोड़ देंगे।",
        "rateBurstTitle": "थोड़ा धीरे चलें",
        "rateBurstBody": "कृपया लगभग {s} सेकंड रुककर दोबारा कोशिश करें — आज का मुफ़्त कोटा अभी बाकी है।",
        "rateBurstProCta": "तेज़ या बैच में चाहिए? Pro लें",
        "batchModalTitle": "Batch Process Pro जल्द आ रहा है",
        "batchModalBody": "लक्ष्य गति: प्रति सेकंड 1-2 छवियां। अपना ईमेल छोड़ें और लॉन्च पर 100 मुफ्त क्रेडिट पाएं।",
        "batchModalEmailLabel": "ईमेल",
        "batchModalEmailPlaceholder": "you@example.com",
        "batchModalSubmit": "प्रतीक्षा सूची में शामिल हों",
        "batchModalSending": "जुड़ रहे हैं...",
        "batchModalNoThanks": "बाद में",
        "batchModalThanksTitle": "आप सूची में जुड़ गए हैं",
        "batchModalThanksBody": "लॉन्च पर हम आपको सूचित करेंगे और 100 मुफ्त क्रेडिट देंगे।",
        "batchModalError": "सबमिट नहीं हो पाया। कृपया फिर कोशिश करें।",
        "batchModalInvalidEmail": "मान्य ईमेल दर्ज करें।",
        "batchModalClose": "बंद करें",
        "bgSnow": "सॉफ्ट ग्रे",
        "bgIdBlue": "आईडी नीला",
        "bgIdRed": "आईडी लाल",
        "bgStudioLabel": "स्टूडियो लाइटिंग",
        "gradStudioTop": "टॉप सॉफ्टबॉक्स",
        "gradCove": "सीमलेस पेपर",
        "gradWarmGray": "वॉर्म ग्रे",
        "gradSpotlight": "स्पॉटलाइट",
        "gradCoolMist": "कूल मिस्ट",
        "shadowContact": "हल्की ज़मीनी छाया",
        "shadowDrop": "ड्रॉप शैडो",
        "shadowAdvanced": "छाया को बारीकी से सेट करें",
        "contactShadowLabel": "ज़मीनी छाया",
        "sliderOpacity": "गहराई",
        "sliderSoftness": "कोमलता",
        "sliderSpread": "चौड़ाई",
        "sliderLength": "लंबाई",
        "sliderBlur": "धुंधलापन",
        "sliderOffsetX": "क्षैतिज खिसकाव",
        "sliderOffsetY": "ऊर्ध्वाधर खिसकाव",
        "contactShadowCroppedHint": "विषय नीचे से कटा हुआ है, इसलिए उसे नीचे के किनारे पर रखा गया है और ज़मीनी छाया लागू नहीं होगी।",
        "canvasLabel": "कैनवास",
        "ratioOriginal": "मूल आकार",
        "ratioSquare": "1:1 वर्ग",
        "ratioPortrait": "4:5 पोर्ट्रेट",
        "ratioStory": "9:16 स्टोरी",
        "ratio34": "3:4 आईडी फ़ोटो",
        "subjectSizeLabel": "विषय का आकार",
        "qualityLabel": "गुणवत्ता",
        "centerH": "क्षैतिज बीच में",
        "centerV": "ऊर्ध्वाधर बीच में",
        "dragSubjectHint": "विषय की जगह बदलने के लिए छवि को खींचें",
        "exportLabel": "एक्सपोर्ट",
        "exportSizeLabel": "आकार",
        "sizeAuto": "ऑटो",
        "jpgMatteHint": "JPG में पारदर्शिता नहीं होती, इसलिए पारदर्शी हिस्से सफ़ेद हो जाएंगे।",
        "webpFallbackHint": "आपका ब्राउज़र WebP सेव नहीं कर सकता, इसलिए PNG डाउनलोड किया गया।",
        "exportFailed": "एक्सपोर्ट विफल रहा। छोटा आकार या दूसरा फ़ॉर्मैट आज़माएं।",
        "downloadImage": "डाउनलोड करें",
        "exporting": "तैयार हो रहा है…",
        "editBgShadow": "पृष्ठभूमि और छाया संपादित करें",
        "homeDoneTitle": "पारदर्शी PNG डाउनलोड हो गया",
        "homeDoneSub": "सफ़ेद पृष्ठभूमि, छाया या वर्गाकार कैनवास चाहिए? यहीं संपादित करें, या अगली छवि डालें।"
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
        "editorHomeSub": "Unduh PNG transparan, atau tambahkan latar, bayangan, atau ukuran kanvas baru terlebih dahulu.",
        "editorProductTitle": "Foto produk sudah siap",
        "editorProductSub": "Buat gambar produk berlatar belakang putih, kanvas persegi, atau berbayang.",
        "editorPortraitTitle": "Potongan potret sudah siap",
        "editorPortraitSub": "Ganti latar belakang profil, ukuran keluaran, dan pratinjau avatar melingkar.",
        "backgroundLabel": "Latar belakang",
        "shadowLabel": "Bayangan",
        "shapeLabel": "Membentuk",
        "uploadBgImage": "Unggah latar belakang",
        "replaceBgImage": "Ganti latar belakang",
        "bgScaleLabel": "Skala latar belakang",
        "dragBgHint": "Seret kanvas untuk memindahkan latar belakang",
        "amazonPreset": "Preset putih aman Amazon",
        "bgTransparent": "Transparan",
        "bgWhite": "Putih",
        "bgBlack": "Hitam",
        "bgLightGray": "Abu-abu muda",
        "bgBlur": "Buramkan yang asli",
        "bgCustom": "Kebiasaan",
        "shadowNone": "Tidak ada",
        "shapeSquare": "Persegi",
        "shapeCircle": "Lingkaran",
        "downloadTransparent": "Unduh PNG transparan",
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
        "toolRestoreTitle": "Foto lama",
        "batchDoorButton": "Proses Batch",
        "batchDoorBadge": "Pro",
        "batchDoorHint": "Hapus latar belakang dari 20+ gambar sekaligus.",
        "rateDayModalTitle": "Kuota gratis hari ini sudah habis",
        "rateDayModalBody": "Paket gratis memiliki batas harian untuk cutout, dan kuota Anda hari ini sudah terpakai (akan direset otomatis besok — bukan habis selamanya). Upgrade ke Pro untuk menghapus batas harian, memproses banyak gambar sekaligus, serta mendapatkan kecepatan dan konkurensi lebih tinggi. Tinggalkan email Anda dan kami akan memberi tahu begitu Pro dibuka — plus 100 kredit gratis.",
        "rateDayModalSubmit": "Dapatkan akses awal Pro",
        "rateDayModalThanksTitle": "Anda masuk daftar Pro",
        "rateDayModalThanksBody": "Kami akan memberi tahu Anda begitu Pro dibuka dan menambahkan 100 kredit gratis.",
        "rateBurstTitle": "Pelan-pelan dulu ya",
        "rateBurstBody": "Tunggu sekitar {s} detik lalu coba lagi — kuota gratis Anda hari ini masih ada.",
        "rateBurstProCta": "Butuh lebih cepat / sekaligus banyak? Dapatkan Pro",
        "batchModalTitle": "Batch Process Pro segera hadir",
        "batchModalBody": "Target kecepatan: 1-2 gambar per detik. Tinggalkan email Anda dan dapatkan 100 kredit gratis saat dibuka.",
        "batchModalEmailLabel": "Email",
        "batchModalEmailPlaceholder": "you@example.com",
        "batchModalSubmit": "Gabung daftar tunggu",
        "batchModalSending": "Mengirim...",
        "batchModalNoThanks": "Nanti saja",
        "batchModalThanksTitle": "Anda masuk daftar",
        "batchModalThanksBody": "Kami akan memberi tahu Anda saat dibuka dan menambahkan 100 kredit gratis.",
        "batchModalError": "Gagal mengirim. Silakan coba lagi.",
        "batchModalInvalidEmail": "Masukkan email yang valid.",
        "batchModalClose": "Tutup",
        "bgSnow": "Abu-abu lembut",
        "bgIdBlue": "Biru pasfoto",
        "bgIdRed": "Merah pasfoto",
        "bgStudioLabel": "Pencahayaan studio",
        "gradStudioTop": "Softbox atas",
        "gradCove": "Kertas latar mulus",
        "gradWarmGray": "Abu-abu hangat",
        "gradSpotlight": "Sorotan",
        "gradCoolMist": "Kabut sejuk",
        "shadowContact": "Bayangan lantai lembut",
        "shadowDrop": "Bayangan jatuh",
        "shadowAdvanced": "Atur bayangan",
        "contactShadowLabel": "Bayangan lantai",
        "sliderOpacity": "Ketebalan",
        "sliderSoftness": "Kelembutan",
        "sliderSpread": "Lebar",
        "sliderLength": "Panjang",
        "sliderBlur": "Blur",
        "sliderOffsetX": "Geser horizontal",
        "sliderOffsetY": "Geser vertikal",
        "contactShadowCroppedHint": "Objek terpotong di bagian bawah, jadi ditempel ke tepi bawah dan bayangan lantai tidak dipakai.",
        "canvasLabel": "Kanvas",
        "ratioOriginal": "Asli",
        "ratioSquare": "1:1 Persegi",
        "ratioPortrait": "4:5 Potret",
        "ratioStory": "9:16 Story",
        "ratio34": "3:4 Pasfoto",
        "subjectSizeLabel": "Ukuran objek",
        "qualityLabel": "Kualitas",
        "centerH": "Tengah horizontal",
        "centerV": "Tengah vertikal",
        "dragSubjectHint": "Seret gambar untuk memindahkan objek",
        "exportLabel": "Ekspor",
        "exportSizeLabel": "Ukuran",
        "sizeAuto": "Otomatis",
        "jpgMatteHint": "JPG tidak mendukung transparansi, jadi area transparan akan diisi putih.",
        "webpFallbackHint": "Browser Anda tidak bisa menyimpan WebP, jadi PNG yang diunduh.",
        "exportFailed": "Ekspor gagal. Coba ukuran lebih kecil atau format lain.",
        "downloadImage": "Unduh",
        "exporting": "Menyiapkan…",
        "editBgShadow": "Edit latar & bayangan",
        "homeDoneTitle": "PNG transparan sudah diunduh",
        "homeDoneSub": "Perlu latar putih, bayangan, atau kanvas persegi? Edit di sini, atau taruh gambar berikutnya."
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
        "editorHomeSub": "Baixe o PNG transparente ou adicione antes um fundo, sombra ou novo tamanho de tela.",
        "editorProductTitle": "Foto do produto pronta",
        "editorProductSub": "Crie uma imagem de produto com fundo branco, tela quadrada ou sombreada.",
        "editorPortraitTitle": "Recorte de retrato pronto",
        "editorPortraitSub": "Alterne planos de fundo de perfil, tamanhos de saída e visualizações circulares de avatar.",
        "backgroundLabel": "Fundo",
        "shadowLabel": "Sombra",
        "shapeLabel": "Forma",
        "uploadBgImage": "Carregar plano de fundo",
        "replaceBgImage": "Substituir plano de fundo",
        "bgScaleLabel": "Escala de fundo",
        "dragBgHint": "Arraste a tela para mover o fundo",
        "amazonPreset": "Predefinição de branco seguro para Amazon",
        "bgTransparent": "Transparente",
        "bgWhite": "Branco",
        "bgBlack": "Preto",
        "bgLightGray": "Cinza claro",
        "bgBlur": "Desfocar original",
        "bgCustom": "Personalizado",
        "shadowNone": "Nenhum",
        "shapeSquare": "Quadrado",
        "shapeCircle": "Círculo",
        "downloadTransparent": "Baixe PNG transparente",
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
        "toolRestoreTitle": "Foto antiga",
        "batchDoorButton": "Processamento em lote",
        "batchDoorBadge": "Pro",
        "batchDoorHint": "Remova fundos de mais de 20 imagens de uma vez.",
        "rateDayModalTitle": "A cota gratuita de hoje acabou",
        "rateDayModalBody": "O plano gratuito tem um limite diário de recortes e você já usou a cota de hoje (ela é renovada automaticamente amanhã — não acabou para sempre). Faça upgrade para o Pro para remover o limite diário, processar imagens em lote e ter mais velocidade e simultaneidade. Deixe seu e-mail e avisaremos assim que o Pro abrir — além de 100 créditos grátis.",
        "rateDayModalSubmit": "Quero acesso antecipado ao Pro",
        "rateDayModalThanksTitle": "Você está na lista do Pro",
        "rateDayModalThanksBody": "Avisaremos assim que o Pro abrir e adicionaremos 100 créditos grátis.",
        "rateBurstTitle": "Calma, mais devagar",
        "rateBurstBody": "Aguarde cerca de {s}s e tente de novo — você ainda tem cota gratuita hoje.",
        "rateBurstProCta": "Precisa de mais rapidez / lote? Conheça o Pro",
        "batchModalTitle": "Batch Process Pro chegará em breve",
        "batchModalBody": "Velocidade alvo: 1-2 imagens por segundo. Deixe seu e-mail e ganhe 100 créditos grátis quando abrir.",
        "batchModalEmailLabel": "E-mail",
        "batchModalEmailPlaceholder": "you@example.com",
        "batchModalSubmit": "Entrar na lista",
        "batchModalSending": "Enviando...",
        "batchModalNoThanks": "Talvez depois",
        "batchModalThanksTitle": "Você entrou na lista",
        "batchModalThanksBody": "Avisaremos quando abrir e adicionaremos 100 créditos grátis.",
        "batchModalError": "Não foi possível enviar. Tente novamente.",
        "batchModalInvalidEmail": "Digite um e-mail válido.",
        "batchModalClose": "Fechar",
        "bgSnow": "Cinza suave",
        "bgIdBlue": "Azul documento",
        "bgIdRed": "Vermelho documento",
        "bgStudioLabel": "Luz de estúdio",
        "gradStudioTop": "Softbox superior",
        "gradCove": "Fundo infinito",
        "gradWarmGray": "Cinza quente",
        "gradSpotlight": "Holofote",
        "gradCoolMist": "Névoa fria",
        "shadowContact": "Sombra no chão",
        "shadowDrop": "Sombra projetada",
        "shadowAdvanced": "Ajustar sombras",
        "contactShadowLabel": "Sombra de contato",
        "sliderOpacity": "Opacidade",
        "sliderSoftness": "Suavidade",
        "sliderSpread": "Largura",
        "sliderLength": "Comprimento",
        "sliderBlur": "Desfoque",
        "sliderOffsetX": "Deslocamento horizontal",
        "sliderOffsetY": "Deslocamento vertical",
        "contactShadowCroppedHint": "O objeto está cortado embaixo, então fica encostado na borda inferior e a sombra de contato não é aplicada.",
        "canvasLabel": "Tela",
        "ratioOriginal": "Original",
        "ratioSquare": "1:1 Quadrado",
        "ratioPortrait": "4:5 Retrato",
        "ratioStory": "9:16 Stories",
        "ratio34": "3:4 Foto 3x4",
        "subjectSizeLabel": "Tamanho do objeto",
        "qualityLabel": "Qualidade",
        "centerH": "Centralizar na horizontal",
        "centerV": "Centralizar na vertical",
        "dragSubjectHint": "Arraste a imagem para reposicionar o objeto",
        "exportLabel": "Exportar",
        "exportSizeLabel": "Tamanho",
        "sizeAuto": "Automático",
        "jpgMatteHint": "JPG não tem transparência, então as áreas transparentes ficarão brancas.",
        "webpFallbackHint": "Seu navegador não salva WebP, então baixamos um PNG.",
        "exportFailed": "Falha ao exportar. Tente um tamanho menor ou outro formato.",
        "downloadImage": "Baixar",
        "exporting": "Preparando…",
        "editBgShadow": "Editar fundo e sombra",
        "homeDoneTitle": "PNG transparente baixado",
        "homeDoneSub": "Precisa de fundo branco, sombra ou tela quadrada? Edite aqui ou solte a próxima imagem."
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
        "editorHomeSub": "স্বচ্ছ PNG ডাউনলোড করুন, অথবা আগে পটভূমি, ছায়া বা নতুন ক্যানভাস আকার যোগ করুন।",
        "editorProductTitle": "পণ্যের ছবি প্রস্তুত",
        "editorProductSub": "একটি সাদা-পটভূমি, বর্গাকার-ক্যানভাস বা ছায়াযুক্ত পণ্যের ছবি তৈরি করুন।",
        "editorPortraitTitle": "পোর্ট্রেট কাটআউট প্রস্তুত",
        "editorPortraitSub": "প্রোফাইল ব্যাকগ্রাউন্ড, আউটপুট আকার, এবং বৃত্তাকার অবতার পূর্বরূপ পরিবর্তন করুন।",
        "backgroundLabel": "পটভূমি",
        "shadowLabel": "ছায়া",
        "shapeLabel": "আকৃতি",
        "uploadBgImage": "পটভূমি আপলোড করুন",
        "replaceBgImage": "পটভূমি প্রতিস্থাপন করুন",
        "bgScaleLabel": "ব্যাকগ্রাউন্ড স্কেল",
        "dragBgHint": "পটভূমি সরাতে ক্যানভাস টেনে আনুন",
        "amazonPreset": "Amazon- নিরাপদ সাদা প্রিসেট",
        "bgTransparent": "স্বচ্ছ",
        "bgWhite": "সাদা",
        "bgBlack": "কালো",
        "bgLightGray": "হালকা ধূসর",
        "bgBlur": "অস্পষ্ট মূল",
        "bgCustom": "কাস্টম",
        "shadowNone": "কোনোটিই নয়",
        "shapeSquare": "বর্গক্ষেত্র",
        "shapeCircle": "বৃত্ত",
        "downloadTransparent": "স্বচ্ছ PNG ডাউনলোড করুন",
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
        "toolRestoreTitle": "পুরানো ছবি",
        "batchDoorButton": "ব্যাচ প্রসেস",
        "batchDoorBadge": "Pro",
        "batchDoorHint": "একসাথে 20+ ছবির ব্যাকগ্রাউন্ড সরান।",
        "rateDayModalTitle": "আজকের বিনামূল্যের কোটা শেষ",
        "rateDayModalBody": "ফ্রি প্ল্যানে প্রতিদিন কাটআউটের একটি সীমা আছে, আর আজকের কোটা আপনার শেষ হয়ে গেছে (কাল নিজে থেকেই রিসেট হবে — চিরতরে শেষ হয়নি)। Pro-তে আপগ্রেড করলে দৈনিক সীমা উঠে যায়, একসাথে অনেক ছবি প্রসেস করা যায় এবং বেশি গতি ও কনকারেন্সি পাওয়া যায়। আপনার ইমেল দিন, Pro চালু হলেই আমরা সবার আগে আপনাকে জানাব — সঙ্গে 100টি ফ্রি ক্রেডিট।",
        "rateDayModalSubmit": "Pro-এর আর্লি অ্যাক্সেস নিন",
        "rateDayModalThanksTitle": "আপনি Pro তালিকায় আছেন",
        "rateDayModalThanksBody": "Pro চালু হলেই আমরা আপনাকে জানাব এবং 100টি ফ্রি ক্রেডিট যোগ করব।",
        "rateBurstTitle": "একটু ধীরে",
        "rateBurstBody": "অনুগ্রহ করে প্রায় {s} সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন — আজকের ফ্রি কোটা এখনও বাকি আছে।",
        "rateBurstProCta": "আরও দ্রুত / ব্যাচে চান? Pro নিন",
        "batchModalTitle": "Batch Process Pro শীঘ্রই আসছে",
        "batchModalBody": "লক্ষ্য গতি: প্রতি সেকেন্ডে 1-2টি ছবি। আপনার ইমেল দিন এবং চালু হলে 100টি ফ্রি ক্রেডিট পান।",
        "batchModalEmailLabel": "ইমেল",
        "batchModalEmailPlaceholder": "you@example.com",
        "batchModalSubmit": "ওয়েটলিস্টে যোগ দিন",
        "batchModalSending": "জমা হচ্ছে...",
        "batchModalNoThanks": "পরে",
        "batchModalThanksTitle": "আপনি তালিকায় আছেন",
        "batchModalThanksBody": "চালু হলে আমরা আপনাকে জানাব এবং 100টি ফ্রি ক্রেডিট দেব।",
        "batchModalError": "জমা দেওয়া যায়নি। আবার চেষ্টা করুন।",
        "batchModalInvalidEmail": "একটি বৈধ ইমেল লিখুন।",
        "batchModalClose": "বন্ধ করুন",
        "bgSnow": "নরম ধূসর",
        "bgIdBlue": "আইডি নীল",
        "bgIdRed": "আইডি লাল",
        "bgStudioLabel": "স্টুডিও আলো",
        "gradStudioTop": "উপরের সফটবক্স",
        "gradCove": "সিমলেস পেপার",
        "gradWarmGray": "উষ্ণ ধূসর",
        "gradSpotlight": "স্পটলাইট",
        "gradCoolMist": "শীতল কুয়াশা",
        "shadowContact": "নরম মাটির ছায়া",
        "shadowDrop": "ড্রপ শ্যাডো",
        "shadowAdvanced": "ছায়া সূক্ষ্মভাবে ঠিক করুন",
        "contactShadowLabel": "মাটির ছায়া",
        "sliderOpacity": "গাঢ়তা",
        "sliderSoftness": "কোমলতা",
        "sliderSpread": "প্রস্থ",
        "sliderLength": "দৈর্ঘ্য",
        "sliderBlur": "ঝাপসা",
        "sliderOffsetX": "আনুভূমিক সরণ",
        "sliderOffsetY": "উল্লম্ব সরণ",
        "contactShadowCroppedHint": "বিষয়টি নিচে কাটা আছে, তাই এটি নিচের প্রান্তে বসানো হয়েছে এবং মাটির ছায়া প্রয়োগ হবে না।",
        "canvasLabel": "ক্যানভাস",
        "ratioOriginal": "আসল আকার",
        "ratioSquare": "1:1 বর্গ",
        "ratioPortrait": "4:5 পোর্ট্রেট",
        "ratioStory": "9:16 স্টোরি",
        "ratio34": "3:4 আইডি ছবি",
        "subjectSizeLabel": "বিষয়ের আকার",
        "qualityLabel": "মান",
        "centerH": "আনুভূমিক মাঝে",
        "centerV": "উল্লম্ব মাঝে",
        "dragSubjectHint": "বিষয়ের অবস্থান বদলাতে ছবিটি টেনে নিন",
        "exportLabel": "এক্সপোর্ট",
        "exportSizeLabel": "আকার",
        "sizeAuto": "অটো",
        "jpgMatteHint": "JPG-তে স্বচ্ছতা নেই, তাই স্বচ্ছ অংশ সাদা হয়ে যাবে।",
        "webpFallbackHint": "আপনার ব্রাউজার WebP সেভ করতে পারে না, তাই PNG ডাউনলোড হয়েছে।",
        "exportFailed": "এক্সপোর্ট ব্যর্থ হয়েছে। ছোট আকার বা অন্য ফরম্যাট চেষ্টা করুন।",
        "downloadImage": "ডাউনলোড",
        "exporting": "প্রস্তুত হচ্ছে…",
        "editBgShadow": "পটভূমি ও ছায়া সম্পাদনা",
        "homeDoneTitle": "স্বচ্ছ PNG ডাউনলোড হয়েছে",
        "homeDoneSub": "সাদা পটভূমি, ছায়া বা বর্গাকার ক্যানভাস দরকার? এখানে সম্পাদনা করুন, বা পরের ছবিটি দিন।"
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
        "editorHomeSub": "I-download ang transparent na PNG, o magdagdag muna ng background, anino o bagong laki ng canvas.",
        "editorProductTitle": "Handa na ang larawan ng produkto",
        "editorProductSub": "Gumawa ng white-background, square-canvas, o shadowed na larawan ng produkto.",
        "editorPortraitTitle": "Handa na ang portrait cutout",
        "editorPortraitSub": "Lumipat ng mga background ng profile, laki ng output, at pabilog na mga preview ng avatar.",
        "backgroundLabel": "Background",
        "shadowLabel": "anino",
        "shapeLabel": "Hugis",
        "uploadBgImage": "Mag-upload ng background",
        "replaceBgImage": "Palitan ang background",
        "bgScaleLabel": "Background scale",
        "dragBgHint": "I-drag ang canvas para ilipat ang background",
        "amazonPreset": "Amazon-safe na puting preset",
        "bgTransparent": "Transparent",
        "bgWhite": "Puti",
        "bgBlack": "Itim",
        "bgLightGray": "Banayad na kulay abo",
        "bgBlur": "I-blur ang orihinal",
        "bgCustom": "Custom",
        "shadowNone": "wala",
        "shapeSquare": "Square",
        "shapeCircle": "Bilog",
        "downloadTransparent": "I-download ang transparent na PNG",
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
        "toolRestoreTitle": "Lumang Larawan",
        "batchDoorButton": "Batch Process",
        "batchDoorBadge": "Pro",
        "batchDoorHint": "Alisin ang background ng 20+ larawan nang sabay.",
        "rateDayModalTitle": "Naubos na ang libreng quota ngayong araw",
        "rateDayModalBody": "May pang-araw-araw na limitasyon ang libreng plan sa mga cutout, at nagamit mo na ang quota mo ngayon (awtomatiko itong mare-reset bukas — hindi ito permanenteng naubos). Mag-upgrade sa Pro para alisin ang daily limit, magproseso ng maraming larawan nang sabay-sabay, at makakuha ng mas mabilis na bilis at mas maraming sabayang proseso. Iwan ang email mo at aabisuhan ka namin sa sandaling magbukas ang Pro — dagdag pa ang 100 libreng credits.",
        "rateDayModalSubmit": "Kunin ang maagang access sa Pro",
        "rateDayModalThanksTitle": "Nasa listahan ka na ng Pro",
        "rateDayModalThanksBody": "Aabisuhan ka namin sa sandaling magbukas ang Pro at idadagdag ang 100 libreng credits.",
        "rateBurstTitle": "Dahan-dahan lang",
        "rateBurstBody": "Maghintay ng mga {s} segundo at subukan ulit — may natitira ka pang libreng quota ngayong araw.",
        "rateBurstProCta": "Kailangan ng mas mabilis / batch? Kunin ang Pro",
        "batchModalTitle": "Malapit na ang Batch Process Pro",
        "batchModalBody": "Target na bilis: 1-2 larawan bawat segundo. Iwan ang email mo at makakuha ng 100 libreng credits kapag inilunsad.",
        "batchModalEmailLabel": "Email",
        "batchModalEmailPlaceholder": "you@example.com",
        "batchModalSubmit": "Sumali sa waitlist",
        "batchModalSending": "Ipinapadala...",
        "batchModalNoThanks": "Mamaya na lang",
        "batchModalThanksTitle": "Nasa listahan ka na",
        "batchModalThanksBody": "Aabisuhan ka namin kapag inilunsad at bibigyan ka ng 100 libreng credits.",
        "batchModalError": "Hindi maisumite. Pakisubukang muli.",
        "batchModalInvalidEmail": "Maglagay ng valid na email.",
        "batchModalClose": "Isara",
        "bgSnow": "Malambot na gray",
        "bgIdBlue": "ID blue",
        "bgIdRed": "ID red",
        "bgStudioLabel": "Studio lighting",
        "gradStudioTop": "Softbox sa itaas",
        "gradCove": "Seamless na papel",
        "gradWarmGray": "Mainit na gray",
        "gradSpotlight": "Spotlight",
        "gradCoolMist": "Malamig na ulap",
        "shadowContact": "Malambot na anino sa sahig",
        "shadowDrop": "Drop shadow",
        "shadowAdvanced": "Ayusin ang anino",
        "contactShadowLabel": "Anino sa sahig",
        "sliderOpacity": "Kapal",
        "sliderSoftness": "Lambot",
        "sliderSpread": "Lapad",
        "sliderLength": "Haba",
        "sliderBlur": "Blur",
        "sliderOffsetX": "Pahalang na usog",
        "sliderOffsetY": "Patayong usog",
        "contactShadowCroppedHint": "Putol ang paksa sa ibaba, kaya nakadikit ito sa ibabang gilid at hindi ilalagay ang anino sa sahig.",
        "canvasLabel": "Canvas",
        "ratioOriginal": "Orihinal",
        "ratioSquare": "1:1 Parisukat",
        "ratioPortrait": "4:5 Portrait",
        "ratioStory": "9:16 Story",
        "ratio34": "3:4 ID photo",
        "subjectSizeLabel": "Laki ng paksa",
        "qualityLabel": "Kalidad",
        "centerH": "Igitna nang pahalang",
        "centerV": "Igitna nang patayo",
        "dragSubjectHint": "I-drag ang larawan para ilipat ang paksa",
        "exportLabel": "I-export",
        "exportSizeLabel": "Laki",
        "sizeAuto": "Auto",
        "jpgMatteHint": "Walang transparency ang JPG, kaya magiging puti ang mga transparent na bahagi.",
        "webpFallbackHint": "Hindi kayang mag-save ng WebP ng browser mo, kaya PNG ang na-download.",
        "exportFailed": "Hindi na-export. Subukan ang mas maliit na laki o ibang format.",
        "downloadImage": "I-download",
        "exporting": "Inihahanda…",
        "editBgShadow": "I-edit ang background at anino",
        "homeDoneTitle": "Na-download na ang transparent na PNG",
        "homeDoneSub": "Kailangan ng puting background, anino o parisukat na canvas? I-edit dito, o i-drop ang susunod na larawan."
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
        "editorHomeSub": "شفاف PNG ڈاؤن لوڈ کریں، یا پہلے پس منظر، سایہ یا نیا کینوس سائز شامل کریں۔",
        "editorProductTitle": "مصنوعات کی تصویر تیار ہے۔",
        "editorProductSub": "ایک سفید پس منظر، مربع کینوس، یا پروڈکٹ کی سایہ دار تصویر بنائیں۔",
        "editorPortraitTitle": "پورٹریٹ کٹ آؤٹ تیار ہے۔",
        "editorPortraitSub": "پروفائل کے پس منظر، آؤٹ پٹ سائز، اور سرکلر اوتار کے پیش نظارہ کو تبدیل کریں۔",
        "backgroundLabel": "پس منظر",
        "shadowLabel": "سایہ",
        "shapeLabel": "شکل",
        "uploadBgImage": "پس منظر اپ لوڈ کریں۔",
        "replaceBgImage": "پس منظر کو تبدیل کریں۔",
        "bgScaleLabel": "پس منظر کا پیمانہ",
        "dragBgHint": "پس منظر کو منتقل کرنے کے لیے کینوس کو گھسیٹیں۔",
        "amazonPreset": "Amazon-محفوظ سفید پیش سیٹ",
        "bgTransparent": "شفاف",
        "bgWhite": "سفید",
        "bgBlack": "سیاہ",
        "bgLightGray": "ہلکا بھوری رنگ",
        "bgBlur": "اصل کو دھندلا کریں۔",
        "bgCustom": "حسب ضرورت",
        "shadowNone": "کوئی نہیں۔",
        "shapeSquare": "مربع",
        "shapeCircle": "دائرہ",
        "downloadTransparent": "شفاف PNG ڈاؤن لوڈ کریں۔",
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
        "toolRestoreTitle": "پرانی تصویر",
        "batchDoorButton": "بیچ پروسیس",
        "batchDoorBadge": "Pro",
        "batchDoorHint": "ایک ساتھ 20+ تصاویر کے پس منظر ہٹائیں۔",
        "rateDayModalTitle": "آج کا مفت کوٹہ ختم ہو گیا",
        "rateDayModalBody": "مفت پلان میں روزانہ کٹ آؤٹ کی حد ہوتی ہے، اور آپ کا آج کا کوٹہ پورا ہو چکا ہے (یہ کل خود بخود ری سیٹ ہو جائے گا — ہمیشہ کے لیے ختم نہیں ہوا)۔ Pro میں اپ گریڈ کرنے سے روزانہ کی حد ہٹ جاتی ہے، ایک ساتھ کئی تصاویر پروسیس کی جا سکتی ہیں، اور زیادہ رفتار اور بیک وقت زیادہ پروسیسنگ ملتی ہے۔ اپنا ای میل چھوڑیں، Pro کھلتے ہی ہم سب سے پہلے آپ کو اطلاع دیں گے — ساتھ میں 100 مفت کریڈٹس بھی۔",
        "rateDayModalSubmit": "Pro کی ابتدائی رسائی حاصل کریں",
        "rateDayModalThanksTitle": "آپ Pro فہرست میں ہیں",
        "rateDayModalThanksBody": "Pro کھلتے ہی ہم آپ کو اطلاع دیں گے اور 100 مفت کریڈٹس شامل کر دیں گے۔",
        "rateBurstTitle": "ذرا آہستہ",
        "rateBurstBody": "براہِ کرم تقریباً {s} سیکنڈ رک کر دوبارہ کوشش کریں — آج کا مفت کوٹہ ابھی باقی ہے۔",
        "rateBurstProCta": "زیادہ تیز / بیچ میں چاہیے؟ Pro حاصل کریں",
        "batchModalTitle": "Batch Process Pro جلد آ رہا ہے",
        "batchModalBody": "ہدف رفتار: فی سیکنڈ 1-2 تصاویر۔ اپنا ای میل چھوڑیں اور لانچ پر 100 مفت کریڈٹس حاصل کریں۔",
        "batchModalEmailLabel": "ای میل",
        "batchModalEmailPlaceholder": "you@example.com",
        "batchModalSubmit": "ویٹ لسٹ میں شامل ہوں",
        "batchModalSending": "جمع ہو رہا ہے...",
        "batchModalNoThanks": "بعد میں",
        "batchModalThanksTitle": "آپ فہرست میں شامل ہیں",
        "batchModalThanksBody": "لانچ پر ہم آپ کو اطلاع دیں گے اور 100 مفت کریڈٹس دیں گے۔",
        "batchModalError": "جمع نہیں ہو سکا۔ دوبارہ کوشش کریں۔",
        "batchModalInvalidEmail": "درست ای میل درج کریں۔",
        "batchModalClose": "بند کریں",
        "bgSnow": "ہلکا سرمئی",
        "bgIdBlue": "شناختی نیلا",
        "bgIdRed": "شناختی سرخ",
        "bgStudioLabel": "اسٹوڈیو روشنی",
        "gradStudioTop": "اوپری سافٹ باکس",
        "gradCove": "سیم لیس پیپر",
        "gradWarmGray": "گرم سرمئی",
        "gradSpotlight": "اسپاٹ لائٹ",
        "gradCoolMist": "ٹھنڈی دھند",
        "shadowContact": "نرم زمینی سایہ",
        "shadowDrop": "ڈراپ شیڈو",
        "shadowAdvanced": "سائے کی باریک ترتیب",
        "contactShadowLabel": "زمینی سایہ",
        "sliderOpacity": "گہرائی",
        "sliderSoftness": "نرمی",
        "sliderSpread": "چوڑائی",
        "sliderLength": "لمبائی",
        "sliderBlur": "دھندلاپن",
        "sliderOffsetX": "افقی کھسکاؤ",
        "sliderOffsetY": "عمودی کھسکاؤ",
        "contactShadowCroppedHint": "تصویر کا موضوع نیچے سے کٹا ہوا ہے، اس لیے اسے نیچے کے کنارے پر رکھا گیا ہے اور زمینی سایہ نہیں لگے گا۔",
        "canvasLabel": "کینوس",
        "ratioOriginal": "اصل سائز",
        "ratioSquare": "1:1 مربع",
        "ratioPortrait": "4:5 پورٹریٹ",
        "ratioStory": "9:16 اسٹوری",
        "ratio34": "3:4 شناختی تصویر",
        "subjectSizeLabel": "موضوع کا سائز",
        "qualityLabel": "معیار",
        "centerH": "افقی طور پر درمیان میں",
        "centerV": "عمودی طور پر درمیان میں",
        "dragSubjectHint": "موضوع کی جگہ بدلنے کے لیے تصویر کو گھسیٹیں",
        "exportLabel": "ایکسپورٹ",
        "exportSizeLabel": "سائز",
        "sizeAuto": "خودکار",
        "jpgMatteHint": "JPG میں شفافیت نہیں ہوتی، اس لیے شفاف حصے سفید ہو جائیں گے۔",
        "webpFallbackHint": "آپ کا براؤزر WebP محفوظ نہیں کر سکتا، اس لیے PNG ڈاؤن لوڈ کیا گیا۔",
        "exportFailed": "ایکسپورٹ ناکام رہا۔ چھوٹا سائز یا کوئی اور فارمیٹ آزمائیں۔",
        "downloadImage": "ڈاؤن لوڈ",
        "exporting": "تیار ہو رہا ہے…",
        "editBgShadow": "پس منظر اور سایہ ترمیم کریں",
        "homeDoneTitle": "شفاف PNG ڈاؤن لوڈ ہو گیا",
        "homeDoneSub": "سفید پس منظر، سایہ یا مربع کینوس چاہیے؟ یہیں ترمیم کریں، یا اگلی تصویر ڈالیں۔"
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
    // 记下 dropzone 初始 class：打开编辑器会去掉虚线框 / hover 效果，重置时整体还原
    // （首页用 brand 色 hover、子页用灰色 hover，各页不同，不能写死）
    const DROPZONE_BASE_CLASS = dropzone ? dropzone.className : '';
    // ============================================================
    // 结果页编辑器（背景 / 阴影 / 画幅 / 导出）
    // ============================================================
    // 绘制引擎和界面在 /editor/presets.js、engine.js、panel.js（defer 加载，抠图成功后才用到）。
    // 这里只放「各页面的差异」：显示哪些画幅 / 导出尺寸 / 额外控件，以及打开时的初始状态。
    // 未列出的页面（如 jpg-to-transparent-png）用 home 配置。
    let editorSession = null; // 当前打开的编辑器：{ engine, panel, urls }
    let homeResult = null;    // 首页抠图结果（下载后点「编辑背景/阴影」再打开编辑器用）

    const EDITOR_PAGE_CONFIGS = {
        home: {
            titleKey: 'editorHomeTitle',
            subKey: 'editorHomeSub',
            ratios: ['original', '1:1', '4:5', '9:16'],
            exportSizes: ['auto', '1080', '2000'],
            allowBlur: true,
            allowImage: true,
            initial: { layout: { ratio: 'original', subjectScale: 0.9 } },
        },
        'product-photo': {
            titleKey: 'editorProductTitle',
            subKey: 'editorProductSub',
            ratios: ['1:1', '4:5', '9:16', 'original'],
            exportSizes: ['2000', '1080', 'auto'],
            allowImage: true,
            showAmazonPreset: true,
            // 电商默认：白底方图 + 轻柔落地阴影，长边 2000（满足亚马逊放大查看要求）
            initial: {
                background: { type: 'solid', color: '#FFFFFF' },
                layout: { ratio: '1:1', subjectScale: 0.8, exportSize: '2000' },
                shadowPreset: 'contact',
            },
        },
        portrait: {
            titleKey: 'editorPortraitTitle',
            subKey: 'editorPortraitSub',
            ratios: ['1:1', '3:4', '4:5', 'original'],
            exportSizes: ['1024', '512', 'auto'],
            showShape: true,
            allowBlur: true,
            // 头像默认：浅灰底圆形 1024；半身像会被引擎自动贴底（见 engine.js touchesBottom）
            initial: {
                background: { type: 'solid', color: '#F5F5F7' },
                layout: { ratio: '1:1', subjectScale: 0.85, shape: 'circle', exportSize: '1024' },
            },
        },
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
    function track(name) {
        if (typeof umami === 'undefined') return;
        try {
            umami.track(name);
        } catch (_) { /* analytics 失败不影响业务 */ }
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
        // （编辑器和首页「已下载」卡片打开时不重置；切语言本身会跳转到另一语种 URL）
        if (!dropzone.classList.contains('pointer-events-none') && !editorSession && !homeResult) {
            resetDropzone();
        }
    }

    function resetDropzone() {
        dropzone.className = DROPZONE_BASE_CLASS;
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
            track('lang-switched');
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
                track('profile-switched');
            });
        });
        updateProfileButtons();
    }

    // ============================================================
    // API 配置
    // ============================================================
    const _isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE = (window.MIAOCUT_PRO_CONFIG && window.MIAOCUT_PRO_CONFIG.FREE_API_BASE) || (_isLocal ? 'http://localhost:8000' : 'https://api2.miaocut.app');

    // ============================================================
    // Batch Process Pro fake door（同一个弹窗复用为 3 种场景，见 openWaitlistModal）
    // ============================================================
    // 暴露给抠图 429 处理调用：
    //   openWaitlistModal('rateDay')   今日额度用尽 → 引导升级 Pro
    //   openWaitlistModal('rateBurst') 手速太快、想批量/更快 → 引导升级 Pro（复用批量文案）
    let openWaitlistModal = null;
    function initBatchWaitlist() {
        const trigger = document.getElementById('batch-pro-trigger');
        if (!trigger) return;

        const modal = document.createElement('div');
        modal.id = 'batch-pro-modal';
        modal.className = 'fixed inset-0 z-50 hidden items-center justify-center px-4 py-6';
        modal.innerHTML = `
            <div data-batch-backdrop class="absolute inset-0 bg-gray-950/45 backdrop-blur-sm"></div>
            <div role="dialog" aria-modal="true" aria-labelledby="batch-modal-title" class="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 text-start shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                <button type="button" id="batch-modal-close" class="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:ring-zinc-100" aria-label="${t('batchModalClose')}">&times;</button>
                <div id="batch-modal-form-wrap">
                    <p class="mb-2 inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">${t('batchDoorBadge')}</p>
                    <h2 id="batch-modal-title" class="pr-10 text-xl font-bold text-gray-950 dark:text-zinc-50">${t('batchModalTitle')}</h2>
                    <p id="batch-modal-subtitle" class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-zinc-300">${t('batchModalBody')}</p>
                    <form id="batch-waitlist-form" class="mt-5" novalidate>
                        <label for="batch-waitlist-email" class="mb-1.5 block text-sm font-semibold text-gray-800 dark:text-zinc-100">${t('batchModalEmailLabel')}</label>
                        <input id="batch-waitlist-email" name="email" type="email" autocomplete="email" inputmode="email" required placeholder="${t('batchModalEmailPlaceholder')}" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/20">
                        <p id="batch-waitlist-error" class="mt-2 hidden text-sm text-red-600 dark:text-red-400"></p>
                        <div class="mt-4 flex flex-col gap-2 sm:flex-row">
                            <button id="batch-waitlist-submit" type="submit" class="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus:ring-zinc-100">${t('batchModalSubmit')}</button>
                            <button id="batch-modal-cancel" type="button" class="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 dark:focus:ring-zinc-100">${t('batchModalNoThanks')}</button>
                        </div>
                    </form>
                </div>
                <div id="batch-waitlist-thanks" class="hidden py-3">
                    <p id="batch-thanks-title" class="text-xl font-bold text-gray-950 dark:text-zinc-50">${t('batchModalThanksTitle')}</p>
                    <p id="batch-thanks-body" class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-zinc-300">${t('batchModalThanksBody')}</p>
                    <button type="button" id="batch-thanks-close" class="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus:ring-zinc-100">${t('batchModalClose')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const formWrap = modal.querySelector('#batch-modal-form-wrap');
        const form = modal.querySelector('#batch-waitlist-form');
        const emailInput = modal.querySelector('#batch-waitlist-email');
        const submitButton = modal.querySelector('#batch-waitlist-submit');
        const errorEl = modal.querySelector('#batch-waitlist-error');
        const thanksEl = modal.querySelector('#batch-waitlist-thanks');
        const closeButtons = [
            modal.querySelector('#batch-modal-close'),
            modal.querySelector('#batch-modal-cancel'),
            modal.querySelector('#batch-thanks-close'),
        ].filter(Boolean);
        let lastFocus = null;

        function setError(message) {
            errorEl.textContent = message || '';
            errorEl.classList.toggle('hidden', !message);
        }

        // 三种场景共用这个弹窗，靠 variant 切换文案与提交时的来源标记：
        //   'batch'     批量抠图 fake door（首页按钮）
        //   'rateDay'   今日额度用尽（每日额度文案）
        //   'rateBurst' 手速太快、想更快/批量（复用批量卖点文案，仅来源不同）
        let currentVariant = 'batch';
        const titleEl = modal.querySelector('#batch-modal-title');
        const subtitleEl = modal.querySelector('#batch-modal-subtitle');
        const thanksTitleEl = modal.querySelector('#batch-thanks-title');
        const thanksBodyEl = modal.querySelector('#batch-thanks-body');

        function applyVariantText(variant) {
            // rateDay 用专属"额度用尽"文案；batch / rateBurst 共用批量卖点文案
            const k = variant === 'rateDay'
                ? { title: 'rateDayModalTitle', body: 'rateDayModalBody', submit: 'rateDayModalSubmit', tT: 'rateDayModalThanksTitle', tB: 'rateDayModalThanksBody' }
                : { title: 'batchModalTitle', body: 'batchModalBody', submit: 'batchModalSubmit', tT: 'batchModalThanksTitle', tB: 'batchModalThanksBody' };
            titleEl.textContent = t(k.title);
            subtitleEl.textContent = t(k.body);
            submitButton.textContent = t(k.submit);
            thanksTitleEl.textContent = t(k.tT);
            thanksBodyEl.textContent = t(k.tB);
        }

        function openModal(variant) {
            currentVariant = ['rateDay', 'rateBurst'].includes(variant) ? variant : 'batch';
            applyVariantText(currentVariant);
            lastFocus = document.activeElement;
            formWrap.classList.remove('hidden');
            thanksEl.classList.add('hidden');
            form.reset();
            setError('');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.classList.add('overflow-hidden');
            track('waitlist-opened');
            setTimeout(() => emailInput.focus(), 0);
        }
        openWaitlistModal = openModal;  // 暴露给外部（抠图 429 调用）

        function closeModal() {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.classList.remove('overflow-hidden');
            if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        }

        function isValidEmail(value) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }

        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openModal('batch');
        });

        modal.querySelector('[data-batch-backdrop]').addEventListener('click', () => {
            track('batch-door-dismissed');
            closeModal();
        });

        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                track('batch-door-dismissed');
                closeModal();
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || modal.classList.contains('hidden')) return;
            track('batch-door-dismissed');
            closeModal();
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = emailInput.value.trim();
            if (!isValidEmail(email)) {
                setError(t('batchModalInvalidEmail'));
                emailInput.focus();
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = t('batchModalSending');
            setError('');

            try {
                const resp = await fetch(`${API_BASE}/api/feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: 'Pro waitlist signup',
                        email,
                        page: window.MIAOCUT_PAGE_KEY || 'unknown',
                        profile: currentProfile,
                        feature: currentVariant === 'rateDay' ? 'rate-limit-upgrade'
                            : currentVariant === 'rateBurst' ? 'rate-burst-upgrade'
                            : 'batch-process-pro',
                        intent: currentVariant === 'batch' ? 'waitlist' : 'pro_waitlist',
                        source_variant: currentVariant,
                        locale: currentLang,
                        path: window.location.pathname,
                        page_title: document.title,
                    }),
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                track('batch-waitlist-submitted');
                formWrap.classList.add('hidden');
                thanksEl.classList.remove('hidden');
                const doneButton = modal.querySelector('#batch-thanks-close');
                if (doneButton) doneButton.focus();
            } catch (error) {
                console.warn('[MiaoCut] Batch waitlist submit failed:', error);
                setError(t('batchModalError'));
                track('batch-waitlist-failed');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = t('batchModalSubmit');
            }
        });
    }

    initBatchWaitlist();

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
        if (editorSession) return;
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
            // 单图一律走免费网关（CPU），登录与否都一样、不扣积分。
            // 产品决策（2026-10）：积分只用于批量（/batch/）。早期版本里登录用户单图会走 Pro 网关
            // 的 GPU 并扣分，等于「登录反而失去免费额度」，会劝退注册，已取消。
            // Pro 网关的 /v1/remove-background 仍保留在服务端，以后若做「单图高清 GPU」可按需接回。
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
                    let data = null;
                    try {
                        const text = await xhr.response.text();
                        data = JSON.parse(text);
                        if (data && typeof data.detail === 'string') message = data.detail;
                        else message = text || message;
                    } catch (_) { /* 解析失败用兜底 message */ }
                    const err = new Error(message);
                    err.status = xhr.status;
                    // 后端 429 会带 scope（minute/day）+ retry_after，前端据此切两套文案
                    if (data) { err.scope = data.scope; err.retryAfter = data.retry_after; }
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

    // 手速太快（minute 限流）时的温和提示：强调"今天还有额度"，并给一个升级 Pro 的批量入口。
    // 与"每日额度用尽"区分开，避免让用户误以为额度被永久用光。
    function showRateBurstNotice(secs) {
        dropzoneContent.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-col items-center text-center px-4';
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('class', 'w-12 h-12 text-amber-500 mb-3');
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
        const title = document.createElement('p');
        title.className = 'text-lg font-medium text-gray-800 dark:text-zinc-100 mb-1';
        title.textContent = t('rateBurstTitle');
        const body = document.createElement('p');
        body.className = 'text-sm text-gray-500 dark:text-zinc-400 max-w-xs mb-3';
        body.textContent = t('rateBurstBody').replace('{s}', secs);
        const proBtn = document.createElement('button');
        proBtn.type = 'button';
        proBtn.className = 'inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200';
        proBtn.textContent = t('rateBurstProCta');
        proBtn.addEventListener('click', () => {
            if (typeof openWaitlistModal === 'function') openWaitlistModal('rateBurst');
        });
        wrap.append(icon, title, body, proBtn);
        dropzoneContent.append(wrap);
    }

    function getEditorConfig() {
        const page = window.MIAOCUT_PAGE_KEY || 'home';
        return EDITOR_PAGE_CONFIGS[page] || EDITOR_PAGE_CONFIGS.home;
    }

    function editorAvailable() {
        const ed = window.MiaoCutEditor;
        return !!(ed && ed.engine && ed.createPanel);
    }

    /** 关闭编辑器 / 清掉首页结果，释放所有 object URL 和 canvas 内存 */
    function cleanupResultState() {
        homeResult = null;
        if (!editorSession) return;
        editorSession.panel.destroy();
        editorSession.engine.dispose();
        editorSession.urls.forEach((url) => URL.revokeObjectURL(url));
        editorSession = null;
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

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        downloadUrl(url, filename);
        // revokeObjectURL 必须等浏览器开始下载；立刻 revoke 在部分浏览器上会得到 0 字节文件
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function autoDownloadTransparentResult(file, blob) {
        downloadBlob(blob, `${basenameFromFile(file)}_transparent.png`);
        // 不在这里报 transparent-download：首页抠图成功必然自动下载，和 cutout-success 一一对应，
        // 再报一次只会白白多消耗一条 Umami 额度。子页「下载透明图」按钮那里的上报保留。
    }

    /** 打开编辑器时 dropzone 不再是「点击上传」区域：去掉虚线框和 hover 效果 */
    function setDropzoneEditing() {
        dropzoneContent.classList.remove('pointer-events-none');
        dropzoneContent.classList.add('w-full');
        dropzone.classList.add('cursor-default', 'border-solid');
        // overflow-hidden 会让编辑器里预览图的 sticky 失效（sticky 相对最近的滚动容器），编辑时去掉；
        // 重置时 resetDropzone 会整体还原初始 class
        dropzone.classList.remove(
            'overflow-hidden',
            'cursor-pointer', 'border-dashed',
            'hover:border-gray-400', 'hover:bg-gray-50',
            'hover:border-brand-400', 'hover:bg-brand-50/40', 'dark:hover:bg-brand-500/10',
            'dark:hover:border-zinc-600', 'dark:hover:bg-zinc-800'
        );
    }

    /**
     * 首页：透明 PNG 已自动下载，dropzone 里显示「已下载」卡片，
     * 提供「编辑背景/阴影」入口；点卡片空白处或拖入新图仍然是上传下一张（不打断老用户的习惯）。
     */
    function showHomeDoneCard(originalFile, sourceFile, blob) {
        homeResult = { originalFile, sourceFile, blob };
        dropzoneContent.classList.remove('pointer-events-none');
        const editButton = editorAvailable() ? `
                <button type="button" data-home-action="edit" class="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">${t('editBgShadow')}</button>` : '';
        dropzoneContent.innerHTML = `
            <svg class="mb-4 h-12 w-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"></path>
            </svg>
            <p class="mb-1 text-lg font-semibold text-gray-900 dark:text-zinc-50">${t('homeDoneTitle')}</p>
            <p class="text-sm text-gray-500 dark:text-zinc-400">${t('homeDoneSub')}</p>
            <div class="mt-5 flex flex-wrap justify-center gap-2">
                ${editButton}
                <button type="button" data-home-action="another" class="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500">${t('startOver')}</button>
            </div>
        `;
        dropzoneContent.querySelectorAll('[data-home-action]').forEach((btn) => {
            btn.addEventListener('click', (event) => {
                // 阻止冒泡到 dropzone 的「点击上传」
                event.stopPropagation();
                if (btn.dataset.homeAction === 'edit') {
                    const result = homeResult;
                    if (!result) return;
                    track('editor-opened');
                    openEditor(result.originalFile, result.sourceFile, result.blob).catch((error) => {
                        console.error('[MiaoCut] 打开编辑器失败', error);
                    });
                } else {
                    fileInput.click();
                }
            });
        });
    }

    /**
     * 打开结果编辑器。编辑器脚本没加载到（网络失败 / 被插件拦截）时返回 false，
     * 调用方降级为直接下载透明 PNG，保证核心功能不受影响。
     */
    async function openEditor(originalFile, sourceFile, blob) {
        if (!editorAvailable()) return false;
        const Editor = window.MiaoCutEditor;
        cleanupResultState();

        const cutoutUrl = URL.createObjectURL(blob);
        const sourceUrl = URL.createObjectURL(sourceFile || originalFile);
        let cutoutImage;
        let sourceImage;
        try {
            [cutoutImage, sourceImage] = await Promise.all([
                loadImage(cutoutUrl),
                // 原图只用于「虚化原图」背景，加载失败不影响编辑器
                loadImage(sourceUrl).catch(() => null),
            ]);
        } catch (error) {
            URL.revokeObjectURL(cutoutUrl);
            URL.revokeObjectURL(sourceUrl);
            throw error;
        }

        const basename = basenameFromFile(originalFile);
        const engine = Editor.engine.createEngine({ cutout: cutoutImage, original: sourceImage, basename });
        setDropzoneEditing();
        const panel = Editor.createPanel({
            container: dropzoneContent,
            engine,
            config: getEditorConfig(),
            t,
            track,
            onDownload: downloadBlob,
            onDownloadTransparent: () => {
                downloadUrl(cutoutUrl, `${basename}_transparent.png`);
                track('transparent-download');
            },
            onStartOver: () => {
                cleanupResultState();
                resetDropzone();
                fileInput.click();
            },
        });
        editorSession = { engine, panel, urls: [cutoutUrl, sourceUrl] };
        return true;
    }

    async function handleFiles(files) {
        const file = files[0];

        if (!ALLOWED_TYPES.includes(file.type)) {
            track('format-rejected');
            alert(t('alertSize'));
            return;
        }

        console.log(`[MiaoCut] 原始图片: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        const page = (window.MIAOCUT_PAGE_KEY || 'home');
        track('upload-started');

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

            track('cutout-success');

            if (page === 'home') {
                // 首页保持「抠完直接下载」的零门槛体验，下载后再提供编辑入口
                autoDownloadTransparentResult(file, blob);
                showHomeDoneCard(file, uploadFile, blob);
            } else if (!(await openEditor(file, uploadFile, blob))) {
                // 编辑器脚本没加载到：降级为直接下载透明 PNG
                autoDownloadTransparentResult(file, blob);
                shouldResetDropzone = true;
            }
            showBookmarkBanner();

        } catch (error) {
            shouldResetDropzone = true;
            console.error("API Error:", error);
            // 限流 429 分两种，文案与引导完全不同（见后端 rate_limit_handler 的 scope）：
            if (error.status === 429) {
                if (error.scope === 'day') {
                    // 今日免费额度用尽（明天重置）→ 引导升级 Pro（弹预约弹窗）
                    track('cutout-rate-limited');
                    resetDropzone();
                    if (typeof openWaitlistModal === 'function') openWaitlistModal('rateDay');
                } else {
                    // 手速太快（minute）：当天还有额度，给温和提示 + 可选 Pro 批量入口。
                    // 保留提示（不让 finally 的延时 reset 把它清掉），用户读完可点 Pro 或重新拖图。
                    shouldResetDropzone = false;
                    track('cutout-rate-limited');
                    showRateBurstNotice(Math.max(1, Math.round(error.retryAfter || 30)));
                }
                return;
            }
            track('cutout-failed');
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
                    if (!editorSession && !homeResult) resetDropzone();
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
