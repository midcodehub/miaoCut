(function () {
    'use strict';

    const LOCALES = [
        { code: 'en', htmlLang: 'en', prefix: '', label: 'English' },
        { code: 'zh', htmlLang: 'zh-CN', prefix: '/zh', label: '简体中文' },
        { code: 'hi', htmlLang: 'hi-IN', prefix: '/hi', label: 'हिन्दी' },
        { code: 'id', htmlLang: 'id-ID', prefix: '/id', label: 'Bahasa Indonesia' },
        { code: 'pt-br', htmlLang: 'pt-BR', prefix: '/pt-br', label: 'Português (BR)' },
        { code: 'bn', htmlLang: 'bn-BD', prefix: '/bn', label: 'বাংলা' },
        { code: 'fil', htmlLang: 'fil-PH', prefix: '/fil', label: 'Filipino' },
        { code: 'ur', htmlLang: 'ur-PK', prefix: '/ur', label: 'اردو' },
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

    function alternateUrlFor(targetLang) {
        const locale = LOCALE_BY_CODE[targetLang] || LOCALE_BY_CODE.en;
        const basePath = stripLocalePrefix(window.location.pathname);
        if (!locale.prefix) return basePath;
        return basePath === '/' ? `${locale.prefix}/` : `${locale.prefix}${basePath}`;
    }

    function initLanguageMenu() {
        const root = document.querySelector('[data-language-menu]');
        const trigger = document.getElementById('lang-switch');
        const panel = document.getElementById('language-options');
        if (!root || !trigger || !panel) return;

        const label = root.querySelector('[data-lang-current]');
        const options = Array.from(panel.querySelectorAll('[data-lang-option]'));
        if (!options.length) return;

        let currentLang = localeFromHtmlLang(document.documentElement.lang);

        const setOpen = (open, focusOption = false) => {
            root.classList.toggle('is-open', open);
            trigger.setAttribute('aria-expanded', String(open));
            panel.hidden = !open;

            if (open && focusOption) {
                const activeOption = options.find(option => option.dataset.langOption === currentLang) || options[0];
                activeOption.focus({ preventScroll: true });
            }
        };

        const syncActiveOption = () => {
            const currentLocale = LOCALE_BY_CODE[currentLang] || LOCALE_BY_CODE.en;
            if (label) label.textContent = currentLocale.label;
            options.forEach(option => {
                const selected = option.dataset.langOption === currentLang;
                option.setAttribute('aria-selected', String(selected));
                option.tabIndex = -1;
            });
        };

        const switchTo = (targetLang) => {
            if (!LOCALE_BY_CODE[targetLang]) return;
            if (targetLang === currentLang) {
                setOpen(false);
                trigger.focus({ preventScroll: true });
                return;
            }

            if (typeof umami !== 'undefined') {
                try {
                    umami.track('lang-switched', { from: currentLang, to: targetLang });
                } catch (_) { /* analytics must not affect navigation */ }
            }

            localStorage.setItem('lang', targetLang);
            const target = alternateUrlFor(targetLang) + window.location.search + window.location.hash;
            window.location.assign(target);
        };

        const moveFocus = (delta) => {
            const currentIndex = Math.max(0, options.indexOf(document.activeElement));
            const nextIndex = (currentIndex + delta + options.length) % options.length;
            options[nextIndex].focus({ preventScroll: true });
        };

        trigger.addEventListener('click', () => {
            setOpen(panel.hidden, true);
        });

        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setOpen(true, true);
            } else if (event.key === 'Escape') {
                setOpen(false);
            }
        });

        panel.addEventListener('click', (event) => {
            const option = event.target.closest('[data-lang-option]');
            if (!option) return;
            switchTo(option.dataset.langOption);
        });

        panel.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveFocus(1);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveFocus(-1);
            } else if (event.key === 'Home') {
                event.preventDefault();
                options[0].focus({ preventScroll: true });
            } else if (event.key === 'End') {
                event.preventDefault();
                options[options.length - 1].focus({ preventScroll: true });
            } else if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
                trigger.focus({ preventScroll: true });
            } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const option = document.activeElement.closest('[data-lang-option]');
                if (option) switchTo(option.dataset.langOption);
            }
        });

        document.addEventListener('pointerdown', (event) => {
            if (!panel.hidden && !root.contains(event.target)) setOpen(false);
        });

        window.addEventListener('resize', () => {
            if (!panel.hidden) setOpen(false);
        });

        syncActiveOption();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLanguageMenu, { once: true });
    } else {
        initLanguageMenu();
    }
})();
