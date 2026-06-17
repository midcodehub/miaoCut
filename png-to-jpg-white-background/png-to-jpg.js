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
    "en": {
        "pageTitle": "PNG to JPG Converter — Smart White Background Auto-Fill | MiaoCut",
        "metaDescription": "Convert PNG to JPG free with a smart white background. Avoid the ugly black fill that naive converters produce — pick white, gray, black, or any custom color, set quality, and download.",
        "metaKeywords": "png to jpg, png to jpg white background, png to jpeg, convert png to jpg, transparent png to jpg, png to jpg converter, png to jpg with background, png to jpeg with white background, free png to jpg",
        "ogTitle": "PNG to JPG Converter — Smart White Background Auto-Fill | MiaoCut",
        "ogDescription": "Convert PNG to JPG free with a smart white background. Avoid the ugly black fill that naive converters produce — pick white, gray, black, or any custom color, set quality, and download.",
        "ogLocale": "en_US",
        "navBg": "Background Remover",
        "navProduct": "Product",
        "navPortrait": "Portrait",
        "navWatermark": "Watermark",
        "navId": "ID Photo",
        "navRestore": "Old Photo",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "PNG to JPG Converter",
        "title": "PNG to JPG Converter with White Background",
        "subtitle": "JPG doesn't store transparency. We flatten your PNG onto white (or any color you pick) so you never get a surprise black background. Runs 100% in your browser.",
        "dropzoneTitle": "Drag & drop PNG here, or click to upload",
        "dropzoneSub": "PNG / WebP / GIF — converted to JPG in your browser",
        "paneOriginal": "Original (PNG)",
        "paneResult": "Result (JPG)",
        "bgLabel": "Background color",
        "bgWhite": "White",
        "bgGray": "Light gray",
        "bgBlack": "Black",
        "bgCustom": "Custom",
        "qualityLabel": "JPG quality",
        "qualitySmaller": "Smaller file",
        "qualityBetter": "Better quality",
        "sizeReadoutEmpty": "Preview will update when you change settings.",
        "sizeReadoutFmt": "Estimated JPG size: {size}",
        "downloadBtn": "Download JPG",
        "replaceBtn": "Convert another",
        "trustTitle": "100% private — runs in your browser.",
        "trustSub": "Your image never leaves your device. No upload, no server, no logs.",
        "seoIntro": "MiaoCut's PNG to JPG converter runs entirely in your browser using Canvas. Transparent pixels get flattened onto a background color of your choice (white, gray, black, or custom), and JPG quality is fully adjustable. Nothing is uploaded — your image stays on your device.",
        "howItWorks": "How to Convert PNG to JPG with a White Background",
        "howStep1Title": "1. Drop Your PNG",
        "howStep1Desc": "Drop a PNG (or WebP) into the upload zone. Everything runs in your browser — your image is not uploaded anywhere.",
        "howStep2Title": "2. Pick a Background Color",
        "howStep2Desc": "White is the default. Switch to gray, black, or pick any custom color — the preview updates live.",
        "howStep3Title": "3. Download JPG",
        "howStep3Desc": "Adjust JPG quality if you want, then download. The result is a clean JPG with the background color you chose.",
        "whyTitle": "Why Use This Instead of a Generic Converter",
        "why1Title": "No Surprise Black Background",
        "why1Desc": "Naive converters fill transparent pixels with black because that's the default. We default to white and let you change it before downloading.",
        "why2Title": "100% Private",
        "why2Desc": "Browser-only conversion. Your file is never uploaded, logged, or seen by anyone — including us.",
        "why3Title": "Adjustable Quality",
        "why3Desc": "Slider from 60% to 100%. Find the sweet spot between file size and quality for your use case.",
        "why4Title": "Need Transparency Removed Instead?",
        "why4Desc": "If your PNG still has a background and you want a true transparent cutout, try our JPG → Transparent PNG tool.",
        "tipsTitle": "Tips for Different Use Cases",
        "tip1": "For documents and most marketplaces, stick with white background and 92% quality — it's the universal safe default.",
        "tip2": "For e-commerce platforms that require pure white (255,255,255), the White preset is byte-exact — no tinting.",
        "tip3": "For print or archival, set quality to 100%. File size grows but encoder produces virtually no compression artifacts.",
        "tip4": "For web-bound images where size matters more than visual perfection, 75-85% drops file size dramatically with only mild quality loss.",
        "faqTitle": "Frequently Asked Questions",
        "faq1Q": "Why does my PNG get a black background when I convert it to JPG?",
        "faq1A": "JPG does not support transparency. When a naive converter flattens a transparent PNG, it fills the alpha pixels with black by default. MiaoCut fills them with white (or any color you pick) so the result looks the way you expect — no surprise black blobs.",
        "faq2Q": "What background color should I pick?",
        "faq2A": "White is the safe default for documents, e-commerce, and most marketplaces. Light gray works well for product photography. Black suits dark-themed designs. The custom color picker covers brand colors.",
        "faq3Q": "Is my image uploaded to a server?",
        "faq3A": "No. This converter runs 100% in your browser using Canvas. Your image never leaves your device — nothing is uploaded, stored, or logged.",
        "faq4Q": "What JPG quality setting should I use?",
        "faq4A": "92% is a balanced default — visually lossless for most photos with reasonable file size. Use 100% for print or archival. Use 75-85% if you need smaller files for the web and don't mind mild compression.",
        "faq5Q": "Can I convert WebP or other formats too?",
        "faq5A": "Yes. The converter accepts PNG, WebP, and any format your browser can decode. The output is always JPG.",
        "moreTitle": "More MiaoCut Tools",
        "moreLinkJpgPngTitle": "JPG to Transparent PNG →",
        "moreLinkJpgPngDesc": "The reverse — strip the background out of a JPG and export a transparent PNG.",
        "moreLinkProductTitle": "Product Photo Background Remover →",
        "moreLinkProductDesc": "White-background and square-canvas product images for e-commerce.",
        "moreLinkHomeTitle": "All-Purpose Background Remover →",
        "moreLinkHomeDesc": "Logos, pets, complex edges, anything else.",
        "bookmarkText": "Like MiaoCut? Press",
        "bookmarkSuffix": "to bookmark, next conversion is just 1 sec away!",
        "errFormat": "Unsupported file format. Use PNG, WebP, or any image format your browser supports.",
        "errLoad": "Failed to load the image. Try a different file.",
        "errTooLarge": "Image is too large. Try a file under 50 MB.",
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
        "toolRestoreTitle": "Old Photo"
    },
    "zh": {
        "pageTitle": "PNG 转 JPG 在线转换器 — 智能白底，免黑色背景 | MiaoCut",
        "metaDescription": "免费 PNG 转 JPG，自动填充白底。避开普通转换器的黑色背景填充 — 可选白色、灰色、黑色或任意自定义颜色，并可调节 JPG 画质，浏览器内完成。",
        "metaKeywords": "PNG 转 JPG,PNG 转 JPG 白底,PNG 转 JPEG,PNG 转 JPG 在线,透明 PNG 转 JPG,PNG 转 JPG 工具,PNG 加白底转 JPG,免费 PNG 转 JPG",
        "ogTitle": "PNG 转 JPG 在线转换器 — 智能白底，免黑色背景 | MiaoCut",
        "ogDescription": "免费 PNG 转 JPG，自动填充白底。避开普通转换器的黑色背景填充 — 可选白色、灰色、黑色或任意自定义颜色，并可调节 JPG 画质，浏览器内完成。",
        "ogLocale": "zh_CN",
        "navBg": "背景去除",
        "navProduct": "商品图",
        "navPortrait": "人像",
        "navWatermark": "水印擦除",
        "navId": "证件照",
        "navRestore": "老照片",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "PNG 转 JPG 转换器",
        "title": "PNG 转 JPG 智能白底转换器",
        "subtitle": "JPG 格式本身不支持透明。我们把 PNG 的透明像素铺到白色（或你选的任意颜色）背景上，不再出现意外的黑色背景。100% 浏览器内完成。",
        "dropzoneTitle": "将 PNG 拖拽至此，或点击上传",
        "dropzoneSub": "支持 PNG / WebP / GIF，浏览器内直接转 JPG",
        "paneOriginal": "原图 (PNG)",
        "paneResult": "结果 (JPG)",
        "bgLabel": "背景颜色",
        "bgWhite": "白色",
        "bgGray": "浅灰",
        "bgBlack": "黑色",
        "bgCustom": "自定义",
        "qualityLabel": "JPG 画质",
        "qualitySmaller": "更小文件",
        "qualityBetter": "更好画质",
        "sizeReadoutEmpty": "修改设置后预览会实时更新。",
        "sizeReadoutFmt": "预计 JPG 文件大小：{size}",
        "downloadBtn": "下载 JPG",
        "replaceBtn": "换一张转换",
        "trustTitle": "100% 隐私 — 全部在浏览器内运行。",
        "trustSub": "图片永远不会离开你的设备。零上传、零服务器、零日志。",
        "seoIntro": "MiaoCut PNG 转 JPG 工具完全在浏览器内通过 Canvas 完成。透明像素会被铺到你选的背景色（白、灰、黑或自定义）上，JPG 画质完全可调。无任何上传，图片始终留在你设备上。",
        "howItWorks": "如何把 PNG 转成带白底的 JPG",
        "howStep1Title": "1. 拖入 PNG",
        "howStep1Desc": "把 PNG（或 WebP）拖到上传区。所有处理都在你的浏览器内完成，图片不会上传到任何地方。",
        "howStep2Title": "2. 选择背景颜色",
        "howStep2Desc": "默认是白色。可切换灰色、黑色，或选择任意自定义颜色 — 预览实时更新。",
        "howStep3Title": "3. 下载 JPG",
        "howStep3Desc": "如果需要可以调节 JPG 画质，然后下载。导出的是干净的 JPG，背景就是你选的颜色。",
        "whyTitle": "为什么不用普通转换器",
        "why1Title": "不会出现意外的黑色背景",
        "why1Desc": "普通转换器把透明像素填成黑色（因为是底层默认值）。我们默认填成白色，并允许你在下载前自由切换颜色。",
        "why2Title": "100% 隐私",
        "why2Desc": "完全在浏览器内转换。文件不会被上传、记录或被任何人看到 — 包括我们自己。",
        "why3Title": "可调画质",
        "why3Desc": "60% 到 100% 的画质滑块。根据用途，找到画质和文件大小的平衡点。",
        "why4Title": "其实你想去背景？",
        "why4Desc": "如果 PNG 还带着背景而你想要真正透明的抠图，请改用我们的 JPG → 透明 PNG 工具。",
        "tipsTitle": "不同场景的建议",
        "tip1": "文档和大多数电商平台：保持白底 + 92% 画质，这是几乎所有场景的安全默认。",
        "tip2": "需要纯白 (255,255,255) 的电商平台：白色预设是字节级精确，不会有偏色。",
        "tip3": "打印或归档：把画质调到 100%。文件大一些，但几乎没有压缩损伤。",
        "tip4": "面向 Web 且更在意体积：75-85% 的画质能显著降低文件大小，画质损失很轻微。",
        "faqTitle": "常见问题",
        "faq1Q": "为什么 PNG 转成 JPG 之后变成黑色背景了？",
        "faq1A": "JPG 格式不支持透明。普通转换器把透明像素当成 0（也就是黑色）来填，所以会出现整片黑色。MiaoCut 默认填成白色（也可以选任意颜色），让结果符合你的预期，不再出现意外的黑色。",
        "faq2Q": "应该选什么背景颜色？",
        "faq2A": "文档、电商和绝大多数平台用白色就好。商品摄影场景浅灰也不错。深色设计场景选黑色。自定义颜色选择器适合品牌色。",
        "faq3Q": "图片会被上传到服务器吗？",
        "faq3A": "不会。整个转换器在你的浏览器内通过 Canvas 完成。图片永远不会离开你的设备 — 不会被上传、保存或记录。",
        "faq4Q": "JPG 画质该选多少？",
        "faq4A": "92% 是平衡的默认值 — 对大多数照片视觉上无损，文件大小合理。打印或归档用 100%。Web 用途又关心体积时 75-85% 能显著减小文件，画质损失轻微。",
        "faq5Q": "WebP 等其他格式也能转吗？",
        "faq5A": "可以。本工具接受 PNG、WebP，以及你的浏览器能解码的任何格式。输出固定是 JPG。",
        "moreTitle": "更多 MiaoCut 工具",
        "moreLinkJpgPngTitle": "JPG 转透明 PNG →",
        "moreLinkJpgPngDesc": "反向操作 — 把 JPG 的背景抠掉，导出透明 PNG。",
        "moreLinkProductTitle": "商品图抠图 →",
        "moreLinkProductDesc": "电商白底图与方形画布商品图。",
        "moreLinkHomeTitle": "通用背景去除 →",
        "moreLinkHomeDesc": "Logo、宠物、复杂边缘等任何场景。",
        "bookmarkText": "喜欢 MiaoCut？按",
        "bookmarkSuffix": "收藏，下次转换 1 秒可达！",
        "errFormat": "不支持的文件格式。请使用 PNG、WebP 或其他浏览器能识别的图片格式。",
        "errLoad": "图片加载失败，请换一张试试。",
        "errTooLarge": "图片太大了。请使用 50 MB 以内的文件。",
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
        "toolRestoreTitle": "老照片"
    },
    "hi": {
        "pageTitle": "PNG से JPG कनवर्टर — स्मार्ट व्हाइट बैकग्राउंड ऑटो-फ़िल | MiaoCut",
        "metaDescription": "स्मार्ट सफेद पृष्ठभूमि के साथ PNG को JPG में निःशुल्क रूपांतरित करें। भोले-भाले कन्वर्टर्स द्वारा उत्पादित बदसूरत काले रंग से बचें - सफेद, ग्रे, काला, या कोई भी कस्टम रंग चुनें, गुणवत्ता निर्धारित करें और डाउनलोड करें।",
        "metaKeywords": "पीएनजी से जेपीजी, पीएनजी से जेपीजी सफेद पृष्ठभूमि, पीएनजी से जेपीईजी, पीएनजी को जेपीजी में बदलें, पारदर्शी पीएनजी से जेपीजी, पीएनजी से जेपीजी कनवर्टर, पृष्ठभूमि के साथ पीएनजी से जेपीजी, सफेद पृष्ठभूमि के साथ पीएनजी से जेपीईजी, मुफ्त पीएनजी से जेपीजी",
        "ogTitle": "PNG से JPG कनवर्टर — स्मार्ट व्हाइट बैकग्राउंड ऑटो-फ़िल | MiaoCut",
        "ogDescription": "स्मार्ट सफेद पृष्ठभूमि के साथ PNG को JPG में निःशुल्क रूपांतरित करें। भोले-भाले कन्वर्टर्स द्वारा उत्पादित बदसूरत काले रंग से बचें - सफेद, ग्रे, काला, या कोई भी कस्टम रंग चुनें, गुणवत्ता निर्धारित करें और डाउनलोड करें।",
        "ogLocale": "hi_IN",
        "navBg": "पृष्ठभूमि हटानेवाला",
        "navProduct": "उत्पाद",
        "navPortrait": "चित्र",
        "navWatermark": "वाटर-मार्क",
        "navId": "ID फोटो",
        "navRestore": "पुरानी फोटो",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "PNG से JPG कनवर्टर",
        "title": "सफेद पृष्ठभूमि के साथ PNG से JPG कनवर्टर",
        "subtitle": "JPG पारदर्शिता संग्रहीत नहीं करता है। हम आपके PNG को सफेद (या आपके द्वारा चुने गए किसी भी रंग) पर समतल करते हैं ताकि आपको कभी भी आश्चर्यजनक काली पृष्ठभूमि न मिले। आपके ब्राउज़र में 100% चलता है।",
        "dropzoneTitle": "PNG को यहां खींचें और छोड़ें, या अपलोड करने के लिए क्लिक करें",
        "dropzoneSub": "PNG / WebP / GIF - आपके ब्राउज़र में JPG में परिवर्तित हो गया",
        "paneOriginal": "मूल (PNG)",
        "paneResult": "परिणाम (JPG)",
        "bgLabel": "पृष्ठभूमि का रंग",
        "bgWhite": "सफ़ेद",
        "bgGray": "हल्का ग्रे",
        "bgBlack": "काला",
        "bgCustom": "रिवाज़",
        "qualityLabel": "JPG गुणवत्ता",
        "qualitySmaller": "छोटी फ़ाइल",
        "qualityBetter": "बेहतर गुणवत्ता",
        "sizeReadoutEmpty": "जब आप सेटिंग बदलेंगे तो पूर्वावलोकन अपडेट हो जाएगा.",
        "sizeReadoutFmt": "अनुमानित JPG आकार: {आकार}",
        "downloadBtn": "JPG डाउनलोड करें",
        "replaceBtn": "दूसरे को रूपांतरित करें",
        "trustTitle": "100% निजी - आपके ब्राउज़र में चलता है।",
        "trustSub": "आपकी छवि आपके डिवाइस को कभी नहीं छोड़ती। कोई अपलोड नहीं, कोई सर्वर नहीं, कोई लॉग नहीं।",
        "seoIntro": "MiaoCut का PNG से JPG कनवर्टर पूरी तरह से कैनवास का उपयोग करके आपके ब्राउज़र में चलता है। पारदर्शी पिक्सेल आपकी पसंद के पृष्ठभूमि रंग (सफ़ेद, ग्रे, काला, या कस्टम) पर चपटे हो जाते हैं, और JPG गुणवत्ता पूरी तरह से समायोज्य है। कुछ भी अपलोड नहीं किया गया है - आपकी छवि आपके डिवाइस पर रहती है।",
        "howItWorks": "सफेद पृष्ठभूमि के साथ PNG को JPG में कैसे परिवर्तित करें",
        "howStep1Title": "1. अपना PNG गिराएं",
        "howStep1Desc": "एक PNG (या WebP) को अपलोड क्षेत्र में छोड़ें। सब कुछ आपके ब्राउज़र में चलता है - आपकी छवि कहीं भी अपलोड नहीं की जाती है।",
        "howStep2Title": "2. एक पृष्ठभूमि रंग चुनें",
        "howStep2Desc": "सफ़ेद डिफ़ॉल्ट है. ग्रे, काले पर स्विच करें, या कोई भी कस्टम रंग चुनें - पूर्वावलोकन लाइव अपडेट होता है।",
        "howStep3Title": "3. JPG डाउनलोड करें",
        "howStep3Desc": "यदि आप चाहें तो JPG गुणवत्ता समायोजित करें, फिर डाउनलोड करें। परिणाम आपके द्वारा चुने गए पृष्ठभूमि रंग के साथ एक साफ़ JPG है।",
        "whyTitle": "जेनेरिक कनवर्टर के बजाय इसका उपयोग क्यों करें?",
        "why1Title": "कोई आश्चर्यजनक काली पृष्ठभूमि नहीं",
        "why1Desc": "Naive कनवर्टर्स पारदर्शी पिक्सेल को काले रंग से भरते हैं क्योंकि यह डिफ़ॉल्ट है। हम डिफ़ॉल्ट रूप से सफ़ेद रंग रखते हैं और डाउनलोड करने से पहले आपको इसे बदलने देते हैं।",
        "why2Title": "100% निजी",
        "why2Desc": "केवल ब्राउज़र रूपांतरण. आपकी फ़ाइल कभी भी किसी के द्वारा अपलोड, लॉग या देखी नहीं जाती - जिसमें हम भी शामिल हैं।",
        "why3Title": "समायोज्य गुणवत्ता",
        "why3Desc": "60% से 100% तक स्लाइडर। अपने उपयोग के मामले में फ़ाइल आकार और गुणवत्ता के बीच सही स्थान ढूंढें।",
        "why4Title": "इसके बजाय पारदर्शिता हटाने की आवश्यकता है?",
        "why4Desc": "यदि आपके PNG में अभी भी पृष्ठभूमि है और आप एक वास्तविक पारदर्शी कटआउट चाहते हैं, तो हमारे JPG → पारदर्शी PNG टूल आज़माएं।",
        "tipsTitle": "विभिन्न उपयोग के मामलों के लिए युक्तियाँ",
        "tip1": "दस्तावेज़ों और अधिकांश बाज़ारों के लिए, सफ़ेद पृष्ठभूमि और 92% गुणवत्ता पर टिके रहें - यह सार्वभौमिक सुरक्षित डिफ़ॉल्ट है।",
        "tip2": "ई-कॉमर्स प्लेटफ़ॉर्म के लिए जिन्हें शुद्ध सफेद (255,255,255) की आवश्यकता होती है, व्हाइट प्रीसेट बाइट-सटीक है - कोई टिनिंग नहीं।",
        "tip3": "प्रिंट या अभिलेखीय के लिए, गुणवत्ता को 100% पर सेट करें। फ़ाइल का आकार बढ़ता है लेकिन एनकोडर वस्तुतः कोई संपीड़न कलाकृतियाँ उत्पन्न नहीं करता है।",
        "tip4": "वेब-बाउंड छवियों के लिए जहां आकार दृश्य पूर्णता से अधिक मायने रखता है, 75-85% फ़ाइल का आकार नाटकीय रूप से कम हो जाता है और केवल गुणवत्ता में हल्की हानि होती है।",
        "faqTitle": "अक्सर पूछे जाने वाले प्रश्नों",
        "faq1Q": "जब मैं अपने PNG को JPG में बदलता हूं तो उसका बैकग्राउंड काला क्यों हो जाता है?",
        "faq1A": "JPG पारदर्शिता का समर्थन नहीं करता. जब एक अनुभवहीन कनवर्टर एक पारदर्शी PNG को समतल करता है, तो यह डिफ़ॉल्ट रूप से अल्फा पिक्सल को काले रंग से भर देता है। MiaoCut उन्हें सफेद (या आपके द्वारा चुने गए किसी भी रंग) से भर देता है ताकि परिणाम आपकी अपेक्षा के अनुरूप दिखे - कोई आश्चर्य की बात नहीं कि काली बूँदें।",
        "faq2Q": "मुझे कौन सा पृष्ठभूमि रंग चुनना चाहिए?",
        "faq2A": "दस्तावेज़ों, ई-कॉमर्स और अधिकांश बाज़ारों के लिए सफ़ेद रंग सुरक्षित डिफ़ॉल्ट है। उत्पाद फोटोग्राफी के लिए हल्का भूरा रंग अच्छा काम करता है। काला रंग गहरे थीम वाले डिज़ाइनों पर सूट करता है। कस्टम रंग बीनने वाला ब्रांड के रंगों को कवर करता है।",
        "faq3Q": "क्या मेरी छवि किसी सर्वर पर अपलोड की गई है?",
        "faq3A": "नहीं, यह कनवर्टर कैनवस का उपयोग करके आपके ब्राउज़र में 100% चलता है। आपकी छवि आपके डिवाइस को कभी नहीं छोड़ती - कुछ भी अपलोड, संग्रहीत या लॉग नहीं किया जाता है।",
        "faq4Q": "मुझे किस JPG गुणवत्ता सेटिंग का उपयोग करना चाहिए?",
        "faq4A": "92% एक संतुलित डिफ़ॉल्ट है - उचित फ़ाइल आकार वाले अधिकांश फ़ोटो के लिए दृष्टिगत रूप से दोषरहित। मुद्रण या अभिलेखीय के लिए 100% उपयोग करें। यदि आपको वेब के लिए छोटी फ़ाइलों की आवश्यकता है और हल्के संपीड़न से कोई आपत्ति नहीं है, तो 75-85% का उपयोग करें।",
        "faq5Q": "क्या मैं WebP या अन्य प्रारूपों को भी परिवर्तित कर सकता हूँ?",
        "faq5A": "हाँ। कनवर्टर PNG, WebP और आपके ब्राउज़र द्वारा डिकोड किए जा सकने वाले किसी भी प्रारूप को स्वीकार करता है। आउटपुट हमेशा JPG होता है।",
        "moreTitle": "अधिक MiaoCut उपकरण",
        "moreLinkJpgPngTitle": "JPG से पारदर्शी PNG →",
        "moreLinkJpgPngDesc": "उलटा - JPG से पृष्ठभूमि हटा दें और एक पारदर्शी PNG निर्यात करें।",
        "moreLinkProductTitle": "उत्पाद फोटो पृष्ठभूमि रिमूवर →",
        "moreLinkProductDesc": "ई-कॉमर्स के लिए सफेद-पृष्ठभूमि और चौकोर-कैनवास उत्पाद छवियां।",
        "moreLinkHomeTitle": "ऑल-पर्पस बैकग्राउंड रिमूवर →",
        "moreLinkHomeDesc": "लोगो, पालतू जानवर, जटिल किनारे, और कुछ भी।",
        "bookmarkText": "MiaoCut की तरह? प्रेस",
        "bookmarkSuffix": "बुकमार्क करने के लिए, अगला रूपांतरण केवल 1 सेकंड दूर है!",
        "errFormat": "असमर्थित फ़ाइल स्वरूप। PNG, WebP, या आपके ब्राउज़र द्वारा समर्थित किसी भी छवि प्रारूप का उपयोग करें।",
        "errLoad": "छवि लोड करने में विफल. कोई भिन्न फ़ाइल आज़माएँ.",
        "errTooLarge": "छवि बहुत बड़ी है. 50 एमबी से कम की फ़ाइल आज़माएँ।",
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
        "toolRestoreTitle": "पुरानी फोटो"
    },
    "id": {
        "pageTitle": "Konverter PNG ke JPG — Pengisian Otomatis Latar Belakang Putih Cerdas | MiaoCut",
        "metaDescription": "Konversikan PNG ke JPG gratis dengan latar belakang putih cerdas. Hindari isian hitam jelek yang dihasilkan oleh konverter naif — pilih putih, abu-abu, hitam, atau warna khusus apa pun, atur kualitas, dan unduh.",
        "metaKeywords": "png ke jpg, png ke jpg latar belakang putih, png ke jpeg, ubah png ke jpg, png transparan ke jpg, konverter png ke jpg, png ke jpg dengan latar belakang, png ke jpeg dengan latar belakang putih, png gratis ke jpg",
        "ogTitle": "Konverter PNG ke JPG — Pengisian Otomatis Latar Belakang Putih Cerdas | MiaoCut",
        "ogDescription": "Konversikan PNG ke JPG gratis dengan latar belakang putih cerdas. Hindari isian hitam jelek yang dihasilkan oleh konverter naif — pilih putih, abu-abu, hitam, atau warna khusus apa pun, atur kualitas, dan unduh.",
        "ogLocale": "id_ID",
        "navBg": "Penghapus Latar Belakang",
        "navProduct": "Produk",
        "navPortrait": "Potret",
        "navWatermark": "Tanda air",
        "navId": "Foto ID",
        "navRestore": "Foto lama",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "Konverter PNG ke JPG",
        "title": "Konverter PNG ke JPG dengan Latar Belakang Putih",
        "subtitle": "JPG tidak menyimpan transparansi. Kami meratakan PNG Anda menjadi putih (atau warna apa pun yang Anda pilih) sehingga Anda tidak akan mendapatkan latar belakang hitam yang mengejutkan. Berjalan 100% di browser Anda.",
        "dropzoneTitle": "Seret & lepas PNG di sini, atau klik untuk mengunggah",
        "dropzoneSub": "PNG / WebP / GIF — dikonversi ke JPG di browser Anda",
        "paneOriginal": "Asli (PNG)",
        "paneResult": "Hasil (JPG)",
        "bgLabel": "Warna latar belakang",
        "bgWhite": "Putih",
        "bgGray": "Abu-abu muda",
        "bgBlack": "Hitam",
        "bgCustom": "Kebiasaan",
        "qualityLabel": "kualitas JPG",
        "qualitySmaller": "Berkas lebih kecil",
        "qualityBetter": "Kualitas yang lebih baik",
        "sizeReadoutEmpty": "Pratinjau akan diperbarui ketika Anda mengubah pengaturan.",
        "sizeReadoutFmt": "Perkiraan ukuran JPG: {size}",
        "downloadBtn": "Unduh JPG",
        "replaceBtn": "Konversikan yang lain",
        "trustTitle": "100% pribadi — berjalan di browser Anda.",
        "trustSub": "Gambar Anda tidak pernah meninggalkan perangkat Anda. Tidak ada unggahan, tidak ada server, tidak ada log.",
        "seoIntro": "Konverter MiaoCut PNG ke JPG berjalan sepenuhnya di browser Anda menggunakan Canvas. Piksel transparan diratakan ke warna latar belakang pilihan Anda (putih, abu-abu, hitam, atau khusus), dan kualitas JPG dapat disesuaikan sepenuhnya. Tidak ada yang diunggah — gambar Anda tetap ada di perangkat Anda.",
        "howItWorks": "Cara Mengonversi PNG ke JPG dengan Latar Belakang Putih",
        "howStep1Title": "1. Jatuhkan PNG Anda",
        "howStep1Desc": "Letakkan PNG (atau WebP) ke dalam zona unggah. Semuanya berjalan di browser Anda — gambar Anda tidak diunggah di mana pun.",
        "howStep2Title": "2. Pilih Warna Latar Belakang",
        "howStep2Desc": "Putih adalah defaultnya. Beralih ke abu-abu, hitam, atau pilih warna khusus apa pun — pratinjau diperbarui secara langsung.",
        "howStep3Title": "3. Unduh JPG",
        "howStep3Desc": "Sesuaikan kualitas JPG jika Anda mau, lalu unduh. Hasilnya adalah JPG yang bersih dengan warna background yang Anda pilih.",
        "whyTitle": "Mengapa Menggunakan Ini Daripada Konverter Generik",
        "why1Title": "Tidak Ada Latar Belakang Hitam Kejutan",
        "why1Desc": "Konverter naif mengisi piksel transparan dengan warna hitam karena itulah defaultnya. Kami defaultnya berwarna putih dan membiarkan Anda mengubahnya sebelum mengunduh.",
        "why2Title": "100% Pribadi",
        "why2Desc": "Konversi khusus browser. File Anda tidak pernah diunggah, dicatat, atau dilihat oleh siapa pun — termasuk kami.",
        "why3Title": "Kualitas yang Dapat Disesuaikan",
        "why3Desc": "Penggeser dari 60% menjadi 100%. Temukan titik terbaik antara ukuran dan kualitas file untuk kasus penggunaan Anda.",
        "why4Title": "Perlukah Transparansi Dihapus?",
        "why4Desc": "Jika PNG Anda masih memiliki latar belakang dan Anda menginginkan potongan yang benar-benar transparan, coba alat JPG → Transparan PNG kami.",
        "tipsTitle": "Tip untuk Kasus Penggunaan yang Berbeda",
        "tip1": "Untuk dokumen dan sebagian besar pasar, gunakan latar belakang putih dan kualitas 92% — ini adalah standar aman universal.",
        "tip2": "Untuk platform e-commerce yang memerlukan warna putih murni (255.255.255), preset Putih adalah byte-exact — tanpa pewarnaan.",
        "tip3": "Untuk pencetakan atau pengarsipan, atur kualitas ke 100%. Ukuran file bertambah tetapi pembuat enkode hampir tidak menghasilkan artefak kompresi.",
        "tip4": "Untuk gambar terikat web yang ukuran lebih penting daripada kesempurnaan visual, 75-85% menurunkan ukuran file secara drastis hanya dengan sedikit penurunan kualitas.",
        "faqTitle": "Pertanyaan yang Sering Diajukan",
        "faq1Q": "Mengapa PNG saya mendapat latar belakang hitam ketika saya mengubahnya menjadi JPG?",
        "faq1A": "JPG tidak mendukung transparansi. Saat konverter naif meratakan PNG transparan, ia akan mengisi piksel alfa dengan warna hitam secara default. MiaoCut mengisinya dengan warna putih (atau warna apa pun yang Anda pilih) sehingga hasilnya terlihat seperti yang Anda harapkan — tidak mengherankan jika ada gumpalan hitam.",
        "faq2Q": "Warna latar belakang apa yang harus saya pilih?",
        "faq2A": "Putih adalah default aman untuk dokumen, e-niaga, dan sebagian besar pasar. Abu-abu muda cocok untuk fotografi produk. Setelan hitam dengan desain bertema gelap. Pemilih warna khusus mencakup warna merek.",
        "faq3Q": "Apakah gambar saya diunggah ke server?",
        "faq3A": "Tidak. Konverter ini berjalan 100% di browser Anda menggunakan Canvas. Gambar Anda tidak pernah keluar dari perangkat — tidak ada yang diunggah, disimpan, atau dicatat.",
        "faq4Q": "Pengaturan kualitas JPG apa yang harus saya gunakan?",
        "faq4A": "92% adalah default yang seimbang — tanpa kehilangan visual untuk sebagian besar foto dengan ukuran file yang wajar. Gunakan 100% untuk pencetakan atau pengarsipan. Gunakan 75-85% jika Anda memerlukan file yang lebih kecil untuk web dan tidak keberatan dengan kompresi ringan.",
        "faq5Q": "Bisakah saya mengonversi WebP atau format lain juga?",
        "faq5A": "Ya. Konverter menerima PNG, WebP, dan format apa pun yang dapat didekode oleh browser Anda. Outputnya selalu JPG.",
        "moreTitle": "Alat MiaoCut Lainnya",
        "moreLinkJpgPngTitle": "JPG ke Transparan PNG →",
        "moreLinkJpgPngDesc": "Kebalikannya — menghapus latar belakang JPG dan mengekspor PNG transparan.",
        "moreLinkProductTitle": "Penghapus Latar Belakang Foto Produk →",
        "moreLinkProductDesc": "Gambar produk berlatar belakang putih dan kanvas persegi untuk e-commerce.",
        "moreLinkHomeTitle": "Penghapus Latar Belakang Serbaguna →",
        "moreLinkHomeDesc": "Logo, hewan peliharaan, tepian yang rumit, apa pun.",
        "bookmarkText": "Seperti MiaoCut? Tekan",
        "bookmarkSuffix": "untuk menandai, konversi berikutnya hanya berjarak 1 detik!",
        "errFormat": "Format file tidak didukung. Gunakan PNG, WebP, atau format gambar apa pun yang didukung browser Anda.",
        "errLoad": "Gagal memuat gambar. Coba file lain.",
        "errTooLarge": "Gambar terlalu besar. Coba file di bawah 50 MB.",
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
        "toolRestoreTitle": "Foto lama"
    },
    "pt-br": {
        "pageTitle": "Conversor PNG para JPG - Preenchimento automático inteligente de fundo branco | MiaoCut",
        "metaDescription": "Converta PNG em JPG gratuitamente com um fundo branco inteligente. Evite o feio preenchimento preto que os conversores ingênuos produzem – escolha branco, cinza, preto ou qualquer cor personalizada, defina a qualidade e faça o download.",
        "metaKeywords": "png para jpg, png para jpg fundo branco, png para jpeg, converter png para jpg, png transparente para jpg, conversor de png para jpg, png para jpg com fundo, png para jpeg com fundo branco, png grátis para jpg",
        "ogTitle": "Conversor PNG para JPG - Preenchimento automático inteligente de fundo branco | MiaoCut",
        "ogDescription": "Converta PNG em JPG gratuitamente com um fundo branco inteligente. Evite o feio preenchimento preto que os conversores ingênuos produzem – escolha branco, cinza, preto ou qualquer cor personalizada, defina a qualidade e faça o download.",
        "ogLocale": "pt_BR",
        "navBg": "Removedor de fundo",
        "navProduct": "Produto",
        "navPortrait": "Retrato",
        "navWatermark": "Marca d’água",
        "navId": "Foto ID",
        "navRestore": "Foto antiga",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "Conversor PNG para JPG",
        "title": "Conversor PNG para JPG com fundo branco",
        "subtitle": "JPG não armazena transparência. Achatamos seu PNG em branco (ou em qualquer cor que você escolher) para que você nunca obtenha um fundo preto surpresa. Funciona 100% no seu navegador.",
        "dropzoneTitle": "Arraste e solte PNG aqui ou clique para fazer upload",
        "dropzoneSub": "PNG / WebP / GIF — convertido para JPG em seu navegador",
        "paneOriginal": "Original (PNG)",
        "paneResult": "Resultado (JPG)",
        "bgLabel": "Cor de fundo",
        "bgWhite": "Branco",
        "bgGray": "Cinza claro",
        "bgBlack": "Preto",
        "bgCustom": "Personalizado",
        "qualityLabel": "Qualidade JPG",
        "qualitySmaller": "Arquivo menor",
        "qualityBetter": "Melhor qualidade",
        "sizeReadoutEmpty": "A visualização será atualizada quando você alterar as configurações.",
        "sizeReadoutFmt": "Tamanho estimado do JPG: {tamanho}",
        "downloadBtn": "Baixar JPG",
        "replaceBtn": "Converter outro",
        "trustTitle": "100% privado – roda no seu navegador.",
        "trustSub": "Sua imagem nunca sai do seu dispositivo. Sem upload, sem servidor, sem logs.",
        "seoIntro": "O conversor PNG para JPG do MiaoCut é executado inteiramente em seu navegador usando o Canvas. Os pixels transparentes são achatados em uma cor de fundo de sua escolha (branco, cinza, preto ou personalizado) e a qualidade do JPG é totalmente ajustável. Nada é carregado – sua imagem permanece no seu dispositivo.",
        "howItWorks": "Como converter PNG em JPG com fundo branco",
        "howStep1Title": "1. Deixe cair seu PNG",
        "howStep1Desc": "Solte um PNG (ou WebP) na zona de upload. Tudo roda no seu navegador – sua imagem não é carregada em lugar nenhum.",
        "howStep2Title": "2. Escolha uma cor de fundo",
        "howStep2Desc": "Branco é o padrão. Mude para cinza, preto ou escolha qualquer cor personalizada – a visualização é atualizada ao vivo.",
        "howStep3Title": "3. Baixe JPG",
        "howStep3Desc": "Ajuste a qualidade do JPG se desejar e faça o download. O resultado é um JPG limpo com a cor de fundo que você escolheu.",
        "whyTitle": "Por que usar isso em vez de um conversor genérico",
        "why1Title": "Sem fundo preto surpresa",
        "why1Desc": "Os conversores ingênuos preenchem pixels transparentes com preto porque esse é o padrão. O padrão é branco e permitimos que você o altere antes de fazer o download.",
        "why2Title": "100% Privado",
        "why2Desc": "Conversão somente no navegador. Seu arquivo nunca é carregado, registrado ou visto por ninguém — inclusive nós.",
        "why3Title": "Qualidade ajustável",
        "why3Desc": "Controle deslizante de 60% a 100%. Encontre o ponto ideal entre tamanho e qualidade do arquivo para seu caso de uso.",
        "why4Title": "Precisa remover a transparência?",
        "why4Desc": "Se o seu PNG ainda tiver um fundo e você quiser um recorte verdadeiramente transparente, experimente nossa ferramenta JPG → Transparent PNG.",
        "tipsTitle": "Dicas para diferentes casos de uso",
        "tip1": "Para documentos e para a maioria dos mercados, opte pelo fundo branco e qualidade de 92% – é o padrão seguro universal.",
        "tip2": "Para plataformas de comércio eletrônico que exigem branco puro (255.255.255), a predefinição Branco é exata em bytes — sem tingimento.",
        "tip3": "Para impressão ou arquivamento, defina a qualidade como 100%. O tamanho do arquivo aumenta, mas o codificador praticamente não produz artefatos de compactação.",
        "tip4": "Para imagens vinculadas à Web em que o tamanho é mais importante do que a perfeição visual, 75-85% reduz drasticamente o tamanho do arquivo, com apenas uma leve perda de qualidade.",
        "faqTitle": "Perguntas frequentes",
        "faq1Q": "Por que meu PNG fica com um fundo preto quando eu o converto para JPG?",
        "faq1A": "JPG não oferece suporte a transparência. Quando um conversor ingênuo nivela um PNG transparente, ele preenche os pixels alfa com preto por padrão. MiaoCut os preenche com branco (ou qualquer cor que você escolher) para que o resultado fique do jeito que você espera - sem manchas pretas surpresa.",
        "faq2Q": "Que cor de fundo devo escolher?",
        "faq2A": "Branco é o padrão seguro para documentos, comércio eletrônico e a maioria dos mercados. Cinza claro funciona bem para fotografia de produtos. O preto combina com designs com temas escuros. O seletor de cores personalizado abrange as cores da marca.",
        "faq3Q": "Minha imagem é carregada em um servidor?",
        "faq3A": "Não. Este conversor roda 100% no seu navegador usando Canvas. Sua imagem nunca sai do seu dispositivo – nada é carregado, armazenado ou registrado.",
        "faq4Q": "Qual configuração de qualidade JPG devo usar?",
        "faq4A": "92% é um padrão equilibrado – visualmente sem perdas para a maioria das fotos com tamanho de arquivo razoável. Use 100% para impressão ou arquivamento. Use 75-85% se precisar de arquivos menores para a web e não se importar com compactação leve.",
        "faq5Q": "Posso converter WebP ou outros formatos também?",
        "faq5A": "Sim. O conversor aceita PNG, WebP e qualquer formato que seu navegador possa decodificar. A saída é sempre JPG.",
        "moreTitle": "Mais ferramentas MiaoCut",
        "moreLinkJpgPngTitle": "JPG para PNG transparente →",
        "moreLinkJpgPngDesc": "O inverso – retire o fundo de um JPG e exporte um PNG transparente.",
        "moreLinkProductTitle": "Removedor de fundo de foto de produto →",
        "moreLinkProductDesc": "Imagens de produtos em fundo branco e tela quadrada para comércio eletrônico.",
        "moreLinkHomeTitle": "Removedor de fundo multifuncional →",
        "moreLinkHomeDesc": "Logotipos, animais de estimação, bordas complexas, qualquer outra coisa.",
        "bookmarkText": "Gosta do MiaoCut? Imprensa",
        "bookmarkSuffix": "para marcar, a próxima conversão está a apenas 1 segundo de distância!",
        "errFormat": "Formato de arquivo não suportado. Use PNG, WebP ou qualquer formato de imagem compatível com seu navegador.",
        "errLoad": "Falha ao carregar a imagem. Experimente um arquivo diferente.",
        "errTooLarge": "A imagem é muito grande. Experimente um arquivo com menos de 50 MB.",
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
        "toolRestoreTitle": "Foto antiga"
    },
    "bn": {
        "pageTitle": "PNG থেকে JPG কনভার্টার — স্মার্ট হোয়াইট ব্যাকগ্রাউন্ড অটো-ফিল | MiaoCut",
        "metaDescription": "একটি স্মার্ট সাদা ব্যাকগ্রাউন্ড সহ PNG কে JPG বিনামূল্যে রূপান্তর করুন। সাদা, ধূসর, কালো বা যেকোনো কাস্টম রঙ, গুণমান সেট করুন এবং ডাউনলোড করুন।",
        "metaKeywords": "png থেকে jpg, png থেকে jpg সাদা ব্যাকগ্রাউন্ড, png থেকে jpeg, png থেকে jpg, স্বচ্ছ png jpg, png থেকে jpg রূপান্তরকারী, png থেকে jpg ব্যাকগ্রাউন্ড সহ, png থেকে jpeg সাদা ব্যাকগ্রাউন্ড, বিনামূল্যে png থেকে jpg",
        "ogTitle": "PNG থেকে JPG কনভার্টার — স্মার্ট হোয়াইট ব্যাকগ্রাউন্ড অটো-ফিল | MiaoCut",
        "ogDescription": "একটি স্মার্ট সাদা ব্যাকগ্রাউন্ড সহ PNG কে JPG বিনামূল্যে রূপান্তর করুন। সাদা, ধূসর, কালো বা যেকোনো কাস্টম রঙ, গুণমান সেট করুন এবং ডাউনলোড করুন।",
        "ogLocale": "bn_BD",
        "navBg": "ব্যাকগ্রাউন্ড রিমুভার",
        "navProduct": "পণ্য",
        "navPortrait": "প্রতিকৃতি",
        "navWatermark": "জলছাপ",
        "navId": "ID ছবি",
        "navRestore": "পুরানো ছবি",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "PNG থেকে JPG কনভার্টার",
        "title": "সাদা ব্যাকগ্রাউন্ড সহ PNG থেকে JPG কনভার্টার",
        "subtitle": "JPG স্বচ্ছতা সঞ্চয় করে না। আমরা আপনার PNG কে সাদা (অথবা আপনি বেছে নেওয়া যে কোনও রঙ) তে সমতল করি যাতে আপনি কখনই আশ্চর্যজনক কালো পটভূমি না পান। আপনার ব্রাউজারে 100% চলে।",
        "dropzoneTitle": "PNG এখানে টেনে আনুন অথবা আপলোড করতে ক্লিক করুন",
        "dropzoneSub": "PNG / WebP / GIF — আপনার ব্রাউজারে JPG এ রূপান্তরিত",
        "paneOriginal": "আসল (PNG)",
        "paneResult": "ফলাফল (JPG)",
        "bgLabel": "পটভূমির রঙ",
        "bgWhite": "সাদা",
        "bgGray": "হালকা ধূসর",
        "bgBlack": "কালো",
        "bgCustom": "কাস্টম",
        "qualityLabel": "JPG গুণমান",
        "qualitySmaller": "ছোট ফাইল",
        "qualityBetter": "উন্নত মানের",
        "sizeReadoutEmpty": "আপনি সেটিংস পরিবর্তন করলে প্রিভিউ আপডেট হবে।",
        "sizeReadoutFmt": "আনুমানিক JPG আকার: {size}",
        "downloadBtn": "JPG ডাউনলোড করুন",
        "replaceBtn": "অন্যকে রূপান্তর করুন",
        "trustTitle": "100% ব্যক্তিগত — আপনার ব্রাউজারে চলে।",
        "trustSub": "আপনার ইমেজ আপনার ডিভাইস ছেড়ে না. কোন আপলোড, কোন সার্ভার, কোন লগ.",
        "seoIntro": "MiaoCut-এর PNG থেকে JPG রূপান্তরকারী সম্পূর্ণরূপে ক্যানভাস ব্যবহার করে আপনার ব্রাউজারে চলে। স্বচ্ছ পিক্সেলগুলি আপনার পছন্দের পটভূমির রঙে (সাদা, ধূসর, কালো বা কাস্টম) চ্যাপ্টা হয়ে যায় এবং JPG গুণমান সম্পূর্ণরূপে সামঞ্জস্যযোগ্য। কিছুই আপলোড করা হয় না — আপনার ছবি আপনার ডিভাইসে থাকে।",
        "howItWorks": "সাদা পটভূমির সাহায্যে কীভাবে PNG থেকে JPG রূপান্তর করবেন",
        "howStep1Title": "1. আপনার PNG ফেলে দিন",
        "howStep1Desc": "আপলোড জোনে একটি PNG (বা WebP) ড্রপ করুন৷ সবকিছু আপনার ব্রাউজারে চলে — আপনার ছবি কোথাও আপলোড করা হয় না।",
        "howStep2Title": "2. একটি পটভূমির রঙ চয়ন করুন",
        "howStep2Desc": "সাদা হল ডিফল্ট। ধূসর, কালোতে স্যুইচ করুন বা যেকোনো কাস্টম রঙ বেছে নিন — পূর্বরূপ আপডেটগুলি লাইভ।",
        "howStep3Title": "3. JPG ডাউনলোড করুন",
        "howStep3Desc": "আপনি যদি চান JPG গুণমান সামঞ্জস্য করুন, তারপর ডাউনলোড করুন। ফলাফল হল আপনার বেছে নেওয়া ব্যাকগ্রাউন্ড কালার সহ একটি পরিষ্কার JPG।",
        "whyTitle": "জেনেরিক কনভার্টারের পরিবর্তে কেন এটি ব্যবহার করুন",
        "why1Title": "কোন আশ্চর্য কালো পটভূমি",
        "why1Desc": "নিষ্পাপ রূপান্তরকারীগুলি স্বচ্ছ পিক্সেলগুলি কালো দিয়ে পূরণ করে কারণ এটি ডিফল্ট। আমরা সাদাতে ডিফল্ট করি এবং ডাউনলোড করার আগে আপনাকে এটি পরিবর্তন করতে দিই।",
        "why2Title": "100% ব্যক্তিগত",
        "why2Desc": "শুধুমাত্র ব্রাউজার রূপান্তর. আপনার ফাইল আপলোড করা, লগ করা বা কেউ দেখে না — আমাদের সহ।",
        "why3Title": "সামঞ্জস্যযোগ্য গুণমান",
        "why3Desc": "60% থেকে 100% পর্যন্ত স্লাইডার। আপনার ব্যবহারের ক্ষেত্রে ফাইলের আকার এবং মানের মধ্যে মিষ্টি স্থান খুঁজুন।",
        "why4Title": "পরিবর্তে স্বচ্ছতা সরানো প্রয়োজন?",
        "why4Desc": "যদি আপনার PNG এর এখনও একটি ব্যাকগ্রাউন্ড থাকে এবং আপনি একটি সত্যিকারের স্বচ্ছ কাটআউট চান, তাহলে আমাদের JPG → স্বচ্ছ PNG টুল ব্যবহার করে দেখুন।",
        "tipsTitle": "বিভিন্ন ব্যবহারের ক্ষেত্রে টিপস",
        "tip1": "নথি এবং বেশিরভাগ মার্কেটপ্লেসের জন্য, সাদা ব্যাকগ্রাউন্ড এবং 92% মানের সাথে লেগে থাকুন - এটি সর্বজনীন নিরাপদ ডিফল্ট।",
        "tip2": "ই-কমার্স প্ল্যাটফর্মগুলির জন্য যেগুলির জন্য বিশুদ্ধ সাদা (255,255,255) প্রয়োজন, হোয়াইট প্রিসেটটি বাইট-সঠিক - কোনও রঙ নেই৷",
        "tip3": "মুদ্রণ বা সংরক্ষণাগারের জন্য, গুণমান 100% সেট করুন। ফাইলের আকার বৃদ্ধি পায় কিন্তু এনকোডার কার্যত কোন কম্প্রেশন আর্টিফ্যাক্ট তৈরি করে না।",
        "tip4": "ওয়েব-বাউন্ড ইমেজগুলির জন্য যেখানে আকার দৃশ্যমান পরিপূর্ণতার চেয়ে বেশি গুরুত্বপূর্ণ, 75-85% নাটকীয়ভাবে ফাইলের আকার হ্রাস পায় এবং শুধুমাত্র হালকা গুণমান হ্রাস পায়।",
        "faqTitle": "প্রায়শই জিজ্ঞাসিত প্রশ্নাবলী",
        "faq1Q": "কেন আমার PNG কালো পটভূমি পায় যখন আমি এটিকে JPG তে রূপান্তর করি?",
        "faq1A": "JPG স্বচ্ছতা সমর্থন করে না। যখন একটি নিষ্পাপ রূপান্তরকারী একটি স্বচ্ছ PNG সমতল করে, এটি ডিফল্টরূপে আলফা পিক্সেলগুলিকে কালো দিয়ে পূর্ণ করে। MiaoCut এগুলিকে সাদা (অথবা আপনি বেছে নেওয়া যে কোনও রঙ) দিয়ে পূর্ণ করে যাতে ফলাফলটি আপনার প্রত্যাশা মতো দেখায় — আশ্চর্যজনক কালো ব্লবস নেই৷",
        "faq2Q": "আমি কি ব্যাকগ্রাউন্ড রঙ বাছাই করা উচিত?",
        "faq2A": "নথি, ই-কমার্স এবং বেশিরভাগ মার্কেটপ্লেসের জন্য সাদা হল নিরাপদ ডিফল্ট। হালকা ধূসর পণ্য ফটোগ্রাফির জন্য ভাল কাজ করে। কালো স্যুট গাঢ়-থিমযুক্ত ডিজাইন. কাস্টম কালার পিকার ব্র্যান্ডের রং কভার করে।",
        "faq3Q": "আমার ছবি একটি সার্ভারে আপলোড করা হয়?",
        "faq3A": "না। এই কনভার্টারটি ক্যানভাস ব্যবহার করে আপনার ব্রাউজারে 100% চলে। আপনার ছবি কখনই আপনার ডিভাইস ছেড়ে যায় না — কিছুই আপলোড, সংরক্ষণ বা লগ করা হয় না।",
        "faq4Q": "আমার কোন JPG মানের সেটিং ব্যবহার করা উচিত?",
        "faq4A": "92% হল একটি ভারসাম্যপূর্ণ ডিফল্ট — যুক্তিসঙ্গত ফাইলের আকার সহ বেশিরভাগ ছবির জন্য দৃশ্যত ক্ষতিহীন। মুদ্রণ বা সংরক্ষণাগারের জন্য 100% ব্যবহার করুন। আপনার যদি ওয়েবের জন্য ছোট ফাইলের প্রয়োজন হয় এবং হালকা কম্প্রেশনে কিছু মনে করবেন না তাহলে 75-85% ব্যবহার করুন।",
        "faq5Q": "আমি কি WebP বা অন্যান্য ফরম্যাটেও রূপান্তর করতে পারি?",
        "faq5A": "হ্যাঁ। রূপান্তরকারী PNG, WebP, এবং আপনার ব্রাউজার ডিকোড করতে পারে এমন যেকোনো বিন্যাস গ্রহণ করে। আউটপুট সবসময় JPG হয়।",
        "moreTitle": "আরও MiaoCut টুল",
        "moreLinkJpgPngTitle": "JPG থেকে স্বচ্ছ PNG →",
        "moreLinkJpgPngDesc": "বিপরীত - একটি JPG থেকে ব্যাকগ্রাউন্ড ছিনিয়ে নিন এবং একটি স্বচ্ছ PNG রপ্তানি করুন।",
        "moreLinkProductTitle": "পণ্য ফটো পটভূমি রিমুভার →",
        "moreLinkProductDesc": "ই-কমার্সের জন্য সাদা-পটভূমি এবং বর্গাকার-ক্যানভাস পণ্যের ছবি।",
        "moreLinkHomeTitle": "সর্ব-উদ্দেশ্য ব্যাকগ্রাউন্ড রিমুভার →",
        "moreLinkHomeDesc": "লোগো, পোষা প্রাণী, জটিল প্রান্ত, অন্য কিছু।",
        "bookmarkText": "MiaoCut মত? চাপুন",
        "bookmarkSuffix": "বুকমার্ক করতে, পরবর্তী রূপান্তর মাত্র 1 সেকেন্ড দূরে!",
        "errFormat": "অসমর্থিত ফাইল বিন্যাস। PNG, WebP, বা আপনার ব্রাউজার সমর্থন করে এমন কোনো ইমেজ ফরম্যাট ব্যবহার করুন।",
        "errLoad": "ছবি লোড করতে ব্যর্থ হয়েছে. একটি ভিন্ন ফাইল চেষ্টা করুন.",
        "errTooLarge": "ছবি অনেক বড়। 50 MB এর নিচে একটি ফাইল চেষ্টা করুন।",
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
        "toolRestoreTitle": "পুরানো ছবি"
    },
    "fil": {
        "pageTitle": "PNG to JPG Converter — Auto-Fill ng Smart White Background | MiaoCut",
        "metaDescription": "I-convert ang PNG sa JPG nang libre gamit ang isang matalinong puting background. Iwasan ang pangit na black fill na nagagawa ng mga walang muwang na converter — pumili ng puti, gray, itim, o anumang custom na kulay, itakda ang kalidad, at i-download.",
        "metaKeywords": "png sa jpg, png sa jpg puting background, png sa jpeg, convert png sa jpg, transparent png sa jpg, png sa jpg converter, png sa jpg na may background, png sa jpeg na may puting background, libreng png sa jpg",
        "ogTitle": "PNG to JPG Converter — Auto-Fill ng Smart White Background | MiaoCut",
        "ogDescription": "I-convert ang PNG sa JPG nang libre gamit ang isang matalinong puting background. Iwasan ang pangit na black fill na nagagawa ng mga walang muwang na converter — pumili ng puti, gray, itim, o anumang custom na kulay, itakda ang kalidad, at i-download.",
        "ogLocale": "fil_PH",
        "navBg": "Background Remover",
        "navProduct": "produkto",
        "navPortrait": "Larawan",
        "navWatermark": "Watermark",
        "navId": "ID Larawan",
        "navRestore": "Lumang Larawan",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "PNG sa JPG Converter",
        "title": "PNG to JPG Converter na may White Background",
        "subtitle": "Ang JPG ay hindi nag-iimbak ng transparency. Itinatag namin ang iyong PNG sa puti (o anumang kulay na pipiliin mo) para hindi ka na makakuha ng sorpresang itim na background. Gumagana nang 100% sa iyong browser.",
        "dropzoneTitle": "I-drag at i-drop ang PNG dito, o i-click para mag-upload",
        "dropzoneSub": "PNG / WebP / GIF — na-convert sa JPG sa iyong browser",
        "paneOriginal": "Orihinal (PNG)",
        "paneResult": "Resulta (JPG)",
        "bgLabel": "Kulay ng background",
        "bgWhite": "Puti",
        "bgGray": "Banayad na kulay abo",
        "bgBlack": "Itim",
        "bgCustom": "Custom",
        "qualityLabel": "JPG kalidad",
        "qualitySmaller": "Mas maliit na file",
        "qualityBetter": "Mas magandang kalidad",
        "sizeReadoutEmpty": "Maa-update ang preview kapag binago mo ang mga setting.",
        "sizeReadoutFmt": "Tinantyang laki ng JPG: {size}",
        "downloadBtn": "I-download ang JPG",
        "replaceBtn": "Magpalit ng iba",
        "trustTitle": "100% pribado — tumatakbo sa iyong browser.",
        "trustSub": "Ang iyong larawan ay hindi umaalis sa iyong device. Walang upload, walang server, walang log.",
        "seoIntro": "Ang MiaoCut converter ng PNG hanggang JPG ay ganap na tumatakbo sa iyong browser gamit ang Canvas. Ang mga transparent na pixel ay na-flatten sa isang kulay ng background na gusto mo (puti, gray, itim, o custom), at ang kalidad ng JPG ay ganap na nababagay. Walang na-upload — mananatili ang iyong larawan sa iyong device.",
        "howItWorks": "Paano i-convert ang PNG sa JPG na may White Background",
        "howStep1Title": "1. I-drop ang Iyong PNG",
        "howStep1Desc": "Mag-drop ng PNG (o WebP) sa upload zone. Lahat ay tumatakbo sa iyong browser — ang iyong larawan ay hindi ina-upload kahit saan.",
        "howStep2Title": "2. Pumili ng Kulay ng Background",
        "howStep2Desc": "Ang puti ay ang default. Lumipat sa gray, itim, o pumili ng anumang custom na kulay — live ang mga update sa preview.",
        "howStep3Title": "3. I-download ang JPG",
        "howStep3Desc": "Ayusin ang kalidad ng JPG kung gusto mo, pagkatapos ay i-download. Ang resulta ay isang malinis na JPG na may kulay ng background na iyong pinili.",
        "whyTitle": "Bakit Ito Gamitin Sa halip na Isang Generic na Converter",
        "why1Title": "Walang Sorpresang Black Background",
        "why1Desc": "Pinupuno ng mga naive converter ng itim ang mga transparent na pixel dahil iyon ang default. Default namin sa puti at hinahayaan kang baguhin ito bago mag-download.",
        "why2Title": "100% Pribado",
        "why2Desc": "Browser-only na conversion. Ang iyong file ay hindi kailanman na-upload, naka-log, o nakikita ng sinuman — kabilang kami.",
        "why3Title": "Naaayos na Kalidad",
        "why3Desc": "Slider mula 60% hanggang 100%. Hanapin ang sweet spot sa pagitan ng laki at kalidad ng file para sa iyong use case.",
        "why4Title": "Kailangan Sa halip na Alisin ang Transparency?",
        "why4Desc": "Kung may background pa rin ang iyong PNG at gusto mo ng totoong transparent na cutout, subukan ang aming JPG → Transparent PNG tool.",
        "tipsTitle": "Mga Tip para sa Iba't Ibang Kaso ng Paggamit",
        "tip1": "Para sa mga dokumento at karamihan sa mga marketplace, manatili sa puting background at 92% na kalidad — ito ang pangkalahatang ligtas na default.",
        "tip2": "Para sa mga platform ng e-commerce na nangangailangan ng purong puti (255,255,255), ang White preset ay byte-eksakto — walang tinting.",
        "tip3": "Para sa print o archival, itakda ang kalidad sa 100%. Ang laki ng file ay lumalaki ngunit ang encoder ay halos walang compression artifact.",
        "tip4": "Para sa mga web-bound na larawan kung saan ang laki ay higit na mahalaga kaysa sa visual perfection, 75-85% ay bumababa nang husto sa laki ng file na may mahinang pagkawala ng kalidad lamang.",
        "faqTitle": "Mga Madalas Itanong",
        "faq1Q": "Bakit nakakakuha ng itim na background ang aking PNG kapag na-convert ko ito sa JPG?",
        "faq1A": "Hindi sinusuportahan ng JPG ang transparency. Kapag na-flatten ng isang walang muwang na converter ang isang transparent na PNG, pinupunan nito ang mga alpha pixel ng itim bilang default. Pinupuunan sila ng MiaoCut ng puti (o anumang kulay na pipiliin mo) kaya ang resulta ay mukhang tulad ng inaasahan mo — walang nakakagulat na mga itim na patak.",
        "faq2Q": "Anong kulay ng background ang dapat kong piliin?",
        "faq2A": "Ang White ay ang ligtas na default para sa mga dokumento, e-commerce, at karamihan sa mga marketplace. Gumagana nang maayos ang light grey para sa pagkuha ng litrato ng produkto. Ang itim ay nababagay sa mga disenyong may madilim na tema. Sinasaklaw ng custom na color picker ang mga kulay ng brand.",
        "faq3Q": "Na-upload ba ang aking larawan sa isang server?",
        "faq3A": "Hindi. Ang converter na ito ay tumatakbo nang 100% sa iyong browser gamit ang Canvas. Ang iyong larawan ay hindi kailanman umaalis sa iyong device — walang na-upload, nakaimbak, o naka-log.",
        "faq4Q": "Anong setting ng kalidad ng JPG ang dapat kong gamitin?",
        "faq4A": "Ang 92% ay isang balanseng default — visually lossless para sa karamihan ng mga larawan na may makatwirang laki ng file. Gamitin ang 100% para sa pag-print o pag-archive. Gumamit ng 75-85% kung kailangan mo ng mas maliliit na file para sa web at huwag isipin ang banayad na compression.",
        "faq5Q": "Maaari ko bang i-convert ang WebP o iba pang mga format?",
        "faq5A": "Oo. Tumatanggap ang converter ng PNG, WebP, at anumang format na maaaring i-decode ng iyong browser. Ang output ay palaging JPG.",
        "moreTitle": "Higit pang MiaoCut Tools",
        "moreLinkJpgPngTitle": "JPG hanggang Transparent PNG →",
        "moreLinkJpgPngDesc": "Ang reverse — tanggalin ang background sa isang JPG at i-export ang isang transparent na PNG.",
        "moreLinkProductTitle": "Pang-alis ng Background ng Larawan ng Produkto →",
        "moreLinkProductDesc": "White-background at square-canvas na mga larawan ng produkto para sa e-commerce.",
        "moreLinkHomeTitle": "All-Purpose Background Remover →",
        "moreLinkHomeDesc": "Mga logo, alagang hayop, kumplikadong mga gilid, anupaman.",
        "bookmarkText": "Tulad ng MiaoCut? Pindutin",
        "bookmarkSuffix": "upang i-bookmark, ang susunod na conversion ay 1 segundo na lang ang layo!",
        "errFormat": "Hindi sinusuportahang format ng file. Gamitin ang PNG, WebP, o anumang format ng larawan na sinusuportahan ng iyong browser.",
        "errLoad": "Nabigong i-load ang larawan. Subukan ang ibang file.",
        "errTooLarge": "Masyadong malaki ang larawan. Subukan ang isang file na wala pang 50 MB.",
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
        "toolRestoreTitle": "Lumang Larawan"
    },
    "ur": {
        "pageTitle": "PNG سے JPG کنورٹر — اسمارٹ وائٹ بیک گراؤنڈ آٹو فل | MiaoCut",
        "metaDescription": "اسمارٹ سفید پس منظر کے ساتھ PNG کو JPG مفت میں تبدیل کریں۔ بدصورت سیاہ بھرنے سے بچیں جو سادہ کنورٹرز پیدا کرتے ہیں — سفید، سرمئی، سیاہ، یا کوئی بھی حسب ضرورت رنگ چنیں، معیار سیٹ کریں اور ڈاؤن لوڈ کریں۔",
        "metaKeywords": "png سے jpg، png سے jpg سفید پس منظر، png سے jpeg، png سے jpg، شفاف png کو jpg، png سے jpg کنورٹر، png سے jpg پس منظر کے ساتھ، png سے jpeg سفید پس منظر کے ساتھ، مفت png سے jpg",
        "ogTitle": "PNG سے JPG کنورٹر — اسمارٹ وائٹ بیک گراؤنڈ آٹو فل | MiaoCut",
        "ogDescription": "اسمارٹ سفید پس منظر کے ساتھ PNG کو JPG مفت میں تبدیل کریں۔ بدصورت سیاہ بھرنے سے بچیں جو سادہ کنورٹرز پیدا کرتے ہیں — سفید، سرمئی، سیاہ، یا کوئی بھی حسب ضرورت رنگ چنیں، معیار سیٹ کریں اور ڈاؤن لوڈ کریں۔",
        "ogLocale": "ur_PK",
        "navBg": "پس منظر ہٹانے والا",
        "navProduct": "پروڈکٹ",
        "navPortrait": "پورٹریٹ",
        "navWatermark": "واٹر مارک",
        "navId": "ID تصویر",
        "navRestore": "پرانی تصویر",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "PNG سے JPG کنورٹر",
        "title": "سفید پس منظر کے ساتھ PNG سے JPG کنورٹر",
        "subtitle": "JPG شفافیت کو ذخیرہ نہیں کرتا ہے۔ ہم آپ کے PNG کو سفید (یا آپ کے منتخب کردہ کسی بھی رنگ) پر چپٹا کرتے ہیں تاکہ آپ کو کبھی بھی حیرت انگیز سیاہ پس منظر نہ ملے۔ آپ کے براؤزر میں 100% چلتا ہے۔",
        "dropzoneTitle": "PNG کو یہاں گھسیٹیں اور چھوڑیں، یا اپ لوڈ کرنے کے لیے کلک کریں۔",
        "dropzoneSub": "PNG / WebP / GIF — آپ کے براؤزر میں JPG میں تبدیل",
        "paneOriginal": "اصل (PNG)",
        "paneResult": "نتیجہ (JPG)",
        "bgLabel": "پس منظر کا رنگ",
        "bgWhite": "سفید",
        "bgGray": "ہلکا بھوری رنگ",
        "bgBlack": "سیاہ",
        "bgCustom": "حسب ضرورت",
        "qualityLabel": "JPG معیار",
        "qualitySmaller": "چھوٹی فائل",
        "qualityBetter": "بہتر معیار",
        "sizeReadoutEmpty": "جب آپ ترتیبات تبدیل کریں گے تو پیش نظارہ اپ ڈیٹ ہو جائے گا۔",
        "sizeReadoutFmt": "تخمینی JPG سائز: {size}",
        "downloadBtn": "JPG ڈاؤن لوڈ کریں۔",
        "replaceBtn": "دوسرے کو تبدیل کریں۔",
        "trustTitle": "100% نجی — آپ کے براؤزر میں چلتا ہے۔",
        "trustSub": "آپ کی تصویر آپ کے آلے کو کبھی نہیں چھوڑتی ہے۔ کوئی اپ لوڈ، کوئی سرور، کوئی نوشتہ نہیں۔",
        "seoIntro": "MiaoCut کا PNG سے JPG کنورٹر مکمل طور پر کینوس کا استعمال کرتے ہوئے آپ کے براؤزر میں چلتا ہے۔ شفاف پکسلز آپ کی پسند کے پس منظر کے رنگ (سفید، سرمئی، سیاہ، یا حسب ضرورت) پر چپٹے ہو جاتے ہیں، اور JPG معیار پوری طرح سے ایڈجسٹ ہے۔ کچھ بھی اپ لوڈ نہیں کیا گیا ہے — آپ کی تصویر آپ کے آلے پر رہتی ہے۔",
        "howItWorks": "سفید پس منظر کے ساتھ PNG کو JPG میں کیسے تبدیل کریں",
        "howStep1Title": "1. اپنا PNG چھوڑ دیں۔",
        "howStep1Desc": "اپ لوڈ زون میں PNG (یا WebP) ڈالیں۔ سب کچھ آپ کے براؤزر میں چلتا ہے — آپ کی تصویر کہیں بھی اپ لوڈ نہیں ہوتی ہے۔",
        "howStep2Title": "2. ایک پس منظر کا رنگ چنیں۔",
        "howStep2Desc": "سفید پہلے سے طے شدہ ہے۔ سرمئی، سیاہ پر سوئچ کریں، یا کوئی بھی حسب ضرورت رنگ منتخب کریں — پیش نظارہ اپ ڈیٹس لائیو۔",
        "howStep3Title": "3. JPG ڈاؤن لوڈ کریں۔",
        "howStep3Desc": "اگر آپ چاہیں تو JPG معیار کو ایڈجسٹ کریں، پھر ڈاؤن لوڈ کریں۔ نتیجہ آپ کے منتخب کردہ پس منظر کے رنگ کے ساتھ صاف JPG ہے۔",
        "whyTitle": "اسے عام کنورٹر کے بجائے کیوں استعمال کریں۔",
        "why1Title": "کوئی تعجب نہیں سیاہ پس منظر",
        "why1Desc": "سادہ کنورٹرز شفاف پکسلز کو سیاہ سے بھرتے ہیں کیونکہ یہ ڈیفالٹ ہے۔ ہم سفید پر ڈیفالٹ کرتے ہیں اور آپ کو ڈاؤن لوڈ کرنے سے پہلے اسے تبدیل کرنے دیتے ہیں۔",
        "why2Title": "100% نجی",
        "why2Desc": "صرف براؤزر کی تبدیلی۔ آپ کی فائل کبھی بھی اپ لوڈ، لاگ ان یا کسی نے نہیں دیکھی — بشمول ہم۔",
        "why3Title": "سایڈست معیار",
        "why3Desc": "60% سے 100% تک سلائیڈر۔ اپنے استعمال کے کیس کے لیے فائل کے سائز اور معیار کے درمیان میٹھی جگہ تلاش کریں۔",
        "why4Title": "اس کے بجائے شفافیت کو ہٹانے کی ضرورت ہے؟",
        "why4Desc": "اگر آپ کا PNG اب بھی پس منظر رکھتا ہے اور آپ ایک حقیقی شفاف کٹ آؤٹ چاہتے ہیں، تو ہمارا JPG → شفاف PNG ٹول آزمائیں۔",
        "tipsTitle": "استعمال کے مختلف کیسز کے لیے تجاویز",
        "tip1": "دستاویزات اور زیادہ تر بازاروں کے لیے، سفید پس منظر اور 92% معیار کے ساتھ قائم رہیں — یہ یونیورسل سیف ڈیفالٹ ہے۔",
        "tip2": "ای کامرس پلیٹ فارمز کے لیے جن کے لیے خالص سفید (255,255,255) کی ضرورت ہوتی ہے، سفید پیش سیٹ بائٹ کے عین مطابق ہے — کوئی رنگت نہیں۔",
        "tip3": "پرنٹ یا آرکائیو کے لیے، معیار کو 100% پر سیٹ کریں۔ فائل کا سائز بڑھتا ہے لیکن انکوڈر عملی طور پر کوئی کمپریشن نمونے پیدا نہیں کرتا ہے۔",
        "tip4": "ویب سے منسلک تصاویر کے لیے جہاں سائز بصری کمال سے زیادہ اہمیت رکھتا ہے، 75-85% ڈرامائی طور پر فائل کے سائز کو صرف ہلکے معیار کے نقصان کے ساتھ گرا دیتا ہے۔",
        "faqTitle": "اکثر پوچھے گئے سوالات",
        "faq1Q": "جب میں اسے JPG میں تبدیل کرتا ہوں تو میرے PNG کو سیاہ پس منظر کیوں ملتا ہے؟",
        "faq1A": "JPG شفافیت کی حمایت نہیں کرتا ہے۔ جب ایک سادہ کنورٹر ایک شفاف PNG کو چپٹا کرتا ہے، تو یہ الفا پکسلز کو بطور ڈیفالٹ سیاہ سے بھرتا ہے۔ MiaoCut انہیں سفید (یا کوئی بھی رنگ جو آپ چنتے ہیں) سے بھرتا ہے لہذا نتیجہ آپ کی توقع کے مطابق نظر آتا ہے — کوئی حیران کن سیاہ بلاب نہیں۔",
        "faq2Q": "مجھے کون سا پس منظر کا رنگ چننا چاہیے؟",
        "faq2A": "وائٹ دستاویزات، ای کامرس اور زیادہ تر بازاروں کے لیے محفوظ ڈیفالٹ ہے۔ ہلکا بھوری رنگ پروڈکٹ فوٹو گرافی کے لیے اچھا کام کرتا ہے۔ سیاہ سوٹ سیاہ تھیم والے ڈیزائن۔ حسب ضرورت رنگ چننے والا برانڈ کے رنگوں کا احاطہ کرتا ہے۔",
        "faq3Q": "کیا میری تصویر سرور پر اپ لوڈ ہے؟",
        "faq3A": "نہیں، یہ کنورٹر کینوس کا استعمال کرتے ہوئے آپ کے براؤزر میں 100% چلتا ہے۔ آپ کی تصویر کبھی بھی آپ کے آلے کو نہیں چھوڑتی ہے — کچھ بھی اپ لوڈ، اسٹور یا لاگ ان نہیں ہوتا ہے۔",
        "faq4Q": "مجھے کون سی JPG کوالٹی سیٹنگ استعمال کرنی چاہیے؟",
        "faq4A": "92% ایک متوازن ڈیفالٹ ہے — معقول فائل سائز والی زیادہ تر تصاویر کے لیے ضعف سے پاک۔ پرنٹ یا آرکائیو کے لیے 100% استعمال کریں۔ اگر آپ کو ویب کے لیے چھوٹی فائلوں کی ضرورت ہو تو 75-85% استعمال کریں اور ہلکے کمپریشن پر اعتراض نہ کریں۔",
        "faq5Q": "کیا میں WebP یا دیگر فارمیٹس کو بھی تبدیل کر سکتا ہوں؟",
        "faq5A": "جی ہاں کنورٹر PNG، WebP، اور کسی بھی فارمیٹ کو قبول کرتا ہے جسے آپ کا براؤزر ڈی کوڈ کر سکتا ہے۔ آؤٹ پٹ ہمیشہ JPG ہوتا ہے۔",
        "moreTitle": "مزید MiaoCut ٹولز",
        "moreLinkJpgPngTitle": "JPG سے شفاف PNG →",
        "moreLinkJpgPngDesc": "الٹا — پس منظر کو JPG سے باہر نکالیں اور ایک شفاف PNG برآمد کریں۔",
        "moreLinkProductTitle": "پروڈکٹ فوٹو بیک گراؤنڈ ریموور →",
        "moreLinkProductDesc": "ای کامرس کے لیے سفید پس منظر اور مربع کینوس پروڈکٹ کی تصاویر۔",
        "moreLinkHomeTitle": "تمام مقصدی پس منظر ہٹانے والا →",
        "moreLinkHomeDesc": "لوگو، پالتو جانور، پیچیدہ کنارے، کچھ اور۔",
        "bookmarkText": "MiaoCut کی طرح؟ دبائیں",
        "bookmarkSuffix": "بک مارک کرنے کے لیے، اگلی تبدیلی صرف 1 سیکنڈ کی دوری پر ہے!",
        "errFormat": "غیر تعاون یافتہ فائل فارمیٹ۔ PNG، WebP، یا کوئی بھی تصویری فارمیٹ استعمال کریں جو آپ کا براؤزر سپورٹ کرتا ہے۔",
        "errLoad": "تصویر لوڈ کرنے میں ناکام۔ ایک مختلف فائل آزمائیں۔",
        "errTooLarge": "تصویر بہت بڑی ہے۔ 50 MB سے کم کی فائل آزمائیں۔",
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
        "toolRestoreTitle": "پرانی تصویر"
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

    // ============================================================
    // 当前语言：从 <html lang> 推断（构建时由 build-i18n.mjs 写死）
    // 不用 localStorage 决定语言，每个 URL 已经是预渲染好的对应语种，让 Google 能分别索引。
    // ============================================================
    const _htmlLang = (document.documentElement.lang || 'en').toLowerCase();
    const state = {
        lang: localeFromHtmlLang(_htmlLang),
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
            if (target === state.lang) return;
            window.location.assign(alternateUrlFor(target) + window.location.search + window.location.hash);
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
