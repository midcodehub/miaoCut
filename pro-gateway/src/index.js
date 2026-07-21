// =============================================================================
// MiaoCut Pro 网关 Worker  (pro-api.miaocut.app)  —— 方案 X / Phase 1
// -----------------------------------------------------------------------------
// 与免费网关 (api2.miaocut.app / scripts/cloudflare-hf-gateway-worker.js) 物理隔离。
// 免费网关一字不改。本 Worker 承载:鉴权 / 积分 / 支付 / 账户,并把【付费单图】
// 转发到 Beam serverless GPU(无状态「字节→PNG」端点),成功后扣积分。
//
// 方案 X 关键点:
//   · 付费单图 = 同步:浏览器 → 本 Worker → Beam → 返回 PNG(内存不落盘)。
//   · 冷启动用 /v1/prewarm 在前端「选图即 ping」藏进上传窗口。
//   · 大文件 / 批量 = 走 R2 异步直传(Phase 2,本文件暂不含)。
//   · 登录用户【不设每日免费 GPU 额度】(免费走匿名 CPU);每张成功都扣分。注册送 100。
//
// 端点:
//   GET  /auth/me                登录态 + 账户(首登懒初始化 + 发注册积分)
//   GET  /credits/balance        余额
//   GET  /credits/ledger         积分流水
//   POST /checkout               创建 Stripe Checkout Session
//   POST /webhooks/stripe         Stripe webhook(签名校验 + 幂等入账)
//   POST /v1/prewarm             预热 Beam(触发冷启动,立即返回 202)
//   POST /v1/remove-background   付费单图:校验余额 → 转发 Beam → 成功扣分
//
// 依赖(wrangler vars / secrets,见 wrangler.toml + README):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_*
//   BEAM_ENDPOINT(vars), BEAM_TOKEN(secret)
//   CORS_ALLOW_ORIGIN,(可选)SIGNUP_BONUS, MAX_SYNC_UPLOAD_MB, BEAM_TIMEOUT_MS
// =============================================================================

// ----- 可配置默认值(env 可覆盖)------------------------------------------
const DEFAULTS = {
  SIGNUP_BONUS: 100, // 注册赠送积分(决策:注册送 100;仅已验证邮箱 / OAuth)
  DAILY_FREE_QUOTA: 0, // GPU 付费路径不设每日免费额度(免费走匿名 CPU)
  MAX_SYNC_UPLOAD_MB: 25, // 同步单图上限,安全低于 CF 100MB;更大走 R2 异步(Phase 2)
};

// 单图各档消耗(profile 来自前端 query;fast=1, fur=2)
const CREDIT_COST = { fast: 1, fur: 2 };
// 旧值兼容:线上 sharp → fast
const PROFILE_ALIASES = { sharp: "fast" };

// 批量(Phase 2):单批上限 + R2 预签名有效期(秒)
const MAX_BATCH_IMAGES = 200;
const PRESIGN_EXPIRES = 3600;

// SKU → {credits, priceEnv}。积分数固定在服务端,Stripe priceId 从 env 读取。
const SKU_TABLE = {
  starter_100: { credits: 100, priceEnv: "STRIPE_PRICE_STARTER_100" },
  creator_500: { credits: 500, priceEnv: "STRIPE_PRICE_CREATOR_500" },
  seller_1500: { credits: 1500, priceEnv: "STRIPE_PRICE_SELLER_1500" },
  studio_5000: { credits: 5000, priceEnv: "STRIPE_PRICE_STUDIO_5000" },
};

const STRIPE_API = "https://api.stripe.com/v1";

