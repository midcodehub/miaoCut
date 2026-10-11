// =============================================================================
// MiaoCut Pro 页面（/pricing/、/batch/、/account/credits/）的中英文案
// -----------------------------------------------------------------------------
// 为什么不走 scripts/build-i18n.mjs：那套机制会给每个页面生成全部 8 种语言的静态 URL
// （/zh/、/hi/ ...），这几个付费页目前只做中英文，生成另外 6 种语言的「英文内容页」
// 会形成重复内容、伤 SEO。所以这里采用运行时切换：URL 不变（只有英文 URL 参与索引），
// 打开时按用户语言渲染中文或英文。
//
// 语言判定顺序：?lang=zh|en  >  localStorage.lang（app.js 会记录用户在站内最后使用的语言）
//              >  浏览器语言。非中文一律英文。
//
// 用法（普通 <script>，需在页面其他脚本之前加载）：
//   HTML：<span data-pi18n="key">English fallback</span>
//         data-pi18n-html="key"（值含链接等 HTML，仅用于本文件里的可信文案）
//         data-pi18n-ph="key"（placeholder）
//   JS：  MiaoCutProI18n.t("key", { n: 3 })   // {n} 占位符替换
// =============================================================================
(function () {
    'use strict';

    const DICT = {
        en: {
            // ---- 通用 ----
            navTools: 'Background Remover',
            navBatch: 'Batch',
            navPricing: 'Pricing',
            navAccount: 'Account',
            navLogin: 'Sign in',
            footerTagline: 'MiaoCut · Free, privacy-first AI image tools.',
            footerTerms: 'Terms',
            footerPrivacy: 'Privacy',
            langSwitch: '中文',
            emailPlaceholder: 'you@example.com',
            loginGoogle: 'Continue with Google',
            loginOr: 'or',
            loginNeedEmail: 'Please enter your email.',
            loginSent: 'Check your inbox for the sign-in link.',
            loginSendFailed: 'Could not send the link. Please try again.',
            loginGoogleFailed: 'Google sign-in is unavailable right now. Please try again.',
            loginUnavailable: 'Sign-in is not available yet.',

            // ---- 定价页 ----
            pricingDocTitle: 'Pricing — Credits for Batch Background Removal | MiaoCut',
            pricingH1: 'Simple credit pricing',
            pricingSub: 'Single images are <strong>free</strong>, no account needed. Credits are used for <a href="/batch/" class="underline underline-offset-2">batch processing</a>: <strong>1 image = 1 credit</strong> (Fine hair mode = 2). Failed images are never charged.',
            pricingBonus: 'New accounts get 100 free credits — enough to batch-process 100 images.',
            pricingTryBatch: 'Try batch processing',
            packStarter: 'Starter',
            packCreator: 'Creator',
            packSeller: 'Seller',
            packStudio: 'Studio',
            packPopular: 'Popular',
            packCredits: 'credits',
            packPerImage: '{price} per image',
            buyBtn: 'Buy credits',
            buyRedirecting: 'Redirecting…',
            buyFailed: 'Checkout failed, please try again.',
            pricingFine: 'Purchased credits are valid for 12 months. Prices exclude tax, which is calculated at checkout. Unused credits can be refunded within 14 days — see our <a href="/terms/" class="underline underline-offset-2">Terms</a>.',
            pricingCanceled: 'Checkout was canceled — you have not been charged.',

            // ---- 账户 / 积分页 ----
            creditsDocTitle: 'Your Credits | MiaoCut',
            loginH1: 'Sign in to MiaoCut',
            loginSub: 'Access your credits, history and top-ups. New accounts get 100 free credits.',
            loginEmailBtn: 'Email me a sign-in link',
            acctH1: 'Your credits',
            signOut: 'Sign out',
            balTotal: 'Available credits',
            balHint: 'Credits are used for batch processing. Single images are always free.',
            goBatch: 'Start a batch',
            buyMore: 'Buy more credits',
            historyH: 'Credit history',
            thWhen: 'When',
            thType: 'Type',
            thChange: 'Change',
            thBalance: 'Balance',
            noTx: 'No transactions yet.',
            paySuccess: 'Payment received — your credits will appear in a few seconds.',
            loadFailed: 'Could not load your account. Please refresh the page.',
            reason_signup_bonus: 'Sign-up bonus',
            reason_purchase: 'Purchase',
            reason_consume: 'Used',
            reason_freeze: 'Batch (reserved)',
            reason_release: 'Returned (failed images)',
            reason_refund: 'Refund',
            reason_dispute: 'Payment dispute',
            reason_admin: 'Adjustment',

            // ---- 批量页 ----
            batchDocTitle: 'Batch Background Remover for Product Photos | MiaoCut',
            batchH1: 'Batch background remover',
            batchSub: 'Drop up to 200 product photos and get them back as clean cutouts in one ZIP. You only pay for images that come out.',
            batchBalanceShort: '{n} credits',
            batchBuyMore: 'Buy credits',
            // 上传区 / 已选文件
            dzTitle: 'Drop product photos here, or click to choose',
            dzSub: 'JPG, PNG or WebP · up to {max} images per batch',
            dzAddMore: 'Add more photos',
            selCount: '{n} images selected',
            selCountOne: '1 image selected',
            selClear: 'Clear all',
            selRemove: 'Remove {name}',
            skipType: 'Skipped {n} file(s): only JPG, PNG and WebP are supported.',
            skipLimit: 'Skipped {n} file(s): one batch holds up to {max} images.',
            // 右侧：未登录
            gateTitle: 'Sign in to run this batch',
            gatePoint1: 'New accounts get 100 free credits, enough for 100 images.',
            gatePoint2: 'Credit packs from {price} per image.',
            gatePoint3: 'Failed images are never charged.',
            gateKeep: 'Your {n} selected photos stay in this browser while you sign in.',
            gatePricing: 'See pricing',
            loginEmailBtnShort: 'Email me a sign-in link',
            // 右侧：已登录
            runTitle: 'Edge quality',
            modeStandard: 'Standard',
            modeStandardHint: 'Products, logos, hard edges',
            modeFine: 'Fine edges',
            modeFineHint: 'Hair, fur, plush, plants',
            modeCost1: '1 credit / image',
            modeCost2: '2 credits / image',
            sumImages: 'Images',
            sumCost: 'Cost',
            sumAfter: 'Balance after',
            sumCredits: '{n} credits',
            sumFreeFail: 'Failed images are refunded automatically.',
            sumShort: 'You need {n} more credits for this batch.',
            startN: 'Remove {n} backgrounds',
            startOne: 'Remove 1 background',
            startEmpty: 'Add photos to start',
            // 处理中
            stPreparing: 'Preparing your batch…',
            stUploading: 'Uploading {i} of {n}',
            stStarting: 'Starting…',
            stProcessing: 'Removing backgrounds · {d} of {n}',
            stLeaveOk: 'You can leave this page. Come back within 24 hours to download.',
            stResumed: 'Picked up your last batch.',
            // 结果
            resReady: '{s} ready',
            resFailedN: '{f} failed, not charged',
            outLabel: 'Download as',
            outPng: 'Transparent PNG',
            outWhite: 'White background JPG',
            outSquare: 'Amazon main image',
            outSquareHint: '2000 × 2000 JPG, white, product fills 85%',
            outPngHint: 'Keeps transparency, original size.',
            outWhiteHint: 'Pure white #FFFFFF background, original size.',
            zipBtn: 'Download ZIP',
            zipPackingN: 'Preparing {i} of {n}…',
            zipFailed: 'Could not build the ZIP. Check your connection and try again.',
            retryFailed: 'Retry {f} failed',
            retryNoSource: 'To retry failed images, add those photos again.',
            batchNew: 'Start a new batch',
            batchKeep: 'Files are deleted automatically 24 hours after processing.',
            tileFailed: 'Failed',
            // 失败原因（服务端 error 码 → 人话；未知码用通用文案）
            errImgDefault: 'Could not process this image.',
            errImgEnqueue: 'Server was busy. Not charged, retry it.',
            errImgExpired: 'Timed out. Not charged, retry it.',
            // 整批出错
            errNetwork: 'Connection lost. Nothing was charged; check your network and try again.',
            errUpload: 'Upload interrupted. Nothing was charged; try again.',
            errAuth: 'Your session expired. Sign in again to continue.',
            errTooMany: 'One batch holds up to {max} images.',
            errNoCredits: 'Not enough credits for this batch.',
            errGeneric: 'Something went wrong on our side. Nothing was charged; try again.',
            tryAgain: 'Try again',
            errBack: 'Back to my photos',
            // 示例
            demoTitle: 'What comes back',
            demoSub: 'Sample results. Switch the output to preview what lands in your ZIP.',
            demoProduct: 'Sneaker',
            demoPortrait: 'Portrait',
            demoLogo: 'Logo',
            demoPet: 'Long fur',
            // 大图查看
            viewDownload: 'Download this image',
            viewOriginal: 'Show original',
            viewResult: 'Show result',
            viewPrev: 'Previous image',
            viewNext: 'Next image',
            viewClose: 'Close',
        },
        zh: {
            navTools: 'AI 抠图',
            navBatch: '批量抠图',
            navPricing: '定价',
            navAccount: '账户',
            navLogin: '登录',
            footerTagline: 'MiaoCut · 免费、注重隐私的 AI 图片工具。',
            footerTerms: '服务条款',
            footerPrivacy: '隐私政策',
            langSwitch: 'English',
            emailPlaceholder: 'you@example.com',
            loginGoogle: '使用 Google 登录',
            loginOr: '或',
            loginNeedEmail: '请输入邮箱。',
            loginSent: '登录链接已发送，请查收邮箱。',
            loginSendFailed: '发送失败，请重试。',
            loginGoogleFailed: 'Google 登录暂不可用，请稍后重试。',
            loginUnavailable: '登录功能暂未开放。',

            pricingDocTitle: '定价 — 批量抠图积分 | MiaoCut',
            pricingH1: '简单透明的积分定价',
            pricingSub: '单张抠图<strong>免费</strong>，无需注册。积分用于<a href="/batch/" class="underline underline-offset-2">批量抠图</a>：<strong>每张 1 积分</strong>（细腻发丝模式 2 积分），处理失败的图片不扣分。',
            pricingBonus: '新账户注册即送 100 积分，可免费批量处理 100 张图片。',
            pricingTryBatch: '试试批量抠图',
            packStarter: '入门',
            packCreator: '创作者',
            packSeller: '卖家',
            packStudio: '工作室',
            packPopular: '最受欢迎',
            packCredits: '积分',
            packPerImage: '每张约 {price}',
            buyBtn: '购买积分',
            buyRedirecting: '正在跳转…',
            buyFailed: '发起支付失败，请重试。',
            pricingFine: '购买的积分 12 个月内有效。价格不含税，税费在结账时计算。未使用的积分可在 14 天内申请退款，详见<a href="/terms/" class="underline underline-offset-2">服务条款</a>。',
            pricingCanceled: '已取消支付，未产生任何扣款。',

            creditsDocTitle: '我的积分 | MiaoCut',
            loginH1: '登录 MiaoCut',
            loginSub: '查看积分、使用记录和充值。新账户注册即送 100 积分。',
            loginEmailBtn: '发送登录链接到邮箱',
            acctH1: '我的积分',
            signOut: '退出登录',
            balTotal: '可用积分',
            balHint: '积分用于批量抠图，单张抠图始终免费。',
            goBatch: '开始批量抠图',
            buyMore: '购买更多积分',
            historyH: '积分记录',
            thWhen: '时间',
            thType: '类型',
            thChange: '变动',
            thBalance: '余额',
            noTx: '暂无记录。',
            paySuccess: '支付成功，积分将在几秒内到账。',
            loadFailed: '账户信息加载失败，请刷新页面。',
            reason_signup_bonus: '注册赠送',
            reason_purchase: '购买',
            reason_consume: '消费',
            reason_freeze: '批量处理（预扣）',
            reason_release: '退回（失败的图片）',
            reason_refund: '退款扣回',
            reason_dispute: '支付争议扣回',
            reason_admin: '人工调整',

            batchDocTitle: '批量抠图 — 商品图批量去背景 | MiaoCut',
            batchH1: '批量抠图',
            batchSub: '一次拖入最多 200 张商品图，打包成一个 ZIP 拿回干净的抠图结果。只为成功的图片付费。',
            batchBalanceShort: '{n} 积分',
            batchBuyMore: '购买积分',
            dzTitle: '把商品图拖到这里，或点击选择',
            dzSub: 'JPG、PNG、WebP · 每批最多 {max} 张',
            dzAddMore: '继续添加',
            selCount: '已选 {n} 张',
            selCountOne: '已选 1 张',
            selClear: '全部清空',
            selRemove: '移除 {name}',
            skipType: '已跳过 {n} 个文件：只支持 JPG、PNG、WebP。',
            skipLimit: '已跳过 {n} 个文件：每批最多 {max} 张。',
            gateTitle: '登录后开始处理',
            gatePoint1: '新账户送 100 积分，可处理 100 张。',
            gatePoint2: '积分包低至每张 {price}。',
            gatePoint3: '处理失败的图片不扣积分。',
            gateKeep: '登录期间，已选的 {n} 张图会保留在这个浏览器里。',
            gatePricing: '查看定价',
            loginEmailBtnShort: '发送登录链接到邮箱',
            runTitle: '边缘精度',
            modeStandard: '标准',
            modeStandardHint: '商品、Logo、硬边物体',
            modeFine: '精细边缘',
            modeFineHint: '毛发、毛绒、植物',
            modeCost1: '每张 1 积分',
            modeCost2: '每张 2 积分',
            sumImages: '图片',
            sumCost: '消耗',
            sumAfter: '处理后余额',
            sumCredits: '{n} 积分',
            sumFreeFail: '失败的图片自动退回积分。',
            sumShort: '这批还差 {n} 积分。',
            startN: '开始处理 {n} 张',
            startOne: '开始处理 1 张',
            startEmpty: '先添加图片',
            stPreparing: '正在准备…',
            stUploading: '正在上传 {i}/{n}',
            stStarting: '正在启动…',
            stProcessing: '正在去背景 · {d}/{n}',
            stLeaveOk: '可以离开这个页面，24 小时内回来都能下载。',
            stResumed: '已恢复你上一次的批量任务。',
            resReady: '{s} 张已完成',
            resFailedN: '{f} 张失败，未扣积分',
            outLabel: '下载格式',
            outPng: '透明 PNG',
            outWhite: '白底 JPG',
            outSquare: '亚马逊主图',
            outSquareHint: '2000 × 2000 白底 JPG，商品占画面 85%',
            outPngHint: '保留透明背景，原尺寸。',
            outWhiteHint: '纯白 #FFFFFF 背景，原尺寸。',
            zipBtn: '下载 ZIP',
            zipPackingN: '正在准备 {i}/{n}…',
            zipFailed: 'ZIP 打包失败，请检查网络后重试。',
            retryFailed: '重试失败的 {f} 张',
            retryNoSource: '要重试失败的图片，请重新添加这些图片。',
            batchNew: '开始新的一批',
            batchKeep: '文件在处理完成 24 小时后自动删除。',
            tileFailed: '失败',
            errImgDefault: '这张图片处理失败。',
            errImgEnqueue: '服务器繁忙，未扣积分，可重试。',
            errImgExpired: '处理超时，未扣积分，可重试。',
            errNetwork: '网络中断，未扣任何积分。请检查网络后重试。',
            errUpload: '上传中断，未扣任何积分，请重试。',
            errAuth: '登录已过期，请重新登录后继续。',
            errTooMany: '每批最多 {max} 张。',
            errNoCredits: '积分不足，无法处理这批图片。',
            errGeneric: '服务出了点问题，未扣任何积分，请重试。',
            tryAgain: '重试',
            errBack: '返回已选图片',
            demoTitle: '处理结果示例',
            demoSub: '以下为示例图。切换下载格式，看看 ZIP 里会是什么样。',
            demoProduct: '运动鞋',
            demoPortrait: '人像',
            demoLogo: 'Logo',
            demoPet: '长毛宠物',
            viewDownload: '下载这张',
            viewOriginal: '看原图',
            viewResult: '看结果',
            viewPrev: '上一张',
            viewNext: '下一张',
            viewClose: '关闭',
        },
    };

    function detectLang() {
        try {
            const q = new URLSearchParams(location.search).get('lang');
            if (q) return q.toLowerCase().startsWith('zh') ? 'zh' : 'en';
        } catch (_) { /* ignore */ }
        try {
            const saved = localStorage.getItem('lang');
            if (saved) return saved === 'zh' ? 'zh' : 'en';
        } catch (_) { /* 隐私模式等场景 localStorage 不可用 */ }
        return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    }

    const lang = detectLang();

    function t(key, vars) {
        let s = (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
        if (vars) Object.keys(vars).forEach((k) => { s = s.split(`{${k}}`).join(String(vars[k])); });
        return s;
    }

    /** 渲染页面上所有 data-pi18n* 元素；英文页面不需要处理（HTML 里本来就是英文） */
    function apply(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-pi18n]').forEach((el) => { el.textContent = t(el.dataset.pi18n); });
        scope.querySelectorAll('[data-pi18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.pi18nHtml); });
        scope.querySelectorAll('[data-pi18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.pi18nPh); });
        const titleKey = document.documentElement.dataset.pi18nTitle;
        if (titleKey) document.title = t(titleKey);
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        // 语言切换按钮：记住选择后刷新
        scope.querySelectorAll('[data-pi18n-switch]').forEach((btn) => {
            btn.textContent = t('langSwitch');
            btn.onclick = () => {
                try { localStorage.setItem('lang', lang === 'zh' ? 'en' : 'zh'); } catch (_) { /* ignore */ }
                const url = new URL(location.href);
                url.searchParams.delete('lang');
                location.replace(url.toString());
            };
        });
    }

    window.MiaoCutProI18n = { lang, t, apply };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => apply());
    else apply();
})();
