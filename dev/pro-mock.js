// =============================================================================
// 本地预览用的假 Pro 网关（只在 localhost 的模拟模式下被 pro-account.js 动态加载，线上不会用到）
// -----------------------------------------------------------------------------
// 用法：本地起静态服务后打开 http://127.0.0.1:<端口>/account/?mock
//   ?mock          有一段时间使用记录的会员（有订阅、有赠送积分快到期、有多页流水）
//   ?mock=empty    刚注册的新用户（只有注册赠送，没签到过）
//   ?mock=soon     签到、邀请、开发者 API 都还没开放（会员中心显示“即将上线”）
//   ?mock=unverified  邮箱未验证（签到按钮不可点、邀请页和开发者页提示先验证）
// 点页面上的“退出登录”即退出模拟模式。
//
// 接口形状和规则与私有仓库 pro-gateway 保持一致（/auth/me、/credits/balance、/credits/summary、
// /credits/ledger 的分页与筛选、参数校验、/member/checkins、/member/checkin、/member/referral*、/member/api-keys*），这样本地看到的就是线上会看到的。
// 签到的状态是存在内存里的：签到后刷新页面会回到初始数据。
// 这里没有任何密钥，数据全部是现场生成的假数据。
// =============================================================================

const DAY = 86400e3;
// 每个来源的赠送积分每笔有效多少天，与数据库 / 网关一致：注册 1 年、签到 30 天、邀请 90 天
// （promo 只是演示用的一个短期活动，真实环境里活动积分的有效期由活动自己定）
const VALID_DAYS = { signup_bonus: 365, checkin: 30, referral_reward: 90, promo: 3 };
const CHECKIN_RULE = { base: 10, max: 20 }; // 与数据库 checkin_reward 一致：第 1 天 10，每天 +1，最多 20
const reward = (n) => Math.min(CHECKIN_RULE.base + Math.max(n, 1) - 1, CHECKIN_RULE.max);
// 签到日按 UTC 0 点换日（网关默认 CHECKIN_TZ_OFFSET_MIN = 0）
const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/** 示例签到记录：一段段连续签到，最后一段一直连到昨天（今天还没签） */
function sampleCheckins(now) {
  const rows = [];
  // [从几天前开始, 连续几天]
  for (const [from, len] of [[34, 8], [20, 7], [10, 3], [5, 5]]) {
    for (let i = 0; i < len; i++) {
      const streak = i + 1;
      rows.push({ day: utcDay(now - (from - i) * DAY), streak, credits: reward(streak) });
    }
  }
  return rows;
}

const REFERRAL_REWARD = 50;
const REFERRAL_VALID_DAYS = 90;
const REFERRAL_MONTHLY_CAP = 20;
const MOCK_REF_CODE = "K7QM2XPD";

/** 示例邀请记录（新的在前）：大部分到账，夹着一条本月已到上限、一条朋友没拿到注册赠送、一条人工撤回 */
// ----- 开发者 API Key（与网关 /member/api-keys* 一致；上限、限流数字也和 wrangler.toml 的默认值一致）-----
const API_LIMITS = { max_keys: 5, rate_per_min: 60, max_active_jobs: 5 };
let apiSeq = 0;
function sampleApiKeys(now) {
  return [
    { id: "00000000-0000-0000-0000-000000000002", name: "Shop backend", prefix: "mc_live_Zk3p", created_at: new Date(now - 12 * DAY).toISOString(),
      last_used_at: new Date(now - 3600e3).toISOString(), month_jobs: 14, month_images: 612 },
    { id: "00000000-0000-0000-0000-000000000001", name: "Test script", prefix: "mc_live_a9Qd", created_at: new Date(now - 40 * DAY).toISOString(),
      last_used_at: null, month_jobs: 0, month_images: 0 },
  ];
}
/** 假的完整 Key：mc_live_ + 32 位字母数字（格式与网关一致，但只是随机字符，不是真 Key） */
function fakeApiKey() {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let k = "mc_live_";
  for (let i = 0; i < 32; i++) k += chars[Math.floor(Math.random() * chars.length)];
  return k;
}

function sampleReferrals(now) {
  const names = ["mia", "leo", "zoe", "ken", "ada", "sam", "ivy", "tom", "amy", "bob", "eva", "dan"];
  const statuses = ["rewarded", "rewarded", "capped", "rewarded", "rejected", "rewarded", "rewarded", "revoked"];
  const rows = [];
  for (let i = 0; i < 23; i++) {
    const status = statuses[i % statuses.length];
    rows.push({
      id: 23 - i, // 新的 id 大
      email: `${names[i % names.length][0]}***@${i % 3 === 0 ? "gmail.com" : i % 3 === 1 ? "outlook.com" : "qq.com"}`,
      status,
      credits: status === "rewarded" ? REFERRAL_REWARD : null,
      created_at: new Date(now - (i * 2.6 + 0.3) * DAY).toISOString(),
    });
  }
  return rows;
}