// =============================================================================
// 入口
// =============================================================================
export default {
  async fetch(request, env, ctx) {
    const cors = buildCorsHeaders(env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      // Stripe webhook 必须先于鉴权,且用原始 body 验签
      if (path === "/webhooks/stripe" && request.method === "POST") {
        return await handleStripeWebhook(request, env, cors);
      }

      if (path === "/auth/me" && request.method === "GET") {
        return await handleAuthMe(request, env, cors);
      }
      if (path === "/credits/balance" && request.method === "GET") {
        return await handleBalance(request, env, cors);
      }
      if (path === "/credits/ledger" && request.method === "GET") {
        return await handleLedger(request, env, url, cors);
      }
      if (path === "/checkout" && request.method === "POST") {
        return await handleCheckout(request, env, cors);
      }
      if (path === "/v1/prewarm" && request.method === "POST") {
        return await handlePrewarm(request, env, ctx, cors);
      }
      if (path === "/v1/remove-background" && request.method === "POST") {
        return await handleRemoveBackground(request, env, url, cors);
      }

      // 批量(Phase 2)
      if (path === "/v1/batch" && request.method === "POST") {
        return await handleBatchCreate(request, env, ctx, cors);
      }
      // 内部回调: Beam 批量处理完
      if (url.pathname === "/internal/batch-callback" && request.method === "POST") {
        return handleBatchCallback(request, env, ctx, cors);
      }
      
      // 内部隧道: Beam GPU 节点经过 Cloudflare 骨干网快速上传/下载 R2
      if (url.pathname.startsWith("/internal/r2/")) {
        return handleInternalR2Tunnel(request, env, cors);
      }

      const mStart = path.match(/^\/v1\/batch\/([0-9a-fA-F-]{36})\/start$/);
      if (mStart && request.method === "POST") {
        return await handleBatchStart(request, env, mStart[1], cors);
      }
      const mStatus = path.match(/^\/v1\/batch\/([0-9a-fA-F-]{36})$/);
      if (mStatus && request.method === "GET") {
        return await handleBatchStatus(request, env, mStatus[1], cors);
      }

      return json({ error: "not_found" }, 404, cors);
    } catch (err) {
      console.error("pro-gateway error:", err?.stack || err?.message || err);
      return json({ error: "internal_error" }, 500, cors);
    }
  },
};

// =============================================================================
// 鉴权:Supabase access token (JWT, HS256) 校验
// =============================================================================
async function requireUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return { error: json_401() };

  let claims = await verifyJwtHS256(m[1], env.SUPABASE_JWT_SECRET);
  if (!claims) {
    // 兼容新版 ES256/RS256: 调用 Supabase API 验证 Token
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: auth,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    if (!res.ok) return { error: json_401() };
    const user = await res.json();
    return {
      authUserId: user.id,
      email: user.email || null,
      emailVerified:
        user.email_confirmed_at != null ||
        user.app_metadata?.provider === "google" ||
        false,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && claims.exp < now) return { error: json_401() };
  if (!claims.sub) return { error: json_401() };

  return {
    authUserId: claims.sub,
    email: claims.email || null,
    // Supabase 在 user_metadata / app_metadata 里带验证态;email confirmed 时通常有
    emailVerified:
      claims.email_verified === true ||
      claims.user_metadata?.email_verified === true ||
      (typeof claims.email_confirmed_at === "string" && claims.email_confirmed_at.length > 0) ||
      claims.app_metadata?.provider === "google" ||
      false,
  };
}

function json_401() {
  return { status: 401, body: { error: "unauthorized" } };
}

// HS256 JWT 验签 + 解析。返回 payload 对象,失败返回 null。
async function verifyJwtHS256(token, secret) {
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlToBytes(s),
      new TextEncoder().encode(`${h}.${p}`),
    );
    if (!ok) return null;
    return JSON.parse(new TextDecoder().decode(base64urlToBytes(p)));
  } catch {
    return null;
  }
}

// =============================================================================
// 账户聚合:取/建用户
// =============================================================================
async function getOrCreateAccount(user, env) {
  let acct = await rpc(env, "get_account", { p_auth_user_id: user.authUserId });
  if (!acct) {
    await rpc(env, "ensure_user", {
      p_auth_user_id: user.authUserId,
      p_email: user.email,
      p_email_verified: user.emailVerified,
      p_signup_bonus: readInt(env.SIGNUP_BONUS, DEFAULTS.SIGNUP_BONUS),
    });
    acct = await rpc(env, "get_account", { p_auth_user_id: user.authUserId });
  }
  return acct; // {user_id, email, plan, subscription_credits, topup_credits, daily_used}
}

