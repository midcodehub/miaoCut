// =============================================================================
// 法务页语言切换：/privacy/、/terms/、/acceptable-use/
// -----------------------------------------------------------------------------
// 英文写在 HTML 里，没有脚本时（以及 Creem 审核直接看页面时）读到的就是英文。
// 站内已经选过的语言存在 localStorage.lang，和首页、会员页同一套八种语言。
// en 不请求翻译；其余语言按需加载 /i18n/legal/<code>.json，缺任何一条就留在英文。
// =============================================================================
(function () {
    'use strict';

    const LOCALES = [
        { code: 'en', htmlLang: 'en', dir: 'ltr' },
        { code: 'zh', htmlLang: 'zh-CN', dir: 'ltr' },
        { code: 'hi', htmlLang: 'hi-IN', dir: 'ltr' },
        { code: 'id', htmlLang: 'id-ID', dir: 'ltr' },
        { code: 'pt-br', htmlLang: 'pt-BR', dir: 'ltr' },
        { code: 'bn', htmlLang: 'bn-BD', dir: 'ltr' },
        { code: 'fil', htmlLang: 'fil-PH', dir: 'ltr' },
        { code: 'ur', htmlLang: 'ur-PK', dir: 'rtl' },
    ];

    function normalizeLang(value) {
        const code = String(value || '').toLowerCase();
        if (code === 'tl' || code.startsWith('tl-')) return 'fil';
        if (code === 'pt' || code.startsWith('pt-')) return 'pt-br';
        return LOCALES.find((locale) => code === locale.code || code.startsWith(locale.code + '-'))?.code || null;
    }

    function detectLang() {
        const query = normalizeLang(new URLSearchParams(location.search).get('lang'));
        if (query) return query;
        try {
            const saved = normalizeLang(localStorage.getItem('lang'));
            if (saved) return saved;
        } catch (_) { /* 存储不可用时仍按浏览器语言。 */ }
        return normalizeLang(navigator.language) || 'en';
    }

    let lang = detectLang();

    function localeOf(code) {
        return LOCALES.find((item) => item.code === code) || LOCALES[0];
    }

    function setLocale(code) {
        const locale = localeOf(code);
        document.documentElement.lang = locale.htmlLang;
        document.documentElement.dir = locale.dir;
    }

    function apply(pack) {
        document.querySelectorAll('[data-li18n]').forEach((el) => {
            const value = pack[el.getAttribute('data-li18n')];
            if (typeof value === 'string') el.textContent = value;
        });
        document.querySelectorAll('[data-li18n-html]').forEach((el) => {
            const value = pack[el.getAttribute('data-li18n-html')];
            if (typeof value === 'string') el.innerHTML = value;
        });
        document.querySelectorAll('[data-li18n-aria]').forEach((el) => {
            const value = pack[el.getAttribute('data-li18n-aria')];
            if (typeof value === 'string') el.setAttribute('aria-label', value);
        });
        const titleKey = document.documentElement.getAttribute('data-li18n-title');
        if (titleKey && typeof pack[titleKey] === 'string') document.title = pack[titleKey];
    }

    function requiredKeys() {
        const keys = new Set();
        document.querySelectorAll('[data-li18n]').forEach((el) => keys.add(el.getAttribute('data-li18n')));
        document.querySelectorAll('[data-li18n-html]').forEach((el) => keys.add(el.getAttribute('data-li18n-html')));
        document.querySelectorAll('[data-li18n-aria]').forEach((el) => keys.add(el.getAttribute('data-li18n-aria')));
        const titleKey = document.documentElement.getAttribute('data-li18n-title');
        if (titleKey) keys.add(titleKey);
        return [...keys];
    }

    const select = document.getElementById('legal-lang');
    if (select) {
        select.value = lang;
        select.addEventListener('change', () => {
            const next = normalizeLang(select.value);
            if (!next) return;
            try { localStorage.setItem('lang', next); } catch (_) { /* URL 仍是语言来源。 */ }
            const url = new URL(location.href);
            url.searchParams.set('lang', next);
            location.assign(url.toString());
        });
    }

    setLocale(lang);
    if (lang === 'en') return;

    fetch('/i18n/legal/' + lang + '.json', { cache: 'no-cache' })
        .then((response) => {
            if (!response.ok) throw new Error('locale_' + response.status);
            return response.json();
        })
        .then((pack) => {
            if (!requiredKeys().every((key) => typeof pack[key] === 'string' && pack[key].trim())) {
                throw new Error('locale_incomplete');
            }
            apply(pack);
            try { localStorage.setItem('lang', lang); } catch (_) { /* 忽略存储限制。 */ }
        })
        .catch((error) => {
            console.warn('[MiaoCut] Legal translations unavailable:', error);
            lang = 'en';
            setLocale('en');
            if (select) select.value = 'en';
        });
})();
