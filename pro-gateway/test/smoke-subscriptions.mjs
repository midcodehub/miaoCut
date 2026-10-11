// =============================================================================
// pro-api Worker 订阅冒烟测试(无需真 Supabase / Stripe)
// 覆盖:/plans、订阅结账、客户门户、invoice.paid 发积分(新旧 API 格式 / 幂等)、
//       升级补差额 / 降级不补、订阅结束(含过期事件)、按档位的批量上限与保留天数、/auth/me 权益
// 运行:node pro-gateway/test/smoke-subscriptions.mjs
// =============================================================================
import { createHmac } from "node:crypto";
import worker, { planLimits, planByPriceId } from "../src/index.js";

const PRICES = { STRIPE_PRICE_SUB_BASIC: "price_basic", STRIPE_PRICE_SUB_PRO: "price_pro", STRIPE_PRICE_SUB_BUSINESS: "price_biz" };
const baseEnv = {
  SUPABASE_URL: "https://mock.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  SUPABASE_JWT_SECRET: "test-jwt-secret-please-change",
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  CORS_ALLOW_ORIGIN: "*",
  R2_ENDPOINT: "https://acct.r2.cloudflarestorage.com",
  R2_BUCKET: "miaocut-batch",
  R2_ACCESS_KEY_ID: "ak",
  R2_SECRET_ACCESS_KEY: "sk",
};
const env = { ...baseEnv, ...PRICES };

// ----- 可变的模拟状态 -----
const accounts = {}; // authUserId → account json(get_account 的返回)
const orders = new Set(); // provider_ref 唯一
const subsTable = {}; // user_id → stripe_subscription_id
const stripeSubs = {}; // Stripe 上的订阅对象(GET /subscriptions/:id 返回)
const calls = [];
const last = (name) => calls.filter((c) => c.name === name).at(-1);
const count = (name) => calls.filter((c) => c.name === name).length;

function jsonResp(v, status = 200) {
  return new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json" } });
}
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const method = init.method || "GET";
  if (url.startsWith(env.SUPABASE_URL)) {
    const body = init.body ? JSON.parse(init.body) : {};
    const m = url.match(/\/rpc\/([a-z_]+)/);
    if (m) {
      calls.push({ name: m[1], body });
      if (m[1] === "get_account") return jsonResp(accounts[body.p_auth_user_id] || null);
      if (m[1] === "create_batch_job") {
        return jsonResp({ job_id: "11111111-1111-1111-1111-111111111111", images: body.p_files.map((f, i) => ({ image_id: `img${i}`, orig_filename: f.name, input_key: `k${i}` })) });
      }
      if (m[1] === "renew_subscription_credits") return jsonResp({ granted: body.p_monthly });
      return jsonResp(null);
    }
    if (url.includes("/rest/v1/orders") && method === "POST") {
      calls.push({ name: "orders.insert", body });
      if (orders.has(body.provider_ref)) return new Response('{"code":"23505"}', { status: 409 });
      orders.add(body.provider_ref);
      return new Response(null, { status: 201 });
    }
    if (url.includes("/rest/v1/subscriptions")) {
      const uid = decodeURIComponent(url.match(/user_id=eq\.([^&]+)/)[1]);
      return jsonResp(subsTable[uid] ? [{ stripe_subscription_id: subsTable[uid] }] : []);
    }
    if (url.includes("/rest/v1/users")) {
      const cus = decodeURIComponent(url.match(/stripe_customer_id=eq\.([^&]+)/)[1]);
      return jsonResp(cus === "cus_known" ? [{ id: "u-by-customer" }] : []);
    }
    return jsonResp(null);
  }
  if (url.startsWith("https://api.stripe.com/v1")) {
    const path = url.slice("https://api.stripe.com/v1".length);
    if (method === "GET" && path.startsWith("/subscriptions/")) {
      const id = decodeURIComponent(path.split("/")[2]);
      return stripeSubs[id] ? jsonResp(stripeSubs[id]) : jsonResp({ error: {} }, 404);
    }
    const params = Object.fromEntries(new URLSearchParams(init.body || ""));
    calls.push({ name: `stripe${path}`, body: params });
    if (path === "/checkout/sessions") return jsonResp({ id: "cs_sub", url: "https://checkout.stripe.com/x" });
    if (path === "/billing_portal/sessions") return jsonResp({ url: "https://billing.stripe.com/p" });
  }
  throw new Error("unexpected fetch: " + url);
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
const tokenFor = (sub) => mintJWT({ sub, email: `${sub}@example.com`, email_confirmed_at: "2024-01-01T00:00:00Z", exp: now + 3600 });
async function call(path, { method = "GET", token, body, headers = {}, e = env } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  if (body && typeof body !== "string") { body = JSON.stringify(body); h["content-type"] = "application/json"; }
  return worker.fetch(new Request(`https://pro-api.miaocut.app${path}`, { method, headers: h, body }), e, { waitUntil() {} });
}
function webhook(event) {
  const payload = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", env.STRIPE_WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
  return call("/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": `t=${t},v1=${v1}` } });
}
const account = (id, extra = {}) => ({
  user_id: `u-${id}`, email: `${id}@example.com`, plan: "free", stripe_customer_id: null,
  subscription_credits: 0, topup_credits: 100, daily_used: 0, subscription: null, ...extra,
});
const subObj = (id, price, extra = {}) => ({
  id, status: "active", customer: "cus_1", cancel_at_period_end: false, current_period_end: now + 30 * 86400,
  metadata: { user_id: "u-alice" }, items: { data: [{ price: { id: price } }] }, ...extra,
});

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log("  PASS  " + name);
  else { failures++; console.log("  FAIL  " + name + (detail ? "  → " + detail : "")); }
}

