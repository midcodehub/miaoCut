// =============================================================================
// MiaoCut 批量去背景 —— 前端流程
// -----------------------------------------------------------------------------
// 页面 = 门面 + 工作台（设计说明见 .impeccable/brief-pro-redesign.md）：
//   未登录：可以先拖图（暂存在本浏览器 IndexedDB），右侧是登录卡，下方是示例结果
//   已登录：选边缘精度 → 看消耗和余额 → 开始
//   处理：建任务 → 逐张直传 R2（预签名）→ 开始（冻结积分 + 入队）→ 轮询进度
//   结果：网格一直保留；选下载格式（透明 PNG / 白底 JPG / 亚马逊主图）→ ZIP 或单张下载
//
// 下载格式在浏览器里合成：GPU 只返回透明图，白底、方图、JPG 用单图编辑器的渲染引擎
// （/editor/engine.js）在打包时现做，所以不需要改后端，处理完还能随时换格式重新下载。
//
// 复用 pro-account.js 的登录态；所有 Pro API 调用走 MiaoCutPro.proFetch（自动带 JWT）。
// 文案全部在 /pro-i18n.js（中英文），本文件不写死任何用户可见的句子。
// =============================================================================
import MiaoCutPro from "/pro-account.js";
import { mountWechatLogin } from '/account/wechat-login.js';
import { mockBanner, localeOf } from "/account/account-ui.js";

await window.MiaoCutProI18n.ready;
const { t, lang } = window.MiaoCutProI18n;
mockBanner(MiaoCutPro, { t });
const { presets, engine } = window.MiaoCutEditor;

// ---------- 常量 ----------
const CREDIT_COST = { fast: 1, fur: 2 };
// 每批上限：未登录 / 非订阅 200 张；登录后以服务端按档位下发的 limits.batch_max 为准（Pro / Business 500 张）
const DEFAULT_MAX_IMAGES = 200;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
// 积分包最低单价，展示在登录卡上。⚠️ 与 /pricing/ 的 PACKS（Studio 5000 积分 $79.99）保持一致
const MIN_PACK_PRICE = "$0.016";
const UPLOAD_CONCURRENCY = 4;
const POLL_MS = 2000;

// ---------- 进度圈 / 动效 ----------
// 服务端只告诉我们每张图的状态（queued / processing / done / failed），没有百分比。
// 所以进度圈按「阶段」分段，每段的含义都是真的：
//   上传 0→50%（按真实上传字节）→ 排队停在 50% → 处理中从 50% 往 95% 缓动 → 服务端确认 done 才补到 100%。
// 「处理中」这一段是估算，规则是「只会慢、不会骗」：最多到 95%，永远不会自己显示完成；
// 比预计慢时越走越慢（指数逼近 95%），不会倒退。
//
// 预计耗时的出处：2026-10-18 线上实测，快速档单张 GPU 处理约 1.5 秒，2 张从入队到出图约 4 秒。
// 前端每 POLL_MS（2 秒）轮询一次，「看到处理中」和「看到完成」都会晚最多 2 秒，所以快速档按 3 秒估。
// 细腻档（fur）多一步 alpha matting，暂按快速档的 2 倍（6 秒）估，还没有单独实测，实测后改这里。
// 另外「处理中」= GPU 节点已领走这张图，节点可能一次领几张、按顺序处理，排在后面的图会比预计慢，
// 这正是上面「越走越慢、不提前完成」要兜住的情况。
const EXPECTED_PROCESS_MS = { fast: 3000, fur: 6000 };
const RING_UPLOAD_END = 0.5;      // 上传占进度圈的前一半
const RING_PROCESS_CAP = 0.95;    // 处理中最多走到 95%，剩下的 5% 只有服务端确认完成才补上
// 处理中曲线：p(t) = 1 - e^(-k·t/预计耗时)。k = 3 时，到预计耗时那一刻走完这一段的 95%（总进度约 93%），
// 之后每多一个预计耗时只再走剩余的 95%，所以越来越慢、永远到不了 95%。
const PROCESS_CURVE_K = 3;
// 圈上显示的数字追赶目标值的时间常数：上传进度事件是一跳一跳的，追赶一下看起来才是连续的
const RING_SMOOTH_MS = 120;
const UPLOAD_BLUR_PX = 12;        // 还没上传时缩略图的模糊程度，随上传字节降到 0（传完就完全清晰）
const REVEAL_STAGGER_MS = 90;     // 同一次轮询里同时完成的几张图，完成特效依次错开一点，最多错开 5 张
// 完成特效本身（原图背景从中心向外变透明，约 0.8 秒）写在 src/input.css 的 .batch-reveal 里
// 本地存储的 key
const LS_JOB = "miaocut.batch.job";        // 进行中 / 最近一次任务（刷新后恢复）
const LS_OUTPUT = "miaocut.batch.output";  // 上次选的下载格式
const LS_MODE = "miaocut.batch.mode";      // 上次选的边缘精度
const IDB_FILES = "miaocut.batch.files";   // 已选图片（File 对象），登录跳转、刷新后都还在
const DAY_MS = 24 * 3600 * 1000;           // 结果保留天数（1 或 7）× 一天，超过就不再恢复

// 下载格式：都是单图编辑器的状态对象，交给 engine.exportImage 渲染
const OUTPUTS = [
  {
    id: "png", labelKey: "outPng", hintKey: "outPngHint",
    state: () => presets.createDefaultState(),
  },
  {
    id: "white", labelKey: "outWhite", hintKey: "outWhiteHint",
    state: () => presets.createDefaultState({
      background: { type: "solid", color: "#FFFFFF" },
      export: { format: "jpg", quality: 0.92 },
    }),
  },
  {
    // 亚马逊主图：纯白底、方图、长边 ≥1600 可放大（取 2000）、商品约占画面 85%
    id: "amazon", labelKey: "outSquare", hintKey: "outSquareHint",
    state: () => presets.createDefaultState({
      background: { type: "solid", color: "#FFFFFF" },
      layout: { ratio: "1:1", subjectScale: 0.85, exportSize: "2000" },
      export: { format: "jpg", quality: 0.92 },
    }),
  },
];

// 未登录时展示的示例（真实抠图结果，和首页示例同一批图）
const DEMO = [
  { src: "/examples/product-cutout.webp", labelKey: "demoProduct" },
  { src: "/examples/portrait-cutout.webp", labelKey: "demoPortrait" },
  { src: "/examples/logo-cutout.webp", labelKey: "demoLogo" },
  { src: "/examples/pet-cutout.webp", labelKey: "demoPet" },
];

// 服务端单张失败的 error 码 → 文案 key（未知码用通用文案）
const IMAGE_ERRORS = {
  enqueue_failed: "errImgEnqueue",
  expired: "errImgExpired",
  timeout: "errImgExpired",
};

