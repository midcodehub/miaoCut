// =============================================================================
// MiaoCut 批量去背景 —— 前端流程
//   建任务 → 逐张直传 R2(预签名) → 开始(冻结+入队) → 轮询进度 → ZIP 下载
// 复用 pro-account.js 的登录态;所有 Pro API 调用走 MiaoCutPro.proFetch（自动带 JWT）。
// =============================================================================
import MiaoCutPro from "/pro-account.js";

const CREDIT_COST = { fast: 1, fur: 2 };
const MAX_IMAGES = 200;
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

const $ = (id) => document.getElementById(id);
const els = {
  balance: $("balance"),
  loginGate: $("login-gate"),
  btnGoogle: $("btn-google"),
  btnEmail: $("btn-email"),
  loginEmail: $("login-email"),
  loginMsg: $("login-msg"),
  tool: $("tool"),
  profileToggle: $("profile-toggle"),
  dropzone: $("dropzone"),
  fileInput: $("file-input"),
  fileList: $("file-list"),
  costLine: $("cost-line"),
  btnStart: $("btn-start"),
  progress: $("progress"),
  progressText: $("progress-text"),
  progressBar: $("progress-bar"),
  imageGrid: $("image-grid"),
  results: $("results"),
  resultsSummary: $("results-summary"),
  resultsMsg: $("results-msg"),
  btnZip: $("btn-zip"),
};

let profile = "fast";
let files = [];        // 选中的 File[]
let chips = {};        // image_id → 缩略图 chip 元素
let lastImages = [];   // 最近一次状态的 images(给 ZIP 用)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 登录态 ----------
async function render() {
  const logged = MiaoCutPro.isLoggedIn();
  els.loginGate.classList.toggle("hidden", logged);
  els.tool.classList.toggle("hidden", !logged);
  if (logged) {
    try {
      const b = await MiaoCutPro.balance();
      els.balance.innerHTML = `Balance: <b>${b.total}</b> credits`;
    } catch (_) { /* ignore */ }
  } else {
    els.balance.textContent = "";
  }
}

els.btnGoogle.addEventListener("click", async () => {
  try { await MiaoCutPro.signInWithGoogle(window.location.href); }
  catch (e) { els.loginMsg.textContent = e.message === "auth_unavailable" ? "登录暂未配置（Supabase）。" : "登录失败，请重试。"; }
});
els.btnEmail.addEventListener("click", async () => {
  const email = els.loginEmail.value.trim();
  if (!email) return;
  try {
    await MiaoCutPro.signInWithEmail(email, window.location.href);
    els.loginMsg.textContent = "Magic link sent — check your email.";
  } catch (e) {
    els.loginMsg.textContent = e.message === "auth_unavailable" ? "登录暂未配置（Supabase）。" : "Failed to send, try again.";
  }
});

// ---------- profile 切换 ----------
els.profileToggle.querySelectorAll("button").forEach((b) => {
  b.addEventListener("click", () => {
    profile = b.dataset.profile;
    els.profileToggle.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
    updateCost();
  });
});

// ---------- 选图 ----------
els.dropzone.addEventListener("click", () => els.fileInput.click());
els.fileInput.addEventListener("change", () => addFiles(els.fileInput.files));
["dragover", "dragenter"].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.add("drag"); }));
["dragleave", "drop"].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.remove("drag"); }));
els.dropzone.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

function addFiles(fileList) {
  for (const f of fileList) {
    if (ALLOWED.includes(f.type) && files.length < MAX_IMAGES) files.push(f);
  }
  els.fileInput.value = "";
  els.fileList.textContent = files.length ? `${files.length} image${files.length > 1 ? "s" : ""} selected` : "";
  updateCost();
}

function updateCost() {
  const has = files.length > 0;
  els.btnStart.classList.toggle("hidden", !has);
  els.costLine.classList.toggle("hidden", !has);
  if (has) {
    const cost = files.length * CREDIT_COST[profile];
    els.costLine.innerHTML = `${files.length} × ${CREDIT_COST[profile]} = <b>${cost}</b> credits · failed images are not charged`;
  }
}

// ---------- 主流程 ----------
els.btnStart.addEventListener("click", start);

