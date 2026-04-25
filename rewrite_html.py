import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update html lang
html = html.replace('<html lang="zh-CN">', '<html lang="en">')

# 2. Add language dropdown in header
header_replace = """        <div class="flex items-center gap-4">
            <select id="lang-switch" class="bg-transparent text-sm font-medium text-gray-600 outline-none cursor-pointer hover:text-gray-900 transition-colors">
                <option value="en">English</option>
                <option value="zh">简体中文</option>
            </select>
            <a href="#" class="text-gray-400 hover:text-gray-900 transition-colors" title="GitHub">"""
html = html.replace('        <a href="#" class="text-gray-400 hover:text-gray-900 transition-colors" title="GitHub">', header_replace)
html = html.replace('        </a>\n    </header>', '        </a>\n        </div>\n    </header>')

# 3. Translate main elements and add data-i18n
html = html.replace('<h1 class="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">1秒纯净抠图</h1>', '<h1 class="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4" data-i18n="title">1-Second HD Cutout</h1>')
html = html.replace('<p class="text-lg text-gray-500">不谈排版，只给白底。</p>', '<p class="text-lg text-gray-500" data-i18n="subtitle">No fuss, just pure transparent backgrounds.</p>')

html = html.replace('<p class="text-lg font-medium text-gray-700 mb-1">将图片拖拽至此，或点击上传</p>', '<p class="text-lg font-medium text-gray-700 mb-1" data-i18n="dropzoneTitle">Drag & drop image here, or click to upload</p>')
html = html.replace('<p class="text-sm text-gray-400">（支持 JPG / PNG / WebP）</p>', '<p class="text-sm text-gray-400" data-i18n="dropzoneSub">(Supports JPG / PNG / WebP)</p>')

html = html.replace('<span class="font-medium">你的图片绝对安全。</span>', '<span class="font-medium" data-i18n="trustTitle">Your images are 100% safe.</span>')
html = html.replace('<p>纯内存处理，15分钟后自动销毁，绝不用于 AI 训练。</p>', '<p data-i18n="trustSub">Processed in-memory, destroyed automatically. Never used for AI training.</p>')

html = html.replace('<p class="text-sm">&#21916;&#27426; MiaoCut &#21527;&#65311;&#25353; <kbd id="shortcut-key" class="px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono">Ctrl + D</kbd> &#21152;&#20837;&#20070;&#31614;&#65292;&#19979;&#27425;&#25248;&#22270;&#21482;&#38656; 1 &#31186;&#65281;</p>', '<p class="text-sm"><span data-i18n="bookmarkText">Like MiaoCut? Press</span> <kbd id="shortcut-key" class="px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono">Ctrl + D</kbd> <span data-i18n="bookmarkSuffix">to bookmark, next cutout is just 1 sec away!</span></p>')

html = html.replace('<h3 class="text-sm font-semibold text-gray-900 mb-3">&#9749; &#25552;&#28857;&#24314;&#35758;</h3>', '<h3 class="text-sm font-semibold text-gray-900 mb-3" data-i18n="fbTitle">&#9749; Feedback</h3>')
html = html.replace('placeholder="&#26377;&#20160;&#20040;&#24819;&#27861;&#65311;"', 'placeholder="What\'s on your mind?" data-i18n-ph="fbPlaceholder"')
html = html.replace('placeholder="&#37038;&#31665;&#65288;&#36873;&#22635;&#65292;&#26041;&#20415;&#25105;&#20204;&#22238;&#22797;&#20320;&#65289;"', 'placeholder="Email (Optional)" data-i18n-ph="fbEmail"')
html = html.replace('<button type="submit" class="w-full mt-3 bg-gray-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-800 transition-colors">&#21457;&#36865;</button>', '<button type="submit" class="w-full mt-3 bg-gray-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-800 transition-colors" data-i18n="fbSend">Send</button>')
html = html.replace('<p class="text-sm font-medium text-gray-800">&#24863;&#35874;&#20320;&#30340;&#24314;&#35758;&#65281;</p>', '<p class="text-sm font-medium text-gray-800" data-i18n="fbThanks">Thanks for your feedback!</p>')
html = html.replace('<p class="text-xs text-gray-500 mt-1">&#25105;&#20204;&#20250;&#35748;&#30495;&#23545;&#24453;&#27599;&#19968;&#26465;&#21453;&#39304;</p>', '<p class="text-xs text-gray-500 mt-1" data-i18n="fbThanksSub">We read every single message.</p>')

