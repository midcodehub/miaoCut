// Feedback Widget Logic
(function () {
    'use strict';

    // Translations for the feedback widget
    const I18N = {
        zh: {
            fbTitle: "☕ 提出建议",
            fbPlaceholder: "有什么想法？",
            fbEmail: "邮箱（选填，方便我们回复你）",
            fbSend: "发送",
            fbThanks: "感谢你的建议！",
            fbThanksSub: "我们会认真对待每一条反馈"
        },
        en: {
            fbTitle: "☕ Feedback",
            fbPlaceholder: "What's on your mind?",
            fbEmail: "Email (Optional)",
            fbSend: "Send",
            fbThanks: "Thanks for your feedback!",
            fbThanksSub: "We read every single message."
        }
    };

    let currentLang = localStorage.getItem('lang') || ((navigator.language && navigator.language.startsWith('zh')) ? 'zh' : 'en');
    function t(key) {
        return I18N[currentLang][key] || key;
    }

    // Inject HTML
    const widgetHtml = `
        <div id="feedback-panel" class="absolute bottom-14 right-0 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-5 opacity-0 pointer-events-none transition-all duration-250 translate-y-2 scale-95" style="z-index: 100;">
            <h3 class="text-sm font-semibold text-gray-900 mb-3">${t('fbTitle')}</h3>
            <form id="feedback-form">
                <textarea id="feedback-msg" aria-label="Feedback message" class="w-full h-20 text-sm border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-500" placeholder="${t('fbPlaceholder')}"></textarea>
                <input id="feedback-email" type="email" aria-label="Email (optional)" class="w-full mt-2 text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-500" placeholder="${t('fbEmail')}">
                <button type="submit" class="w-full mt-3 bg-gray-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-800 transition-colors">${t('fbSend')}</button>
            </form>
            <div id="feedback-thanks" class="hidden text-center py-6">
                <p class="text-2xl mb-2">&#127881;</p>
                <p class="text-sm font-medium text-gray-800">${t('fbThanks')}</p>
                <p class="text-xs text-gray-500 mt-1">${t('fbThanksSub')}</p>
            </div>
        </div>
        <button id="feedback-trigger" class="w-11 h-11 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl hover:scale-110 transition-all text-lg focus:outline-none" title="feedback">&#9749;</button>
    `;

    const widgetEl = document.createElement('div');
    widgetEl.id = 'feedback-widget';
    widgetEl.className = 'fixed bottom-6 right-6 z-40';
    widgetEl.innerHTML = widgetHtml;
    document.body.appendChild(widgetEl);

    // Event Bindings
    const feedbackTrigger = document.getElementById('feedback-trigger');
    const feedbackPanel = document.getElementById('feedback-panel');
    const feedbackForm = document.getElementById('feedback-form');
    const feedbackThanks = document.getElementById('feedback-thanks');
    const msgEl = document.getElementById('feedback-msg');
    const emailEl = document.getElementById('feedback-email');

    function togglePanel() {
        const opening = feedbackPanel.classList.contains('opacity-0');
        if (opening) {
            feedbackPanel.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2', 'scale-95');
            feedbackPanel.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0', 'scale-100');
            feedbackPanel.style.opacity = '1';
            feedbackPanel.style.pointerEvents = 'auto';
            feedbackPanel.style.transform = 'translateY(0) scale(1)';
            if (typeof umami !== 'undefined') umami.track('feedback-opened');
            msgEl.focus();
        } else {
            feedbackPanel.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2', 'scale-95');
            feedbackPanel.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0', 'scale-100');
            feedbackPanel.style.opacity = '0';
            feedbackPanel.style.pointerEvents = 'none';
            feedbackPanel.style.transform = 'translateY(0.5rem) scale(0.95)';
        }
    }

    feedbackTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
    });

    document.addEventListener('click', (e) => {
        if (!widgetEl.contains(e.target)) {
            feedbackPanel.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2', 'scale-95');
            feedbackPanel.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0', 'scale-100');
            feedbackPanel.style.opacity = '0';
            feedbackPanel.style.pointerEvents = 'none';
            feedbackPanel.style.transform = 'translateY(0.5rem) scale(0.95)';
        }
    });

    feedbackPanel.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent click inside panel from bubbling to document
    });

    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:8000' : 'https://api2.miaocut.app';

    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = msgEl.value.trim();
        const email = emailEl.value.trim();
        if (!msg) return;

        let currentProfile = localStorage.getItem('cutoutProfile') || 'sharp';

        try {
            const resp = await fetch(API_BASE + '/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: msg,
                    email: email || undefined,
                    page: window.MIAOCUT_PAGE_KEY || 'unknown',
                    profile: currentProfile
                })
            });
            if (resp.status === 501) {
                console.warn('[MiaoCut] Local dev mode: Backend not running (501). Feedback simulated.');
            } else if (!resp.ok) {
                console.warn('[MiaoCut] Feedback API returned error:', resp.status);
            }
        } catch (err) {
            console.warn('[MiaoCut] Feedback send failed:', err);
        }

        if (typeof umami !== 'undefined') umami.track('feedback-submitted', { has_email: email ? 'yes' : 'no' });

        feedbackForm.classList.add('hidden');
        feedbackThanks.classList.remove('hidden');
        setTimeout(() => {
            togglePanel();
            setTimeout(() => {
                feedbackForm.classList.remove('hidden');
                feedbackThanks.classList.add('hidden');
                feedbackForm.reset();
            }, 300);
        }, 2000);
    });

    // Listen to custom lang change event if app.js triggers it, but for simplicity, 
    // the user will just see the lang they load with. We can add a listener to the switch if it exists.
    const langSwitch = document.getElementById('lang-switch');
    if (langSwitch) {
        langSwitch.addEventListener('change', (e) => {
            currentLang = e.target.value;
            document.querySelector('#feedback-panel h3').textContent = t('fbTitle');
            msgEl.placeholder = t('fbPlaceholder');
            emailEl.placeholder = t('fbEmail');
            document.querySelector('#feedback-form button').textContent = t('fbSend');
            document.querySelector('#feedback-thanks p:nth-child(2)').textContent = t('fbThanks');
            document.querySelector('#feedback-thanks p:nth-child(3)').textContent = t('fbThanksSub');
        });
    }

})();
