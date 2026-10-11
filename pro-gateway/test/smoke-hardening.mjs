// =============================================================================
// pro-api Worker 上线加固冒烟测试(无需真 Supabase / Stripe / KV)
// -----------------------------------------------------------------------------
// 覆盖 2026-10-11 的加固改动:
//   1. CORS 白名单:回显允许的 Origin + Vary;不在白名单的来源拿不到自己的 Origin
//   2. 注册积分:正常发放 / 一次性邮箱不发 / 同 IP 当天超限不发 / 传入规范化邮箱
//   3. Stripe:支付入账带 payment_intent;退款、争议调用 revoke_order_credits;未知事件忽略
// 运行:node pro-gateway/test/smoke-hardening.mjs
// =============================================================================
import { createHmac } from "node:crypto";
import worker, { normalizeEmail, isDisposableEmail, resolveAllowedOrigin } from "../src/index.js";

// ----- 内存版 KV(模拟 Cloudflare KV 的 get / put) -----
const kvStore = new Map();
const kv = {
  async get(k) { return kvStore.has(k) ? kvStore.get(k) : null; },
  async put(k, v) { kvStore.set(k, v); },
};

const env = {
  SUPABASE_URL: "https://mock.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  SUPABASE_JWT_SECRET: "test-jwt-secret-please-change",
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  CORS_ALLOW_ORIGIN: "https://miaocut.app,https://www.miaocut.app",
  SIGNUP_BONUS: "100",
  SIGNUP_BONUS_PER_IP_DAILY: "2",
  MIAOCUT_STATE: kv,
};

// ----- mock Supabase:新用户 get_account 先返回 null,ensure_user 之后返回账户 -----
const created = new Set();
const calls = { ensure: [], insert: [], revoke: [] };
function jsonResp(v, status = 200) {
  return new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json" } });
}
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const body = init.body ? JSON.parse(init.body) : {};
  if (!url.startsWith(env.SUPABASE_URL)) throw new Error("unexpected fetch: " + url);
  if (url.includes("/rpc/get_account")) {
    if (!created.has(body.p_auth_user_id)) return jsonResp(null);
    return jsonResp({ user_id: "u-" + body.p_auth_user_id, email: "x", plan: "free", subscription_credits: 0, topup_credits: 100, daily_used: 0 });
  }
  if (url.includes("/rpc/ensure_user")) {
    calls.ensure.push(body);
    created.add(body.p_auth_user_id);
    return jsonResp(null);
  }
  if (url.includes("/rpc/revoke_order_credits")) {
    calls.revoke.push(body);
    return jsonResp({ status: "refunded", revoked: 100, shortfall: 0 });
  }
  if (url.includes("/rpc/grant_topup")) return jsonResp(null);
  if (url.includes("/rest/v1/orders")) {
    calls.insert.push(body);
    return new Response(null, { status: 201 });
  }
  return jsonResp(null);
};

