(function () {
    'use strict';

    const _isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE = _isLocal ? 'http://localhost:8000' : 'https://api2.miaocut.app';
    const API_URL = `${API_BASE}/api/remove-watermark`;

    // ============================================================
    // i18n 字典
    // ============================================================
    // 单一来源（single source of truth）：
    //   - 运行时 applyLanguage 从这里读 <title>、<meta description/keywords>、og:*
    //   - scripts/build-i18n.mjs 也读 i18n.zh，把 zh/watermark-remover/index.html 的对应 meta 写死
    // 改任意 key 后必须跑 `npm run build:i18n` 同步 zh 静态页，并把改动 commit 进仓库。
    //
    // 词汇策略（合规 + SEO）：
    //   把工具定位扩展到 Object Eraser / Blemish Remover / Date Stamp Removal 等"画面修复"语义，
    //   既拓宽长尾关键词，也降低被 DMCA / 版权机构定向打压的概率。Watermark Remover 仍保留作为
    //   主关键词以维持 SEO 排名，但页面文案 / FAQ / footer 都要明确"仅用于你拥有版权的图片"。
    const i18n = {
    "en": {
        "pageTitle": "AI Object Eraser & Watermark Remover - Clean Photos Online | MiaoCut",
        "metaDescription": "Free AI object eraser & blemish remover. Paint over date stamps, distracting objects, or your own watermarks — AI fills the area in cleanly. No signup, no watermark on output.",
        "metaKeywords": "object eraser, watermark remover, blemish remover, photo cleanup, image inpainting, object remover, remove date stamp, ai photo eraser, lama inpainting, clean photo background",
        "ogTitle": "Free AI Object Eraser & Watermark Remover | MiaoCut",
        "ogDescription": "Paint over date stamps, distracting objects, or watermarks on your own photos — AI fills in cleanly. Free and no signup.",
        "ogLocale": "en_US",
        "navBg": "Background Remover",
        "navId": "ID Photo",
        "navRestore": "Old Photo",
        "navWatermark": "Watermark",
        "navPortrait": "Portrait",
        "navProduct": "Product",
        "eyebrow": "Object eraser · Blemish remover · Date stamps · Distracting objects",
        "heroTitle": "AI Object Eraser & Watermark Remover",
        "heroSub": "Upload one of your own photos, paint over the unwanted object or watermark, and let AI fill in the area cleanly.",
        "ownershipNotice": "For photos you own.",
        "ownershipBody": "Use MiaoCut to clean up your own assets — date stamps, screenshot artifacts, your own logos, distracting objects. Don't use it to remove third-party copyright watermarks.",
        "uploadText": "Click to upload JPG, PNG, or WebP",
        "uploadHint": "High-resolution images with small marks work best",
        "replaceHint": "Click to replace this image",
        "brushLabel": "Brush size",
        "clearBtn": "Clear mask",
        "processBtn": "Remove",
        "downloadBtn": "Download result",
        "loading": "AI is repairing the image...",
        "tipsTitle": "Best results",
        "tipsBody": "Paint slightly beyond the edge of what you want to erase. Use a smaller brush near detailed areas.",
        "sourceTitle": "Paint mask",
        "sourceSub": "Cover only the object, blemish, or watermark you want to remove.",
        "resultTitle": "Result",
        "resultSub": "The repaired image will appear here.",
        "emptySource": "Upload an image to start painting",
        "emptyResult": "No result yet",
        "seoTitle": "Erase objects, watermarks, and blemishes from your own photos",
        "seoBody": "MiaoCut's AI object eraser lets you mark the exact area to repair. It is useful for date stamps, screenshot artifacts, distracting objects, your own logos, and watermarks on photos you own or have explicit permission to edit.",
        "seoCard1": "Manual precision",
        "seoCard1Body": "Paint exactly where the unwanted content appears instead of guessing with unreliable auto detection.",
        "seoCard2": "LaMa inpainting",
        "seoCard2Body": "The painted area is repaired using LaMa — an open-source large-mask AI inpainting model.",
        "seoCard3": "Private workflow",
        "seoCard3Body": "Images are processed in-memory and discarded immediately. Never used for AI training.",
        "howToTitle": "How to Erase Objects, Watermarks, and Blemishes",
        "howStep1Title": "1. Upload your image",
        "howStep1Body": "Upload a JPG, PNG, or WebP from your own collection. No signup or credit card required.",
        "howStep2Title": "2. Paint over the area",
        "howStep2Body": "Use the brush to cover the object, blemish, or your own watermark. Paint slightly beyond the edges for cleaner results.",
        "howStep3Title": "3. Download the cleaned image",
        "howStep3Body": "AI uses LaMa inpainting to fill the painted area based on the surrounding context. Preview the result and download.",
        "uploadFirst": "Upload an image first.",
        "paintFirst": "Paint the area you want to remove first.",
        "formatErr": "Only JPG / PNG / WebP formats are supported",
        "failed": "Processing failed",
        "resultAlt": "Watermark removal result",
        "faqTitle": "Frequently Asked Questions",
        "faq1Q": "What kinds of content can I erase with this tool?",
        "faq1A": "MiaoCut works on small unwanted content in your photos: distracting objects, date stamps from your phone camera, screenshot artifacts, burned-in subtitles, your own logos on product shots, and watermarks on photos you own or have explicit permission to edit.",
        "faq2Q": "Can I remove watermarks from photos I don’t own?",
        "faq2A": "No. MiaoCut is for editing photos you own or have explicit permission to edit. Do not use it to remove copyright watermarks from stock photos, social media content, AI-generated imagery, or any image you do not have the rights to — that may violate copyright law (for example, DMCA §1202 in the US) and equivalent statutes in other jurisdictions.",
        "faq3Q": "How does the AI repair the painted area?",
        "faq3A": "MiaoCut uses LaMa (Large Mask Inpainting), an open-source AI model. It analyzes the surrounding pixels and fills in the painted area to match the rest of the image.",
        "faq4Q": "What kinds of images work best?",
        "faq4A": "High-resolution photos where the mark covers a small portion of the image, and the surrounding background has enough visual context (sky, plain wall, even texture). Marks across complex content like faces or detailed patterns are harder to repair cleanly.",
        "faq5Q": "Are my images uploaded or stored anywhere?",
        "faq5A": "Images are processed in-memory on the server and discarded immediately after the result is returned. We never store your image, never use it for AI training, and there is no signup required.",
        "faq6Q": "Why does my result look blurry or unclean?",
        "faq6A": "Try painting slightly beyond the edge with a smaller brush. For very large marks or marks across detailed content, results may be limited — this tool works best on small, well-bounded areas with simple surroundings.",
        "footerLegalTitle": "Acceptable Use & Legal Notice",
        "footerLegalBody1": "MiaoCut's object eraser is intended for cleaning up images that you own or have explicit permission to edit. Common acceptable uses include removing date stamps from your own phone photos, erasing your own logos for redesign, removing screenshot artifacts, and cleaning up your own product shots.",
        "footerLegalBody2": "Do not use this tool to remove copyright watermarks from stock photos, social media content, AI-generated imagery, or any image you do not own or have rights to. Removing copyright notices may violate copyright law (for example, DMCA §1202 in the United States) and equivalent statutes in other jurisdictions.",
        "footerLegalBody3": "MiaoCut processes uploaded images in-memory and discards them immediately. We do not store or train on user uploads. By using this tool, you confirm that you have the right to edit the image you upload. We comply with DMCA takedown procedures — if you believe content has been processed in violation of your rights, please contact us.",
        "moreTitle": "More MiaoCut Tools",
        "moreLinkBgTitle": "AI Background Remover →",
        "moreLinkBgDesc": "One-click transparent PNG cutout for any photo.",
        "moreLinkOldPhotoTitle": "Old Photo Restoration →",
        "moreLinkOldPhotoDesc": "Restore faded family photos, reduce noise, sharpen details.",
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
        "pageTitle": "AI 物体擦除 & 去水印 - 免费图片瑕疵清理工具 | MiaoCut",
        "metaDescription": "免费 AI 物体擦除与瑕疵修复工具。涂抹日期戳、干扰物或自有水印，AI 智能填补 —— 仅用于你自己拥有版权的照片。无需注册、无水印。",
        "metaKeywords": "物体擦除,去水印,瑕疵修复,图片清理,AI 修图,LaMa 修复,日期戳擦除,画面修复,自有水印清理,AI 照片擦除",
        "ogTitle": "免费 AI 物体擦除 & 去水印工具 | MiaoCut",
        "ogDescription": "涂抹日期戳、干扰物或自有水印，AI 智能填补 —— 只用于你自己的照片，免费、无需注册。",
        "ogLocale": "zh_CN",
        "navBg": "AI 抠图",
        "navId": "证件照",
        "navRestore": "老照片修复",
        "navWatermark": "去水印",
        "navPortrait": "人像",
        "navProduct": "商品图",
        "eyebrow": "物体擦除 · 瑕疵修复 · 日期戳 · 干扰物清理",
        "heroTitle": "AI 物体擦除与去水印工具",
        "heroSub": "上传你自己拥有的照片，涂抹想要清除的物体、瑕疵或水印，AI 自动智能填补该区域。",
        "ownershipNotice": "仅限你自己拥有的照片。",
        "ownershipBody": "本工具适合处理你拥有版权的图片：日期戳、截图残留、自家 Logo、干扰物等。请勿用于去除第三方版权水印。",
        "uploadText": "点击上传 JPG、PNG 或 WebP",
        "uploadHint": "水印较小、背景纹理连续的图片效果更好",
        "replaceHint": "点击可替换图片",
        "brushLabel": "画笔大小",
        "clearBtn": "清除遮罩",
        "processBtn": "去除水印",
        "downloadBtn": "下载结果",
        "loading": "AI 正在修复图片...",
        "tipsTitle": "效果建议",
        "tipsBody": "涂抹时略微覆盖目标边缘；细节区域建议调小画笔。",
        "sourceTitle": "涂抹遮罩",
        "sourceSub": "只覆盖你想去除的物体、瑕疵或水印。",
        "resultTitle": "处理结果",
        "resultSub": "修复后的图片会显示在这里。",
        "emptySource": "上传图片后开始涂抹",
        "emptyResult": "暂无处理结果",
        "seoTitle": "从你自己的照片中擦除物体、水印和瑕疵",
        "seoBody": "MiaoCut 的 AI 物体擦除工具支持手动标记需要修复的精确区域，适合处理日期戳、截图残留、干扰物、自家 Logo，以及你拥有版权或获得授权的照片上的水印。",
        "seoCard1": "手动精确标记",
        "seoCard1Body": "哪里有瑕疵就涂哪里，不依赖不稳定的自动识别。",
        "seoCard2": "LaMa 智能修复",
        "seoCard2Body": "使用开源 LaMa 大遮罩图像修复 AI 模型，根据涂抹区域和上下文自动补全。",
        "seoCard3": "隐私优先",
        "seoCard3Body": "图片纯内存处理，结果返回后立即销毁，绝不用于 AI 训练。",
        "howToTitle": "如何擦除物体、水印和瑕疵",
        "howStep1Title": "1. 上传你的照片",
        "howStep1Body": "上传你拥有版权的 JPG、PNG 或 WebP 照片，无需注册、无需信用卡。",
        "howStep2Title": "2. 涂抹要清除的区域",
        "howStep2Body": "用画笔覆盖物体、瑕疵或自有水印；涂抹时略微超出边缘，效果更干净。",
        "howStep3Title": "3. 下载清理后的图片",
        "howStep3Body": "AI 用 LaMa 图像修复算法根据周围像素自动填补涂抹区域。预览结果后即可下载。",
        "uploadFirst": "请先上传图片。",
        "paintFirst": "请先涂抹需要去除的区域。",
        "formatErr": "仅支持 JPG / PNG / WebP 格式的图片",
        "failed": "处理失败",
        "resultAlt": "去水印结果",
        "faqTitle": "常见问题",
        "faq1Q": "这个工具能擦除哪些类型的内容？",
        "faq1A": "MiaoCut 适合处理你照片里小范围的多余内容：干扰物、手机相机的日期戳、截图残留、烧录字幕、自家商品图上的 Logo，以及你拥有版权或获得授权的照片上的水印。",
        "faq2Q": "可以去除我没有版权的图片上的水印吗？",
        "faq2A": "不可以。MiaoCut 仅用于编辑你拥有或明确获得授权的照片。请勿用它去除图库素材、社交媒体内容、AI 生成图像或任何你没有版权的图片上的水印 —— 这可能违反版权法（例如美国 DMCA §1202）以及其他司法辖区的相应法规。",
        "faq3Q": "AI 是怎么修复涂抹区域的？",
        "faq3A": "MiaoCut 使用 LaMa（Large Mask Inpainting）开源 AI 模型，根据周围像素分析并填补涂抹区域，让它与画面其余部分自然衔接。",
        "faq4Q": "什么样的图片处理效果最好？",
        "faq4A": "高分辨率照片、水印只占画面一小块、周围背景有足够视觉信息（天空、纯色墙面、均匀纹理）。如果水印横跨人脸或复杂图案，修复效果会受限。",
        "faq5Q": "我的图片会被上传或保存吗？",
        "faq5A": "图片在服务器内存里处理，结果返回后立即销毁。我们绝不存储你的图片、绝不用于 AI 训练，也无需注册账号。",
        "faq6Q": "处理结果看起来模糊或不干净怎么办？",
        "faq6A": "试试画笔调小一点、涂抹时略微超出边缘。对于范围特别大或穿过复杂细节的水印，效果会有限 —— 本工具最适合背景简单、边界清晰的小范围区域。",
        "footerLegalTitle": "使用规范与法律声明",
        "footerLegalBody1": "MiaoCut 物体擦除工具仅用于清理你拥有版权或已获得编辑授权的图片。常见的合规用途包括：去除手机照片的日期戳、清除你自家 Logo 以便重新设计、清理截图残留、整理自己拍摄的商品图等。",
        "footerLegalBody2": "请勿使用本工具去除图库素材、社交媒体内容、AI 生成图像，以及任何你不拥有版权或未获授权图片上的版权水印。去除版权标识可能违反版权法律（例如美国 DMCA §1202）以及其他司法辖区的相应法规。",
        "footerLegalBody3": "MiaoCut 在服务器内存中处理上传的图片，处理完成后立即销毁。我们不存储用户上传的图片，也不用其训练模型。使用本工具即表示你确认拥有所上传图片的编辑权利。我们遵守 DMCA 下架程序 —— 如认为内容处理侵犯了你的权益，请联系我们。",
        "moreTitle": "更多 MiaoCut 工具",
        "moreLinkBgTitle": "AI 抠图 →",
        "moreLinkBgDesc": "一键生成透明 PNG 抠图。",
        "moreLinkOldPhotoTitle": "老照片修复 →",
        "moreLinkOldPhotoDesc": "修复褪色家庭照片，降噪并增强细节。",
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
        "pageTitle": "AI ऑब्जेक्ट इरेज़र और वॉटरमार्क रिमूवर - तस्वीरें ऑनलाइन साफ़ करें | MiaoCut",
        "metaDescription": "मुफ़्त AI ऑब्जेक्ट इरेज़र और दोष हटानेवाला। दिनांक टिकटों, ध्यान भटकाने वाली वस्तुओं, या अपने स्वयं के वॉटरमार्क पर पेंट करें - AI क्षेत्र को साफ-सुथरा भर देता है। कोई साइनअप नहीं, आउटपुट पर कोई वॉटरमार्क नहीं।",
        "metaKeywords": "ऑब्जेक्ट इरेज़र, वॉटरमार्क रिमूवर, ब्लेमिश रिमूवर, फोटो क्लीनअप, इमेज इनपेंटिंग, ऑब्जेक्ट रिमूवर, डेट स्टैम्प हटाएं, एआई फोटो इरेज़र, लामा इनपेंटिंग, क्लीन फोटो बैकग्राउंड",
        "ogTitle": "मुफ़्त AI ऑब्जेक्ट इरेज़र और वॉटरमार्क रिमूवर | MiaoCut",
        "ogDescription": "अपनी तस्वीरों पर दिनांक टिकटों, ध्यान भटकाने वाली वस्तुओं या वॉटरमार्क को पेंट करें - AI सफाई से भर जाता है। नि:शुल्क और कोई साइनअप नहीं.",
        "ogLocale": "hi_IN",
        "navBg": "पृष्ठभूमि हटानेवाला",
        "navId": "ID फोटो",
        "navRestore": "पुरानी फोटो",
        "navWatermark": "वाटर-मार्क",
        "navPortrait": "चित्र",
        "navProduct": "उत्पाद",
        "eyebrow": "ऑब्जेक्ट इरेज़र · दाग हटाने वाला · दिनांक टिकटें · ध्यान भटकाने वाली वस्तुएँ",
        "heroTitle": "AI ऑब्जेक्ट इरेज़र और वॉटरमार्क रिमूवर",
        "heroSub": "अपनी खुद की एक तस्वीर अपलोड करें, अवांछित वस्तु या वॉटरमार्क पर पेंट करें, और AI को क्षेत्र को साफ-सुथरा भरने दें।",
        "ownershipNotice": "आपके स्वामित्व वाली फ़ोटो के लिए.",
        "ownershipBody": "अपनी खुद की संपत्तियों को साफ करने के लिए MiaoCut का उपयोग करें - दिनांक टिकटें, स्क्रीनशॉट कलाकृतियां, अपने स्वयं के लोगो, ध्यान भटकाने वाली वस्तुएं। तृतीय-पक्ष कॉपीराइट वॉटरमार्क हटाने के लिए इसका उपयोग न करें।",
        "uploadText": "JPG, PNG, या WebP अपलोड करने के लिए क्लिक करें",
        "uploadHint": "छोटे निशान वाली उच्च-रिज़ॉल्यूशन वाली छवियां सबसे अच्छा काम करती हैं",
        "replaceHint": "इस छवि को बदलने के लिए क्लिक करें",
        "brushLabel": "ब्रश का आकार",
        "clearBtn": "साफ़ मुखौटा",
        "processBtn": "निकालना",
        "downloadBtn": "परिणाम डाउनलोड करें",
        "loading": "AI छवि की मरम्मत कर रहा है...",
        "tipsTitle": "सर्वोत्तम परिणाम",
        "tipsBody": "आप जिसे मिटाना चाहते हैं उसके किनारे से थोड़ा आगे पेंट करें। विस्तृत क्षेत्रों के पास छोटे ब्रश का उपयोग करें।",
        "sourceTitle": "पेंट मास्क",
        "sourceSub": "केवल उस वस्तु, दोष या वॉटरमार्क को ढकें जिसे आप हटाना चाहते हैं।",
        "resultTitle": "परिणाम",
        "resultSub": "मरम्मत की गई छवि यहां दिखाई देगी.",
        "emptySource": "पेंटिंग शुरू करने के लिए एक छवि अपलोड करें",
        "emptyResult": "अभी तक कोई परिणाम नहीं",
        "seoTitle": "अपनी तस्वीरों से वस्तुएं, वॉटरमार्क और दाग मिटाएं",
        "seoBody": "MiaoCut का AI ऑब्जेक्ट इरेज़र आपको मरम्मत के लिए सटीक क्षेत्र को चिह्नित करने देता है। यह दिनांक टिकटों, स्क्रीनशॉट कलाकृतियों, ध्यान भटकाने वाली वस्तुओं, आपके स्वयं के लोगो और उन तस्वीरों पर वॉटरमार्क के लिए उपयोगी है जो आपके पास हैं या जिन्हें संपादित करने की स्पष्ट अनुमति है।",
        "seoCard1": "मैन्युअल परिशुद्धता",
        "seoCard1Body": "अविश्वसनीय ऑटो डिटेक्शन के साथ अनुमान लगाने के बजाय ठीक वहीं पेंट करें जहां अवांछित सामग्री दिखाई देती है।",
        "seoCard2": "पेंटिंग में LaMa",
        "seoCard2Body": "पेंट किए गए क्षेत्र की मरम्मत LaMa - एक ओपन-सोर्स लार्ज-मास्क AI इनपेंटिंग मॉडल का उपयोग करके की जाती है।",
        "seoCard3": "निजी कार्यप्रवाह",
        "seoCard3Body": "छवियों को मेमोरी में संसाधित किया जाता है और तुरंत हटा दिया जाता है। AI प्रशिक्षण के लिए कभी भी उपयोग नहीं किया गया।",
        "howToTitle": "वस्तुओं, वॉटरमार्क और दागों को कैसे मिटाएं",
        "howStep1Title": "1. अपनी छवि अपलोड करें",
        "howStep1Body": "अपने संग्रह से एक JPG, PNG, या WebP अपलोड करें। कोई साइनअप या क्रेडिट कार्ड की आवश्यकता नहीं है।",
        "howStep2Title": "2. क्षेत्र पर पेंट करें",
        "howStep2Body": "किसी वस्तु, दाग या अपने स्वयं के वॉटरमार्क को ढकने के लिए ब्रश का उपयोग करें। स्वच्छ परिणामों के लिए किनारों से थोड़ा परे पेंट करें।",
        "howStep3Title": "3. साफ़ की गई छवि डाउनलोड करें",
        "howStep3Body": "AI आसपास के संदर्भ के आधार पर चित्रित क्षेत्र को भरने के लिए LaMa इनपेंटिंग का उपयोग करता है। परिणाम का पूर्वावलोकन करें और डाउनलोड करें।",
        "uploadFirst": "पहले एक छवि अपलोड करें.",
        "paintFirst": "पहले उस क्षेत्र को पेंट करें जिसे आप हटाना चाहते हैं।",
        "formatErr": "केवल JPG / PNG / WebP प्रारूप समर्थित हैं",
        "failed": "प्रसंस्करण विफल रहा",
        "resultAlt": "वॉटरमार्क हटाने का परिणाम",
        "faqTitle": "अक्सर पूछे जाने वाले प्रश्नों",
        "faq1Q": "मैं इस टूल से किस प्रकार की सामग्री मिटा सकता हूँ?",
        "faq1A": "MiaoCut आपकी तस्वीरों में छोटी अवांछित सामग्री पर काम करता है: ध्यान भटकाने वाली वस्तुएं, आपके फोन कैमरे से दिनांक टिकटें, स्क्रीनशॉट कलाकृतियां, जले हुए उपशीर्षक, उत्पाद शॉट्स पर आपके स्वयं के लोगो, और उन तस्वीरों पर वॉटरमार्क जो आपके स्वामित्व में हैं या जिन्हें संपादित करने की स्पष्ट अनुमति है।",
        "faq2Q": "क्या मैं उन फ़ोटो से वॉटरमार्क हटा सकता हूँ जो मेरे पास नहीं हैं?",
        "faq2A": "नहीं, MiaoCut उन फ़ोटो को संपादित करने के लिए है जो आपके पास हैं या जिन्हें संपादित करने की स्पष्ट अनुमति है। स्टॉक फ़ोटो, सोशल मीडिया सामग्री, AI-जनरेटेड इमेजरी, या किसी भी छवि से कॉपीराइट वॉटरमार्क हटाने के लिए इसका उपयोग न करें - जो कॉपीराइट कानून का उल्लंघन कर सकता है (उदाहरण के लिए, यूएस में DMCA §1202) और अन्य न्यायालयों में समकक्ष क़ानून।",
        "faq3Q": "AI चित्रित क्षेत्र की मरम्मत कैसे करता है?",
        "faq3A": "MiaoCut एक ओपन-सोर्स AI मॉडल, LaMa (Large Mask Inpainting) का उपयोग करता है। यह आसपास के पिक्सेल का विश्लेषण करता है और शेष छवि से मिलान करने के लिए चित्रित क्षेत्र को भरता है।",
        "faq4Q": "किस प्रकार की छवियां सबसे अच्छा काम करती हैं?",
        "faq4A": "उच्च-रिज़ॉल्यूशन फ़ोटो जहां चिह्न छवि के एक छोटे हिस्से को कवर करता है, और आसपास की पृष्ठभूमि में पर्याप्त दृश्य संदर्भ (आकाश, सादे दीवार, यहां तक ​​​​कि बनावट) होता है। चेहरे या विस्तृत पैटर्न जैसी जटिल सामग्री पर निशानों को साफ़-साफ़ ठीक करना कठिन होता है।",
        "faq5Q": "क्या मेरी छवियाँ कहीं अपलोड या संग्रहीत हैं?",
        "faq5A": "छवियों को सर्वर पर मेमोरी में संसाधित किया जाता है और परिणाम वापस आने के तुरंत बाद हटा दिया जाता है। हम कभी भी आपकी छवि संग्रहीत नहीं करते हैं, इसे AI प्रशिक्षण के लिए कभी उपयोग नहीं करते हैं, और कोई साइनअप आवश्यक नहीं है।",
        "faq6Q": "मेरा परिणाम धुंधला या अशुद्ध क्यों दिखता है?",
        "faq6A": "एक छोटे ब्रश से किनारे से थोड़ा आगे पेंटिंग करने का प्रयास करें। विस्तृत सामग्री में बहुत बड़े चिह्नों या चिह्नों के लिए, परिणाम सीमित हो सकते हैं - यह उपकरण साधारण परिवेश वाले छोटे, अच्छी तरह से घिरे क्षेत्रों पर सबसे अच्छा काम करता है।",
        "footerLegalTitle": "स्वीकार्य उपयोग एवं कानूनी नोटिस",
        "footerLegalBody1": "MiaoCut का ऑब्जेक्ट इरेज़र उन छवियों को साफ करने के लिए है जो आपके पास हैं या जिन्हें संपादित करने की स्पष्ट अनुमति आपके पास है। सामान्य स्वीकार्य उपयोगों में अपने फ़ोन फ़ोटो से दिनांक टिकट हटाना, पुनः डिज़ाइन के लिए अपने स्वयं के लोगो को मिटाना, स्क्रीनशॉट कलाकृतियों को हटाना और अपने स्वयं के उत्पाद शॉट्स को साफ़ करना शामिल है।",
        "footerLegalBody2": "स्टॉक फ़ोटो, सोशल मीडिया सामग्री, AI-जनरेटेड इमेजरी, या किसी भी छवि से कॉपीराइट वॉटरमार्क हटाने के लिए इस टूल का उपयोग न करें जो आपके पास नहीं है या आपके पास अधिकार नहीं है। कॉपीराइट नोटिस को हटाने से कॉपीराइट कानून (उदाहरण के लिए, संयुक्त राज्य अमेरिका में DMCA §1202) और अन्य न्यायक्षेत्रों में समकक्ष कानूनों का उल्लंघन हो सकता है।",
        "footerLegalBody3": "MiaoCut मेमोरी में अपलोड की गई छवियों को संसाधित करता है और उन्हें तुरंत हटा देता है। हम उपयोगकर्ता अपलोड पर भंडारण या प्रशिक्षण नहीं देते हैं। इस टूल का उपयोग करके, आप पुष्टि करते हैं कि आपके पास आपके द्वारा अपलोड की गई छवि को संपादित करने का अधिकार है। हम DMCA निष्कासन प्रक्रियाओं का अनुपालन करते हैं - यदि आपको लगता है कि सामग्री को आपके अधिकारों के उल्लंघन में संसाधित किया गया है, तो कृपया हमसे संपर्क करें।",
        "moreTitle": "अधिक MiaoCut उपकरण",
        "moreLinkBgTitle": "AI बैकग्राउंड रिमूवर →",
        "moreLinkBgDesc": "किसी भी फोटो के लिए एक-क्लिक पारदर्शी PNG कटआउट।",
        "moreLinkOldPhotoTitle": "पुरानी फ़ोटो पुनर्स्थापना →",
        "moreLinkOldPhotoDesc": "फीके पारिवारिक फ़ोटो पुनर्स्थापित करें, शोर कम करें, विवरण तेज़ करें।",
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
        "pageTitle": "AI Penghapus Objek & Penghilang Tanda Air - Bersihkan Foto Online | MiaoCut",
        "metaDescription": "Penghapus objek & penghilang noda AI gratis. Cat di atas stempel tanggal, objek yang mengganggu, atau tanda air Anda sendiri — AI memenuhi area tersebut dengan rapi. Tidak ada pendaftaran, tidak ada tanda air pada keluaran.",
        "metaKeywords": "penghapus objek, penghapus tanda air, penghapus noda, pembersihan foto, pengecatan gambar, penghapus objek, penghapus stempel tanggal, penghapus foto ai, pengecatan lama, penghapus latar belakang foto",
        "ogTitle": "Penghapus Objek & Penghilang Tanda Air AI Gratis | MiaoCut",
        "ogDescription": "Lukis stempel tanggal, objek yang mengganggu, atau tanda air pada foto Anda — AI terisi dengan rapi. Gratis dan tidak perlu mendaftar.",
        "ogLocale": "id_ID",
        "navBg": "Penghapus Latar Belakang",
        "navId": "Foto ID",
        "navRestore": "Foto lama",
        "navWatermark": "Tanda air",
        "navPortrait": "Potret",
        "navProduct": "Produk",
        "eyebrow": "Penghapus objek · Penghilang noda · Stempel tanggal · Objek yang mengganggu",
        "heroTitle": "AI Penghapus Objek & Penghilang Tanda Air",
        "heroSub": "Unggah salah satu foto Anda, warnai objek atau tanda air yang tidak diinginkan, dan biarkan AI mengisi area tersebut dengan rapi.",
        "ownershipNotice": "Untuk foto milik Anda.",
        "ownershipBody": "Gunakan MiaoCut untuk membersihkan aset Anda — stempel tanggal, artefak tangkapan layar, logo Anda sendiri, objek yang mengganggu. Jangan gunakan untuk menghapus tanda air hak cipta pihak ketiga.",
        "uploadText": "Klik untuk mengunggah JPG, PNG, atau WebP",
        "uploadHint": "Gambar beresolusi tinggi dengan tanda kecil berfungsi paling baik",
        "replaceHint": "Klik untuk mengganti gambar ini",
        "brushLabel": "Ukuran kuas",
        "clearBtn": "Masker bening",
        "processBtn": "Menghapus",
        "downloadBtn": "Hasil unduhan",
        "loading": "AI sedang memperbaiki gambar...",
        "tipsTitle": "Hasil terbaik",
        "tipsBody": "Warnai sedikit melampaui tepi objek yang ingin Anda hapus. Gunakan kuas yang lebih kecil di dekat area yang detail.",
        "sourceTitle": "Masker cat",
        "sourceSub": "Tutupi hanya objek, noda, atau tanda air yang ingin Anda hilangkan.",
        "resultTitle": "Hasil",
        "resultSub": "Gambar yang diperbaiki akan muncul di sini.",
        "emptySource": "Unggah gambar untuk mulai melukis",
        "emptyResult": "Belum ada hasil",
        "seoTitle": "Hapus objek, tanda air, dan noda dari foto Anda sendiri",
        "seoBody": "Penghapus objek MiaoCut AI memungkinkan Anda menandai area yang tepat untuk diperbaiki. Ini berguna untuk stempel tanggal, artefak tangkapan layar, objek yang mengganggu, logo Anda sendiri, dan tanda air pada foto yang Anda miliki atau memiliki izin eksplisit untuk mengedit.",
        "seoCard1": "Presisi manual",
        "seoCard1Body": "Lukis persis di mana konten yang tidak diinginkan muncul alih-alih menebak-nebak dengan deteksi otomatis yang tidak dapat diandalkan.",
        "seoCard2": "LaMa dalam pengecatan",
        "seoCard2Body": "Area yang dicat diperbaiki menggunakan LaMa — model pengecatan AI topeng besar sumber terbuka.",
        "seoCard3": "Alur kerja pribadi",
        "seoCard3Body": "Gambar diproses di memori dan segera dibuang. Tidak pernah digunakan untuk pelatihan AI.",
        "howToTitle": "Cara Menghapus Objek, Tanda Air, dan Noda",
        "howStep1Title": "1. Unggah gambar Anda",
        "howStep1Body": "Unggah JPG, PNG, atau WebP dari koleksi Anda sendiri. Tidak diperlukan pendaftaran atau kartu kredit.",
        "howStep2Title": "2. Cat pada area tersebut",
        "howStep2Body": "Gunakan kuas untuk menutupi objek, noda, atau tanda air Anda sendiri. Cat sedikit melampaui tepinya untuk hasil yang lebih bersih.",
        "howStep3Title": "3. Unduh gambar yang sudah dibersihkan",
        "howStep3Body": "AI menggunakan LaMa dalam pengecatan untuk mengisi area yang dicat berdasarkan konteks sekitarnya. Pratinjau hasilnya dan unduh.",
        "uploadFirst": "Unggah gambar terlebih dahulu.",
        "paintFirst": "Warnai area yang ingin Anda hapus terlebih dahulu.",
        "formatErr": "Hanya format JPG / PNG / WebP yang didukung",
        "failed": "Pemrosesan gagal",
        "resultAlt": "Hasil penghapusan tanda air",
        "faqTitle": "Pertanyaan yang Sering Diajukan",
        "faq1Q": "Jenis konten apa yang dapat saya hapus dengan alat ini?",
        "faq1A": "MiaoCut bekerja pada konten kecil yang tidak diinginkan di foto Anda: objek yang mengganggu, cap tanggal dari kamera ponsel Anda, artefak tangkapan layar, subtitel yang dibakar, logo Anda sendiri pada foto produk, dan tanda air pada foto yang Anda miliki atau memiliki izin eksplisit untuk mengedit.",
        "faq2Q": "Bisakah saya menghapus tanda air dari foto yang bukan milik saya?",
        "faq2A": "Tidak. MiaoCut ditujukan untuk mengedit foto yang Anda miliki atau memiliki izin eksplisit untuk mengedit. Jangan menggunakannya untuk menghapus tanda air hak cipta dari stok foto, konten media sosial, gambar yang dihasilkan AI, atau gambar apa pun yang haknya bukan milik Anda — yang mungkin melanggar undang-undang hak cipta (misalnya, DMCA §1202 di AS) dan undang-undang serupa di yurisdiksi lain.",
        "faq3Q": "Bagaimana cara AI memperbaiki area yang dicat?",
        "faq3A": "MiaoCut menggunakan LaMa (Large Mask Inpainting), model AI sumber terbuka. Ini menganalisis piksel di sekitarnya dan mengisi area yang dicat agar sesuai dengan gambar lainnya.",
        "faq4Q": "Jenis gambar apa yang paling cocok?",
        "faq4A": "Foto beresolusi tinggi yang tandanya menutupi sebagian kecil gambar, dan latar belakang sekitarnya memiliki konteks visual yang cukup (langit, dinding polos, bahkan tekstur). Tanda pada konten kompleks seperti wajah atau pola detail lebih sulit diperbaiki dengan rapi.",
        "faq5Q": "Apakah gambar saya diunggah atau disimpan di mana saja?",
        "faq5A": "Gambar diproses dalam memori di server dan segera dibuang setelah hasilnya dikembalikan. Kami tidak pernah menyimpan gambar Anda, tidak pernah menggunakannya untuk pelatihan AI, dan tidak perlu mendaftar.",
        "faq6Q": "Mengapa hasil saya terlihat buram atau tidak bersih?",
        "faq6A": "Cobalah melukis sedikit melampaui tepinya dengan kuas yang lebih kecil. Untuk tanda yang sangat besar atau tanda di seluruh konten mendetail, hasilnya mungkin terbatas — alat ini berfungsi paling baik di area kecil dan berbatas tegas dengan lingkungan sederhana.",
        "footerLegalTitle": "Pemberitahuan Penggunaan & Hukum yang Dapat Diterima",
        "footerLegalBody1": "Penghapus objek MiaoCut dimaksudkan untuk membersihkan gambar yang Anda miliki atau memiliki izin eksplisit untuk mengedit. Penggunaan umum yang dapat diterima termasuk menghapus stempel tanggal dari foto ponsel Anda, menghapus logo Anda sendiri untuk didesain ulang, menghapus artefak tangkapan layar, dan membersihkan foto produk Anda sendiri.",
        "footerLegalBody2": "Jangan gunakan alat ini untuk menghapus tanda air hak cipta dari stok foto, konten media sosial, gambar yang dihasilkan AI, atau gambar apa pun yang bukan milik atau hak Anda. Menghapus pemberitahuan hak cipta dapat melanggar undang-undang hak cipta (misalnya, DMCA §1202 di Amerika Serikat) dan undang-undang serupa di yurisdiksi lain.",
        "footerLegalBody3": "MiaoCut memproses gambar yang diunggah ke dalam memori dan segera membuangnya. Kami tidak menyimpan atau melatih unggahan pengguna. Dengan menggunakan alat ini, Anda mengonfirmasi bahwa Anda berhak mengedit gambar yang Anda unggah. Kami mematuhi prosedur penghapusan DMCA — jika Anda yakin konten telah diproses dengan melanggar hak Anda, silakan hubungi kami.",
        "moreTitle": "Alat MiaoCut Lainnya",
        "moreLinkBgTitle": "Penghapus Latar Belakang AI →",
        "moreLinkBgDesc": "Potongan PNG transparan sekali klik untuk foto apa pun.",
        "moreLinkOldPhotoTitle": "Restorasi Foto Lama →",
        "moreLinkOldPhotoDesc": "Pulihkan foto keluarga yang pudar, kurangi noise, pertajam detail.",
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
        "pageTitle": "AI Apagador de objetos e removedor de marca d'água - Limpar fotos online | MiaoCut",
        "metaDescription": "Eliminador de objetos e removedor de manchas AI grátis. Pinte carimbos de data, objetos que distraem ou suas próprias marcas d'água - AI preenche a área de forma limpa. Sem inscrição, sem marca d’água na saída.",
        "metaKeywords": "apagador de objetos, removedor de marca d'água, removedor de manchas, limpeza de fotos, pintura de imagem, removedor de objetos, remover carimbo de data, apagador de fotos ai, pintura de lama, limpar fundo de foto",
        "ogTitle": "Apagador de objetos e removedor de marca d'água AI grátis | MiaoCut",
        "ogDescription": "Pinte carimbos de data, objetos que distraem ou marcas d'água em suas próprias fotos - AI preenche de forma limpa. Gratuito e sem inscrição.",
        "ogLocale": "pt_BR",
        "navBg": "Removedor de fundo",
        "navId": "Foto ID",
        "navRestore": "Foto antiga",
        "navWatermark": "Marca d’água",
        "navPortrait": "Retrato",
        "navProduct": "Produto",
        "eyebrow": "Apagador de objetos · Removedor de manchas · Carimbos de data · Objetos que distraem",
        "heroTitle": "AI Eliminador de objetos e removedor de marca d'água",
        "heroSub": "Carregue uma de suas próprias fotos, pinte sobre o objeto indesejado ou marca d'água e deixe o AI preencher a área de forma limpa.",
        "ownershipNotice": "Para fotos que você possui.",
        "ownershipBody": "Use MiaoCut para limpar seus próprios ativos – carimbos de data, artefatos de captura de tela, seus próprios logotipos, objetos que distraem. Não o use para remover marcas d'água de direitos autorais de terceiros.",
        "uploadText": "Clique para carregar JPG, PNG ou WebP",
        "uploadHint": "Imagens de alta resolução com marcas pequenas funcionam melhor",
        "replaceHint": "Clique para substituir esta imagem",
        "brushLabel": "Tamanho do pincel",
        "clearBtn": "Máscara transparente",
        "processBtn": "Remover",
        "downloadBtn": "Baixar resultado",
        "loading": "AI está reparando a imagem...",
        "tipsTitle": "Melhores resultados",
        "tipsBody": "Pinte um pouco além da borda do que você deseja apagar. Use um pincel menor próximo às áreas detalhadas.",
        "sourceTitle": "Máscara de pintura",
        "sourceSub": "Cubra apenas o objeto, mancha ou marca d'água que deseja remover.",
        "resultTitle": "Resultado",
        "resultSub": "A imagem reparada aparecerá aqui.",
        "emptySource": "Carregue uma imagem para começar a pintar",
        "emptyResult": "Nenhum resultado ainda",
        "seoTitle": "Apague objetos, marcas d'água e manchas de suas próprias fotos",
        "seoBody": "O apagador de objetos AI do MiaoCut permite marcar a área exata a ser reparada. É útil para carimbos de data, artefatos de captura de tela, objetos que distraem, seus próprios logotipos e marcas d'água em fotos que você possui ou que tem permissão explícita para editar.",
        "seoCard1": "Precisão manual",
        "seoCard1Body": "Pinte exatamente onde o conteúdo indesejado aparece, em vez de adivinhar com detecção automática não confiável.",
        "seoCard2": "Pintura LaMa",
        "seoCard2Body": "A área pintada é reparada usando LaMa — um modelo de pintura interna de máscara grande AI de código aberto.",
        "seoCard3": "Fluxo de trabalho privado",
        "seoCard3Body": "As imagens são processadas na memória e descartadas imediatamente. Nunca usado para treinamento AI.",
        "howToTitle": "Como apagar objetos, marcas d'água e manchas",
        "howStep1Title": "1. Envie sua imagem",
        "howStep1Body": "Carregue um JPG, PNG ou WebP de sua própria coleção. Não é necessária inscrição ou cartão de crédito.",
        "howStep2Title": "2. Pinte a área",
        "howStep2Body": "Use o pincel para cobrir o objeto, a mancha ou sua própria marca d'água. Pinte um pouco além das bordas para obter resultados mais limpos.",
        "howStep3Title": "3. Baixe a imagem limpa",
        "howStep3Body": "AI usa pintura interna LaMa para preencher a área pintada com base no contexto circundante. Visualize o resultado e faça o download.",
        "uploadFirst": "Carregue uma imagem primeiro.",
        "paintFirst": "Pinte a área que deseja remover primeiro.",
        "formatErr": "Apenas os formatos JPG/PNG/WebP são suportados",
        "failed": "Falha no processamento",
        "resultAlt": "Resultado da remoção da marca d’água",
        "faqTitle": "Perguntas frequentes",
        "faq1Q": "Que tipos de conteúdo posso apagar com esta ferramenta?",
        "faq1A": "MiaoCut funciona com pequenos conteúdos indesejados em suas fotos: objetos que distraem, carimbos de data da câmera do telefone, artefatos de captura de tela, legendas gravadas, seus próprios logotipos em fotos de produtos e marcas d'água em fotos que você possui ou tem permissão explícita para editar.",
        "faq2Q": "Posso remover marcas d'água de fotos que não possuo?",
        "faq2A": "Não. MiaoCut é para editar fotos que você possui ou tem permissão explícita para editar. Não use-o para remover marcas d'água de direitos autorais de banco de imagens, conteúdo de mídia social, imagens geradas por AI ou qualquer imagem para a qual você não tenha direitos - isso pode violar a lei de direitos autorais (por exemplo, DMCA §1202 nos EUA) e estatutos equivalentes em outras jurisdições.",
        "faq3Q": "Como o AI repara a área pintada?",
        "faq3A": "MiaoCut usa LaMa (Large Mask Inpainting), um modelo AI de código aberto. Ele analisa os pixels circundantes e preenche a área pintada para corresponder ao resto da imagem.",
        "faq4Q": "Que tipos de imagens funcionam melhor?",
        "faq4A": "Fotos de alta resolução em que a marca cobre uma pequena parte da imagem e o fundo ao redor tem contexto visual suficiente (céu, parede lisa e até textura). Marcas em conteúdos complexos, como rostos ou padrões detalhados, são mais difíceis de reparar de forma limpa.",
        "faq5Q": "Minhas imagens são carregadas ou armazenadas em algum lugar?",
        "faq5A": "As imagens são processadas na memória do servidor e descartadas imediatamente após o retorno do resultado. Nunca armazenamos sua imagem, nunca a usamos para treinamento AI e não é necessária inscrição.",
        "faq6Q": "Por que meu resultado parece borrado ou sujo?",
        "faq6A": "Tente pintar um pouco além da borda com um pincel menor. Para marcas muito grandes ou marcas em conteúdo detalhado, os resultados podem ser limitados — esta ferramenta funciona melhor em áreas pequenas e bem delimitadas com ambientes simples.",
        "footerLegalTitle": "Uso aceitável e aviso legal",
        "footerLegalBody1": "O apagador de objetos do MiaoCut destina-se a limpar imagens que você possui ou que tem permissão explícita para editar. Os usos aceitáveis ​​comuns incluem a remoção de carimbos de data das fotos do seu telefone, o apagamento dos seus próprios logotipos para redesenho, a remoção de artefatos de captura de tela e a limpeza das fotos do seu próprio produto.",
        "footerLegalBody2": "Não use esta ferramenta para remover marcas d’água de direitos autorais de banco de imagens, conteúdo de mídia social, imagens geradas pelo AI ou qualquer imagem que você não possua ou sobre a qual não tenha direitos. A remoção de avisos de direitos autorais pode violar a lei de direitos autorais (por exemplo, DMCA §1202 nos Estados Unidos) e estatutos equivalentes em outras jurisdições.",
        "footerLegalBody3": "MiaoCut processa imagens carregadas na memória e as descarta imediatamente. Não armazenamos nem treinamos uploads de usuários. Ao usar esta ferramenta, você confirma que tem o direito de editar a imagem que carregou. Cumprimos os procedimentos de remoção do DMCA. Se você acredita que o conteúdo foi processado em violação aos seus direitos, entre em contato conosco.",
        "moreTitle": "Mais ferramentas MiaoCut",
        "moreLinkBgTitle": "Removedor de fundo AI →",
        "moreLinkBgDesc": "Recorte PNG transparente com um clique para qualquer foto.",
        "moreLinkOldPhotoTitle": "Restauração de fotos antigas →",
        "moreLinkOldPhotoDesc": "Restaure fotos de família desbotadas, reduza o ruído e torne os detalhes mais nítidos.",
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
        "pageTitle": "AI অবজেক্ট ইরেজার এবং ওয়াটারমার্ক রিমুভার - ক্লিন ফটো অনলাইন | MiaoCut",
        "metaDescription": "বিনামূল্যে AI অবজেক্ট ইরেজার এবং ব্লেমিশ রিমুভার। তারিখের স্ট্যাম্প, বিভ্রান্তিকর বস্তু, বা আপনার নিজের ওয়াটারমার্কের উপর রঙ করুন — AI পরিচ্ছন্নভাবে এলাকাটি পূরণ করে। কোন সাইনআপ নেই, আউটপুটে জলছাপ নেই।",
        "metaKeywords": "অবজেক্ট ইরেজার, ওয়াটারমার্ক রিমুভার, ব্লেমিশ রিমুভার, ফটো ক্লিনআপ, ইমেজ ইনপেইন্টিং, অবজেক্ট রিমুভার, রিমুভ ডেট স্ট্যাম্প, এআই ফটো ইরেজার, লামা ইনপেইন্টিং, ক্লিন ফটো ব্যাকগ্রাউন্ড",
        "ogTitle": "বিনামূল্যে AI অবজেক্ট ইরেজার এবং ওয়াটারমার্ক রিমুভার | MiaoCut",
        "ogDescription": "আপনার নিজের ফটোতে তারিখের স্ট্যাম্প, বিভ্রান্তিকর বস্তু বা ওয়াটারমার্কের উপর আঁকুন — AI পরিষ্কারভাবে পূরণ করে। বিনামূল্যে এবং সাইন আপ নেই.",
        "ogLocale": "bn_BD",
        "navBg": "ব্যাকগ্রাউন্ড রিমুভার",
        "navId": "ID ছবি",
        "navRestore": "পুরানো ছবি",
        "navWatermark": "জলছাপ",
        "navPortrait": "প্রতিকৃতি",
        "navProduct": "পণ্য",
        "eyebrow": "অবজেক্ট ইরেজার · ব্লেমিশ রিমুভার · ডেট স্ট্যাম্প · বিভ্রান্তিকর বস্তু",
        "heroTitle": "AI অবজেক্ট ইরেজার এবং ওয়াটারমার্ক রিমুভার",
        "heroSub": "আপনার নিজের ফটোগুলির একটি আপলোড করুন, অবাঞ্ছিত বস্তু বা ওয়াটারমার্কের উপর আঁকুন, এবং AI এলাকাটি পরিষ্কারভাবে পূরণ করতে দিন।",
        "ownershipNotice": "আপনার নিজের ফটোগুলির জন্য।",
        "ownershipBody": "আপনার নিজস্ব সম্পদগুলি পরিষ্কার করতে MiaoCut ব্যবহার করুন — তারিখ স্ট্যাম্প, স্ক্রিনশট আর্টিফ্যাক্ট, আপনার নিজস্ব লোগো, বিভ্রান্তিকর বস্তু। তৃতীয় পক্ষের কপিরাইট ওয়াটারমার্ক অপসারণ করতে এটি ব্যবহার করবেন না।",
        "uploadText": "JPG, PNG, বা WebP আপলোড করতে ক্লিক করুন",
        "uploadHint": "ছোট চিহ্ন সহ উচ্চ-রেজোলিউশনের ছবিগুলি সবচেয়ে ভাল কাজ করে",
        "replaceHint": "এই ছবিটি প্রতিস্থাপন করতে ক্লিক করুন",
        "brushLabel": "ব্রাশের আকার",
        "clearBtn": "পরিষ্কার মাস্ক",
        "processBtn": "সরান",
        "downloadBtn": "ফলাফল ডাউনলোড করুন",
        "loading": "AI ছবিটি মেরামত করছে...",
        "tipsTitle": "সেরা ফলাফল",
        "tipsBody": "আপনি যা মুছতে চান তার প্রান্তের বাইরে সামান্য পেইন্ট করুন। বিস্তারিত এলাকার কাছাকাছি একটি ছোট ব্রাশ ব্যবহার করুন।",
        "sourceTitle": "পেইন্ট মাস্ক",
        "sourceSub": "আপনি অপসারণ করতে চান শুধুমাত্র বস্তু, দাগ, বা জলছাপ আবরণ.",
        "resultTitle": "ফলাফল",
        "resultSub": "মেরামত করা ছবি এখানে প্রদর্শিত হবে।",
        "emptySource": "পেইন্টিং শুরু করতে একটি ছবি আপলোড করুন",
        "emptyResult": "এখনো কোনো ফলাফল নেই",
        "seoTitle": "আপনার নিজের ফটো থেকে বস্তু, জলছাপ, এবং দাগ মুছে দিন",
        "seoBody": "MiaoCut এর AI অবজেক্ট ইরেজার আপনাকে মেরামত করার জন্য সঠিক এলাকা চিহ্নিত করতে দেয়। এটি তারিখের স্ট্যাম্প, স্ক্রিনশট আর্টিফ্যাক্ট, বিভ্রান্তিকর বস্তু, আপনার নিজস্ব লোগো এবং আপনার মালিকানাধীন বা সম্পাদনা করার সুস্পষ্ট অনুমতি আছে এমন ফটোতে ওয়াটারমার্কের জন্য দরকারী।",
        "seoCard1": "ম্যানুয়াল নির্ভুলতা",
        "seoCard1Body": "অবিশ্বাস্য স্বয়ংক্রিয় সনাক্তকরণের সাথে অনুমান করার পরিবর্তে অবাঞ্ছিত বিষয়বস্তু যেখানে উপস্থিত হয় ঠিক সেখানেই আঁকুন।",
        "seoCard2": "LaMa ইনপেইন্টিং",
        "seoCard2Body": "পেইন্ট করা জায়গাটি LaMa ব্যবহার করে মেরামত করা হয়েছে — একটি ওপেন সোর্স বড়-মাস্ক AI ইনপেইন্টিং মডেল।",
        "seoCard3": "ব্যক্তিগত কর্মপ্রবাহ",
        "seoCard3Body": "ছবি মেমরিতে প্রক্রিয়া করা হয় এবং অবিলম্বে বাতিল করা হয়। AI প্রশিক্ষণের জন্য কখনই ব্যবহার করা হয় না।",
        "howToTitle": "কিভাবে বস্তু, জলছাপ, এবং দাগ মুছে ফেলা যায়",
        "howStep1Title": "1. আপনার ছবি আপলোড করুন",
        "howStep1Body": "আপনার নিজের সংগ্রহ থেকে একটি JPG, PNG, বা WebP আপলোড করুন৷ কোন সাইন আপ বা ক্রেডিট কার্ড প্রয়োজন.",
        "howStep2Title": "2. এলাকার উপর পেইন্ট",
        "howStep2Body": "বস্তু, দাগ বা আপনার নিজের ওয়াটারমার্ক ঢেকে রাখতে ব্রাশ ব্যবহার করুন। ক্লিনার ফলাফলের জন্য প্রান্তের বাইরে সামান্য পেইন্ট করুন।",
        "howStep3Title": "3. পরিষ্কার করা ছবি ডাউনলোড করুন",
        "howStep3Body": "AI আশেপাশের প্রেক্ষাপটের উপর ভিত্তি করে আঁকা জায়গাটি পূরণ করতে LaMa ইনপেইন্টিং ব্যবহার করে। ফলাফলের পূর্বরূপ দেখুন এবং ডাউনলোড করুন।",
        "uploadFirst": "প্রথমে একটি ছবি আপলোড করুন।",
        "paintFirst": "আপনি প্রথমে যে জায়গাটি মুছে ফেলতে চান সেটি রঙ করুন।",
        "formatErr": "শুধুমাত্র JPG / PNG / WebP ফর্ম্যাটগুলি সমর্থিত",
        "failed": "প্রক্রিয়াকরণ ব্যর্থ হয়েছে৷",
        "resultAlt": "জলছাপ অপসারণ ফলাফল",
        "faqTitle": "প্রায়শই জিজ্ঞাসিত প্রশ্নাবলী",
        "faq1Q": "এই টুল দিয়ে আমি কি ধরনের বিষয়বস্তু মুছে ফেলতে পারি?",
        "faq1A": "MiaoCut আপনার ফটোতে ছোট অবাঞ্ছিত বিষয়বস্তুতে কাজ করে: বিভ্রান্তিকর বস্তু, আপনার ফোনের ক্যামেরা থেকে ডেট স্ট্যাম্প, স্ক্রিনশট আর্টিফ্যাক্ট, বার্ন-ইন সাবটাইটেল, পণ্যের শটগুলিতে আপনার নিজস্ব লোগো এবং আপনার মালিকানাধীন বা সম্পাদনা করার সুস্পষ্ট অনুমতি আছে এমন ফটোতে ওয়াটারমার্ক।",
        "faq2Q": "আমি কি আমার নিজের নয় এমন ফটো থেকে ওয়াটারমার্ক মুছে ফেলতে পারি?",
        "faq2A": "নং. MiaoCut হল আপনার নিজের বা সম্পাদনা করার সুস্পষ্ট অনুমতি আছে এমন ফটোগুলি সম্পাদনা করার জন্য৷ স্টক ফটো, সোশ্যাল মিডিয়া কন্টেন্ট, AI-জেনারেটেড ইমেজরি থেকে কপিরাইট ওয়াটারমার্ক মুছে ফেলার জন্য এটি ব্যবহার করবেন না বা আপনার অধিকার নেই এমন কোনও ছবি — যা কপিরাইট আইন লঙ্ঘন করতে পারে (উদাহরণস্বরূপ, মার্কিন যুক্তরাষ্ট্রে DMCA §1202) এবং অন্যান্য বিচারব্যবস্থায় সমতুল্য আইন।",
        "faq3Q": "কিভাবে AI আঁকা জায়গা মেরামত করে?",
        "faq3A": "MiaoCut LaMa (Large Mask Inpainting), একটি ওপেন সোর্স AI মডেল ব্যবহার করে। এটি আশেপাশের পিক্সেলগুলিকে বিশ্লেষণ করে এবং চিত্রের বাকি অংশের সাথে মেলে আঁকা জায়গাটি পূরণ করে৷",
        "faq4Q": "কি ধরনের ছবি ভালো কাজ করে?",
        "faq4A": "উচ্চ-রেজোলিউশন ফটো যেখানে চিহ্নটি ছবির একটি ছোট অংশকে কভার করে এবং আশেপাশের পটভূমিতে যথেষ্ট ভিজ্যুয়াল প্রসঙ্গ (আকাশ, সমতল প্রাচীর, এমনকি টেক্সচার) রয়েছে। মুখ বা বিস্তারিত প্যাটার্নের মতো জটিল বিষয়বস্তু জুড়ে চিহ্ন পরিষ্কারভাবে মেরামত করা কঠিন।",
        "faq5Q": "আমার ছবি আপলোড বা কোথাও সংরক্ষণ করা হয়?",
        "faq5A": "ছবিগুলি সার্ভারে মেমরিতে প্রক্রিয়া করা হয় এবং ফলাফল ফেরত দেওয়ার সাথে সাথেই বাতিল করা হয়। আমরা কখনই আপনার ছবি সঞ্চয় করি না, AI প্রশিক্ষণের জন্য এটি ব্যবহার করি না এবং সাইন আপের প্রয়োজন নেই।",
        "faq6Q": "আমার ফলাফল ঝাপসা বা অপরিষ্কার দেখায় কেন?",
        "faq6A": "একটি ছোট ব্রাশ দিয়ে প্রান্তের বাইরে সামান্য আঁকার চেষ্টা করুন। বিশদ বিষয়বস্তু জুড়ে খুব বড় চিহ্ন বা চিহ্নের জন্য, ফলাফল সীমিত হতে পারে — এই টুলটি সহজ পরিবেশ সহ ছোট, ভাল-বাউন্ডেড এলাকায় সবচেয়ে ভাল কাজ করে।",
        "footerLegalTitle": "গ্রহণযোগ্য ব্যবহার এবং আইনি বিজ্ঞপ্তি",
        "footerLegalBody1": "MiaoCut এর অবজেক্ট ইরেজারটি আপনার মালিকানাধীন বা সম্পাদনা করার সুস্পষ্ট অনুমতি আছে এমন চিত্রগুলি পরিষ্কার করার উদ্দেশ্যে। সাধারণ গ্রহণযোগ্য ব্যবহারগুলির মধ্যে রয়েছে আপনার নিজের ফোনের ফটোগুলি থেকে তারিখের স্ট্যাম্পগুলি সরানো, পুনরায় ডিজাইনের জন্য আপনার নিজস্ব লোগো মুছে ফেলা, স্ক্রিনশট শিল্পকর্মগুলি সরানো এবং আপনার নিজের পণ্যের শটগুলি পরিষ্কার করা।",
        "footerLegalBody2": "স্টক ফটো, সোশ্যাল মিডিয়া কন্টেন্ট, AI-জেনারেটেড ইমেজরি বা আপনার মালিকানা নেই বা আপনার অধিকার নেই এমন কোনো ছবি থেকে কপিরাইট ওয়াটারমার্ক মুছে ফেলতে এই টুলটি ব্যবহার করবেন না। কপিরাইট নোটিশ অপসারণ কপিরাইট আইন লঙ্ঘন করতে পারে (উদাহরণস্বরূপ, মার্কিন যুক্তরাষ্ট্রে DMCA §1202) এবং অন্যান্য বিচারব্যবস্থায় সমতুল্য আইন।",
        "footerLegalBody3": "MiaoCut মেমরিতে আপলোড করা ছবিগুলিকে প্রসেস করে এবং অবিলম্বে বাতিল করে দেয়৷ আমরা ব্যবহারকারী আপলোড সঞ্চয় বা প্রশিক্ষণ না. এই টুলটি ব্যবহার করে, আপনি নিশ্চিত করেছেন যে আপনার আপলোড করা ছবিটি সম্পাদনা করার অধিকার আপনার আছে। আমরা DMCA টেকডাউন পদ্ধতি মেনে চলি — আপনি যদি বিশ্বাস করেন যে আপনার অধিকার লঙ্ঘন করে বিষয়বস্তু প্রক্রিয়া করা হয়েছে, অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন।",
        "moreTitle": "আরও MiaoCut টুল",
        "moreLinkBgTitle": "AI ব্যাকগ্রাউন্ড রিমুভার →",
        "moreLinkBgDesc": "যেকোনো ছবির জন্য এক-ক্লিক স্বচ্ছ PNG কাটআউট।",
        "moreLinkOldPhotoTitle": "পুরানো ফটো পুনরুদ্ধার →",
        "moreLinkOldPhotoDesc": "ফ্যামিলি ফ্যামিলি ফটো পুনরুদ্ধার করুন, শব্দ কম করুন, বিশদ ধারালো করুন।",
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
        "pageTitle": "AI Object Eraser & Watermark Remover - Malinis na Larawan Online | MiaoCut",
        "metaDescription": "Libreng AI na pambura ng bagay at pantanggal ng dungis. Kulayan ang mga selyo ng petsa, nakakagambalang mga bagay, o sarili mong mga watermark — malinis na pinupuno ng AI ang lugar. Walang pag-signup, walang watermark sa output.",
        "metaKeywords": "object eraser, watermark remover, blemish remover, photo cleanup, image inpainting, object remover, remove date stamp, ai photo eraser, lama inpainting, malinis na background ng larawan",
        "ogTitle": "Libreng AI Object Eraser at Watermark Remover | MiaoCut",
        "ogDescription": "Kulayan ang mga selyo ng petsa, nakakagambalang mga bagay, o mga watermark sa iyong sariling mga larawan — malinis na pinupuno ng AI. Libre at walang pag-signup.",
        "ogLocale": "fil_PH",
        "navBg": "Background Remover",
        "navId": "ID Larawan",
        "navRestore": "Lumang Larawan",
        "navWatermark": "Watermark",
        "navPortrait": "Larawan",
        "navProduct": "produkto",
        "eyebrow": "Pambura ng bagay · Pantanggal ng dungis · Mga selyo ng petsa · Mga bagay na nakakagambala",
        "heroTitle": "AI Object Eraser at Watermark Remover",
        "heroSub": "Mag-upload ng isa sa iyong sariling mga larawan, pinturahan ang hindi gustong bagay o watermark, at hayaang punan ng AI ang lugar nang malinis.",
        "ownershipNotice": "Para sa mga larawang pagmamay-ari mo.",
        "ownershipBody": "Gamitin ang MiaoCut para linisin ang sarili mong mga asset — mga selyo ng petsa, mga artifact ng screenshot, sarili mong logo, mga bagay na nakakagambala. Huwag gamitin ito upang alisin ang mga watermark ng copyright ng third-party.",
        "uploadText": "I-click upang i-upload ang JPG, PNG, o WebP",
        "uploadHint": "Pinakamahusay na gumagana ang mga larawang may mataas na resolution na may maliliit na marka",
        "replaceHint": "I-click upang palitan ang larawang ito",
        "brushLabel": "Laki ng brush",
        "clearBtn": "Maaliwalas na maskara",
        "processBtn": "Alisin",
        "downloadBtn": "I-download ang resulta",
        "loading": "Inaayos ng AI ang larawan...",
        "tipsTitle": "Pinakamahusay na resulta",
        "tipsBody": "Kulayan nang bahagya ang gilid ng gusto mong burahin. Gumamit ng mas maliit na brush malapit sa mga detalyadong lugar.",
        "sourceTitle": "Magpinta ng maskara",
        "sourceSub": "Takpan lang ang bagay, dungis, o watermark na gusto mong alisin.",
        "resultTitle": "Resulta",
        "resultSub": "Lalabas dito ang naayos na imahe.",
        "emptySource": "Mag-upload ng larawan upang simulan ang pagpipinta",
        "emptyResult": "Wala pang resulta",
        "seoTitle": "Burahin ang mga bagay, watermark, at mantsa mula sa sarili mong mga larawan",
        "seoBody": "Hinahayaan ka ng MiaoCut na pambura ng object ng AI na markahan ang eksaktong lugar na aayusin. Ito ay kapaki-pakinabang para sa mga selyo ng petsa, mga artifact ng screenshot, nakakagambalang mga bagay, sarili mong mga logo, at mga watermark sa mga larawang pagmamay-ari mo o may tahasang pahintulot na mag-edit.",
        "seoCard1": "Manu-manong katumpakan",
        "seoCard1Body": "Kulayan nang eksakto kung saan lumalabas ang hindi gustong content sa halip na hulaan gamit ang hindi mapagkakatiwalaang auto detection.",
        "seoCard2": "LaMa inpainting",
        "seoCard2Body": "Ang pininturahan na lugar ay kinukumpuni gamit ang LaMa — isang open-source na malaking-mask na AI na inpainting na modelo.",
        "seoCard3": "Pribadong daloy ng trabaho",
        "seoCard3Body": "Ang mga imahe ay pinoproseso sa memorya at itinatapon kaagad. Hindi kailanman ginamit para sa AI na pagsasanay.",
        "howToTitle": "Paano Burahin ang Mga Bagay, Watermark, at Mantsa",
        "howStep1Title": "1. I-upload ang iyong larawan",
        "howStep1Body": "Mag-upload ng JPG, PNG, o WebP mula sa sarili mong koleksyon. Walang kinakailangang pag-signup o credit card.",
        "howStep2Title": "2. Kulayan ang lugar",
        "howStep2Body": "Gamitin ang brush upang takpan ang bagay, dungis, o ang iyong sariling watermark. Kulayan nang bahagya ang mga gilid para sa mas malinis na resulta.",
        "howStep3Title": "3. I-download ang nilinis na larawan",
        "howStep3Body": "Gumagamit ang AI ng LaMa na inpainting upang punan ang pininturahan na lugar batay sa nakapaligid na konteksto. Silipin ang resulta at i-download.",
        "uploadFirst": "Mag-upload muna ng larawan.",
        "paintFirst": "Kulayan muna ang lugar na gusto mong alisin.",
        "formatErr": "Tanging JPG / PNG / WebP format ang sinusuportahan",
        "failed": "Nabigo ang pagproseso",
        "resultAlt": "Resulta ng pag-alis ng watermark",
        "faqTitle": "Mga Madalas Itanong",
        "faq1Q": "Anong mga uri ng nilalaman ang maaari kong burahin gamit ang tool na ito?",
        "faq1A": "Gumagana ang MiaoCut sa maliit na hindi gustong content sa iyong mga larawan: nakakagambalang mga bagay, mga selyo ng petsa mula sa camera ng iyong telepono, mga artifact ng screenshot, mga burn-in na subtitle, sarili mong mga logo sa mga kuha ng produkto, at mga watermark sa mga larawang pagmamay-ari mo o may tahasang pahintulot na mag-edit.",
        "faq2Q": "Maaari ko bang alisin ang mga watermark sa mga larawang hindi ko pagmamay-ari?",
        "faq2A": "Hindi. Ang MiaoCut ay para sa pag-edit ng mga larawang pagmamay-ari mo o may tahasang pahintulot na mag-edit. Huwag gamitin ito upang mag-alis ng mga watermark ng copyright mula sa mga stock na larawan, nilalaman ng social media, koleksyon ng imahe na binuo ng AI, o anumang larawang wala kang karapatan — na maaaring lumabag sa batas sa copyright (halimbawa, DMCA §1202 sa US) at mga katumbas na batas sa ibang hurisdiksyon.",
        "faq3Q": "Paano kinukumpuni ng AI ang pininturahan na lugar?",
        "faq3A": "Gumagamit ang MiaoCut ng LaMa (Large Mask Inpainting), isang open-source na modelong AI. Sinusuri nito ang mga nakapaligid na pixel at pinupunan ang pininturahan na lugar upang tumugma sa natitirang bahagi ng larawan.",
        "faq4Q": "Anong mga uri ng mga larawan ang pinakamahusay na gumagana?",
        "faq4A": "Mga larawang may mataas na resolution kung saan ang marka ay sumasaklaw sa isang maliit na bahagi ng larawan, at ang nakapalibot na background ay may sapat na visual na konteksto (kalangitan, payak na pader, kahit na texture). Ang mga marka sa kumplikadong nilalaman tulad ng mga mukha o mga detalyadong pattern ay mas mahirap ayusin nang malinis.",
        "faq5Q": "Ang aking mga larawan ba ay na-upload o nakaimbak kahit saan?",
        "faq5A": "Ang mga imahe ay pinoproseso sa memorya sa server at itinatapon kaagad pagkatapos maibalik ang resulta. Hindi namin iniimbak ang iyong larawan, hindi kailanman ginagamit ito para sa pagsasanay sa AI, at walang kinakailangang pag-signup.",
        "faq6Q": "Bakit mukhang malabo o hindi malinis ang aking resulta?",
        "faq6A": "Subukang magpinta nang bahagya sa kabila ng gilid gamit ang mas maliit na brush. Para sa napakalaking marka o marka sa detalyadong nilalaman, maaaring limitado ang mga resulta — ang tool na ito ay pinakamahusay na gumagana sa maliliit, mahusay na hangganan na mga lugar na may simpleng kapaligiran.",
        "footerLegalTitle": "Katanggap-tanggap na Paggamit at Legal na Paunawa",
        "footerLegalBody1": "Ang object eraser ng MiaoCut ay inilaan para sa paglilinis ng mga larawang pagmamay-ari mo o may tahasang pahintulot na mag-edit. Kabilang sa mga karaniwang katanggap-tanggap na paggamit ang pag-alis ng mga selyo ng petsa mula sa sarili mong mga larawan sa telepono, pagbubura ng sarili mong mga logo para sa muling pagdidisenyo, pag-alis ng mga artifact ng screenshot, at paglilinis ng sarili mong mga kuha ng produkto.",
        "footerLegalBody2": "Huwag gamitin ang tool na ito upang alisin ang mga watermark ng copyright mula sa mga stock na larawan, nilalaman ng social media, koleksyon ng imahe na binuo ng AI, o anumang larawang hindi mo pagmamay-ari o may mga karapatan. Ang pag-alis ng mga abiso sa copyright ay maaaring lumabag sa batas ng copyright (halimbawa, DMCA §1202 sa United States) at mga katumbas na batas sa ibang mga hurisdiksyon.",
        "footerLegalBody3": "Pinoproseso ng MiaoCut ang mga na-upload na larawan sa memorya at agad na itinatapon ang mga ito. Hindi kami nag-iimbak o nagsasanay sa mga pag-upload ng user. Sa paggamit ng tool na ito, kinukumpirma mo na may karapatan kang i-edit ang larawang iyong ina-upload. Sumusunod kami sa mga pamamaraan ng pagtanggal ng DMCA — kung naniniwala kang naproseso ang content na lumalabag sa iyong mga karapatan, mangyaring makipag-ugnayan sa amin.",
        "moreTitle": "Higit pang MiaoCut Tools",
        "moreLinkBgTitle": "AI Background Remover →",
        "moreLinkBgDesc": "Isang-click na transparent na PNG cutout para sa anumang larawan.",
        "moreLinkOldPhotoTitle": "Pagpapanumbalik ng Lumang Larawan →",
        "moreLinkOldPhotoDesc": "Ibalik ang mga kupas na larawan ng pamilya, bawasan ang ingay, patalasin ang mga detalye.",
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
        "pageTitle": "AI آبجیکٹ ایریزر اور واٹر مارک ہٹانے والا - صاف تصاویر آن لائن | MiaoCut",
        "metaDescription": "مفت AI آبجیکٹ صاف کرنے والا اور داغ ہٹانے والا۔ تاریخ کے ڈاک ٹکٹوں، توجہ ہٹانے والی اشیاء، یا آپ کے اپنے واٹر مارکس پر پینٹ کریں — AI علاقے کو صاف ستھرا بھرتا ہے۔ کوئی سائن اپ نہیں، آؤٹ پٹ پر کوئی واٹر مارک نہیں۔",
        "metaKeywords": "آبجیکٹ صاف کرنے والا، واٹر مارک ہٹانے والا، داغ ہٹانے والا، تصویر کی صفائی، تصویر کی پینٹنگ، آبجیکٹ ہٹانے والا، ڈیٹ اسٹیمپ کو ہٹانا، اے آئی فوٹو صاف کرنے والا، لاما پینٹنگ، تصویر کا صاف پس منظر",
        "ogTitle": "مفت AI آبجیکٹ صافی اور واٹر مارک ہٹانے والا | MiaoCut",
        "ogDescription": "آپ کی اپنی تصاویر پر تاریخ کے ڈاک ٹکٹوں، پریشان کن اشیاء، یا واٹر مارکس کو پینٹ کریں — AI صاف طور پر بھرتا ہے۔ مفت اور کوئی سائن اپ نہیں۔",
        "ogLocale": "ur_PK",
        "navBg": "پس منظر ہٹانے والا",
        "navId": "ID تصویر",
        "navRestore": "پرانی تصویر",
        "navWatermark": "واٹر مارک",
        "navPortrait": "پورٹریٹ",
        "navProduct": "پروڈکٹ",
        "eyebrow": "آبجیکٹ صاف کرنے والا · داغ ہٹانے والا · تاریخ کے ڈاک ٹکٹ · توجہ ہٹانے والی اشیاء",
        "heroTitle": "AI آبجیکٹ ایریزر اور واٹر مارک ہٹانے والا",
        "heroSub": "اپنی ایک تصویر اپ لوڈ کریں، ناپسندیدہ چیز یا واٹر مارک پر پینٹ کریں، اور AI کو صاف ستھرا جگہ بھرنے دیں۔",
        "ownershipNotice": "آپ کی اپنی تصاویر کے لیے۔",
        "ownershipBody": "اپنے اپنے اثاثوں کو صاف کرنے کے لیے MiaoCut کا استعمال کریں — تاریخ کے ڈاک ٹکٹ، اسکرین شاٹ کے نمونے، اپنے لوگو، پریشان کن اشیاء۔ تیسرے فریق کے کاپی رائٹ واٹر مارکس کو ہٹانے کے لیے اسے استعمال نہ کریں۔",
        "uploadText": "JPG، PNG، یا WebP اپ لوڈ کرنے کے لیے کلک کریں",
        "uploadHint": "چھوٹے نشانوں والی ہائی ریزولوشن والی تصاویر بہترین کام کرتی ہیں۔",
        "replaceHint": "اس تصویر کو تبدیل کرنے کے لیے کلک کریں۔",
        "brushLabel": "برش کا سائز",
        "clearBtn": "صاف ماسک",
        "processBtn": "ہٹا دیں۔",
        "downloadBtn": "نتیجہ ڈاؤن لوڈ کریں۔",
        "loading": "AI تصویر کی مرمت کر رہا ہے...",
        "tipsTitle": "بہترین نتائج",
        "tipsBody": "جس چیز کو آپ مٹانا چاہتے ہیں اس کے کنارے سے تھوڑا سا پینٹ کریں۔ تفصیلی علاقوں کے قریب چھوٹا برش استعمال کریں۔",
        "sourceTitle": "پینٹ ماسک",
        "sourceSub": "صرف اس چیز، داغ یا واٹر مارک کو ڈھانپیں جسے آپ ہٹانا چاہتے ہیں۔",
        "resultTitle": "نتیجہ",
        "resultSub": "مرمت شدہ تصویر یہاں ظاہر ہوگی۔",
        "emptySource": "پینٹنگ شروع کرنے کے لیے ایک تصویر اپ لوڈ کریں۔",
        "emptyResult": "ابھی تک کوئی نتیجہ نہیں نکلا۔",
        "seoTitle": "اپنی تصاویر سے اشیاء، واٹر مارکس اور داغ مٹائیں۔",
        "seoBody": "MiaoCut کا AI آبجیکٹ صاف کرنے والا آپ کو ٹھیک کرنے کے لیے صحیح جگہ کو نشان زد کرنے دیتا ہے۔ یہ تاریخ کے ڈاک ٹکٹوں، اسکرین شاٹ کے نمونے، توجہ ہٹانے والی اشیاء، آپ کے اپنے لوگو، اور ان تصاویر پر واٹر مارکس کے لیے مفید ہے جو آپ کی ملکیت ہیں یا آپ کو ترمیم کرنے کی واضح اجازت ہے۔",
        "seoCard1": "دستی درستگی",
        "seoCard1Body": "ناقابل بھروسہ آٹو ڈیٹیکشن کے ساتھ اندازہ لگانے کے بجائے جہاں ناپسندیدہ مواد ظاہر ہوتا ہے وہاں پینٹ کریں۔",
        "seoCard2": "LaMa پینٹنگ",
        "seoCard2Body": "پینٹ شدہ جگہ کی مرمت LaMa - ایک اوپن سورس بڑے ماسک AI ان پینٹنگ ماڈل کا استعمال کرتے ہوئے کی جاتی ہے۔",
        "seoCard3": "پرائیویٹ ورک فلو",
        "seoCard3Body": "تصاویر کو میموری میں پروسیس کیا جاتا ہے اور فوری طور پر ضائع کر دیا جاتا ہے۔ AI ٹریننگ کے لیے کبھی استعمال نہیں کیا گیا۔",
        "howToTitle": "آبجیکٹ، واٹر مارکس اور داغوں کو کیسے مٹایا جائے۔",
        "howStep1Title": "1. اپنی تصویر اپ لوڈ کریں۔",
        "howStep1Body": "اپنے اپنے مجموعہ سے JPG، PNG، یا WebP اپ لوڈ کریں۔ کوئی سائن اپ یا کریڈٹ کارڈ کی ضرورت نہیں ہے۔",
        "howStep2Title": "2. علاقے پر پینٹ کریں۔",
        "howStep2Body": "شے، داغ، یا اپنے واٹر مارک کو ڈھانپنے کے لیے برش کا استعمال کریں۔ صاف ستھرا نتائج کے لیے کناروں سے تھوڑا سا پینٹ کریں۔",
        "howStep3Title": "3۔ صاف شدہ تصویر ڈاؤن لوڈ کریں۔",
        "howStep3Body": "AI ارد گرد کے سیاق و سباق کی بنیاد پر پینٹ شدہ جگہ کو بھرنے کے لیے LaMa پینٹنگ کا استعمال کرتا ہے۔ نتیجہ کا جائزہ لیں اور ڈاؤن لوڈ کریں۔",
        "uploadFirst": "پہلے ایک تصویر اپ لوڈ کریں۔",
        "paintFirst": "اس علاقے کو پینٹ کریں جسے آپ پہلے ہٹانا چاہتے ہیں۔",
        "formatErr": "صرف JPG / PNG / WebP فارمیٹس تعاون یافتہ ہیں",
        "failed": "پروسیسنگ ناکام ہوگئی",
        "resultAlt": "واٹر مارک ہٹانے کا نتیجہ",
        "faqTitle": "اکثر پوچھے گئے سوالات",
        "faq1Q": "میں اس ٹول سے کس قسم کے مواد کو مٹا سکتا ہوں؟",
        "faq1A": "MiaoCut آپ کی تصاویر میں چھوٹے ناپسندیدہ مواد پر کام کرتا ہے: توجہ ہٹانے والی اشیاء، آپ کے فون کے کیمرہ سے تاریخ کے ڈاک ٹکٹ، اسکرین شاٹ کے نمونے، جلے ہوئے سب ٹائٹلز، پروڈکٹ شاٹس پر آپ کے اپنے لوگو، اور ان تصاویر پر واٹر مارکس جو آپ کی ملکیت ہیں یا آپ کے پاس ترمیم کرنے کی واضح اجازت ہے۔",
        "faq2Q": "کیا میں ان تصاویر سے واٹر مارکس کو ہٹا سکتا ہوں جو میری ملکیت نہیں ہیں؟",
        "faq2A": "نہیں۔ اسے اسٹاک فوٹوز، سوشل میڈیا مواد، AI سے تیار کردہ امیجری، یا کسی ایسی تصویر سے کاپی رائٹ کے واٹر مارکس کو ہٹانے کے لیے استعمال نہ کریں جس کے آپ کو حقوق حاصل نہیں ہیں — جو کاپی رائٹ کے قانون کی خلاف ورزی کر سکتا ہے (مثال کے طور پر، امریکہ میں DMCA §1202) اور دیگر دائرہ اختیار میں مساوی قوانین۔",
        "faq3Q": "AI پینٹ شدہ جگہ کی مرمت کیسے کرتا ہے؟",
        "faq3A": "MiaoCut LaMa (Large Mask Inpainting) استعمال کرتا ہے، ایک اوپن سورس AI ماڈل۔ یہ ارد گرد کے پکسلز کا تجزیہ کرتا ہے اور باقی تصویر سے ملنے کے لیے پینٹ والے حصے میں بھرتا ہے۔",
        "faq4Q": "کس قسم کی تصاویر بہترین کام کرتی ہیں؟",
        "faq4A": "اعلی ریزولیوشن والی تصاویر جہاں نشان تصویر کے ایک چھوٹے سے حصے کا احاطہ کرتا ہے، اور ارد گرد کے پس منظر میں کافی بصری سیاق و سباق (آسمان، سادہ دیوار، یہاں تک کہ ساخت) ہے۔ پیچیدہ مواد جیسے چہروں یا تفصیلی نمونوں پر نشانات کی صفائی سے مرمت کرنا مشکل ہے۔",
        "faq5Q": "کیا میری تصاویر کہیں بھی اپ لوڈ یا محفوظ ہیں؟",
        "faq5A": "تصاویر کو سرور پر میموری میں پروسیس کیا جاتا ہے اور نتیجہ واپس آنے کے فوراً بعد ضائع کر دیا جاتا ہے۔ ہم کبھی بھی آپ کی تصویر کو اسٹور نہیں کرتے، اسے AI ٹریننگ کے لیے کبھی استعمال نہیں کرتے، اور اس کے لیے سائن اپ کی ضرورت نہیں ہے۔",
        "faq6Q": "میرا نتیجہ دھندلا یا ناپاک کیوں لگتا ہے؟",
        "faq6A": "ایک چھوٹے برش کے ساتھ کنارے سے تھوڑا سا آگے پینٹ کرنے کی کوشش کریں۔ تفصیلی مواد پر بہت بڑے نشانات یا نشانات کے لیے، نتائج محدود ہو سکتے ہیں — یہ ٹول چھوٹے، اچھی طرح سے بند علاقوں پر سادہ ماحول کے ساتھ بہترین کام کرتا ہے۔",
        "footerLegalTitle": "قابل قبول استعمال اور قانونی نوٹس",
        "footerLegalBody1": "MiaoCut کا آبجیکٹ صاف کرنے والا ان تصاویر کو صاف کرنے کے لیے ہے جو آپ کی ملکیت ہیں یا آپ کے پاس ترمیم کرنے کی واضح اجازت ہے۔ عام قابل قبول استعمال میں آپ کے اپنے فون کی تصاویر سے تاریخ کے ڈاک ٹکٹ ہٹانا، دوبارہ ڈیزائن کرنے کے لیے آپ کے اپنے لوگو کو مٹانا، اسکرین شاٹ کے نمونے ہٹانا، اور اپنے پروڈکٹ شاٹس کو صاف کرنا شامل ہیں۔",
        "footerLegalBody2": "اس ٹول کو اسٹاک فوٹوز، سوشل میڈیا مواد، AI سے تیار کردہ امیجری، یا کسی ایسی تصویر سے کاپی رائٹ واٹر مارکس کو ہٹانے کے لیے استعمال نہ کریں جس کے آپ مالک نہیں ہیں یا آپ کے پاس حقوق نہیں ہیں۔ کاپی رائٹ نوٹس کو ہٹانے سے کاپی رائٹ قانون کی خلاف ورزی ہو سکتی ہے (مثال کے طور پر، DMCA §1202 ریاستہائے متحدہ میں) اور دیگر دائرہ اختیار میں مساوی قوانین۔",
        "footerLegalBody3": "MiaoCut اپ لوڈ کردہ تصاویر کو میموری میں پروسیس کرتا ہے اور انہیں فوری طور پر ضائع کر دیتا ہے۔ ہم صارف کے اپ لوڈز کو اسٹور یا تربیت نہیں دیتے ہیں۔ اس ٹول کو استعمال کرکے، آپ تصدیق کرتے ہیں کہ آپ کو اپ لوڈ کردہ تصویر میں ترمیم کرنے کا حق حاصل ہے۔ ہم DMCA اخراج کے طریقہ کار کی تعمیل کرتے ہیں — اگر آپ کو یقین ہے کہ مواد پر آپ کے حقوق کی خلاف ورزی کی گئی ہے تو براہ کرم ہم سے رابطہ کریں۔",
        "moreTitle": "مزید MiaoCut ٹولز",
        "moreLinkBgTitle": "AI بیک گراؤنڈ ریموور →",
        "moreLinkBgDesc": "کسی بھی تصویر کے لیے شفاف PNG کٹ آؤٹ پر ایک کلک کریں۔",
        "moreLinkOldPhotoTitle": "پرانی تصویر کی بحالی →",
        "moreLinkOldPhotoDesc": "دھندلی خاندانی تصاویر کو بحال کریں، شور کم کریں، تفصیلات کو تیز کریں۔",
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
    // 不再用 localStorage 决定语言：每个 URL（/watermark-remover/ vs /zh/watermark-remover/ 等）已经
    // 是预渲染好的对应语种，让 Google 能分别索引，JS 只负责动态文案。
    const _htmlLang = (document.documentElement.lang || 'en').toLowerCase();
    const state = {
        lang: localeFromHtmlLang(_htmlLang),
        file: null,
        sourceObjectUrl: null,
        resultObjectUrl: null,
        drawing: false,
        lastPoint: null,
        hasPaint: false,
    };

    const $ = (id) => document.getElementById(id);
    const imageInput = $('imageInput');
    const brushSize = $('brushSize');
    const brushValue = $('brushValue');
    const clearButton = $('clearButton');
    const processButton = $('processButton');
    const downloadButton = $('downloadButton');
    const emptyState = $('emptyState');
    const imageWrap = $('imageWrap');
    const sourceImage = $('sourceImage');
    const drawCanvas = $('drawCanvas');
    const resultBox = $('resultBox');
    const loading = $('loading');
    const statusText = $('status');
    const langSwitch = $('lang-switch');
    const fileName = $('file-name');
    const uploadHint = $('upload-hint');
    const drawCtx = drawCanvas.getContext('2d');

    function t(key) {
        return (i18n[state.lang] && i18n[state.lang][key]) || i18n.en[key] || key;
    }

    function track(name, data) {
        if (typeof umami === 'undefined') return;
        try {
            if (data) umami.track(name, data); else umami.track(name);
        } catch (_) { /* analytics should not affect editing */ }
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
        // 从字典读 <title>、meta description/keywords、og:* —— 单一来源，避免和 i18n 字典 + 静态 HTML 漂移
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
        // <html lang> 由静态 HTML 在构建时写死（zh-CN / en）；不再 JS 动态覆盖
    }

    function setStatus(text) {
        statusText.textContent = text || '';
    }

    brushSize.addEventListener('input', () => {
        brushValue.textContent = brushSize.value;
    });

    imageInput.addEventListener('change', () => {
        const file = imageInput.files && imageInput.files[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setStatus(t('formatErr'));
            return;
        }

        state.file = file;
        state.hasPaint = false;
        setStatus('');
        clearResult();

        if (state.sourceObjectUrl) URL.revokeObjectURL(state.sourceObjectUrl);
        state.sourceObjectUrl = URL.createObjectURL(file);
        sourceImage.src = state.sourceObjectUrl;
        fileName.textContent = file.name;
        uploadHint.textContent = t('replaceHint');
        track('watermark-uploaded', { type: file.type.replace('image/', '') });
    });

    sourceImage.addEventListener('load', () => {
        emptyState.hidden = true;
        imageWrap.hidden = false;
        resizeCanvasToImage();
        clearDrawing();
        clearButton.disabled = false;
        processButton.disabled = false;
    });

    window.addEventListener('resize', () => {
        if (!imageWrap.hidden) {
            const snapshot = document.createElement('canvas');
            snapshot.width = drawCanvas.width;
            snapshot.height = drawCanvas.height;
            snapshot.getContext('2d').drawImage(drawCanvas, 0, 0);
            resizeCanvasToImage();
            drawCtx.drawImage(snapshot, 0, 0, drawCanvas.width, drawCanvas.height);
        }
    });

    clearButton.addEventListener('click', () => {
        clearDrawing();
        setStatus('');
    });

    processButton.addEventListener('click', processImage);

    downloadButton.addEventListener('click', () => {
        if (!state.resultObjectUrl) return;
        const a = document.createElement('a');
        const baseName = (state.file && state.file.name ? state.file.name : 'image').replace(/\.[^.]+$/, '');
        a.href = state.resultObjectUrl;
        a.download = `${baseName}_cleaned.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        track('watermark-downloaded');
    });

    drawCanvas.addEventListener('pointerdown', (event) => {
        if (!state.file) return;
        state.drawing = true;
        drawCanvas.setPointerCapture(event.pointerId);
        state.lastPoint = getCanvasPoint(event);
        paintLine(state.lastPoint, state.lastPoint);
    });

    drawCanvas.addEventListener('pointermove', (event) => {
        if (!state.drawing || !state.lastPoint) return;
        const nextPoint = getCanvasPoint(event);
        paintLine(state.lastPoint, nextPoint);
        state.lastPoint = nextPoint;
    });

    drawCanvas.addEventListener('pointerup', stopDrawing);
    drawCanvas.addEventListener('pointercancel', stopDrawing);
    drawCanvas.addEventListener('pointerleave', stopDrawing);

    async function processImage() {
        if (!state.file) {
            setStatus(t('uploadFirst'));
            return;
        }
        if (!state.hasPaint) {
            setStatus(t('paintFirst'));
            return;
        }

        setBusy(true);
        setStatus('');

        try {
            const maskBlob = await createBlackWhiteMaskBlob();
            const formData = new FormData();
            formData.append('image', state.file, state.file.name || 'image.png');
            formData.append('mask', maskBlob, 'mask.png');

            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || t('failed'));
            }

            const resultBlob = await response.blob();
            if (state.resultObjectUrl) URL.revokeObjectURL(state.resultObjectUrl);
            state.resultObjectUrl = URL.createObjectURL(resultBlob);
            resultBox.innerHTML = '';
            const resultImage = document.createElement('img');
            resultImage.src = state.resultObjectUrl;
            resultImage.alt = t('resultAlt');
            resultImage.className = 'block max-h-[560px] max-w-full object-contain';
            resultBox.appendChild(resultImage);
            downloadButton.classList.remove('hidden');
            track('watermark-success');
        } catch (error) {
            setStatus(`${t('failed')}: ${error.message}`);
            track('watermark-failed', { reason: error.message || 'unknown' });
        } finally {
            setBusy(false);
        }
    }

    function resizeCanvasToImage() {
        const rect = sourceImage.getBoundingClientRect();
        drawCanvas.width = Math.max(1, Math.round(rect.width));
        drawCanvas.height = Math.max(1, Math.round(rect.height));
        drawCanvas.style.width = `${rect.width}px`;
        drawCanvas.style.height = `${rect.height}px`;
    }

    function clearDrawing() {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        state.hasPaint = false;
    }

    function clearResult() {
        if (state.resultObjectUrl) URL.revokeObjectURL(state.resultObjectUrl);
        state.resultObjectUrl = null;
        downloadButton.classList.add('hidden');
        resultBox.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'px-8 text-center text-sm text-gray-400';
        empty.setAttribute('data-i18n', 'emptyResult');
        empty.textContent = t('emptyResult');
        resultBox.appendChild(empty);
    }

    function stopDrawing() {
        state.drawing = false;
        state.lastPoint = null;
    }

    function getCanvasPoint(event) {
        const rect = drawCanvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    function paintLine(from, to) {
        drawCtx.strokeStyle = 'rgba(220, 38, 38, 0.48)';
        drawCtx.lineWidth = Number(brushSize.value);
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.beginPath();
        drawCtx.moveTo(from.x, from.y);
        drawCtx.lineTo(to.x, to.y);
        drawCtx.stroke();
        state.hasPaint = true;
    }

    async function createBlackWhiteMaskBlob() {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = sourceImage.naturalWidth;
        maskCanvas.height = sourceImage.naturalHeight;
        const maskCtx = maskCanvas.getContext('2d');

        maskCtx.fillStyle = '#000000';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

        const displayPixels = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
        const whitePixels = maskCtx.createImageData(drawCanvas.width, drawCanvas.height);

        for (let i = 0; i < displayPixels.data.length; i += 4) {
            if (displayPixels.data[i + 3] > 0) {
                whitePixels.data[i] = 255;
                whitePixels.data[i + 1] = 255;
                whitePixels.data[i + 2] = 255;
                whitePixels.data[i + 3] = 255;
            }
        }

        const displayMaskCanvas = document.createElement('canvas');
        displayMaskCanvas.width = drawCanvas.width;
        displayMaskCanvas.height = drawCanvas.height;
        displayMaskCanvas.getContext('2d').putImageData(whitePixels, 0, 0);
        maskCtx.imageSmoothingEnabled = false;
        maskCtx.drawImage(displayMaskCanvas, 0, 0, maskCanvas.width, maskCanvas.height);

        const strictMask = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        for (let i = 0; i < strictMask.data.length; i += 4) {
            const value = strictMask.data[i] > 0 ? 255 : 0;
            strictMask.data[i] = value;
            strictMask.data[i + 1] = value;
            strictMask.data[i + 2] = value;
            strictMask.data[i + 3] = 255;
        }
        maskCtx.putImageData(strictMask, 0, 0);

        return new Promise((resolve, reject) => {
            maskCanvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Mask creation failed'));
            }, 'image/png');
        });
    }

    function setBusy(isBusy) {
        loading.classList.toggle('hidden', !isBusy);
        processButton.disabled = isBusy || !state.file;
        clearButton.disabled = isBusy || !state.file;
        imageInput.disabled = isBusy;
    }

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
