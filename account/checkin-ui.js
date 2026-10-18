// =============================================================================
// 会员页面的“每日签到”部分：签到卡片（会员中心、签到页共用）+ 签到日历（签到页）
// -----------------------------------------------------------------------------
// 数据来自网关 GET /member/checkins（MiaoCutPro.checkinStatus），签到走 POST /member/checkin。
// 规则（第 1 天 10、每天 +1、最多 20、断签重来）以数据库 checkin_reward 为准，网关在 rule 字段里
// 返回 {base, max}，这里只负责显示，不自己决定发多少。
//
// “签到日”是服务端按 UTC 0 点（可配置时区）换算的日期，字符串 "YYYY-MM-DD"。
// 日历和“今天 / 明天”的标签都按签到日算，不按本机日期，免得和服务端对不上；
// 只有“下次几点可以签到”用本机时间显示。
// ⚠️ 本文件的模板字符串里写了 Tailwind class，已加进 tailwind.config.js 的 content，改了 class 要重新 npm run build:css。
// =============================================================================
import { escapeHtml, fmt, localeOf } from "/account/account-ui.js";

const DAY = 86400e3;

/** 连续第 n 天能拿多少积分：base 起，每天 +1，最多 max（与数据库 checkin_reward 一致） */
export function rewardFor(n, rule) {
  const base = (rule && rule.base) || 10;
  const max = (rule && rule.max) || 20;
  return Math.min(base + Math.max(n, 1) - 1, max);
}

// 签到日 "YYYY-MM-DD" ↔ 当天 UTC 0 点的时间戳（只用来做日期加减和取星期，不涉及本机时区）
export const dayMs = (d) => Date.parse(d + "T00:00:00Z");
export const dayStr = (ms) => new Date(ms).toISOString().slice(0, 10);

/** 下次可签到的时间：本机时间“今天 08:00 / 明天 08:00” */
export function resetText(iso, { t, lang }) {
  if (!iso) return "";
  const at = new Date(iso);
  const time = at.toLocaleTimeString(localeOf(lang), { hour: "2-digit", minute: "2-digit" });
  const sameLocalDay = at.toDateString() === new Date().toDateString();
  return t(sameLocalDay ? "checkinResetToday" : "checkinResetTomorrow", { time });
}

/** 每天几点换日（本机时间），规则说明里用 */
export function resetClock(iso, lang) {
  return iso ? new Date(iso).toLocaleTimeString(localeOf(lang), { hour: "2-digit", minute: "2-digit" }) : "00:00";
}

// 小图标
const CHECK = '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
const CAL = '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M9 15l2 2 4-4"/></svg>';

/**
 * 接下来 7 天的奖励阶梯：今天、明天、后面 5 天（按连续天数算，不算月上限）。
 * 今天签过的话，第一格打勾并显示今天实际拿到的积分。
 */
function ladderHTML(s, { t, lang }) {
  const start = s.checked_today ? s.streak : s.streak + 1; // 今天是连续第几天
  const cells = [];
  for (let i = 0; i < 7; i++) {
    const d = dayStr(dayMs(s.today) + i * DAY);
    const label = i === 0 ? t("checkinDayToday") : i === 1 ? t("checkinDayTomorrow")
      : new Date(dayMs(d)).toLocaleDateString(localeOf(lang), { weekday: "short", timeZone: "UTC" });
    const done = i === 0 && s.checked_today;
    const n = done ? s.today_credits : rewardFor(start + i, s.rule);
    const tone = done
      ? "border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500 dark:text-zinc-950"
      : i === 0
        ? "border-brand-600 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-300"
        : "border-gray-200 bg-white text-gray-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";
    cells.push(`
      <li class="flex min-w-0 flex-col items-center gap-1 rounded-xl border px-0.5 py-2 ${tone}">
        <span class="w-full truncate text-center text-[11px] leading-tight ${done ? "" : "opacity-80"}">${escapeHtml(label)}</span>
        <span class="flex items-center gap-0.5 text-sm font-semibold tabular-nums">${done ? `<span class="hidden sm:inline-flex">${CHECK}</span>` : ""}+${fmt(n)}</span>
      </li>`);
  }
  return `<ol class="mt-5 grid grid-cols-7 gap-1 sm:gap-1.5" aria-label="${escapeHtml(t("checkinLadderLabel"))}">${cells.join("")}</ol>`;
}

