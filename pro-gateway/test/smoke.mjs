// =============================================================================
// pro-api Worker 本地冒烟测试(无需真 Beam / Supabase / Stripe)
// -----------------------------------------------------------------------------
// 思路:直接 import Worker 的 fetch handler,用 mock 的 global fetch 顶替 Beam + Supabase,
// mint 一个 HS256 测试 JWT,跑通整条网关流程:
//   401 未登录 / /auth/me / /credits/balance / /v1/prewarm(触发 Beam 预热)
//   /v1/remove-background(fast/fur 扣分 + 透传 PNG) / 402 余额不足 / 413 超大
// 运行:node pro-gateway/test/smoke.mjs
// =============================================================================
import { createHmac } from "node:crypto";
import worker from "../src/index.js";

// ----- 测试环境变量 -----
const env = {
  SUPABASE_URL: "https://mock.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  SUPABASE_JWT_SECRET: "test-jwt-secret-please-change",
  BEAM_ENDPOINT: "https://mock-beam.app",
  BEAM_TOKEN: "beam-token",
  CORS_ALLOW_ORIGIN: "https://miaocut.app",
  SIGNUP_BONUS: "100",
  DAILY_FREE_QUOTA: "0",
  MAX_SYNC_UPLOAD_MB: "1", // 1MB:成功用例小 body,413 用例 2MB body
  BEAM_TIMEOUT_MS: "5000",
};

// ----- mock 后端状态 -----
let mockAccount = {
  user_id: "u1",
  email: "test@example.com",
  plan: "free",
  subscription_credits: 0,
  topup_credits: 100,
  daily_used: 0,
};
const calls = { beamHealthz: 0, beamInfer: 0, consume: [] };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG 签名

function jsonResp(value) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// ----- mock global fetch:拦截 Supabase + Beam -----
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;

  if (url.startsWith(env.SUPABASE_URL)) {
    if (url.includes("/rpc/get_account")) return jsonResp(mockAccount);
    if (url.includes("/rpc/ensure_user")) return jsonResp(null);
    if (url.includes("/rpc/consume_credits")) {
      calls.consume.push(JSON.parse(init.body || "{}"));
      return jsonResp("ok");
    }
    return jsonResp(null);
  }

  if (url.startsWith(env.BEAM_ENDPOINT)) {
    if (url.includes("/healthz")) {
      calls.beamHealthz++;
      return jsonResp({ ok: true });
    }
    if (url.includes("/v1/remove-background")) {
      calls.beamInfer++;
      const profile = new URL(url).searchParams.get("profile");
      return new Response(PNG, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "X-Request-Id": "beam-123",
          "X-Processing-Ms": "42",
          "X-Profile-Used": profile,
        },
      });
    }
  }

  throw new Error("unexpected fetch: " + url);
};

// ----- 测试 JWT -----
function b64url(s) {
  return Buffer.from(s).toString("base64url");
}
function mintJWT(secret, payload) {
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
const now = Math.floor(Date.now() / 1000);
const TOKEN = mintJWT(env.SUPABASE_JWT_SECRET, {
  sub: "test-user-uuid",
  email: "test@example.com",
  email_confirmed_at: "2024-01-01T00:00:00Z",
  exp: now + 3600,
});

// ----- 调用 helper -----
const pending = [];
async function call(path, { method = "GET", token, body, profile } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let url = `https://pro-api.miaocut.app${path}`;
  if (profile) url += `?profile=${profile}`;
  const init = { method, headers };
  if (body !== undefined) init.body = body;
  const ctx = { waitUntil: (p) => pending.push(p) };
  return worker.fetch(new Request(url, init), env, ctx);
}

// ----- 断言 -----
let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log("  PASS  " + name);
  else {
    failures++;
    console.log("  FAIL  " + name + (detail ? "  → " + detail : ""));
  }
}

