import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../pro-i18n.js', import.meta.url), 'utf8');
const locales = ['en', 'zh', 'hi', 'id', 'pt-br', 'bn', 'fil', 'ur'];
const packs = Object.fromEntries(locales.slice(2).map(code => [code,
    JSON.parse(readFileSync(new URL(`../i18n/pro/${code}.json`, import.meta.url), 'utf8')),
]));

test('member pages keep the same global tools and language menu as the homepage', () => {
    const header = path => readFileSync(new URL(path, import.meta.url), 'utf8').match(/<header\b[\s\S]*?<\/header>/)[0];
    const home = header('../index.html');
    const links = html => [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(match => match[1]);
    const options = html => [...html.matchAll(/data-lang-option="([^"]+)"/g)].map(match => match[1]);
    for (const path of ['account/', 'account/credits/', 'account/checkin/', 'account/invite/',
        'account/batches/', 'account/api/', 'api-docs/', 'pricing/', 'batch/', 'invite/']) {
        const member = header(`../${path}index.html`);
        assert.deepEqual(links(member), links(home), `${path}: global tool links`);
        assert.deepEqual(options(member), options(home), `${path}: language choices`);
        for (const shared of ['site-brand', 'max-w-6xl', 'px-5 py-4', 'lg:flex',
            'id="theme-toggle"', 'language-select-control', 'language-select-options']) {
            assert.ok(member.includes(shared), `${path}: missing shared header control ${shared}`);
        }
    }
});

async function load({ url = 'https://miaocut.app/account/', saved, browser = 'en', failFetch = false, storageBlocked = false } = {}) {
    const current = new URL(url);
    const storage = new Map(saved ? [['lang', saved]] : []);
    const listeners = {};
    let target;
    let fetchCount = 0;
    const context = {
        URL, URLSearchParams,
        console: { warn() {} },
        navigator: { language: browser },
        location: { href: current.href, search: current.search, assign(value) { target = value; } },
        localStorage: {
            getItem(key) { if (storageBlocked) throw new Error('storage_blocked'); return storage.get(key); },
            setItem(key, value) { if (storageBlocked) throw new Error('storage_blocked'); storage.set(key, value); },
        },
        document: {
            readyState: 'loading',
            documentElement: { dataset: {}, lang: 'en', dir: 'ltr' },
            querySelectorAll: () => [],
            addEventListener: (name, callback) => { listeners[name] = callback; },
        },
        fetch: async path => {
            fetchCount++;
            if (failFetch) throw new Error('offline');
            const code = /\/([^/]+)\.json/.exec(path)[1];
            return { ok: true, json: async () => packs[code] };
        },
        window: {},
    };
    vm.runInNewContext(source, context);
    await context.window.MiaoCutProI18n.ready;
    await listeners.DOMContentLoaded();
    return { i18n: context.window.MiaoCutProI18n, document: context.document,
        storage, fetchCount, target: () => target };
}

test('all eight member locales load without missing strings', async () => {
    for (const code of locales) {
        const result = await load({ url: `https://miaocut.app/account/?lang=${code}` });
        assert.equal(result.i18n.lang, code);
        assert.notEqual(result.i18n.t('hubH1'), 'hubH1');
        assert.equal(result.fetchCount, ['en', 'zh'].includes(code) ? 0 : 1);
        assert.equal(result.document.documentElement.dir, code === 'ur' ? 'rtl' : 'ltr');
    }
});

test('every locale preserves all variables and trusted HTML', async () => {
    const start = source.indexOf('const DICT =') + 'const DICT ='.length;
    const end = source.indexOf('\n    const LOCALES =', start);
    const dictionaries = vm.runInNewContext(`(${source.slice(start, end).trim().replace(/;$/, '')})`);
    const base = dictionaries.en;
    for (const [code, pack] of Object.entries({ zh: dictionaries.zh, ...packs })) {
        assert.deepEqual(Object.keys(pack).sort(), Object.keys(base).sort(), `${code}: key coverage`);
        for (const [key, value] of Object.entries(base)) {
            assert.ok(pack[key].trim(), `${code}.${key}: empty translation`);
            for (const pattern of [/\{[A-Za-z0-9_]+\}/g, /<[^>]+>/g]) {
                assert.deepEqual([...(pack[key].match(pattern) || [])].sort(),
                    [...(value.match(pattern) || [])].sort(), `${code}.${key}: changed variable or HTML`);
            }
            if (key.startsWith('docsText')) {
                const codeContents = html => [...html.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/g)].map(match => match[1]).sort();
                assert.deepEqual(codeContents(pack[key]), codeContents(value), `${code}.${key}: changed API syntax`);
            }
        }
    }
});

test('URL language wins over saved language and browser language', async () => {
    assert.equal((await load({ url: 'https://miaocut.app/account/?lang=pt-BR', saved: 'zh', browser: 'hi-IN' })).i18n.lang, 'pt-br');
    assert.equal((await load({ saved: 'id', browser: 'zh-CN' })).i18n.lang, 'id');
    assert.equal((await load({ browser: 'tl-PH' })).i18n.lang, 'fil');
    assert.equal((await load({ browser: 'ur-PK' })).i18n.lang, 'ur');
    assert.equal((await load({ browser: 'unsupported' })).i18n.lang, 'en');
});

test('changing language preserves the current member route, checkout, referral and hash', async () => {
    const result = await load({ url: 'https://miaocut.app/account/credits/?buy=creator_500&plan=pro&ref=K7QM2XPD&status=success&lang=zh#history' });
    result.i18n.switchLang('id');
    const target = new URL(result.target());
    assert.equal(target.pathname, '/account/credits/');
    assert.equal(target.searchParams.get('lang'), 'id');
    assert.equal(target.searchParams.get('buy'), 'creator_500');
    assert.equal(target.searchParams.get('plan'), 'pro');
    assert.equal(target.searchParams.get('ref'), 'K7QM2XPD');
    assert.equal(target.searchParams.get('status'), 'success');
    assert.equal(target.hash, '#history');
    assert.equal(result.storage.get('lang'), 'id');
});

test('failed locale loading falls back to a usable English page', async () => {
    const result = await load({ url: 'https://miaocut.app/account/?lang=hi', failFetch: true });
    assert.equal(result.i18n.lang, 'en');
    assert.equal(result.i18n.t('navAccount'), 'Account');
    assert.equal(result.document.documentElement.lang, 'en');
});

test('language switching still works when browser storage is blocked', async () => {
    const result = await load({ browser: 'ur-PK', storageBlocked: true });
    assert.equal(result.i18n.lang, 'ur');
    result.i18n.switchLang('pt-br');
    assert.equal(new URL(result.target()).searchParams.get('lang'), 'pt-br');
});