async function main() {
  console.log("pro-api Worker 订阅冒烟测试\n");

  // ---------- 纯函数 ----------
  check("planLimits:free 200 张 / 1 天;pro 500 张 / 7 天", planLimits("free").batchMax === 200 && planLimits("free").retentionDays === 1
    && planLimits("pro").batchMax === 500 && planLimits("pro").retentionDays === 7 && planLimits("basic").batchMax === 200);
  check("planByPriceId 只认 env 里配置的价格", planByPriceId(env, "price_pro") === "pro" && planByPriceId(env, "price_x") === null && planByPriceId(baseEnv, "price_pro") === null);

  // ---------- /plans ----------
  let r = await call("/plans", { e: baseEnv });
  let j = await r.json();
  check("/plans:没配置订阅价格 → subscriptions_enabled=false", j.subscriptions_enabled === false && j.plans.length === 0);
  j = await (await call("/plans")).json();
  check("/plans:三档都配置 → enabled + 3 档", j.subscriptions_enabled === true && j.plans.map((p) => p.id).join() === "basic,pro,business", JSON.stringify(j));

  // ---------- 订阅结账 ----------
  accounts.alice = account("alice");
  r = await call("/checkout", { method: "POST", token: tokenFor("alice"), body: { plan: "pro" } });
  j = await r.json();
  const sess = last("stripe/checkout/sessions")?.body || {};
  check("订阅结账 → 200 + Stripe URL", r.status === 200 && j.url, JSON.stringify(j));
  check("mode=subscription、价格 = pro、只用银行卡", sess.mode === "subscription" && sess["line_items[0][price]"] === "price_pro" && sess["payment_method_types[0]"] === "card" && !sess["payment_method_types[1]"], JSON.stringify(sess));
  check("订阅对象带 user_id(续费事件能找到用户)", sess["subscription_data[metadata][user_id]"] === "u-alice" && sess.customer_email === "alice@example.com");

  accounts.bob = account("bob", { stripe_customer_id: "cus_bob" });
  await call("/checkout", { method: "POST", token: tokenFor("bob"), body: { plan: "basic" } });
  const sessBob = last("stripe/checkout/sessions").body;
  check("老客户复用 Stripe customer + 允许更新地址(自动计税)", sessBob.customer === "cus_bob" && sessBob["customer_update[address]"] === "auto" && !sessBob.customer_email);

  accounts.carol = account("carol", { plan: "pro", subscription: { plan: "pro", status: "active" } });
  r = await call("/checkout", { method: "POST", token: tokenFor("carol"), body: { plan: "business" } });
  check("已有有效订阅 → 409 already_subscribed(改档走客户门户)", r.status === 409 && (await r.json()).error === "already_subscribed");
  r = await call("/checkout", { method: "POST", token: tokenFor("alice"), body: { plan: "gold" } });
  check("未知档位 → 400", r.status === 400);
  r = await call("/checkout", { method: "POST", token: tokenFor("alice"), body: { plan: "pro" }, e: baseEnv });
  check("价格没配置 → 500 price_not_configured", r.status === 500);

  // ---------- 客户门户 ----------
  r = await call("/billing/portal", { method: "POST", token: tokenFor("alice") });
  check("没有 Stripe 客户 → 400 no_customer", r.status === 400);
  r = await call("/billing/portal", { method: "POST", token: tokenFor("bob") });
  check("有 Stripe 客户 → 门户 URL", r.status === 200 && (await r.json()).url && last("stripe/billing_portal/sessions").body.customer === "cus_bob");

  // ---------- webhook:结账完成记下客户 id ----------
  await webhook({ id: "evt_cs", type: "checkout.session.completed", data: { object: { mode: "subscription", customer: "cus_1", metadata: { user_id: "u-alice" } } } });
  check("订阅结账完成 → set_stripe_customer,不直接发积分", last("set_stripe_customer")?.body.p_customer === "cus_1" && count("grant_topup") === 0);

  // ---------- invoice.paid(旧 API 格式) ----------
  stripeSubs.sub_1 = subObj("sub_1", "price_pro");
  const inv1 = { id: "in_1", subscription: "sub_1", customer: "cus_1", billing_reason: "subscription_create", amount_paid: 1999, currency: "usd", payment_intent: "pi_1", lines: { data: [{ price: { id: "price_pro" } }] } };
  r = await webhook({ id: "evt_in1", type: "invoice.paid", data: { object: inv1 } });
  const ord = last("orders.insert").body;
  check("首期发票 → 订单 kind=subscription、bucket=subscription、1500 积分、带 payment_intent", r.status === 200 && ord.kind === "subscription" && ord.bucket === "subscription" && ord.credits === 1500 && ord.payment_intent === "pi_1", JSON.stringify(ord));
  check("→ renew_subscription_credits(u-alice, 1500)", last("renew_subscription_credits")?.body.p_monthly === 1500 && last("renew_subscription_credits").body.p_user === "u-alice");
  const up = last("upsert_subscription").body;
  check("→ 同步订阅状态(pro / active / 到期时间)", up.p_plan === "pro" && up.p_status === "active" && up.p_monthly === 1500 && up.p_period_end, JSON.stringify(up));

  const renewBefore = count("renew_subscription_credits");
  await webhook({ id: "evt_in1_dup", type: "invoice.paid", data: { object: inv1 } });
  check("同一张发票重复投递 → 不重复发积分", count("renew_subscription_credits") === renewBefore);

  await webhook({ id: "evt_in_up", type: "invoice.paid", data: { object: { ...inv1, id: "in_up", billing_reason: "subscription_update" } } });
  check("升级差价发票(subscription_update)→ 忽略(差额在 subscription.updated 补)", count("renew_subscription_credits") === renewBefore);

  // ---------- invoice.paid(2025 新 API 格式) ----------
  stripeSubs.sub_2 = subObj("sub_2", "price_biz", { current_period_end: undefined, metadata: {}, customer: "cus_known", items: { data: [{ price: { id: "price_biz" }, current_period_end: now + 86400 * 30 }] } });
  const inv2 = { id: "in_2", customer: "cus_known", billing_reason: "subscription_cycle", amount_paid: 4999, currency: "usd",
    parent: { subscription_details: { subscription: "sub_2" } }, lines: { data: [{ pricing: { price_details: { price: "price_biz" } } }] } };
  await webhook({ id: "evt_in2", type: "invoice.paid", data: { object: inv2 } });
  check("新版 API 字段位置 + 按 Stripe 客户 id 反查用户 → 续费 5000", last("renew_subscription_credits").body.p_user === "u-by-customer" && last("renew_subscription_credits").body.p_monthly === 5000);
  check("新版 API:到期时间取自订阅项", !!last("upsert_subscription").body.p_period_end);

  // ---------- 升级 / 降级 ----------
  stripeSubs.sub_1 = subObj("sub_1", "price_pro");
  r = await webhook({ id: "evt_upg", type: "customer.subscription.updated", data: { object: stripeSubs.sub_1, previous_attributes: { items: { data: [{ price: { id: "price_basic" } }] } } } });
  check("basic → pro 升级 → 立即补 1200", r.status === 200 && last("grant_subscription_credits")?.body.p_credits === 1200 && last("grant_subscription_credits").body.p_reason === "subscription_upgrade");
  const grants = count("grant_subscription_credits");
  await webhook({ id: "evt_upg", type: "customer.subscription.updated", data: { object: stripeSubs.sub_1, previous_attributes: { items: { data: [{ price: { id: "price_basic" } }] } } } });
  check("同一升级事件重复投递 → 不重复补", count("grant_subscription_credits") === grants);
  stripeSubs.sub_3 = subObj("sub_3", "price_basic");
  await webhook({ id: "evt_down", type: "customer.subscription.updated", data: { object: stripeSubs.sub_3, previous_attributes: { items: { data: [{ price: { id: "price_biz" } }] } } } });
  check("降级 → 不补也不扣(下期按新档位发)", count("grant_subscription_credits") === grants && last("upsert_subscription").body.p_plan === "basic");

  stripeSubs.sub_1 = subObj("sub_1", "price_pro", { cancel_at_period_end: true });
  await webhook({ id: "evt_cancel", type: "customer.subscription.updated", data: { object: { id: "sub_1" }, previous_attributes: { cancel_at_period_end: false } } });
  check("用户点了取消(期末生效)→ 同步 cancel_at_period_end=true(以 Stripe 最新数据为准)", last("upsert_subscription").body.p_cancel === true);

  // ---------- 订阅结束 ----------
  subsTable["u-alice"] = "sub_1";
  await webhook({ id: "evt_del", type: "customer.subscription.deleted", data: { object: { ...stripeSubs.sub_1, status: "canceled" } } });
  check("订阅结束 → end_subscription(作废剩余订阅积分)", last("end_subscription")?.body.p_user === "u-alice");
  const ends = count("end_subscription");
  subsTable["u-alice"] = "sub_new";
  await webhook({ id: "evt_del_old", type: "customer.subscription.deleted", data: { object: { ...stripeSubs.sub_1, status: "canceled" } } });
  check("旧订阅的结束事件(用户已换新订阅)→ 不影响新订阅", count("end_subscription") === ends);

  // ---------- 批量:按档位 ----------
  const files = (n) => Array.from({ length: n }, (_, i) => ({ name: `p${i}.jpg`, size: 1000 }));
  accounts.dave = account("dave", { topup_credits: 10000 });
  r = await call("/v1/batch", { method: "POST", token: tokenFor("dave"), body: { profile: "fast", files: files(300) } });
  j = await r.json();
  check("非订阅用户 300 张 → 400 too_many_images(max 200)", r.status === 400 && j.max === 200, JSON.stringify(j));
  r = await call("/v1/batch", { method: "POST", token: tokenFor("dave"), body: { profile: "fast", files: files(10) } });
  check("非订阅用户 → 保留 1 天", r.status === 200 && last("create_batch_job").body.p_retention_days === 1);

  accounts.erin = account("erin", { plan: "pro", subscription_credits: 1500, subscription: { plan: "pro", status: "active" } });
  r = await call("/v1/batch", { method: "POST", token: tokenFor("erin"), body: { profile: "fast", files: files(300) } });
  check("Pro 订阅 300 张 → 允许,保留 7 天", r.status === 200 && last("create_batch_job").body.p_retention_days === 7, String(r.status));
  r = await call("/v1/batch", { method: "POST", token: tokenFor("erin"), body: { profile: "fast", files: files(501) } });
  check("Pro 订阅 501 张 → 400(max 500)", r.status === 400 && (await r.json()).max === 500);

  // ---------- /auth/me ----------
  j = await (await call("/auth/me", { token: tokenFor("erin") })).json();
  check("/auth/me 带订阅信息与权益", j.subscription?.plan === "pro" && j.limits.batch_max === 500 && j.limits.retention_days === 7 && j.can_manage_billing === false, JSON.stringify(j));
  j = await (await call("/credits/balance", { token: tokenFor("erin") })).json();
  check("/credits/balance 带 plan 与权益", j.plan === "pro" && j.limits.batch_max === 500 && j.total === 1600, JSON.stringify(j));

  console.log(failures ? `\n❌ ${failures} 项失败` : "\n✅ 全部通过");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
