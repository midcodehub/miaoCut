// =============================================================================
// 会员页面共用的界面逻辑：会员中心 /account/、积分页 /account/credits/
// -----------------------------------------------------------------------------
// 放在这里的都是“两个页面长得一样的部分”：余额卡（各桶 + 即将过期提醒）、流水的合并与渲染、
// 登录卡的事件绑定、本地模拟模式提示。页面自己的布局和流程仍写在各自的 HTML 里。
// ⚠️ 这里的模板字符串里写了 Tailwind class，所以本文件在 tailwind.config.js 的 content 里，
//    改了 class 要重新 npm run build:css。
// =============================================================================

export const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const fmt = (n) => Number(n || 0).toLocaleString();
export const localeOf = (lang) => (lang === "zh" ? "zh-CN" : "en-US"); // 跟随页面语言，不跟浏览器
const DAY = 86400e3;

// 赠送积分每一笔的有效天数：与数据库 / 网关一致（私有仓库 docs/design-membership.md §3）
export const BONUS_VALID_DAYS = 365;

// 流水“类型”筛选 → 网关的 reason 参数（逗号分隔）
export const LEDGER_FILTERS = {
  all: "",
  batch: "freeze,release,consume",
  purchase: "purchase,subscription_grant,subscription_upgrade",
  bonus: "signup_bonus,checkin,referral_reward,promo,admin",
  expired: "bonus_expired,subscription_expired",
  refund: "refund,dispute",
};

// 新到账的赠送积分类型：显示“有效期至”
const BONUS_GRANTS = new Set(["signup_bonus", "checkin", "referral_reward", "promo", "admin"]);

export function dateText(ms, lang, withTime = false) {
  const opt = withTime
    ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric" };
  return new Date(ms).toLocaleString(localeOf(lang), opt);
}

/**
 * 把流水整理成列表项。
 * merge = true（“全部”视图）：同一批的「预扣（freeze）」和随后的「退回（release）」合并成一行“批量处理”。
 *   数据库里 freeze 的 ref 是任务 id、release 的 ref 是图片 id，前端对不上任务，
 *   所以按时间归组：release 归到它之前最近的、24 小时内的那次 freeze（同时跑两批时可能归错组，
 *   但净变化和余额永远是对的）。翻页时把已加载的全部行一起重新整理，跨页的也能合并。
 * merge = false（只看收入 / 只看支出时）：一行一条，不合并（否则预扣和退回分属两边，合并后数字会误导）。
 */
export function groupLedger(rows, merge = true) {
  const asc = rows.slice().sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id - b.id);
  const items = [];
  let lastBatch = null;
  for (const r of asc) {
    const at = Date.parse(r.created_at);
    if (merge && r.reason === "freeze") {
      lastBatch = { kind: "batch", reserved: -r.delta, returned: 0, delta: r.delta, at, balance: r.balance_after };
      items.push(lastBatch);
    } else if (merge && r.reason === "release" && lastBatch && at - lastBatch.at < DAY) {
      lastBatch.returned += r.delta;
      lastBatch.delta += r.delta;
      lastBatch.at = at;
      lastBatch.balance = r.balance_after;
    } else {
      items.push({ kind: "row", reason: r.reason, bucket: r.bucket, ref: r.ref, delta: r.delta, at, balance: r.balance_after });
    }
  }
  return items.sort((a, b) => b.at - a.at);
}

// 流水类型的显示名：reason 代码 → 文案；没有翻译的原样显示
function reasonLabel(reason, t) {
  const key = `reason_${reason}`;
  const label = t(key);
  return label === key ? String(reason) : label;
}

// 每一行左侧的小图标（收入 / 支出 / 批量 / 过期），纯装饰
const ICONS = {
  batch: '<path d="M4 6h16M4 12h16M4 18h10" />',
  in: '<path d="M12 19V5m0 0-6 6m6-6 6 6" />',
  out: '<path d="M12 5v14m0 0 6-6m-6 6-6-6" />',
  expired: '<path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="9" />',
};
function icon(kind) {
  const tone = {
    batch: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300",
    in: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
    out: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300",
    expired: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  }[kind];
  return `<span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${tone}" aria-hidden="true">
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[kind]}</svg></span>`;
}

