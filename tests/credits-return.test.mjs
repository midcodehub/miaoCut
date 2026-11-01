import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../account/credits/index.html', import.meta.url), 'utf8');

function detect(search) {
    const start = html.indexOf('const params = new URLSearchParams(location.search);');
    const end = html.indexOf('const show =', start);
    assert.ok(start > 0 && end > start, 'credits page return-status logic');
    const snippet = html.slice(start, end);
    const sandbox = { location: { search }, URLSearchParams, result: null };
    vm.runInNewContext(`${snippet}\nresult = { paidJustNow, subscribedJustNow, returnStatuses: [...returnStatuses] };`, sandbox);
    return sandbox.result;
}

test('one-time checkout return accepts the gateway status and Dodo’s extra status', () => {
    const result = detect('?status=success&payment_id=pay_x&status=succeeded&email=ada@example.com');
    assert.equal(JSON.stringify(result.returnStatuses), JSON.stringify(['success', 'succeeded']));
    assert.equal(result.paidJustNow, true);
    assert.equal(result.subscribedJustNow, false);
});

test('subscription return accepts subscribed plus Dodo’s active status and subscription id', () => {
    const result = detect('?status=subscribed&subscription_id=sub_x&payment_id=pay_x&status=active&email=ada@example.com');
    assert.equal(JSON.stringify(result.returnStatuses), JSON.stringify(['subscribed', 'active']));
    assert.equal(result.paidJustNow, false);
    assert.equal(result.subscribedJustNow, true);
});

test('Dodo-only success markers still count when the gateway status is missing', () => {
    assert.equal(detect('?status=succeeded&payment_id=pay_x').paidJustNow, true);
    assert.equal(detect('?checkout_id=ckt_x').paidJustNow, true);
    assert.equal(detect('?status=active&subscription_id=sub_x').subscribedJustNow, true);
});

test('a bare active status or a cancelled checkout is not a completed payment', () => {
    for (const search of ['?status=active', '?status=cancel', '?payment_id=pay_x', '']) {
        const result = detect(search);
        assert.equal(result.paidJustNow, false, search);
        assert.equal(result.subscribedJustNow, false, search);
    }
});

test('member-facing copy no longer names Stripe or says there is no subscription', () => {
    const files = [
        'account/credits/index.html',
        'pricing/index.html',
        'privacy/index.html',
        'terms/index.html',
        'pro-account.js',
        'pro-i18n.js',
        'i18n/pro/bn.json',
        'i18n/pro/fil.json',
        'i18n/pro/hi.json',
        'i18n/pro/id.json',
        'i18n/pro/pt-br.json',
        'i18n/pro/ur.json',
    ];
    for (const file of files) {
        const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
        assert.equal(/stripe/i.test(text), false, `${file} still mentions Stripe`);
    }
    const terms = readFileSync(new URL('../terms/index.html', import.meta.url), 'utf8');
    assert.equal(/there is no subscription/i.test(terms), false);
    assert.match(terms, /Monthly plans/);
    assert.match(terms, /7 days while a monthly plan is active/);
    assert.match(terms, /Cancelling a monthly plan stops the next renewal/);
});
