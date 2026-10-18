// =============================================================================
// 本地预览用的假 Pro 网关（只在 localhost 的模拟模式下被 pro-account.js 动态加载，线上不会用到）
// -----------------------------------------------------------------------------
// 用法：本地起静态服务后打开 http://127.0.0.1:<端口>/account/?mock
//   ?mock          有一段时间使用记录的会员（有订阅、有赠送积分快到期、有多页流水）
//   ?mock=empty    刚注册的新用户（只有注册赠送）
// 点页面上的“退出登录”即退出模拟模式。
//
// 接口形状和规则与私有仓库 pro-gateway 保持一致（/auth/me、/credits/balance、/credits/summary、
// /credits/ledger 的分页与筛选、参数校验），这样本地看到的就是线上会看到的。
// 这里没有任何密钥，数据全部是现场生成的假数据。
// =============================================================================

const DAY = 86400e3;
const BONUS_VALID_DAYS = 365; // 与数据库一致：赠送积分每笔 1 年有效

function build(scenario) {
  const now = Date.now();
  const events = []; // [时间, reason, delta, bucket, ref]
  const at = (daysAgo, hour = 10) => now - daysAgo * DAY + (hour - 12) * 3600e3;

  events.push([at(240), "signup_bonus", 100, "bonus", null]);
  if (scenario !== "empty") {
    events.push([at(238), "purchase", 500, "topup", "cs_demo_1"]);
    // 过去半年每个月几批批量处理：预扣 + 少量失败退回
    for (let m = 7; m >= 2; m--) {
      for (const [d, n, failed] of [[m * 30 + 3, 40, 2], [m * 30 - 6, 25, 0], [m * 30 - 14, 60, 4]]) {
        events.push([at(d, 9), "freeze", -n, "mixed", `job_${d}`]);
        for (let i = 0; i < failed; i++) events.push([at(d, 9) + (i + 1) * 60e3, "release", 1, "topup", `img_${d}_${i}`]);
      }
    }
    events.push([at(70), "subscription_grant", 300, "subscription", "in_demo_1"]);
    events.push([at(40), "subscription_grant", 300, "subscription", "in_demo_2"]);
    events.push([at(40) + 1000, "subscription_expired", -45, "subscription", "in_demo_2"]);
    events.push([at(36), "promo", 20, "bonus", "PROMO-DEMO"]);
    events.push([at(33), "bonus_expired", -20, "bonus", "lot:9;expires:" + new Date(at(33)).toISOString().slice(0, 10)]);
    events.push([at(12), "subscription_grant", 300, "subscription", "in_demo_3"]);
    events.push([at(6), "checkin", 10, "bonus", null]);
    events.push([at(5), "checkin", 11, "bonus", null]);
    events.push([at(4), "checkin", 12, "bonus", null]);
    events.push([at(2), "referral_reward", 50, "bonus", null]);
    events.push([at(1, 15), "freeze", -8, "subscription", "job_y"]);
    events.push([at(1, 15) + 90e3, "release", 1, "subscription", "img_y_0"]);
    events.push([at(0, 11), "freeze", -24, "subscription", "job_today"]); // 还在处理中：冻结 24
  }

  events.sort((a, b) => a[0] - b[0]);
  let balance = 0;
  const rows = events.map(([t, reason, delta, bucket, ref], i) => {
    balance += delta;
    return { id: i + 1, delta, bucket, reason, ref, balance_after: balance, created_at: new Date(t).toISOString() };
  });

  // 当前各桶：总数和最后一条流水的余额对得上
  const total = balance;
  const credits = scenario === "empty"
    ? { subscription: 0, bonus: 100, topup: 0, frozen: 0, total: 100 }
    : { subscription: 214, bonus: 83, topup: total - 214 - 83, frozen: 24, total };
  const expiring = scenario === "empty" ? [] : [
    { date: new Date(now + 12 * DAY).toISOString().slice(0, 10), credits: 20 },
    { date: new Date(now + 26 * DAY).toISOString().slice(0, 10), credits: 13 },
  ];
  return {
    rows,
    credits,
    summary: {
      ...credits,
      expiring_30d: expiring,
      next_bonus_expiry: expiring.length ? new Date(now + 12 * DAY).toISOString() : new Date(Date.parse(rows[0].created_at) + BONUS_VALID_DAYS * DAY).toISOString(),
    },
    me: {
      user_id: "demo-user",
      email: scenario === "empty" ? "new.user@example.com" : "demo@example.com",
      plan: scenario === "empty" ? "free" : "basic",
      credits,
      subscription: scenario === "empty" ? null : {
        plan: "basic", status: "active", monthly_credits: 300,
        current_period_end: new Date(now + 18 * DAY).toISOString(), cancel_at_period_end: false,
      },
      can_manage_billing: scenario !== "empty",
      limits: { batch_max: scenario === "empty" ? 50 : 200, retention_days: scenario === "empty" ? 1 : 7 },
      daily_free_quota: 0,
      daily_free_left: 0,
    },
  };
}