/** 和数据库 referral_summary 同样的统计 */
function referralSummary(rows, now) {
  const month = utcDay(now).slice(0, 7);
  const rewarded = rows.filter((r) => r.status === "rewarded");
  const used = rewarded.filter((r) => r.created_at.slice(0, 7) === month).length;
  return {
    code: MOCK_REF_CODE,
    invited: rows.length,
    rewarded: rewarded.length,
    credits_earned: rewarded.reduce((sum, r) => sum + r.credits, 0),
    rewarded_this_month: used,
    monthly_cap: REFERRAL_MONTHLY_CAP,
    remaining_this_month: Math.max(REFERRAL_MONTHLY_CAP - used, 0),
  };
}

function build(scenario) {
  const now = Date.now();
  const events = []; // [时间, reason, delta, bucket, ref, 到期时间（只有赠送积分到账才有）]
  const at = (daysAgo, hour = 10) => now - daysAgo * DAY + (hour - 12) * 3600e3;

  // 赠送积分：每一笔是一个“批次”，有自己的到期时间（来源不同有效期不同）。记下来用于算余额、到期提醒和过期流水
  const lots = [];
  const grant = (t, source, amount, ref) => {
    const expires = t + VALID_DAYS[source] * DAY;
    events.push([t, source, amount, "bonus", ref, expires]);
    lots.push({ source, amount, expires });
  };

  grant(scenario === "empty" ? at(0, 8) : at(240), "signup_bonus", 100, null);
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
    grant(at(36), "promo", 20, "PROMO-DEMO");
    events.push([at(12), "subscription_grant", 300, "subscription", "in_demo_3"]);
    grant(at(2), "referral_reward", 50, null);
    events.push([at(1, 15), "freeze", -8, "subscription", "job_y"]);
    events.push([at(1, 15) + 90e3, "release", 1, "subscription", "img_y_0"]);
    events.push([at(0, 11), "freeze", -24, "subscription", "job_today"]); // 还在处理中：冻结 24
  }

  // 签到：每一天一条流水（签到日上午 9 点），每笔 30 天有效
  const checkins = scenario === "empty" ? [] : sampleCheckins(now);
  for (const c of checkins) grant(Date.parse(c.day + "T09:00:00Z"), "checkin", c.credits, "checkin:" + c.day);

  // 过期：真实系统没有定时任务，过期是在用户下一次访问时“顺便”清理的，同一次清理的多笔过期流水时间戳相同。
  // 这里假设用户上次访问是 5 天前、昨天，以及现在（打开页面）：过期的批次记在它之后的第一次访问上。
  // 很久以前就过期的（比如那个 3 天有效的活动积分）按它自己的到期时间记。
  const visits = [at(5, 10), at(1, 10), now];
  const expired = lots.filter((l) => l.expires <= now);
  for (const l of expired) {
    const t = l.expires < at(6) ? l.expires : visits.find((v) => v >= l.expires);
    events.push([t, "bonus_expired", -l.amount, "bonus", "lot:mock;expires:" + utcDay(l.expires)]);
  }
  const live = lots.filter((l) => l.expires > now);

  events.sort((a, b) => a[0] - b[0]);
  let balance = 0;
  const rows = events.map(([t, reason, delta, bucket, ref, expires], i) => {
    balance += delta;
    return {
      id: i + 1, delta, bucket, reason, ref, balance_after: balance, created_at: new Date(t).toISOString(),
      expires_at: expires ? new Date(expires).toISOString() : null, // 赠送积分到账：这一笔的到期时间（网关从 credit_lots 带出）
    };
  });

  // 当前各桶：赠送积分 = 还没过期的批次之和（假设都没花）；总数和最后一条流水的余额对得上
  const total = balance;
  const bonus = live.reduce((sum, l) => sum + l.amount, 0);
  const credits = scenario === "empty"
    ? { subscription: 0, bonus, topup: 0, frozen: 0, total }
    : { subscription: 214, bonus, topup: total - 214 - bonus, frozen: 24, total };
  // 30 天内到期的批次，按到期日（UTC）分组、日期升序（和数据库 credit_summary 的 expiring_30d 一样）
  const byDate = new Map();
  for (const l of live.filter((x) => x.expires <= now + 30 * DAY)) {
    byDate.set(utcDay(l.expires), (byDate.get(utcDay(l.expires)) || 0) + l.amount);
  }
  const expiring = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, c]) => ({ date, credits: c }));
  return {
    rows,
    checkins,
    referrals: scenario === "empty" ? [] : sampleReferrals(now),
    apiKeys: scenario === "empty" ? [] : sampleApiKeys(now),
    credits,
    summary: {
      ...credits,
      expiring_30d: expiring,
      next_bonus_expiry: live.length ? new Date(Math.min(...live.map((l) => l.expires))).toISOString() : null,
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
    valid_days: VALID_DAYS.checkin, // 每笔签到积分从领取起几天有效（网关的 CHECKIN_VALID_DAYS）
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
  const expires = now + VALID_DAYS.checkin * DAY;
  d.rows.push({ id: last.id + 1, delta: credits, bucket: "bonus", reason: "checkin", ref: "checkin:" + today, balance_after: last.balance_after + credits, created_at: new Date(now).toISOString(), expires_at: new Date(expires).toISOString() });
  d.credits.bonus += credits;
  d.credits.total += credits;
  d.summary.bonus += credits;
  d.summary.total += credits;
  // 这一笔 30 天后到期：加进“30 天内到期”的分组（同一天到期的合并）
  const date = utcDay(expires);
  const hit = d.summary.expiring_30d.find((x) => x.date === date);
  if (hit) hit.credits += credits;
  else d.summary.expiring_30d.push({ date, credits });
  d.summary.expiring_30d.sort((a, b) => (a.date < b.date ? -1 : 1));
  return { status: "ok", day: today, streak, credits, reward: credits, capped: false, tomorrow_credits: reward(streak + 1), valid_days: VALID_DAYS.checkin };
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
  // 吊销：POST /member/api-keys/<id>/revoke（路径里带 id，不能放进下面按路径精确匹配的 switch）
  const mRevoke = url.pathname.match(/^\/member\/api-keys\/([0-9a-fA-F-]{36})\/revoke$/);
  if (mRevoke) {
    if ((opts.method || "GET").toUpperCase() !== "POST") return json({ error: "not_found" }, 404);
    if (scenario === "soon") return json({ error: "api_keys_disabled" }, 403);
    const i = d.apiKeys.findIndex((k) => k.id === mRevoke[1]);
    if (i < 0) return json({ error: "not_found" }, 404);
    d.apiKeys.splice(i, 1);
    return json({ status: "revoked" });
  }
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
    case "/member/referral": {
      if (scenario === "soon") return json({ enabled: false });
      if (scenario === "unverified") return json({ enabled: true, eligible: false });
      return json({
        enabled: true,
        eligible: true,
        link: `${location.origin}/invite/?ref=${MOCK_REF_CODE}`,
        reward: REFERRAL_REWARD,
        valid_days: REFERRAL_VALID_DAYS,
        ...referralSummary(d.referrals, Date.now()),
      });
    }
    case "/member/referral/list": {
      if (scenario === "soon") return json({ enabled: false, items: [], next_cursor: null });
      const cursor = url.searchParams.get("cursor");
      if (cursor && !/^\d{1,18}$/.test(cursor)) return json({ error: "invalid_cursor" }, 400);
      const rawLimit = url.searchParams.get("limit");
      const limit = rawLimit === null || rawLimit === "" ? 20 : Math.min(Math.max(Math.floor(Number(rawLimit)) || 20, 1), 50);
      const items = d.referrals.filter((r) => !cursor || r.id < Number(cursor)).slice(0, limit);
      return json({ enabled: true, eligible: scenario !== "unverified", items, next_cursor: items.length === limit ? items[items.length - 1].id : null });
    }
    case "/member/referral/bind": {
      if ((opts.method || "GET").toUpperCase() !== "POST") return json({ error: "not_found" }, 404);
      return json({ status: "done" });
    }
    case "/member/api-keys": {
      const method = (opts.method || "GET").toUpperCase();
      if (method === "GET") {
        if (scenario === "soon") return json({ enabled: false });
        if (scenario === "unverified") return json({ enabled: true, eligible: false });
        return json({ enabled: true, eligible: true, keys: d.apiKeys, ...API_LIMITS });
      }
      if (method !== "POST") return json({ error: "not_found" }, 404);
      if (scenario === "soon") return json({ error: "api_keys_disabled" }, 403);
      if (scenario === "unverified") return json({ error: "email_not_verified" }, 403);
      let name = "";
      try { name = String(JSON.parse(opts.body || "{}").name ?? "").trim(); } catch (_) { /* 当作空名称 */ }
      if (name.length < 1 || name.length > 60) return json({ error: "invalid_name" }, 400);
      if (d.apiKeys.length >= API_LIMITS.max_keys) return json({ error: "too_many_keys", max: API_LIMITS.max_keys }, 409);
      const key = fakeApiKey();
      const row = { id: `00000000-0000-0000-0000-${String(100 + ++apiSeq).padStart(12, "0")}`, name, prefix: key.slice(0, 12),
        created_at: new Date().toISOString(), last_used_at: null, month_jobs: 0, month_images: 0 };
      d.apiKeys.unshift(row);
      return json({ key, id: row.id, name: row.name, prefix: row.prefix, created_at: row.created_at });
    }
    case "/plans": return json({ subscriptions_enabled: true, plans: [] });
    case "/v1/batches": return json({ batches: [] });
    case "/billing/portal": return json({ error: "mock" }, 400);
    default: return json({ error: "not_found_in_mock", path: url.pathname }, 404);
  }
}