async function start() {
  if (!files.length) return;
  els.btnStart.disabled = true;
  els.tool.classList.add("hidden");
  els.progress.classList.remove("hidden");
  els.results.classList.add("hidden");

  try {
    // 1) 建任务 → 拿到每图的预签名 PUT URL
    setProgress("Preparing…", 0.02);
    const create = await MiaoCutPro.proFetch("/v1/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, files: files.map((f) => ({ name: f.name, size: f.size })) }),
    });
    if (create.status === 402) return paywall();
    if (!create.ok) throw new Error(`create_${create.status}`);
    const job = await create.json();

    // 建缩略图 chips（按返回顺序对应 files）
    els.imageGrid.innerHTML = "";
    chips = {};
    job.uploads.forEach((up, i) => {
      const el = document.createElement("div");
      el.className = "chip";
      el.dataset.id = up.image_id;
      el.innerHTML = `
        <img class="thumb" src="${URL.createObjectURL(files[i])}" alt="">
        <img class="result" src="" alt="" style="display:none">
        <div class="overlay"></div>
        <div class="spinner" style="display:none"></div>
        <div class="badge">…</div>
      `;
      els.imageGrid.appendChild(el);
      chips[up.image_id] = el;
    });

    // 2) 逐张直传 R2（限并发 4，绕过 Worker / CF 100MB）
    let uploaded = 0;
    await runPool(job.uploads, async (up, i) => {
      const el = chips[up.image_id];
      if (el) el.querySelector(".spinner").style.display = "block";
      await putToR2(files[i], up.put_url);
      uploaded++;
      setBadge(up.image_id, "↑", "");
      setProgress(`Uploading ${uploaded}/${job.uploads.length}`, (uploaded / job.uploads.length) * 0.4);
    }, 4);

    // 3) 开始 → 冻结积分 + 入队 Beam
    setProgress("Starting…", 0.42);
    const startRes = await MiaoCutPro.proFetch(`/v1/batch/${job.job_id}/start`, { method: "POST" });
    if (startRes.status === 402) return paywall();
    if (!startRes.ok) throw new Error(`start_${startRes.status}`);

    // 4) 轮询进度
    await poll(job.job_id, job.uploads.length);
  } catch (e) {
    setProgress("Something went wrong: " + e.message, 1, true);
    els.btnStart.disabled = false;
  }
}

async function poll(jobId, total) {
  for (;;) {
    await sleep(2000);
    const res = await MiaoCutPro.proFetch(`/v1/batch/${jobId}`);
    if (!res.ok) { await sleep(2000); continue; }
    const data = await res.json();
    lastImages = data.images || [];
    for (const im of lastImages) {
      if (im.status === "done") {
        setBadge(im.image_id, "✓", "done");
        const el = chips[im.image_id];
        if (el && !el.dataset.done) {
          el.dataset.done = "1";
          el.dataset.url = im.download_url;
          const resImg = el.querySelector(".result");
          resImg.src = im.download_url;
          resImg.style.display = "block";
          el.querySelector(".spinner").style.display = "none";
        }
      }
      else if (im.status === "failed") {
        setBadge(im.image_id, "✕", "failed");
        const el = chips[im.image_id];
        if (el) el.querySelector(".spinner").style.display = "none";
      }
    }
    const resolved = data.succeeded + data.failed;
    setProgress(`Processing… ${resolved}/${total} done`, 0.4 + (resolved / total) * 0.6);
    if (data.done) {
      return showResults(data);
    }
  }
}

function showResults(data) {
  els.progress.classList.add("hidden");
  els.results.classList.remove("hidden");
  els.resultsSummary.textContent = `Done — ${data.succeeded} succeeded, ${data.failed} failed`;
  els.resultsMsg.textContent = data.failed ? "Failed images were not charged." : "";
  els.btnZip.disabled = data.succeeded === 0;
  render(); // 刷新余额
}

els.btnZip.addEventListener("click", async () => {
  const done = lastImages.filter((im) => im.status === "done" && im.download_url);
  if (!done.length) return;
  els.btnZip.disabled = true;
  els.resultsMsg.textContent = "Packing ZIP…";
  try {
    const zip = new JSZip();
    let n = 0;
    await runPool(done, async (im) => {
      const blob = await (await fetch(im.download_url)).blob();
      const base = (im.filename || "image").replace(/\.[^.]+$/, "");
      zip.file(`${base}_removed.webp`, blob);
      els.resultsMsg.textContent = `Packing ZIP… ${++n}/${done.length}`;
    }, 4);
    const out = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(out);
    a.download = "miaocut_batch.zip";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    els.resultsMsg.textContent = "";
  } catch (e) {
    els.resultsMsg.textContent = "ZIP failed: " + e.message;
  } finally {
    els.btnZip.disabled = false;
  }
});

// ---------- 工具 ----------
function putToR2(file, url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("upload_" + xhr.status)));
    xhr.onerror = () => reject(new Error("upload_network"));
    xhr.send(file);
  });
}

async function runPool(items, worker, concurrency = 4) {
  let i = 0;
  const run = async () => { while (i < items.length) { const idx = i++; await worker(items[idx], idx); } };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
}

function setBadge(imageId, text, cls) {
  const el = chips[imageId];
  if (!el) return;
  el.className = "chip" + (cls ? " " + cls : "");
  const b = el.querySelector(".badge");
  if (b) b.textContent = text;
}

function setProgress(text, frac, isErr) {
  els.progressText.textContent = text;
  els.progressText.style.color = isErr ? "#dc2626" : "";
  els.progressBar.style.width = Math.max(0, Math.min(1, frac)) * 100 + "%";
}

function paywall() {
  setProgress("Not enough credits.", 1, true);
  setTimeout(() => { window.location.href = "/pricing/"; }, 1200);
}

// ---------- 启动 ----------
MiaoCutPro.init().then(render).catch(() => render());
MiaoCutPro.onAuthChange(render);

// ---------- Lightbox ----------
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxClose = document.getElementById("lightbox-close");

els.imageGrid.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip.done");
  if (!chip || !chip.dataset.url) return;
  lightboxImg.src = chip.dataset.url;
  lightbox.classList.add("show");
});

function closeLightbox() {
  lightbox.classList.remove("show");
  setTimeout(() => { lightboxImg.src = ""; }, 300);
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox.classList.contains("show")) closeLightbox();
});
