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
def("history", { state: null, replaceState: (_s, _t, url) => replaced.push(url) });
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
