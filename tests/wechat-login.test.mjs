import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

let server, browser, base;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const scene = 'a'.repeat(32), pollToken = 'b'.repeat(64);
before(async () => {
  server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<html><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/output.css"></head><body>
        <section id="login"><button data-login-google>Google</button></section>
        <script>window.MiaoCutProI18n={lang:new URLSearchParams(location.search).get('lang')||'zh'};
        window.MIAOCUT_PRO_CONFIG={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'test'};</script>
        <script type="module">import account from '/pro-account.js';import {mountWechatLogin} from '/account/wechat-login.js';
        await mountWechatLogin(document.querySelector('#login'), account);window.mounted=true;</script></body></html>`);
      return;
    }
    if (!['/output.css', '/pro-account.js', '/account/wechat-login.js'].includes(path)) { res.writeHead(404).end(); return; }
    try { res.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : 'application/javascript'); res.end(await readFile(new URL('..' + path, import.meta.url))); }
    catch (_) { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
  browser = await chromium.launch({ executablePath, headless: true });
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });

// exchangeFailures：前几次领取返回 502（模拟网关签发会话失败、码已被退回“已确认”）。
async function setup({ lang = 'zh', enabled = true, state = 'waiting', failCreate = false, exchangeFailures = 0 } = {}) {
  const context = await browser.newContext({ viewport: { width: 320, height: 700 } });
  const page = await context.newPage();
  const calls = [];
  await page.route('https://esm.sh/**', route => route.fulfill({ contentType: 'application/javascript', body: `
    export function createClient(){ let callback=()=>{};return {auth:{
      async getSession(){return {data:{session:null}}},onAuthStateChange(fn){callback=fn},
      async verifyOtp(credentials){window.verifiedCredentials=credentials;
        const session={access_token:'test-access',user:{id:'test-user'}};callback('SIGNED_IN',session);return {data:{session}};}
    }}}` }));
  await page.route('https://pro-api.miaocut.app/auth/wechat/**', async route => {
    const action = new URL(route.request().url()).pathname.split('/').at(-1);
    calls.push({ action, body: route.request().postDataJSON() });
    const body = action === 'config' ? { enabled, miniapp_name: 'MiaoCut' } : action === 'challenge'
      ? { scene, poll_token: pollToken, expires_at: new Date(Date.now() + 300000).toISOString(), qrcode: png }
      : action === 'status' ? { state } : { state: 'ok', type: 'magiclink', token_hash: 'test-one-time-token' };
    if (action === 'exchange' && exchangeFailures > 0) {
      exchangeFailures--;
      await route.fulfill({ status: 502, json: { error: 'wechat_unavailable' } });
      return;
    }
    await route.fulfill({ status: action === 'challenge' && failCreate ? 502 : 200, json: body });
  });
  await page.goto(base + '/?lang=' + lang);
  await page.waitForFunction(() => window.mounted);
  return { page, context, calls };
}
test('only Chinese pages with an enabled backend show the WeChat option', async () => {
  for (const options of [{ lang: 'en' }, { lang: 'zh', enabled: false }, { lang: 'zh', enabled: true }]) {
    const { page, context, calls } = await setup(options);
    assert.equal(await page.locator('[data-login-wechat]').count(), options.lang === 'zh' && options.enabled ? 1 : 0);
    if (options.lang === 'en') assert.equal(calls.length, 0);
    await context.close();
  }
});
test('confirmation exchanges the private proof and installs a real Supabase session through verifyOtp', async () => {
  const { page, context, calls } = await setup({ state: 'confirmed' });
  await page.locator('[data-login-wechat]').click();
  await page.waitForFunction(() => !!window.verifiedCredentials);
  assert.deepEqual(await page.evaluate(() => window.verifiedCredentials), { token_hash: 'test-one-time-token', type: 'magiclink' });
  assert.deepEqual(calls.find(c => c.action === 'exchange').body, { scene, poll_token: pollToken });
  assert.equal(await page.locator('dialog').evaluate(d => d.open), false);
  assert.equal(await page.locator('[data-wx-code]').getAttribute('src'), null);
  assert.ok(!(await page.evaluate(() => JSON.stringify(localStorage))).includes(pollToken));
  await context.close();
});
test('Escape closes the dialog, clears the QR and stops polling; mobile and dark mode remain within the viewport', async () => {
  const { page, context, calls } = await setup();
  await page.locator('[data-login-wechat]').click();
  await page.waitForSelector('[data-wx-code]:not(.hidden)');
  if (process.env.WECHAT_SCREENSHOTS) await page.screenshot({ path: 'output/playwright/wechat-login-preview.png' });
  for (const dark of [false, true]) {
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const bounds = await page.locator('dialog').boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 320);
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-wx-code]').getAttribute('src'), null);
  await page.waitForTimeout(2300);
  assert.equal(calls.filter(c => c.action === 'status').length, 0);
  await context.close();
});
test('expired codes and generation failures offer a fresh attempt without issuing a session', async () => {
  for (const options of [{ state: 'expired' }, { failCreate: true }]) {
    const { page, context, calls } = await setup(options);
    await page.locator('[data-login-wechat]').click();
    await page.waitForSelector('[data-wx-refresh]:not(.hidden)');
    assert.equal(await page.locator('[data-wx-code]').getAttribute('src'), null);
    assert.equal(calls.filter(c => c.action === 'exchange').length, 0);
    await context.close();
  }
});
test('a failed exchange is retried on the same code and still installs the session', async () => {
  const { page, context, calls } = await setup({ state: 'confirmed', exchangeFailures: 1 });
  // 断言失败也要关掉上下文，否则浏览器连接不断开，测试进程会挂住。
  try {
    await page.locator('[data-login-wechat]').click();
    await page.waitForFunction(() => !!window.verifiedCredentials, null, { timeout: 15000 });
    assert.equal(calls.filter(c => c.action === 'exchange').length, 2);
    assert.equal(calls.filter(c => c.action === 'challenge').length, 1);
    assert.equal(await page.locator('dialog').evaluate(d => d.open), false);
  } finally { await context.close(); }
});
test('repeated exchange failures give up after three attempts and offer a fresh code', async () => {
  const { page, context, calls } = await setup({ state: 'confirmed', exchangeFailures: 99 });
  try {
    await page.locator('[data-login-wechat]').click();
    await page.waitForSelector('[data-wx-refresh]:not(.hidden)', { timeout: 15000 });
    assert.equal(calls.filter(c => c.action === 'exchange').length, 3);
    assert.equal(await page.locator('[data-wx-code]').getAttribute('src'), null);
    assert.equal(await page.evaluate(() => window.verifiedCredentials), undefined);
  } finally { await context.close(); }
});