async function main() {
  console.log("pro-api Worker 冒烟测试\n");

  // 1) 未登录 → 401
  let r = await call("/v1/remove-background", { method: "POST", body: PNG, profile: "fast" });
  check("未登录请求 → 401", r.status === 401, `got ${r.status}`);

  // 2) /auth/me
  r = await call("/auth/me", { token: TOKEN });
  let j = await r.json();
  check("/auth/me → 200", r.status === 200, `got ${r.status}`);
  check("/auth/me 余额 total=100", j.credits?.total === 100, JSON.stringify(j.credits));

  // 3) /credits/balance
  r = await call("/credits/balance", { token: TOKEN });
  j = await r.json();
  check("/credits/balance total=100", r.status === 200 && j.total === 100, JSON.stringify(j));

  // 4) /v1/prewarm → 202 + 触发 Beam /healthz
  r = await call("/v1/prewarm", { method: "POST", token: TOKEN });
  j = await r.json();
  await Promise.allSettled(pending); // 等 waitUntil 的预热请求真正发出
  check("/v1/prewarm → 202", r.status === 202 && j.warming === true, `got ${r.status}`);
  check("prewarm 触发 Beam /healthz", calls.beamHealthz === 1, `count=${calls.beamHealthz}`);

  // 5) fur 抠图成功 → 200 + 扣 2 分 + 透传 PNG
  r = await call("/v1/remove-background", { method: "POST", token: TOKEN, body: PNG, profile: "fur" });
  const buf = new Uint8Array(await r.arrayBuffer());
  check("fur 抠图 → 200", r.status === 200, `got ${r.status}`);
  check("fur X-Credits-Charged=2", r.headers.get("X-Credits-Charged") === "2", r.headers.get("X-Credits-Charged"));
  check("fur X-Credits-Balance=98", r.headers.get("X-Credits-Balance") === "98", r.headers.get("X-Credits-Balance"));
  check("fur X-Profile-Used=fur", r.headers.get("X-Profile-Used") === "fur", r.headers.get("X-Profile-Used"));
  check("返回体是 PNG", buf[0] === 0x89 && buf[1] === 0x50, [...buf.slice(0, 2)].join(","));
  check("consume_credits 收到 amount=2", calls.consume.at(-1)?.p_amount === 2, JSON.stringify(calls.consume.at(-1)));
  check("CORS 暴露扣分头", (r.headers.get("Access-Control-Expose-Headers") || "").includes("X-Credits-Balance"));

  // 6) fast 抠图 → 扣 1 分;sharp 别名 → fast
  r = await call("/v1/remove-background", { method: "POST", token: TOKEN, body: PNG, profile: "fast" });
  await r.arrayBuffer();
  check("fast X-Credits-Charged=1", r.headers.get("X-Credits-Charged") === "1", r.headers.get("X-Credits-Charged"));
  r = await call("/v1/remove-background", { method: "POST", token: TOKEN, body: PNG, profile: "sharp" });
  await r.arrayBuffer();
  check("sharp 别名 → fast(扣 1)", r.headers.get("X-Profile-Used") === "fast" && r.headers.get("X-Credits-Charged") === "1");

  // 7) 余额不足 → 402(不转发 Beam)
  const beamBefore = calls.beamInfer;
  mockAccount = { ...mockAccount, subscription_credits: 0, topup_credits: 1 };
  r = await call("/v1/remove-background", { method: "POST", token: TOKEN, body: PNG, profile: "fur" });
  j = await r.json();
  check("余额不足 → 402", r.status === 402 && j.needed === 2 && j.balance === 1, JSON.stringify(j));
  check("402 时不转发 Beam", calls.beamInfer === beamBefore, `infer=${calls.beamInfer}`);
  mockAccount = { ...mockAccount, topup_credits: 100 }; // 还原

  // 8) 超大 body → 413(同步路径不收大图)
  const big = new Uint8Array(2 * 1024 * 1024);
  big[0] = 0x89;
  r = await call("/v1/remove-background", { method: "POST", token: TOKEN, body: big, profile: "fast" });
  check("超大 body → 413", r.status === 413, `got ${r.status}`);

  console.log("\n" + (failures === 0 ? "✅ 全部通过" : `❌ ${failures} 项失败`));
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("测试异常:", e);
  process.exit(1);
});
