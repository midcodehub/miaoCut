// =============================================================================
// pro-api Worker 批量（Phase 2）冒烟测试（无需真 Supabase / Beam / R2）
// 跑通:建任务(+预签名) → 开始(冻结+入队) → 回调(结算) → 状态(下载URL) + 鉴权/边界
// 运行:node pro-gateway/test/smoke-batch.mjs
// =============================================================================
import { createHmac } from "node:crypto";
import worker from "../src/index.js";

const JOB_ID = "11111111-1111-1111-1111-111111111111"; // 36 字符，匹配路由正则

const env = {
  SUPABASE_URL: "https://mock.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  SUPABASE_JWT_SECRET: "test-jwt-secret",
  BEAM_BATCH_URL: "https://mock-beam.app/taskqueue",
  BEAM_TOKEN: "beam-token",
  BATCH_CALLBACK_SECRET: "callback-secret",
  R2_ENDPOINT: "https://acct123.r2.cloudflarestorage.com",
  R2_BUCKET: "miaocut-batch",
  R2_ACCESS_KEY_ID: "ak",
  R2_SECRET_ACCESS_KEY: "sk",
  CORS_ALLOW_ORIGIN: "https://miaocut.app",
  SIGNUP_BONUS: "100",
};

// ---- 有状态 mock 后端 ----
let mockBalance = 100;
const state = {
  job: {
    id: JOB_ID, user_id: "u1", profile: "fast", total_images: 2,
    succeeded: 0, failed: 0, status: "pending",
    expires_at: new Date(Date.now() + 3600e3).toISOString(),
  },
  images: [
    { id: "i1", job_id: JOB_ID, idx: 0, orig_filename: "a.png", input_key: `batch/${JOB_ID}/in/i1`, output_key: `batch/${JOB_ID}/out/i1.png`, status: "pending", error: null },
    { id: "i2", job_id: JOB_ID, idx: 1, orig_filename: "b.png", input_key: `batch/${JOB_ID}/in/i2`, output_key: `batch/${JOB_ID}/out/i2.png`, status: "pending", error: null },
  ],
};
const calls = { enqueue: 0 };
const jr = (v) => new Response(JSON.stringify(v), { status: 200, headers: { "content-type": "application/json" } });

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.startsWith(env.SUPABASE_URL)) {
    const p = url.slice(env.SUPABASE_URL.length);
    if (p.includes("/rpc/get_account"))
      return jr({ user_id: "u1", email: "t@e", plan: "free", subscription_credits: 0, topup_credits: mockBalance, daily_used: 0 });
    if (p.includes("/rpc/create_batch_job"))
      return jr({ job_id: JOB_ID, total: 2, images: state.images.map((i) => ({ image_id: i.id, input_key: i.input_key, orig_filename: i.orig_filename })) });
    if (p.includes("/rpc/freeze_batch")) { state.job.status = "processing"; return jr("ok"); }
    if (p.includes("/rpc/complete_batch_image")) {
      const b = JSON.parse(init.body || "{}");
      const im = state.images.find((i) => i.id === b.p_image);
      if (im && im.status === "pending") {
        im.status = b.p_status; im.output_key = b.p_output_key || im.output_key; im.error = b.p_error;
        if (b.p_status === "done") state.job.succeeded++; else state.job.failed++;
        if (state.job.succeeded + state.job.failed >= state.job.total_images) state.job.status = "done";
      }
      return jr("ok");
    }
    if (p.includes("/rpc/expire_batch")) return jr("ok");
    if (p.startsWith("/rest/v1/jobs?")) return jr([{ ...state.job }]);
    if (p.startsWith("/rest/v1/job_images?")) return jr(state.images.map((i) => ({ ...i })));
    return jr(null);
  }
  if (url.startsWith(env.BEAM_BATCH_URL)) { calls.enqueue++; return jr({ task_id: "t" }); }
  throw new Error("unexpected fetch: " + url);
};

function b64url(s) { return Buffer.from(s).toString("base64url"); }
function mintJWT(secret, payload) {
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const b = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(`${h}.${b}`).digest("base64url");
  return `${h}.${b}.${sig}`;
}
const TOKEN = mintJWT(env.SUPABASE_JWT_SECRET, { sub: "uid", email: "t@e", email_confirmed_at: "2024", exp: Math.floor(Date.now() / 1000) + 3600 });

