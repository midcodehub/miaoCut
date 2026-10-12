# 登录配置清单（邮箱登录 + GitHub 登录）

> 2026-10-12。网站目前提供三种登录方式：Google（已配置）、邮箱登录链接、GitHub（代码已就绪，后台开启后按钮自动出现）。
> 以下操作都在各平台后台完成，不需要改代码或重新部署。

## 为什么必须配置 SMTP

Supabase 自带的发信服务**只发给项目团队成员**，其他邮箱会报 `Email address not authorized`，而且每小时只能发 2 封。
不配置自己的 SMTP，真实用户点“发送登录链接”是收不到邮件的。

## 1. Resend 发信（推荐，免费额度每天 100 封、每月 3000 封）

1. 注册 [resend.com](https://resend.com)，进入 **Domains → Add Domain**，填 `miaocut.app`。
2. Resend 会给出几条 DNS 记录（SPF 的 TXT、DKIM 的 TXT/CNAME，以及可选的 MX）。到 **Cloudflare → miaocut.app → DNS** 逐条添加：
   - 记录类型必须是 **DNS only（灰色云）**，不要开代理；
   - 回到 Resend 点 **Verify**，几分钟内状态会变成 Verified。
   - 这几条记录只用于发信认证，不影响网站访问和 SEO。
3. **API Keys → Create API Key**，权限选 Sending access，复制 `re_...`（只显示一次）。
4. Supabase → **Authentication → Emails → SMTP Settings**，打开 Enable Custom SMTP：

   | 字段 | 值 |
   |---|---|
   | Sender email | `noreply@miaocut.app` |
   | Sender name | `MiaoCut` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | 第 3 步的 `re_...` |

5. Supabase → **Authentication → Rate Limits**：把每小时发信上限调到 100 左右，和 Resend 每天 100 封的额度大致匹配。量大了以后再升级 Resend 套餐。

备选：Brevo（免费每天 300 封），SMTP 地址为 `smtp-relay.brevo.com:587`，配置方式相同。

## 2. 回跳地址白名单（必做，否则登录后会跳回首页）

页面登录时会让用户回到当前页（批量页、定价页、账户页、处理记录页）。
Supabase → **Authentication → URL Configuration**：

- **Site URL**：`https://miaocut.app`
- **Redirect URLs** 添加：
  - `https://miaocut.app/**`
  - `https://www.miaocut.app/**`

## 3. 邮件模板（中英双语）

Supabase → **Authentication → Emails → Templates**：

| 模板 | 主题（Subject） | 内容（Body）复制自 |
|---|---|---|
| Magic Link | `MiaoCut 登录链接 / Your sign-in link` | `pro-gateway/auth-email-templates/magic-link.html` |
| Confirm signup | `欢迎使用 MiaoCut / Confirm your email` | `pro-gateway/auth-email-templates/confirm-signup.html` |

模板里写的是“链接 1 小时内有效”，对应 **Authentication → Providers → Email → Email OTP Expiration = 3600**（默认值），改了这个值要同步改模板文字。

## 4. GitHub 登录

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**：
   - Application name：`MiaoCut`
   - Homepage URL：`https://miaocut.app`
   - Authorization callback URL：`https://kaqlfoxselrvriulvlsm.supabase.co/auth/v1/callback`
2. 创建后复制 **Client ID**，再点 **Generate a new client secret** 复制 secret。
3. Supabase → **Authentication → Sign In / Providers → GitHub**：打开开关，填入 Client ID 和 Secret，保存。
4. 刷新网站登录卡，“使用 GitHub 登录”按钮会自动出现。页面通过公开接口 `/auth/v1/settings` 判断是否开启，关掉开关按钮就会消失。

注册送 100 积分对 GitHub 用户同样只发给**已验证邮箱**，GitHub 返回的主邮箱一般都是已验证的。一次性邮箱、同 IP 每日上限、同一邮箱别名只发一次这些规则照常生效。

## 5. 验证

1. 用一个**不是 Supabase 团队成员**的邮箱测试，例如 QQ 邮箱、163 邮箱或 Gmail：在 `/account/credits/` 输入邮箱 → 收到双语邮件 → 点链接回到账户页并已登录，余额 100。
2. QQ 邮箱如果没收到，先看“垃圾箱”。频繁进垃圾箱的话，到 Resend 后台检查 DKIM 是否为 Verified；再在 Cloudflare 加一条 DMARC 记录：类型 TXT，名称 `_dmarc`，值 `v=DMARC1; p=none;`。
3. GitHub 登录：点按钮 → GitHub 授权 → 回到原页面已登录。

## 关于 QQ / 微信登录（暂不做）

- **QQ 互联**要求网站域名和回调地址都已完成 ICP 备案，备案又通常要求国内服务器。`miaocut.app` 部署在 Cloudflare 境外节点上，没法直接备案。
- 以后如果有了已备案的域名和国内服务器：
  - 技术方案是在网关上加一层“QQ → 标准 OAuth2”的转换，再接入 Supabase 自定义 OAuth2 登录（`custom:qq`，开启无邮箱登录）；
  - 注册送积分的防薅规则需要为 QQ 用户另外设计，因为 QQ 不提供邮箱。
- **微信登录**除了备案，还需要企业资质和 300 元/年的开发者认证。
- 目前国内用户可以直接用 QQ 邮箱走邮箱登录，中文界面的输入框会提示“例如 12345@qq.com”。
