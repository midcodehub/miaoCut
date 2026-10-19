// =============================================================================
// 登录回跳地址 / 账号选择页 的测试（pro-account.js）
// -----------------------------------------------------------------------------
// 覆盖 2026-10-20 发现的问题：
//   1. 回跳地址带着孤零零的 "#"，登录令牌被拼成 "##access_token=…"，登录库认不出 → 登录静默失败
//   2. 退出登录后再点登录，微软 / Google 直接复用浏览器里已登录的账号，用户没法换账号
// 运行：npm run test:login   （node --test，不需要浏览器）
//
// pro-account.js 是浏览器模块，加载时会读 window / location / localStorage，所以这里先造几个假的全局对象。
// =============================================================================
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ---------- 假的浏览器环境 ----------
const store = new Map();
const fakeStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const replaced = []; // history.replaceState 的调用记录
let currentHref = "https://miaocut.app/account/";
const def = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

def("window", globalThis);
def("localStorage", fakeStorage);
def("history", { state: null, replaceState: (_s, _t, url) => { replaced.push(url); currentHref = new URL(url, currentHref).toString(); } });
// location 的各个字段都从 currentHref 现算，测试里改 currentHref 就等于“换了个地址”
def("location", {
  get href() { return currentHref; },
  get search() { return new URL(currentHref).search; },
  get pathname() { return new URL(currentHref).pathname; },
  get hostname() { return new URL(currentHref).hostname; },
});
globalThis.MIAOCUT_PRO_CONFIG = {}; // 没配 Supabase：getClient 返回 null，不会真的去加载登录库

let mod;
before(async () => {
  mod = await import("../pro-account.js");
});
beforeEach(() => {
  store.clear();
  replaced.length = 0;
  currentHref = "https://miaocut.app/account/";
});

// 和 supabase-js 解析回跳参数的做法一样（auth-js 的 parseParametersFromURL）：
// 取 URL 的 hash，去掉第一个字符再按查询串解析。
function parseCallback(href) {
  const out = {};
  const u = new URL(href);
  if (u.hash && u.hash[0] === "#") new URLSearchParams(u.hash.substring(1)).forEach((v, k) => (out[k] = v));
  return out;
}

// ---------- 1. 回跳地址去掉 # ----------
test("复现问题：回跳地址带孤零零的 '#'，令牌被拼成 '##'，登录库认不出", () => {
  const redirectTo = "https://miaocut.app/account/#"; // 旧代码直接用 location.href，登录库清理后留下了 "#"
  const callback = redirectTo + "#access_token=T&refresh_token=R"; // Supabase 在回跳地址后面拼上令牌
  const parsed = parseCallback(callback);
  assert.equal(parsed.access_token, undefined, "旧做法：读不到 access_token");
  assert.equal(parsed["#access_token"], "T", "旧做法：第一个参数名变成了 '#access_token'");
});

test("cleanRedirect：去掉孤零零的 '#'，令牌能被正确解析", () => {
  const redirectTo = mod.cleanRedirect("https://miaocut.app/account/#");
  assert.equal(redirectTo, "https://miaocut.app/account/");
  const parsed = parseCallback(redirectTo + "#access_token=T&refresh_token=R");
  assert.equal(parsed.access_token, "T");
  assert.equal(parsed.refresh_token, "R");
});

test("cleanRedirect：保留 ?查询串（邀请码 ?ref=），去掉 #片段", () => {
  assert.equal(mod.cleanRedirect("https://miaocut.app/invite/?ref=ABCD2345#"), "https://miaocut.app/invite/?ref=ABCD2345");
  assert.equal(mod.cleanRedirect("https://miaocut.app/invite/?ref=ABCD2345#access_token=x&y=1"), "https://miaocut.app/invite/?ref=ABCD2345");
  assert.equal(mod.cleanRedirect("https://miaocut.app/account/?lang=zh&mock=1"), "https://miaocut.app/account/?lang=zh&mock=1");
});

test("cleanRedirect：本来就干净的地址不变；不传参数时用当前页面地址", () => {
  assert.equal(mod.cleanRedirect("https://miaocut.app/account/"), "https://miaocut.app/account/");
  currentHref = "https://miaocut.app/batch/#";
  assert.equal(mod.cleanRedirect(), "https://miaocut.app/batch/");
  assert.equal(mod.cleanRedirect(""), "https://miaocut.app/batch/");
});

test("cleanRedirect：相对地址按当前页面补全；乱七八糟的输入不抛错", () => {
  currentHref = "https://miaocut.app/account/";
  assert.equal(mod.cleanRedirect("/pricing/#x"), "https://miaocut.app/pricing/");
  assert.doesNotThrow(() => mod.cleanRedirect("http://[bad"));
});