// =============================================================================
// Handlers:账户 / 积分 / 支付（与 Phase 0 一致，未改）
// =============================================================================
async function handleAuthMe(request, env, cors) {
  const u = await requireUser(request, env);
  if (u.error) return json(u.error.body, u.error.status, cors);

  const acct = await getOrCreateAccount(u, env);
  const quota = readInt(env.DAILY_FREE_QUOTA, DEFAULTS.DAILY_FREE_QUOTA);
  return json(
    {
      user_id: acct.user_id,
      email: acct.email,
      plan: acct.plan,
      credits: {
        subscription: acct.subscription_credits,
        topup: acct.topup_credits,
        total: acct.subscription_credits + acct.topup_credits,
      },
      daily_free_quota: quota,
      daily_free_left: Math.max(0, quota - acct.daily_used),
    },
    200,
    cors,
  );
}

async function handleBalance(request, env, cors) {
  const u = await requireUser(request, env);
  if (u.error) return json(u.error.body, u.error.status, cors);

  const acct = await getOrCreateAccount(u, env);
  const quota = readInt(env.DAILY_FREE_QUOTA, DEFAULTS.DAILY_FREE_QUOTA);
  return json(
    {
      subscription: acct.subscription_credits,
      topup: acct.topup_credits,
      total: acct.subscription_credits + acct.topup_credits,
      daily_free_left: Math.max(0, quota - acct.daily_used),
    },
    200,
    cors,
  );
}

async function handleLedger(request, env, url, cors) {
  const u = await requireUser(request, env);
  if (u.error) return json(u.error.body, u.error.status, cors);

  const acct = await getOrCreateAccount(u, env);
  const limit = Math.min(Math.max(readInt(url.searchParams.get("limit"), 50), 1), 200);
  const rows = await supabaseSelect(
    env,
    `credit_ledger?user_id=eq.${acct.user_id}&order=created_at.desc&limit=${limit}` +
      `&select=delta,bucket,reason,ref,balance_after,created_at`,
  );
  return json({ ledger: rows || [] }, 200, cors);
}

async function handleCheckout(request, env, cors) {
  const u = await requireUser(request, env);
  if (u.error) return json(u.error.body, u.error.status, cors);

  const body = await request.json().catch(() => ({}));
  const sku = String(body.sku || "");
  const entry = SKU_TABLE[sku];
  if (!entry) return json({ error: "invalid_sku" }, 400, cors);

  const priceId = env[entry.priceEnv];
  if (!priceId) return json({ error: "price_not_configured", sku }, 500, cors);

  const acct = await getOrCreateAccount(u, env);

  const params = {
    mode: "payment",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url:
      env.CHECKOUT_SUCCESS_URL || "https://miaocut.app/account/credits/?status=success",
    cancel_url: env.CHECKOUT_CANCEL_URL || "https://miaocut.app/pricing/?status=cancel",
    client_reference_id: acct.user_id,
    "metadata[user_id]": acct.user_id,
    "metadata[sku]": sku,
    "metadata[credits]": String(entry.credits),
    "payment_method_types[0]": "card",
    "payment_method_types[1]": "alipay",
    "payment_method_types[2]": "wechat_pay",
    "payment_method_options[wechat_pay][client]": "web",
    "automatic_tax[enabled]": "true",
  };

  const res = await stripeRequest(env, "/checkout/sessions", params);
  if (!res.ok) {
    console.error("stripe checkout failed:", res.status, res.text);
    return json({ error: "stripe_error" }, 502, cors);
  }
  return json({ url: res.json.url, id: res.json.id }, 200, cors);
}