// ---------- 页面状态 ----------
const state = {
  loggedIn: false,
  balance: null,          // 当前余额（积分），未知时为 null
  maxImages: DEFAULT_MAX_IMAGES, // 当前账户的单批上限
  retentionDays: 1,       // 当前账户的批量结果保留天数
  mode: readLS(LS_MODE) === "fur" ? "fur" : "fast",
  output: OUTPUTS.some((o) => o.id === readLS(LS_OUTPUT)) ? readLS(LS_OUTPUT) : "png",
  files: [],              // 已选图片：[{ id, file, url }]，url 是缩略图 objectURL
  phase: "select",        // select | running | results | error
  job: null,              // { job_id, total, sources: File[] | null }
  images: [],             // 服务端返回的每张图状态（按 idx 排序）
  polling: false,
};
let nextFileId = 1;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const els = {
  layout: document.querySelector("main > .grid"),
  balanceBox: $("balance-box"), balanceText: $("balance-text"), navAuth: $("nav-auth"),
  selectStage: $("select-stage"), dropzone: $("dropzone"), dzSub: $("batch-dz-sub"), fileInput: $("file-input"),
  skipNote: $("skip-note"), selection: $("selection"), selCount: $("sel-count"), selGrid: $("sel-grid"),
  btnAddMore: $("btn-add-more"), btnClear: $("btn-clear"),
  runStage: $("run-stage"), progressBox: $("progress-box"), progressText: $("progress-text"),
  progressCount: $("progress-count"), progressBar: $("progress-bar"), progressNote: $("progress-note"),
  resultsBox: $("results-box"), resReady: $("res-ready"), resFailed: $("res-failed"),
  btnZip: $("btn-zip"), btnRetry: $("btn-retry"), btnNew: $("btn-new"), zipMsg: $("zip-msg"), retryNote: $("retry-note"),
  runError: $("run-error"), runErrorText: $("run-error-text"), btnErrorRetry: $("btn-error-retry"), errorBuy: $("error-buy"), btnErrorNew: $("btn-error-new"), errorHistory: $("error-history"),
  runGrid: $("run-grid"), batchKeep: $("batch-keep"), dirTitle: $("dir-title"), dirCounts: $("dir-counts"),
  demo: $("demo"), demoGrid: $("demo-grid"),
  gate: $("gate"), gatePoint2: $("gate-point-2"), gateKeep: $("gate-keep"),
  btnGoogle: $("btn-google"), emailForm: $("email-form"), loginEmail: $("login-email"), loginMsg: $("login-msg"),
  side: $("side"), runPanel: $("run-panel"), sumImages: $("sum-images"), sumCost: $("sum-cost"), sumAfter: $("sum-after"),
  sumShort: $("sum-short"), sumBuy: $("sum-buy"), btnStart: $("btn-start"),
  viewer: $("viewer"), viewerName: $("viewer-name"), viewerStage: $("viewer-stage"), viewerImg: null, // 第一次打开时创建
  viewerPrev: $("viewer-prev"), viewerNext: $("viewer-next"), viewerClose: $("viewer-close"),
  viewerCompare: $("viewer-compare"), viewerDownload: $("viewer-download"),
};

// 有右侧栏 / 无右侧栏 两种布局（处理中和结果阶段右侧栏没有内容，让网格占满整行）
const LAYOUT_WITH_ASIDE = "lg:grid-cols-[minmax(0,1fr)_340px]";
const LAYOUT_FULL = "lg:grid-cols-1";

// 系统开了「减少动画」：不模糊、不缓动、不做完成特效，进度圈直接显示每个阶段的状态。
// 用户可能在页面打开期间切换这个设置，所以监听 change。
const motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
let reduceMotion = !!(motionQuery && motionQuery.matches);
if (motionQuery && motionQuery.addEventListener) {
  motionQuery.addEventListener("change", (e) => { reduceMotion = e.matches; kickProgress(); });
}