// ---------- 2. 登录参数与账号选择页 ----------
test("oauthOptions：Microsoft（azure）总是强制选账号，带邮箱权限，回跳地址已去掉 #", () => {
  for (const force of [false, true]) {
    const o = mod.oauthOptions("azure", "https://miaocut.app/account/#", force);
    assert.equal(o.redirectTo, "https://miaocut.app/account/");
    assert.equal(o.scopes, "email");
    assert.deepEqual(o.queryParams, { prompt: "select_account" });
  }
});

test("oauthOptions：Google / GitHub 平时不强制选账号（保持一键登录），刚退出登录后才强制", () => {
  for (const provider of ["google", "github"]) {
    const normal = mod.oauthOptions(provider, "https://miaocut.app/account/#", false);
    assert.equal(normal.queryParams, undefined, `${provider}：平时不带 prompt`);
    assert.equal(normal.redirectTo, "https://miaocut.app/account/");
    const afterSignOut = mod.oauthOptions(provider, "https://miaocut.app/account/", true);
    assert.deepEqual(afterSignOut.queryParams, { prompt: "select_account" }, `${provider}：刚退出登录后带 prompt`);
  }
});

test("oauthOptions：没有额外权限要求的登录方式不带 scopes", () => {
  assert.equal(mod.oauthOptions("google", "https://miaocut.app/").scopes, undefined);
  assert.equal(mod.oauthOptions("github", "https://miaocut.app/").scopes, undefined);
});

// ---------- 3. 退出登录标记 ----------
test("退出登录后设置「下次选账号」标记；takePickAccount 读到就清掉，只生效一次", async () => {
  assert.equal(mod.takePickAccount(), false, "没退出过：没有标记");
  await mod.default.signOut();
  assert.equal(store.get("mc_pick_account"), "1", "退出后设置了标记");
  assert.equal(mod.takePickAccount(), true, "第一次登录：读到标记");
  assert.equal(store.has("mc_pick_account"), false, "读到就清掉");
  assert.equal(mod.takePickAccount(), false, "第二次登录：不再强制选账号");
});

test("localStorage 不可用（隐私模式）时，退出登录和读取标记都不报错", async () => {
  const saved = globalThis.localStorage;
  def("localStorage", {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  });
  try {
    await assert.doesNotReject(() => mod.default.signOut());
    assert.equal(mod.takePickAccount(), false);
  } finally {
    def("localStorage", saved);
  }
});

// ---------- 4. 地址栏残留的 # ----------
test("init：地址栏末尾有孤零零的 '#' 就清掉（保留路径和查询串）", async () => {
  currentHref = "https://miaocut.app/invite/?ref=ABCD2345#";
  await mod.default.init();
  assert.deepEqual(replaced, ["/invite/?ref=ABCD2345"]);
});

test("init：地址栏本来就干净，或者带着真正的令牌片段，都不去动", async () => {
  currentHref = "https://miaocut.app/account/";
  await mod.default.init();
  currentHref = "https://miaocut.app/account/#access_token=T"; // 正在处理中的回跳，不能碰
  await mod.default.init();
  assert.deepEqual(replaced, []);
});

// =============================================================================
// 5. 登录失败的回跳（2026-10-20：企业账号被管理员拦下后，再点 Google 登录，页面不跳转、一直是登录页）
// =============================================================================
// 现场的地址（令牌换成了假的）：查询串里有 error，# 片段里先是上次失败的 error，
// 后面又追加了两次成功登录的令牌片段。
const STUCK =
  "https://miaocut.app/account/?error=access_denied&error_description=AADSTS65004%3A+User+declined+to+consent+to+access+the+app." +
  "#error=access_denied&error_description=AADSTS65004%253A+User+declined+to+consent+to+access+the+app.&sb=" +
  "#access_token=T1&expires_at=1&sb=&token_type=bearer" +
  "#access_token=T2&expires_at=2&sb=&token_type=bearer";

let fresh = 0;
// 重新加载一遍 pro-account.js（带不同的查询串就是一个新模块），让它在“打开页面”的瞬间读到当前地址
async function loadPageAt(href) {
  currentHref = href;
  replaced.length = 0;
  return import(`../pro-account.js?fresh=${++fresh}`);
}

test("复现问题：带着上次的 error=… 的地址当回跳地址，登录库就把这次回跳判为失败，即使令牌就在地址里", () => {
  // 和 auth-js 一样：查询串和 # 片段里的参数合在一起看，只要有 error / error_description / error_code 就抛错
  const params = (href) => {
    const out = {};
    const u = new URL(href);
    if (u.hash && u.hash[0] === "#") new URLSearchParams(u.hash.substring(1)).forEach((v, k) => (out[k] = v));
    u.searchParams.forEach((v, k) => (out[k] = v));
    return out;
  };
  const redirectBefore = "https://miaocut.app/account/?error=access_denied&error_description=declined"; // 旧做法：保留了查询串
  const callback = redirectBefore + "#access_token=T";
  const p = params(callback);
  assert.equal(p.access_token, "T", "令牌在");
  assert.ok(p.error || p.error_description, "但同时带着 error → 登录库先抛错，不会建立登录");
});

