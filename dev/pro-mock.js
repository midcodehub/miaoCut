// =============================================================================
// 本地预览用的假 Pro 网关（只在 localhost 的模拟模式下被 pro-account.js 动态加载，线上不会用到）
// -----------------------------------------------------------------------------
// 用法：本地起静态服务后打开 http://127.0.0.1:<端口>/account/?mock
//   ?mock          有一段时间使用记录的会员（有订阅、有赠送积分快到期、有多页流水）
//   ?mock=empty    刚注册的新用户（只有注册赠送，没签到过）
//   ?mock=soon     签到还没开放（会员中心显示“即将上线”）
//   ?mock=unverified  邮箱未验证（签到按钮不可点）
// 点页面上的“退出登录”即退出模拟模式。
//
// 接口形状和规则与私有仓库 pro-gateway 保持一致（/auth/me、/credits/balance、/credits/summary、
// /credits/ledger 的分页与筛选、参数校验、/member/checkins、/member/checkin），这样本地看到的就是线上会看到的。
// 签到的状态是存在内存里的：签到后刷新页面会回到初始数据。
// 这里没有任何密钥，数据全部是现场生成的假数据。
// =============================================================================

const DAY = 86400e3;
const BONUS_VALID_DAYS = 365; // 与数据库一致：赠送积分每笔 1 年有效
const CHECKIN_RULE = { base: 10, max: 20 }; // 与数据库 checkin_reward 一致：第 1 天 10，每天 +1，最多 20
const reward = (n) => Math.min(CHECKIN_RULE.base + Math.max(n, 1) - 1, CHECKIN_RULE.max);
// 签到日按 UTC 0 点换日（网关默认 CHECKIN_TZ_OFFSET_MIN = 0）
const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/** 示例签到记录：一段段连续签到，最后一段一直连到昨天（今天还没签） */
function sampleCheckins(now) {
  const rows = [];
  // [从几天前开始, 连续几天]
  for (const [from, len] of [[40, 8], [20, 7], [10, 3], [5, 5]]) {
    for (let i = 0; i < len; i++) {
      const streak = i + 1;
      rows.push({ day: utcDay(now - (from - i) * DAY), streak, credits: reward(streak) });
    }
  }
  return rows;
}

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
    events.push([at(2), "referral_reward", 50, "bonus", null]);
    events.push([at(1, 15), "freeze", -8, "subscription", "job_y"]);
    events.push([at(1, 15) + 90e3, "release", 1, "subscription", "img_y_0"]);
    events.push([at(0, 11), "freeze", -24, "subscription", "job_today"]); // 还在处理中：冻结 24
  }

  // 签到：每一天一条流水（签到日上午 9 点）
  const checkins = scenario === "empty" ? [] : sampleCheckins(now);
  for (const c of checkins) events.push([Date.parse(c.day + "T09:00:00Z"), "checkin", c.credits, "bonus", "checkin:" + c.day]);

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
    checkins,
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

/** 和数据库 checkin_status 同样的算法（网关再加上 enabled / email_verified / next_reset_at 等） */
function checkinStatus(d, month, scenario) {
  const now = Date.now();
  const today = utcDay(now);
  const byDay = new Map(d.checkins.map((c) => [c.day, c]));
  const t = byDay.get(today);
  const y = byDay.get(utcDay(now - DAY));
  const streak = t ? t.streak : y ? y.streak : 0;
  const inMonth = d.checkins.filter((c) => c.day.startsWith(month)).sort((a, b) => (a.day < b.day ? -1 : 1));
  const todayMonth = today.slice(0, 7);
  const next = new Date(now);
  return {
    enabled: true,
    email_verified: scenario !== "unverified",
    tz_offset_min: 0,
    next_reset_at: new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate() + 1)).toISOString(),
    today,
    checked_today: !!t,
    today_credits: t ? t.credits : null,
    streak,
    next_credits: reward(streak + 1),
    month,
    days: inMonth,
    month_days: inMonth.length,
    month_credits: inMonth.reduce((s, c) => s + c.credits, 0),
    month_best_streak: inMonth.reduce((m, c) => Math.max(m, c.streak), 0),
    best_streak: d.checkins.reduce((m, c) => Math.max(m, c.streak), 0),
    total_days: d.checkins.length,
    total_credits: d.checkins.reduce((s, c) => s + c.credits, 0),
    rule: CHECKIN_RULE,
    monthly_cap: 0,
    cap_used: d.checkins.filter((c) => c.day.startsWith(todayMonth)).reduce((s, c) => s + c.credits, 0),
  };
}

/** 签到：今天写一行、记一条流水、加赠送积分（和数据库 checkin 一样，重复签返回 already） */
function doCheckin(d) {
  const now = Date.now();
  const today = utcDay(now);
  const done = d.checkins.find((c) => c.day === today);
  if (done) return { status: "already", day: today, streak: done.streak, credits: done.credits, reward: done.credits, capped: false, tomorrow_credits: reward(done.streak + 1) };
  const y = d.checkins.find((c) => c.day === utcDay(now - DAY));
  const streak = (y ? y.streak : 0) + 1;
  const credits = reward(streak);
  d.checkins.push({ day: today, streak, credits });
  const last = d.rows.reduce((a, b) => (b.id > a.id ? b : a));
  d.rows.push({ id: last.id + 1, delta: credits, bucket: "bonus", reason: "checkin", ref: "checkin:" + today, balance_after: last.balance_after + credits, created_at: new Date(now).toISOString() });
  d.credits.bonus += credits;
  d.credits.total += credits;
  d.summary.bonus += credits;
  d.summary.total += credits;
  return { status: "ok", day: today, streak, credits, reward: credits, capped: false, tomorrow_credits: reward(streak + 1) };
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
    case "/member/checkins": {
      if (scenario === "soon") return json({ enabled: false });
      const month = url.searchParams.get("month") || utcDay(Date.now()).slice(0, 7);
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return json({ error: "invalid_month" }, 400);
      return json(checkinStatus(d, month, scenario));
    }
    case "/member/checkin": {
      if ((opts.method || "GET").toUpperCase() !== "POST") return json({ error: "not_found" }, 404);
      if (scenario === "soon") return json({ error: "checkin_disabled" }, 403);
      if (scenario === "unverified") return json({ error: "email_not_verified" }, 403);
      return json({ ...doCheckin(d), next_reset_at: checkinStatus(d, utcDay(Date.now()).slice(0, 7), scenario).next_reset_at });
    }
    case "/plans": return json({ subscriptions_enabled: true, plans: [] });
    case "/v1/batches": return json({ batches: [] });
    case "/billing/portal": return json({ error: "mock" }, 400);
    default: return json({ error: "not_found_in_mock", path: url.pathname }, 404);
  }
}
