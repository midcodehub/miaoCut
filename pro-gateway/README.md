# MiaoCut Pro 网关 (`pro-api.miaocut.app`)

独立的付费侧网关:鉴权 / 积分 / 支付 / 账户 + 付费单图守门。与免费网关
(`api2.miaocut.app` = `scripts/cloudflare-hf-gateway-worker.js`)**物理隔离**,免费网关一字不改。

**方案 X / Phase 1**:付费单图 = 同步 `浏览器 → 本网关 → Beam(GPU)→ 返回 PNG`,成功才扣分;
冷启动用 `/v1/prewarm` 在前端「选图即 ping」藏进上传窗口。大文件 / 批量走 R2 异步(Phase 2)。

设计文档:`docs/feature-pro-design.md`、`docs/feature-pro-phase1.md`、`docs/feature-pro-gpu-service.md`。
Beam 推理服务:`pro-gpu/`。

## 目录

```
pro-gateway/
├── src/index.js        # Worker:路由 + JWT 校验 + 账户/积分/支付 + 转发 Beam
├── db/schema.sql       # Supabase 建表 + RPC + RLS(可直接运行)
├── wrangler.toml       # 配置(vars 明文 + secrets 占位说明)
└── README.md
```

## 端点

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/auth/me` | Bearer JWT | 登录态 + 账户;首登懒初始化 + 发注册积分(100) |
| GET | `/credits/balance` | Bearer JWT | 余额 |
| GET | `/credits/ledger?limit=50` | Bearer JWT | 积分流水 |
| POST | `/checkout` | Bearer JWT | body `{sku}` → 返回 Stripe Checkout `{url}` |
| POST | `/webhooks/stripe` | Stripe 签名 | 幂等入账 |
| POST | `/v1/prewarm` | Bearer JWT | 预热 Beam(触发冷启动,立即 202) |
| POST | `/v1/remove-background?profile=fast\|fur` | Bearer JWT | 付费单图:校验余额 → 转发 Beam → 成功扣分 |

`/v1/remove-background` body = 图片(raw 或 multipart `image`);成功返回 `image/png` +
头 `X-Profile-Used` / `X-Credits-Charged` / `X-Credits-Balance`。
错误:`401` 未登录、`402` 余额不足 `{balance,needed}`、`413` 超 `MAX_SYNC_UPLOAD_MB`(改走 R2 异步)、`502` Beam 不可用。

SKU:`starter_100 / creator_500 / seller_1500 / studio_5000`(积分数固定在服务端)。

## 部署步骤

### 1. Supabase
1. 新建 Supabase 项目。
2. SQL Editor 执行 `db/schema.sql`(建表 + RPC + RLS)。
3. 记下:`Project URL`、`service_role` key(Settings → API)、`JWT secret`(Settings → API → JWT)。
4. Auth → Providers 开启 Email(magic link)与 Google。

> 注:本网关用 HS256 校验 Supabase access token。若项目启用了**非对称 JWT 签名**(ES256/RS256),
> 需把 `verifyJwtHS256` 换成 JWKS 校验。确认方式见 Supabase → Settings → API → JWT Settings。

### 2. Beam(GPU 推理)
1. 部署 `pro-gpu/`(见其 README):`beam run app.py:download` 预热权重 → `beam deploy app.py:web_server`。
2. 记下 Beam 端点 URL 和 token。

### 3. Stripe
1. 创建 4 个**一次性** Price(对应 4 个 SKU),记下 `price_...` ID。
2. Dashboard → Settings → Tax 开启 **Stripe Tax**(`automatic_tax`)。
3. 启用支付方式:Card、Alipay、WeChat Pay。
4. 创建 webhook 指向 `https://pro-api.miaocut.app/webhooks/stripe`,订阅 `checkout.session.completed`,记下 `whsec_...`。

### 4. 配置与部署
```bash
cd pro-gateway

# 明文变量改 wrangler.toml(SUPABASE_URL、BEAM_ENDPOINT、CORS_ALLOW_ORIGIN、定价跳转等)

# 写入 secrets
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put SUPABASE_JWT_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put BEAM_TOKEN                # Beam 端点鉴权 token
wrangler secret put STRIPE_PRICE_STARTER_100  # price_...
wrangler secret put STRIPE_PRICE_CREATOR_500
wrangler secret put STRIPE_PRICE_SELLER_1500
wrangler secret put STRIPE_PRICE_STUDIO_5000

# 部署
wrangler deploy

# 在 Cloudflare 绑定自定义域 pro-api.miaocut.app
```

## 计费规则(Phase 1)

- 匿名用户走免费网关(api2 → HF CPU),**不到本网关**。
- 登录用户:**无每日免费 GPU 额度**;每张成功 = `fast` 1 / `fur` 2 积分(注册送 100 当试用额度)。
- **失败不扣**:仅 Beam 返回 200 才扣分(含冷启动 503、4xx/5xx 都不扣)。
- 充值入账**幂等**:`orders.provider_ref = Stripe session.id` 唯一约束兜底。
- 扣减原子:`consume_credits` 行锁,先扣会员积分再扣充值积分。幂等暂用 `request_id` 作 ledger `ref`。

## 待提供

- Beam 端点 URL + token、Stripe / Supabase 账号与密钥、4 个充值包定价。

## 本地联调

`wrangler dev` 本地起 Worker;Supabase/Stripe 用各自 test 环境。
Stripe webhook 本地用 `stripe listen --forward-to localhost:8787/webhooks/stripe`。
