// =============================================================================
// 会员页面的「邀请好友」部分：邀请卡片（会员中心、邀请页共用）+ 邀请记录行
// -----------------------------------------------------------------------------
// 数据来自网关 GET /member/referral（MiaoCutPro.referral）和 GET /member/referral/list（MiaoCutPro.referralList）。
// 奖励多少、有效几天、每月上限都由网关返回（data.reward / data.valid_days / data.monthly_cap），
// 这里只负责显示，不自己写死数字。
// ⚠️ 本文件的模板字符串里写了 Tailwind class，已加进 tailwind.config.js 的 content，改了 class 要重新 npm run build:css。
// =============================================================================
import { escapeHtml, fmt, dateText } from "/account/account-ui.js";

const PEOPLE = '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/></svg>';

/** 复制文字到剪贴板：优先用 Clipboard API，不行（旧浏览器 / 非安全环境）再用隐藏输入框兜底。成功返回 true */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    /* 退回兜底做法 */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch (_) {
    return false;
  }
}

/**
 * 邀请卡片的 HTML。
 *   compact：会员中心用的紧凑版（多一行统计和「邀请页」链接）；邀请页用完整版（统计在页面别处）
 *   flash：复制 / 分享后的一句提示 {tone: "ok"|"err", text}
 */
function cardHTML(d, { t, compact, flash }) {
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const btn = "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-900";
  const note = flash
    ? `<span class="${flash.tone === "err" ? "text-red-600 dark:text-red-400" : "font-medium text-brand-700 dark:text-brand-400"}">${escapeHtml(flash.text)}</span>`
    : "";
  const stats = compact
    ? `<p class="text-gray-600 dark:text-zinc-400">${escapeHtml(t("inviteCardStats", { n: fmt(d.invited), m: fmt(d.credits_earned) }))}</p>
       <a href="/account/invite/" class="ml-auto inline-flex shrink-0 items-center gap-1 font-medium text-gray-700 underline-offset-4 hover:text-gray-900 hover:underline dark:text-zinc-300 dark:hover:text-zinc-50"><span>${escapeHtml(t("inviteCardLink"))}</span><span aria-hidden="true">→</span></a>`
    : "";
  return `
    <div class="flex items-center gap-3">
      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">${PEOPLE}</span>
      <div class="min-w-0">
        <p class="font-semibold text-gray-900 dark:text-zinc-50">${escapeHtml(t("perkInviteT"))}</p>
        <p class="mt-0.5 text-sm text-gray-600 dark:text-zinc-400">${escapeHtml(t("inviteCardDesc", { reward: fmt(d.reward), days: d.valid_days }))}</p>
      </div>
    </div>
    <div class="mt-4 flex flex-col gap-2 sm:flex-row">
      <label class="sr-only" for="invite-link-input">${escapeHtml(t("inviteLinkLabel"))}</label>
      <input id="invite-link-input" data-inv-link readonly value="${escapeHtml(d.link)}"
        class="block min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-300">
      <div class="flex gap-2">
        <button type="button" data-inv-copy class="${btn} flex-1 bg-gray-900 text-white hover:bg-gray-700 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:flex-none">${escapeHtml(t("inviteCopy"))}</button>
        ${canShare ? `<button type="button" data-inv-share class="${btn} flex-1 border border-gray-300 bg-white text-gray-900 hover:border-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-500 sm:flex-none">${escapeHtml(t("inviteShare"))}</button>` : ""}
      </div>
    </div>
    <div class="${note || stats ? "mt-3 " : ""}flex min-h-5 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <p role="status" aria-live="polite">${note}</p>
      ${stats}
    </div>`;
}

/**
 * 把邀请卡片挂到 root 上，返回 {render(data)}。data 是 /member/referral 的返回（eligible 为 true 的那种）。
 * ctx：{t, compact}。点「复制」复制链接，点「分享」调用系统分享（手机上），点输入框全选方便手动复制。
 */
export function mountInviteCard(root, ctx) {
  const { t } = ctx;
  let data = null;
  let flash = null;
  let timer = null;
  const draw = () => { root.innerHTML = cardHTML(data, { ...ctx, flash }); };
  const say = (tone, text) => {
    flash = { tone, text };
    draw();
    clearTimeout(timer);
    timer = setTimeout(() => { flash = null; draw(); }, 3000); // 提示 3 秒后自己消失
  };
  root.addEventListener("click", async (e) => {
    if (!data) return;
    if (e.target.closest("[data-inv-copy]")) {
      const ok = await copyText(data.link);
      say(ok ? "ok" : "err", t(ok ? "inviteCopied" : "inviteCopyFailed"));
    } else if (e.target.closest("[data-inv-share]")) {
      try {
        await navigator.share({ title: t("inviteShareTitle"), text: t("inviteShareText"), url: data.link });
      } catch (err) {
        if (err && err.name !== "AbortError") say("err", t("inviteCopyFailed")); // 用户自己取消分享不算错误
      }
    } else if (e.target.closest("[data-inv-link]")) {
      e.target.closest("[data-inv-link]").select();
    }
  });
  return {
    render(d) {
      data = d;
      draw();
    },
  };
}

/** 一条邀请记录 → <li> HTML：对方打码邮箱、日期、结果（到账 +N / 没发奖励的原因） */
export function referralRowHTML(item, { t, lang }) {
  const rewarded = item.status === "rewarded";
  const label = {
    rewarded: t("inviteStatusRewarded", { n: fmt(item.credits) }),
    capped: t("inviteStatusCapped"),
    rejected: t("inviteStatusRejected"),
    revoked: t("inviteStatusRevoked"),
  }[item.status] || String(item.status);
  const tone = rewarded
    ? "font-semibold text-brand-700 dark:text-brand-400"
    : "text-gray-600 dark:text-zinc-400";
  return `
    <li class="member-referral-row">
      <div class="min-w-0">
        <p class="truncate font-medium text-gray-900 dark:text-zinc-50">${escapeHtml(item.email)}</p>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">${escapeHtml(dateText(Date.parse(item.created_at), lang, true))}</p>
      </div>
      <p class="shrink-0 text-right text-sm tabular-nums ${tone}">${escapeHtml(label)}</p>
    </li>`;
}
