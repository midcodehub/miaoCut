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
    "en": {
        "pageTitle": "Free Passport & ID Photo Maker Online | MiaoCut",
        "metaDescription": "Free AI passport, visa, and ID photo maker online. Country-specific size presets (China 1-inch/2-inch, US passport, Schengen visa, Japan visa). Choose background color, target KB, print layouts. No signup.",
        "metaKeywords": "id photo maker, passport photo maker, visa photo maker, one inch photo, two inch photo, ai id photo, china passport photo, us passport photo, schengen visa photo, japan visa photo, change photo background, printable id photo sheet",
        "ogTitle": "Free AI Passport & ID Photo Maker | MiaoCut",
        "ogDescription": "Country-specific ID photo presets: China 1-inch / 2-inch, US passport, Schengen visa, Japan visa. Free, no signup.",
        "ogLocale": "en_US",
        "navBg": "Background Remover",
        "navId": "ID Photo",
        "navRestore": "Old Photo",
        "navWatermark": "Watermark",
        "navPortrait": "Portrait",
        "navProduct": "Product",
        "eyebrow": "Passport photos · Visa photos · One-inch · Two-inch · Print layouts",
        "heroTitle": "AI Passport & ID Photo Maker",
        "heroSub": "Upload a portrait, pick a country-specific size preset, set the background color and target KB, and download standard, HD, or printable layout photos.",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "ID Photo Maker",
        "portraitLabel": "Portrait",
        "uploadText": "Click to upload JPG, PNG, or WebP",
        "uploadHint": "Front-facing portrait works best",
        "replaceHint": "Click the preview to replace this portrait",
        "sizeLabel": "Photo size",
        "widthLabel": "Width",
        "heightLabel": "Height",
        "bgLabel": "Background",
        "subjectLabel": "Subject",
        "topLabel": "Top margin",
        "kbLabel": "Target KB",
        "qualityLabel": "Quality",
        "alignLabel": "Face alignment",
        "paperLabel": "Print paper",
        "generateBtn": "Generate ID Photo",
        "standardTitle": "Standard",
        "hdTitle": "HD",
        "layoutTitle": "Layout",
        "downloadJpg": "Download JPG",
        "downloadPng": "Download PNG",
        "downloadLayout": "Download Layout",
        "standardEmpty": "Standard photo will appear here",
        "hdEmpty": "HD transparent photo will appear here",
        "layoutEmpty": "Printable layout will appear here",
        "seoTitle": "Make ID photos for documents, resumes, and online forms",
        "seoBody": "MiaoCut's ID photo maker helps you create passport photos, visa photos, one-inch photos, two-inch photos, resume photos, and printable photo sheets. Choose a preset size, adjust the portrait placement, switch background colors, and download both standard and high-resolution outputs.",
        "seoCard1": "Common sizes",
        "seoCard1Body": "One inch, two inch, passport, visa, resume, and custom pixel sizes.",
        "seoCard2": "Background colors",
        "seoCard2Body": "White, blue, red, gray, light blue, dark blue, pink, black, and custom HEX colors.",
        "seoCard3": "Print sheets",
        "seoCard3Body": "Generate 5-inch, 6-inch, 7-inch, or A4 printable layouts.",
        "uploadFirst": "Upload a portrait first.",
        "processing": "Removing background and framing...",
        "applying": "Applying background...",
        "layouting": "Creating print layout...",
        "ready": "Ready",
        "faqTitle": "Frequently Asked Questions",
        "faq1Q": "What ID photo sizes does MiaoCut support?",
        "faq1A": "China 1-inch (295×413), 2-inch (413×579), small/large 1-inch and 2-inch variants, China passport (390×567), US passport (600×600), Schengen visa (600×600), resume photo (480×640), social profile (512×512), plus any custom pixel size.",
        "faq2Q": "What background colors are supported?",
        "faq2A": "White, blue, red, gray, light blue, dark blue, pink, black, and any custom HEX color.",
        "faq3Q": "Can I print multiple ID photos on one sheet?",
        "faq3A": "Yes. Choose 5-inch, 6-inch, 7-inch, or A4 paper to generate a printable layout sheet with multiple copies arranged for cutting.",
        "faq4Q": "Will my photo meet official document requirements?",
        "faq4A": "MiaoCut produces correctly sized photos with neutral backgrounds, but always check your specific document or visa office's latest requirements (head size, expression, glasses rules, file format) before submitting.",
        "faq5Q": "Does MiaoCut detect my face automatically?",
        "faq5A": "Yes. MediaPipe Face Mesh detects your eye line and head position, then the photo is auto-cropped and aligned to fit the chosen size preset. You can fine-tune subject size and top margin with the sliders.",
        "faq6Q": "Is my photo private?",
        "faq6A": "Photos are processed in-memory on the server and discarded immediately after the result is returned. We don't store your image, don't use it for AI training, and there is no signup required.",
        "faq7Q": "Can I set a max file size in KB for online forms?",
        "faq7A": "Yes. The \"Target KB\" input lets you cap the output file size — useful for visa or job application forms with strict file size limits.",
        "howToTitle": "How to Make a Passport or ID Photo",
        "howStep1Title": "1. Upload your portrait",
        "howStep1Body": "Upload a front-facing portrait in JPG, PNG, or WebP. Even, neutral lighting works best.",
        "howStep2Title": "2. Pick size and background",
        "howStep2Body": "Choose a country preset (or enter custom dimensions), pick a background color, and adjust subject size or top margin if needed.",
        "howStep3Title": "3. Generate, fit KB, download",
        "howStep3Body": "MiaoCut auto-detects your face and produces a standard photo, an HD transparent version, and a printable layout. Set Target KB if your form requires a specific file size.",
        "countryTitle": "ID Photo Specs by Country & Document",
        "countrySubtitle": "Common document sizes and background rules. Always check your specific consulate, embassy, or office's latest requirements before submitting — rules change.",
        "cnOneInchTitle": "China 1-inch (一寸)",
        "cnOneInchBody": "295 × 413 px · White / blue / red background · For ID cards, school documents, simple application forms.",
        "cnTwoInchTitle": "China 2-inch (二寸)",
        "cnTwoInchBody": "413 × 579 px · White / blue / red background · For resumes, diplomas, employment forms, medical reports.",
        "cnPassportTitle": "China Passport (中国护照)",
        "cnPassportBody": "390 × 567 px · White background, neutral expression, no glasses recommended · For passport, visa applications submitted in China.",
        "usPassportTitle": "US Passport",
        "usPassportBody": "600 × 600 px (2 × 2 inch) · Plain white or off-white background · No glasses (since 2016), neutral expression, full face visible.",
        "schengenVisaTitle": "Schengen Visa (EU)",
        "schengenVisaBody": "413 × 531 px (35 × 45 mm) · Light gray or off-white background · 70-80% face coverage, neutral expression.",
        "japanVisaTitle": "Japan Visa",
        "japanVisaBody": "600 × 600 px (45 × 45 mm) · White or off-white background · Front-facing, no head covering, taken within 6 months.",
        "moreTitle": "More MiaoCut Tools",
        "moreLinkPortraitTitle": "Portrait Background Remover →",
        "moreLinkPortraitDesc": "Make clean LinkedIn or social profile pictures.",
        "moreLinkBgTitle": "AI Background Remover →",
        "moreLinkBgDesc": "One-click transparent PNG cutout for any photo.",
        "footerToolsTitle": "All MiaoCut Tools",
        "footerCatRemove": "AI Background Removal",
        "footerCatConvert": "Format Conversion",
        "footerCatRepair": "Photo Repair & Enhancement",
        "footerCatGuides": "Guides",
        "guideHubTitle": "How to Remove a Background",
        "guidePptTitle": "In PowerPoint",
        "guideGimpTitle": "In GIMP",
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
        "presetOneInch": "1 inch - 295 x 413 px",
        "presetSmallOneInch": "Small 1 inch - 260 x 378 px",
        "presetLargeOneInch": "Large 1 inch - 390 x 567 px",
        "presetTwoInch": "2 inch - 413 x 579 px",
        "presetSmallTwoInch": "Small 2 inch - 413 x 531 px",
        "presetChinaPassport": "China passport - 390 x 567 px",
        "presetUsPassport": "US passport - 600 x 600 px",
        "presetVisaSquare": "Visa square - 600 x 600 px",
        "presetResume": "Resume photo - 480 x 640 px",
        "presetProfileSquare": "Profile square - 512 x 512 px",
        "presetCustom": "Custom size",
        "optionalPlaceholder": "Optional",
        "qualityFast": "Fast",
        "qualityFineEdges": "Fine edges",
        "colorWhite": "White",
        "colorBlue": "Blue",
        "colorRed": "Red",
        "colorGray": "Gray",
        "colorLightBlue": "Light blue",
        "colorDarkBlue": "Dark blue",
        "colorPink": "Pink",
        "colorBlack": "Black",
        "paper6Inch": "6 inch - 1800 x 1200 px",
        "paper5Inch": "5 inch - 1500 x 1050 px",
        "paper7Inch": "7 inch - 2100 x 1500 px",
        "paperA4": "A4 - 2480 x 3508 px"
    },
    "zh": {
        "pageTitle": "免费护照照 / 签证照 / 一寸二寸证件照制作 | MiaoCut",
        "metaDescription": "免费在线制作证件照、护照照、签证照、一寸照、二寸照和打印排版照。可选尺寸、背景色、KB 大小，AI 自动抠图换底，无需注册。",
        "metaKeywords": "证件照制作,护照照片,签证照片,一寸照,二寸照,AI 证件照,在线证件照,换证件照背景,证件照排版打印",
        "ogTitle": "免费 AI 证件照制作工具 | MiaoCut",
        "ogDescription": "在线制作护照照、签证照、一寸二寸照和排版打印照，可选尺寸和背景色。",
        "ogLocale": "zh_CN",
        "navBg": "AI 抠图",
        "navId": "证件照",
        "navRestore": "老照片修复",
        "navWatermark": "去水印",
        "navPortrait": "人像",
        "navProduct": "商品图",
        "eyebrow": "护照照 · 签证照 · 一寸 · 二寸 · 排版打印",
        "heroTitle": "AI 护照 / 签证 / 证件照制作工具",
        "heroSub": "上传人像，选择各国证件照预设、背景颜色和文件 KB，一次生成标准照、高清照和排版打印照。",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "证件照制作",
        "portraitLabel": "人像照片",
        "uploadText": "点击上传 JPG、PNG 或 WebP",
        "uploadHint": "正面半身照效果最好",
        "replaceHint": "点击预览可替换照片",
        "sizeLabel": "证件照尺寸",
        "widthLabel": "宽度",
        "heightLabel": "高度",
        "bgLabel": "背景色",
        "subjectLabel": "主体大小",
        "topLabel": "顶部留白",
        "kbLabel": "目标 KB",
        "qualityLabel": "质量",
        "alignLabel": "人脸对齐",
        "paperLabel": "打印相纸",
        "generateBtn": "生成证件照",
        "standardTitle": "标准照",
        "hdTitle": "高清照",
        "layoutTitle": "排版照",
        "downloadJpg": "下载 JPG",
        "downloadPng": "下载 PNG",
        "downloadLayout": "下载排版照",
        "standardEmpty": "标准照会显示在这里",
        "hdEmpty": "高清透明底照片会显示在这里",
        "layoutEmpty": "可打印排版照会显示在这里",
        "seoTitle": "制作证件、简历和线上表单所需的证件照",
        "seoBody": "MiaoCut 证件照工具支持护照照、签证照、一寸照、二寸照、简历照和打印排版照。你可以选择预设尺寸，调整人物位置，切换背景颜色，并下载标准照与高清照。",
        "seoCard1": "常用尺寸",
        "seoCard1Body": "一寸、二寸、护照、签证、简历、自定义像素尺寸。",
        "seoCard2": "背景颜色",
        "seoCard2Body": "白、蓝、红、灰、浅蓝、深蓝、粉、黑，也支持自定义 HEX。",
        "seoCard3": "打印排版",
        "seoCard3Body": "支持 5 寸、6 寸、7 寸和 A4 排版照。",
        "uploadFirst": "请先上传人像照片。",
        "processing": "正在抠图并生成证件照...",
        "applying": "正在合成背景...",
        "layouting": "正在生成排版照...",
        "ready": "已完成",
        "faqTitle": "常见问题",
        "faq1Q": "MiaoCut 支持哪些证件照尺寸？",
        "faq1A": "一寸（295×413）、二寸（413×579）、小一寸、大一寸、小二寸、中国护照（390×567）、美国护照（600×600）、申根签证（600×600）、简历照（480×640）、社交头像（512×512），以及任意自定义像素尺寸。",
        "faq2Q": "支持哪些背景颜色？",
        "faq2A": "白、蓝、红、灰、浅蓝、深蓝、粉、黑，也支持自定义任意 HEX 颜色。",
        "faq3Q": "可以把多张证件照排在一张相纸上打印吗？",
        "faq3A": "可以。选择 5 寸、6 寸、7 寸或 A4 相纸即可生成包含多张证件照的可打印排版照，方便冲印后裁切。",
        "faq4Q": "生成的照片符合官方证件要求吗？",
        "faq4A": "MiaoCut 生成尺寸准确、背景纯净的证件照，但提交前请务必核对你具体证件或签证机构的最新要求（头部比例、表情、眼镜规定、文件格式）。",
        "faq5Q": "MiaoCut 会自动识别人脸吗？",
        "faq5A": "会。MediaPipe Face Mesh 自动识别双眼连线和头部位置，并按选定尺寸预设自动裁切对齐。你也可以用滑杆微调主体大小和顶部留白。",
        "faq6Q": "我的照片安全吗？",
        "faq6A": "照片在服务器内存里处理，结果返回后立即销毁。我们绝不存储你的图片、绝不用于 AI 训练，也无需注册账号。",
        "faq7Q": "可以设置文件大小（KB）以满足线上表单要求吗？",
        "faq7A": "可以。\"目标 KB\" 输入框允许你限制输出文件大小 —— 对于有严格文件大小限制的签证或求职申请表单非常实用。",
        "howToTitle": "如何制作护照照或证件照",
        "howStep1Title": "1. 上传你的人像",
        "howStep1Body": "上传 JPG / PNG / WebP 正面人像，光线均匀、表情自然效果最好。",
        "howStep2Title": "2. 选择尺寸和背景",
        "howStep2Body": "从国家预设里选（或自定义像素尺寸），挑选背景色，必要时微调主体大小和顶部留白。",
        "howStep3Title": "3. 生成、控制 KB、下载",
        "howStep3Body": "MiaoCut 自动识别人脸，生成标准照、HD 透明底版本和打印排版照。需要严格文件大小时设置\"目标 KB\"。",
        "countryTitle": "各国证件照规格速查",
        "countrySubtitle": "常见证件尺寸与背景规则。提交前务必核对你具体证件、签证或办公室的最新要求 —— 规则可能更新。",
        "cnOneInchTitle": "中国一寸",
        "cnOneInchBody": "295 × 413 px · 白 / 蓝 / 红底 · 适合身份证、学生证、普通申请表。",
        "cnTwoInchTitle": "中国二寸",
        "cnTwoInchBody": "413 × 579 px · 白 / 蓝 / 红底 · 适合简历、毕业证、入职表、体检表。",
        "cnPassportTitle": "中国护照",
        "cnPassportBody": "390 × 567 px · 白底，表情自然，建议不戴眼镜 · 适合在国内办理护照、签证申请。",
        "usPassportTitle": "美国护照",
        "usPassportBody": "600 × 600 px（2 × 2 英寸）· 纯白或米白背景 · 不戴眼镜（2016 年后规定），表情自然，露出整张脸。",
        "schengenVisaTitle": "申根签证（欧盟）",
        "schengenVisaBody": "413 × 531 px（35 × 45 mm）· 浅灰或米白背景 · 面部占 70~80%，表情自然。",
        "japanVisaTitle": "日本签证",
        "japanVisaBody": "600 × 600 px（45 × 45 mm）· 白色或米白背景 · 正面，无头饰，6 个月内拍摄。",
        "moreTitle": "更多 MiaoCut 工具",
        "moreLinkPortraitTitle": "人像抠图 →",
        "moreLinkPortraitDesc": "制作干净的 LinkedIn 或社交头像。",
        "moreLinkBgTitle": "AI 抠图 →",
        "moreLinkBgDesc": "一键生成透明 PNG 抠图。",
        "footerToolsTitle": "全部 MiaoCut 工具",
        "footerCatRemove": "AI 抠图",
        "footerCatConvert": "格式转换",
        "footerCatRepair": "照片修复与增强",
        "footerCatGuides": "使用教程",
        "guideHubTitle": "如何去除背景",
        "guidePptTitle": "在 PowerPoint 中去背景",
        "guideGimpTitle": "在 GIMP 中去背景",
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
        "presetOneInch": "一寸 - 295 x 413 px",
        "presetSmallOneInch": "小一寸 - 260 x 378 px",
        "presetLargeOneInch": "大一寸 - 390 x 567 px",
        "presetTwoInch": "二寸 - 413 x 579 px",
        "presetSmallTwoInch": "小二寸 - 413 x 531 px",
        "presetChinaPassport": "中国护照 - 390 x 567 px",
        "presetUsPassport": "美国护照 - 600 x 600 px",
        "presetVisaSquare": "签证方图 - 600 x 600 px",
        "presetResume": "简历照片 - 480 x 640 px",
        "presetProfileSquare": "头像方图 - 512 x 512 px",
        "presetCustom": "自定义尺寸",
        "optionalPlaceholder": "选填",
        "qualityFast": "快速",
        "qualityFineEdges": "精细边缘",
        "colorWhite": "白色",
        "colorBlue": "蓝色",
        "colorRed": "红色",
        "colorGray": "灰色",
        "colorLightBlue": "浅蓝色",
        "colorDarkBlue": "深蓝色",
        "colorPink": "粉色",
        "colorBlack": "黑色",
        "paper6Inch": "6 寸 - 1800 x 1200 px",
        "paper5Inch": "5 寸 - 1500 x 1050 px",
        "paper7Inch": "7 寸 - 2100 x 1500 px",
        "paperA4": "A4 - 2480 x 3508 px"
    },
    "hi": {
        "pageTitle": "मुफ़्त पासपोर्ट और ID फोटो निर्माता ऑनलाइन | MiaoCut",
        "metaDescription": "मुफ़्त AI पासपोर्ट, वीज़ा और ID फोटो निर्माता ऑनलाइन। देश-विशिष्ट आकार प्रीसेट (चीन 1-इंच/2-इंच, अमेरिकी पासपोर्ट, शेंगेन वीज़ा, जापान वीज़ा)। पृष्ठभूमि रंग चुनें, लक्ष्य KB, प्रिंट लेआउट। कोई साइनअप नहीं.",
        "metaKeywords": "आईडी फोटो निर्माता, पासपोर्ट फोटो निर्माता, वीजा फोटो निर्माता, एक इंच फोटो, दो इंच फोटो, एआई आईडी फोटो, चीन पासपोर्ट फोटो, यूएस पासपोर्ट फोटो, शेंगेन वीजा फोटो, जापान वीजा फोटो, फोटो पृष्ठभूमि बदलें, प्रिंट करने योग्य आईडी फोटो शीट",
        "ogTitle": "निःशुल्क AI पासपोर्ट और ID फोटो निर्माता | MiaoCut",
        "ogDescription": "देश-विशिष्ट ID फोटो प्रीसेट: चीन 1-इंच / 2-इंच, अमेरिकी पासपोर्ट, शेंगेन वीजा, जापान वीजा। मुफ़्त, कोई साइनअप नहीं.",
        "ogLocale": "hi_IN",
        "navBg": "पृष्ठभूमि हटानेवाला",
        "navId": "ID फोटो",
        "navRestore": "पुरानी फोटो",
        "navWatermark": "वाटर-मार्क",
        "navPortrait": "चित्र",
        "navProduct": "उत्पाद",
        "eyebrow": "पासपोर्ट फ़ोटो · वीज़ा फ़ोटो · एक इंच · दो इंच · प्रिंट लेआउट",
        "heroTitle": "AI पासपोर्ट और ID फोटो निर्माता",
        "heroSub": "एक पोर्ट्रेट अपलोड करें, एक देश-विशिष्ट आकार प्रीसेट चुनें, पृष्ठभूमि का रंग और लक्ष्य KB सेट करें, और मानक, HD, या प्रिंट करने योग्य लेआउट फ़ोटो डाउनलोड करें।",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "ID फोटो निर्माता",
        "portraitLabel": "चित्र",
        "uploadText": "JPG, PNG, या WebP अपलोड करने के लिए क्लिक करें",
        "uploadHint": "सामने की ओर वाला चित्र सबसे अच्छा काम करता है",
        "replaceHint": "इस पोर्ट्रेट को बदलने के लिए पूर्वावलोकन पर क्लिक करें",
        "sizeLabel": "फोटो का आकार",
        "widthLabel": "चौड़ाई",
        "heightLabel": "ऊंचाई",
        "bgLabel": "पृष्ठभूमि",
        "subjectLabel": "विषय",
        "topLabel": "शीर्ष मार्जिन",
        "kbLabel": "लक्ष्य KB",
        "qualityLabel": "गुणवत्ता",
        "alignLabel": "चेहरा संरेखण",
        "paperLabel": "कागज छापो",
        "generateBtn": "ID फोटो जेनरेट करें",
        "standardTitle": "मानक",
        "hdTitle": "HD",
        "layoutTitle": "लेआउट",
        "downloadJpg": "JPG डाउनलोड करें",
        "downloadPng": "PNG डाउनलोड करें",
        "downloadLayout": "लेआउट डाउनलोड करें",
        "standardEmpty": "मानक फ़ोटो यहां दिखाई देगी",
        "hdEmpty": "यहां HD पारदर्शी फोटो दिखाई देगी",
        "layoutEmpty": "प्रिंट करने योग्य लेआउट यहां दिखाई देगा",
        "seoTitle": "दस्तावेज़ों, बायोडाटा और ऑनलाइन फ़ॉर्म के लिए ID फ़ोटो बनाएं",
        "seoBody": "MiaoCut का ID फोटो निर्माता आपको पासपोर्ट फोटो, वीजा फोटो, एक इंच फोटो, दो इंच फोटो, रिज्यूम फोटो और प्रिंट करने योग्य फोटो शीट बनाने में मदद करता है। एक पूर्व निर्धारित आकार चुनें, पोर्ट्रेट प्लेसमेंट समायोजित करें, पृष्ठभूमि रंग बदलें और मानक और उच्च-रिज़ॉल्यूशन आउटपुट दोनों डाउनलोड करें।",
        "seoCard1": "सामान्य आकार",
        "seoCard1Body": "एक इंच, दो इंच, पासपोर्ट, वीज़ा, बायोडाटा और कस्टम पिक्सेल आकार।",
        "seoCard2": "पृष्ठभूमि रंग",
        "seoCard2Body": "सफेद, नीला, लाल, ग्रे, हल्का नीला, गहरा नीला, गुलाबी, काला और कस्टम हेक्स रंग।",
        "seoCard3": "शीट प्रिंट करें",
        "seoCard3Body": "5-इंच, 6-इंच, 7-इंच, या A4 प्रिंट करने योग्य लेआउट जेनरेट करें।",
        "uploadFirst": "पहले एक पोर्ट्रेट अपलोड करें.",
        "processing": "पृष्ठभूमि और फ़्रेमिंग हटाई जा रही है...",
        "applying": "पृष्ठभूमि लागू की जा रही है...",
        "layouting": "प्रिंट लेआउट बनाया जा रहा है...",
        "ready": "तैयार",
        "faqTitle": "अक्सर पूछे जाने वाले प्रश्नों",
        "faq1Q": "MiaoCut किस ID फोटो आकार का समर्थन करता है?",
        "faq1A": "चीन 1-इंच (295×413), 2-इंच (413×579), छोटे/बड़े 1-इंच और 2-इंच वेरिएंट, चीन पासपोर्ट (390×567), अमेरिकी पासपोर्ट (600×600), शेंगेन वीजा (600×600), बायोडाटा फोटो (480×640), सामाजिक प्रोफ़ाइल (512×512), प्लस कोई भी कस्टम पिक्सेल आकार।",
        "faq2Q": "कौन से पृष्ठभूमि रंग समर्थित हैं?",
        "faq2A": "सफेद, नीला, लाल, ग्रे, हल्का नीला, गहरा नीला, गुलाबी, काला और कोई भी कस्टम हेक्स रंग।",
        "faq3Q": "क्या मैं एक शीट पर एकाधिक ID फ़ोटो प्रिंट कर सकता हूँ?",
        "faq3A": "हाँ। काटने के लिए व्यवस्थित कई प्रतियों के साथ एक मुद्रण योग्य लेआउट शीट तैयार करने के लिए 5-इंच, 6-इंच, 7-इंच या A4 पेपर चुनें।",
        "faq4Q": "क्या मेरी तस्वीर आधिकारिक दस्तावेज़ आवश्यकताओं को पूरा करेगी?",
        "faq4A": "MiaoCut तटस्थ पृष्ठभूमि के साथ सही आकार की तस्वीरें बनाता है, लेकिन सबमिट करने से पहले हमेशा अपने विशिष्ट दस्तावेज़ या वीज़ा कार्यालय की नवीनतम आवश्यकताओं (सिर का आकार, अभिव्यक्ति, चश्मे के नियम, फ़ाइल प्रारूप) की जांच करें।",
        "faq5Q": "क्या MiaoCut स्वचालित रूप से मेरे चेहरे का पता लगाता है?",
        "faq5A": "हाँ। MediaPipe Face Mesh आपकी आंख की रेखा और सिर की स्थिति का पता लगाता है, फिर फोटो को ऑटो-क्रॉप किया जाता है और चुने गए आकार प्रीसेट में फिट करने के लिए संरेखित किया जाता है। आप स्लाइडर्स के साथ विषय आकार और शीर्ष मार्जिन को ठीक कर सकते हैं।",
        "faq6Q": "क्या मेरी फ़ोटो निजी है?",
        "faq6A": "फ़ोटो को सर्वर पर मेमोरी में संसाधित किया जाता है और परिणाम आने के तुरंत बाद हटा दिया जाता है। हम आपकी छवि संग्रहीत नहीं करते हैं, इसे AI प्रशिक्षण के लिए उपयोग नहीं करते हैं, और किसी साइनअप की आवश्यकता नहीं है।",
        "faq7Q": "क्या मैं ऑनलाइन फॉर्म के लिए KB में अधिकतम फ़ाइल आकार निर्धारित कर सकता हूँ?",
        "faq7A": "हाँ। \"लक्ष्य KB\" इनपुट आपको आउटपुट फ़ाइल आकार को कैप करने देता है - सख्त फ़ाइल आकार सीमाओं के साथ वीज़ा या नौकरी आवेदन फॉर्म के लिए उपयोगी।",
        "howToTitle": "पासपोर्ट या ID फोटो कैसे बनायें",
        "howStep1Title": "1. अपना चित्र अपलोड करें",
        "howStep1Body": "JPG, PNG, या WebP में सामने की ओर वाला पोर्ट्रेट अपलोड करें। सम, तटस्थ प्रकाश सबसे अच्छा काम करता है।",
        "howStep2Title": "2. आकार और पृष्ठभूमि चुनें",
        "howStep2Body": "एक देश पूर्व निर्धारित चुनें (या कस्टम आयाम दर्ज करें), एक पृष्ठभूमि रंग चुनें, और यदि आवश्यक हो तो विषय आकार या शीर्ष मार्जिन समायोजित करें।",
        "howStep3Title": "3. जनरेट करें, KB फिट करें, डाउनलोड करें",
        "howStep3Body": "MiaoCut आपके चेहरे का स्वतः पता लगाता है और एक मानक फोटो, एक HD पारदर्शी संस्करण और एक प्रिंट करने योग्य लेआउट तैयार करता है। यदि आपके फॉर्म को एक विशिष्ट फ़ाइल आकार की आवश्यकता है तो लक्ष्य KB सेट करें।",
        "countryTitle": "देश और दस्तावेज़ के अनुसार ID फोटो विशिष्टताएँ",
        "countrySubtitle": "सामान्य दस्तावेज़ आकार और पृष्ठभूमि नियम। सबमिट करने से पहले हमेशा अपने विशिष्ट वाणिज्य दूतावास, दूतावास या कार्यालय की नवीनतम आवश्यकताओं की जांच करें - नियम बदलते हैं।",
        "cnOneInchTitle": "चीन 1 इंच (一寸)",
        "cnOneInchBody": "295 × 413 px · सफेद / नीला / लाल पृष्ठभूमि · ID कार्ड, स्कूल दस्तावेज़, सरल आवेदन पत्र के लिए।",
        "cnTwoInchTitle": "चीन 2-इंच (二寸)",
        "cnTwoInchBody": "413 × 579 पीएक्स · सफेद / नीला / लाल पृष्ठभूमि · बायोडाटा, डिप्लोमा, रोजगार फॉर्म, मेडिकल रिपोर्ट के लिए।",
        "cnPassportTitle": "चीन पासपोर्ट (中国护照)",
        "cnPassportBody": "390 × 567 पीएक्स · सफेद पृष्ठभूमि, तटस्थ अभिव्यक्ति, कोई चश्मा अनुशंसित नहीं · पासपोर्ट के लिए, चीन में वीज़ा आवेदन प्रस्तुत किए गए।",
        "usPassportTitle": "अमेरिकी पासपोर्ट",
        "usPassportBody": "600 × 600 पिक्सल (2 × 2 इंच) · सादा सफेद या ऑफ-व्हाइट पृष्ठभूमि · कोई चश्मा नहीं (2016 से), तटस्थ अभिव्यक्ति, पूरा चेहरा दिखाई दे रहा है।",
        "schengenVisaTitle": "शेंगेन वीज़ा (ईयू)",
        "schengenVisaBody": "413 × 531 पिक्सल (35 × 45 मिमी) · हल्के भूरे या ऑफ-व्हाइट पृष्ठभूमि · 70-80% चेहरा कवरेज, तटस्थ अभिव्यक्ति।",
        "japanVisaTitle": "जापान वीज़ा",
        "japanVisaBody": "600 × 600 पीएक्स (45 × 45 मिमी) · सफेद या मटमैले सफेद पृष्ठभूमि · सामने की ओर, कोई सिर नहीं ढका हुआ, 6 महीने के भीतर लिया गया।",
        "moreTitle": "अधिक MiaoCut उपकरण",
        "moreLinkPortraitTitle": "पोर्ट्रेट बैकग्राउंड रिमूवर →",
        "moreLinkPortraitDesc": "स्वच्छ लिंक्डइन या सामाजिक प्रोफ़ाइल चित्र बनाएं।",
        "moreLinkBgTitle": "AI बैकग्राउंड रिमूवर →",
        "moreLinkBgDesc": "किसी भी फोटो के लिए एक-क्लिक पारदर्शी PNG कटआउट।",
        "footerToolsTitle": "सभी MiaoCut उपकरण",
        "footerCatRemove": "AI पृष्ठभूमि हटाना",
        "footerCatConvert": "प्रारूप रूपांतरण",
        "footerCatRepair": "फोटो मरम्मत एवं संवर्द्धन",
        "footerCatGuides": "गाइड",
        "guideHubTitle": "बैकग्राउंड कैसे हटाएं",
        "guidePptTitle": "PowerPoint में",
        "guideGimpTitle": "जीआईएमपी में",
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
        "presetOneInch": "1 इंच - 295 x 413 px",
        "presetSmallOneInch": "छोटा 1 इंच - 260 x 378 px",
        "presetLargeOneInch": "बड़ा 1 इंच - 390 x 567 px",
        "presetTwoInch": "2 इंच - 413 x 579 px",
        "presetSmallTwoInch": "छोटा 2 इंच - 413 x 531 px",
        "presetChinaPassport": "चीन पासपोर्ट - 390 x 567 px",
        "presetUsPassport": "अमेरिकी पासपोर्ट - 600 x 600 px",
        "presetVisaSquare": "वीज़ा वर्ग - 600 x 600 px",
        "presetResume": "रिज्यूमे फोटो - 480 x 640 px",
        "presetProfileSquare": "प्रोफ़ाइल वर्ग - 512 x 512 px",
        "presetCustom": "कस्टम आकार",
        "optionalPlaceholder": "वैकल्पिक",
        "qualityFast": "तेज़",
        "qualityFineEdges": "सूक्ष्म किनारे",
        "colorWhite": "सफेद",
        "colorBlue": "नीला",
        "colorRed": "लाल",
        "colorGray": "धूसर",
        "colorLightBlue": "हल्का नीला",
        "colorDarkBlue": "गहरा नीला",
        "colorPink": "गुलाबी",
        "colorBlack": "काला",
        "paper6Inch": "6 इंच - 1800 x 1200 px",
        "paper5Inch": "5 इंच - 1500 x 1050 px",
        "paper7Inch": "7 इंच - 2100 x 1500 px",
        "paperA4": "A4 - 2480 x 3508 px"
    },
    "id": {
        "pageTitle": "Paspor Gratis & Pembuat Foto ID Online | MiaoCut",
        "metaDescription": "Gratis paspor AI, visa, dan pembuat foto ID online. Preset ukuran khusus negara (Tiongkok 1 inci/2 inci, paspor AS, visa Schengen, visa Jepang). Pilih warna latar belakang, target KB, tata letak cetak. Tidak ada pendaftaran.",
        "metaKeywords": "pembuat foto id, pembuat foto paspor, pembuat foto visa, foto satu inci, foto dua inci, foto id ai, foto paspor cina, foto paspor AS, foto visa schengen, foto visa jepang, ubah latar belakang foto, lembar foto id yang dapat dicetak",
        "ogTitle": "Paspor AI Gratis & Pembuat Foto ID | MiaoCut",
        "ogDescription": "Preset foto ID khusus negara: Tiongkok 1 inci / 2 inci, paspor AS, visa Schengen, visa Jepang. Gratis, tidak perlu mendaftar.",
        "ogLocale": "id_ID",
        "navBg": "Penghapus Latar Belakang",
        "navId": "Foto ID",
        "navRestore": "Foto lama",
        "navWatermark": "Tanda air",
        "navPortrait": "Potret",
        "navProduct": "Produk",
        "eyebrow": "Foto paspor · Foto visa · Satu inci · Dua inci · Tata letak cetak",
        "heroTitle": "Paspor AI & Pembuat Foto ID",
        "heroSub": "Unggah potret, pilih prasetel ukuran spesifik negara, atur warna latar belakang dan target KB, lalu unduh foto standar, HD, atau foto tata letak yang dapat dicetak.",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "Pembuat Foto ID",
        "portraitLabel": "Potret",
        "uploadText": "Klik untuk mengunggah JPG, PNG, atau WebP",
        "uploadHint": "Potret menghadap ke depan berfungsi paling baik",
        "replaceHint": "Klik pratinjau untuk mengganti potret ini",
        "sizeLabel": "Ukuran foto",
        "widthLabel": "Lebar",
        "heightLabel": "Tinggi",
        "bgLabel": "Latar belakang",
        "subjectLabel": "Subjek",
        "topLabel": "Margin atas",
        "kbLabel": "Targetkan KB",
        "qualityLabel": "Kualitas",
        "alignLabel": "Penjajaran wajah",
        "paperLabel": "Kertas cetak",
        "generateBtn": "Hasilkan Foto ID",
        "standardTitle": "Standar",
        "hdTitle": "HD",
        "layoutTitle": "Tata Letak",
        "downloadJpg": "Unduh JPG",
        "downloadPng": "Unduh PNG",
        "downloadLayout": "Unduh Tata Letak",
        "standardEmpty": "Foto standar akan muncul di sini",
        "hdEmpty": "Foto transparan HD akan muncul di sini",
        "layoutEmpty": "Tata letak yang dapat dicetak akan muncul di sini",
        "seoTitle": "Buat foto ID untuk dokumen, resume, dan formulir online",
        "seoBody": "Pembuat foto MiaoCut ID membantu Anda membuat foto paspor, foto visa, foto satu inci, foto dua inci, foto resume, dan lembar foto yang dapat dicetak. Pilih ukuran preset, sesuaikan penempatan potret, ganti warna latar belakang, dan unduh output standar dan resolusi tinggi.",
        "seoCard1": "Ukuran umum",
        "seoCard1Body": "Satu inci, dua inci, paspor, visa, resume, dan ukuran piksel khusus.",
        "seoCard2": "Warna latar belakang",
        "seoCard2Body": "Putih, biru, merah, abu-abu, biru muda, biru tua, pink, hitam, dan warna HEX khusus.",
        "seoCard3": "Cetak lembaran",
        "seoCard3Body": "Hasilkan tata letak 5 inci, 6 inci, 7 inci, atau A4 yang dapat dicetak.",
        "uploadFirst": "Unggah potret terlebih dahulu.",
        "processing": "Menghapus latar belakang dan bingkai...",
        "applying": "Menerapkan latar belakang...",
        "layouting": "Membuat tata letak pencetakan...",
        "ready": "Siap",
        "faqTitle": "Pertanyaan yang Sering Diajukan",
        "faq1Q": "Berapa ukuran foto ID yang didukung MiaoCut?",
        "faq1A": "China 1 inci (295×413), 2 inci (413×579), varian kecil/besar 1 inci dan 2 inci, paspor Tiongkok (390×567), paspor AS (600×600), visa Schengen (600×600), foto resume (480×640), profil sosial (512×512), ditambah ukuran piksel khusus apa pun.",
        "faq2Q": "Warna latar belakang apa yang didukung?",
        "faq2A": "Putih, biru, merah, abu-abu, biru muda, biru tua, merah muda, hitam, dan warna HEX khusus apa pun.",
        "faq3Q": "Bisakah saya mencetak beberapa foto ID dalam satu lembar?",
        "faq3A": "Ya. Pilih kertas 5 inci, 6 inci, 7 inci, atau A4 untuk menghasilkan lembar tata letak yang dapat dicetak dengan banyak salinan yang disusun untuk dipotong.",
        "faq4Q": "Apakah foto saya akan memenuhi persyaratan dokumen resmi?",
        "faq4A": "MiaoCut menghasilkan foto berukuran tepat dengan latar belakang netral, namun selalu periksa dokumen spesifik Anda atau persyaratan terbaru kantor visa (ukuran kepala, ekspresi, aturan kacamata, format file) sebelum mengirimkannya.",
        "faq5Q": "Apakah MiaoCut mendeteksi wajah saya secara otomatis?",
        "faq5A": "Ya. MediaPipe Face Mesh mendeteksi garis mata dan posisi kepala Anda, lalu foto dipotong secara otomatis dan disejajarkan agar sesuai dengan ukuran preset yang dipilih. Anda dapat menyempurnakan ukuran subjek dan margin atas dengan penggeser.",
        "faq6Q": "Apakah foto saya pribadi?",
        "faq6A": "Foto diproses dalam memori di server dan segera dibuang setelah hasilnya dikembalikan. Kami tidak menyimpan gambar Anda, tidak menggunakannya untuk pelatihan AI, dan tidak perlu mendaftar.",
        "faq7Q": "Bisakah saya mengatur ukuran file maksimal di KB untuk formulir online?",
        "faq7A": "Ya. Masukan \"Target KB\" memungkinkan Anda membatasi ukuran file keluaran — berguna untuk formulir lamaran visa atau pekerjaan dengan batasan ukuran file yang ketat.",
        "howToTitle": "Cara Membuat Foto Paspor atau ID",
        "howStep1Title": "1. Unggah potret Anda",
        "howStep1Body": "Unggah potret menghadap ke depan dalam format JPG, PNG, atau WebP. Bahkan pencahayaan netral bekerja paling baik.",
        "howStep2Title": "2. Pilih ukuran dan latar belakang",
        "howStep2Body": "Pilih preset negara (atau masukkan dimensi khusus), pilih warna latar belakang, dan sesuaikan ukuran subjek atau margin atas jika diperlukan.",
        "howStep3Title": "3. Hasilkan, sesuaikan KB, unduh",
        "howStep3Body": "MiaoCut mendeteksi wajah Anda secara otomatis dan menghasilkan foto standar, versi transparan HD, dan tata letak yang dapat dicetak. Tetapkan Target KB jika formulir Anda memerlukan ukuran file tertentu.",
        "countryTitle": "Spesifikasi Foto ID berdasarkan Negara & Dokumen",
        "countrySubtitle": "Ukuran dokumen umum dan aturan latar belakang. Selalu periksa persyaratan terbaru konsulat, kedutaan, atau kantor Anda sebelum mengirimkan — peraturan berubah.",
        "cnOneInchTitle": "Cina 1 inci (一寸)",
        "cnOneInchBody": "295 × 413 px · Latar belakang putih / biru / merah · Untuk kartu ID, dokumen sekolah, formulir aplikasi sederhana.",
        "cnTwoInchTitle": "Cina 2 inci (二寸)",
        "cnTwoInchBody": "413 × 579 px · Latar belakang putih / biru / merah · Untuk resume, diploma, formulir pekerjaan, laporan medis.",
        "cnPassportTitle": "Paspor Tiongkok (中国护照)",
        "cnPassportBody": "390 × 567 piksel · Latar belakang putih, ekspresi netral, tidak disarankan memakai kacamata · Untuk paspor, permohonan visa diajukan di Tiongkok.",
        "usPassportTitle": "Paspor AS",
        "usPassportBody": "600 × 600 px (2 × 2 inci) · Latar belakang putih polos atau putih pucat · Tanpa kacamata (sejak 2016), ekspresi netral, wajah penuh terlihat.",
        "schengenVisaTitle": "Visa Schengen (UE)",
        "schengenVisaBody": "413 × 531 piksel (35 × 45 mm) · Latar belakang abu-abu muda atau putih pucat · Cakupan wajah 70-80%, ekspresi netral.",
        "japanVisaTitle": "Visa Jepang",
        "japanVisaBody": "600 × 600 px (45 × 45 mm) · Latar belakang putih atau putih pucat · Menghadap ke depan, tanpa penutup kepala, diambil dalam waktu 6 bulan.",
        "moreTitle": "Alat MiaoCut Lainnya",
        "moreLinkPortraitTitle": "Penghapus Latar Belakang Potret →",
        "moreLinkPortraitDesc": "Buat gambar LinkedIn atau profil sosial yang bersih.",
        "moreLinkBgTitle": "Penghapus Latar Belakang AI →",
        "moreLinkBgDesc": "Potongan PNG transparan sekali klik untuk foto apa pun.",
        "footerToolsTitle": "Semua Alat MiaoCut",
        "footerCatRemove": "Penghapusan Latar Belakang AI",
        "footerCatConvert": "Konversi Format",
        "footerCatRepair": "Perbaikan & Peningkatan Foto",
        "footerCatGuides": "Panduan",
        "guideHubTitle": "Cara Menghapus Latar Belakang",
        "guidePptTitle": "Di PowerPoint",
        "guideGimpTitle": "Di GIMP",
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
        "presetOneInch": "1 inci - 295 x 413 px",
        "presetSmallOneInch": "Kecil 1 inci - 260 x 378 px",
        "presetLargeOneInch": "Besar 1 inci - 390 x 567 px",
        "presetTwoInch": "2 inci - 413 x 579 px",
        "presetSmallTwoInch": "Kecil 2 inci - 413 x 531 px",
        "presetChinaPassport": "Paspor Tiongkok - 390 x 567 px",
        "presetUsPassport": "Paspor AS - 600 x 600 px",
        "presetVisaSquare": "Visa persegi - 600 x 600 px",
        "presetResume": "Foto resume - 480 x 640 px",
        "presetProfileSquare": "Profil persegi - 512 x 512 px",
        "presetCustom": "Ukuran khusus",
        "optionalPlaceholder": "Opsional",
        "qualityFast": "Cepat",
        "qualityFineEdges": "Tepi halus",
        "colorWhite": "Putih",
        "colorBlue": "Biru",
        "colorRed": "Merah",
        "colorGray": "Abu-abu",
        "colorLightBlue": "Biru muda",
        "colorDarkBlue": "Biru tua",
        "colorPink": "Merah muda",
        "colorBlack": "Hitam",
        "paper6Inch": "6 inci - 1800 x 1200 px",
        "paper5Inch": "5 inci - 1500 x 1050 px",
        "paper7Inch": "7 inci - 2100 x 1500 px",
        "paperA4": "A4 - 2480 x 3508 px"
    },
    "pt-br": {
        "pageTitle": "Passaporte grátis e criador de fotos ID online | MiaoCut",
        "metaDescription": "Passaporte AI gratuito, visto e criador de fotos ID online. Predefinições de tamanho específicas do país (China 1 polegada/2 polegadas, passaporte dos EUA, visto Schengen, visto do Japão). Escolha a cor de fundo, destino KB, layouts de impressão. Sem inscrição.",
        "metaKeywords": "criador de fotos de identificação, criador de fotos para passaporte, criador de fotos para vistos, foto de uma polegada, foto de duas polegadas, foto de identificação ai, foto para passaporte da china, foto para passaporte dos EUA, foto para visto schengen, foto para visto no Japão, alterar fundo da foto, folha de foto de identificação para impressão",
        "ogTitle": "Passaporte AI grátis e criador de fotos ID | MiaoCut",
        "ogDescription": "Predefinições de fotos ID específicas do país: China 1 polegada / 2 polegadas, passaporte dos EUA, visto Schengen, visto do Japão. Gratuito, sem inscrição.",
        "ogLocale": "pt_BR",
        "navBg": "Removedor de fundo",
        "navId": "Foto ID",
        "navRestore": "Foto antiga",
        "navWatermark": "Marca d’água",
        "navPortrait": "Retrato",
        "navProduct": "Produto",
        "eyebrow": "Fotos para passaporte · Fotos para vistos · Uma polegada · Duas polegadas · Layouts de impressão",
        "heroTitle": "Passaporte AI e criador de fotos ID",
        "heroSub": "Carregue um retrato, escolha uma predefinição de tamanho específico do país, defina a cor de fundo e o KB de destino e baixe fotos de layout padrão, HD ou para impressão.",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "Criador de fotos ID",
        "portraitLabel": "Retrato",
        "uploadText": "Clique para carregar JPG, PNG ou WebP",
        "uploadHint": "Retrato frontal funciona melhor",
        "replaceHint": "Clique na visualização para substituir este retrato",
        "sizeLabel": "Tamanho da foto",
        "widthLabel": "Largura",
        "heightLabel": "Altura",
        "bgLabel": "Fundo",
        "subjectLabel": "Assunto",
        "topLabel": "Margem superior",
        "kbLabel": "Alvo KB",
        "qualityLabel": "Qualidade",
        "alignLabel": "Alinhamento facial",
        "paperLabel": "Imprimir papel",
        "generateBtn": "Gerar foto ID",
        "standardTitle": "Padrão",
        "hdTitle": "HD",
        "layoutTitle": "Disposição",
        "downloadJpg": "Baixar JPG",
        "downloadPng": "Baixar PNG",
        "downloadLayout": "Baixar layout",
        "standardEmpty": "A foto padrão aparecerá aqui",
        "hdEmpty": "A foto transparente do HD aparecerá aqui",
        "layoutEmpty": "O layout para impressão aparecerá aqui",
        "seoTitle": "Faça fotos ID para documentos, currículos e formulários online",
        "seoBody": "O criador de fotos ID do MiaoCut ajuda você a criar fotos para passaporte, fotos para vistos, fotos de uma polegada, fotos de duas polegadas, fotos de currículo e folhas de fotos para impressão. Escolha um tamanho predefinido, ajuste o posicionamento do retrato, alterne as cores de fundo e baixe as saídas padrão e de alta resolução.",
        "seoCard1": "Tamanhos comuns",
        "seoCard1Body": "Uma polegada, duas polegadas, passaporte, visto, currículo e tamanhos de pixel personalizados.",
        "seoCard2": "Cores de fundo",
        "seoCard2Body": "Branco, azul, vermelho, cinza, azul claro, azul escuro, rosa, preto e cores HEX personalizadas.",
        "seoCard3": "Imprimir folhas",
        "seoCard3Body": "Gere layouts imprimíveis de 5, 6, 7 polegadas ou A4.",
        "uploadFirst": "Carregue um retrato primeiro.",
        "processing": "Removendo fundo e enquadramento...",
        "applying": "Aplicando plano de fundo...",
        "layouting": "Criando layout de impressão...",
        "ready": "Preparar",
        "faqTitle": "Perguntas frequentes",
        "faq1Q": "Quais tamanhos de foto ID o MiaoCut suporta?",
        "faq1A": "China variantes de 1 polegada (295 × 413), 2 polegadas (413 × 579), pequeno / grande de 1 polegada e 2 polegadas, passaporte chinês (390 × 567), passaporte dos EUA (600 × 600), visto Schengen (600 × 600), foto de currículo (480 × 640), perfil social (512 × 512), além de qualquer tamanho de pixel personalizado.",
        "faq2Q": "Quais cores de fundo são suportadas?",
        "faq2A": "Branco, azul, vermelho, cinza, azul claro, azul escuro, rosa, preto e qualquer cor HEX personalizada.",
        "faq3Q": "Posso imprimir várias fotos ID em uma folha?",
        "faq3A": "Sim. Escolha papel de 5, 6, 7 polegadas ou A4 para gerar uma folha de layout imprimível com várias cópias organizadas para corte.",
        "faq4Q": "Minha foto atenderá aos requisitos do documento oficial?",
        "faq4A": "MiaoCut produz fotos de tamanho correto com fundos neutros, mas sempre verifique seu documento específico ou os requisitos mais recentes do escritório de vistos (tamanho da cabeça, expressão, regras de óculos, formato de arquivo) antes de enviar.",
        "faq5Q": "O MiaoCut detecta meu rosto automaticamente?",
        "faq5A": "Sim. MediaPipe Face Mesh detecta a linha dos olhos e a posição da cabeça e, em seguida, a foto é cortada automaticamente e alinhada para caber na predefinição de tamanho escolhida. Você pode ajustar o tamanho do assunto e a margem superior com os controles deslizantes.",
        "faq6Q": "Minha foto é privada?",
        "faq6A": "As fotos são processadas na memória do servidor e descartadas imediatamente após o retorno do resultado. Não armazenamos sua imagem, não a usamos para treinamento AI e não é necessária inscrição.",
        "faq7Q": "Posso definir um tamanho máximo de arquivo no KB para formulários online?",
        "faq7A": "Sim. A entrada \"Target KB\" permite limitar o tamanho do arquivo de saída - útil para formulários de visto ou de solicitação de emprego com limites rígidos de tamanho de arquivo.",
        "howToTitle": "Como fazer um passaporte ou foto ID",
        "howStep1Title": "1. Envie seu retrato",
        "howStep1Body": "Carregue um retrato frontal em JPG, PNG ou WebP. Mesmo a iluminação neutra funciona melhor.",
        "howStep2Title": "2. Escolha o tamanho e o fundo",
        "howStep2Body": "Escolha uma predefinição de país (ou insira dimensões personalizadas), escolha uma cor de fundo e ajuste o tamanho do assunto ou a margem superior, se necessário.",
        "howStep3Title": "3. Gere, ajuste KB, baixe",
        "howStep3Body": "MiaoCut detecta automaticamente seu rosto e produz uma foto padrão, uma versão transparente HD e um layout para impressão. Defina Target KB se o seu formulário exigir um tamanho de arquivo específico.",
        "countryTitle": "Especificações fotográficas do ID por país e documento",
        "countrySubtitle": "Tamanhos de documentos comuns e regras de segundo plano. Sempre verifique os requisitos mais recentes do seu consulado, embaixada ou escritório específico antes de enviar – as regras mudam.",
        "cnOneInchTitle": "China 1 polegada (一寸)",
        "cnOneInchBody": "295 × 413 px · Fundo branco/azul/vermelho · Para cartões ID, documentos escolares, formulários de inscrição simples.",
        "cnTwoInchTitle": "China 2 polegadas (二寸)",
        "cnTwoInchBody": "413 × 579 px · Fundo branco/azul/vermelho · Para currículos, diplomas, formulários de emprego, relatórios médicos.",
        "cnPassportTitle": "Passaporte Chinês (中国护照)",
        "cnPassportBody": "390 × 567 px · Fundo branco, expressão neutra, sem óculos recomendados · Para passaporte, solicitações de visto enviadas na China.",
        "usPassportTitle": "Passaporte dos EUA",
        "usPassportBody": "600 × 600 px (2 × 2 polegadas) · Fundo branco liso ou esbranquiçado · Sem óculos (desde 2016), expressão neutra, rosto inteiro visível.",
        "schengenVisaTitle": "Visto Schengen (UE)",
        "schengenVisaBody": "413 × 531 px (35 × 45 mm) · Fundo cinza claro ou esbranquiçado · 70-80% de cobertura facial, expressão neutra.",
        "japanVisaTitle": "Visto para o Japão",
        "japanVisaBody": "600 × 600 px (45 × 45 mm) · Fundo branco ou esbranquiçado · De frente, sem cobertura de cabeça, tirada dentro de 6 meses.",
        "moreTitle": "Mais ferramentas MiaoCut",
        "moreLinkPortraitTitle": "Removedor de fundo de retrato →",
        "moreLinkPortraitDesc": "Faça fotos limpas de perfil no LinkedIn ou em redes sociais.",
        "moreLinkBgTitle": "Removedor de fundo AI →",
        "moreLinkBgDesc": "Recorte PNG transparente com um clique para qualquer foto.",
        "footerToolsTitle": "Todas as ferramentas MiaoCut",
        "footerCatRemove": "Remoção de fundo AI",
        "footerCatConvert": "Conversão de formato",
        "footerCatRepair": "Reparo e aprimoramento de fotos",
        "footerCatGuides": "Guias",
        "guideHubTitle": "Como remover um plano de fundo",
        "guidePptTitle": "Em PowerPoint",
        "guideGimpTitle": "No GIMP",
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
        "presetOneInch": "1 polegada - 295 x 413 px",
        "presetSmallOneInch": "1 polegada pequena - 260 x 378 px",
        "presetLargeOneInch": "1 polegada grande - 390 x 567 px",
        "presetTwoInch": "2 polegadas - 413 x 579 px",
        "presetSmallTwoInch": "2 polegadas pequenas - 413 x 531 px",
        "presetChinaPassport": "Passaporte chinês - 390 x 567 px",
        "presetUsPassport": "Passaporte dos EUA - 600 x 600 px",
        "presetVisaSquare": "Visto quadrado - 600 x 600 px",
        "presetResume": "Foto para currículo - 480 x 640 px",
        "presetProfileSquare": "Perfil quadrado - 512 x 512 px",
        "presetCustom": "Tamanho personalizado",
        "optionalPlaceholder": "Opcional",
        "qualityFast": "Rápido",
        "qualityFineEdges": "Bordas refinadas",
        "colorWhite": "Branco",
        "colorBlue": "Azul",
        "colorRed": "Vermelho",
        "colorGray": "Cinza",
        "colorLightBlue": "Azul claro",
        "colorDarkBlue": "Azul escuro",
        "colorPink": "Rosa",
        "colorBlack": "Preto",
        "paper6Inch": "6 polegadas - 1800 x 1200 px",
        "paper5Inch": "5 polegadas - 1500 x 1050 px",
        "paper7Inch": "7 polegadas - 2100 x 1500 px",
        "paperA4": "A4 - 2480 x 3508 px"
    },
    "bn": {
        "pageTitle": "বিনামূল্যে পাসপোর্ট এবং ID ফটো মেকার অনলাইন | MiaoCut",
        "metaDescription": "বিনামূল্যে AI পাসপোর্ট, ভিসা, এবং ID ফটো মেকার অনলাইন। দেশ-নির্দিষ্ট আকারের প্রিসেট (চীন 1-ইঞ্চি/2-ইঞ্চি, মার্কিন পাসপোর্ট, শেনজেন ভিসা, জাপান ভিসা)। ব্যাকগ্রাউন্ড কালার, টার্গেট KB, প্রিন্ট লেআউট বেছে নিন। সাইন আপ নেই।",
        "metaKeywords": "আইডি ফটো মেকার, পাসপোর্ট ফটো মেকার, ভিসা ফটো মেকার, এক ইঞ্চি ফটো, দুই ইঞ্চি ফটো, এআই আইডি ফটো, চায়না পাসপোর্ট ফটো, ইউএস পাসপোর্ট ফটো, শেনজেন ভিসা ফটো, জাপান ভিসা ফটো, ছবির ব্যাকগ্রাউন্ড পরিবর্তন, প্রিন্টযোগ্য আইডি ফটো শীট",
        "ogTitle": "বিনামূল্যে AI পাসপোর্ট এবং ID ফটো মেকার | MiaoCut",
        "ogDescription": "দেশ-নির্দিষ্ট ID ফটো প্রিসেট: চীন 1-ইঞ্চি / 2-ইঞ্চি, মার্কিন পাসপোর্ট, শেনজেন ভিসা, জাপানের ভিসা৷ বিনামূল্যে, সাইন আপ নেই।",
        "ogLocale": "bn_BD",
        "navBg": "ব্যাকগ্রাউন্ড রিমুভার",
        "navId": "ID ছবি",
        "navRestore": "পুরানো ছবি",
        "navWatermark": "জলছাপ",
        "navPortrait": "প্রতিকৃতি",
        "navProduct": "পণ্য",
        "eyebrow": "পাসপোর্ট ফটো · ভিসার ছবি · এক ইঞ্চি · দুই ইঞ্চি · প্রিন্ট লেআউট",
        "heroTitle": "AI পাসপোর্ট এবং ID ফটো মেকার",
        "heroSub": "একটি প্রতিকৃতি আপলোড করুন, একটি দেশ-নির্দিষ্ট আকারের প্রিসেট চয়ন করুন, পটভূমির রঙ সেট করুন এবং KB টার্গেট করুন এবং স্ট্যান্ডার্ড, HD বা মুদ্রণযোগ্য লেআউট ফটোগুলি ডাউনলোড করুন৷",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "ID ফটো মেকার",
        "portraitLabel": "প্রতিকৃতি",
        "uploadText": "JPG, PNG, বা WebP আপলোড করতে ক্লিক করুন",
        "uploadHint": "সামনের দিকের পোর্ট্রেট সবচেয়ে ভালো কাজ করে",
        "replaceHint": "এই প্রতিকৃতি প্রতিস্থাপন করতে পূর্বরূপ ক্লিক করুন",
        "sizeLabel": "ছবির আকার",
        "widthLabel": "প্রস্থ",
        "heightLabel": "উচ্চতা",
        "bgLabel": "পটভূমি",
        "subjectLabel": "বিষয়",
        "topLabel": "শীর্ষ মার্জিন",
        "kbLabel": "লক্ষ্য KB",
        "qualityLabel": "গুণমান",
        "alignLabel": "মুখের প্রান্তিককরণ",
        "paperLabel": "প্রিন্ট পেপার",
        "generateBtn": "ID ছবি তৈরি করুন",
        "standardTitle": "স্ট্যান্ডার্ড",
        "hdTitle": "HD",
        "layoutTitle": "লেআউট",
        "downloadJpg": "JPG ডাউনলোড করুন",
        "downloadPng": "PNG ডাউনলোড করুন",
        "downloadLayout": "লেআউট ডাউনলোড করুন",
        "standardEmpty": "স্ট্যান্ডার্ড ফটো এখানে প্রদর্শিত হবে",
        "hdEmpty": "HD স্বচ্ছ ফটো এখানে প্রদর্শিত হবে",
        "layoutEmpty": "মুদ্রণযোগ্য বিন্যাস এখানে প্রদর্শিত হবে",
        "seoTitle": "নথি, জীবনবৃত্তান্ত এবং অনলাইন ফর্মের জন্য ID ফটো তৈরি করুন",
        "seoBody": "MiaoCut-এর ID ফটো মেকার আপনাকে পাসপোর্ট ফটো, ভিসা ফটো, এক-ইঞ্চি ছবি, দুই-ইঞ্চি ছবি, জীবনবৃত্তান্ত ফটো এবং মুদ্রণযোগ্য ফটো শীট তৈরি করতে সাহায্য করে। একটি পূর্বনির্ধারিত আকার চয়ন করুন, প্রতিকৃতি বসানো সামঞ্জস্য করুন, পটভূমির রঙগুলি স্যুইচ করুন এবং উভয় স্ট্যান্ডার্ড এবং উচ্চ-রেজোলিউশন আউটপুট ডাউনলোড করুন৷",
        "seoCard1": "সাধারণ মাপ",
        "seoCard1Body": "এক ইঞ্চি, দুই ইঞ্চি, পাসপোর্ট, ভিসা, জীবনবৃত্তান্ত এবং কাস্টম পিক্সেল মাপ।",
        "seoCard2": "পটভূমি রং",
        "seoCard2Body": "সাদা, নীল, লাল, ধূসর, হালকা নীল, গাঢ় নীল, গোলাপী, কালো এবং কাস্টম HEX রঙ।",
        "seoCard3": "প্রিন্ট শীট",
        "seoCard3Body": "5-ইঞ্চি, 6-ইঞ্চি, 7-ইঞ্চি, বা A4 মুদ্রণযোগ্য লেআউট তৈরি করুন।",
        "uploadFirst": "প্রথমে একটি প্রতিকৃতি আপলোড করুন।",
        "processing": "পটভূমি এবং ফ্রেমিং সরানো হচ্ছে...",
        "applying": "পটভূমি প্রয়োগ করা হচ্ছে...",
        "layouting": "প্রিন্ট লেআউট তৈরি করা হচ্ছে...",
        "ready": "প্রস্তুত",
        "faqTitle": "প্রায়শই জিজ্ঞাসিত প্রশ্নাবলী",
        "faq1Q": "কোন ID ছবির আকার MiaoCut সমর্থন করে?",
        "faq1A": "চায়না 1-ইঞ্চি (295×413), 2-ইঞ্চি (413×579), ছোট/বড় 1-ইঞ্চি এবং 2-ইঞ্চি ভেরিয়েন্ট, চায়না পাসপোর্ট (390×567), ইউএস পাসপোর্ট (600×600), শেনজেন ভিসা (600×600), রেজিউম ফটো (480×el 525 সোশাল), কাস্টম প্রোফাইল (480×el 525), কাস্টম প্রোফাইল আকার",
        "faq2Q": "কি পটভূমি রং সমর্থিত?",
        "faq2A": "সাদা, নীল, লাল, ধূসর, হালকা নীল, গাঢ় নীল, গোলাপী, কালো এবং যেকোনো কাস্টম HEX রঙ।",
        "faq3Q": "আমি কি একটি শীটে একাধিক ID ছবি প্রিন্ট করতে পারি?",
        "faq3A": "হ্যাঁ। 5-ইঞ্চি, 6-ইঞ্চি, 7-ইঞ্চি, বা A4 কাগজ বেছে নিন যাতে কাটার জন্য সাজানো একাধিক কপি সহ একটি মুদ্রণযোগ্য লেআউট শীট তৈরি করা যায়।",
        "faq4Q": "আমার ফটো কি অফিসিয়াল নথির প্রয়োজনীয়তা পূরণ করবে?",
        "faq4A": "MiaoCut নিরপেক্ষ ব্যাকগ্রাউন্ড সহ সঠিক আকারের ফটো তৈরি করে, তবে জমা দেওয়ার আগে সর্বদা আপনার নির্দিষ্ট নথি বা ভিসা অফিসের সর্বশেষ প্রয়োজনীয়তা (মাথার আকার, অভিব্যক্তি, চশমার নিয়ম, ফাইল বিন্যাস) পরীক্ষা করে দেখুন।",
        "faq5Q": "MiaoCut কি স্বয়ংক্রিয়ভাবে আমার মুখ সনাক্ত করে?",
        "faq5A": "হ্যাঁ। MediaPipe Face Mesh আপনার চোখের লাইন এবং মাথার অবস্থান সনাক্ত করে, তারপর ফটোটি স্বয়ংক্রিয়ভাবে কাটা হয় এবং নির্বাচিত আকারের প্রিসেটের সাথে মানানসই হয়। আপনি স্লাইডারগুলির সাহায্যে বিষয়ের আকার এবং শীর্ষ মার্জিন ঠিক করতে পারেন।",
        "faq6Q": "আমার ছবি কি ব্যক্তিগত?",
        "faq6A": "ফটোগুলি সার্ভারে মেমরিতে প্রক্রিয়া করা হয় এবং ফলাফল ফেরত দেওয়ার সাথে সাথেই বাতিল করা হয়। আমরা আপনার ছবি সঞ্চয় করি না, এটি AI প্রশিক্ষণের জন্য ব্যবহার করি না এবং সাইন আপের প্রয়োজন নেই৷",
        "faq7Q": "আমি কি অনলাইন ফর্মের জন্য KB-এ সর্বোচ্চ ফাইলের আকার সেট করতে পারি?",
        "faq7A": "হ্যাঁ। \"টার্গেট KB\" ইনপুট আপনাকে আউটপুট ফাইলের আকার ক্যাপ করতে দেয় — কঠোর ফাইল আকারের সীমা সহ ভিসা বা চাকরির আবেদন ফর্মের জন্য দরকারী।",
        "howToTitle": "কিভাবে একটি পাসপোর্ট বা ID ছবি তৈরি করবেন",
        "howStep1Title": "1. আপনার প্রতিকৃতি আপলোড করুন৷",
        "howStep1Body": "JPG, PNG, বা WebP-এ একটি সম্মুখ-মুখী প্রতিকৃতি আপলোড করুন৷ এমনকি, নিরপেক্ষ আলো সবচেয়ে ভাল কাজ করে।",
        "howStep2Title": "2. আকার এবং পটভূমি চয়ন করুন",
        "howStep2Body": "একটি দেশ প্রিসেট চয়ন করুন (বা কাস্টম মাত্রা লিখুন), একটি পটভূমির রঙ চয়ন করুন এবং প্রয়োজনে বিষয়ের আকার বা শীর্ষ মার্জিন সামঞ্জস্য করুন।",
        "howStep3Title": "3. জেনারেট করুন, KB ফিট করুন, ডাউনলোড করুন",
        "howStep3Body": "MiaoCut স্বয়ংক্রিয়ভাবে আপনার মুখ সনাক্ত করে এবং একটি আদর্শ ফটো, একটি HD স্বচ্ছ সংস্করণ এবং একটি মুদ্রণযোগ্য বিন্যাস তৈরি করে৷ আপনার ফর্মের জন্য একটি নির্দিষ্ট ফাইলের আকারের প্রয়োজন হলে লক্ষ্য KB সেট করুন৷",
        "countryTitle": "দেশ এবং নথি দ্বারা ID ফটো স্পেসিক্স",
        "countrySubtitle": "সাধারণ নথির আকার এবং পটভূমির নিয়ম। জমা দেওয়ার আগে সর্বদা আপনার নির্দিষ্ট কনস্যুলেট, দূতাবাস বা অফিসের সর্বশেষ প্রয়োজনীয়তাগুলি পরীক্ষা করুন — নিয়ম পরিবর্তন।",
        "cnOneInchTitle": "চীন 1-ইঞ্চি (一寸)",
        "cnOneInchBody": "295 × 413 পিক্স · সাদা / নীল / লাল ব্যাকগ্রাউন্ড · ID কার্ড, স্কুলের নথি, সাধারণ আবেদনপত্রের জন্য।",
        "cnTwoInchTitle": "চীন 2-ইঞ্চি (二寸)",
        "cnTwoInchBody": "413 × 579 px · সাদা / নীল / লাল পটভূমি · জীবনবৃত্তান্ত, ডিপ্লোমা, কর্মসংস্থান ফর্ম, মেডিকেল রিপোর্টের জন্য।",
        "cnPassportTitle": "চায়না পাসপোর্ট (中国护照)",
        "cnPassportBody": "390 × 567 px · সাদা পটভূমি, নিরপেক্ষ অভিব্যক্তি, কোন চশমা সুপারিশ করা হয় না · পাসপোর্টের জন্য, চীনে ভিসা আবেদন জমা দেওয়া।",
        "usPassportTitle": "মার্কিন পাসপোর্ট",
        "usPassportBody": "600 × 600 px (2 × 2 ইঞ্চি) · সাদা সাদা বা অফ-হোয়াইট ব্যাকগ্রাউন্ড · কোন চশমা নেই (2016 সাল থেকে), নিরপেক্ষ অভিব্যক্তি, সম্পূর্ণ মুখ দৃশ্যমান।",
        "schengenVisaTitle": "শেনজেন ভিসা (ইইউ)",
        "schengenVisaBody": "413 × 531 পিক্স (35 × 45 মিমি) · হালকা ধূসর বা অফ-হোয়াইট ব্যাকগ্রাউন্ড · 70-80% মুখ কভারেজ, নিরপেক্ষ অভিব্যক্তি।",
        "japanVisaTitle": "জাপান ভিসা",
        "japanVisaBody": "600 × 600 px (45 × 45 mm) · সাদা বা অফ-হোয়াইট ব্যাকগ্রাউন্ড · সামনের দিকে, কোন মাথা ঢেকে না, 6 মাসের মধ্যে নেওয়া।",
        "moreTitle": "আরও MiaoCut টুল",
        "moreLinkPortraitTitle": "পোর্ট্রেট ব্যাকগ্রাউন্ড রিমুভার →",
        "moreLinkPortraitDesc": "পরিষ্কার লিঙ্কডইন বা সামাজিক প্রোফাইল ছবি তৈরি করুন।",
        "moreLinkBgTitle": "AI ব্যাকগ্রাউন্ড রিমুভার →",
        "moreLinkBgDesc": "যেকোনো ছবির জন্য এক-ক্লিক স্বচ্ছ PNG কাটআউট।",
        "footerToolsTitle": "সমস্ত MiaoCut টুল",
        "footerCatRemove": "AI পটভূমি অপসারণ",
        "footerCatConvert": "ফর্ম্যাট রূপান্তর",
        "footerCatRepair": "ফটো মেরামত এবং বর্ধন",
        "footerCatGuides": "গাইড",
        "guideHubTitle": "কিভাবে একটি পটভূমি সরান",
        "guidePptTitle": "PowerPoint-এ",
        "guideGimpTitle": "জিম্পে",
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
        "presetOneInch": "১ ইঞ্চি - 295 x 413 px",
        "presetSmallOneInch": "ছোট ১ ইঞ্চি - 260 x 378 px",
        "presetLargeOneInch": "বড় ১ ইঞ্চি - 390 x 567 px",
        "presetTwoInch": "২ ইঞ্চি - 413 x 579 px",
        "presetSmallTwoInch": "ছোট ২ ইঞ্চি - 413 x 531 px",
        "presetChinaPassport": "চীন পাসপোর্ট - 390 x 567 px",
        "presetUsPassport": "যুক্তরাষ্ট্র পাসপোর্ট - 600 x 600 px",
        "presetVisaSquare": "ভিসা স্কোয়ার - 600 x 600 px",
        "presetResume": "রিজিউম ছবি - 480 x 640 px",
        "presetProfileSquare": "প্রোফাইল স্কোয়ার - 512 x 512 px",
        "presetCustom": "কাস্টম সাইজ",
        "optionalPlaceholder": "ঐচ্ছিক",
        "qualityFast": "দ্রুত",
        "qualityFineEdges": "সূক্ষ্ম প্রান্ত",
        "colorWhite": "সাদা",
        "colorBlue": "নীল",
        "colorRed": "লাল",
        "colorGray": "ধূসর",
        "colorLightBlue": "হালকা নীল",
        "colorDarkBlue": "গাঢ় নীল",
        "colorPink": "গোলাপি",
        "colorBlack": "কালো",
        "paper6Inch": "৬ ইঞ্চি - 1800 x 1200 px",
        "paper5Inch": "৫ ইঞ্চি - 1500 x 1050 px",
        "paper7Inch": "৭ ইঞ্চি - 2100 x 1500 px",
        "paperA4": "A4 - 2480 x 3508 px"
    },
    "fil": {
        "pageTitle": "Libreng Pasaporte at ID Photo Maker Online | MiaoCut",
        "metaDescription": "Libreng AI passport, visa, at ID photo maker online. Mga preset ng laki na partikular sa bansa (China 1-inch/2-inch, US passport, Schengen visa, Japan visa). Pumili ng kulay ng background, i-target ang KB, mga layout ng pag-print. Walang signup.",
        "metaKeywords": "id photo maker, passport photo maker, visa photo maker, one inch photo, two inch photo, ai id photo, china passport photo, us passport photo, schengen visa photo, japan visa photo, change photo background, printable id photo sheet",
        "ogTitle": "Libreng AI Passport at ID Photo Maker | MiaoCut",
        "ogDescription": "Mga preset ng larawang ID na partikular sa bansa: China 1-inch / 2-inch, US passport, Schengen visa, Japan visa. Libre, walang pag-signup.",
        "ogLocale": "fil_PH",
        "navBg": "Background Remover",
        "navId": "ID Larawan",
        "navRestore": "Lumang Larawan",
        "navWatermark": "Watermark",
        "navPortrait": "Larawan",
        "navProduct": "produkto",
        "eyebrow": "Mga larawan ng pasaporte · Mga larawan sa visa · Isang pulgada · Dalawang pulgada · Mga layout ng pag-print",
        "heroTitle": "AI Passport at ID Photo Maker",
        "heroSub": "Mag-upload ng portrait, pumili ng preset na laki na partikular sa bansa, itakda ang kulay ng background at i-target ang KB, at i-download ang standard, HD, o mga napi-print na larawan ng layout.",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "ID Photo Maker",
        "portraitLabel": "Larawan",
        "uploadText": "I-click upang i-upload ang JPG, PNG, o WebP",
        "uploadHint": "Pinakamahusay na gumagana ang portrait na nakaharap sa harap",
        "replaceHint": "I-click ang preview para palitan ang portrait na ito",
        "sizeLabel": "Laki ng larawan",
        "widthLabel": "Lapad",
        "heightLabel": "taas",
        "bgLabel": "Background",
        "subjectLabel": "Paksa",
        "topLabel": "Nangungunang margin",
        "kbLabel": "Target na KB",
        "qualityLabel": "Kalidad",
        "alignLabel": "Pag-align ng mukha",
        "paperLabel": "Mag-print ng papel",
        "generateBtn": "Bumuo ng ID na Larawan",
        "standardTitle": "Pamantayan",
        "hdTitle": "HD",
        "layoutTitle": "Layout",
        "downloadJpg": "I-download ang JPG",
        "downloadPng": "I-download ang PNG",
        "downloadLayout": "I-download ang Layout",
        "standardEmpty": "Lalabas dito ang karaniwang larawan",
        "hdEmpty": "Lalabas dito ang HD na transparent na larawan",
        "layoutEmpty": "Lalabas dito ang napi-print na layout",
        "seoTitle": "Gumawa ng ID na mga larawan para sa mga dokumento, resume, at online na mga form",
        "seoBody": "Tinutulungan ka ng MiaoCut na gumagawa ng larawan ng ID na lumikha ng mga larawan ng pasaporte, mga larawan ng visa, isang pulgadang larawan, dalawang pulgadang larawan, mga larawan ng resume, at mga napi-print na mga sheet ng larawan. Pumili ng preset na laki, isaayos ang portrait na placement, lumipat ng mga kulay ng background, at i-download ang parehong standard at high-resolution na mga output.",
        "seoCard1": "Mga karaniwang sukat",
        "seoCard1Body": "Isang pulgada, dalawang pulgada, pasaporte, visa, resume, at mga custom na laki ng pixel.",
        "seoCard2": "Mga kulay ng background",
        "seoCard2Body": "Puti, asul, pula, kulay abo, mapusyaw na asul, madilim na asul, pink, itim, at mga custom na kulay ng HEX.",
        "seoCard3": "Mag-print ng mga sheet",
        "seoCard3Body": "Bumuo ng 5-inch, 6-inch, 7-inch, o A4 na mga napi-print na layout.",
        "uploadFirst": "Mag-upload muna ng portrait.",
        "processing": "Inaalis ang background at pag-frame...",
        "applying": "Inilapat ang background...",
        "layouting": "Gumagawa ng layout ng pag-print...",
        "ready": "handa na",
        "faqTitle": "Mga Madalas Itanong",
        "faq1Q": "Anong mga laki ng larawan ng ID ang sinusuportahan ng MiaoCut?",
        "faq1A": "China 1-inch (295×413), 2-inch (413×579), maliit/malaking 1-inch at 2-inch na variant, China passport (390×567), US passport (600×600), Schengen visa (600×600), resume photo (480×640), social profile (512×512 na laki), dagdag sa social profile (512×51 pixel.",
        "faq2Q": "Anong mga kulay ng background ang sinusuportahan?",
        "faq2A": "Puti, asul, pula, kulay abo, mapusyaw na asul, madilim na asul, pink, itim, at anumang custom na kulay ng HEX.",
        "faq3Q": "Maaari ba akong mag-print ng maraming ID na larawan sa isang sheet?",
        "faq3A": "Oo. Pumili ng 5-inch, 6-inch, 7-inch, o A4 na papel upang bumuo ng napi-print na layout sheet na may maraming kopya na nakaayos para sa pagputol.",
        "faq4Q": "Matutugunan ba ng aking larawan ang mga opisyal na kinakailangan sa dokumento?",
        "faq4A": "Gumagawa ang MiaoCut ng mga larawang may tamang sukat na may mga neutral na background, ngunit palaging suriin ang iyong partikular na dokumento o mga pinakabagong kinakailangan ng opisina ng visa (laki ng ulo, ekspresyon, mga panuntunan sa salamin, format ng file) bago isumite.",
        "faq5Q": "Awtomatikong nade-detect ba ng MiaoCut ang aking mukha?",
        "faq5A": "Oo. Nakita ng MediaPipe Face Mesh ang linya ng iyong mata at posisyon ng ulo, pagkatapos ay awtomatikong i-crop ang larawan at nakahanay upang magkasya sa napiling laki ng preset. Maaari mong i-fine-tune ang laki ng paksa at itaas na margin gamit ang mga slider.",
        "faq6Q": "Pribado ba ang aking larawan?",
        "faq6A": "Ang mga larawan ay pinoproseso sa memorya sa server at itinatapon kaagad pagkatapos maibalik ang resulta. Hindi namin iniimbak ang iyong larawan, huwag gamitin ito para sa AI na pagsasanay, at walang kinakailangang pag-signup.",
        "faq7Q": "Maaari ba akong magtakda ng max na laki ng file sa KB para sa mga online na form?",
        "faq7A": "Oo. Hinahayaan ka ng input na \"Target KB\" na limitahan ang laki ng file ng output — kapaki-pakinabang para sa mga form ng aplikasyon para sa visa o trabaho na may mahigpit na mga limitasyon sa laki ng file.",
        "howToTitle": "Paano Gumawa ng Pasaporte o ID na Larawan",
        "howStep1Title": "1. I-upload ang iyong portrait",
        "howStep1Body": "Mag-upload ng portrait na nakaharap sa harapan sa JPG, PNG, o WebP. Kahit na, ang neutral na ilaw ay pinakamahusay na gumagana.",
        "howStep2Title": "2. Pumili ng laki at background",
        "howStep2Body": "Pumili ng preset ng bansa (o maglagay ng mga custom na dimensyon), pumili ng kulay ng background, at isaayos ang laki ng paksa o itaas na margin kung kinakailangan.",
        "howStep3Title": "3. Bumuo, magkasya sa KB, mag-download",
        "howStep3Body": "Awtomatikong nade-detect ng MiaoCut ang iyong mukha at gumagawa ng karaniwang larawan, isang transparent na bersyon ng HD, at napi-print na layout. Itakda ang Target na KB kung ang iyong form ay nangangailangan ng partikular na laki ng file.",
        "countryTitle": "ID Mga Detalye ng Larawan ayon sa Bansa at Dokumento",
        "countrySubtitle": "Mga karaniwang sukat ng dokumento at mga panuntunan sa background. Palaging suriin ang iyong partikular na konsulado, embahada, o opisina ng pinakabagong mga kinakailangan bago isumite — nagbabago ang mga patakaran.",
        "cnOneInchTitle": "China 1-pulgada (一寸)",
        "cnOneInchBody": "295 × 413 px · Puti / asul / pulang background · Para sa ID card, mga dokumento ng paaralan, mga simpleng application form.",
        "cnTwoInchTitle": "China 2-pulgada (二寸)",
        "cnTwoInchBody": "413 × 579 px · Puti / asul / pulang background · Para sa mga resume, diploma, mga form sa trabaho, mga medikal na ulat.",
        "cnPassportTitle": "Pasaporte ng Tsina (中国护照)",
        "cnPassportBody": "390 × 567 px · Puting background, neutral na ekspresyon, walang salamin na inirerekomenda · Para sa pasaporte, isinumite ang mga aplikasyon ng visa sa China.",
        "usPassportTitle": "Pasaporte ng US",
        "usPassportBody": "600 × 600 px (2 × 2 pulgada) · Plain white o off-white na background · Walang salamin (mula noong 2016), neutral na expression, buong mukha ang nakikita.",
        "schengenVisaTitle": "Schengen Visa (EU)",
        "schengenVisaBody": "413 × 531 px (35 × 45 mm) · Light gray o off-white na background · 70-80% face coverage, neutral na expression.",
        "japanVisaTitle": "Visa ng Japan",
        "japanVisaBody": "600 × 600 px (45 × 45 mm) · Puti o hindi puti na background · Nakaharap sa harap, walang saplot sa ulo, na kinunan sa loob ng 6 na buwan.",
        "moreTitle": "Higit pang MiaoCut Tools",
        "moreLinkPortraitTitle": "Portrait Background Remover →",
        "moreLinkPortraitDesc": "Gumawa ng malinis na LinkedIn o mga social profile na larawan.",
        "moreLinkBgTitle": "AI Background Remover →",
        "moreLinkBgDesc": "Isang-click na transparent na PNG cutout para sa anumang larawan.",
        "footerToolsTitle": "Lahat ng MiaoCut Tools",
        "footerCatRemove": "AI Pag-alis ng Background",
        "footerCatConvert": "Conversion ng Format",
        "footerCatRepair": "Pag-aayos at Pagpapahusay ng Larawan",
        "footerCatGuides": "Mga gabay",
        "guideHubTitle": "Paano Mag-alis ng Background",
        "guidePptTitle": "Sa PowerPoint",
        "guideGimpTitle": "Sa GIMP",
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
        "presetOneInch": "1 pulgada - 295 x 413 px",
        "presetSmallOneInch": "Maliit na 1 pulgada - 260 x 378 px",
        "presetLargeOneInch": "Malaking 1 pulgada - 390 x 567 px",
        "presetTwoInch": "2 pulgada - 413 x 579 px",
        "presetSmallTwoInch": "Maliit na 2 pulgada - 413 x 531 px",
        "presetChinaPassport": "Pasaporte ng China - 390 x 567 px",
        "presetUsPassport": "Pasaporte ng US - 600 x 600 px",
        "presetVisaSquare": "Parisukat na visa - 600 x 600 px",
        "presetResume": "Larawan sa resume - 480 x 640 px",
        "presetProfileSquare": "Parisukat na profile - 512 x 512 px",
        "presetCustom": "Custom na laki",
        "optionalPlaceholder": "Opsyonal",
        "qualityFast": "Mabilis",
        "qualityFineEdges": "Pinong mga gilid",
        "colorWhite": "Puti",
        "colorBlue": "Asul",
        "colorRed": "Pula",
        "colorGray": "Abo",
        "colorLightBlue": "Mapusyaw na asul",
        "colorDarkBlue": "Madilim na asul",
        "colorPink": "Rosas",
        "colorBlack": "Itim",
        "paper6Inch": "6 pulgada - 1800 x 1200 px",
        "paper5Inch": "5 pulgada - 1500 x 1050 px",
        "paper7Inch": "7 pulgada - 2100 x 1500 px",
        "paperA4": "A4 - 2480 x 3508 px"
    },
    "ur": {
        "pageTitle": "مفت پاسپورٹ اور ID فوٹو میکر آن لائن | MiaoCut",
        "metaDescription": "مفت AI پاسپورٹ، ویزا، اور ID فوٹو میکر آن لائن۔ ملک کے لیے مخصوص سائز کے پیش سیٹ (چین 1-انچ/2-انچ، امریکی پاسپورٹ، شینگن ویزا، جاپان کا ویزا)۔ پس منظر کا رنگ منتخب کریں، ہدف KB، پرنٹ لے آؤٹ۔ کوئی سائن اپ نہیں۔",
        "metaKeywords": "آئی ڈی فوٹو میکر، پاسپورٹ فوٹو میکر، ویزا فوٹو میکر، ایک انچ فوٹو، دو انچ فوٹو، اے آئی آئی ڈی فوٹو، چائنا پاسپورٹ فوٹو، یو ایس پاسپورٹ فوٹو، شینگن ویزا فوٹو، جاپان ویزا فوٹو، فوٹو بیک گراؤنڈ تبدیل، پرنٹ ایبل آئی ڈی فوٹو شیٹ",
        "ogTitle": "مفت AI پاسپورٹ اور ID فوٹو میکر | MiaoCut",
        "ogDescription": "ملک کے لیے مخصوص ID فوٹو پیش سیٹ: چین 1-انچ/2-انچ، امریکی پاسپورٹ، شینگن ویزا، جاپان کا ویزا۔ مفت، کوئی سائن اپ نہیں۔",
        "ogLocale": "ur_PK",
        "navBg": "پس منظر ہٹانے والا",
        "navId": "ID تصویر",
        "navRestore": "پرانی تصویر",
        "navWatermark": "واٹر مارک",
        "navPortrait": "پورٹریٹ",
        "navProduct": "پروڈکٹ",
        "eyebrow": "پاسپورٹ کی تصاویر · ویزا کی تصاویر · ایک انچ · دو انچ · پرنٹ لے آؤٹ",
        "heroTitle": "AI پاسپورٹ اور ID فوٹو میکر",
        "heroSub": "ایک پورٹریٹ اپ لوڈ کریں، ملک کے لیے مخصوص سائز کا پری سیٹ منتخب کریں، پس منظر کا رنگ سیٹ کریں اور KB کو ہدف بنائیں، اور معیاری، HD، یا پرنٹ ایبل لے آؤٹ فوٹو ڈاؤن لوڈ کریں۔",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "ID فوٹو میکر",
        "portraitLabel": "پورٹریٹ",
        "uploadText": "JPG، PNG، یا WebP اپ لوڈ کرنے کے لیے کلک کریں",
        "uploadHint": "سامنے والا پورٹریٹ بہترین کام کرتا ہے۔",
        "replaceHint": "اس پورٹریٹ کو تبدیل کرنے کے لیے پیش منظر پر کلک کریں۔",
        "sizeLabel": "تصویر کا سائز",
        "widthLabel": "چوڑائی",
        "heightLabel": "اونچائی",
        "bgLabel": "پس منظر",
        "subjectLabel": "موضوع",
        "topLabel": "اوپر مارجن",
        "kbLabel": "ہدف KB",
        "qualityLabel": "معیار",
        "alignLabel": "چہرے کی سیدھ",
        "paperLabel": "کاغذ پرنٹ کریں۔",
        "generateBtn": "ID تصویر بنائیں",
        "standardTitle": "معیاری",
        "hdTitle": "HD",
        "layoutTitle": "لے آؤٹ",
        "downloadJpg": "JPG ڈاؤن لوڈ کریں۔",
        "downloadPng": "PNG ڈاؤن لوڈ کریں۔",
        "downloadLayout": "لے آؤٹ ڈاؤن لوڈ کریں۔",
        "standardEmpty": "معیاری تصویر یہاں ظاہر ہوگی۔",
        "hdEmpty": "HD شفاف تصویر یہاں ظاہر ہوگی۔",
        "layoutEmpty": "پرنٹ ایبل لے آؤٹ یہاں ظاہر ہوگا۔",
        "seoTitle": "دستاویزات، ریزیومے اور آن لائن فارمز کے لیے ID تصاویر بنائیں",
        "seoBody": "MiaoCut کا ID فوٹو میکر آپ کو پاسپورٹ فوٹوز، ویزا فوٹوز، ایک انچ فوٹوز، دو انچ فوٹوز، ریزیوم فوٹوز اور پرنٹ ایبل فوٹو شیٹس بنانے میں مدد کرتا ہے۔ ایک پیش سیٹ سائز کا انتخاب کریں، پورٹریٹ پلیسمنٹ کو ایڈجسٹ کریں، پس منظر کے رنگوں کو تبدیل کریں، اور معیاری اور اعلی ریزولوشن دونوں آؤٹ پٹ ڈاؤن لوڈ کریں۔",
        "seoCard1": "عام سائز",
        "seoCard1Body": "ایک انچ، دو انچ، پاسپورٹ، ویزا، ریزیومے، اور حسب ضرورت پکسل سائز۔",
        "seoCard2": "پس منظر کے رنگ",
        "seoCard2Body": "سفید، نیلا، سرخ، سرمئی، ہلکا نیلا، گہرا نیلا، گلابی، سیاہ، اور حسب ضرورت HEX رنگ۔",
        "seoCard3": "شیٹس پرنٹ کریں۔",
        "seoCard3Body": "5 انچ، 6 انچ، 7 انچ، یا A4 پرنٹ ایبل لے آؤٹ بنائیں۔",
        "uploadFirst": "پہلے پورٹریٹ اپ لوڈ کریں۔",
        "processing": "پس منظر اور فریمنگ کو ہٹایا جا رہا ہے...",
        "applying": "پس منظر کا اطلاق ہو رہا ہے...",
        "layouting": "پرنٹ لے آؤٹ بنایا جا رہا ہے...",
        "ready": "تیار",
        "faqTitle": "اکثر پوچھے گئے سوالات",
        "faq1Q": "ID تصویر کے کس سائز کو MiaoCut سپورٹ کرتا ہے؟",
        "faq1A": "چائنا 1 انچ (295×413)، 2-انچ (413×579)، چھوٹا/بڑا 1-انچ اور 2-انچ متغیرات، چائنا پاسپورٹ (390×567)، یو ایس پاسپورٹ (600×600)، شینگن ویزا (600×600)، ریزیوم فوٹو (480×el 525)، حسب ضرورت پروفائل (480×el 525)، ریزیومے فوٹو سائز",
        "faq2Q": "کون سے پس منظر کے رنگ سپورٹ ہیں؟",
        "faq2A": "سفید، نیلا، سرخ، سرمئی، ہلکا نیلا، گہرا نیلا، گلابی، سیاہ، اور کوئی بھی حسب ضرورت HEX رنگ۔",
        "faq3Q": "کیا میں ایک شیٹ پر متعدد ID تصاویر پرنٹ کر سکتا ہوں؟",
        "faq3A": "جی ہاں 5 انچ، 6-انچ، 7-انچ، یا A4 کاغذ کا انتخاب کریں تاکہ ایک پرنٹ ایبل لے آؤٹ شیٹ تیار کی جا سکے جس میں کاٹنے کے لیے ترتیب دی گئی متعدد کاپیاں ہوں۔",
        "faq4Q": "کیا میری تصویر سرکاری دستاویز کے تقاضوں کو پورا کرے گی؟",
        "faq4A": "MiaoCut غیر جانبدار پس منظر کے ساتھ صحیح سائز کی تصاویر تیار کرتا ہے، لیکن جمع کرانے سے پہلے ہمیشہ اپنی مخصوص دستاویز یا ویزا آفس کی تازہ ترین ضروریات (سر کا سائز، اظہار، شیشے کے قواعد، فائل کی شکل) کو چیک کریں۔",
        "faq5Q": "کیا MiaoCut خود بخود میرے چہرے کا پتہ لگاتا ہے؟",
        "faq5A": "جی ہاں MediaPipe Face Mesh آپ کی آنکھ کی لکیر اور سر کی پوزیشن کا پتہ لگاتا ہے، پھر تصویر کو خودکار طور پر کراپ کیا جاتا ہے اور منتخب کردہ سائز کے پیش سیٹ پر فٹ ہونے کے لیے منسلک کیا جاتا ہے۔ آپ سلائیڈرز کے ساتھ سبجیکٹ کے سائز اور ٹاپ مارجن کو ٹھیک کر سکتے ہیں۔",
        "faq6Q": "کیا میری تصویر نجی ہے؟",
        "faq6A": "تصاویر کو سرور پر میموری میں پروسیس کیا جاتا ہے اور نتیجہ واپس آنے کے فوراً بعد ضائع کر دیا جاتا ہے۔ ہم آپ کی تصویر کو محفوظ نہیں کرتے، اسے AI ٹریننگ کے لیے استعمال نہ کریں، اور سائن اپ کی ضرورت نہیں ہے۔",
        "faq7Q": "کیا میں آن لائن فارمز کے لیے KB میں فائل کا زیادہ سے زیادہ سائز سیٹ کر سکتا ہوں؟",
        "faq7A": "جی ہاں \"ٹارگٹ KB\" ان پٹ آپ کو آؤٹ پٹ فائل کے سائز کو محدود کرنے دیتا ہے — سخت فائل سائز کی حد کے ساتھ ویزا یا جاب درخواست فارم کے لیے مفید ہے۔",
        "howToTitle": "پاسپورٹ یا ID تصویر کیسے بنائیں",
        "howStep1Title": "1. اپنا پورٹریٹ اپ لوڈ کریں۔",
        "howStep1Body": "JPG، PNG، یا WebP میں سامنے والا پورٹریٹ اپ لوڈ کریں۔ یہاں تک کہ، غیر جانبدار روشنی بہترین کام کرتی ہے۔",
        "howStep2Title": "2. سائز اور پس منظر چنیں۔",
        "howStep2Body": "ایک ملک کا پیش سیٹ منتخب کریں (یا حسب ضرورت طول و عرض درج کریں)، پس منظر کا رنگ منتخب کریں، اور اگر ضرورت ہو تو موضوع کا سائز یا اوپری مارجن ایڈجسٹ کریں۔",
        "howStep3Title": "3. تیار کریں، KB کو فٹ کریں، ڈاؤن لوڈ کریں۔",
        "howStep3Body": "MiaoCut آپ کے چہرے کا خود بخود پتہ لگاتا ہے اور ایک معیاری تصویر، ایک HD شفاف ورژن، اور پرنٹ ایبل لے آؤٹ تیار کرتا ہے۔ ہدف KB مقرر کریں اگر آپ کے فارم کو مخصوص فائل سائز کی ضرورت ہے۔",
        "countryTitle": "ID تصویر کی تفصیلات بذریعہ ملک اور دستاویز",
        "countrySubtitle": "عام دستاویز کے سائز اور پس منظر کے اصول۔ جمع کرانے سے پہلے ہمیشہ اپنے مخصوص قونصل خانے، سفارت خانے یا دفتر کے تازہ ترین تقاضوں کو چیک کریں — قواعد میں تبدیلی۔",
        "cnOneInchTitle": "چین 1 انچ (一寸)",
        "cnOneInchBody": "295 × 413 px · سفید / نیلا / سرخ پس منظر · ID کارڈز، اسکول کے دستاویزات، سادہ درخواست فارم کے لیے۔",
        "cnTwoInchTitle": "چین 2 انچ (二寸)",
        "cnTwoInchBody": "413 × 579 px · سفید / نیلا / سرخ پس منظر · ریزیومے، ڈپلومہ، ملازمت کے فارم، میڈیکل رپورٹس کے لیے۔",
        "cnPassportTitle": "چائنا پاسپورٹ (中国护照)",
        "cnPassportBody": "390 × 567 px · سفید پس منظر، غیر جانبدار اظہار، کوئی چشمہ تجویز نہیں کیا گیا · پاسپورٹ کے لیے، چین میں ویزا کی درخواستیں جمع کرائی گئیں۔",
        "usPassportTitle": "امریکی پاسپورٹ",
        "usPassportBody": "600 × 600 px (2 × 2 انچ) · سادہ سفید یا آف وائٹ پس منظر · کوئی چشمہ نہیں (2016 سے)، غیر جانبدار اظہار، مکمل چہرہ نظر آتا ہے۔",
        "schengenVisaTitle": "شینگن ویزا (EU)",
        "schengenVisaBody": "413 × 531 px (35 × 45 mm) · ہلکا سرمئی یا آف سفید پس منظر · 70-80% چہرے کی کوریج، غیر جانبدار اظہار۔",
        "japanVisaTitle": "جاپان کا ویزا",
        "japanVisaBody": "600 × 600 px (45 × 45 mm) · سفید یا آف وائٹ بیک گراؤنڈ · سامنے کی طرف، کوئی سر ڈھانپنے کے بغیر، 6 ماہ کے اندر لیا گیا۔",
        "moreTitle": "مزید MiaoCut ٹولز",
        "moreLinkPortraitTitle": "پورٹریٹ بیک گراؤنڈ ریموور →",
        "moreLinkPortraitDesc": "کلین لنکڈ ان یا سوشل پروفائل پکچر بنائیں۔",
        "moreLinkBgTitle": "AI بیک گراؤنڈ ریموور →",
        "moreLinkBgDesc": "کسی بھی تصویر کے لیے شفاف PNG کٹ آؤٹ پر ایک کلک کریں۔",
        "footerToolsTitle": "تمام MiaoCut ٹولز",
        "footerCatRemove": "AI پس منظر کو ہٹانا",
        "footerCatConvert": "فارمیٹ کنورژن",
        "footerCatRepair": "تصویر کی مرمت اور اضافہ",
        "footerCatGuides": "رہنما",
        "guideHubTitle": "پس منظر کو کیسے ہٹایا جائے۔",
        "guidePptTitle": "PowerPoint میں",
        "guideGimpTitle": "GIMP میں",
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
        "presetOneInch": "1 انچ - 295 x 413 px",
        "presetSmallOneInch": "چھوٹا 1 انچ - 260 x 378 px",
        "presetLargeOneInch": "بڑا 1 انچ - 390 x 567 px",
        "presetTwoInch": "2 انچ - 413 x 579 px",
        "presetSmallTwoInch": "چھوٹا 2 انچ - 413 x 531 px",
        "presetChinaPassport": "چین پاسپورٹ - 390 x 567 px",
        "presetUsPassport": "امریکی پاسپورٹ - 600 x 600 px",
        "presetVisaSquare": "مربع ویزا - 600 x 600 px",
        "presetResume": "ریزیومے تصویر - 480 x 640 px",
        "presetProfileSquare": "پروفائل مربع - 512 x 512 px",
        "presetCustom": "حسب ضرورت سائز",
        "optionalPlaceholder": "اختیاری",
        "qualityFast": "تیز",
        "qualityFineEdges": "باریک کنارے",
        "colorWhite": "سفید",
        "colorBlue": "نیلا",
        "colorRed": "سرخ",
        "colorGray": "سرمئی",
        "colorLightBlue": "ہلکا نیلا",
        "colorDarkBlue": "گہرا نیلا",
        "colorPink": "گلابی",
        "colorBlack": "سیاہ",
        "paper6Inch": "6 انچ - 1800 x 1200 px",
        "paper5Inch": "5 انچ - 1500 x 1050 px",
        "paper7Inch": "7 انچ - 2100 x 1500 px",
        "paperA4": "A4 - 2480 x 3508 px"
    }
};

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
    const LOCALE_PREFIXES = LOCALES.filter(locale => locale.prefix).map(locale => locale.prefix).sort((a, b) => b.length - a.length);
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

    function alternateUrlFor(targetLang) {
        const locale = LOCALE_BY_CODE[targetLang] || LOCALE_BY_CODE.en;
        const basePath = stripLocalePrefix(window.location.pathname);
        if (!locale.prefix) return basePath;
        return basePath === '/' ? `${locale.prefix}/` : `${locale.prefix}${basePath}`;
    }

    // 当前语言从静态 HTML 的 <html lang> 推断（构建时由 scripts/build-i18n.mjs 写死）。
    // 不再用 localStorage 决定语言：每个 URL（/id-photo-maker/ vs /zh/id-photo-maker/ 等）已经
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
        lang: localeFromHtmlLang(_htmlLang),
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
        document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
            const key = el.getAttribute('data-i18n-ph');
            el.placeholder = t(key);
        });
        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.getAttribute('data-i18n-title');
            el.title = t(key);
        });
        document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
            const key = el.getAttribute('data-i18n-aria');
            el.setAttribute('aria-label', t(key));
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
        // 这样每个 locale URL 才能各自被 Google 索引为独立语种页。
        langSwitch.addEventListener('change', (e) => {
            const target = e.target.value;
            if (target === state.lang) return;
            const nextPath = alternateUrlFor(target);
            localStorage.setItem('lang', target);
            window.location.assign(nextPath + window.location.search + window.location.hash);
        });
    }
    applyLanguage(state.lang);
})();
