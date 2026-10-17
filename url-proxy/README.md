# url-proxy（免费 API 网关 `api2.miaocut.app`）

Cloudflare Worker：把免费工具的抠图请求转发到 3 个 Hugging Face Space（`main.py`），负责排队、对冲重试、超时，
并在转发时带上 `X-Gateway-Secret`，后端只接受带正确密钥的请求，从而挡住直接访问 `*.hf.space`。

- 生产：`api2.miaocut.app` → `wrangler deploy`
- 测试：`dev-api2.miaocut.app` → `wrangler deploy --env dev`

## 密钥 `GATEWAY_SECRET`

本仓库是公开的，`GATEWAY_SECRET` **只能存成 Cloudflare Secret**，不能写进 `wrangler.toml`。
Hugging Face 那边，在每个 Space 的 Settings → Variables and secrets 里设置**同一个值**（变量名 `GATEWAY_SECRET`）。

### 更换密钥（2026-10 起首次从明文迁移，以后定期更换也按这个顺序）

1. 生成新值：`openssl rand -hex 32`（只保存在密码管理器里，不要存成文件放进任何仓库）。
2. 在 3 个生产 Space（以及测试 Space）里把 `GATEWAY_SECRET` 改成新值。Space 会自动重启，约 1~3 分钟。
3. 部署本 Worker 的新配置（已经不含明文密钥）：`wrangler deploy`，然后**立刻**：
   ```bash
   wrangler secret put GATEWAY_SECRET            # 粘贴新值
   wrangler secret put GATEWAY_SECRET --env dev  # 测试环境（如在用）
   ```
   如果第 3 步先执行 `secret put` 报「binding name already in use」，说明线上还有旧的明文变量，先 `wrangler deploy` 再 `secret put`。
4. 验证：打开 miaocut.app 抠一张图应正常；直接请求 `https://midcodex-miao-cut.hf.space/api/remove-background` 应被拒绝。

第 2 步到第 3 步之间（几分钟），Space 已换新密钥而 Worker 还是旧的，免费抠图会失败，建议在低流量时段操作。
