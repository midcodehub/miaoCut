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

// ---------- 邀请码（会员体系 P3）----------
// 朋友点邀请链接（/invite/?ref=XXXXXXXX；会员页、定价页、批量页上带 ?ref= 也行）时，把邀请码存进浏览器 30 天
// （最后一次点击生效）；朋友登录后自动提交绑定，网关判断能不能给邀请人发奖励。
// 页面只会知道「已处理 / 被忽略」，不会知道有没有奖励、为什么没有（见网关 handleReferralBind）。
const REF_KEY = "mc_ref";
const REF_TTL = 30 * 86400e3;
const REF_RE = /^[A-Za-z0-9]{8}$/; // 宽松检查格式；严格的字母表（没有 I L O 0 1）由网关判断

(function captureRef() {
  try {
    const c = (new URLSearchParams(location.search).get("ref") || "").trim();
    if (REF_RE.test(c)) localStorage.setItem(REF_KEY, JSON.stringify({ c: c.toUpperCase(), t: Date.now() }));
  } catch (_) {
    /* 隐私模式 / localStorage 被禁用：不影响页面 */
  }
})();

/** 取出还有效的邀请码；过期（超过 30 天）或格式不对的顺手清掉 */
function storedRef() {
  try {
    const o = JSON.parse(localStorage.getItem(REF_KEY) || "null");
    if (o && REF_RE.test(o.c) && Date.now() - o.t < REF_TTL) return o.c;
    localStorage.removeItem(REF_KEY);
  } catch (_) {
    /* 忽略 */
  }
  return null;
}

let _binding = false; // 同一时刻只提交一次（init 和登录事件可能几乎同时触发）
async function bindReferral() {
  if (_binding || !_session) return;
  const code = storedRef();
  if (!code) return;
  _binding = true;
  try {
    const res = await MiaoCutPro.proFetch("/member/referral/bind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    // 已处理（200）或这个码不会再成功（4xx）：清掉。登录过期（401）、限流（429）、服务端出错（5xx）、
    // 网络错误：保留，下次打开页面再试。
    if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429)) {
      localStorage.removeItem(REF_KEY);
    }
  } catch (_) {
    /* 网络错误：保留邀请码，下次再试 */
  } finally {
    _binding = false;
  }
}

// 各 OAuth 登录方式要额外申请的权限(scope),键名 = Supabase 的 provider 名。
// - azure(Microsoft):不带 "email" 时,微软返回的 ID Token 里经常没有邮箱,Supabase 会报
//   "Error getting user email from external provider" 登录失败;个人账号(outlook.com / hotmail.com)尤其常见。
// - github:Supabase 默认就会申请 user:email,不用额外加。
const OAUTH_SCOPES = { azure: "email" };

// ---------- 登录回跳地址 / 账号选择页 ----------

/**
 * 登录回跳地址：去掉 #片段，保留 ?查询串（?ref= 邀请码等）。
 *
 * 为什么必须去掉：登录完成后 Supabase 会把登录令牌拼在回跳地址后面（…#access_token=…）。
 * 而登录库登录成功后会用 `window.location.hash = ""` 清理地址栏，浏览器因此在地址末尾留下一个孤零零的 "#"。
 * 之后（登出再登录、登录过期重登……）如果把这个带 "#" 的当前地址当回跳地址，令牌就被拼成 "##access_token=…"，
 * 登录库解析时去掉第一个 "#"，读出的第一个参数名是 "#access_token"，认不出令牌——登录静默失败，页面还是登录页。
 */