// =============================================================================
// 小工具
// =============================================================================
function readLS(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
function writeLS(key, value) {
  try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch (_) { /* 隐私模式 */ }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const show = (el, on = true) => { el.classList.toggle("hidden", !on); };
const fmt = (n) => Number(n).toLocaleString(localeOf(lang));
const outputById = (id) => OUTPUTS.find((o) => o.id === id) || OUTPUTS[0];

// 并发池：同时最多跑 concurrency 个 worker
async function runPool(items, worker, concurrency) {
  let i = 0;
  const run = async () => { while (i < items.length) { const idx = i++; await worker(items[idx], idx); } };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
}

// ---------- IndexedDB：用成熟的 idb-keyval（~600 字节），CDN 失败时退化为「只在内存里」 ----------
let idbPromise = null;
function idb() {
  if (!idbPromise) idbPromise = import("https://esm.sh/idb-keyval@6.2.1").catch(() => null);
  return idbPromise;
}
let persistTimer = null;
// 已选图片变化后写入 IndexedDB（防抖：连续删图时只写最后一次）
function persistSelection() {
  clearTimeout(persistTimer);
  return new Promise((resolve) => {
    persistTimer = setTimeout(async () => {
      const lib = await idb();
      try {
        if (lib) {
          if (state.files.length) await lib.set(IDB_FILES, state.files.map((f) => f.file));
          else await lib.del(IDB_FILES);
        }
      } catch (_) { /* 配额不足等：不影响当前页面使用，只是刷新后不能恢复 */ }
      resolve();
    }, 300);
  });
}
async function loadPersistedFiles() {
  const lib = await idb();
  if (!lib) return [];
  try {
    const arr = await lib.get(IDB_FILES);
    return Array.isArray(arr) ? arr.filter((f) => f instanceof Blob) : [];
  } catch (_) { return []; }
}

// =============================================================================
// 下载格式：选择器（结果区和示例区各一组，状态同步）+ 预览
// =============================================================================
function renderOutputGroups() {
  document.querySelectorAll("[data-output-group]").forEach((group) => {
    const name = `output-${group.dataset.outputGroup}`;
    group.innerHTML = OUTPUTS.map((o) => `
      <label class="cursor-pointer">
        <input type="radio" name="${name}" value="${o.id}" class="peer sr-only" ${o.id === state.output ? "checked" : ""}>
        <span class="inline-flex min-h-9 items-center rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-500 peer-checked:border-gray-900 peer-checked:bg-gray-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-gray-900 peer-focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:peer-checked:border-zinc-50 dark:peer-checked:bg-zinc-50 dark:peer-checked:text-zinc-950 dark:peer-focus-visible:ring-zinc-100 dark:peer-focus-visible:ring-offset-zinc-900">${escapeHtml(t(o.labelKey))}</span>
      </label>`).join("");
    group.addEventListener("change", (e) => {
      if (e.target.name === name) setOutput(e.target.value);
    });
  });
  renderOutputHints();
}

function renderOutputHints() {
  const o = outputById(state.output);
  document.querySelectorAll("[data-output-hint]").forEach((el) => { el.textContent = t(o.hintKey); });
}

function setOutput(id) {
  state.output = outputById(id).id;
  writeLS(LS_OUTPUT, state.output);
  document.querySelectorAll('[data-output-group] input[type="radio"]').forEach((r) => { r.checked = r.value === state.output; });
  renderOutputHints();
  applyOutputPreview(document);
}

// 网格里的预览：透明 → 棋盘格；白底 → 纯白；亚马逊主图 → 纯白 + 四周留白（商品占约 85%）
function applyOutputPreview(scope) {
  const white = state.output !== "png";
  const square = state.output === "amazon";
  scope.querySelectorAll("[data-preview-bg]").forEach((el) => {
    el.classList.toggle("checker", !white);
    el.classList.toggle("bg-white", white);
  });
  scope.querySelectorAll("[data-preview-pad]").forEach((el) => {
    el.classList.toggle("p-[7.5%]", square);
  });
}

function renderDemo() {
  els.demoGrid.innerHTML = DEMO.map((d) => `
    <li>
      <div class="relative aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-800" data-preview-bg>
        <div class="absolute inset-0 flex items-center justify-center transition-[padding] duration-200 ease-out motion-reduce:transition-none" data-preview-pad>
          <img src="${d.src}" alt="" width="512" height="512" loading="lazy" decoding="async" class="h-full w-full object-contain">
        </div>
      </div>
      <p class="mt-1.5 text-xs text-gray-600 dark:text-zinc-400">${escapeHtml(t(d.labelKey))}</p>
    </li>`).join("");
  applyOutputPreview(els.demoGrid);
}

// =============================================================================
// 选图
// =============================================================================
function addFiles(list) {
  let skippedType = 0;
  let skippedLimit = 0;
  for (const file of list) {
    if (!ALLOWED_TYPES.includes(file.type)) { skippedType++; continue; }
    if (state.files.length >= state.maxImages) { skippedLimit++; continue; }
    state.files.push({ id: nextFileId++, file, url: URL.createObjectURL(file) });
  }
  const notes = [];
  if (skippedType) notes.push(t("skipType", { n: skippedType }));
  if (skippedLimit) notes.push(t("skipLimit", { n: skippedLimit, max: state.maxImages }));
  els.skipNote.textContent = notes.join(" ");
  show(els.skipNote, notes.length > 0);
  els.fileInput.value = "";
  renderSelection();
  persistSelection();
}

function removeFile(id) {
  const i = state.files.findIndex((f) => f.id === id);
  if (i < 0) return;
  URL.revokeObjectURL(state.files[i].url);
  state.files.splice(i, 1);
  renderSelection();
  persistSelection();
}

function clearSelection() {
  state.files.forEach((f) => URL.revokeObjectURL(f.url));
  state.files = [];
  show(els.skipNote, false);
  renderSelection();
  persistSelection();
}

function renderSelection() {
  const n = state.files.length;
  show(els.selection, n > 0);
  els.selCount.textContent = n === 1 ? t("selCountOne") : t("selCount", { n: fmt(n) });
  els.selGrid.innerHTML = state.files.map((f) => `
    <li class="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-zinc-800 dark:bg-zinc-800">
      <img src="${f.url}" alt="" loading="lazy" decoding="async" class="h-full w-full object-cover">
      <button type="button" data-remove="${f.id}" aria-label="${escapeHtml(t("selRemove", { name: f.file.name }))}" title="${escapeHtml(f.file.name)}"
        class="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900/75 text-white transition-opacity hover:bg-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </li>`).join("");
  // 未登录：提示「登录期间图片会保留」
  els.gateKeep.textContent = t("gateKeep", { n: fmt(n) });
  show(els.gateKeep, n > 0);
  renderSummary();
}

// 右侧消耗预估：图片数 × 单价，和余额对比；不够就直接提示购买，而不是点了开始才报错
function renderSummary() {
  const n = state.files.length;
  const cost = n * CREDIT_COST[state.mode];
  els.sumImages.textContent = fmt(n);
  els.sumCost.textContent = t("sumCredits", { n: fmt(cost) });
  const known = state.balance != null;
  els.sumAfter.textContent = known ? t("sumCredits", { n: fmt(state.balance - cost) }) : "—";
  const short = known && cost > state.balance;
  els.sumShort.textContent = short ? t("sumShort", { n: fmt(cost - state.balance) }) : "";
  show(els.sumShort, short);
  els.sumBuy.classList.toggle("hidden", !short);
  els.sumBuy.classList.toggle("flex", short);
  els.btnStart.disabled = n === 0 || short;
  els.btnStart.textContent = n === 0 ? t("startEmpty") : (n === 1 ? t("startOne") : t("startN", { n: fmt(n) }));
}

// =============================================================================
// 阶段切换：一个函数决定每块显示什么，避免各处零散地 show / hide
// =============================================================================
function setPhase(phase) {
  state.phase = phase;
  const selecting = phase === "select";
  show(els.selectStage, selecting);
  show(els.runStage, !selecting);
  show(els.progressBox, phase === "running");
  show(els.resultsBox, phase === "results");
  show(els.runError, phase === "error");
  // 右侧栏：只有选图阶段才有内容（其他阶段整个隐藏，否则空的第二列还会占位）
  show(els.side, selecting);
  show(els.gate, selecting && !state.loggedIn);
  show(els.runPanel, selecting && state.loggedIn);
  show(els.demo, selecting && !state.loggedIn);
  els.layout.classList.toggle(LAYOUT_WITH_ASIDE, selecting);
  els.layout.classList.toggle(LAYOUT_FULL, !selecting);
}

// =============================================================================
// 登录态 + 余额
// =============================================================================
async function refreshAuth() {
  state.loggedIn = MiaoCutPro.isLoggedIn();
  els.navAuth.textContent = t(state.loggedIn ? "navAccount" : "navLogin");
  if (state.loggedIn) {
    try {
      const b = await MiaoCutPro.balance();
      state.balance = Number(b.total);
      // 订阅档位的权益（老网关没有 limits 字段时保持默认）
      if (b.limits) {
        state.maxImages = Number(b.limits.batch_max) || DEFAULT_MAX_IMAGES;
        state.retentionDays = Number(b.limits.retention_days) || 1;
      }
    } catch (_) { state.balance = null; }
  } else {
    state.balance = null;
  }
  show(els.balanceBox, state.loggedIn && state.balance != null);
  els.balanceBox.classList.toggle("flex", state.loggedIn && state.balance != null);
  if (state.balance != null) els.balanceText.textContent = t("batchBalanceShort", { n: fmt(state.balance) });
  setPhase(state.phase);
  renderLimits();
  renderSummary();
}

// 上传区提示的上限、结果保留天数文案跟随账户档位
function renderLimits() {
  els.dzSub.textContent = t("dzSub", { max: state.maxImages });
  const seven = state.retentionDays >= 7;
  els.batchKeep.textContent = t(seven ? "batchKeep7" : "batchKeep");
  els.progressNote.textContent = t(seven ? "stLeaveOk7" : "stLeaveOk");
}

function setLoginMsg(key) { els.loginMsg.textContent = key ? t(key) : ""; }

els.btnGoogle.addEventListener("click", async () => {
  await persistSelection(); // 跳转到 Google 之前确保已选图片写进 IndexedDB
  try { await MiaoCutPro.signInWithGoogle(window.location.href); }
  catch (e) { setLoginMsg(e && e.message === "auth_unavailable" ? "loginUnavailable" : "loginGoogleFailed"); }
});

els.emailForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = els.loginEmail.value.trim();
  if (!email || !els.loginEmail.checkValidity()) { setLoginMsg("loginNeedEmail"); els.loginEmail.focus(); return; }
  await persistSelection();
  try {
    const res = await MiaoCutPro.signInWithEmail(email, window.location.href);
    if (res && res.error) throw res.error;
    setLoginMsg("loginSent");
  } catch (err) {
    setLoginMsg(err && err.message === "auth_unavailable" ? "loginUnavailable" : "loginSendFailed");
  }
});

// =============================================================================
// 处理：建任务 → 上传 → 开始 → 轮询
// =============================================================================
class BatchError extends Error {
  constructor(key, vars, opts = {}) { super(key); this.key = key; this.vars = vars; this.buy = !!opts.buy; }
}

// 把接口的 HTTP 状态翻译成用户能看懂的错误（不再把 create_500 之类的代码直接甩给用户）
async function toBatchError(res) {
  if (res.status === 401) return new BatchError("errAuth");
  if (res.status === 402) return new BatchError("errNoCredits", null, { buy: true });
  const body = await res.json().catch(() => ({}));
  if (body.error === "too_many_images") return new BatchError("errTooMany", { max: body.max || state.maxImages });
  return new BatchError("errGeneric");
}