async function handleStripeWebhook(request, env, cors) {
  const sig = request.headers.get("stripe-signature") || "";
  const raw = await request.text();

  const valid = await verifyStripeSignature(raw, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return json({ error: "bad_signature" }, 400, cors);

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "bad_payload" }, 400, cors);
  }

  if (event.type !== "checkout.session.completed") {
    return json({ received: true }, 200, cors); // 忽略其它事件
  }

  const session = event.data?.object || {};
  if (session.payment_status !== "paid") {
    return json({ received: true }, 200, cors);
  }

  const userId = session.metadata?.user_id || session.client_reference_id;
  const sku = session.metadata?.sku;
  const entry = SKU_TABLE[sku];
  if (!userId || !entry) {
    console.error("webhook missing user/sku", { userId, sku });
    return json({ received: true }, 200, cors); // 不重试,避免风暴
  }

  // 幂等:先插 orders(provider_ref = session.id 唯一)。冲突 → 已处理。
  const inserted = await supabaseInsert(env, "orders", {
    user_id: userId,
    provider: "stripe",
    provider_ref: session.id,
    sku,
    amount_cents: session.amount_total ?? null,
    currency: session.currency ?? null,
    credits: entry.credits,
    status: "paid",
  });

  if (inserted.conflict) {
    return json({ received: true, idempotent: true }, 200, cors);
  }
  if (!inserted.ok) {
    console.error("order insert failed:", inserted.status, inserted.text);
    return json({ error: "order_insert_failed" }, 500, cors); // Stripe 会重试
  }

  await rpc(env, "grant_topup", {
    p_user: userId,
    p_credits: entry.credits,
    p_ref: session.id,
  });

  return json({ received: true }, 200, cors);
}

// =============================================================================
// 付费单图:预热 + 推理（转发 Beam）
// =============================================================================

// 预热:任何请求到达 Beam 端点都会拉起 GPU 容器并跑 on_start 加载模型。
// 这里打一下 /healthz 触发冷启动,用 waitUntil 让请求在后台真正发出去,立即返回 202,
// 前端可在「用户选图」时调用,把冷启动藏进随后的上传窗口里。
async function handlePrewarm(request, env, ctx, cors) {
  const u = await requireUser(request, env);
  if (u.error) return json(u.error.body, u.error.status, cors); // 需登录,防滥用空烧 GPU
  if (!env.BEAM_ENDPOINT) return json({ error: "beam_not_configured" }, 500, cors);

  const endpoint = String(env.BEAM_ENDPOINT).replace(/\/+$/, "");
  const warm = fetch(`${endpoint}/healthz`, {
    method: "GET",
    headers: env.BEAM_TOKEN ? { Authorization: `Bearer ${env.BEAM_TOKEN}` } : {},
  }).catch(() => {});
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(warm);

  return json({ warming: true }, 202, cors);
}

async function handleRemoveBackground(request, env, url, cors) {
  const u = await requireUser(request, env);
  if (u.error) return json(u.error.body, u.error.status, cors);
  if (!env.BEAM_ENDPOINT) return json({ error: "beam_not_configured" }, 500, cors);

  // profile 归一:sharp→fast;非法/缺失→fast
  let profile = (url.searchParams.get("profile") || "fast").toLowerCase();
  profile = PROFILE_ALIASES[profile] || profile;
  if (!(profile in CREDIT_COST)) profile = "fast";
  const cost = CREDIT_COST[profile];

  // 同步路径只服务小图;大图 / 批量走 R2 异步(Phase 2)。先看 Content-Length 预拒。
  const maxBytes = readInt(env.MAX_SYNC_UPLOAD_MB, DEFAULTS.MAX_SYNC_UPLOAD_MB) * 1024 * 1024;
  const declaredLen = Number(request.headers.get("content-length") || 0);
  if (declaredLen && declaredLen > maxBytes) {
    return json(
      { error: "payload_too_large", message: "use the async R2 path for large/batch uploads", max_bytes: maxBytes },
      413,
      cors,
    );
  }

  // 余额校验(登录用户无每日免费额度:每张成功都扣分)
  const acct = await getOrCreateAccount(u, env);
  const balance = acct.subscription_credits + acct.topup_credits;
  if (balance < cost) {
    return json(
      { error: "insufficient_credits", balance, needed: cost },
      402,
      cors,
      { "X-Credits-Balance": String(balance) },
    );
  }

  // 缓冲 body(再次兜底实际大小,防伪造 Content-Length)
  const bodyBuffer = await request.arrayBuffer();
  if (bodyBuffer.byteLength > maxBytes) {
    return json(
      { error: "payload_too_large", message: "use the async R2 path for large/batch uploads", max_bytes: maxBytes },
      413,
      cors,
    );
  }

  // 转发到 Beam(无状态字节→PNG)
  const upstream = await forwardToBeam(env, profile, bodyBuffer, request.headers.get("content-type"));
  if (!upstream.response) {
    return json({ error: "upstream_unavailable", detail: upstream.error }, 502, cors);
  }

  const status = upstream.response.status;
  const respHeaders = new Headers(upstream.response.headers);
  applyCors(respHeaders, cors);

  // 仅成功(200)才扣分;失败(含 4xx/5xx、冷启动 503)不扣
  let charged = 0;
  let newBalance = balance;
  if (status === 200) {
    const reqId = upstream.response.headers.get("X-Request-Id") || crypto.randomUUID();
    const result = await rpc(env, "consume_credits", {
      p_user: acct.user_id,
      p_amount: cost,
      p_reason: "consume",
      p_ref: reqId, // Phase 1 幂等用 request_id 作 ledger ref
    });
    if (result === "ok") {
      charged = cost;
      newBalance = balance - cost;
    }
    // result === 'insufficient' 理论不会到这(前面已校验);保守不扣、照常返回图
  }

  respHeaders.set("X-Profile-Used", profile);
  respHeaders.set("X-Credits-Charged", String(charged));
  respHeaders.set("X-Credits-Balance", String(newBalance));

  return new Response(upstream.response.body, {
    status,
    statusText: upstream.response.statusText,
    headers: respHeaders,
  });
}

