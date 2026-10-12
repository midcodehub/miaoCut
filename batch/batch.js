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

const { t } = window.MiaoCutProI18n;
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
const fmt = (n) => Number(n).toLocaleString();
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
  state.job = { job_id: null, total: sources.length, sources };
  state.images = sources.map((f, idx) => ({ idx, filename: f.name, status: "queued" }));
  setPhase("running");
  buildRunGrid();
  setProgress(t("stPreparing"), 0.02);
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

    // 2) 并发直传 R2；单张失败重试一次，仍失败就整批中止（此时还没点开始，不会冻结任何积分）
    let uploaded = 0;
    let aborted = false; // 一张彻底失败后，其余并发的上传不再继续
    await runPool(job.uploads, async (up, i) => {
      if (aborted) return;
      const onProgress = (f) => setTileStatus(i, "uploading", f);
      setTileStatus(i, "uploading", 0);
      try { await putToR2(sources[i], up.put_url, onProgress); }
      catch (_) {
        await sleep(800);
        try { await putToR2(sources[i], up.put_url, onProgress); } catch (__) { aborted = true; throw new BatchError("errUpload"); }
      }
      if (aborted) return;
      uploaded++;
      setTileStatus(i, "processing");
      setProgress(t("stUploading", { i: uploaded, n: job.uploads.length }), 0.02 + (uploaded / job.uploads.length) * 0.38, `${uploaded}/${job.uploads.length}`);
    }, UPLOAD_CONCURRENCY);

    // 3) 开始：冻结积分 + 入队
    setProgress(t("stStarting"), 0.42);
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
        setProgress(t("stProcessing", { d: resolved, n: total }), 0.42 + (resolved / total) * 0.58, `${resolved}/${total}`);
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
  if (!state.images.length || state.images.length !== imgs.length) {
    state.images = imgs.map((im) => ({ ...im }));
    state.job.total = imgs.length || state.job.total;
    buildRunGrid();
  }
  imgs.forEach((im) => {
    const cur = state.images[im.idx] || {};
    state.images[im.idx] = { ...cur, ...im };
    if (im.status === "done" || im.status === "failed") setTileStatus(im.idx, im.status);
  });
  updateCounts();
}