async function startBatch() {
  if (!state.files.length || state.phase === "running") return;
  const sources = state.files.map((f) => f.file);
  // profile 用来选「处理中」的预计耗时；轮询结果里的 profile 会覆盖它（以服务端为准）
  state.job = { job_id: null, total: sources.length, sources, profile: state.mode };
  state.images = sources.map((f, idx) => ({ idx, filename: f.name, status: "queued" }));
  setPhase("running");
  buildRunGrid(); // 新的一批：每张图都从「等待上传」开始
  setProgress(t("stPreparing"));
  show(els.progressNote, false);

  try {
    // 1) 建任务，拿到每张图的预签名上传地址（顺序与 files 一致）
    let res;
    try {
      res = await MiaoCutPro.proFetch("/v1/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: state.mode, files: sources.map((f) => ({ name: f.name, size: f.size })) }),
      });
    } catch (_) { throw new BatchError("errNetwork"); }
    if (!res.ok) throw await toBatchError(res);
    const job = await res.json();
    state.job.job_id = job.job_id;
    setProgress(t("stUploading", { i: 0, n: job.uploads.length }), `0/${job.uploads.length}`);

    // 2) 并发直传 R2；单张失败重试一次，仍失败就整批中止（此时还没点开始，不会冻结任何积分）
    let uploaded = 0;
    let aborted = false; // 一张彻底失败后，其余并发的上传不再继续
    await runPool(job.uploads, async (up, i) => {
      if (aborted) return;
      // 整批已中止时，还在路上的上传可能继续回报进度：不再更新，否则停住的圈又会动起来
      const onProgress = (f) => { if (!aborted) setTileStatus(i, "uploading", { frac: f }); };
      setTileStatus(i, "uploading", { frac: 0 });
      try { await putToR2(sources[i], up.put_url, onProgress); }
      catch (_) {
        await sleep(800);
        try { await putToR2(sources[i], up.put_url, onProgress); } catch (__) { aborted = true; throw new BatchError("errUpload"); }
      }
      if (aborted) return;
      uploaded++;
      // 传完 = 排队（停在 50%）。真正开始处理要等服务端说 processing，这里不能让圈继续走
      setTileStatus(i, "queued");
      setProgress(t("stUploading", { i: uploaded, n: job.uploads.length }), `${uploaded}/${job.uploads.length}`);
    }, UPLOAD_CONCURRENCY);

    // 3) 开始：冻结积分 + 入队
    setProgress(t("stStarting"));
    let startRes;
    try { startRes = await MiaoCutPro.proFetch(`/v1/batch/${job.job_id}/start`, { method: "POST" }); }
    catch (_) { throw new BatchError("errNetwork"); }
    if (!startRes.ok) throw await toBatchError(startRes);

    // 记下任务，刷新 / 离开后回来能继续
    writeLS(LS_JOB, JSON.stringify({ job_id: job.job_id, total: sources.length, first: sources[0].name, at: Date.now(), days: state.retentionDays }));
    show(els.progressNote, true);
    await pollJob();
  } catch (e) {
    showRunError(e instanceof BatchError ? e : new BatchError("errGeneric"));
  }
}

// onProgress(0~1)：XHR 才有上传进度事件（fetch 没有）
function putToR2(file, url, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (onProgress) xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("upload_" + xhr.status)));
    xhr.onerror = () => reject(new Error("upload_network"));
    xhr.send(file);
  });
}

// 拉一次任务状态；网络抖动时返回 null，由调用方决定是否重试
async function fetchJob(jobId) {
  try {
    const res = await MiaoCutPro.proFetch(`/v1/batch/${jobId}`);
    if (res.status === 404) return { gone: true };
    if (res.status === 401) return { auth: true };
    if (!res.ok) return null;
    const data = await res.json();
    // 超过保留期：文件已被 R2 删除，不再显示下载
    if (data && data.expired) return { expired: true };
    return data;
  } catch (_) { return null; }
}

async function pollJob() {
  if (state.polling) return;
  state.polling = true;
  try {
    let misses = 0; // 连续查询失败次数：网络断了 / 服务出错时不能无限转圈
    for (;;) {
      const data = await fetchJob(state.job.job_id);
      if (data && data.gone) { forgetJob(); goSelect(); return; }
      // 登录过期：提示重新登录（任务记录保留，登录回来会自动恢复）
      if (data && data.auth) { showRunError(new BatchError("errAuth"), "poll"); return; }
      if (data && data.expired) { writeLS(LS_JOB, null); showRunError(new BatchError("errExpired"), "expired"); return; }
      if (!data && ++misses >= 8) {
        // 约半分钟都查不到：任务还在服务器上跑，给一个「再查一次」，绝不重新提交（否则会重复扣分）
        showRunError(new BatchError("errPoll"), "poll");
        return;
      }
      if (data) {
        misses = 0;
        applyJobData(data);
        const total = state.job.total || 1; // 从处理记录打开时，总数要等第一次查询才知道
        const resolved = data.succeeded + data.failed;
        // 还没有一张开始处理、且 GPU 正在启动：告诉用户大约要等多久，而不是一直显示 0/N
        const gpuWait = resolved === 0 && data.gpu && data.gpu.state !== "online";
        const label = gpuWait
          ? t("stGpuStarting", { s: Math.max(10, Math.round(Number(data.gpu.eta_seconds) || 60)) })
          : t("stProcessing", { d: resolved, n: total });
        // 进度条的长度不在这里算：它是所有进度圈的平均值，由 drawProgress 每帧画（见「处理网格」）
        setProgress(label, `${resolved}/${total}`);
        if (data.done) { showResults(); return; }
      }
      await sleep(data ? POLL_MS : POLL_MS * 2);
    }
  } finally {
    state.polling = false;
  }
}

// 服务端返回的每张图 → 本地状态 + 网格
function applyJobData(data) {
  const imgs = (data.images || []).slice().sort((a, b) => a.idx - b.idx);
  if (data.profile) state.job.profile = data.profile;
  if (!state.images.length || state.images.length !== imgs.length) {
    // 从处理记录 / 刷新后恢复：网格按服务端当前状态直接画出来（已完成的不再播放完成特效）
    state.images = imgs.map((im) => ({ ...im }));
    state.job.total = imgs.length || state.job.total;
    buildRunGrid(true);
  }
  let revealOrder = 0; // 这一次轮询里新完成的第几张：完成特效依次错开
  imgs.forEach((im) => {
    const cur = state.images[im.idx] || {};
    state.images[im.idx] = { ...cur, ...im };
    const tile = tiles[im.idx];
    const phase = phaseOf(im.status);
    // 和进度模型里的阶段比（而不是和上一次的 status 比）：整批出错后「再查一次」时，停住的圈也能恢复
    if (!tile || tile.phase === phase) return;
    setTileStatus(im.idx, phase, phase === "done" ? { delay: Math.min(revealOrder++, 5) * REVEAL_STAGGER_MS } : {});
  });
  updateCounts();
}

// 顶部进度条的文字和计数；进度条长度由 drawProgress 按所有进度圈的平均值画
function setProgress(text, count = "") {
  els.progressText.textContent = text;
  els.progressCount.textContent = count;
}

const RETRYABLE = new Set(["errNetwork", "errUpload", "errGeneric"]);
let lastErrorRetryable = false;
let lastErrorStage = "submit"; // submit = 还没开始处理（可重新提交）；poll = 任务已在服务器上（只能重新查询）

function showRunError(err, stage = "submit") {
  lastErrorStage = stage;
  lastErrorRetryable = RETRYABLE.has(err.key);
  els.runErrorText.textContent = t(err.key, err.vars);
  els.btnErrorRetry.textContent = stage === "poll"
    ? t(err.key === "errAuth" ? "errBack" : "checkAgain")
    : t(lastErrorRetryable ? "tryAgain" : "errBack");
  // 还没完成的图：进度圈停在原处、变灰，不再前进（不倒退也不假装还在走）。
  //   提交阶段出错 = 这批没处理，也没扣分；查询阶段出错 = 服务器上可能还在处理，只是暂时查不到
  tiles.forEach((tile, i) => {
    if (tile.phase === "done" || tile.phase === "failed") return;
    tile.stalledKey = stage === "submit" ? "tile_stopped" : "tile_unknown";
    setTileStatus(i, "stalled");
  });
  show(els.errorBuy, err.buy);
  // 查询阶段出错：任务可能真的找不回来了，给一个出口（不取消服务器上的任务，只是不再跟踪它）
  show(els.btnErrorNew, stage === "poll" || stage === "expired");
  if (stage === "expired") { state.images = []; resetRunGrid(); updateCounts(); }
  show(els.btnErrorRetry, stage !== "expired"); // 已过期：没有可重试的
  show(els.errorHistory, stage === "expired");
  setPhase("error");
  // 出错时网格保留，用户能看到是哪几张、自己选了什么
  if (err.key === "errNoCredits" || err.key === "errAuth") refreshAuth();
}