async function call(path, { method = "GET", token, body, secret } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (secret) headers["X-Batch-Secret"] = secret;
  if (body) headers["Content-Type"] = "application/json";
  const init = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return worker.fetch(new Request(`https://pro-api.miaocut.app${path}`, init), env, { waitUntil() {} });
}

let failures = 0;
const check = (name, cond, d = "") => { if (cond) console.log("  PASS  " + name); else { failures++; console.log("  FAIL  " + name + (d ? "  → " + d : "")); } };

async function main() {
  console.log("pro-api Worker 批量冒烟测试\n");

  // 1) 建任务 → 返回预签名上传 URL
  let r = await call("/v1/batch", { method: "POST", token: TOKEN, body: { profile: "fast", files: [{ name: "a.png" }, { name: "b.png" }] } });
  let j = await r.json();
  check("POST /v1/batch → 200", r.status === 200, `got ${r.status}`);
  check("返回 job_id", j.job_id === JOB_ID, j.job_id);
  check("total_cost = 2(2张×fast 1分)", j.total_cost === 2, String(j.total_cost));
  check("每图带预签名 PUT URL", j.uploads?.length === 2 && /X-Amz-Signature=/.test(j.uploads[0].put_url || ""), j.uploads?.[0]?.put_url?.slice(0, 60));

  // 2) 开始 → 冻结 + 入队 2 个 task
  r = await call(`/v1/batch/${JOB_ID}/start`, { method: "POST", token: TOKEN });
  j = await r.json();
  check("POST /v1/batch/{id}/start → 200", r.status === 200, `got ${r.status}`);
  check("入队 2 个 task", j.enqueued === 2 && calls.enqueue === 2, `enqueued=${j.enqueued} beam=${calls.enqueue}`);
  check("任务转 processing", state.job.status === "processing");

  // 3) Beam 回调:两张都成功 → 结算
  r = await call("/internal/batch-callback", { method: "POST", secret: env.BATCH_CALLBACK_SECRET, body: { image_id: "i1", status: "done", output_key: state.images[0].output_key } });
  check("回调 i1 done → 200", r.status === 200, `got ${r.status}`);
  r = await call("/internal/batch-callback", { method: "POST", secret: env.BATCH_CALLBACK_SECRET, body: { image_id: "i2", status: "done", output_key: state.images[1].output_key } });
  await r.json();
  check("回调 i2 done → 任务 done", state.job.status === "done" && state.job.succeeded === 2);

  // 4) 查状态 → done + 下载 URL
  r = await call(`/v1/batch/${JOB_ID}`, { token: TOKEN });
  j = await r.json();
  check("GET /v1/batch/{id} → 200 done", r.status === 200 && j.done === true, `status=${j.status}`);
  check("成功图带下载预签名 URL", /X-Amz-Signature=/.test(j.images?.[0]?.download_url || ""), j.images?.[0]?.download_url?.slice(0, 60));

  // 5) 回调无密钥 → 403
  r = await call("/internal/batch-callback", { method: "POST", body: { image_id: "i1", status: "done" } });
  check("回调无密钥 → 403", r.status === 403, `got ${r.status}`);

  // 6) 超量 → 400
  r = await call("/v1/batch", { method: "POST", token: TOKEN, body: { profile: "fast", files: Array.from({ length: 201 }, (_, i) => ({ name: `${i}.png` })) } });
  check("超 200 张 → 400", r.status === 400, `got ${r.status}`);

  // 7) 余额不足 → 402
  mockBalance = 1; // 2 张 × 1 分 = 2 > 1
  r = await call("/v1/batch", { method: "POST", token: TOKEN, body: { profile: "fast", files: [{ name: "a.png" }, { name: "b.png" }] } });
  j = await r.json();
  check("余额不足 → 402", r.status === 402 && j.needed === 2, JSON.stringify(j));
  mockBalance = 100;

  console.log("\n" + (failures === 0 ? "✅ 全部通过" : `❌ ${failures} 项失败`));
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error("测试异常:", e); process.exit(1); });