const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json" } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 和网关 ledgerQuery 同样的参数规则；返回筛选后的行或 {error} */
function queryLedger(rows, params) {
  const rawLimit = params.get("limit");
  const limit = rawLimit === null || rawLimit === "" ? 50 : Math.min(Math.max(Math.floor(Number(rawLimit)) || 50, 1), 200);
  let out = rows.slice().sort((a, b) => b.id - a.id);
  const cursor = params.get("cursor");
  if (cursor) {
    if (!/^\d{1,18}$/.test(cursor)) return { error: "invalid_cursor" };
    out = out.filter((r) => r.id < Number(cursor));
  }
  const type = params.get("type");
  if (type === "in") out = out.filter((r) => r.delta > 0);
  else if (type === "out") out = out.filter((r) => r.delta < 0);
  else if (type && type !== "all") return { error: "invalid_type" };
  const reason = params.get("reason");
  if (reason) {
    const list = reason.split(",").filter(Boolean);
    if (!list.length || list.length > 10 || !list.every((x) => /^[a-z_]{1,40}$/.test(x))) return { error: "invalid_reason" };
    out = out.filter((r) => list.includes(r.reason));
  }
  const month = params.get("month");
  if (month) {
    const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
    if (!m) return { error: "invalid_month" };
    const start = Date.UTC(+m[1], +m[2] - 1, 1);
    const end = Date.UTC(+m[1], +m[2], 1);
    out = out.filter((r) => { const t = Date.parse(r.created_at); return t >= start && t < end; });
  }
  const page = out.slice(0, limit);
  return { ledger: page, next_cursor: page.length === limit ? page[page.length - 1].id : null };
}

let cache = null;

/** pro-account.js 的 proFetch 在模拟模式下调用：返回一个和网关一样的 Response */
export async function handle(path, opts = {}, scenario = "1") {
  if (!cache || cache.scenario !== scenario) cache = { scenario, data: build(scenario) };
  const d = cache.data;
  await sleep(250 + Math.random() * 250); // 模拟网络延迟，好看清加载状态
  const url = new URL(path, "https://mock.local");
  switch (url.pathname) {
    case "/auth/me": return json(d.me);
    case "/credits/balance": return json({ ...d.credits, plan: d.me.plan, limits: d.me.limits, daily_free_left: 0 });
    case "/credits/summary": return json(d.summary);
    case "/credits/ledger": {
      const r = queryLedger(d.rows, url.searchParams);
      return r.error ? json({ error: r.error }, 400) : json(r);
    }
    case "/plans": return json({ subscriptions_enabled: true, plans: [] });
    case "/v1/batches": return json({ batches: [] });
    case "/billing/portal": return json({ error: "mock" }, 400);
    default: return json({ error: "not_found_in_mock", path: url.pathname }, 404);
  }
}