// 转发到 Beam 端点。单端点(Beam 自己横向扩缩,无需多 host failover)。
// 容忍冷启动:超时给足;Beam 若返回 503(model_loading)重试一次。
async function forwardToBeam(env, profile, bodyBuffer, contentType) {
  const endpoint = String(env.BEAM_ENDPOINT).replace(/\/+$/, "");
  const target = `${endpoint}/v1/remove-background?profile=${encodeURIComponent(profile)}`;
  const timeoutMs = readInt(env.BEAM_TIMEOUT_MS, 60000); // 容忍冷启动(容器+模型加载)
  const headers = {};
  if (env.BEAM_TOKEN) headers.Authorization = `Bearer ${env.BEAM_TOKEN}`;
  if (contentType) headers["Content-Type"] = contentType;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
    try {
      const res = await fetch(target, {
        method: "POST",
        headers,
        body: bodyBuffer,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status === 503 && attempt === 0) {
        // 冷启动未就绪,放掉 body,稍候重试一次
        await res.body?.cancel().catch(() => {});
        await sleep(1500);
        continue;
      }
      return { response: res };
    } catch (err) {
      clearTimeout(timer);
      if (attempt === 0) {
        await sleep(500);
        continue;
      }
      return { error: err?.message || "fetch_error" };
    }
  }
  return { error: "exhausted" };
}