/**
 * 签到卡片的 HTML。
 * opts.calendarLink：是否显示“签到日历 →”（会员中心显示，签到页本身不显示）
 * opts.flash：签到后的一句提示 {tone: "ok"|"err", text}
 */
function cardHTML(s, { t, lang, calendarLink, flash }) {
  const capReached = s.monthly_cap > 0 && s.next_credits === 0;
  const streakText = s.streak > 0 ? t("checkinStreak", { n: fmt(s.streak) }) : t("checkinStreakNone");
  let line;
  if (s.checked_today) line = capReached ? t("checkinTodayGotCapped", { n: fmt(s.today_credits) }) : t("checkinTodayGot", { n: fmt(s.today_credits), m: fmt(s.next_credits) });
  else line = capReached ? t("checkinCapReached") : t("checkinTodayCan", { n: fmt(s.next_credits) });

  let action;
  if (s.checked_today) {
    action = `<span class="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-50 px-4 text-sm font-semibold text-brand-800 dark:bg-brand-500/10 dark:text-brand-300">${CHECK}${escapeHtml(t("checkinDone"))}</span>`;
  } else {
    const label = capReached ? t("checkinBtnPlain") : t("checkinBtn", { n: fmt(s.next_credits) });
    const disabled = s.email_verified === false;
    action = `<button type="button" data-ci-btn ${disabled ? "disabled" : ""}
      class="inline-flex min-h-11 items-center justify-center rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-900">${escapeHtml(label)}</button>`;
  }

  // 底部一行：签到后的提示 / 邮箱未验证提示 / 下次签到时间；右边是日历链接
  let note = "";
  if (flash) {
    note = `<span class="${flash.tone === "err" ? "text-red-600 dark:text-red-400" : "font-medium text-brand-700 dark:text-brand-400"}">${escapeHtml(flash.text)}</span>`;
  } else if (!s.checked_today && s.email_verified === false) {
    note = `<span class="text-amber-700 dark:text-amber-400">${escapeHtml(t("checkinNeedVerify"))}</span>`;
  } else if (s.checked_today) {
    note = `<span>${escapeHtml(resetText(s.next_reset_at, { t, lang }))}</span>`;
  }
  const link = calendarLink
    ? `<a href="/account/checkin/" class="ml-auto inline-flex shrink-0 items-center gap-1 font-medium text-gray-700 underline-offset-4 hover:text-gray-900 hover:underline dark:text-zinc-300 dark:hover:text-zinc-50"><span>${escapeHtml(t("checkinCalendarLink"))}</span><span aria-hidden="true">→</span></a>`
    : "";

  return `
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">${CAL}</span>
        <div class="min-w-0">
          <p class="flex flex-wrap items-baseline gap-x-2 font-semibold text-gray-900 dark:text-zinc-50">
            <span>${escapeHtml(t("perkCheckinT"))}</span>
            <span class="text-sm font-medium text-brand-700 dark:text-brand-400">${escapeHtml(streakText)}</span>
          </p>
          <p class="mt-0.5 text-sm text-gray-600 dark:text-zinc-400">${escapeHtml(line)}</p>
        </div>
      </div>
      ${action}
    </div>
    ${ladderHTML(s, { t, lang })}
    <div class="${note || link ? "mt-4 " : ""}flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-zinc-400">
      <p role="status" aria-live="polite">${note}</p>
      ${link}
    </div>`;
}

/**
 * 把签到卡片挂到 root 上，返回 {render(status)}。
 * ctx：{t, lang, calendarLink, onDone(result), onDisabled()}
 *   onDone     签到成功后调用（页面借此刷新余额、日历等），可以是 async
 *   onDisabled 网关说签到已关闭时调用（页面切回“即将上线”）
 * 点击签到后先在本地把卡片改成“已签”（不用等页面刷新），再交给 onDone。
 */
