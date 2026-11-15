// Creem merchant review: policies, support address, and prices are in the HTML.
// Run: node --test tests/creem-review.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url);

function read(rel) {
  return readFileSync(new URL(rel, root), 'utf8');
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'workbench') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

const skipPage = (rel) =>
  rel.startsWith('scripts/') || rel.startsWith('google') || rel.includes('template.html');

function tags(html) {
  return [...String(html).matchAll(/<[^>]+>/g)].map((match) => match[0]).sort();
}

test('every public page footer shows support@miaocut.app and links to the acceptable use policy', () => {
  const base = new URL('.', root).pathname;
  const pages = walk(base).map((file) => relative(base, file));
  const checked = pages.filter((rel) => !skipPage(rel));
  assert.ok(checked.length > 40);
  for (const rel of checked) {
    const html = read(rel);
    const footerAt = html.lastIndexOf('<footer');
    assert.ok(footerAt >= 0, `${rel}: missing footer`);
    const footer = html.slice(footerAt);
    assert.match(footer, /support@miaocut\.app/, `${rel}: footer support address`);
    assert.match(footer, /href="\/acceptable-use\/"/, `${rel}: footer acceptable use link`);
  }
});

test('acceptable use policy is in the sitemap once', () => {
  const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(locs.filter((url) => url === 'https://miaocut.app/acceptable-use/').length, 1);
});

test('pricing shows pack and plan prices without waiting for the plans API', () => {
  const html = read('pricing/index.html');
  const plansOpen = html.match(/<section id="plans"[^>]*>/);
  assert.ok(plansOpen, 'plans section');
  assert.doesNotMatch(plansOpen[0], /\bhidden\b/);
  for (const price of ['$4.99', '$14.99', '$29.99', '$79.99', '$6.99', '$19.99', '$49.99']) {
    assert.match(html, new RegExp(price.replace('$', '\\$')));
  }
  assert.match(html, />300</);
  assert.match(html, />1,500</);
  assert.match(html, />5,000</);
  assert.match(html, /support@miaocut\.app/);
  assert.match(html, /Downgrades apply immediately/);
  assert.match(html, /Creem \(creem\.io\)/);
  for (const button of html.match(/<button[^>]*data-plan-btn="[^"]+"[^>]*>/g)) {
    assert.match(button, /\bhidden\b/, button);
  }
});

test('terms and privacy name Creem and state the refund and content rules', () => {
  const terms = read('terms/index.html');
  const privacy = read('privacy/index.html');
  const aup = read('acceptable-use/index.html');
  for (const html of [terms, privacy]) {
    assert.match(html, /https:\/\/creem\.io/);
    assert.match(html, /merchant of record/);
    assert.match(html, /reseller/);
    assert.match(html, /full card number/);
  }
  assert.match(terms, /prorated difference/);
  assert.match(terms, /downgrade immediately/i);
  assert.match(terms, /does not refund that period/);
  assert.match(terms, /NSFW, explicit, or sexually suggestive/);
  assert.match(terms, /content involving minors/i);
  assert.match(terms, /automatically screened by content moderation/);
  assert.match(terms, /href="\/acceptable-use\/"/);
  assert.match(aup, /NSFW, explicit, or sexually suggestive/);
  assert.match(aup, /content involving minors/i);
  assert.match(aup, /non-consensual imagery of real people/i);
  assert.match(aup, /Violence or gore/);
  assert.match(aup, /Hate content/);
  assert.match(aup, /Illegal content/);
  assert.match(aup, /intellectual property/);
  assert.match(aup, /Deceptive or fraudulent use/);
  assert.match(aup, /automatically screened by content moderation/);
  assert.match(aup, /account suspension/);
  assert.equal((terms.match(/<h1\b/g) || []).length, 1);
  assert.match(terms, /<h1[^>]*>Terms of Use<\/h1>/);
  assert.match(privacy, /<h1[^>]*>Privacy Policy<\/h1>/);
});

test('legal translations cover every on-page string and keep the same tags', () => {
  const pages = ['privacy/index.html', 'terms/index.html', 'acceptable-use/index.html'];
  const english = {};
  for (const page of pages) {
    const html = read(page);
    for (const match of html.matchAll(/<([a-z0-9]+)([^>]*\sdata-li18n(?:-html)?="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g)) {
      if (!(match[3] in english)) english[match[3]] = match[4].trim();
    }
    const titleKey = html.match(/data-li18n-title="([^"]+)"/);
    const title = html.match(/<title>([^<]+)<\/title>/);
    english[titleKey[1]] = title[1];
  }
  for (const code of ['zh', 'hi', 'id', 'pt-br', 'bn', 'fil', 'ur']) {
    const pack = JSON.parse(read(`i18n/legal/${code}.json`));
    assert.deepEqual(Object.keys(pack).sort(), Object.keys(english).sort(), `${code}: key coverage`);
    for (const [key, value] of Object.entries(english)) {
      assert.ok(pack[key].trim(), `${code}.${key}`);
      assert.deepEqual(tags(pack[key]), tags(value), `${code}.${key}: tags`);
    }
  }
});
