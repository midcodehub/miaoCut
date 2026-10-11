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

## 计费规则(2026-10 更新)

- **单图一律免费**:无论是否登录都走免费网关(api2 → HF CPU),不扣积分。
  本网关的 `/v1/remove-background`(付费单图 GPU)仍保留,前端暂未使用,留给以后的「单图高清」。
- **积分只用于批量**:每张成功 = `fast` 1 / `fur` 2 积分;冻结 → 成功结算 → 失败释放。
- **注册送 100 积分**,同时满足才发:邮箱已验证(邮箱登录链接或 Google)、不是一次性邮箱、
  同一 IP 当天未超过 `SIGNUP_BONUS_PER_IP_DAILY`(默认 3)、同一邮箱的别名(Gmail 点 / +后缀)没领过。
- 充值入账**幂等**:`orders.provider_ref = Stripe session.id` 唯一约束兜底。
- **退款 / 争议**:`charge.refunded` 按退款比例扣回,`charge.dispute.created` 扣回该订单剩余全部;
  幂等(`orders.credits_revoked`),余额最多扣到 0,扣不回的部分记日志 `credit reversal shortfall` 人工跟进。
- 扣减原子:`consume_credits` 行锁,先扣会员积分再扣充值积分。

## ⚠️ 上线加固(2026-10-11)部署顺序

1. **先**在 Supabase SQL Editor 执行 `db/migrations/2026-10-11-launch-hardening.sql`(可重复执行)。
   - 收回所有数据库函数的公开执行权限(之前任何人用页面里的公开 key 都能直接调用 `grant_topup` 加积分)
   - 修复注册积分 bug、加邮箱别名防薅、新增退款扣回函数
2. **再**部署 Worker:`wrangler deploy`(生产 CORS 已收紧为 miaocut.app 白名单)。
   顺序反了的话,新用户注册和充值回调会因为找不到新函数 / 新列而报错。
3. Stripe Dashboard → Webhooks → 该端点**追加订阅** `charge.refunded`、`charge.dispute.created` 两个事件。
4. 验证漏洞已修复(应返回 401 / 403 / 404 之类的权限错误,而不是 200):

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST "$SUPABASE_URL/rest/v1/rpc/get_account" \
     -H "apikey: <页面里的 publishable key>" -H "Content-Type: application/json" \
     -d '{"p_auth_user_id":"00000000-0000-0000-0000-000000000000"}'
   ```

## 月度订阅(2026-10-12)上线顺序

规则见 `db/migrations/2026-10-12-subscriptions.sql` 顶部注释:三档 Basic 300 / Pro 1500 / Business 5000 积分每月
($6.99 / $19.99 / $49.99);未用完最多结转一个月额度;升级立即补差额,降级和取消在期末生效;
订阅结束作废剩余订阅积分(积分包积分不动);订阅用户结果保留 7 天,Pro / Business 单批 500 张。

1. **Supabase**:SQL Editor 执行 `db/migrations/2026-10-12-subscriptions.sql`(可重复执行)。必须在第 4 步之前。
2. **Stripe**(先在测试模式做一遍):
   - 新建产品「MiaoCut Monthly」,建 3 个**按月循环**价格:$6.99 / $19.99 / $49.99,记下 3 个 `price_...`。
   - Webhooks → 现有端点**追加订阅**:`invoice.paid`、`customer.subscription.created`、
     `customer.subscription.updated`、`customer.subscription.deleted`(`checkout.session.completed` 已有)。
   - Settings → Billing → Customer portal:允许取消(期末生效)、允许在这 3 个价格之间切换;
     升级「立即按比例开票」(always invoice),降级「期末生效」(schedule at period end);允许更新支付方式、查看发票。
3. **R2**:`miaocut-batch` 桶加一条生命周期规则:前缀 `batch7/`,7 天后删除(原有 `batch/` 1 天的规则保留)。
4. **Worker**:写入 3 个价格 id 后部署。三个都配好之前,`GET /plans` 返回 `subscriptions_enabled:false`,
   前端不显示订阅入口,所以可以先部署代码、最后再填价格开放。

   ```bash
   wrangler secret put STRIPE_PRICE_SUB_BASIC
   wrangler secret put STRIPE_PRICE_SUB_PRO
   wrangler secret put STRIPE_PRICE_SUB_BUSINESS
   wrangler deploy
   ```
5. 测试模式验证:用 Stripe 测试卡 `4242 4242 4242 4242` 订阅 Basic → 账户页出现「基础版 · 每月 300 积分」,
   流水有「月度套餐积分 +300」;在客户门户升级到 Pro → 立即补 1200;取消 → 显示结束日期;
   用 Stripe CLI `stripe trigger invoice.paid` 或测试时钟(Test clock)模拟下个月续费,检查结转。

⚠️ 已知限制:Stripe 2025 年起的新 API 版本,发票上不再直接带 `payment_intent`。如果账户使用新版 API,
订阅发票的退款不会自动扣回积分(日志会记 `order_not_found`),需要人工处理;积分包不受影响。

## 测试

`npm run test:gateway`:三个 Worker 冒烟测试(mock Supabase / Beam / Stripe)+ 数据库迁移验证(内存 Postgres)。
都不连任何真实服务。

## 待提供

- Beam 端点 URL + token、Stripe / Supabase 账号与密钥、4 个充值包定价。

## 本地联调

`wrangler dev` 本地起 Worker;Supabase/Stripe 用各自 test 环境。
Stripe webhook 本地用 `stripe listen --forward-to localhost:8787/webhooks/stripe`。