// =============================================================================
// 批量（Phase 2）:建任务 + 预签名上传 / 开始(冻结+入队 Beam) / 状态 / Beam 回调
// =============================================================================
// POST /v1/batch —— 建 job + N 条 job_images（不冻结），返回每图的 R2 预签名 PUT URL。
async function handleBatchCreate(request, env, ctx, cors) {
  const u = await requireUser(request, env);
  if (u.error) return json(u.error.body, u.error.status, cors);
  if (!env.R2_ENDPOINT || !env.R2_BUCKET) return json({ error: "r2_not_configured" }, 500, cors);

  const body = await request.json().catch(() => ({}));
  let profile = String(body.profile || "fast").toLowerCase();
  profile = PROFILE_ALIASES[profile] || profile;
  if (!(profile in CREDIT_COST)) profile = "fast";
  const cost = CREDIT_COST[profile];

  const files = Array.isArray(body.files) ? body.files : [];
  if (files.length === 0) return json({ error: "no_files" }, 400, cors);
  if (files.length > MAX_BATCH_IMAGES) {
    return json({ error: "too_many_images", max: MAX_BATCH_IMAGES }, 400, cors);
  }

  const acct = await getOrCreateAccount(u, env);
  const totalCost = files.length * cost;
  const balance = acct.subscription_credits + acct.topup_credits;
  // 软校验（此刻不冻结；点 start 才冻结）。余额不足先提示充值。
  if (balance < totalCost) {
    return json({ error: "insufficient_credits", balance, needed: totalCost }, 402, cors);
  }

  const job = await rpc(env, "create_batch_job", {
    p_user: acct.user_id,
    p_profile: profile,
    p_cost: cost,
    p_files: files.map((f) => ({ name: String(f.name || "image") })),
  });
  if (!job || !job.job_id) return json({ error: "create_failed" }, 500, cors);

  const uploads = [];
  for (const im of job.images) {
    uploads.push({
      image_id: im.image_id,
      orig_filename: im.orig_filename,
      input_key: im.input_key,
      put_url: await presignR2(env, "PUT", im.input_key, PRESIGN_EXPIRES),
    });
  }

  // 严谨预热节流逻辑 (使用 CF KV)
  if (ctx && typeof ctx.waitUntil === "function" && env.MIAOCUT_STATE) {
    ctx.waitUntil((async () => {
      try {
        const now = Date.now();
        const [lastActiveStr, lastWarmupStr] = await Promise.all([
          env.MIAOCUT_STATE.get("beam_last_active_at"),
          env.MIAOCUT_STATE.get("beam_last_warmup_at")
        ]);
        const lastActive = parseInt(lastActiveStr || "0", 10);
        const lastWarmup = parseInt(lastWarmupStr || "0", 10);

        // 如果过去55秒内有任务完成，说明Beam热着 (keep_warm_seconds=60)
        if (now - lastActive < 55000) return;
        // 如果过去15秒内下发过预热指令，说明别人刚刚触发过了，正在拉起，跳过防并发
        if (now - lastWarmup < 15000) return;

        // 记录此次预热
        await env.MIAOCUT_STATE.put("beam_last_warmup_at", now.toString());
        
        // 下发请求
        await enqueueBeamBatch(env, {
          job_id: "warmup",
          image_id: "warmup",
          input_key: "warmup",
          output_key: "warmup",
          dl_url: "warmup",
          up_url: "warmup",
          profile: "fast"
        });
      } catch (e) {
        console.error("warmup error:", e);
      }
    })());
  }

  return json(
    { job_id: job.job_id, profile, cost_per_image: cost, total_cost: totalCost, expires_in: PRESIGN_EXPIRES, uploads },
    200,
    cors,
  );
}

// POST /v1/batch/{id}/start —— 客户端上传完 → 冻结整批积分 + 入队 Beam Task Queue。
async function handleBatchStart(request, env, jobId, cors) {
  const u = await requireUser(request, env);
  if (u.error) return json(u.error.body, u.error.status, cors);
  const acct = await getOrCreateAccount(u, env);

  const rows = await supabaseSelect(
    env,
    `jobs?id=eq.${jobId}&user_id=eq.${acct.user_id}&select=id,profile,total_images,status`,
  );
  const job = rows && rows[0];
  if (!job) return json({ error: "not_found" }, 404, cors);
  if (job.status !== "pending") return json({ error: "already_started", status: job.status }, 409, cors);

  // 冻结整批积分（原子）
  const fr = await rpc(env, "freeze_batch", { p_job: jobId });
  if (fr === "insufficient") return json({ error: "insufficient_credits" }, 402, cors);
  if (fr !== "ok") return json({ error: "freeze_failed", detail: fr }, 409, cors);

  // 入队:每图一个 task。入队失败的图当即释放其冻结积分，避免锁死。
  const images = await supabaseSelect(env, `job_images?job_id=eq.${jobId}&select=id,input_key,output_key`);
  let enqueued = 0;
  for (const im of images || []) {
    const ok = await enqueueBeamBatch(env, {
      job_id: jobId,
      image_id: im.id,
      input_key: im.input_key,
      output_key: im.output_key,
      dl_url: await presignR2(env, "GET", im.input_key, 3600),
      up_url: await presignR2(env, "PUT", im.output_key, 3600),
      profile: job.profile,
    });
    if (ok) {
      enqueued++;
    } else {
      await rpc(env, "complete_batch_image", {
        p_image: im.id, p_status: "failed", p_output_key: null, p_error: "enqueue_failed",
      });
    }
  }

  return json({ status: "processing", total: job.total_images, enqueued }, 200, cors);
}

