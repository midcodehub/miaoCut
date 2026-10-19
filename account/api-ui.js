// =============================================================================
// 开发者 API 页面（/account/api/）的渲染：Key 列表行、新 Key 的「只显示一次」面板、错误文案
// -----------------------------------------------------------------------------
// 数据来自网关 GET /member/api-keys（MiaoCutPro.apiKeys）。上限、限流这些数字都由网关返回，这里只负责显示，不自己写死。
// 安全：完整的 Key 只在刚生成时从网关拿到一次，只放在页面上这块面板里，不写进 localStorage / 地址栏；
// 点「我已保存好」或离开页面就没了。列表里永远只有前缀（mc_live_ + 4 位）。
// ⚠️ 本文件的模板字符串里写了 Tailwind class，已加进 tailwind.config.js 的 content，改了 class 要重新 npm run build:css。
// =============================================================================
import { escapeHtml, fmt, dateText } from "/account/account-ui.js";

const KEY_ICON = '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 9.2-9.2M16 7l3 3M14 9l2 2"/></svg>';

/** 一把 Key 的一行：名称、前缀、创建 / 最近使用时间、本月用量、吊销按钮 */
export function keyRowHTML(k, { t, lang }) {
  const used = k.last_used_at ? t("apiLastUsed", { date: dateText(Date.parse(k.last_used_at), lang, true) }) : t("apiNeverUsed");
  return `
    <li class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-5" data-api-key="${escapeHtml(k.id)}">
      <div class="flex min-w-0 items-start gap-3">
        <span class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">${KEY_ICON}</span>
        <div class="min-w-0">
          <p class="truncate font-medium text-gray-900 dark:text-zinc-50">${escapeHtml(k.name)}</p>
          <p class="mt-0.5 font-mono text-xs text-gray-600 dark:text-zinc-400">${escapeHtml(k.prefix)}…</p>
          <p class="mt-1 text-xs text-gray-500 dark:text-zinc-500">${escapeHtml(t("apiCreatedOn", { date: dateText(Date.parse(k.created_at), lang) }))} · ${escapeHtml(used)}</p>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-zinc-500">${escapeHtml(t("apiMonthUsage", { jobs: fmt(k.month_jobs), images: fmt(k.month_images) }))}</p>
        </div>
      </div>
      <button type="button" data-api-revoke="${escapeHtml(k.id)}" data-api-name="${escapeHtml(k.name)}"
        class="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-red-400 dark:hover:border-red-500/60 dark:hover:bg-red-500/10 dark:focus-visible:ring-offset-zinc-900">${escapeHtml(t("apiRevoke"))}</button>
    </li>`;
}

/** 新生成的 Key 的面板：完整 Key（可选中）、复制按钮、「只显示一次」的提醒、「我已保存好」 */
export function revealHTML(created, { t }) {
  const btn = "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-900";
  return `
    <h2 class="font-semibold text-emerald-900 dark:text-emerald-200">${escapeHtml(t("apiRevealH"))} · ${escapeHtml(created.name)}</h2>
    <p class="mt-1 text-sm text-emerald-900/90 dark:text-emerald-200/90">${escapeHtml(t("apiRevealWarn"))}</p>
    <div class="mt-4 flex flex-col gap-2 sm:flex-row">
      <label class="sr-only" for="api-new-key">${escapeHtml(t("apiRevealH"))}</label>
      <input id="api-new-key" data-api-new-key readonly value="${escapeHtml(created.key)}" spellcheck="false" autocomplete="off"
        class="block min-w-0 flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 dark:border-emerald-500/40 dark:bg-zinc-950 dark:text-zinc-50">
      <button type="button" data-api-copy class="${btn} bg-gray-900 text-white hover:bg-gray-700 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">${escapeHtml(t("apiCopy"))}</button>
    </div>
    <div class="mt-3 flex min-h-5 flex-wrap items-center justify-between gap-3 text-sm">
      <p role="status" aria-live="polite" data-api-copy-msg></p>
      <button type="button" data-api-saved class="${btn} border border-gray-300 bg-white text-gray-900 hover:border-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-500">${escapeHtml(t("apiSaved"))}</button>
    </div>`;
}

/** 网关错误码 → 给用户看的话。拿不到具体原因时统一说「请稍后再试」 */
export function apiErrorText(err, t, fallbackKey = "apiCreateFailed") {
  const code = err && err.message;
  if (code === "too_many_keys") return t("apiTooMany", { max: err.max });
  if (code === "invalid_name") return t("apiInvalidName");
  if (code === "email_not_verified") return t("apiNeedVerify");
  if (code === "api_keys_disabled") return t("apiSoonH");
  return t(fallbackKey);
}

/** 「限额和计费」说明：数字来自网关（0 = 不限，对应那一条就不显示） */
export function limitLines(d, t) {
  return [
    d.rate_per_min > 0 ? t("apiLimit1", { rate: fmt(d.rate_per_min) }) : "",
    d.max_active_jobs > 0 ? t("apiLimit2", { active: fmt(d.max_active_jobs) }) : "",
    t("apiLimit3"),
    t("apiLimit4"),
    t("apiLimit5"),
  ].filter(Boolean);
}