# Add data-i18n to SEO sections
html = html.replace('<h2 class="text-3xl font-extrabold text-gray-900 mb-8 text-center">How It Works</h2>', '<h2 class="text-3xl font-extrabold text-gray-900 mb-8 text-center" data-i18n="howItWorks">How It Works</h2>')
html = html.replace('<h3 class="font-bold text-gray-900 mb-2 text-lg">1. Upload Image</h3>', '<h3 class="font-bold text-gray-900 mb-2 text-lg" data-i18n="uploadImg">1. Upload Image</h3>')
html = html.replace('<p class="text-sm leading-relaxed">Drag & drop any JPG, PNG, or WebP image. No sign-up or credit card required.</p>', '<p class="text-sm leading-relaxed" data-i18n="uploadDesc">Drag & drop any JPG, PNG, or WebP image. No sign-up or credit card required.</p>')
html = html.replace('<h3 class="font-bold text-gray-900 mb-2 text-lg">2. AI Processing</h3>', '<h3 class="font-bold text-gray-900 mb-2 text-lg" data-i18n="aiProc">2. AI Processing</h3>')
html = html.replace('<p class="text-sm leading-relaxed">Our SOTA AI model (BiRefNet) analyzes and removes the background precisely in just 1 second.</p>', '<p class="text-sm leading-relaxed" data-i18n="aiDesc">Our SOTA AI model (BiRefNet) analyzes and removes the background precisely in just 1 second.</p>')
html = html.replace('<h3 class="font-bold text-gray-900 mb-2 text-lg">3. Download Free</h3>', '<h3 class="font-bold text-gray-900 mb-2 text-lg" data-i18n="dlFree">3. Download Free</h3>')
html = html.replace('<p class="text-sm leading-relaxed">Instantly get your transparent background cutout in high resolution.</p>', '<p class="text-sm leading-relaxed" data-i18n="dlDesc">Instantly get your transparent background cutout in high resolution.</p>')

html = html.replace('<h2 class="text-3xl font-extrabold text-gray-900 mb-8 text-center">Why Choose MiaoCut?</h2>', '<h2 class="text-3xl font-extrabold text-gray-900 mb-8 text-center" data-i18n="whyChoose">Why Choose MiaoCut?</h2>')
html = html.replace('<strong class="block text-gray-900 mb-1">100% Free & Unlimited</strong>', '<strong class="block text-gray-900 mb-1" data-i18n="freeLimit">100% Free & Unlimited</strong>')
html = html.replace('<span class="text-sm text-gray-600">No hidden costs, no subscription traps. Process as many images as you need.</span>', '<span class="text-sm text-gray-600" data-i18n="freeDesc">No hidden costs, no subscription traps. Process as many images as you need.</span>')
html = html.replace('<strong class="block text-gray-900 mb-1">High Definition (HD)</strong>', '<strong class="block text-gray-900 mb-1" data-i18n="hdQuality">High Definition (HD)</strong>')
html = html.replace('<span class="text-sm text-gray-600">Unlike other tools that compress your results, we maintain the original high quality.</span>', '<span class="text-sm text-gray-600" data-i18n="hdDesc">Unlike other tools that compress your results, we maintain the original high quality.</span>')
html = html.replace('<strong class="block text-gray-900 mb-1">No Watermarks</strong>', '<strong class="block text-gray-900 mb-1" data-i18n="noWatermark">No Watermarks</strong>')
html = html.replace('<span class="text-sm text-gray-600">Use your transparent cutouts for e-commerce, design, or personal projects freely.</span>', '<span class="text-sm text-gray-600" data-i18n="noWDesc">Use your transparent cutouts for e-commerce, design, or personal projects freely.</span>')
html = html.replace('<strong class="block text-gray-900 mb-1">Privacy First</strong>', '<strong class="block text-gray-900 mb-1" data-i18n="privacyFirst">Privacy First</strong>')
html = html.replace('<span class="text-sm text-gray-600">Images are processed in-memory and destroyed automatically. We don\'t train on your data.</span>', '<span class="text-sm text-gray-600" data-i18n="privacyDesc">Images are processed in-memory and destroyed automatically. We don\'t train on your data.</span>')

