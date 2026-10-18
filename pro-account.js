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

// 本地预览专用的模拟模式：只在 localhost / 127.0.0.1 上、URL 带 ?mock（或 localStorage.mcMock = "1"）时生效，
// 线上域名永远不会进入。进入后用假的登录态，网关请求交给 /dev/pro-mock.js 返回假数据，
// 用来在没有真实登录、没有网关跨域许可的本机上预览会员页面。?mock=empty 模拟刚注册的新用户。
const MOCK = (() => {
  try {
    if (!["localhost", "127.0.0.1"].includes(location.hostname)) return false;
    const q = new URLSearchParams(location.search);
    if (q.has("mock")) localStorage.setItem("mcMock", q.get("mock") || "1");
    return localStorage.getItem("mcMock") || false;
  } catch (_) {
    return false;
  }
})();

let _supabase = null;
let _session = MOCK ? { access_token: "mock-token", user: { email: "demo@example.com" } } : null;
const _listeners = new Set();

async function getClient() {
  if (MOCK) return null;
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

  /** 是否处于本地模拟模式（页面可以显示一个小提示，避免把假数据当真） */
  isMock() {
    return !!MOCK;
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

  /** 其他 OAuth 登录(如 "github")。provider 名称与 Supabase 后台的 Providers 一致 */
  async signInWithProvider(provider, redirectTo) {
    const c = await getClient();
    if (!c) throw new Error("auth_unavailable");
    return c.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo || window.location.href },
    });
  },

  /** 读取 Supabase 后台已开启的登录方式(公开接口 /auth/v1/settings),用来决定显示哪些按钮。
   *  失败时返回空对象:页面只显示 Google + 邮箱(已上线的两种),不会出现点了报错的按钮。 */
  async enabledProviders() {
    if (MOCK || !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return {};
    if (!this._providersPromise) {
      this._providersPromise = fetch(`${CFG.SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: CFG.SUPABASE_ANON_KEY },
      })
        .then((r) => (r.ok ? r.json() : {}))
        .then((d) => (d && d.external) || {})
        .catch(() => ({}));
    }
    return this._providersPromise;
  },

  /** 登录卡上的其他登录按钮(<button data-oauth="github">):后台已开启才显示,点击跳转登录。
   *  beforeRedirect:跳转前要做的事(批量页先把已选图片存进 IndexedDB);onError:失败提示 */
  async mountProviderButtons(root = document, { beforeRedirect, onError } = {}) {
    const enabled = await this.enabledProviders();
    root.querySelectorAll("[data-oauth]").forEach((btn) => {
      const provider = btn.dataset.oauth;
      btn.classList.toggle("hidden", !enabled[provider]);
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", async () => {
        try {
          if (beforeRedirect) await beforeRedirect();
          await this.signInWithProvider(provider, window.location.href);
        } catch (e) {
          if (onError) onError(e);
        }
      });
    });
  },

  async signOut() {
    const c = await getClient();
    if (c) await c.auth.signOut();
    if (MOCK) localStorage.removeItem("mcMock"); // 模拟模式下“退出”就是退出模拟
    _session = null;
  },

  /** 带鉴权调用 Pro 网关 */
  async proFetch(path, opts = {}) {
    if (MOCK) {
      const mock = await import("/dev/pro-mock.js");
      return mock.handle(path, opts, MOCK);
    }
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

  /** 积分汇总：各桶余额 + 30 天内将过期的赠送积分 {subscription, bonus, topup, frozen, total, expiring_30d, next_bonus_expiry} */
  async summary() {
    const res = await this.proFetch("/credits/summary");
    if (!res.ok) throw new Error(`summary_failed_${res.status}`);
    return res.json();
  },

  /** 分页 + 筛选取流水 → {ledger, next_cursor}
   *  opts：{limit, cursor（上一页的 next_cursor）, type: "in"|"out", reason: "freeze,release", month: "YYYY-MM"} */
  async ledgerPage(opts = {}) {
    const q = new URLSearchParams();
    for (const k of ["limit", "cursor", "type", "reason", "month"]) {
      if (opts[k] !== undefined && opts[k] !== null && opts[k] !== "") q.set(k, String(opts[k]));
    }
    const res = await this.proFetch(`/credits/ledger?${q}`);
    if (!res.ok) throw new Error(`ledger_failed_${res.status}`);
    return res.json();
  },

  /** 签到状态 + 某个月的日历(month 为 "YYYY-MM",不传 = 本月)。
   *  签到没开放时返回 {enabled:false};开放时见网关 /member/checkins 的说明
   *  {enabled, email_verified, today, checked_today, today_credits, streak, next_credits, next_reset_at,
   *   month, days:[{day, streak, credits}], month_days, month_credits, best_streak, total_days, total_credits,
   *   rule:{base, max}, monthly_cap, cap_used} */
  async checkinStatus(month) {
    const q = month ? `?month=${encodeURIComponent(month)}` : "";
    const res = await this.proFetch(`/member/checkins${q}`);
    if (!res.ok) throw new Error(`checkin_status_failed_${res.status}`);
    return res.json();
  },

  /** 签到 → {status: "ok"|"already", streak, credits, reward, capped, tomorrow_credits, next_reset_at}
   *  失败时抛 Error,message 是网关的错误码(email_not_verified / checkin_disabled / checkin_unavailable …) */
  async checkin() {
    const res = await this.proFetch("/member/checkin", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `checkin_failed_${res.status}`);
    return body;
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

  /** 发起月度订阅:返回 Stripe Checkout URL 并跳转。已有有效订阅时抛 Error("already_subscribed") */
  async checkoutPlan(plan) {
    const res = await this.proFetch("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (res.status === 409) throw new Error("already_subscribed");
    if (!res.ok) throw new Error(`checkout_failed_${res.status}`);
    const { url } = await res.json();
    if (url) window.location.href = url;
    return url;
  },

  /** 打开 Stripe 客户门户(改档 / 取消 / 更新银行卡 / 发票) */
  async billingPortal() {
    const res = await this.proFetch("/billing/portal", { method: "POST" });
    if (!res.ok) throw new Error(`portal_failed_${res.status}`);
    const { url } = await res.json();
    if (url) window.location.href = url;
    return url;
  },

  /** 公开接口:订阅是否已配置。失败时当作未开放(页面不显示订阅入口) */
  async plans() {
    try {
      const res = await fetch(`${PRO_API_BASE}/plans`);
      if (!res.ok) return { subscriptions_enabled: false, plans: [] };
      return await res.json();
    } catch (_) {
      return { subscriptions_enabled: false, plans: [] };
    }
  },
};

window.MiaoCutPro = MiaoCutPro;
MiaoCutPro.init().catch((e) => console.warn("[MiaoCutPro] init:", e));

export default MiaoCutPro;