// GET /v1/batch/{id} —— 进度 + 已完成图的下载预签名 URL。过期自动兜底释放冻结。
async function handleBatchStatus(request, env, jobId, cors) {
  const u = await requireUser(request, env);
  if (u.error) return json(u.error.body, u.error.status, cors);
  const acct = await getOrCreateAccount(u, env);

  const sel = `id,profile,status,total_images,succeeded,failed,expires_at`;
  let rows = await supabaseSelect(env, `jobs?id=eq.${jobId}&user_id=eq.${acct.user_id}&select=${sel}`);
  let job = rows && rows[0];
  if (!job) return json({ error: "not_found" }, 404, cors);

  // 超时兜底:processing 但已过 expires_at → 释放未完成冻结积分，任务收尾
  if (job.status === "processing" && job.expires_at && Date.parse(job.expires_at) < Date.now()) {
    await rpc(env, "expire_batch", { p_job: jobId });
    rows = await supabaseSelect(env, `jobs?id=eq.${jobId}&select=${sel}`);
    job = (rows && rows[0]) || job;
  }

  const imgs = await supabaseSelect(
    env,
    `job_images?job_id=eq.${jobId}&order=idx.asc&select=id,idx,orig_filename,output_key,status,error`,
  );
  const images = [];
  for (const im of imgs || []) {
    const row = { image_id: im.id, idx: im.idx, filename: im.orig_filename, status: im.status };
    if (im.status === "done" && im.output_key) {
      row.download_url = await presignR2(env, "GET", im.output_key, PRESIGN_EXPIRES);
    } else if (im.status === "failed") {
      row.error = im.error;
    }
    images.push(row);
  }

  if (job.status === "done" && env.MIAOCUT_STATE) {
    // 任务全部完成时更新活跃时间（客户端拿到 done 后即停止轮询，只会触发一次）
    await env.MIAOCUT_STATE.put("beam_last_active_at", Date.now().toString());
  }

  return json(
    {
      job_id: job.id, profile: job.profile, status: job.status,
      total: job.total_images, succeeded: job.succeeded, failed: job.failed,
      done: job.status === "done", images,
    },
    200,
    cors,
  );
}

// =============================================================================
// Beam Worker 内部路由处理器
// =============================================================================

// R2 网络边缘隧道：接收 Beam 的读写请求直连 R2，走骨干网，避免 Boto3 V4 签名消耗
async function handleInternalR2Tunnel(request, env, cors) {
  if (request.headers.get("x-batch-secret") !== env.BATCH_CALLBACK_SECRET) {
    return json({ error: "unauthorized" }, 401, cors);
  }
  
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return json({ error: "missing key" }, 400, cors);
  }

  // Beam Worker 下载
  if (url.pathname === "/internal/r2/download" && request.method === "GET") {
    const object = await env.BATCH_BUCKET.get(key);
    if (object === null) {
      return new Response("Object Not Found", { status: 404 });
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    return new Response(object.body, { headers });
  }

  // Beam Worker 上传
  if (url.pathname === "/internal/r2/upload" && request.method === "PUT") {
    await env.BATCH_BUCKET.put(key, request.body, {
      httpMetadata: { contentType: request.headers.get("Content-Type") || "image/png" }
    });
    return json({ ok: true }, 200, cors);
  }

  return json({ error: "not found" }, 404, cors);
}

// POST /internal/batch-callback ——// Beam 回调：每处理完一张图回调一次。扣分（单张）并更新状态。
async function handleBatchCallback(request, env, ctx, cors) {
  if (request.headers.get("x-batch-secret") !== env.BATCH_CALLBACK_SECRET) {
    return json({ error: "unauthorized" }, 401, cors);
  }
  const body = await request.json().catch(() => ({}));
  const image_id = String(body.image_id || "");
  const status = String(body.status || "");
  const output_key = body.output_key;
  const error = body.error;

  if (!image_id || (status !== "done" && status !== "failed")) {
    return json({ error: "bad_request" }, 400, cors);
  }

  // 更新 Supabase：如果处理失败，依然扣分（按现有逻辑），但更新为 failed 状态。
  const r = await rpc(env, "complete_batch_image", {
    p_image: image_id,
    p_status: status === "done" ? "done" : "failed",
    p_output_key: output_key || null,
    p_error: error || null,
  });

  return json({ ok: r === "ok" }, 200, cors);
}