html = html.replace('<h2 class="text-3xl font-extrabold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>', '<h2 class="text-3xl font-extrabold text-gray-900 mb-8 text-center" data-i18n="faqTitle">Frequently Asked Questions</h2>')
html = html.replace('<h4 class="font-bold text-gray-900 text-base mb-2">Is this AI background remover really free?</h4>', '<h4 class="font-bold text-gray-900 text-base mb-2" data-i18n="faq1Q">Is this AI background remover really free?</h4>')
html = html.replace('<p class="text-sm text-gray-600 leading-relaxed">Yes! MiaoCut is built by an independent developer to provide a genuinely free alternative to expensive subscription tools like remove.bg. There are no watermarks and no strict resolution limits.</p>', '<p class="text-sm text-gray-600 leading-relaxed" data-i18n="faq1A">Yes! MiaoCut is built by an independent developer to provide a genuinely free alternative to expensive subscription tools like remove.bg. There are no watermarks and no strict resolution limits.</p>')
html = html.replace('<h4 class="font-bold text-gray-900 text-base mb-2">What image formats are supported?</h4>', '<h4 class="font-bold text-gray-900 text-base mb-2" data-i18n="faq2Q">What image formats are supported?</h4>')
html = html.replace('<p class="text-sm text-gray-600 leading-relaxed">You can upload JPG, PNG, and WebP images. The output will be a high-quality PNG image with a transparent background, ready for your designs.</p>', '<p class="text-sm text-gray-600 leading-relaxed" data-i18n="faq2A">You can upload JPG, PNG, and WebP images. The output will be a high-quality PNG image with a transparent background, ready for your designs.</p>')
html = html.replace('<h4 class="font-bold text-gray-900 text-base mb-2">How good is the edge detection for hair or fur?</h4>', '<h4 class="font-bold text-gray-900 text-base mb-2" data-i18n="faq3Q">How good is the edge detection for hair or fur?</h4>')
html = html.replace('<p class="text-sm text-gray-600 leading-relaxed">MiaoCut utilizes the latest SOTA AI models (BiRefNet) which excel at complex edges. It perfectly handles human hair, animal fur, and even semi-transparent objects like glass or wedding dresses.</p>', '<p class="text-sm text-gray-600 leading-relaxed" data-i18n="faq3A">MiaoCut utilizes the latest SOTA AI models (BiRefNet) which excel at complex edges. It perfectly handles human hair, animal fur, and even semi-transparent objects like glass or wedding dresses.</p>')