/** 一条流水 → 列表项 HTML（<li>）。会员中心的“最近记录”和积分页的完整列表共用 */
export function ledgerItemHTML(item, { t, lang }) {
  const when = dateText(item.at, lang, true);
  let title;
  let detail = "";
  let kind;
  if (item.kind === "batch") {
    kind = "batch";
    title = t("ledgerBatch");
    const used = item.reserved - item.returned;
    detail = item.returned > 0
      ? t("ledgerBatchReturned", { used: fmt(used), returned: fmt(item.returned) })
      : t("ledgerBatchUsed", { used: fmt(used) });
  } else {
    title = reasonLabel(item.reason, t);
    kind = item.reason === "bonus_expired" || item.reason === "subscription_expired" ? "expired" : item.delta > 0 ? "in" : "out";
    if (BONUS_GRANTS.has(item.reason) && item.delta > 0) {
      // 赠送积分：每笔 1 年有效，到账日 + 365 天
      detail = t("ledgerValidUntil", { date: dateText(item.at + BONUS_VALID_DAYS * DAY, lang) });
    } else if (item.reason === "bonus_expired") {
      const m = /expires:(\d{4}-\d{2}-\d{2})/.exec(item.ref || "");
      if (m) detail = t("ledgerExpiredOn", { date: dateText(Date.parse(m[1] + "T00:00:00Z"), lang) });
    }
  }
  const plus = item.delta > 0;
  const amountTone = plus ? "text-brand-700 dark:text-brand-400" : item.delta < 0 ? "text-gray-900 dark:text-zinc-50" : "text-gray-500";
  return `
    <li class="flex items-start gap-3 px-4 py-3.5 sm:px-5">
      ${icon(kind)}
      <div class="min-w-0 flex-1">
        <p class="font-medium text-gray-900 dark:text-zinc-50">${escapeHtml(title)}</p>
        ${detail ? `<p class="mt-0.5 text-sm text-gray-600 dark:text-zinc-400">${escapeHtml(detail)}</p>` : ""}
        <p class="mt-0.5 text-xs text-gray-500 dark:text-zinc-500">${escapeHtml(when)}</p>
      </div>
      <div class="shrink-0 text-right">
        <p class="font-semibold tabular-nums ${amountTone}">${plus ? "+" : ""}${fmt(item.delta)}</p>
        <p class="mt-0.5 text-xs tabular-nums text-gray-500 dark:text-zinc-500">${escapeHtml(t("ledgerBalanceAfter", { n: fmt(item.balance) }))}</p>
      </div>
    </li>`;
}

/**
 * 余额卡：总数 + 各桶 + 即将过期提醒。
 * els = {total, buckets, expiring}；credits 来自 /auth/me 或 /credits/summary；summary 可以为 null（还没取到）
 */
export function renderBalance(els, credits, summary, { t, lang }) {
  els.total.textContent = fmt(credits.total);
  const chips = [
    ["subscription", credits.subscription, "bucketSubscription", "bucketSubscriptionTip"],
    ["bonus", credits.bonus, "bucketBonus", "bucketBonusTip"],
    ["topup", credits.topup, "bucketTopup", "bucketTopupTip"],
  ].filter(([, n]) => n > 0);
  const frozen = credits.frozen > 0
    ? `<li class="inline-flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 px-3 py-1 text-gray-600 dark:border-zinc-700 dark:text-zinc-400" title="${escapeHtml(t("bucketFrozenTip"))}">
         <span>${escapeHtml(t("bucketFrozen"))}</span><span class="font-semibold tabular-nums text-gray-900 dark:text-zinc-100">${fmt(credits.frozen)}</span></li>`
    : "";
  els.buckets.innerHTML = chips.map(([key, n, label, tip]) => `
    <li class="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300" title="${escapeHtml(t(tip))}" data-bucket="${key}">
      <span>${escapeHtml(t(label))}</span><span class="font-semibold tabular-nums text-gray-900 dark:text-zinc-100">${fmt(n)}</span>
    </li>`).join("") + frozen;
  els.buckets.classList.toggle("hidden", !chips.length && !frozen);

  // 30 天内要过期的赠送积分：提醒尽快用掉
  const soon = (summary && summary.expiring_30d) || [];
  const n = soon.reduce((s, x) => s + (x.credits || 0), 0);
  if (n > 0) {
    els.expiring.textContent = t("expiringSoon", { n: fmt(n), date: dateText(Date.parse(soon[0].date + "T00:00:00Z"), lang) });
  }
  els.expiring.classList.toggle("hidden", !(n > 0));
}

/** 登录卡：Google、邮箱链接、后台开启了的其他登录方式（GitHub 等）。登录后回到当前页 */
export function mountLogin(root, MiaoCutPro, { t }) {
  const msg = root.querySelector("[data-login-msg]");
  const setMsg = (key) => { msg.textContent = key ? t(key) : ""; };
  root.querySelector("[data-login-google]").addEventListener("click", () => {
    MiaoCutPro.signInWithGoogle(location.href).catch((e) =>
      setMsg(e && e.message === "auth_unavailable" ? "loginUnavailable" : "loginGoogleFailed"));
  });
  root.querySelector("[data-login-email]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = e.currentTarget.querySelector("input[type=email]");
    const email = input.value.trim();
    if (!email || !input.checkValidity()) { setMsg("loginNeedEmail"); input.focus(); return; }
    try {
      const res = await MiaoCutPro.signInWithEmail(email, location.href);
      if (res && res.error) throw res.error;
      setMsg("loginSent");
    } catch (err) {
      setMsg(err && err.message === "auth_unavailable" ? "loginUnavailable" : "loginSendFailed");
    }
  });
  MiaoCutPro.mountProviderButtons(root, { onError: () => setMsg("loginOAuthFailed") });
}

/** 本地模拟模式：页面顶部一条提示，免得把假数据当真 */
export function mockBanner(MiaoCutPro, { t }) {
  if (!MiaoCutPro.isMock || !MiaoCutPro.isMock() || document.getElementById("mock-banner")) return;
  const p = document.createElement("p");
  p.id = "mock-banner";
  p.className = "bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-200";
  p.textContent = t("mockBanner");
  document.body.prepend(p);
}