function showResults() {
  const ok = state.images.filter((im) => im.status === "done").length;
  const failed = state.images.filter((im) => im.status === "failed").length;
  els.resReady.textContent = t("resReady", { s: fmt(ok) });
  els.resFailed.textContent = t("resFailedN", { f: fmt(failed) });
  show(els.resFailed, failed > 0);
  els.btnZip.disabled = ok === 0;
  const canRetry = failed > 0 && !!state.job.sources;
  els.btnRetry.textContent = t("retryFailed", { f: fmt(failed) });
  els.btnRetry.classList.toggle("hidden", !canRetry);
  els.btnRetry.classList.toggle("inline-flex", canRetry);
  show(els.retryNote, failed > 0 && !state.job.sources);
  show(els.zipMsg, false);
  setPhase("results");
  refreshAuth(); // 结算后刷新余额
}

// =============================================================================
// 处理网格：进度和结果共用，处理完不会消失
// =============================================================================
// 每张图一张卡片：缩略图（原图）+ 右上角进度圈 + 文件名 + 状态行。
// 前端给每张图记一个进度模型 tiles[i]，由一个 requestAnimationFrame 循环统一画所有进度圈和顶部总进度条。
// 两者用的是同一组数字（总进度 = 所有圈的平均值），所以永远对得上。
//
// 阶段（tile.phase）和进度圈：
//   waiting     等待上传   0%，灰弧；缩略图最模糊
//   uploading   上传中     0→50%，按真实上传字节；缩略图随之从模糊变清晰
//   queued      排队中     停在 50%，灰弧
//   processing  处理中     50% → 最多 95%，按预计耗时缓动（估算，见 EXPECTED_PROCESS_MS）
//   done        完成       补满 100%（绿）→ 原图背景从中心向外变透明，露出棋盘格上的抠图结果 → 出现对勾
//   failed      失败       红圈 + ✕
//   stalled     整批出错   圈停在原处变灰，不再前进
let tiles = [];       // 进度模型，下标 = 图片 idx
let tileUrls = [];    // 缩略图的 objectURL，换一批时释放，避免内存泄漏
let progressRaf = 0;  // 已预约的动画帧（0 = 没有）
let progressTimer = 0; // 动画帧不来时的兜底计时器（见 scheduleFrame）
let lastFrameAt = 0;
let barDrawn = -1;    // 顶部进度条上次画的值（没变就不碰 DOM）
let barPct = -1;

// 服务端 status → 进度模型的阶段
function phaseOf(status) {
  if (status === "done" || status === "failed" || status === "processing") return status;
  return "queued";
}

// 圈和状态行的颜色：灰 = 在等；墨黑 = 正在动；绿 = 完成；红 = 失败（完整类名写出来，Tailwind 才扫描得到）
const ARC_TONES = {
  muted: ["stroke-gray-400", "dark:stroke-zinc-500"],
  ink: ["stroke-gray-900", "dark:stroke-zinc-100"],
  done: ["stroke-brand-600", "dark:stroke-brand-400"],
  failed: ["stroke-red-600", "dark:stroke-red-400"],
};
const LINE_TONES = {
  muted: ["text-gray-500", "dark:text-zinc-400"],
  ink: ["text-gray-700", "dark:text-zinc-300"],
  done: ["text-brand-700", "dark:text-brand-400"],
  failed: ["text-red-600", "dark:text-red-400"],
};
const PHASE_TONE = { waiting: "muted", uploading: "ink", queued: "muted", processing: "ink", done: "done", failed: "failed", stalled: "muted" };
function setTone(el, tones, tone) {
  Object.values(tones).forEach((cls) => el.classList.remove(...cls));
  el.classList.add(...tones[tone]);
}

// 进度圈（SVG）：底圈 + 进度弧。pathLength=100，stroke-dasharray 直接用百分比。
// 弧长每帧由 drawTile 设置，所以不给 dasharray 加 CSS 过渡（只给颜色加过渡）。
function ringHTML() {
  return `
    <span data-ring role="img" class="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm dark:bg-zinc-900/90">
      <svg viewBox="0 0 36 36" class="h-7 w-7 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r="14" fill="none" stroke-width="3.5" class="stroke-gray-200 dark:stroke-zinc-700"></circle>
        <circle data-arc cx="18" cy="18" r="14" fill="none" stroke-width="3.5" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"
          class="transition-colors duration-200 motion-reduce:transition-none"></circle>
      </svg>
      <svg data-ring-done class="absolute hidden h-3.5 w-3.5 text-brand-700 dark:text-brand-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clip-rule="evenodd"/></svg>
      <svg data-ring-fail class="absolute hidden h-3 w-3 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
    </span>`;
}

// 某张图此刻「应该」显示的进度（0~1）。真正画出来的 tile.shown 会平滑地追上它，而且只增不减
function tileTarget(tile, now) {
  switch (tile.phase) {
    case "uploading": return RING_UPLOAD_END * tile.upload;
    case "queued": return RING_UPLOAD_END;
    case "processing": {
      // 减少动画：不做随时间走的估算，停在 50%，靠墨黑色的弧和「正在抠图」文字表示在处理
      if (reduceMotion) return RING_UPLOAD_END;
      const expected = EXPECTED_PROCESS_MS[state.job && state.job.profile] || EXPECTED_PROCESS_MS.fast;
      const p = 1 - Math.exp((-PROCESS_CURVE_K * Math.max(0, now - tile.procStart)) / expected);
      return RING_UPLOAD_END + (RING_PROCESS_CAP - RING_UPLOAD_END) * p;
    }
    case "done":
    case "failed": return 1;
    case "stalled": return tile.frozen; // 停在出错那一刻的真实进度（见 setTileStatus）
    default: return tile.shown; // waiting：还是 0
  }
}

// 有进度要画时调用：启动动画循环（已经在跑就什么都不做）
function kickProgress() {
  if (progressRaf || progressTimer) return;
  lastFrameAt = performance.now();
  scheduleFrame();
}

// 预约下一帧：正常靠 requestAnimationFrame（跟屏幕刷新同步，最省电）。
// 兜底：有些环境里页面仍算「可见」，浏览器却不发动画帧（窗口被别的窗口完全挡住、部分内嵌 WebView），
// 250ms 还没来就用普通计时器画一帧，保证进度数字和读屏用的 aria-valuenow 不会卡住。两者谁先到谁画，另一个取消
function scheduleFrame() {
  progressRaf = requestAnimationFrame(progressFrame);
  progressTimer = setTimeout(() => progressFrame(performance.now()), 250);
}

function progressFrame(now) {
  cancelAnimationFrame(progressRaf);
  clearTimeout(progressTimer);
  progressRaf = 0;
  progressTimer = 0;
  // 切到后台再回来时两帧间隔可能很大：限制一下追赶系数（目标值本身按真实时间算，不受影响）
  const dt = Math.min(100, Math.max(0, now - lastFrameAt));
  lastFrameAt = now;
  const ease = reduceMotion ? 1 : 1 - Math.exp(-dt / RING_SMOOTH_MS);
  let busy = false;
  let sum = 0;
  tiles.forEach((tile) => {
    const target = tileTarget(tile, now);
    if (target > tile.shown) {
      const next = tile.shown + (target - tile.shown) * ease;
      tile.shown = target - next < 0.001 ? target : next; // 足够接近就直接对齐，循环才停得下来
    }
    // 还没追上目标，或者正在处理（目标值本身随时间在走）：下一帧继续
    if (tile.shown < target || (tile.phase === "processing" && !reduceMotion)) busy = true;
    drawTile(tile);
    sum += tile.shown;
  });
  drawBar(tiles.length ? sum / tiles.length : 0);
  if (busy) scheduleFrame();
}

