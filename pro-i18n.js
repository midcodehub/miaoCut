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
            batchDocTitle: 'Batch Background Remover — Remove Backgrounds from Many Images | MiaoCut',
            batchH1: 'Batch Background Remover',
            batchSub: 'Upload up to 200 images, remove backgrounds in bulk, and download them all as a ZIP.',
            batchLogin: 'Sign in to use batch processing. New accounts get 100 free credits.',
            batchSendLink: 'Send sign-in link',
            batchBalance: 'Balance: <b>{n}</b> credits',
            profileFast: 'Fast · 1 credit',
            profileFur: 'Fine hair · 2 credits',
            dzTitle: 'Click or drop images here',
            dzSub: 'PNG / JPG / WebP · up to 200 images',
            filesOne: '1 image selected',
            filesMany: '{n} images selected',
            costLine: '{n} × {c} = <b>{t}</b> credits · failed images are not charged',
            startBtn: 'Start processing',
            stPreparing: 'Preparing…',
            stUploading: 'Uploading {i}/{n}',
            stStarting: 'Starting…',
            stProcessing: 'Processing… {d}/{n} done',
            stError: 'Something went wrong: {m}',
            stNoCredits: 'Not enough credits for this batch.',
            buyCreditsLink: 'Buy credits',
            resDone: 'Done — {s} succeeded, {f} failed',
            resFailedFree: 'Failed images were not charged.',
            zipBtn: 'Download all (ZIP)',
            zipPacking: 'Packing ZIP…',
            zipPackingN: 'Packing ZIP… {i}/{n}',
            zipFailed: 'ZIP failed: {m}',
            batchAgain: 'Process more images',
            batchKeep: 'Results are kept for 24 hours, then deleted automatically.',
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

            batchDocTitle: '批量抠图 — 一次去除多张图片背景 | MiaoCut',
            batchH1: '批量抠图',
            batchSub: '一次上传最多 200 张图片，批量去除背景，打包 ZIP 下载。',
            batchLogin: '登录后即可使用批量抠图，新账户注册即送 100 积分。',
            batchSendLink: '发送登录链接',
            batchBalance: '余额：<b>{n}</b> 积分',
            profileFast: '快速 · 1 积分',
            profileFur: '细腻发丝 · 2 积分',
            dzTitle: '点击或拖入图片',
            dzSub: 'PNG / JPG / WebP · 最多 200 张',
            filesOne: '已选择 1 张图片',
            filesMany: '已选择 {n} 张图片',
            costLine: '{n} × {c} = <b>{t}</b> 积分 · 失败的图片不扣分',
            startBtn: '开始处理',
            stPreparing: '准备中…',
            stUploading: '正在上传 {i}/{n}',
            stStarting: '正在启动…',
            stProcessing: '处理中… 已完成 {d}/{n}',
            stError: '出错了：{m}',
            stNoCredits: '积分不足，无法处理这批图片。',
            buyCreditsLink: '去购买积分',
            resDone: '完成：成功 {s} 张，失败 {f} 张',
            resFailedFree: '失败的图片未扣积分。',
            zipBtn: '全部下载（ZIP）',
            zipPacking: '正在打包 ZIP…',
            zipPackingN: '正在打包 ZIP… {i}/{n}',
            zipFailed: '打包失败：{m}',
            batchAgain: '继续处理更多图片',
            batchKeep: '处理结果保留 24 小时，之后自动删除。',
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
