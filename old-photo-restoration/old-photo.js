(function () {
    'use strict';

    const API_BASE = 'https://api2.miaocut.app';
    const i18n = {
    "en": {
        "pageTitle": "Free AI Old Photo Restoration & Upscaler | MiaoCut",
        "metaDescription": "Free AI old photo restoration online. Reduce noise, recover faded contrast, sharpen soft details, and upscale vintage family photos to print-ready resolution.",
        "metaKeywords": "old photo restoration, restore old photos, photo enhancer, photo upscale, repair old photo, vintage photo restoration, ai photo repair, fix faded photos, family photo restore",
        "ogTitle": "Free AI Old Photo Restoration & Upscaler | MiaoCut",
        "ogDescription": "Reduce noise, recover faded contrast, sharpen details, and upscale vintage family photos. Free, no signup.",
        "ogLocale": "en_US",
        "navBg": "Background Remover",
        "navId": "ID Photo",
        "navRestore": "Old Photo",
        "navWatermark": "Watermark",
        "navPortrait": "Portrait",
        "navProduct": "Product",
        "eyebrow": "Vintage photos, family albums, scanned prints",
        "heroTitle": "AI Old Photo Restoration & Upscaler",
        "heroSub": "Recover faded contrast, reduce noise, sharpen soft details, and upscale vintage family photos to print-ready resolution.",
        "privacyNotice": "Your family memories stay private.",
        "privacyBody": "Photos are processed in-memory on the server and discarded immediately after the result is returned. No storage, no AI training, no signup required.",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "Old Photo Restoration",
        "uploadText": "Click to upload JPG, PNG, or WebP",
        "uploadHint": "Scanned photos and phone captures both work",
        "replaceHint": "Click the preview to replace this photo",
        "strengthLabel": "Repair strength",
        "strengthGentle": "Gentle",
        "strengthBalanced": "Balanced",
        "strengthStrong": "Strong",
        "scaleLabel": "Output scale",
        "restoreBtn": "Restore Photo",
        "previewTitle": "Preview",
        "previewSub": "Compare the uploaded photo with the restored output.",
        "downloadBtn": "Download",
        "beforeLabel": "Before",
        "afterLabel": "After",
        "beforeEmpty": "Original photo will appear here",
        "afterEmpty": "Restored photo will appear here",
        "flow1": "Restore texture",
        "flow1Body": "Reduce scan noise and bring faded tonal range back into the photo.",
        "flow2": "Enhance details",
        "flow2Body": "Sharpen soft edges and prepare old prints for larger screens.",
        "flow3": "Keep private",
        "flow3Body": "Images follow the same in-memory processing policy as other MiaoCut tools.",
        "uploadFirst": "Upload a photo first.",
        "formatErr": "Only JPG / PNG / WebP formats are supported",
        "uploading": "Uploading...",
        "processing": "Restoring...",
        "ready": "Ready",
        "failed": "Restore failed. Please try another photo.",
        "howToTitle": "How to Restore an Old Photo",
        "howStep1Title": "1. Upload your old photo",
        "howStep1Body": "Upload a scanned print or phone capture in JPG, PNG, or WebP. Both work — though scanned originals usually give the best result.",
        "howStep2Title": "2. Choose repair strength and scale",
        "howStep2Body": "Pick a repair strength (gentle / balanced / strong) based on how damaged the photo is, plus an output scale (1x / 2x / 4x) for prints or screen display.",
        "howStep3Title": "3. Compare before/after and download",
        "howStep3Body": "Side-by-side preview shows the original and restored result. If you like it, download the restored image.",
        "faqTitle": "Frequently Asked Questions",
        "faq1Q": "How does AI old photo restoration work?",
        "faq1A": "Upload your old photo, choose a repair strength (gentle, balanced, or strong), and select an output scale. MiaoCut applies AI denoising, contrast recovery, and detail sharpening to bring faded or noisy photos back to a cleaner state.",
        "faq2Q": "Will it modify or damage my original photo?",
        "faq2A": "No. Your original is never modified. MiaoCut processes a copy on the server, shows you a before/after preview, and you decide whether to download the restored version.",
        "faq3Q": "Is my photo private and safe?",
        "faq3A": "Yes. Photos are processed in-memory on the server and discarded immediately after the restored result is returned. We never store your image, never use it for AI training, and there is no signup required. Your family memories never leave your control.",
        "faq4Q": "Can it restore heavily damaged or torn photos?",
        "faq4A": "MiaoCut works best on faded, noisy, or low-contrast photos. For very heavy damage (large tears or missing areas), results are limited — for filling small damaged areas you can try the watermark remover (paint-and-fill).",
        "faq5Q": "Can I print the restored photo?",
        "faq5A": "Yes. The restored output is exported at your chosen scale (1x, 2x, or 4x). Use 2x or 4x if you plan to print at larger sizes or display on high-resolution screens.",
        "faq6Q": "Does it colorize black-and-white photos?",
        "faq6A": "Not yet. The current MiaoCut focus is denoising, sharpening, and contrast recovery. If colorization would be useful for you, let us know via the feedback widget.",
        "moreTitle": "More MiaoCut Tools",
        "moreLinkPortraitTitle": "Portrait Background Remover →",
        "moreLinkPortraitDesc": "Make clean headshots, profile pictures, and resume photos.",
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
        "toolRestoreTitle": "Old Photo"
    },
    "zh": {
        "pageTitle": "免费 AI 老照片修复与高清放大 | MiaoCut",
        "metaDescription": "免费在线 AI 老照片修复工具，一键为褪色、模糊、划痕或破损的家庭老照片降噪、还原对比度、增强细节并智能放大，重现清晰自然的画面。无需安装、无需注册，纯内存处理保护隐私，可导出可打印的高分辨率图片，让珍贵回忆焕然一新。",
        "metaKeywords": "老照片修复,照片修复,老照片高清,照片增强,照片放大,AI 修复老照片,免费修复老照片,旧照片修复",
        "ogTitle": "免费 AI 老照片修复 | MiaoCut",
        "ogDescription": "降噪、还原褪色、增强细节，把老家庭照片重新变清晰。免费、无需注册。",
        "ogLocale": "zh_CN",
        "navBg": "AI 抠图",
        "navId": "证件照",
        "navRestore": "老照片修复",
        "navWatermark": "去水印",
        "navPortrait": "人像",
        "navProduct": "商品图",
        "eyebrow": "老照片、家庭相册、扫描照片",
        "heroTitle": "AI 老照片修复与高清放大",
        "heroSub": "还原褪色对比度、降低扫描噪点、增强模糊细节，并放大老家庭照片到适合打印的高分辨率。",
        "privacyNotice": "你的家庭记忆完全私密。",
        "privacyBody": "照片在服务器内存中处理，结果返回后立即销毁。绝不存储、绝不用于 AI 训练、无需注册账号。",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "老照片修复",
        "uploadText": "点击上传 JPG、PNG 或 WebP",
        "uploadHint": "扫描件和手机翻拍照片都可以",
        "replaceHint": "点击预览可替换照片",
        "strengthLabel": "修复强度",
        "strengthGentle": "轻柔",
        "strengthBalanced": "均衡",
        "strengthStrong": "强力",
        "scaleLabel": "输出倍率",
        "restoreBtn": "修复照片",
        "previewTitle": "预览",
        "previewSub": "对比原图和修复后的高清结果。",
        "downloadBtn": "下载",
        "beforeLabel": "修复前",
        "afterLabel": "修复后",
        "beforeEmpty": "原图会显示在这里",
        "afterEmpty": "修复结果会显示在这里",
        "flow1": "恢复质感",
        "flow1Body": "降低扫描噪点，让褪色照片重新拉开明暗层次。",
        "flow2": "增强细节",
        "flow2Body": "锐化柔软边缘，让旧照片更适合大屏查看和保存。",
        "flow3": "保护隐私",
        "flow3Body": "沿用 MiaoCut 的纯内存处理策略，照片不会用于训练。",
        "uploadFirst": "请先上传照片。",
        "formatErr": "仅支持 JPG / PNG / WebP 格式的图片",
        "uploading": "上传中...",
        "processing": "修复中...",
        "ready": "已完成",
        "failed": "修复失败，请换一张照片再试。",
        "howToTitle": "如何修复一张老照片",
        "howStep1Title": "1. 上传你的老照片",
        "howStep1Body": "扫描件或手机翻拍照片均可，支持 JPG、PNG、WebP。一般来说扫描原件效果更好。",
        "howStep2Title": "2. 选择修复强度和倍率",
        "howStep2Body": "根据照片损伤程度选择修复强度（轻柔 / 均衡 / 强力），并选择输出倍率（1x / 2x / 4x），打印或大屏显示推荐高倍率。",
        "howStep3Title": "3. 对比效果并下载",
        "howStep3Body": "左右对比预览原图与修复后效果，满意后下载修复版本。",
        "faqTitle": "常见问题",
        "faq1Q": "AI 老照片修复是怎么工作的？",
        "faq1A": "上传你的老照片，选择修复强度（轻柔 / 均衡 / 强力）和输出倍率，MiaoCut 会用 AI 自动降噪、还原对比度、增强细节，让褪色或噪点严重的老照片更清晰。",
        "faq2Q": "会修改或损坏我的原图吗？",
        "faq2A": "不会。原图永远不会被修改。MiaoCut 在服务器上处理一份副本，给你看修复前后对比，由你决定是否下载修复版本。",
        "faq3Q": "我的照片安全吗？",
        "faq3A": "安全。照片纯内存处理，修复结果返回后立即销毁。我们绝不存储你的图片、绝不用于 AI 训练，也无需注册账号。你的家庭回忆始终在你掌控之中。",
        "faq4Q": "能修复严重破损或撕裂的老照片吗？",
        "faq4A": "MiaoCut 最适合处理褪色、噪点、低对比度的老照片。如果损伤特别严重（大面积撕裂或缺失），效果会受限 —— 小范围破损可以试试去水印工具的\"涂抹修复\"。",
        "faq5Q": "修复后的照片可以打印吗？",
        "faq5A": "可以。修复结果按你选择的倍率（1x / 2x / 4x）导出。打印大尺寸照片或在高分辨率屏幕显示时建议用 2x 或 4x。",
        "faq6Q": "可以给黑白老照片上色吗？",
        "faq6A": "暂时不支持。当前老照片修复聚焦在降噪、增强、还原对比度。如果需要照片上色，欢迎通过反馈组件告诉我们。",
        "moreTitle": "更多 MiaoCut 工具",
        "moreLinkPortraitTitle": "人像抠图 →",
        "moreLinkPortraitDesc": "制作干净的头像、简历照、社媒头像。",
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
        "toolRestoreTitle": "老照片"
    },
    "hi": {
        "pageTitle": "मुफ़्त AI पुरानी फ़ोटो पुनर्स्थापन और अपस्केलर | MiaoCut",
        "metaDescription": "मुफ़्त AI पुरानी फ़ोटो पुनर्स्थापना ऑनलाइन। शोर कम करें, फीके कंट्रास्ट को पुनः प्राप्त करें, नरम विवरणों को तेज करें, और प्रिंट-तैयार रिज़ॉल्यूशन के लिए उच्च श्रेणी की पुरानी पारिवारिक तस्वीरें लें।",
        "metaKeywords": "पुरानी फोटो पुनर्स्थापना, पुरानी तस्वीरें पुनर्स्थापित करें, फोटो बढ़ाने वाला, फोटो अपस्केल, पुरानी फोटो मरम्मत, विंटेज फोटो पुनर्स्थापन, एआई फोटो मरम्मत, फीकी तस्वीरें ठीक करें, पारिवारिक फोटो पुनर्स्थापित करें",
        "ogTitle": "मुफ़्त AI पुरानी फ़ोटो पुनर्स्थापन और अपस्केलर | MiaoCut",
        "ogDescription": "शोर कम करें, फीके कंट्रास्ट को पुनः प्राप्त करें, विवरण को पैना करें, और शानदार पुरानी पारिवारिक तस्वीरें लें। मुफ़्त, कोई साइनअप नहीं.",
        "ogLocale": "hi_IN",
        "navBg": "पृष्ठभूमि हटानेवाला",
        "navId": "ID फोटो",
        "navRestore": "पुरानी फोटो",
        "navWatermark": "वाटर-मार्क",
        "navPortrait": "चित्र",
        "navProduct": "उत्पाद",
        "eyebrow": "पुरानी तस्वीरें, पारिवारिक एल्बम, स्कैन किए गए प्रिंट",
        "heroTitle": "AI पुरानी फोटो बहाली और अपस्केलर",
        "heroSub": "फीके कंट्रास्ट को पुनर्प्राप्त करें, शोर को कम करें, नरम विवरणों को तेज करें, और प्रिंट-तैयार रिज़ॉल्यूशन के लिए उच्च श्रेणी की पुरानी पारिवारिक तस्वीरें लें।",
        "privacyNotice": "आपकी पारिवारिक यादें निजी रहती हैं।",
        "privacyBody": "फ़ोटो को सर्वर पर मेमोरी में संसाधित किया जाता है और परिणाम आने के तुरंत बाद हटा दिया जाता है। कोई भंडारण नहीं, कोई AI प्रशिक्षण नहीं, कोई साइनअप आवश्यक नहीं।",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "पुरानी फोटो बहाली",
        "uploadText": "JPG, PNG, या WebP अपलोड करने के लिए क्लिक करें",
        "uploadHint": "स्कैन की गई तस्वीरें और फ़ोन कैप्चर दोनों काम करते हैं",
        "replaceHint": "इस फ़ोटो को बदलने के लिए पूर्वावलोकन पर क्लिक करें",
        "strengthLabel": "मरम्मत की ताकत",
        "strengthGentle": "कोमल",
        "strengthBalanced": "संतुलित",
        "strengthStrong": "मज़बूत",
        "scaleLabel": "आउटपुट स्केल",
        "restoreBtn": "फ़ोटो पुनर्स्थापित करें",
        "previewTitle": "पूर्व दर्शन",
        "previewSub": "अपलोड किए गए फोटो की तुलना पुनर्स्थापित आउटपुट से करें।",
        "downloadBtn": "डाउनलोड करना",
        "beforeLabel": "पहले",
        "afterLabel": "बाद",
        "beforeEmpty": "मूल फ़ोटो यहां दिखाई देगी",
        "afterEmpty": "पुनर्स्थापित फ़ोटो यहां दिखाई देगी",
        "flow1": "बनावट पुनर्स्थापित करें",
        "flow1Body": "स्कैन शोर कम करें और फ़ोटो में फीकी टोनल रेंज वापस लाएं।",
        "flow2": "विवरण बढ़ाएँ",
        "flow2Body": "नरम किनारों को तेज़ करें और बड़ी स्क्रीन के लिए पुराने प्रिंट तैयार करें।",
        "flow3": "निजी रखें",
        "flow3Body": "छवियाँ अन्य MiaoCut टूल की तरह ही इन-मेमोरी प्रोसेसिंग नीति का पालन करती हैं।",
        "uploadFirst": "पहले एक फोटो अपलोड करें.",
        "formatErr": "केवल JPG / PNG / WebP प्रारूप समर्थित हैं",
        "uploading": "अपलोड हो रहा है...",
        "processing": "पुनर्स्थापित किया जा रहा है...",
        "ready": "तैयार",
        "failed": "पुनर्स्थापना विफल. कृपया कोई अन्य फ़ोटो आज़माएँ.",
        "howToTitle": "किसी पुरानी फोटो को कैसे पुनर्स्थापित करें",
        "howStep1Title": "1. अपना पुराना फोटो अपलोड करें",
        "howStep1Body": "JPG, PNG, या WebP में स्कैन किया हुआ प्रिंट या फ़ोन कैप्चर अपलोड करें। दोनों काम करते हैं - हालाँकि स्कैन की गई मूल प्रतियाँ आमतौर पर सर्वोत्तम परिणाम देती हैं।",
        "howStep2Title": "2. मरम्मत की ताकत और पैमाना चुनें",
        "howStep2Body": "फोटो कितना क्षतिग्रस्त है, इसके आधार पर मरम्मत शक्ति (कोमल / संतुलित / मजबूत) चुनें, साथ ही प्रिंट या स्क्रीन डिस्प्ले के लिए आउटपुट स्केल (1x / 2x / 4x) चुनें।",
        "howStep3Title": "3. पहले/बाद में तुलना करें और डाउनलोड करें",
        "howStep3Body": "साथ-साथ पूर्वावलोकन मूल और पुनर्स्थापित परिणाम दिखाता है। यदि आपको यह पसंद है, तो पुनर्स्थापित छवि डाउनलोड करें।",
        "faqTitle": "अक्सर पूछे जाने वाले प्रश्नों",
        "faq1Q": "AI पुरानी फोटो बहाली कैसे काम करती है?",
        "faq1A": "अपनी पुरानी तस्वीर अपलोड करें, मरम्मत क्षमता (सौम्य, संतुलित या मजबूत) चुनें और आउटपुट स्केल चुनें। MiaoCut फीकी या शोर वाली तस्वीरों को साफ़ स्थिति में वापस लाने के लिए AI डीनोइज़िंग, कंट्रास्ट रिकवरी और डिटेल शार्पनिंग लागू करता है।",
        "faq2Q": "क्या यह मेरी मूल फ़ोटो को संशोधित या क्षतिग्रस्त कर देगा?",
        "faq2A": "नहीं, आपका मूल कभी संशोधित नहीं किया गया है। MiaoCut सर्वर पर एक प्रतिलिपि संसाधित करता है, आपको पहले/बाद का पूर्वावलोकन दिखाता है, और आप तय करते हैं कि पुनर्स्थापित संस्करण डाउनलोड करना है या नहीं।",
        "faq3Q": "क्या मेरी फ़ोटो निजी और सुरक्षित है?",
        "faq3A": "हाँ। फ़ोटो को सर्वर पर मेमोरी में संसाधित किया जाता है और पुनर्स्थापित परिणाम वापस आने के तुरंत बाद हटा दिया जाता है। हम कभी भी आपकी छवि संग्रहीत नहीं करते हैं, इसे AI प्रशिक्षण के लिए कभी उपयोग नहीं करते हैं, और कोई साइनअप आवश्यक नहीं है। आपकी पारिवारिक यादें आपका नियंत्रण कभी नहीं छोड़तीं।",
        "faq4Q": "क्या यह अत्यधिक क्षतिग्रस्त या फटी हुई तस्वीरों को पुनर्स्थापित कर सकता है?",
        "faq4A": "MiaoCut फीकी, शोर वाली या कम कंट्रास्ट वाली तस्वीरों पर सबसे अच्छा काम करता है। बहुत भारी क्षति (बड़े फटे या गायब क्षेत्र) के लिए, परिणाम सीमित हैं - छोटे क्षतिग्रस्त क्षेत्रों को भरने के लिए आप वॉटरमार्क रिमूवर (पेंट-एंड-फिल) आज़मा सकते हैं।",
        "faq5Q": "क्या मैं पुनर्स्थापित फ़ोटो प्रिंट कर सकता हूँ?",
        "faq5A": "हाँ। पुनर्स्थापित आउटपुट आपके चुने हुए पैमाने (1x, 2x, या 4x) पर निर्यात किया जाता है। यदि आप बड़े आकार में प्रिंट करने या उच्च-रिज़ॉल्यूशन स्क्रीन पर प्रदर्शित करने की योजना बना रहे हैं तो 2x या 4x का उपयोग करें।",
        "faq6Q": "क्या यह श्वेत-श्याम फ़ोटो को रंगीन करता है?",
        "faq6A": "अभी तक नहीं। वर्तमान MiaoCut फोकस डीनोइज़िंग, शार्पनिंग और कंट्रास्ट रिकवरी पर है। यदि रंगीकरण आपके लिए उपयोगी होगा, तो हमें फीडबैक विजेट के माध्यम से बताएं।",
        "moreTitle": "अधिक MiaoCut उपकरण",
        "moreLinkPortraitTitle": "पोर्ट्रेट बैकग्राउंड रिमूवर →",
        "moreLinkPortraitDesc": "साफ़ हेडशॉट, प्रोफ़ाइल चित्र और बायोडाटा फ़ोटो बनाएं।",
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
        "toolRestoreTitle": "पुरानी फोटो"
    },
    "id": {
        "pageTitle": "Gratis Restorasi & Peningkatan Foto Lama AI | MiaoCut",
        "metaDescription": "Restorasi foto lama AI gratis secara online. Kurangi noise, pulihkan kontras yang pudar, pertajam detail lembut, dan tingkatkan foto keluarga vintage ke resolusi siap cetak.",
        "metaKeywords": "restorasi foto lama, pulihkan foto lama, penyempurna foto, foto kelas atas, perbaiki foto lama, restorasi foto vintage, perbaikan foto ai, perbaiki foto pudar, pemulihan foto keluarga",
        "ogTitle": "Gratis Restorasi & Peningkatan Foto Lama AI | MiaoCut",
        "ogDescription": "Kurangi noise, pulihkan kontras yang memudar, pertajam detail, dan tingkatkan foto keluarga vintage. Gratis, tidak perlu mendaftar.",
        "ogLocale": "id_ID",
        "navBg": "Penghapus Latar Belakang",
        "navId": "Foto ID",
        "navRestore": "Foto lama",
        "navWatermark": "Tanda air",
        "navPortrait": "Potret",
        "navProduct": "Produk",
        "eyebrow": "Foto antik, album keluarga, cetakan pindaian",
        "heroTitle": "AI Restorasi & Peningkatan Foto Lama",
        "heroSub": "Pulihkan kontras yang memudar, kurangi noise, pertajam detail lembut, dan tingkatkan foto keluarga vintage ke resolusi siap cetak.",
        "privacyNotice": "Kenangan keluarga Anda tetap pribadi.",
        "privacyBody": "Foto diproses dalam memori di server dan segera dibuang setelah hasilnya dikembalikan. Tanpa penyimpanan, tanpa pelatihan AI, tanpa perlu mendaftar.",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "Restorasi Foto Lama",
        "uploadText": "Klik untuk mengunggah JPG, PNG, atau WebP",
        "uploadHint": "Foto yang dipindai dan tangkapan telepon keduanya berfungsi",
        "replaceHint": "Klik pratinjau untuk mengganti foto ini",
        "strengthLabel": "Memperbaiki kekuatan",
        "strengthGentle": "Lembut",
        "strengthBalanced": "Seimbang",
        "strengthStrong": "Kuat",
        "scaleLabel": "Skala keluaran",
        "restoreBtn": "Pulihkan Foto",
        "previewTitle": "Pratinjau",
        "previewSub": "Bandingkan foto yang diunggah dengan keluaran yang dipulihkan.",
        "downloadBtn": "Unduh",
        "beforeLabel": "Sebelum",
        "afterLabel": "Setelah",
        "beforeEmpty": "Foto asli akan muncul di sini",
        "afterEmpty": "Foto yang dipulihkan akan muncul di sini",
        "flow1": "Kembalikan tekstur",
        "flow1Body": "Kurangi noise pemindaian dan kembalikan rentang warna yang memudar ke dalam foto.",
        "flow2": "Tingkatkan detailnya",
        "flow2Body": "Pertajam bagian tepi yang lembut dan siapkan cetakan lama untuk layar yang lebih besar.",
        "flow3": "Tetap pribadi",
        "flow3Body": "Gambar mengikuti kebijakan pemrosesan dalam memori yang sama seperti alat MiaoCut lainnya.",
        "uploadFirst": "Unggah foto terlebih dahulu.",
        "formatErr": "Hanya format JPG / PNG / WebP yang didukung",
        "uploading": "Mengunggah...",
        "processing": "Memulihkan...",
        "ready": "Siap",
        "failed": "Pemulihan gagal. Silakan coba foto lain.",
        "howToTitle": "Cara Mengembalikan Foto Lama",
        "howStep1Title": "1. Unggah foto lama Anda",
        "howStep1Body": "Unggah hasil cetak yang dipindai atau tangkapan telepon dalam JPG, PNG, atau WebP. Keduanya berfungsi — meskipun dokumen asli yang dipindai biasanya memberikan hasil terbaik.",
        "howStep2Title": "2. Pilih kekuatan dan skala perbaikan",
        "howStep2Body": "Pilih kekuatan perbaikan (lembut / seimbang / kuat) berdasarkan seberapa rusak foto tersebut, ditambah skala keluaran (1x / 2x / 4x) untuk cetakan atau tampilan layar.",
        "howStep3Title": "3. Bandingkan sebelum/sesudah dan unduh",
        "howStep3Body": "Pratinjau berdampingan menampilkan hasil asli dan hasil yang dipulihkan. Jika Anda menyukainya, unduh gambar yang dipulihkan.",
        "faqTitle": "Pertanyaan yang Sering Diajukan",
        "faq1Q": "Bagaimana cara kerja restorasi foto lama AI?",
        "faq1A": "Unggah foto lama Anda, pilih kekuatan perbaikan (lembut, seimbang, atau kuat), dan pilih skala keluaran. MiaoCut menerapkan denoising AI, pemulihan kontras, dan penajaman detail untuk mengembalikan foto yang pudar atau berisik ke kondisi yang lebih bersih.",
        "faq2Q": "Apakah itu akan mengubah atau merusak foto asli saya?",
        "faq2A": "Tidak. Dokumen asli Anda tidak pernah diubah. MiaoCut memproses salinan di server, menampilkan pratinjau sebelum/sesudah, dan Anda memutuskan apakah akan mengunduh versi yang dipulihkan.",
        "faq3Q": "Apakah foto saya pribadi dan aman?",
        "faq3A": "Ya. Foto diproses dalam memori di server dan segera dibuang setelah hasil yang dipulihkan dikembalikan. Kami tidak pernah menyimpan gambar Anda, tidak pernah menggunakannya untuk pelatihan AI, dan tidak perlu mendaftar. Kenangan keluarga Anda tidak pernah lepas kendali Anda.",
        "faq4Q": "Bisakah ini memulihkan foto yang rusak berat atau sobek?",
        "faq4A": "MiaoCut berfungsi paling baik pada foto yang pudar, berisik, atau kontras rendah. Untuk kerusakan yang sangat parah (sobek besar atau area yang hilang), hasilnya terbatas — untuk menambal area rusak kecil Anda dapat mencoba penghilang tanda air (cat-dan-isi).",
        "faq5Q": "Bisakah saya mencetak foto yang dipulihkan?",
        "faq5A": "Ya. Output yang dipulihkan diekspor pada skala pilihan Anda (1x, 2x, atau 4x). Gunakan 2x atau 4x jika Anda berencana mencetak pada ukuran lebih besar atau ditampilkan pada layar resolusi tinggi.",
        "faq6Q": "Apakah itu mewarnai foto hitam putih?",
        "faq6A": "Belum. Fokus MiaoCut saat ini adalah menghilangkan noise, mempertajam, dan memulihkan kontras. Jika pewarnaan bermanfaat bagi Anda, beri tahu kami melalui widget umpan balik.",
        "moreTitle": "Alat MiaoCut Lainnya",
        "moreLinkPortraitTitle": "Penghapus Latar Belakang Potret →",
        "moreLinkPortraitDesc": "Buat foto kepala, gambar profil, dan foto resume yang bersih.",
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
        "toolRestoreTitle": "Foto lama"
    },
    "pt-br": {
        "pageTitle": "Restauração e upscaler de fotos antigas AI grátis | MiaoCut",
        "metaDescription": "Restauração gratuita de fotos antigas AI online. Reduza o ruído, recupere o contraste desbotado, aprimore detalhes suaves e aprimore fotos de família vintage para uma resolução pronta para impressão.",
        "metaKeywords": "restauração de fotos antigas, restaurar fotos antigas, intensificador de fotos, aprimorar fotos, reparar fotos antigas, restaurar fotos vintage, reparar fotos ai, corrigir fotos desbotadas, restaurar fotos de família",
        "ogTitle": "Restauração e upscaler de fotos antigas AI grátis | MiaoCut",
        "ogDescription": "Reduza o ruído, recupere o contraste desbotado, torne os detalhes mais nítidos e aprimore fotos de família vintage. Gratuito, sem inscrição.",
        "ogLocale": "pt_BR",
        "navBg": "Removedor de fundo",
        "navId": "Foto ID",
        "navRestore": "Foto antiga",
        "navWatermark": "Marca d’água",
        "navPortrait": "Retrato",
        "navProduct": "Produto",
        "eyebrow": "Fotos vintage, álbuns de família, impressões digitalizadas",
        "heroTitle": "AI Restauração e upscaler de fotos antigas",
        "heroSub": "Recupere o contraste desbotado, reduza o ruído, aprimore detalhes suaves e aprimore fotos de família vintage para uma resolução pronta para impressão.",
        "privacyNotice": "As memórias de sua família permanecem privadas.",
        "privacyBody": "As fotos são processadas na memória do servidor e descartadas imediatamente após o retorno do resultado. Sem armazenamento, sem treinamento AI, sem necessidade de inscrição.",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "Restauração de fotos antigas",
        "uploadText": "Clique para carregar JPG, PNG ou WebP",
        "uploadHint": "Fotos digitalizadas e capturas de telefone funcionam",
        "replaceHint": "Clique na visualização para substituir esta foto",
        "strengthLabel": "Força de reparo",
        "strengthGentle": "Gentil",
        "strengthBalanced": "Equilibrado",
        "strengthStrong": "Forte",
        "scaleLabel": "Escala de saída",
        "restoreBtn": "Restaurar foto",
        "previewTitle": "Visualização",
        "previewSub": "Compare a foto enviada com a saída restaurada.",
        "downloadBtn": "Download",
        "beforeLabel": "Antes",
        "afterLabel": "Depois",
        "beforeEmpty": "A foto original aparecerá aqui",
        "afterEmpty": "A foto restaurada aparecerá aqui",
        "flow1": "Restaurar textura",
        "flow1Body": "Reduza o ruído de digitalização e traga de volta a faixa tonal desbotada para a foto.",
        "flow2": "Aprimore detalhes",
        "flow2Body": "Afie bordas suaves e prepare impressões antigas para telas maiores.",
        "flow3": "Mantenha a privacidade",
        "flow3Body": "As imagens seguem a mesma política de processamento na memória de outras ferramentas MiaoCut.",
        "uploadFirst": "Carregue uma foto primeiro.",
        "formatErr": "Apenas os formatos JPG/PNG/WebP são suportados",
        "uploading": "Fazendo upload...",
        "processing": "Restaurando...",
        "ready": "Preparar",
        "failed": "Falha na restauração. Por favor, tente outra foto.",
        "howToTitle": "Como restaurar uma foto antiga",
        "howStep1Title": "1. Envie sua foto antiga",
        "howStep1Body": "Carregue uma impressão digitalizada ou captura de telefone em JPG, PNG ou WebP. Ambos funcionam – embora os originais digitalizados geralmente forneçam o melhor resultado.",
        "howStep2Title": "2. Escolha a resistência e a escala do reparo",
        "howStep2Body": "Escolha uma intensidade de reparo (suave/equilibrada/forte) com base no grau de dano da foto, além de uma escala de saída (1x/2x/4x) para impressões ou exibição na tela.",
        "howStep3Title": "3. Compare antes/depois e baixe",
        "howStep3Body": "A visualização lado a lado mostra o resultado original e restaurado. Se gostar, baixe a imagem restaurada.",
        "faqTitle": "Perguntas frequentes",
        "faq1Q": "Como funciona a restauração de fotos antigas do AI?",
        "faq1A": "Carregue sua foto antiga, escolha uma intensidade de reparo (suave, equilibrada ou forte) e selecione uma escala de saída. MiaoCut aplica remoção de ruído AI, recuperação de contraste e nitidez de detalhes para trazer fotos desbotadas ou barulhentas de volta a um estado mais limpo.",
        "faq2Q": "Isso modificará ou danificará minha foto original?",
        "faq2A": "Não. Seu original nunca é modificado. MiaoCut processa uma cópia no servidor, mostra uma visualização antes/depois e você decide se deseja baixar a versão restaurada.",
        "faq3Q": "Minha foto é privada e segura?",
        "faq3A": "Sim. As fotos são processadas na memória do servidor e descartadas imediatamente após o retorno do resultado restaurado. Nunca armazenamos sua imagem, nunca a usamos para treinamento AI e não é necessária inscrição. As memórias de sua família nunca saem do seu controle.",
        "faq4Q": "Ele pode restaurar fotos muito danificadas ou rasgadas?",
        "faq4A": "MiaoCut funciona melhor em fotos desbotadas, com ruído ou com baixo contraste. Para danos muito graves (grandes rasgos ou áreas faltantes), os resultados são limitados – para preencher pequenas áreas danificadas você pode tentar o removedor de marca d'água (pintar e preencher).",
        "faq5Q": "Posso imprimir a foto restaurada?",
        "faq5A": "Sim. A saída restaurada é exportada na escala escolhida (1x, 2x ou 4x). Use 2x ou 4x se você planeja imprimir em tamanhos maiores ou exibir em telas de alta resolução.",
        "faq6Q": "Ele colore fotos em preto e branco?",
        "faq6A": "Ainda não. O foco atual do MiaoCut é eliminação de ruído, nitidez e recuperação de contraste. Se a colorização for útil para você, informe-nos por meio do widget de feedback.",
        "moreTitle": "Mais ferramentas MiaoCut",
        "moreLinkPortraitTitle": "Removedor de fundo de retrato →",
        "moreLinkPortraitDesc": "Faça fotos limpas, fotos de perfil e fotos de currículo.",
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
        "toolRestoreTitle": "Foto antiga"
    },
    "bn": {
        "pageTitle": "বিনামূল্যে AI পুরানো ফটো পুনরুদ্ধার এবং আপস্ক্যালার | MiaoCut",
        "metaDescription": "বিনামূল্যে AI পুরানো ফটো পুনরুদ্ধার অনলাইন। শব্দ কম করুন, বিবর্ণ বৈসাদৃশ্য পুনরুদ্ধার করুন, নরম বিশদ ধারালো করুন, এবং প্রিন্ট-রেডি রেজোলিউশনে আপস্কেল ভিনটেজ ফ্যামিলি ফটোগুলি।",
        "metaKeywords": "পুরানো ফটো পুনরুদ্ধার, পুরানো ফটো পুনরুদ্ধার, ফটো বর্ধক, ফটো আপস্কেল, পুরানো ফটো মেরামত, ভিনটেজ ফটো পুনরুদ্ধার, এআই ফটো মেরামত, ফিক্সড ফটোগুলি, ফ্যামিলি ফটো রিস্টোর",
        "ogTitle": "বিনামূল্যে AI পুরানো ফটো পুনরুদ্ধার এবং আপস্ক্যালার | MiaoCut",
        "ogDescription": "আওয়াজ কমান, বিবর্ণ বৈসাদৃশ্য পুনরুদ্ধার করুন, বিশদ বিবরণ তীক্ষ্ণ করুন, এবং আপস্কেল ভিনটেজ পারিবারিক ছবি। বিনামূল্যে, সাইন আপ নেই।",
        "ogLocale": "bn_BD",
        "navBg": "ব্যাকগ্রাউন্ড রিমুভার",
        "navId": "ID ছবি",
        "navRestore": "পুরানো ছবি",
        "navWatermark": "জলছাপ",
        "navPortrait": "প্রতিকৃতি",
        "navProduct": "পণ্য",
        "eyebrow": "ভিনটেজ ফটো, পারিবারিক অ্যালবাম, স্ক্যান করা প্রিন্ট",
        "heroTitle": "AI পুরানো ফটো পুনরুদ্ধার এবং আপস্কেলার",
        "heroSub": "বিবর্ণ বৈসাদৃশ্য পুনরুদ্ধার করুন, শব্দ কম করুন, নরম বিশদ ধারালো করুন, এবং প্রিন্ট-রেডি রেজোলিউশনে আপস্কেল ভিনটেজ পারিবারিক ফটোগুলি।",
        "privacyNotice": "আপনার পারিবারিক স্মৃতি গোপন থাকে।",
        "privacyBody": "ফটোগুলি সার্ভারে মেমরিতে প্রক্রিয়া করা হয় এবং ফলাফল ফেরত দেওয়ার সাথে সাথেই বাতিল করা হয়। কোন সঞ্চয়স্থান নেই, কোন AI প্রশিক্ষণ নেই, কোন সাইনআপের প্রয়োজন নেই।",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "পুরানো ফটো পুনরুদ্ধার",
        "uploadText": "JPG, PNG, বা WebP আপলোড করতে ক্লিক করুন",
        "uploadHint": "স্ক্যান করা ফটো এবং ফোন ক্যাপচার দুটোই কাজ করে",
        "replaceHint": "এই ছবিটি প্রতিস্থাপন করতে পূর্বরূপ ক্লিক করুন",
        "strengthLabel": "শক্তি মেরামত",
        "strengthGentle": "কোমল",
        "strengthBalanced": "সুষম",
        "strengthStrong": "শক্তিশালী",
        "scaleLabel": "আউটপুট স্কেল",
        "restoreBtn": "ফটো পুনরুদ্ধার করুন",
        "previewTitle": "পূর্বরূপ",
        "previewSub": "আপলোড করা ছবির সাথে পুনরুদ্ধার করা আউটপুটের তুলনা করুন।",
        "downloadBtn": "ডাউনলোড করুন",
        "beforeLabel": "আগে",
        "afterLabel": "পরে",
        "beforeEmpty": "মূল ছবি এখানে প্রদর্শিত হবে",
        "afterEmpty": "পুনরুদ্ধার করা ফটো এখানে প্রদর্শিত হবে",
        "flow1": "টেক্সচার পুনরুদ্ধার করুন",
        "flow1Body": "স্ক্যানের শব্দ কমিয়ে ফটোতে বিবর্ণ টোনাল রেঞ্জ ফিরিয়ে আনুন।",
        "flow2": "বিস্তারিত উন্নত করুন",
        "flow2Body": "নরম প্রান্ত তীক্ষ্ণ করুন এবং বড় পর্দার জন্য পুরানো প্রিন্ট প্রস্তুত করুন।",
        "flow3": "ব্যক্তিগত রাখুন",
        "flow3Body": "চিত্রগুলি অন্যান্য MiaoCut সরঞ্জামগুলির মতো একই ইন-মেমরি প্রক্রিয়াকরণ নীতি অনুসরণ করে৷",
        "uploadFirst": "প্রথমে একটি ছবি আপলোড করুন।",
        "formatErr": "শুধুমাত্র JPG / PNG / WebP ফর্ম্যাটগুলি সমর্থিত",
        "uploading": "আপলোড হচ্ছে...",
        "processing": "পুনরুদ্ধার করা হচ্ছে...",
        "ready": "প্রস্তুত",
        "failed": "পুনরুদ্ধার ব্যর্থ হয়েছে। অন্য ফটো চেষ্টা করুন.",
        "howToTitle": "কীভাবে একটি পুরানো ছবি পুনরুদ্ধার করবেন",
        "howStep1Title": "1. আপনার পুরানো ছবি আপলোড করুন",
        "howStep1Body": "JPG, PNG, বা WebP-এ একটি স্ক্যান করা প্রিন্ট বা ফোন ক্যাপচার আপলোড করুন। উভয়ই কাজ করে — যদিও স্ক্যান করা মূলগুলি সাধারণত সেরা ফলাফল দেয়।",
        "howStep2Title": "2. মেরামত শক্তি এবং স্কেল চয়ন করুন",
        "howStep2Body": "ছবি কতটা ক্ষতিগ্রস্থ হয়েছে তার উপর ভিত্তি করে একটি মেরামতের শক্তি (মৃদু/সুষম/শক্তিশালী) বেছে নিন, সাথে প্রিন্ট বা স্ক্রিন ডিসপ্লের জন্য একটি আউটপুট স্কেল (1x/2x/4x)।",
        "howStep3Title": "3. আগে/পরে তুলনা করুন এবং ডাউনলোড করুন",
        "howStep3Body": "পাশাপাশি প্রিভিউ আসল এবং পুনরুদ্ধার করা ফলাফল দেখায়। আপনি যদি এটি পছন্দ করেন তবে পুনরুদ্ধার করা ছবিটি ডাউনলোড করুন।",
        "faqTitle": "প্রায়শই জিজ্ঞাসিত প্রশ্নাবলী",
        "faq1Q": "কিভাবে AI পুরানো ফটো পুনরুদ্ধার কাজ করে?",
        "faq1A": "আপনার পুরানো ফটো আপলোড করুন, একটি মেরামতের শক্তি (মৃদু, ভারসাম্যপূর্ণ, বা শক্তিশালী) চয়ন করুন এবং একটি আউটপুট স্কেল নির্বাচন করুন৷ MiaoCut AI ডিনোইসিং, কন্ট্রাস্ট পুনরুদ্ধার এবং বিশদ ধারালো করার জন্য বিবর্ণ বা কোলাহলপূর্ণ ফটোগুলিকে পরিষ্কার অবস্থায় ফিরিয়ে আনতে প্রয়োগ করে।",
        "faq2Q": "এটা কি আমার আসল ফটো পরিবর্তন বা ক্ষতি করবে?",
        "faq2A": "না। আপনার আসলটি কখনই পরিবর্তিত হয় না। MiaoCut সার্ভারে একটি অনুলিপি প্রক্রিয়া করে, আপনাকে পূর্বরূপের আগে/পরে দেখায় এবং আপনি পুনরুদ্ধার করা সংস্করণটি ডাউনলোড করবেন কিনা তা নির্ধারণ করেন।",
        "faq3Q": "আমার ছবি কি ব্যক্তিগত এবং নিরাপদ?",
        "faq3A": "হ্যাঁ। ফটোগুলি সার্ভারে ইন-মেমরিতে প্রক্রিয়া করা হয় এবং পুনরুদ্ধার করা ফলাফল ফেরত দেওয়ার সাথে সাথেই বাতিল করা হয়। আমরা কখনই আপনার ছবি সঞ্চয় করি না, AI প্রশিক্ষণের জন্য এটি ব্যবহার করি না এবং সাইন আপের প্রয়োজন নেই। আপনার পারিবারিক স্মৃতি কখনই আপনার নিয়ন্ত্রণ ছেড়ে যায় না।",
        "faq4Q": "এটি ভারীভাবে ক্ষতিগ্রস্ত বা ছেঁড়া ফটো পুনরুদ্ধার করতে পারে?",
        "faq4A": "MiaoCut বিবর্ণ, কোলাহলপূর্ণ বা কম-কনট্রাস্ট ফটোতে সবচেয়ে ভালো কাজ করে। খুব ভারী ক্ষতির জন্য (বড় টিয়ার বা অনুপস্থিত জায়গা), ফলাফল সীমিত — ছোট ক্ষতিগ্রস্থ জায়গাগুলি পূরণ করার জন্য আপনি ওয়াটারমার্ক রিমুভার (পেইন্ট-এন্ড-ফিল) চেষ্টা করতে পারেন।",
        "faq5Q": "আমি কি পুনরুদ্ধার করা ফটো মুদ্রণ করতে পারি?",
        "faq5A": "হ্যাঁ। পুনরুদ্ধার করা আউটপুট আপনার নির্বাচিত স্কেলে (1x, 2x, বা 4x) রপ্তানি করা হয়। আপনি যদি বড় আকারে প্রিন্ট করার বা উচ্চ-রেজোলিউশনের স্ক্রিনে প্রদর্শন করার পরিকল্পনা করেন তবে 2x বা 4x ব্যবহার করুন।",
        "faq6Q": "এটা কি কালো এবং সাদা ফটো রঙিন করে?",
        "faq6A": "এখনো না। বর্তমান MiaoCut ফোকাস ডিনোইসিং, শার্পনিং এবং কনট্রাস্ট রিকভারি। রঙিনকরণ আপনার জন্য উপযোগী হলে, প্রতিক্রিয়া উইজেটের মাধ্যমে আমাদের জানান।",
        "moreTitle": "আরও MiaoCut টুল",
        "moreLinkPortraitTitle": "পোর্ট্রেট ব্যাকগ্রাউন্ড রিমুভার →",
        "moreLinkPortraitDesc": "ক্লিন হেডশট, প্রোফাইল পিকচার এবং রিজিউম ফটো তৈরি করুন।",
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
        "toolRestoreTitle": "পুরানো ছবি"
    },
    "fil": {
        "pageTitle": "Libreng AI Old Photo Restoration & Upscaler | MiaoCut",
        "metaDescription": "Libreng AI na pagpapanumbalik ng lumang larawan online. Bawasan ang ingay, i-recover ang kupas na contrast, patalasin ang mga malalambot na detalye, at i-upscale ang mga vintage na larawan ng pamilya sa resolution na handa nang i-print.",
        "metaKeywords": "pagpapanumbalik ng lumang larawan, pagpapanumbalik ng mga lumang larawan, pagpapahusay ng larawan, upscale ng larawan, pag-aayos ng lumang larawan, pagpapanumbalik ng lumang larawan, pag-aayos ng larawan ng ai, pag-aayos ng mga kupas na larawan, pagpapanumbalik ng larawan ng pamilya",
        "ogTitle": "Libreng AI Old Photo Restoration & Upscaler | MiaoCut",
        "ogDescription": "Bawasan ang ingay, bawiin ang kupas na contrast, patalasin ang mga detalye, at upscale vintage na mga larawan ng pamilya. Libre, walang pag-signup.",
        "ogLocale": "fil_PH",
        "navBg": "Background Remover",
        "navId": "ID Larawan",
        "navRestore": "Lumang Larawan",
        "navWatermark": "Watermark",
        "navPortrait": "Larawan",
        "navProduct": "produkto",
        "eyebrow": "Mga vintage na larawan, mga album ng pamilya, mga na-scan na print",
        "heroTitle": "AI Old Photo Restoration at Upscaler",
        "heroSub": "I-recover ang kupas na contrast, bawasan ang ingay, patalasin ang malalambot na detalye, at upscale vintage family photos to print-ready resolution.",
        "privacyNotice": "Ang mga alaala ng iyong pamilya ay mananatiling pribado.",
        "privacyBody": "Ang mga larawan ay pinoproseso sa memorya sa server at itinatapon kaagad pagkatapos maibalik ang resulta. Walang storage, walang AI na pagsasanay, walang kinakailangang pag-signup.",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "Pagpapanumbalik ng Lumang Larawan",
        "uploadText": "I-click upang i-upload ang JPG, PNG, o WebP",
        "uploadHint": "Parehong gumagana ang mga na-scan na larawan at telepono",
        "replaceHint": "I-click ang preview para palitan ang larawang ito",
        "strengthLabel": "Kumpunihin ang lakas",
        "strengthGentle": "Malumanay",
        "strengthBalanced": "Balanseng",
        "strengthStrong": "Malakas",
        "scaleLabel": "Iskala ng output",
        "restoreBtn": "Ibalik ang Larawan",
        "previewTitle": "Silipin",
        "previewSub": "Ihambing ang na-upload na larawan sa naibalik na output.",
        "downloadBtn": "I-download",
        "beforeLabel": "dati",
        "afterLabel": "Pagkatapos",
        "beforeEmpty": "Lalabas dito ang orihinal na larawan",
        "afterEmpty": "Lalabas dito ang na-restore na larawan",
        "flow1": "Ibalik ang texture",
        "flow1Body": "Bawasan ang ingay sa pag-scan at ibalik ang kupas na tonal range sa larawan.",
        "flow2": "Pagandahin ang mga detalye",
        "flow2Body": "Patalasin ang malambot na mga gilid at ihanda ang mga lumang print para sa mas malalaking screen.",
        "flow3": "Panatilihing pribado",
        "flow3Body": "Ang mga imahe ay sumusunod sa parehong patakaran sa pagproseso sa memorya tulad ng iba pang mga tool ng MiaoCut.",
        "uploadFirst": "Mag-upload muna ng litrato.",
        "formatErr": "Tanging JPG / PNG / WebP format ang sinusuportahan",
        "uploading": "Ina-upload...",
        "processing": "Nire-restore...",
        "ready": "handa na",
        "failed": "Nabigo ang pag-restore. Mangyaring subukan ang isa pang larawan.",
        "howToTitle": "Paano Ibalik ang isang Lumang Larawan",
        "howStep1Title": "1. I-upload ang iyong lumang larawan",
        "howStep1Body": "Mag-upload ng na-scan na pag-print o pagkuha ng telepono sa JPG, PNG, o WebP. Parehong gumagana — kahit na ang mga na-scan na orihinal ay karaniwang nagbibigay ng pinakamahusay na resulta.",
        "howStep2Title": "2. Pumili ng lakas at sukat ng pagkumpuni",
        "howStep2Body": "Pumili ng lakas ng pagkumpuni (magiliw / balanse / malakas) batay sa kung gaano kasira ang larawan, kasama ang isang sukatan ng output (1x / 2x / 4x) para sa mga print o screen display.",
        "howStep3Title": "3. Ihambing ang bago/pagkatapos at i-download",
        "howStep3Body": "Ipinapakita ng side-by-side preview ang orihinal at naibalik na resulta. Kung gusto mo ito, i-download ang naibalik na larawan.",
        "faqTitle": "Mga Madalas Itanong",
        "faq1Q": "Paano gumagana ang AI lumang larawan restoration?",
        "faq1A": "I-upload ang iyong lumang larawan, pumili ng lakas ng pagkumpuni (magiliw, balanse, o malakas), at pumili ng sukat ng output. Inilalapat ng MiaoCut ang AI denoising, contrast recovery, at detail sharpening upang maibalik ang kupas o maingay na mga larawan sa mas malinis na estado.",
        "faq2Q": "Mababago ba nito o masisira ang aking orihinal na larawan?",
        "faq2A": "Hindi. Hindi kailanman binago ang iyong orihinal. Ang MiaoCut ay nagpoproseso ng isang kopya sa server, nagpapakita sa iyo ng bago/pagkatapos ng preview, at magpapasya ka kung ida-download ang naibalik na bersyon.",
        "faq3Q": "Pribado at ligtas ba ang aking larawan?",
        "faq3A": "Oo. Ang mga larawan ay pinoproseso sa memorya sa server at itinatapon kaagad pagkatapos maibalik ang naibalik na resulta. Hindi namin iniimbak ang iyong larawan, hindi kailanman ginagamit ito para sa pagsasanay sa AI, at walang kinakailangang pag-signup. Ang mga alaala ng iyong pamilya ay hindi kailanman umaalis sa iyong kontrol.",
        "faq4Q": "Maaari ba nitong ibalik ang mga larawang nasira o napunit?",
        "faq4A": "Pinakamahusay na gumagana ang MiaoCut sa mga kupas, maingay, o mga larawang mababa ang contrast. Para sa napakabigat na pinsala (malaking luha o nawawalang lugar), limitado ang mga resulta — para sa pagpuno ng maliliit na nasirang lugar maaari mong subukan ang watermark remover (paint-and-fill).",
        "faq5Q": "Maaari ko bang i-print ang naibalik na larawan?",
        "faq5A": "Oo. Ang naibalik na output ay na-export sa iyong napiling sukat (1x, 2x, o 4x). Gumamit ng 2x o 4x kung plano mong mag-print sa mas malalaking sukat o ipakita sa mga high-resolution na screen.",
        "faq6Q": "Nagbibigay ba ito ng kulay ng mga itim-at-puting larawan?",
        "faq6A": "Hindi pa. Ang kasalukuyang focus ng MiaoCut ay denoising, sharpening, at contrast recovery. Kung magiging kapaki-pakinabang para sa iyo ang colorization, ipaalam sa amin sa pamamagitan ng widget ng feedback.",
        "moreTitle": "Higit pang MiaoCut Tools",
        "moreLinkPortraitTitle": "Portrait Background Remover →",
        "moreLinkPortraitDesc": "Gumawa ng malinis na mga headshot, mga larawan sa profile, at mga larawan ng resume.",
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
        "toolRestoreTitle": "Lumang Larawan"
    },
    "ur": {
        "pageTitle": "مفت AI پرانی تصویر کی بحالی اور اپ اسکیلر | MiaoCut",
        "metaDescription": "مفت AI پرانی تصویر کی بحالی آن لائن۔ شور کو کم کریں، دھندلا ہوا کنٹراسٹ بازیافت کریں، نرم تفصیلات کو تیز کریں، اور پرنٹ کے لیے تیار ریزولوشن کے لیے اعلیٰ درجے کی ونٹیج فیملی فوٹوز۔",
        "metaKeywords": "پرانی تصویر کی بحالی، پرانی تصاویر کو بحال کرنا، تصویر بڑھانے والا، تصویر کو اونچا کرنا، پرانی تصویر کی مرمت، ونٹیج تصویر کی بحالی، AI تصویر کی مرمت، دھندلی تصویروں کو درست کرنا، خاندانی تصویر کی بحالی",
        "ogTitle": "مفت AI پرانی تصویر کی بحالی اور اپ اسکیلر | MiaoCut",
        "ogDescription": "شور کو کم کریں، دھندلا ہوا کنٹراسٹ بازیافت کریں، تفصیلات کو تیز کریں، اور اعلی درجے کی ونٹیج فیملی فوٹوز۔ مفت، کوئی سائن اپ نہیں۔",
        "ogLocale": "ur_PK",
        "navBg": "پس منظر ہٹانے والا",
        "navId": "ID تصویر",
        "navRestore": "پرانی تصویر",
        "navWatermark": "واٹر مارک",
        "navPortrait": "پورٹریٹ",
        "navProduct": "پروڈکٹ",
        "eyebrow": "ونٹیج فوٹوز، فیملی البمز، اسکین شدہ پرنٹس",
        "heroTitle": "AI پرانی تصویر کی بحالی اور اپ اسکیلر",
        "heroSub": "دھندلا ہوا کنٹراسٹ بازیافت کریں، شور کو کم کریں، نرم تفصیلات کو تیز کریں، اور پرنٹ کے لیے تیار ریزولوشن کے لیے اعلیٰ درجے کی ونٹیج فیملی فوٹوز۔",
        "privacyNotice": "آپ کی خاندانی یادیں نجی رہتی ہیں۔",
        "privacyBody": "تصاویر کو سرور پر میموری میں پروسیس کیا جاتا ہے اور نتیجہ واپس آنے کے فوراً بعد ضائع کر دیا جاتا ہے۔ کوئی اسٹوریج نہیں، کوئی AI ٹریننگ نہیں، سائن اپ کی ضرورت نہیں ہے۔",
        "breadcrumbHome": "MiaoCut",
        "breadcrumbCurrent": "پرانی تصویر کی بحالی",
        "uploadText": "JPG، PNG، یا WebP اپ لوڈ کرنے کے لیے کلک کریں",
        "uploadHint": "اسکین شدہ تصاویر اور فون کیپچر دونوں کام کرتے ہیں۔",
        "replaceHint": "اس تصویر کو تبدیل کرنے کے لیے پیش منظر پر کلک کریں۔",
        "strengthLabel": "طاقت کی مرمت",
        "strengthGentle": "نرم",
        "strengthBalanced": "متوازن",
        "strengthStrong": "مضبوط",
        "scaleLabel": "آؤٹ پٹ پیمانہ",
        "restoreBtn": "تصویر کو بحال کریں۔",
        "previewTitle": "پیش نظارہ",
        "previewSub": "اپ لوڈ کردہ تصویر کو بحال شدہ آؤٹ پٹ سے موازنہ کریں۔",
        "downloadBtn": "ڈاؤن لوڈ کریں۔",
        "beforeLabel": "اس سے پہلے",
        "afterLabel": "کے بعد",
        "beforeEmpty": "اصل تصویر یہاں ظاہر ہوگی۔",
        "afterEmpty": "بحال شدہ تصویر یہاں ظاہر ہوگی۔",
        "flow1": "ساخت کو بحال کریں۔",
        "flow1Body": "اسکین کے شور کو کم کریں اور دھندلا ٹونل رینج کو تصویر میں واپس لائیں۔",
        "flow2": "تفصیلات کو بہتر بنائیں",
        "flow2Body": "نرم کناروں کو تیز کریں اور بڑی اسکرینوں کے لیے پرانے پرنٹس تیار کریں۔",
        "flow3": "نجی رکھیں",
        "flow3Body": "تصاویر دیگر MiaoCut ٹولز کی طرح ان میموری پروسیسنگ پالیسی پر عمل کرتی ہیں۔",
        "uploadFirst": "پہلے ایک تصویر اپ لوڈ کریں۔",
        "formatErr": "صرف JPG / PNG / WebP فارمیٹس تعاون یافتہ ہیں",
        "uploading": "اپ لوڈ ہو رہا ہے...",
        "processing": "بحال ہو رہا ہے...",
        "ready": "تیار",
        "failed": "بحالی ناکام ہوگئی۔ براہ کرم ایک اور تصویر آزمائیں۔",
        "howToTitle": "پرانی تصویر کو کیسے بحال کریں۔",
        "howStep1Title": "1. اپنی پرانی تصویر اپ لوڈ کریں۔",
        "howStep1Body": "JPG، PNG، یا WebP میں اسکین شدہ پرنٹ یا فون کیپچر اپ لوڈ کریں۔ دونوں کام کرتے ہیں - حالانکہ اسکین شدہ اصل عام طور پر بہترین نتیجہ دیتی ہیں۔",
        "howStep2Title": "2. مرمت کی طاقت اور پیمانے کا انتخاب کریں۔",
        "howStep2Body": "تصویر کو کتنا نقصان پہنچا ہے اس کی بنیاد پر مرمت کی طاقت (نرم/متوازن/مضبوط) چنیں، نیز پرنٹس یا اسکرین ڈسپلے کے لیے آؤٹ پٹ اسکیل (1x/2x/4x)۔",
        "howStep3Title": "3. پہلے/بعد کا موازنہ کریں اور ڈاؤن لوڈ کریں۔",
        "howStep3Body": "ساتھ ساتھ پیش نظارہ اصل اور بحال شدہ نتیجہ دکھاتا ہے۔ اگر آپ کو یہ پسند ہے تو بحال شدہ تصویر ڈاؤن لوڈ کریں۔",
        "faqTitle": "اکثر پوچھے گئے سوالات",
        "faq1Q": "AI پرانی تصویر کی بحالی کیسے کام کرتی ہے؟",
        "faq1A": "اپنی پرانی تصویر اپ لوڈ کریں، مرمت کی طاقت کا انتخاب کریں (نرم، متوازن، یا مضبوط)، اور آؤٹ پٹ پیمانہ منتخب کریں۔ MiaoCut دھندلی یا شور والی تصاویر کو دوبارہ صاف حالت میں لانے کے لیے AI ڈینوائزنگ، کنٹراسٹ ریکوری، اور تفصیل کو تیز کرنے کا اطلاق کرتا ہے۔",
        "faq2Q": "کیا یہ میری اصل تصویر میں ترمیم یا نقصان کرے گا؟",
        "faq2A": "نہیں، آپ کی اصل میں کبھی ترمیم نہیں کی جاتی ہے۔ MiaoCut سرور پر ایک کاپی پر کارروائی کرتا ہے، آپ کو پیش نظارہ سے پہلے/بعد میں دکھاتا ہے، اور آپ فیصلہ کرتے ہیں کہ بحال شدہ ورژن ڈاؤن لوڈ کرنا ہے یا نہیں۔",
        "faq3Q": "کیا میری تصویر نجی اور محفوظ ہے؟",
        "faq3A": "جی ہاں تصاویر کو سرور پر میموری میں پروسیس کیا جاتا ہے اور بحال شدہ نتیجہ واپس آنے کے فوراً بعد ضائع کر دیا جاتا ہے۔ ہم کبھی بھی آپ کی تصویر کو اسٹور نہیں کرتے، اسے AI ٹریننگ کے لیے کبھی استعمال نہیں کرتے، اور اس کے لیے سائن اپ کی ضرورت نہیں ہے۔ آپ کی خاندانی یادیں آپ کا کنٹرول کبھی نہیں چھوڑتی ہیں۔",
        "faq4Q": "کیا یہ بہت زیادہ خراب یا پھٹی ہوئی تصاویر کو بحال کر سکتا ہے؟",
        "faq4A": "MiaoCut دھندلی، شور والی، یا کم کنٹراسٹ والی تصاویر پر بہترین کام کرتا ہے۔ بہت زیادہ نقصان (بڑے آنسو یا غائب ہونے والے علاقوں) کے لیے، نتائج محدود ہیں — چھوٹے نقصان والے علاقوں کو بھرنے کے لیے آپ واٹر مارک ہٹانے والا (پینٹ اور فل) آزما سکتے ہیں۔",
        "faq5Q": "کیا میں بحال شدہ تصویر پرنٹ کر سکتا ہوں؟",
        "faq5A": "جی ہاں بحال شدہ آؤٹ پٹ آپ کے منتخب کردہ پیمانے پر برآمد کیا جاتا ہے (1x، 2x، یا 4x)۔ 2x یا 4x استعمال کریں اگر آپ بڑے سائز میں پرنٹ کرنے یا ہائی ریزولوشن اسکرینوں پر ڈسپلے کرنے کا ارادہ رکھتے ہیں۔",
        "faq6Q": "کیا یہ سیاہ اور سفید تصاویر کو رنگ دیتا ہے؟",
        "faq6A": "ابھی تک نہیں۔ موجودہ MiaoCut فوکس ڈینوائزنگ، شارپننگ اور کنٹراسٹ ریکوری ہے۔ اگر رنگ کاری آپ کے لیے کارآمد ہو تو ہمیں فیڈ بیک ویجیٹ کے ذریعے بتائیں۔",
        "moreTitle": "مزید MiaoCut ٹولز",
        "moreLinkPortraitTitle": "پورٹریٹ بیک گراؤنڈ ریموور →",
        "moreLinkPortraitDesc": "کلین ہیڈ شاٹس، پروفائل پکچرز، اور فوٹو ریزیوم کریں۔",
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

    // 当前语言从静态 HTML 的 <html lang> 推断（构建时由 scripts/build-i18n.mjs 写死）。
    // 不再用 localStorage 决定语言：每个 URL（/old-photo-restoration/ vs /zh/old-photo-restoration/ 等）
    // 已经是预渲染好的对应语种，让 Google 能分别索引，JS 只负责动态文案。
    const _htmlLang = (document.documentElement.lang || 'en').toLowerCase();
    const state = {
        file: null,
        inputUrl: null,
        outputUrl: null,
        outputBlob: null,
        lang: localeFromHtmlLang(_htmlLang),
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
