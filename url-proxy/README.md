# url-proxy（免费 API 网关 `api2.miaocut.app`）

Cloudflare Worker：把免费工具的抠图请求转发到 3 个 Hugging Face Space（`main.py`），负责排队、对冲重试、超时，
并在转发时带上 `X-Gateway-Secret`。后端只接受带正确密钥的请求，从而挡住直接访问 `*.hf.space`。

## ⚠️ 部署：合并到 main 就自动上线

Cloudflare **Workers Builds** 连着本仓库：`main` 每次更新都会自动重新部署本 Worker
（GitHub 提交上能看到 check run「Workers Builds: miaocut-url-proxy」）。所以：

- 改 `url-proxy/` 下的任何文件，合并 PR 就等于改线上，合并前想清楚影响。
- `wrangler.toml` 里的 `[vars]` 会在每次自动部署时**覆盖** Cloudflare 后台的普通变量；
  在后台手动加的普通变量会被删掉。需要长期保留、又不能写进公开仓库的值，必须用 **Secret** 类型。
- 测试环境 `dev-api2.miaocut.app`：`wrangler deploy --env dev`（手动）。

## 密钥 `GATEWAY_SECRET`

本仓库是公开的，`GATEWAY_SECRET` 只能存成 Cloudflare **Secret**（自动部署不会覆盖 Secret），不能写进 `wrangler.toml`。
Hugging Face 那边，在每个 Space 的 Settings → Variables and secrets 里设置**同一个值**（变量名 `GATEWAY_SECRET`）。

2026-10-18 教训：从 `wrangler.toml` 删掉明文密钥的 PR 合并后，Worker 被自动重部署、密钥随之消失，
免费抠图全部 403 约 45 分钟。之后已更换为新密钥（Worker Secret + 全部 Space 同值）。

### 更换密钥（不需要重新部署代码）

1. 生成新值：`openssl rand -hex 32`，只保存在密码管理器里，不要存成文件放进任何仓库。
2. 在 3 个生产 Space（以及测试 Space）里把 `GATEWAY_SECRET` 改成新值。Space 会自动重启，约 1–3 分钟。
3. 等 Space 都显示 Running 后，**立刻**到 Cloudflare：Workers & Pages → `miaocut-url-proxy` → Settings →
   Variables and Secrets，把 Secret `GATEWAY_SECRET` 改成新值（保存即生效）。
4. 验证：miaocut.app 抠一张图应正常；不带密钥或带旧密钥直接请求 `*.hf.space/api/remove-background` 应返回 403。

第 2 步到第 3 步之间（Space 重启那几分钟），免费抠图会失败，建议在低流量时段操作。
