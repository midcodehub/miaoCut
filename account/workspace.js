// Shared presentation controls for the account, pricing and batch pages.
// Account data, authentication and payments stay in their existing modules.
(() => {
    const root = document.documentElement;
    const button = document.getElementById('theme-toggle');
    if (!button) return;

    const sync = () => button.setAttribute('aria-pressed', String(root.classList.contains('dark')));
    button.addEventListener('click', () => {
        const dark = root.classList.toggle('dark');
        try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (_) { /* Theme still works without storage. */ }
        sync();
    });
    sync();

    const revealSection = () => {
        const nav = document.querySelector('.site-member-navigation-inner');
        const active = nav?.querySelector('[aria-current="page"]');
        if (!active || nav.scrollWidth <= nav.clientWidth) return;
        const bounds = nav.getBoundingClientRect();
        const link = active.getBoundingClientRect();
        nav.scrollLeft += link.left + link.width / 2 - bounds.left - nav.clientWidth / 2;
    };
    // Translated labels and the auth label can change the row width after it first appears.
    const navigation = document.querySelector('.site-member-navigation-inner');
    if (navigation) new MutationObserver(revealSection).observe(navigation, { subtree: true, childList: true, characterData: true });
    const ready = () => (window.MiaoCutProI18n?.ready || Promise.resolve())
        .then(() => document.fonts.ready).then(revealSection);
    if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', ready, { once: true });
    else ready();
    window.addEventListener('resize', revealSection);
})();