// 画一张图：进度弧 + 上传时的模糊（只在数值变了时才写 DOM，200 张也不卡）
function drawTile(tile) {
  const v = Math.round(tile.shown * 1000) / 10; // 百分比，保留 1 位小数
  if (v !== tile.drawn) {
    tile.drawn = v;
    tile.arc.setAttribute("stroke-dasharray", `${v} 100`);
    tile.arc.style.opacity = v > 0 ? "" : "0"; // 0% 时圆头线帽会画出一个小点，干脆隐藏
  }
  if (tile.img) {
    // 上传进度 → 模糊程度：一个字节都没传是 12px，传完是 0（按 0.25px 取整，减少无意义的重绘）。
    // 用 shown（只增不减）而不是原始上传进度，所以上传失败重试时缩略图不会重新变糊
    const left = Math.max(0, 1 - tile.shown / RING_UPLOAD_END);
    const blur = reduceMotion ? 0 : Math.round(UPLOAD_BLUR_PX * left * 4) / 4;
    if (blur !== tile.blur) {
      tile.blur = blur;
      tile.img.style.filter = blur ? `blur(${blur}px)` : "";
    }
  }
}

// 顶部总进度条 = 所有进度圈的平均值
function drawBar(frac) {
  const v = Math.round(frac * 1000) / 1000;
  if (v === barDrawn) return;
  barDrawn = v;
  // 用 transform 缩放而不是改 width：不触发重新布局，每帧更新也便宜
  els.progressBar.style.transform = `scaleX(${v})`;
  const pct = Math.round(v * 100);
  if (pct !== barPct) {
    barPct = pct;
    els.progressBar.parentElement.setAttribute("aria-valuenow", String(pct));
  }
}

// 清空网格：释放缩略图、丢掉进度模型，进度条归零
function resetRunGrid() {
  tileUrls.forEach((u) => URL.revokeObjectURL(u));
  tileUrls = [];
  tiles = [];
  els.runGrid.innerHTML = "";
  kickProgress();
}

// 画网格。fromServer = 按服务端返回的状态直接画（刷新 / 从处理记录恢复时，不重播已经发生的动效）；
// 否则是刚提交的新一批，全部从「等待上传」开始
function buildRunGrid(fromServer = false) {
  resetRunGrid();
  const sources = state.job && state.job.sources;
  els.runGrid.innerHTML = state.images.map((im, i) => {
    let src = "";
    if (sources && sources[i]) { src = URL.createObjectURL(sources[i]); tileUrls.push(src); }
    // 原图和结果图都放在 data-preview-pad 这个 1×1 网格的同一格里、都用 object-contain：
    // 两张图比例相同，主体位置完全重合，完成特效里原图背景消失时，主体看起来纹丝不动
    return `
    <li data-tile="${i}">
      <button type="button" data-open="${i}" disabled
        class="group relative block aspect-square w-full overflow-hidden rounded-lg border border-gray-200 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 enabled:cursor-zoom-in motion-reduce:transition-none dark:border-zinc-800 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-900" data-preview-bg>
        <span class="absolute inset-0 grid grid-cols-1 grid-rows-1 place-items-center transition-[padding] duration-200 ease-out motion-reduce:transition-none" data-preview-pad>
          ${src ? `<img data-src-img src="${src}" alt="" loading="lazy" decoding="async" class="col-start-1 row-start-1 h-full w-full object-contain">` : ""}
        </span>
        ${ringHTML()}
      </button>
      <p class="mt-2 truncate text-xs font-medium text-gray-900 dark:text-zinc-100" title="${escapeHtml(im.filename || "")}">${escapeHtml(im.filename || "")}</p>
      <p data-line class="mt-0.5 truncate text-xs tabular-nums"></p>
    </li>`;
  }).join("");
  applyOutputPreview(els.runGrid);
  tiles = state.images.map((im, i) => {
    const li = els.runGrid.querySelector(`[data-tile="${i}"]`);
    return {
      li, arc: li.querySelector("[data-arc]"), img: li.querySelector("[data-src-img]"),
      phase: null, upload: 0, procStart: 0, shown: 0, drawn: -1, blur: -1, stalledKey: "", frozen: 0,
    };
  });
  state.images.forEach((im, i) => setTileStatus(i, fromServer ? phaseOf(im.status) : "waiting", { instant: true }));
  updateCounts();
}

// 目录顶部计数：已完成 / 进行中 / 失败（失败为 0 时不显示）。每项前面一个和进度圈同色的小圆点
let countsHTML = "";
function updateCounts() {
  const total = state.images.length;
  const done = state.images.filter((im) => im.status === "done").length;
  const failed = state.images.filter((im) => im.status === "failed").length;
  show(els.dirTitle.parentElement, total > 0); // 没有图片（如已过期）时不显示空目录头
  els.dirTitle.textContent = t("dirTitle", { n: fmt(total) });
  const items = [
    ["dirDone", done, "bg-brand-500"],
    ["dirActive", Math.max(0, total - done - failed), "bg-gray-400 dark:bg-zinc-500"],
  ];
  if (failed) items.push(["dirFailed", failed, "bg-red-500"]);
  const html = items.map(([key, n, dot]) =>
    `<span class="inline-flex items-center gap-1.5"><span class="h-1.5 w-1.5 rounded-full ${dot}" aria-hidden="true"></span>${escapeHtml(t(key, { n: fmt(n) }))}</span>`).join("");
  // 数字没变就不重写：这一行是 aria-live，重写会让读屏软件每次轮询都念一遍
  if (html !== countsHTML) { countsHTML = html; els.dirCounts.innerHTML = html; }
}

// 改变某张图的阶段。opts：frac = 上传进度 0~1；instant = 直接跳到该阶段的进度、不播放动效；delay = 完成特效的延迟（毫秒）
function setTileStatus(i, phase, opts = {}) {
  const tile = tiles[i];
  if (!tile) return;
  const { li } = tile;
  const im = state.images[i] || {};
  const changed = tile.phase !== phase;
  // 整批出错：记下出错那一刻按「原来的阶段」算出的真实进度，圈追到这里就停。
  // 不能直接停在 shown：它可能还在追赶途中（比如已经传完、圈才画到 47%），停在那里就是少报了进度
  if (phase === "stalled" && changed) tile.frozen = Math.max(tile.shown, tileTarget(tile, performance.now()));
  tile.phase = phase;
  if (phase === "uploading") tile.upload = Math.max(0, Math.min(1, opts.frac || 0));
  // 「开始处理」的时间 = 第一次看到 processing 的时刻（接口不提供，前端自己记；出错后恢复时沿用第一次的时间）
  if (phase === "processing" && !tile.procStart) tile.procStart = performance.now();
  // instant（恢复任务）或减少动画：不追赶，直接跳到这个阶段的进度并立刻画出来，和状态文字、对勾同步出现
  if (opts.instant || reduceMotion) {
    tile.shown = Math.max(tile.shown, tileTarget(tile, performance.now()));
    drawTile(tile);
  }

  const ring = li.querySelector("[data-ring]");
  const line = li.querySelector("[data-line]");
  let label;
  if (phase === "uploading") label = t("tileUploading", { p: Math.round(tile.upload * 100) });
  else if (phase === "failed") label = t(IMAGE_ERRORS[im.error] || "errImgDefault");
  else if (phase === "stalled") label = t(tile.stalledKey || "tile_stopped");
  else label = t(`tile_${phase}`);
  line.textContent = label;
  line.title = phase === "failed" ? label : ""; // 失败原因可能被截断，悬停能看全
  ring.setAttribute("aria-label", phase === "failed" ? t("tile_failed") : label);

  if (changed) {
    const tone = PHASE_TONE[phase];
    setTone(tile.arc, ARC_TONES, tone);
    setTone(line, LINE_TONES, tone);
    // 失败的卡片描边变红：200 张里一眼能找到是哪几张
    const btn = li.querySelector("[data-open]");
    const failed = phase === "failed";
    btn.classList.toggle("border-gray-200", !failed);
    btn.classList.toggle("dark:border-zinc-800", !failed);
    btn.classList.toggle("border-red-300", failed);
    btn.classList.toggle("dark:border-red-500/50", failed);
    // 失败原因（如「处理超时，未扣积分，可重试」）最多显示两行：后半句「没扣分、能重试」正是用户最需要看到的
    line.classList.toggle("truncate", !failed);
    line.classList.toggle("line-clamp-2", failed);
    show(ring.querySelector("[data-ring-fail]"), failed);
    show(ring.querySelector("[data-ring-done]"), false); // 对勾等完成特效播完再出现（见 finishResult）
    if (phase === "done") showResult(tile, im, opts);
  }
  kickProgress();
}