export function cleanRedirect(url) {
  try {
    const u = new URL(url || window.location.href, window.location.href);
    u.hash = ""; // 注意：赋空字符串会连孤零零的 "#" 一起去掉（URL 规范里片段变成 null）
    // 上一次登录失败（用户取消授权、公司管理员没批准……）时，回跳地址的查询串里会带 error=… 参数。
    // 登录库看到地址里有 error / error_description / error_code，就会把这次回跳当成失败，
    // 哪怕同时带着有效的登录令牌也一样（auth-js 的 _getSessionFromURL 先抛错）。所以绝不能把它们带进下一次回跳地址。
    AUTH_ERROR_KEYS.forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch (_) {
    return url || window.location.href; // 解析不了就原样用，不会比以前更差
  }
}

// ---------- 登录失败的回跳（?error=… / #error=…）----------
// 用户在第三方的授权页点了「取消」，或者公司账号被管理员拦下（微软：AADSTS65004 用户拒绝授权、需要管理员批准……），
// Supabase 会把错误原样带回我们的页面：既放在查询串里（?error=access_denied&error_description=…），
// 也放在 # 片段里（#error=…&sb=）。这些参数留在地址栏会出两个问题：
//   1. 之后换一种方式登录（比如改点 Google），回跳地址又带着它们，登录库一看到 error 就判失败，
//      哪怕 Google 已经成功、令牌就在地址里也一样——页面还是登录页，也不会跳转（2026-10-20 实测）；
//   2. 用户看不到任何提示，不知道发生了什么。
// 所以页面加载时先把错误参数取出来记住，并把地址栏清干净（要赶在登录库读地址之前，所以放在模块加载时做）。
const AUTH_ERROR_KEYS = ["error", "error_code", "error_description", "error_uri"];
let _authError = null;

/** 把 URL 编码的错误说明还原成人能读的文字（微软的说明在 # 片段里被编码了两次：%253A → %3A → ":"） */
function decodeDescription(v) {
  let out = String(v || "").replace(/\+/g, " ");
  for (let i = 0; i < 2; i++) {
    try {
      out = decodeURIComponent(out);
    } catch (_) {
      break;
    }
  }
  return out;
}

/**
 * 取出地址里的登录失败信息并清掉地址栏。没有错误参数就什么都不做，返回 null。
 * 注意：# 片段可能有好几个 "#"（上一次失败的片段 + 之后又一次成功登录追加的令牌片段），
 * 所以按 "#" 切成几段分别看；如果某一段带着登录令牌（access_token），保留最后一段，这样已经卡在这种地址上的人
 * 刷新一下页面就能直接登录成功，不用再点一次登录。
 */
export function takeAuthErrorFromUrl() {
  try {
    const u = new URL(window.location.href);
    const found = {};
    AUTH_ERROR_KEYS.forEach((k) => {
      if (u.searchParams.has(k)) found[k] = u.searchParams.get(k);
    });
    const segments = u.hash.split("#").filter(Boolean);
    for (const seg of segments) {
      const p = new URLSearchParams(seg);
      AUTH_ERROR_KEYS.forEach((k) => {
        if (p.has(k) && !(k in found)) found[k] = p.get(k);
      });
    }
    if (!Object.keys(found).length) return null;

    AUTH_ERROR_KEYS.forEach((k) => u.searchParams.delete(k));
    const tokenSegment = segments.slice().reverse().find((seg) => /(^|&)access_token=/.test(seg));
    const search = u.searchParams.toString() ? `?${u.searchParams.toString()}` : "";
    window.history.replaceState(window.history.state, "", u.pathname + search + (tokenSegment ? `#${tokenSegment}` : ""));
    return { code: found.error_code || found.error, description: decodeDescription(found.error_description) };
  } catch (_) {
    return null;
  }
}

/**
 * 这次失败是不是「用户没同意 / 管理员没批准」（而不是别的故障）。
 * 微软：AADSTS65004（用户拒绝授权）、AADSTS65001（没有授权过）、AADSTS90094 / AADSTS650056（需要管理员批准）。
 */
export function isConsentDeclined(err) {
  if (!err) return false;
  return err.code === "access_denied" || /AADSTS(65004|65001|90094|650056)|consent|approval/i.test(err.description || "");
}

_authError = takeAuthErrorFromUrl();

// 「下次登录要让用户选账号」标记：用户点了「退出登录」后设置，下一次点登录按钮时消费（读到就清掉）。
// 为什么需要：退出的只是我们的网站，浏览器和 Google / 微软 / GitHub 的登录状态还在，
// 再点登录它们会直接把同一个账号送回来，用户没机会换账号。
const PICK_ACCOUNT_KEY = "mc_pick_account";

function markPickAccount() {
  try {
    localStorage.setItem(PICK_ACCOUNT_KEY, "1");
  } catch (_) {
    /* 隐私模式 / localStorage 被禁用：不影响退出 */
  }
}

export function takePickAccount() {
  try {
    const on = localStorage.getItem(PICK_ACCOUNT_KEY) === "1";
    if (on) localStorage.removeItem(PICK_ACCOUNT_KEY);
    return on;
  } catch (_) {
    return false;
  }
}

/**
 * 某个 OAuth 登录方式的参数：回跳地址（去掉 #）+ 需要的权限 + 是否强制显示账号选择页。
 *   - azure（Microsoft）：总是强制选账号。个人账号和公司 / 学校账号常常在同一个浏览器里切换，
 *     不强制的话微软会静默复用已登录的那个账号。
 *   - 其他（Google、GitHub）：只在用户刚退出登录后（forcePicker = true）才强制选账号，
 *     平时保持一键登录。
 */
export function oauthOptions(provider, redirectTo, forcePicker = false) {
  const options = { redirectTo: cleanRedirect(redirectTo) };
  // 部分登录方式要额外申请权限(scope)才能拿到邮箱,见上面的 OAUTH_SCOPES
  if (OAUTH_SCOPES[provider]) options.scopes = OAUTH_SCOPES[provider];
  if (provider === "azure" || forcePicker) options.queryParams = { prompt: "select_account" };
  return options;
}

/** 清掉地址栏里残留的孤零零的 "#"（登录库清理令牌后留下的），免得被复制 / 当成回跳地址 */
function tidyUrl() {
  try {
    if (window.location.href.endsWith("#")) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
  } catch (_) {
    /* 忽略 */
  }
}

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
    if (session) bindReferral(); // 刚登录（邮箱链接 / Google 跳回来）：有邀请码就提交绑定
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
    tidyUrl(); // 登录库处理完回跳地址后会留下孤零零的 "#"，清掉
    bindReferral(); // 不等它：绑定结果不影响页面
    return _session;
  },

  /** 这次打开页面时，地址里带的登录失败信息 {code, description}（没有就是 null）。登录卡据此显示提示 */
  authError() {
    return _authError;
  },

  /** 上面这个登录失败信息属于哪一类："declined" = 用户没同意 / 管理员没批准；"other" = 别的故障；没有失败就是 null */
  authErrorKind() {
    return _authError ? (isConsentDeclined(_authError) ? "declined" : "other") : null;
  },

  /** 是否处于本地模拟模式（页面可以显示一个小提示，避免把假数据当真） */
  isMock() {
    return !!MOCK;
  },

  /** 微信小程序扫码接口不等待第三方登录 SDK 初始化。凭证不进入 URL 或本地存储。 */
  async wechatRequest(action, body, signal) {
    if (!['config', 'challenge', 'status', 'exchange'].includes(action)) throw new Error('invalid_action');
    const response = await fetch(`${PRO_API_BASE}/auth/wechat/${action}`, {
      method: action === 'config' ? 'GET' : 'POST', cache: 'no-store', signal,
      ...(action === 'config' ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'wechat_unavailable');
    return data;
  },

  async completeWechatLogin(credentials) {
    if (!credentials?.token_hash || !['magiclink', 'signup'].includes(credentials.type)) throw new Error('invalid_wechat_session');
    const client = await getClient();
    if (!client) throw new Error('auth_unavailable');
    const { data, error } = await client.auth.verifyOtp({ token_hash: credentials.token_hash, type: credentials.type });
    if (error || !data?.session) throw error || new Error('wechat_login_failed');
    return data.session;
  },

  /** 发送邮箱魔法链接 */
  async signInWithEmail(email, redirectTo) {
    const c = await getClient();
    if (!c) throw new Error("auth_unavailable");
    return c.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: cleanRedirect(redirectTo) },
    });
  },

  /** Google 登录 */
  async signInWithGoogle(redirectTo) {
    const c = await getClient();
    if (!c) throw new Error("auth_unavailable");
    return c.auth.signInWithOAuth({
      provider: "google",
      options: oauthOptions("google", redirectTo, takePickAccount()),
    });
  },

  /** 其他 OAuth 登录(如 "github"、"azure")。provider 名称与 Supabase 后台的 Providers 一致 */
  async signInWithProvider(provider, redirectTo) {
    const c = await getClient();
    if (!c) throw new Error("auth_unavailable");
    return c.auth.signInWithOAuth({ provider, options: oauthOptions(provider, redirectTo, takePickAccount()) });
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
    markPickAccount(); // 下次登录让用户重新选账号（浏览器里和 Google / 微软的登录状态还在，不选的话会静默复用）
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

  /** 我的邀请码 / 链接 / 统计。邀请没开放返回 {enabled:false}；邮箱没验证返回 {enabled:true, eligible:false}；
   *  可用时 {enabled, eligible, code, link, reward, valid_days, monthly_cap, invited, rewarded, credits_earned,
   *  rewarded_this_month, remaining_this_month} */
  async referral() {
    const res = await this.proFetch("/member/referral");
    if (!res.ok) throw new Error(`referral_failed_${res.status}`);
    return res.json();
  },

  /** 邀请记录（对方邮箱已打码）→ {items:[{id, email, status, credits, created_at}], next_cursor}；cursor 是上一页的 next_cursor */
  async referralList(cursor) {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await this.proFetch(`/member/referral/list${q}`);
    if (!res.ok) throw new Error(`referral_list_failed_${res.status}`);
    return res.json();
  },

  /** 开发者 API Key 列表 + 限额。没开放返回 {enabled:false}；邮箱没验证返回 {enabled:true, eligible:false}；
   *  可用时 {enabled, eligible, keys:[{id, name, prefix, created_at, last_used_at, month_jobs, month_images}],
   *  max_keys, rate_per_min, max_active_jobs}。列表里只有前缀，没有完整 Key（完整 Key 只在生成时返回一次） */
  async apiKeys() {
    const res = await this.proFetch("/member/api-keys");
    if (!res.ok) throw new Error(`api_keys_failed_${res.status}`);
    return res.json();
  },

  /** 生成一把 Key → {key, id, name, prefix, created_at}。⚠️ 完整的 key 只在这次响应里有，之后任何接口都取不到。
   *  失败时抛 Error，message 是网关的错误码（too_many_keys / invalid_name / email_not_verified / api_keys_disabled …） */
  async createApiKey(name) {
    const res = await this.proFetch("/member/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.error || `api_key_create_failed_${res.status}`);
      err.max = body.max; // too_many_keys 时带上限
      throw err;
    }
    return body;
  },

  /** 吊销一把 Key，立刻失效。失败抛 Error（not_found / api_keys_disabled …） */
  async revokeApiKey(id) {
    const res = await this.proFetch(`/member/api-keys/${encodeURIComponent(id)}/revoke`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `api_key_revoke_failed_${res.status}`);
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
      const res = MOCK ? await this.proFetch('/plans') : await fetch(`${PRO_API_BASE}/plans`);
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