# Inject JS i18n logic
js_i18n = """
        // ============================================================
        // i18n 国际化支持
        // ============================================================
        const i18nData = {
            zh: {
                title: "1秒纯净抠图",
                subtitle: "不谈排版，只给白底。",
                dropzoneTitle: "将图片拖拽至此，或点击上传",
                dropzoneSub: "（支持 JPG / PNG / WebP）",
                trustTitle: "你的图片绝对安全。",
                trustSub: "纯内存处理，15分钟后自动销毁，绝不用于 AI 训练。",
                bookmarkText: "喜欢 MiaoCut 吗？按",
                bookmarkSuffix: "加入书签，下次抠图只需 1 秒！",
                fbTitle: "☕ 提出建议",
                fbPlaceholder: "有什么想法？",
                fbEmail: "邮箱（选填，方便我们回复你）",
                fbSend: "发送",
                fbThanks: "感谢你的建议！",
                fbThanksSub: "我们会认真对待每一条反馈",
                howItWorks: "工作原理",
                uploadImg: "1. 上传图片",
                uploadDesc: "拖拽任何 JPG, PNG, 或 WebP 图片。无需注册。",
                aiProc: "2. AI 智能处理",
                aiDesc: "我们的 SOTA AI 模型 (BiRefNet) 会在 1 秒内精准去除背景。",
                dlFree: "3. 免费下载",
                dlDesc: "瞬间获得高分辨率的透明背景图片。",
                whyChoose: "为什么选择 MiaoCut？",
                freeLimit: "100% 免费无限制",
                freeDesc: "没有隐藏收费，没有订阅陷阱。想抠多少张就抠多少张。",
                hdQuality: "超清画质 (HD)",
                hdDesc: "不像其他工具会压缩画质，我们保留原图的高清分辨率。",
                noWatermark: "无水印",
                noWDesc: "透明背景图可直接用于电商、设计或个人项目。",
                privacyFirst: "隐私优先",
                privacyDesc: "图片纯内存处理，自动销毁。我们绝不使用你的数据进行训练。",
                faqTitle: "常见问题解答",
                faq1Q: "这个 AI 抠图真的是免费的吗？",
                faq1A: "是的！MiaoCut 由独立开发者构建，旨在提供昂贵订阅工具的真正免费替代方案。无水印，无严格的分辨率限制。",
                faq2Q: "支持哪些图片格式？",
                faq2A: "您可以上传 JPG、PNG 和 WebP 图片。输出将是具有透明背景的高质量 PNG 图片。",
                faq3Q: "对头发或毛发的边缘处理效果如何？",
                faq3A: "MiaoCut 使用了最新的 SOTA AI 模型（BiRefNet），非常擅长处理复杂的边缘。它能完美处理头发、动物毛发，甚至玻璃或婚纱等半透明物体。",
                // JS States
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
                title: "1-Second HD Cutout",
                subtitle: "No fuss, just pure transparent backgrounds.",
                dropzoneTitle: "Drag & drop image here, or click to upload",
                dropzoneSub: "(Supports JPG / PNG / WebP)",
                trustTitle: "Your images are 100% safe.",
                trustSub: "Processed in-memory, destroyed automatically. Never used for AI training.",
                bookmarkText: "Like MiaoCut? Press",
                bookmarkSuffix: "to bookmark, next cutout is just 1 sec away!",
                fbTitle: "☕ Feedback",
                fbPlaceholder: "What's on your mind?",
                fbEmail: "Email (Optional)",
                fbSend: "Send",
                fbThanks: "Thanks for your feedback!",
                fbThanksSub: "We read every single message.",
                howItWorks: "How It Works",
                uploadImg: "1. Upload Image",
                uploadDesc: "Drag & drop any JPG, PNG, or WebP image. No sign-up required.",
                aiProc: "2. AI Processing",
                aiDesc: "Our SOTA AI model (BiRefNet) analyzes and removes the background precisely in just 1 second.",
                dlFree: "3. Download Free",
                dlDesc: "Instantly get your transparent background cutout in high resolution.",
                whyChoose: "Why Choose MiaoCut?",
                freeLimit: "100% Free & Unlimited",
                freeDesc: "No hidden costs, no subscription traps. Process as many images as you need.",
                hdQuality: "High Definition (HD)",
                hdDesc: "Unlike other tools that compress your results, we maintain the original high quality.",
                noWatermark: "No Watermarks",
                noWDesc: "Use your transparent cutouts for e-commerce, design, or personal projects freely.",
                privacyFirst: "Privacy First",
                privacyDesc: "Images are processed in-memory and destroyed automatically. We don't train on your data.",
                faqTitle: "Frequently Asked Questions",
                faq1Q: "Is this AI background remover really free?",
                faq1A: "Yes! MiaoCut is built by an independent developer to provide a genuinely free alternative to expensive subscription tools like remove.bg. There are no watermarks and no strict resolution limits.",
                faq2Q: "What image formats are supported?",
                faq2A: "You can upload JPG, PNG, and WebP images. The output will be a high-quality PNG image with a transparent background, ready for your designs.",
                faq3Q: "How good is the edge detection for hair or fur?",
                faq3A: "MiaoCut utilizes the latest SOTA AI models (BiRefNet) which excel at complex edges. It perfectly handles human hair, animal fur, and even semi-transparent objects like glass or wedding dresses.",
                // JS States
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

        let currentLang = localStorage.getItem('lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en');
        
        function t(key) {
            return i18nData[currentLang][key] || key;
        }

        function updateLanguage(lang) {
            currentLang = lang;
            localStorage.setItem('lang', lang);
            document.documentElement.lang = lang;
            document.title = lang === 'zh' ? "MiaoCut - 1秒纯净抠图" : "MiaoCut - Free AI Background Remover | 1-Second HD Cutout";
            
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

            // 如果处于初始状态，刷新 Dropzone 里的文字
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

        // 页面加载即初始化语言
        document.addEventListener('DOMContentLoaded', () => {
            updateLanguage(currentLang);
            document.getElementById('lang-switch').addEventListener('change', (e) => {
                updateLanguage(e.target.value);
            });
        });
"""
html = html.replace('// ============================================================', js_i18n + '\n        // ============================================================', 1)

# Fix strings in JS logic to use t()
html = html.replace("alert('仅支持 JPG / PNG / WebP 格式的图片');", "alert(t('alertSize'));")
html = html.replace("showProgress(5, '压缩中...');", "showProgress(5, t('compressing'));")
html = html.replace("showProgress(15, '上传中...');", "showProgress(15, t('uploading'));")
html = html.replace("showProgress(pct, `上传中... ${Math.round(ratio * 100)}%`);", "showProgress(pct, `${t('uploading')} ${Math.round(ratio * 100)}%`);")
html = html.replace("showProgress(90, 'AI 处理中...');", "showProgress(90, t('processing'));")
html = html.replace("showProgress(100, '完成!');", "showProgress(100, t('done'));")

html = html.replace("""<p class="text-lg font-medium text-gray-800 mb-1">处理成功！</p>
                    <p class="text-sm text-gray-500">正在为您自动下载...</p>""", """<p class="text-lg font-medium text-gray-800 mb-1">${t('successTitle')}</p>
                    <p class="text-sm text-gray-500">${t('successSub')}</p>""")

html = html.replace("title.textContent = '抱歉，处理失败';", "title.textContent = t('failTitle');")

# Remove originalContentHTML usage and replace with resetDropzone()
html = html.replace("const originalContentHTML = dropzoneContent.innerHTML;", "")
html = html.replace("dropzoneContent.innerHTML = originalContentHTML;", "resetDropzone();")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("HTML updated successfully!")