// ----- helpers -----
function mintJWT(payload) {
  const b64 = (s) => Buffer.from(s).toString("base64url");
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(JSON.stringify(payload));
  const sig = createHmac("sha256", env.SUPABASE_JWT_SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
const now = Math.floor(Date.now() / 1000);
function tokenFor(sub, email) {
  return mintJWT({ sub, email, email_confirmed_at: "2024-01-01T00:00:00Z", exp: now + 3600 });
}
async function call(path, { method = "GET", token, body, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  return worker.fetch(new Request(`https://pro-api.miaocut.app${path}`, { method, headers: h, body }), env, { waitUntil() {} });
}
function stripeSigned(event) {
  const payload = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", env.STRIPE_WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
  return { body: payload, headers: { "stripe-signature": `t=${t},v1=${v1}`, "content-type": "application/json" } };
}

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log("  PASS  " + name);
  else { failures++; console.log("  FAIL  " + name + (detail ? "  → " + detail : "")); }
}

async function main() {
  console.log("pro-api Worker 上线加固冒烟测试\n");

  // ---------- 纯函数 ----------
  check("Gmail 别名规范化(点、+后缀、googlemail)", normalizeEmail("A.B+promo@GoogleMail.com") === "ab@gmail.com", normalizeEmail("A.B+promo@GoogleMail.com"));
  check("非 Gmail 只去 +后缀、不去点", normalizeEmail("first.last+x@Outlook.com") === "first.last@outlook.com");
  check("非法邮箱 → null", normalizeEmail("not-an-email") === null);
  check("一次性邮箱识别(含子域名)", isDisposableEmail("a@yopmail.com") && isDisposableEmail("a@x.mailinator.com") && !isDisposableEmail("a@gmail.com"));
  check("CORS * 模式", resolveAllowedOrigin("*", "https://x.com") === "*");

  // ---------- 1. CORS ----------
  let r = await call("/auth/me", { headers: { Origin: "https://www.miaocut.app" } });
  check("白名单来源 → 回显该来源", r.headers.get("Access-Control-Allow-Origin") === "https://www.miaocut.app", r.headers.get("Access-Control-Allow-Origin"));
  check("白名单模式带 Vary: Origin", r.headers.get("Vary") === "Origin");
  r = await call("/auth/me", { headers: { Origin: "https://evil.example" } });
  check("非白名单来源 → 不回显", r.headers.get("Access-Control-Allow-Origin") === "https://miaocut.app", r.headers.get("Access-Control-Allow-Origin"));

  // ---------- 2. 注册积分 ----------
  const ipHeaders = { "CF-Connecting-IP": "203.0.113.7" };
  r = await call("/auth/me", { token: tokenFor("user-a", "Alice.Smith+shop@gmail.com"), headers: ipHeaders });
  let e = calls.ensure.at(-1);
  check("正常新用户 → 注册积分 100", r.status === 200 && e?.p_signup_bonus === 100, JSON.stringify(e));
  check("ensure_user 收到规范化邮箱", e?.p_email_normalized === "alicesmith@gmail.com", e?.p_email_normalized);

  await call("/auth/me", { token: tokenFor("user-b", "spam@yopmail.com"), headers: { "CF-Connecting-IP": "198.51.100.1" } });
  check("一次性邮箱 → 注册积分 0", calls.ensure.at(-1)?.p_signup_bonus === 0);

  await call("/auth/me", { token: tokenFor("user-c", "c@example.com"), headers: ipHeaders });
  check("同 IP 第 2 个新账户 → 仍发(上限 2)", calls.ensure.at(-1)?.p_signup_bonus === 100);
  await call("/auth/me", { token: tokenFor("user-d", "d@example.com"), headers: ipHeaders });
  check("同 IP 第 3 个新账户 → 超限不发", calls.ensure.at(-1)?.p_signup_bonus === 0);

  const before = calls.ensure.length;
  await call("/auth/me", { token: tokenFor("user-a", "Alice.Smith+shop@gmail.com"), headers: ipHeaders });
  check("老用户再次登录不再调用 ensure_user", calls.ensure.length === before);

  const unverified = mintJWT({ sub: "user-e", email: "e@example.com", exp: now + 3600 });
  await call("/auth/me", { token: unverified, headers: { "CF-Connecting-IP": "192.0.2.9" } });
  check("未验证邮箱 → 注册积分 0", calls.ensure.at(-1)?.p_signup_bonus === 0);

  // ---------- 3. Stripe ----------
  let s = stripeSigned({
    id: "evt_paid", type: "checkout.session.completed",
    data: { object: { id: "cs_1", payment_status: "paid", payment_intent: "pi_1", amount_total: 499, currency: "usd", metadata: { user_id: "u1", sku: "starter_100" } } },
  });
  r = await call("/webhooks/stripe", { method: "POST", ...s });
  check("支付成功 → 200", r.status === 200, `got ${r.status}`);
  check("订单记录 payment_intent", calls.insert.at(-1)?.payment_intent === "pi_1", JSON.stringify(calls.insert.at(-1)));

  s = stripeSigned({ id: "evt_refund", type: "charge.refunded", data: { object: { payment_intent: "pi_1", amount: 499, amount_refunded: 250 } } });
  r = await call("/webhooks/stripe", { method: "POST", ...s });
  let v = calls.revoke.at(-1);
  check("退款 → 调用 revoke_order_credits", r.status === 200 && v?.p_payment_intent === "pi_1", JSON.stringify(v));
  check("退款参数:reason=refund、金额、事件 id", v?.p_reason === "refund" && v?.p_refunded_amount === 250 && v?.p_total_amount === 499 && v?.p_ref === "evt_refund");

  s = stripeSigned({ id: "evt_dispute", type: "charge.dispute.created", data: { object: { payment_intent: "pi_1", charge: "ch_1" } } });
  await call("/webhooks/stripe", { method: "POST", ...s });
  check("争议 → reason=dispute", calls.revoke.at(-1)?.p_reason === "dispute");

  const n = calls.revoke.length;
  s = stripeSigned({ id: "evt_other", type: "customer.created", data: { object: {} } });
  r = await call("/webhooks/stripe", { method: "POST", ...s });
  check("无关事件 → 200 且不扣回", r.status === 200 && calls.revoke.length === n);

  r = await call("/webhooks/stripe", { method: "POST", body: s.body, headers: { "stripe-signature": "t=1,v1=bad" } });
  check("签名错误 → 400", r.status === 400, `got ${r.status}`);

  console.log(failures ? `\n❌ ${failures} 项失败` : "\n✅ 全部通过");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