// 完成：把抠图结果放在原图「下面」，加载好后让原图背景从中心向外变透明（src/input.css 的 .batch-reveal），
// 露出棋盘格上的抠图结果，最后出现对勾
function showResult(tile, im, { instant = false, delay = 0 } = {}) {
  const btn = tile.li.querySelector("[data-open]");
  btn.disabled = false;
  btn.setAttribute("aria-label", im.filename || "");
  if (!im.download_url) { finishResult(tile, false); return; }
  const result = document.createElement("img");
  result.dataset.result = "";
  result.alt = "";
  result.decoding = "async";
  // 没有原图（从处理记录打开）时结果图淡入；有原图时它被原图盖着，淡入看不见，不影响
  result.className = "col-start-1 row-start-1 h-full w-full object-contain opacity-0 transition-opacity duration-200 motion-reduce:transition-none";
  tile.li.querySelector("[data-preview-pad]").prepend(result); // 排在原图前面 = 画在原图下面
  result.onload = () => {
    result.classList.remove("opacity-0");
    const src = tile.img;
    if (!src || instant || reduceMotion) {
      if (src) src.classList.add("hidden");
      finishResult(tile, false);
      return;
    }
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      src.classList.add("hidden");
      src.classList.remove("batch-reveal");
      finishResult(tile, true);
    };
    src.addEventListener("animationend", finish, { once: true });
    // 动画被中途取消（比如播放时用户打开了系统的「减少动画」，CSS 把 animation 设成 none）不会有 animationend，
    // 会有 animationcancel：同样收尾。不用固定时长的计时器兜底，免得和 CSS 里的时长写成两份、改一处漏一处
    src.addEventListener("animationcancel", finish, { once: true });
    src.style.animationDelay = `${delay}ms`;
    src.classList.add("batch-reveal");
  };
  // 结果图加载失败（网络问题）：保留原图，只标记完成；大图查看和下载前会重新拉下载地址
  result.onerror = () => finishResult(tile, false);
  result.src = im.download_url;
}

// 完成特效收尾：出现对勾（pop = 播放一个很短的弹出动画）
function finishResult(tile, pop) {
  if (tile.phase !== "done") return;
  const check = tile.li.querySelector("[data-ring-done]");
  show(check, true);
  check.classList.toggle("batch-check-in", pop && !reduceMotion);
}

els.runGrid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-open]");
  if (btn && !btn.disabled) openViewer(Number(btn.dataset.open));
});

// =============================================================================
// 下载：格式转换 + ZIP + 单张
// =============================================================================
// 预签名下载地址 1 小时过期：下载前重新拉一次状态，拿到新地址
async function refreshDownloadUrls() {
  if (!state.job || !state.job.job_id) return;
  const data = await fetchJob(state.job.job_id);
  if (data && !data.gone) {
    (data.images || []).forEach((im) => { state.images[im.idx] = { ...state.images[im.idx], ...im }; });
  }
}

// 透明结果 → 选定格式。透明 PNG 也要转一次（服务端给的是 WebP，亚马逊等平台不收 WebP）
async function renderOutput(blob, basename, outputId) {
  const bitmap = await createImageBitmap(blob);
  try {
    const eng = engine.createEngine({ cutout: bitmap, basename });
    try {
      const out = await eng.exportImage(outputById(outputId).state());
      return { blob: out.blob, ext: out.format };
    } finally { eng.dispose(); }
  } finally {
    if (bitmap.close) bitmap.close();
  }
}

const baseName = (name) => String(name || "image").replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-").trim() || "image";

async function fetchResult(im) {
  const res = await fetch(im.download_url);
  if (!res.ok) throw new Error("download_" + res.status);
  return res.blob();
}

function saveBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

els.btnZip.addEventListener("click", async () => {
  els.btnZip.disabled = true;
  show(els.zipMsg, true);
  els.zipMsg.textContent = t("zipPackingN", { i: 0, n: "…" });
  try {
    await refreshDownloadUrls();
    const done = state.images.filter((im) => im.status === "done" && im.download_url);
    const zip = new JSZip();
    const used = new Map(); // 文件名去重：同名的加 -2、-3
    let n = 0;
    // 逐张转换（canvas 很吃内存，200 张不要并发太多）
    await runPool(done, async (im) => {
      const { blob, ext } = await renderOutput(await fetchResult(im), im.filename, state.output);
      const base = baseName(im.filename);
      let name = `${base}.${ext}`;
      const count = used.get(name) || 0;
      used.set(name, count + 1);
      if (count) name = `${base}-${count + 1}.${ext}`;
      zip.file(name, blob);
      els.zipMsg.textContent = t("zipPackingN", { i: ++n, n: done.length });
    }, 2);
    const out = await zip.generateAsync({ type: "blob" });
    const stamp = new Date().toISOString().slice(0, 10);
    saveBlob(out, `miaocut-batch-${stamp}-${state.output}.zip`);
    show(els.zipMsg, false);
  } catch (e) {
    console.warn("zip failed:", e);
    els.zipMsg.textContent = t("zipFailed");
  } finally {
    els.btnZip.disabled = false;
  }
});

// 重试失败的：把失败的原图放回选图区，用户确认消耗后再开始（不悄悄扣分）
els.btnRetry.addEventListener("click", () => {
  const sources = state.job && state.job.sources;
  if (!sources) return;
  const failed = state.images.filter((im) => im.status === "failed").map((im) => sources[im.idx]).filter(Boolean);
  forgetJob();
  clearSelection();
  addFiles(failed);
  goSelect();
});

els.btnNew.addEventListener("click", () => {
  forgetJob();
  clearSelection();
  goSelect();
});

els.btnErrorNew.addEventListener("click", () => {
  forgetJob();
  goSelect(); // 已选图片保留
});

els.btnErrorRetry.addEventListener("click", () => {
  if (lastErrorStage === "poll") {
    if (state.loggedIn && state.job) {
      // 任务已在服务器上：只重新查询进度，不重新提交
      setPhase("running");
      pollJob();
    } else {
      // 登录过期：回到选图区登录；任务记录保留，登录后 boot 会自动恢复
      goSelect();
    }
    return;
  }
  // 提交阶段出错时还没扣分：回到选图区，已选图片原样保留
  forgetJob();
  goSelect();
  if (lastErrorRetryable && state.files.length && state.loggedIn) startBatch();
});

function forgetJob() {
  writeLS(LS_JOB, null);
  // 从处理记录打开的批次：地址里去掉 ?job=，否则刷新又会打开它
  if (new URLSearchParams(location.search).has("job")) history.replaceState({}, "", location.pathname);
  state.job = null;
  state.images = [];
  resetRunGrid();
}

function goSelect() {
  setPhase("select");
  renderSelection();
}

// =============================================================================
// 大图查看：结果 + 对比原图 + 单张下载 + ←/→ 切换
// =============================================================================
let viewerIndex = -1;
let viewerShowingOriginal = false;
let viewerOriginalUrl = null;

function doneIndexes() { return state.images.filter((im) => im.status === "done").map((im) => im.idx); }

function openViewer(idx) {
  viewerIndex = idx;
  viewerShowingOriginal = false;
  renderViewer();
  if (!els.viewer.open) els.viewer.showModal();
}

