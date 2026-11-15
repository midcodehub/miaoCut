// 批量抠图和定价开放后，免费工具页必须能走到 /batch/、/pricing/、/account/，
// 首页不再收集候补邮箱。sitemap 收录定价和批量，账户和工作台保持在索引之外。
// 运行：node --test tests/public-links.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const LOCALES = ['', 'zh/', 'hi/', 'id/', 'pt-br/', 'bn/', 'fil/', 'ur/'];
const TOOLS = [
  'index.html',
  'product-photo-background-remover/index.html',
  'portrait-background-remover/index.html',
  'jpg-to-transparent-png/index.html',
  'watermark-remover/index.html',
  'old-photo-restoration/index.html',
  'id-photo-maker/index.html',
  'png-to-jpg-white-background/index.html',
];
const EXTRA_PAGES = [
  'how-to-remove-background/index.html',
  'how-to-remove-background/powerpoint/index.html',
  'how-to-remove-background/gimp/index.html',
  'alternatives/remove-bg/index.html',
  'privacy/index.html',
  'terms/index.html',
];
const DESTINATIONS = ['/batch/', '/pricing/', '/account/'];

function memberNav(html, label) {
  const nav = html.match(/<nav class="site-member-navigation"[\s\S]*?<\/nav>/);
  assert.ok(nav, `${label}: missing member navigation`);
  for (const href of DESTINATIONS) {
    assert.ok(nav[0].includes(`href="${href}"`), `${label}: missing ${href}`);
  }
  return nav[0];
}

test('free-tool pages link to batch, pricing, and account in every locale', () => {
  for (const locale of LOCALES) {
    for (const tool of TOOLS) {
      memberNav(read(locale + tool), locale + tool);
    }
  }
});

test('guides, the comparison page, privacy, and terms use the same links', () => {
  for (const file of EXTRA_PAGES) memberNav(read(file), file);
});

test('the homepage batch control opens /batch/ and links to pricing', () => {
  for (const locale of LOCALES) {
    const html = read(`${locale}index.html`);
    const entry = html.match(/<div id="batch-entry"[\s\S]*?<\/div>/);
    assert.ok(entry, `${locale}index.html: missing batch entry`);
    assert.match(entry[0], /<a id="batch-pro-trigger" href="\/batch\/"/);
    assert.match(entry[0], /href="\/pricing\/"/);
    assert.match(entry[0], /data-i18n="batchDoorPricing"/);
    assert.doesNotMatch(html, /batch-fake-door|batch-waitlist|id="batch-pro-trigger"[^>]*type="button"/);
  }
});

test('Chinese and Portuguese nav labels are translated', () => {
  const zh = memberNav(read('zh/index.html'), 'zh');
  assert.match(zh, />批量抠图</);
  assert.match(zh, />定价</);
  assert.match(zh, />账户</);
  const pt = memberNav(read('pt-br/portrait-background-remover/index.html'), 'pt-br portrait');
  assert.match(pt, />Lote</);
  assert.match(pt, />Preços</);
  assert.match(pt, />Conta</);
});

test('the rate-limit upsell points at live pages and the waitlist is gone', () => {
  const app = read('app.js');
  assert.match(app, /function initRateUpsell\(/);
  assert.match(app, /openUpsellModal\('rateDay'\)/);
  assert.match(app, /openUpsellModal\('rateBurst', secs\)/);
  assert.match(app, /id="rate-upsell-pricing" href="\/pricing\/"/);
  assert.match(app, /id="rate-upsell-batch" href="\/batch\/"/);
  assert.equal((app.match(/"navBatch":/g) || []).length, 8);
  assert.equal((app.match(/"navPricing":/g) || []).length, 8);
  assert.equal((app.match(/"navAccount":/g) || []).length, 8);
  assert.doesNotMatch(app, /waitlist|候补|即将上线|coming soon|batch-fake-door|batchModal|type="email"/i);
  for (const file of [
    'watermark-remover/watermark.js',
    'old-photo-restoration/old-photo.js',
    'id-photo-maker/id-photo.js',
    'png-to-jpg-white-background/png-to-jpg.js',
  ]) {
    const source = read(file);
    for (const key of ['navBatch', 'navPricing', 'navAccount', 'navMemberLabel']) {
      assert.equal((source.match(new RegExp(`"${key}":`, 'g')) || []).length, 8, `${file} ${key}`);
    }
  }
});

test('sitemap lists pricing and batch, and leaves account and the workbench out', () => {
  const xml = read('sitemap.xml');
  assert.match(xml, /<loc>https:\/\/miaocut\.app\/pricing\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/miaocut\.app\/batch\/<\/loc>/);
  assert.doesNotMatch(xml, /miaocut\.app\/account/);
  assert.doesNotMatch(xml, /workbench/);
});

test('batch can be indexed, account stays private, and the workbench stays noindex', () => {
  const batch = read('batch/index.html');
  assert.match(batch, /<meta name="robots" content="index,follow">/);
  assert.match(batch, /<link rel="canonical" href="https:\/\/miaocut\.app\/batch\/">/);
  assert.match(read('account/index.html'), /noindex/);
  assert.match(read('_headers'), /\/workbench\/\*\n {2}X-Robots-Tag: noindex, nofollow/);
});