test("cleanRedirect：去掉查询串里残留的登录错误参数，保留 ?ref= 等其他参数", () => {
  assert.equal(
    mod.cleanRedirect("https://miaocut.app/account/?error=access_denied&error_description=AADSTS65004%3A+x&error_code=c&error_uri=u&ref=ABCD2345&lang=zh#error=x"),
    "https://miaocut.app/account/?ref=ABCD2345&lang=zh",
  );
  assert.equal(mod.cleanRedirect("https://miaocut.app/account/?error=access_denied"), "https://miaocut.app/account/");
});

test("oauthOptions：回跳地址里没有残留的错误参数（Google / Microsoft 都一样）", () => {
  for (const provider of ["google", "azure", "github"]) {
    assert.equal(mod.oauthOptions(provider, STUCK).redirectTo, "https://miaocut.app/account/");
  }
});

test("页面加载：现场那种地址 → 错误参数清掉，只留最后一次登录的令牌片段（刷新就能登录成功）", async () => {
  const page = await loadPageAt(STUCK);
  assert.equal(currentHref, "https://miaocut.app/account/#access_token=T2&expires_at=2&sb=&token_type=bearer");
  const parsed = parseCallback(currentHref);
  assert.equal(parsed.access_token, "T2");
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.error_description, undefined);
  assert.deepEqual(page.default.authError(), {
    code: "access_denied",
    description: "AADSTS65004: User declined to consent to access the app.", // 双重编码的 %253A 也还原成了 ":"
  });
  assert.equal(page.default.authErrorKind(), "declined");
});

test("页面加载：只有错误、没有令牌 → 错误参数连同 # 片段一起清掉；别的查询参数保留", async () => {
  const page = await loadPageAt("https://miaocut.app/invite/?ref=ABCD2345&error=server_error&error_description=Something+broke#error=server_error&sb=");
  assert.equal(currentHref, "https://miaocut.app/invite/?ref=ABCD2345");
  assert.equal(page.default.authError().description, "Something broke");
  assert.equal(page.default.authErrorKind(), "other");
});

test("页面加载：error_code 优先作为错误代码", async () => {
  const page = await loadPageAt("https://miaocut.app/account/?error=server_error&error_code=unexpected_failure&error_description=x");
  assert.equal(page.default.authError().code, "unexpected_failure");
});

test("页面加载：没有错误参数就什么都不动（包括正在处理的登录回跳）", async () => {
  for (const href of ["https://miaocut.app/account/", "https://miaocut.app/account/?lang=zh", "https://miaocut.app/account/#access_token=T&expires_at=1"]) {
    const page = await loadPageAt(href);
    assert.equal(currentHref, href);
    assert.equal(page.default.authError(), null);
    assert.equal(page.default.authErrorKind(), null);
    assert.equal(replaced.length, 0);
  }
});

test("isConsentDeclined：没同意 / 管理员没批准算 declined，别的故障不算", () => {
  assert.equal(mod.isConsentDeclined({ code: "access_denied", description: "" }), true);
  assert.equal(mod.isConsentDeclined({ code: "x", description: "AADSTS90094: admin consent required" }), true);
  assert.equal(mod.isConsentDeclined({ code: "x", description: "AADSTS650056: Misconfigured application" }), true);
  assert.equal(mod.isConsentDeclined({ code: "server_error", description: "Something broke" }), false);
  assert.equal(mod.isConsentDeclined(null), false);
});

test("登录卡：上次登录失败时显示提示（declined 和其他故障用不同文案），没失败就不显示", async () => {
  const ui = await import("../account/account-ui.js");
  const run = (kind) => {
    const els = new Map();
    const el = (sel) => {
      if (!els.has(sel)) els.set(sel, { textContent: "", addEventListener() {}, querySelector: () => ({ value: "", checkValidity: () => true }) });
      return els.get(sel);
    };
    const root = { querySelector: el };
    ui.mountLogin(root, { authErrorKind: () => kind, mountProviderButtons() {}, signInWithGoogle: async () => {}, signInWithEmail: async () => ({}) }, { t: (k) => k });
    return el("[data-login-msg]").textContent;
  };
  assert.equal(run("declined"), "loginDeclined");
  assert.equal(run("other"), "loginIncomplete");
  assert.equal(run(null), "");
});
