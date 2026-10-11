// =============================================================================
// pro-api Worker 处理记录冒烟测试(无需真 Supabase / R2)
// 覆盖:GET /v1/batches(保留期:免费 1 天 / 订阅 7 天、封面、过期不签发地址、不列 pending)
//       GET /v1/batch/:id 超过保留期 → expired、不返回下载地址
// 运行:node pro-gateway/test/smoke-history.mjs
// =============================================================================
import { createHmac } from "node:crypto";
import worker, { batchRetentionEnd } from "../src/index.js";

const env = {
  SUPABASE_URL: "https://mock.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  SUPABASE_JWT_SECRET: "test-jwt-secret-please-change",
  CORS_ALLOW_ORIGIN: "*",
  R2_ENDPOINT: "https://acct.r2.cloudflarestorage.com",
  R2_BUCKET: "miaocut-batch",
  R2_ACCESS_KEY_ID: "ak",
  R2_SECRET_ACCESS_KEY: "sk",
};
const H = 3600 * 1000;
const ago = (ms) => new Date(Date.now() - ms).toISOString();
const J1 = "11111111-1111-1111-1111-111111111111"; // 免费,2 小时前 → 有效
const J2 = "22222222-2222-2222-2222-222222222222"; // 免费,30 小时前 → 过期
const J3 = "33333333-3333-3333-3333-333333333333"; // 订阅 7 天,3 天前 → 有效
const jobs = [
  { id: J1, profile: "fast", status: "done", total_images: 10, succeeded: 9, failed: 1, retention_days: 1, created_at: ago(2 * H), expires_at: ago(-22 * H) },
  { id: J2, profile: "fast", status: "done", total_images: 5, succeeded: 5, failed: 0, retention_days: 1, created_at: ago(30 * H), expires_at: ago(6 * H) },
  { id: J3, profile: "fur", status: "done", total_images: 40, succeeded: 40, failed: 0, retention_days: 7, created_at: ago(72 * H), expires_at: ago(48 * H) },
];
const seen = [];
function jsonResp(v, status = 200) {
  return new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json" } });
}
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  if (!url.startsWith(env.SUPABASE_URL)) throw new Error("unexpected fetch: " + url);
  seen.push(decodeURIComponent(url));
  if (url.includes("/rpc/get_account")) {
    return jsonResp({ user_id: "u1", email: "a@example.com", plan: "free", subscription_credits: 0, topup_credits: 10, daily_used: 0, subscription: null });
  }
  if (url.includes("/rest/v1/jobs?user_id=eq.u1&status=neq.pending")) return jsonResp(jobs);
  const m = url.match(/\/rest\/v1\/jobs\?id=eq\.([0-9a-f-]{36})/);
  if (m) return jsonResp(jobs.filter((j) => j.id === m[1]));
  if (url.includes("/rest/v1/job_images?job_id=in.")) {
    // 每批前 4 张(J1 第 2 张失败了 → 只有 3 张封面)
    return jsonResp([
      { job_id: J1, idx: 0, output_key: "batch/j1/out/a.png" }, { job_id: J1, idx: 2, output_key: "batch/j1/out/c.png" },
      { job_id: J1, idx: 3, output_key: "batch/j1/out/d.png" },
      { job_id: J3, idx: 0, output_key: "batch7/j3/out/a.png" }, { job_id: J3, idx: 1, output_key: "batch7/j3/out/b.png" },
      { job_id: J3, idx: 2, output_key: "batch7/j3/out/c.png" }, { job_id: J3, idx: 3, output_key: "batch7/j3/out/d.png" },
    ]);
  }
  if (url.includes("/rest/v1/job_images?job_id=eq.")) {
    return jsonResp([{ id: "img0", idx: 0, orig_filename: "a.jpg", output_key: "k", status: "done", error: null }]);
  }
  return jsonResp(null);
};

const now = Math.floor(Date.now() / 1000);
function token() {
  const b64 = (s) => Buffer.from(s).toString("base64url");
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(JSON.stringify({ sub: "auth-u1", email: "a@example.com", email_confirmed_at: "2024-01-01", exp: now + 3600 }));
  const sig = createHmac("sha256", env.SUPABASE_JWT_SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
const call = (path) => worker.fetch(new Request(`https://pro-api.miaocut.app${path}`, { headers: { Authorization: `Bearer ${token()}` } }), env, { waitUntil() {} });

let failures = 0;
const check = (name, cond, detail = "") => {
  if (cond) console.log("  PASS  " + name);
  else { failures++; console.log("  FAIL  " + name + (detail ? "  → " + detail : "")); }
};

console.log("pro-api Worker 处理记录冒烟测试\n");
check("batchRetentionEnd:创建时间 + 天数", batchRetentionEnd({ created_at: "2026-10-01T00:00:00Z", retention_days: 7 }) === Date.parse("2026-10-08T00:00:00Z"));
check("batchRetentionEnd:没有天数按 1 天", batchRetentionEnd({ created_at: "2026-10-01T00:00:00Z" }) === Date.parse("2026-10-02T00:00:00Z"));

let r = await call("/v1/batches");
let j = await r.json();
const by = Object.fromEntries(j.batches.map((b) => [b.job_id, b]));
check("/v1/batches → 200 + 3 条", r.status === 200 && j.batches.length === 3, JSON.stringify(j).slice(0, 200));
check("查询只取已开始的批次(status=neq.pending)", seen.some((u) => u.includes("status=neq.pending")));
check("免费批次 2 小时前 → 有效,3 张封面(签名地址)", by[J1].expired === false && by[J1].covers.length === 3 && by[J1].covers[0].includes("X-Amz-Signature"));
check("免费批次 30 小时前 → 已过期,没有封面", by[J2].expired === true && by[J2].covers.length === 0);
check("订阅批次 3 天前(保留 7 天)→ 有效,4 张封面", by[J3].expired === false && by[J3].covers.length === 4 && by[J3].retention_days === 7);
check("过期批次不参与封面查询", !seen.find((u) => u.includes("job_id=in."))?.includes(J2));

r = await call(`/v1/batch/${J2}`);
j = await r.json();
check("过期批次查状态 → expired=true,不返回图片和下载地址", r.status === 200 && j.expired === true && j.images.length === 0);
r = await call(`/v1/batch/${J1}`);
j = await r.json();
check("有效批次查状态 → 有下载地址 + 截止时间", j.expired === undefined && j.images[0].download_url && j.retention_ends_at);

console.log(failures ? `\n❌ ${failures} 项失败` : "\n✅ 全部通过");
process.exit(failures ? 1 : 0);
