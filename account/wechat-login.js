// 中文登录卡共用的微信小程序扫码入口。二维码和领取凭证只在内存中保留。
export async function mountWechatLogin(root, account, { beforeLogin } = {}) {
  if (!root || window.MiaoCutProI18n?.lang !== 'zh' || root.dataset.wechatMounted) return;
  root.dataset.wechatMounted = '1';
  let config;
  try { config = await account.wechatRequest('config'); } catch (_) { return; }
  if (!config.enabled || !root.isConnected) return;
  const anchor = root.querySelector('[data-login-google], #btn-google');
  if (!anchor) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.loginWechat = '';
  button.className = 'flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 dark:bg-brand-600 dark:hover:bg-brand-700';
  button.innerHTML = '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 3C4.6 3 1 5.8 1 9.3c0 1.9 1.1 3.7 2.8 4.8L3 17l3.2-1.6c.9.2 1.8.3 2.8.3h.5a5.8 5.8 0 0 1-.4-2.1c0-3.5 3.3-6.3 7.4-6.3h.3C15.7 4.8 12.6 3 9 3ZM6.3 6.8a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm5.4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/><path d="M23 13.6c0-2.9-2.9-5.2-6.5-5.2S10 10.7 10 13.6s2.9 5.2 6.5 5.2c.8 0 1.6-.1 2.3-.3l2.7 1.4-.7-2.4c1.4-.9 2.2-2.3 2.2-3.9Zm-8.7-1.8a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Zm4.4 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Z"/></svg><span>微信扫码登录</span>';
  anchor.before(button);
  const dialog = document.createElement('dialog');
  dialog.className = 'wechat-login-dialog';
  dialog.setAttribute('aria-labelledby', 'wechat-login-title');
  dialog.innerHTML = `<div class="p-6 sm:p-8">
    <div class="flex items-start justify-between gap-4"><h2 id="wechat-login-title" class="text-xl font-semibold tracking-tight">微信扫码登录</h2>
      <button type="button" data-wx-close class="min-h-9 min-w-9 rounded-full text-xl hover:bg-gray-100 dark:hover:bg-zinc-800" aria-label="关闭微信登录">×</button></div>
    <p data-wx-intro class="mt-2 text-sm leading-6 text-gray-600 dark:text-zinc-400"></p>
    <div class="mx-auto mt-5 flex h-60 w-60 max-w-full items-center justify-center rounded-xl border border-gray-200 bg-white p-3 dark:border-zinc-700">
      <img data-wx-code class="hidden h-full w-full object-contain" width="216" height="216" alt="使用手机微信扫描此小程序码，并在手机上确认登录 MiaoCut">
      <span data-wx-placeholder class="text-sm text-gray-500">正在生成小程序码…</span></div>
    <p data-wx-status role="status" aria-live="polite" class="mt-4 min-h-6 text-center text-sm"></p>
    <div class="mt-4 flex justify-center"><button type="button" data-wx-refresh class="hidden min-h-11 rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800">刷新二维码</button></div>
    <p class="mt-4 text-xs leading-5 text-gray-500 dark:text-zinc-400">仅在你本人发起的网页登录中扫码，并核对手机确认页显示的网站为 miaocut.app。请勿转发此码。</p>
  </div>`;
  document.body.append(dialog);
  dialog.querySelector('[data-wx-intro]').textContent = `使用微信扫一扫，打开「${config.miniapp_name || '微信小程序'}」，在手机上确认登录。`;
  const code = dialog.querySelector('[data-wx-code]');
  const placeholder = dialog.querySelector('[data-wx-placeholder]');
  const status = dialog.querySelector('[data-wx-status]');
  const refresh = dialog.querySelector('[data-wx-refresh]');
  let timer, controller, challenge, generation = 0;

  function stop() {
    generation++;
    clearTimeout(timer);
    controller?.abort();
    challenge = null;
    code.removeAttribute('src');
    code.classList.add('hidden');
  }
  function showError(message) {
    stop();
    status.textContent = message;
    placeholder.textContent = '小程序码不可用';
    placeholder.classList.remove('hidden');
    refresh.classList.remove('hidden');
  }
  async function poll(ticket) {
    if (ticket !== generation || !dialog.open || !challenge) return;
    if (Date.now() >= Date.parse(challenge.expires_at)) { showError('二维码已过期，请刷新后重新扫码。'); return; }
    if (document.hidden) { timer = setTimeout(() => poll(ticket), 2000); return; }
    try {
      const proof = { scene: challenge.scene, poll_token: challenge.poll_token };
      const result = await account.wechatRequest('status', proof, controller.signal);
      if (ticket !== generation) return;
      if (result.state === 'confirmed') {
        status.textContent = '手机已确认，正在登录…';
        const credentials = await account.wechatRequest('exchange', proof, controller.signal);
        if (ticket !== generation) return;
        if (credentials.state !== 'ok') throw new Error('exchange_failed');
        await account.completeWechatLogin(credentials);
        if (dialog.open) dialog.close();
        return;
      }
      if (result.state !== 'waiting') { showError('此二维码已过期或已使用，请刷新后重新扫码。'); return; }
      timer = setTimeout(() => poll(ticket), 2000);
    } catch (error) {
      if (ticket !== generation || error.name === 'AbortError') return;
      showError('暂时无法完成微信登录，请刷新二维码后重试。');
    }
  }
  async function start() {
    stop();
    const ticket = generation;
    controller = new AbortController();
    placeholder.classList.remove('hidden');
    placeholder.textContent = '正在生成小程序码…';
    refresh.classList.add('hidden');
    status.textContent = '请稍候…';
    try {
      if (beforeLogin) await beforeLogin();
      const result = await account.wechatRequest('challenge', {}, controller.signal);
      if (ticket !== generation || !dialog.open) return;
      if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(result.qrcode || '') ||
        !/^[a-f0-9]{32}$/.test(result.scene || '') || !/^[a-f0-9]{64}$/.test(result.poll_token || '') ||
        !(Date.parse(result.expires_at) > Date.now()) || Date.parse(result.expires_at) > Date.now() + 600000) throw new Error('invalid_challenge');
      challenge = result;
      code.src = result.qrcode;
      code.classList.remove('hidden');
      placeholder.classList.add('hidden');
      status.textContent = '等待扫码，请在 5 分钟内完成确认。';
      timer = setTimeout(() => poll(ticket), 2000);
    } catch (error) {
      if (ticket !== generation || error.name === 'AbortError') return;
      showError(error.message === 'rate_limited' ? '刷新次数较多，请稍后再试。' : '小程序码生成失败，请稍后重试。');
    }
  }
  button.addEventListener('click', () => { dialog.showModal(); start(); });
  refresh.addEventListener('click', start);
  dialog.querySelector('[data-wx-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { stop(); button.focus(); });
  // Escape 在会话领取期间也可关闭；使迟到的响应失效。
  dialog.addEventListener('cancel', stop);
  account.onAuthChange(session => { if (session && dialog.open) dialog.close(); });
  window.addEventListener('pagehide', stop);
}