function setProgress(text, frac, count = "") {
  els.progressText.textContent = text;
  els.progressCount.textContent = count;
  const pct = Math.round(Math.max(0, Math.min(1, frac)) * 100);
  els.progressBar.style.width = pct + "%";
  els.progressBar.parentElement.setAttribute("aria-valuenow", String(pct));
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
  els.runGrid.querySelectorAll("[data-tile]").forEach((li) => {
    const im = state.images[Number(li.dataset.tile)] || {};
    if (im.status !== "done" && im.status !== "failed") setRing(li, "queued");
  });
  // 没处理成的图恢复原图不透明度，否则在白底预览上像一张空白卡片
  els.runGrid.querySelectorAll("[data-src-img]").forEach((img) => img.classList.remove("opacity-60"));
  show(els.errorBuy, err.buy);
  // 查询阶段出错：任务可能真的找不回来了，给一个出口（不取消服务器上的任务，只是不再跟踪它）
  show(els.btnErrorNew, stage === "poll" || stage === "expired");
  if (stage === "expired") { state.images = []; els.runGrid.innerHTML = ""; updateCounts(); }
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
// 进度圈（SVG）：底圈 + 进度弧。pathLength=100，stroke-dasharray 直接用百分比。
//   排队 → 空圈；上传 → 按真实字节填到 50%；抠图 → 弧线转动（服务端没有百分比，不做假进度）；
//   完成 → 补满 + 打勾；失败 → 红圈 + ✕
function ringHTML() {
  return `
    <span data-ring role="img" class="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm dark:bg-zinc-900/90">
      <svg data-ring-svg viewBox="0 0 36 36" class="h-7 w-7 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r="14" fill="none" stroke-width="3.5" class="stroke-gray-200 dark:stroke-zinc-700"></circle>
        <circle data-arc cx="18" cy="18" r="14" fill="none" stroke-width="3.5" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"
          class="stroke-gray-900 transition-[stroke-dasharray] duration-200 ease-out motion-reduce:transition-none dark:stroke-zinc-100"></circle>
      </svg>
      <svg data-ring-done class="absolute hidden h-3.5 w-3.5 text-brand-700 dark:text-brand-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clip-rule="evenodd"/></svg>
      <svg data-ring-fail class="absolute hidden h-3 w-3 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
    </span>`;
}

// 改变某张图的进度圈。state: queued | uploading | processing | done | failed；frac = 上传进度 0~1
function setRing(li, ringState, frac = 0) {
  const ring = li.querySelector("[data-ring]");
  if (!ring) return;
  const svg = ring.querySelector("[data-ring-svg]");
  const arc = ring.querySelector("[data-arc]");
  const SPIN = ["animate-spin", "motion-reduce:animate-none"];
  svg.classList.remove(...SPIN);
  arc.classList.remove("stroke-brand-600", "dark:stroke-brand-400", "stroke-red-600", "dark:stroke-red-400");
  arc.classList.add("stroke-gray-900", "dark:stroke-zinc-100");
  show(ring.querySelector("[data-ring-done]"), ringState === "done");
  show(ring.querySelector("[data-ring-fail]"), ringState === "failed");
  let dash = 0;
  if (ringState === "uploading") dash = Math.round(Math.max(0, Math.min(1, frac)) * 50);
  else if (ringState === "processing") { dash = 30; svg.classList.add(...SPIN); }
  else if (ringState === "done" || ringState === "failed") {
    dash = 100;
    arc.classList.remove("stroke-gray-900", "dark:stroke-zinc-100");
    arc.classList.add(...(ringState === "done" ? ["stroke-brand-600", "dark:stroke-brand-400"] : ["stroke-red-600", "dark:stroke-red-400"]));
  }
  arc.setAttribute("stroke-dasharray", `${dash} 100`);
  const label = ringState === "uploading" ? t("tileUploading", { p: Math.round(frac * 100) }) : t(`tile_${ringState}`);
  ring.setAttribute("aria-label", label);
  const line = li.querySelector("[data-line]");
  if (line && ringState !== "failed") line.textContent = label;
}

function buildRunGrid() {
  const sources = state.job && state.job.sources;
  els.runGrid.innerHTML = state.images.map((im, i) => {
    const src = sources && sources[i] ? URL.createObjectURL(sources[i]) : "";
    return `
    <li data-tile="${i}">
      <button type="button" data-open="${i}" disabled
        class="group relative block aspect-square w-full overflow-hidden rounded-lg border border-gray-200 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 enabled:cursor-zoom-in dark:border-zinc-800 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-900" data-preview-bg>
        ${src ? `<img data-src-img src="${src}" alt="" loading="lazy" decoding="async" class="absolute inset-0 h-full w-full object-cover opacity-60 transition-opacity duration-200 motion-reduce:transition-none">` : ""}
        <span class="absolute inset-0 flex items-center justify-center transition-[padding] duration-200 ease-out motion-reduce:transition-none" data-preview-pad></span>
        ${ringHTML()}
      </button>
      <p class="mt-1.5 truncate text-xs font-medium text-gray-800 dark:text-zinc-200" title="${escapeHtml(im.filename || "")}">${escapeHtml(im.filename || "")}</p>
      <p data-line class="mt-0.5 truncate text-xs text-gray-600 dark:text-zinc-400"></p>
    </li>`;
  }).join("");
  applyOutputPreview(els.runGrid);
  state.images.forEach((im, i) => setTileStatus(i, im.status === "done" || im.status === "failed" ? im.status : (im.status === "queued" ? "queued" : "processing")));
  updateCounts();
}

// 目录顶部计数：已完成 / 处理中 / 失败
function updateCounts() {
  const total = state.images.length;
  const done = state.images.filter((im) => im.status === "done").length;
  const failed = state.images.filter((im) => im.status === "failed").length;
  show(els.dirTitle.parentElement, total > 0); // 没有图片（如已过期）时不显示空目录头
  els.dirTitle.textContent = t("dirTitle", { n: fmt(total) });
  els.dirCounts.textContent = t("dirCounts", { d: fmt(done), p: fmt(Math.max(0, total - done - failed)), f: fmt(failed) });
}

function setTileStatus(i, status, frac = 0) {
  const li = els.runGrid.querySelector(`[data-tile="${i}"]`);
  if (!li) return;
  const im = state.images[i] || {};
  const btn = li.querySelector("[data-open]");
  const line = li.querySelector("[data-line]");
  const srcImg = li.querySelector("[data-src-img]");
  if (status === "done" && im.download_url) {
    setRing(li, "done");
    // 结果图出来时才创建 <img>（不留空 src 的占位图），淡入后盖住原图
    let result = li.querySelector("[data-result]");
    if (!result) {
      result = document.createElement("img");
      result.dataset.result = "";
      result.alt = "";
      result.className = "h-full w-full object-contain opacity-0 transition-opacity duration-300 motion-reduce:transition-none";
      li.querySelector("[data-preview-pad]").appendChild(result);
    }
    if (result.dataset.loaded !== im.image_id) {
      result.dataset.loaded = im.image_id;
      result.onload = () => {
        result.classList.remove("opacity-0");
        // 先去掉 opacity-60 再加 opacity-0：两个类同时存在时 CSS 里后定义的会赢，原图背景会透出来
        if (srcImg) { srcImg.classList.remove("opacity-60"); srcImg.classList.add("opacity-0"); }
      };
      result.src = im.download_url;
    }
    btn.disabled = false;
    btn.setAttribute("aria-label", im.filename || "");
  } else if (status === "failed") {
    setRing(li, "failed");
    line.textContent = t(IMAGE_ERRORS[im.error] || "errImgDefault");
    line.classList.add("text-red-600", "dark:text-red-400");
    line.classList.remove("text-gray-600", "dark:text-zinc-400");
    line.title = line.textContent;
  } else {
    setRing(li, status, frac);
  }
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
  els.runGrid.innerHTML = "";
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
  renderLimits();
  els.gatePoint2.textContent = t("gatePoint2", { price: MIN_PACK_PRICE });
  renderOutputGroups();
  renderDemo();
  setPhase("select");
  renderSelection();

  await MiaoCutPro.init().catch(() => {});
  // 后台开启了的其他登录方式（如 GitHub）才显示；跳转前先把已选图片存好
  MiaoCutPro.mountProviderButtons(els.gate, { beforeRedirect: persistSelection, onError: () => setLoginMsg("loginOAuthFailed") });
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
      setProgress(t("stResumed"), 0.42);
      show(els.progressNote, true);
      pollJob();
    } else if (saved) {
      writeLS(LS_JOB, null);
    }
  }
}

boot();