// 入队到 Beam Task Queue(HTTP):POST 任务 kwargs 即入队。⚠️ 入队 body 格式以 Beam 文档为准。
async function enqueueBeamBatch(env, args) {
  if (!env.BEAM_BATCH_URL) return false;
  try {
    const res = await fetch(env.BEAM_BATCH_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.BEAM_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) console.error("beam enqueue failed:", res.status);
    return res.ok;
  } catch (e) {
    console.error("beam enqueue error:", e?.message || e);
    return false;
  }
}

// =============================================================================
// R2 预签名 URL（AWS SigV4 query 授权，Web Crypto 实现，无第三方依赖）
//   PUT = 客户端直传输入；GET = 客户端下载输出。绕过 Worker，不受 CF 100MB 限制。
// =============================================================================
async function presignR2(env, method, key, expiresSec) {
  const endpoint = String(env.R2_ENDPOINT).replace(/\/+$/, ""); // https://<acct>.r2.cloudflarestorage.com
  const host = new URL(endpoint).host;
  const region = "auto";
  const service = "s3";
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""); // 20240101T000000Z
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalUri = `/${env.R2_BUCKET}/${key.split("/").map(rfc3986).join("/")}`;
  const signedHeaders = "host";

  const canonicalQuery = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${env.R2_ACCESS_KEY_ID}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(expiresSec)],
    ["X-Amz-SignedHeaders", signedHeaders],
  ]
    .map(([k, v]) => [rfc3986(k), rfc3986(v)])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const canonicalRequest = [
    method, canonicalUri, canonicalQuery, `host:${host}\n`, signedHeaders, "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");

  const kDate = await hmacBytes(new TextEncoder().encode("AWS4" + env.R2_SECRET_ACCESS_KEY), dateStamp);
  const kRegion = await hmacBytes(kDate, region);
  const kService = await hmacBytes(kRegion, service);
  const kSigning = await hmacBytes(kService, "aws4_request");
  const signature = bytesToHex(await hmacBytes(kSigning, stringToSign));

  return `${endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function rfc3986(str) {
  return encodeURIComponent(str).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
async function sha256Hex(msg) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
  return bytesToHex(new Uint8Array(buf));
}
async function hmacBytes(keyBytes, msg) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}

// =============================================================================
// Supabase REST helpers(service_role,绕过 RLS;用户隔离由网关按 user_id 保证)
// =============================================================================
function supabaseHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function rpc(env, fn, args) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: supabaseHeaders(env),
    body: JSON.stringify(args || {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`rpc ${fn} failed:`, res.status, text);
    return null;
  }
  return res.json().catch(() => null);
}

async function supabaseSelect(env, query) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${query}`, {
    method: "GET",
    headers: supabaseHeaders(env),
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

// 返回 {ok, conflict, status, text}
async function supabaseInsert(env, table, row) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: supabaseHeaders(env, { Prefer: "return=minimal" }),
    body: JSON.stringify(row),
  });
  if (res.ok) return { ok: true };
  const text = await res.text().catch(() => "");
  // 23505 = unique_violation(幂等命中)
  if (res.status === 409 || text.includes("23505")) return { conflict: true };
  return { ok: false, status: res.status, text };
}

// =============================================================================
// Stripe helpers
// =============================================================================
async function stripeRequest(env, pathname, params) {
  const res = await fetch(`${STRIPE_API}${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeForm(params),
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep raw text */
  }
  return { ok: res.ok, status: res.status, json: parsed, text };
}

// Stripe 签名校验:header "t=<ts>,v1=<sig>";HMAC-SHA256(`${t}.${payload}`) hex
async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!secret || !sigHeader) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i), kv.slice(i + 1)];
    }),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;

  // 防重放:5 分钟容差
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(t)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const expected = bytesToHex(new Uint8Array(mac));
  return timingSafeEqual(expected, v1);
}

// =============================================================================
// 工具
// =============================================================================
function buildCorsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.CORS_ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    // 让浏览器能读到扣分 / 档位头
    "Access-Control-Expose-Headers":
      "X-Credits-Charged,X-Credits-Balance,X-Profile-Used,X-Processing-Ms,X-Request-Id",
    "Access-Control-Max-Age": "86400",
  };
}

function applyCors(headers, cors) {
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
}

function json(body, status, cors, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, ...extra, "Content-Type": "application/json; charset=utf-8" },
  });
}

function encodeForm(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

function readInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function base64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToHex(bytes) {
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