function renderViewer() {
  const im = state.images[viewerIndex];
  if (!im) return;
  if (!els.viewerImg) {
    els.viewerImg = document.createElement("img");
    els.viewerImg.alt = "";
    els.viewerImg.className = "max-h-full max-w-full object-contain";
    els.viewerStage.appendChild(els.viewerImg);
  }
  els.viewerName.textContent = im.filename || "";
  if (viewerOriginalUrl) { URL.revokeObjectURL(viewerOriginalUrl); viewerOriginalUrl = null; }
  const source = state.job && state.job.sources && state.job.sources[viewerIndex];
  if (viewerShowingOriginal && source) {
    viewerOriginalUrl = URL.createObjectURL(source);
    els.viewerImg.src = viewerOriginalUrl;
  } else {
    els.viewerImg.src = im.download_url;
  }
  // 预览背景跟随下载格式（原图不需要棋盘格）
  const white = state.output !== "png" || viewerShowingOriginal;
  els.viewerStage.classList.toggle("checker", !white);
  els.viewerStage.classList.toggle("bg-white", white);
  els.viewerStage.classList.toggle("p-[4%]", state.output === "amazon" && !viewerShowingOriginal);
  show(els.viewerCompare, !!source);
  els.viewerCompare.textContent = t(viewerShowingOriginal ? "viewResult" : "viewOriginal");
  const list = doneIndexes();
  const pos = list.indexOf(viewerIndex);
  els.viewerPrev.disabled = pos <= 0;
  els.viewerNext.disabled = pos < 0 || pos >= list.length - 1;
  [els.viewerPrev, els.viewerNext].forEach((b) => b.classList.toggle("opacity-30", b.disabled));
}

function stepViewer(dir) {
  const list = doneIndexes();
  const pos = list.indexOf(viewerIndex) + dir;
  if (pos < 0 || pos >= list.length) return;
  viewerIndex = list[pos];
  viewerShowingOriginal = false;
  renderViewer();
}

els.viewerPrev.setAttribute("aria-label", t("viewPrev"));
els.viewerNext.setAttribute("aria-label", t("viewNext"));
els.viewerClose.setAttribute("aria-label", t("viewClose"));
els.viewerPrev.addEventListener("click", () => stepViewer(-1));
els.viewerNext.addEventListener("click", () => stepViewer(1));
els.viewerClose.addEventListener("click", () => els.viewer.close());
els.viewerCompare.addEventListener("click", () => { viewerShowingOriginal = !viewerShowingOriginal; renderViewer(); });
els.viewer.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") { e.preventDefault(); stepViewer(-1); }
  if (e.key === "ArrowRight") { e.preventDefault(); stepViewer(1); }
});
// 点遮罩关闭（点到 dialog 本身而不是里面的内容）
els.viewer.addEventListener("click", (e) => { if (e.target === els.viewer) els.viewer.close(); });
els.viewer.addEventListener("close", () => {
  if (viewerOriginalUrl) { URL.revokeObjectURL(viewerOriginalUrl); viewerOriginalUrl = null; }
});

els.viewerDownload.addEventListener("click", async () => {
  const im = state.images[viewerIndex];
  if (!im) return;
  els.viewerDownload.disabled = true;
  try {
    await refreshDownloadUrls();
    const fresh = state.images[viewerIndex];
    const { blob, ext } = await renderOutput(await fetchResult(fresh), fresh.filename, state.output);
    saveBlob(blob, `${baseName(fresh.filename)}.${ext}`);
  } catch (e) {
    console.warn("download failed:", e);
  } finally {
    els.viewerDownload.disabled = false;
  }
});

// =============================================================================
// 交互绑定
// =============================================================================
els.dropzone.addEventListener("click", () => els.fileInput.click());
els.dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); els.fileInput.click(); }
});
els.btnAddMore.addEventListener("click", () => els.fileInput.click());
els.fileInput.addEventListener("change", () => addFiles(els.fileInput.files));
els.btnClear.addEventListener("click", clearSelection);
els.selGrid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove]");
  if (btn) removeFile(Number(btn.dataset.remove));
});

// 拖拽高亮：同时接受拖到整个页面（拖偏了也不会让浏览器直接打开图片）
const DRAG_ON = ["border-gray-900", "bg-gray-100", "dark:border-zinc-300", "dark:bg-zinc-800"];
["dragenter", "dragover"].forEach((ev) => els.dropzone.addEventListener(ev, (e) => {
  e.preventDefault();
  els.dropzone.classList.add(...DRAG_ON);
}));
["dragleave", "drop"].forEach((ev) => els.dropzone.addEventListener(ev, (e) => {
  e.preventDefault();
  els.dropzone.classList.remove(...DRAG_ON);
}));
els.dropzone.addEventListener("drop", (e) => { if (state.phase === "select") addFiles(e.dataTransfer.files); });
["dragover", "drop"].forEach((ev) => window.addEventListener(ev, (e) => {
  if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes("Files")) e.preventDefault();
}));

document.querySelectorAll('input[name="mode"]').forEach((r) => {
  r.checked = r.value === state.mode;
  r.addEventListener("change", () => {
    if (!r.checked) return;
    state.mode = r.value;
    writeLS(LS_MODE, state.mode);
    renderSummary();
  });
});
els.btnStart.addEventListener("click", startBatch);

// =============================================================================
// 启动
// =============================================================================
async function boot() {
  void mountWechatLogin(els.gate, MiaoCutPro, { beforeLogin: persistSelection });
  renderLimits();
  els.gatePoint2.textContent = t("gatePoint2", { price: MIN_PACK_PRICE });
  renderOutputGroups();
  renderDemo();
  setPhase("select");
  renderSelection();

  await MiaoCutPro.init().catch(() => {});
  // 后台开启了的其他登录方式（如 GitHub）才显示；跳转前先把已选图片存好
  MiaoCutPro.mountProviderButtons(els.gate, { beforeRedirect: persistSelection, onError: () => setLoginMsg("loginOAuthFailed") });
  // 上一次登录没有完成（用户取消授权 / 公司管理员还没批准……）：给个提示
  const loginFailed = MiaoCutPro.authErrorKind && MiaoCutPro.authErrorKind();
  if (loginFailed) setLoginMsg(loginFailed === "declined" ? "loginDeclined" : "loginIncomplete");
  await refreshAuth();
  MiaoCutPro.onAuthChange(() => refreshAuth());

  // 恢复之前选的图（登录跳转回来、刷新页面）
  const persisted = await loadPersistedFiles();
  if (persisted.length && !state.files.length) {
    // IndexedDB 取回来的可能是 Blob（部分浏览器不保留 File 的 name），补一个文件名
    addFiles(persisted.map((b, i) => (b instanceof File ? b : new File([b], `image-${i + 1}.${(b.type || "image/png").split("/")[1]}`, { type: b.type }))));
  }

  // 恢复任务：地址里的 ?job=（从处理记录打开）优先，其次是本浏览器最近一次任务
  if (state.loggedIn) {
    let saved = null;
    try { saved = JSON.parse(readLS(LS_JOB) || "null"); } catch (_) { saved = null; }
    const jobParam = new URLSearchParams(location.search).get("job");
    if (jobParam && /^[0-9a-f-]{36}$/i.test(jobParam) && (!saved || saved.job_id !== jobParam)) {
      // 保留期由服务端判断（过期会返回 expired），这里的 days 只用于通过下面的本地检查
      saved = { job_id: jobParam, total: 0, at: Date.now(), days: 7 };
    }
    if (saved && saved.job_id && Date.now() - saved.at < (saved.days || 1) * DAY_MS) {
      // 原图还在本地（同一批）就用来显示缩略图、对比和重试
      const same = state.files.length === saved.total && state.files[0] && state.files[0].file.name === saved.first;
      const sources = same ? state.files.map((f) => f.file) : null;
      state.job = { job_id: saved.job_id, total: saved.total, sources };
      state.images = [];
      setPhase("running");
      setProgress(t("stResumed"));
      show(els.progressNote, true);
      pollJob();
    } else if (saved) {
      writeLS(LS_JOB, null);
    }
  }
}

boot();
