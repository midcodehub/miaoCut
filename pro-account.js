// =============================================================================
// MiaoCut Pro — 前端账户/积分模块  (window.MiaoCutPro)
// -----------------------------------------------------------------------------
// 职责:Supabase 登录态、按登录态选择网关、调用 Pro 网关的账户/积分/充值端点。
// 免费工具页无需改 API 逻辑:登录后用 MiaoCutPro.apiBase() 取付费网关地址即可。
//
// 页面需先设置配置(见各页 <script>):
//   window.MIAOCUT_PRO_CONFIG = {
//     SUPABASE_URL:  "https://YOUR.supabase.co",
//     SUPABASE_ANON_KEY: "ey...",
//     PRO_API_BASE:  "https://pro-api.miaocut.app",
//     FREE_API_BASE: "https://api2.miaocut.app"
//   };
// 然后:<script type="module" src="/pro-account.js"></script>
// =============================================================================

const CFG = window.MIAOCUT_PRO_CONFIG || {};
const PRO_API_BASE = CFG.PRO_API_BASE || "https://pro-api.miaocut.app";
const FREE_API_BASE = CFG.FREE_API_BASE || "https://api2.miaocut.app";

let _supabase = null;
let _session = null;
const _listeners = new Set();

async function getClient() {
  if (_supabase) return _supabase;
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) {
    console.warn("[MiaoCutPro] Supabase 未配置;登录功能不可用。");
    return null;
  }
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  _supabase = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const { data } = await _supabase.auth.getSession();
  _session = data.session || null;
  _supabase.auth.onAuthStateChange((_event, session) => {
    _session = session;
    _listeners.forEach((fn) => {
      try {
        fn(session);
      } catch (e) {
        /* noop */
      }
    });
  });
  return _supabase;
}

// ----- 公开 API -------------------------------------------------------------
const MiaoCutPro = {
  /** 监听登录态变化(回调收到 session|null) */
  onAuthChange(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },

  /** 当前是否已登录 */
  isLoggedIn() {
    return !!_session;
  },

  /** 当前 session(可能为 null) */
  session() {
    return _session;
  },

  /** 工具页用:按登录态返回应使用的推理网关基址 */
  apiBase() {
    return _session ? PRO_API_BASE : FREE_API_BASE;
  },

  /** 工具页上传时取「单图抠图」完整 URL(按登录态选网关 + 路径)。
   *  登录 → Pro 网关 /v1/remove-background;匿名 → 免费网关 /api/remove-background。 */
  removeBackgroundUrl(profile) {
    const base = this.apiBase();
    const path = _session ? "/v1/remove-background" : "/api/remove-background";
    const q = profile ? `?profile=${encodeURIComponent(profile)}` : "";
    return `${base}${path}${q}`;
  },

  /** 工具页上传时取鉴权头(登录带 Bearer,匿名为空)。用于现有 XHR 上传逻辑:
   *  Object.entries(MiaoCutPro.authHeader()).forEach(([k,v]) => xhr.setRequestHeader(k,v)); */
  authHeader() {
    return _session?.access_token ? { Authorization: `Bearer ${_session.access_token}` } : {};
  },

  /** 预热 Beam:前端在「用户选图」时调用,把 GPU 冷启动藏进随后的上传窗口。
   *  仅登录用户需要(匿名走免费 CPU);失败静默,不影响主流程。 */
  async prewarm() {
    if (!_session) return;
    try {
      await this.proFetch("/v1/prewarm", { method: "POST" });
    } catch (e) {
      /* 预热失败不影响后续真实请求 */
    }
  },

  /** 初始化(页面加载时调用一次) */
  async init() {
    await getClient();
    return _session;
  },

  /** 发送邮箱魔法链接 */
  async signInWithEmail(email, redirectTo) {
    const c = await getClient();
    if (!c) throw new Error("auth_unavailable");
    return c.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo || window.location.href },
    });
  },

  /** Google 登录 */
  async signInWithGoogle(redirectTo) {
    const c = await getClient();
    if (!c) throw new Error("auth_unavailable");
    return c.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo || window.location.href },
    });
  },

  async signOut() {
    const c = await getClient();
    if (c) await c.auth.signOut();
    _session = null;
  },

  /** 带鉴权调用 Pro 网关 */
  async proFetch(path, opts = {}) {
    await getClient();
    const headers = new Headers(opts.headers || {});
    if (_session?.access_token) {
      headers.set("Authorization", `Bearer ${_session.access_token}`);
    }
    return fetch(`${PRO_API_BASE}${path}`, { ...opts, headers });
  },

  /** 账户 + 余额 */
  async me() {
    const res = await this.proFetch("/auth/me");
    if (!res.ok) throw new Error(`me_failed_${res.status}`);
    return res.json();
  },

  async balance() {
    const res = await this.proFetch("/credits/balance");
    if (!res.ok) throw new Error(`balance_failed_${res.status}`);
    return res.json();
  },

  async ledger(limit = 50) {
    const res = await this.proFetch(`/credits/ledger?limit=${limit}`);
    if (!res.ok) throw new Error(`ledger_failed_${res.status}`);
    return res.json();
  },

  /** 发起充值:返回 Stripe Checkout URL 并跳转 */
  async checkout(sku) {
    const res = await this.proFetch("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku }),
    });
    if (!res.ok) throw new Error(`checkout_failed_${res.status}`);
    const { url } = await res.json();
    if (url) window.location.href = url;
    return url;
  },
};

window.MiaoCutPro = MiaoCutPro;
MiaoCutPro.init().catch((e) => console.warn("[MiaoCutPro] init:", e));

export default MiaoCutPro;