export function mountCheckinCard(root, MiaoCutPro, ctx) {
  const { t } = ctx;
  let status = null;
  let flash = null;
  let busy = false;
  const render = (s) => {
    status = s;
    root.innerHTML = cardHTML(s, { ...ctx, flash });
  };
  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-ci-btn]");
    if (!btn || busy || !status) return;
    busy = true;
    btn.disabled = true;
    btn.textContent = t("checkinBtnBusy");
    try {
      const r = await MiaoCutPro.checkin();
      flash = {
        tone: "ok",
        text: r.status === "already" ? t("checkinAlready")
          : r.credits > 0 ? t("checkinSuccess", { n: fmt(r.credits) }) : t("checkinSuccessZero"),
      };
      render({
        ...status,
        checked_today: true,
        today_credits: r.credits,
        streak: r.streak,
        next_credits: r.tomorrow_credits,
        next_reset_at: r.next_reset_at || status.next_reset_at,
      });
      if (ctx.onDone) await Promise.resolve(ctx.onDone(r)).catch(() => {});
    } catch (err) {
      const code = err && err.message;
      if (code === "checkin_disabled" && ctx.onDisabled) { ctx.onDisabled(); return; }
      flash = { tone: "err", text: t(code === "email_not_verified" ? "checkinNeedVerify" : "checkinFailed") };
      render(status);
    } finally {
      busy = false;
    }
  });
  return { render };
}

/**
 * 某个月的签到日历（签到页用）。s 是 /member/checkins 的返回（month、days、today）。
 * 中文周一开头，英文周日开头。每格：日期 + 当天拿到的积分；今天加外框；未来的日子变淡。
 */
export function calendarHTML(s, { t, lang }) {
  const [y, m] = s.month.split("-").map(Number);
  const first = Date.UTC(y, m - 1, 1);
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mondayFirst = lang === "zh";
  const lead = (new Date(first).getUTCDay() + (mondayFirst ? 6 : 0)) % 7; // 1 号前面空几格
  const byDay = new Map((s.days || []).map((d) => [d.day, d]));
  const locale = localeOf(lang);

  // 星期表头：从一个已知的周日（1970-01-04）往后数
  const heads = [];
  for (let i = 0; i < 7; i++) {
    const w = Date.UTC(1970, 0, 4 + i + (mondayFirst ? 1 : 0));
    heads.push(`<li class="py-1 text-center text-xs font-medium text-gray-500 dark:text-zinc-500">${escapeHtml(new Date(w).toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" }))}</li>`);
  }

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<li aria-hidden="true"></li>');
  for (let n = 1; n <= daysIn; n++) {
    const d = `${s.month}-${String(n).padStart(2, "0")}`;
    const rec = byDay.get(d);
    const isToday = d === s.today;
    const future = d > s.today;
    const dateLabel = new Date(dayMs(d)).toLocaleDateString(locale, { month: "long", day: "numeric", timeZone: "UTC" });
    let tone;
    let sub = "";
    let aria;
    if (rec) {
      tone = "bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300";
      sub = rec.credits > 0 ? `+${fmt(rec.credits)}` : "✓";
      aria = t("checkinCellDone", { date: dateLabel, n: fmt(rec.credits) });
    } else if (future) {
      tone = "text-gray-400 dark:text-zinc-600";
      aria = dateLabel;
    } else {
      tone = "text-gray-600 dark:text-zinc-400";
      aria = isToday ? t("checkinCellToday", { date: dateLabel }) : t("checkinCellMissed", { date: dateLabel });
    }
    const ring = isToday ? " ring-2 ring-inset ring-brand-600 dark:ring-brand-400" : "";
    cells.push(`
      <li class="flex aspect-square flex-col items-center justify-center rounded-lg sm:aspect-[4/3] ${tone}${ring}" aria-label="${escapeHtml(aria)}">
        <span class="text-sm tabular-nums ${isToday ? "font-bold" : "font-medium"}" aria-hidden="true">${n}</span>
        <span class="h-4 text-[11px] font-semibold leading-4 tabular-nums" aria-hidden="true">${sub}</span>
      </li>`);
  }
  return `
    <ol class="grid grid-cols-7 gap-1" aria-hidden="true">${heads.join("")}</ol>
    <ol class="mt-1 grid grid-cols-7 gap-1">${cells.join("")}</ol>`;
}

/** 月份标题：2026年10月 / October 2026 */
export function monthTitle(month, lang) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(localeOf(lang), { year: "numeric", month: "long", timeZone: "UTC" });
}

/** "YYYY-MM" 加减 n 个月 */
export function shiftMonth(month, n) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
