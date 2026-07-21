# pro-gpu — Beam serverless GPU 抠图推理服务

MiaoCut Pro 付费路径的 **GPU 数据面**。无状态：只做推理（BiRefNet-matting + 去彩边 → 透明 PNG），
鉴权/积分在 `pro-api` Worker（见 [docs/feature-pro-gpu-service.md](../docs/feature-pro-gpu-service.md)）。

```
浏览器 → Cloudflare → pro-api Worker(验JWT+查余额) → 本服务(Beam) → PNG → 扣分 → 返回
```

## 两档模型（benchmark 锁定）

| profile | 模型 | 分辨率 | 积分（Worker 侧） |
|---|---|---|---|
| `fast`（默认） | `ZhengPeng7/BiRefNet-matting` | 1024 | 1 |
| `fur` | `ZhengPeng7/BiRefNet_HR-matting` | 2048 | 2 |

## 部署

```bash
pip install beam-client          # Beam SDK（包名以官方为准）
beam configure                   # 登录，拿到 token

# 1) 预热 Volume：把两档权重下载进 /models（只需一次，省得线上首个冷启动重下）
beam run app.py:download

# 2) 部署 ASGI 服务（拿到 https URL）
beam deploy app.py:web_server
```

部署后 Beam 给一个 `https://...` 端点 + 需要 `Authorization: Bearer <BEAM_TOKEN>`。
把 **URL 和 TOKEN 配到 `pro-api` Worker 的 secret**（`BEAM_ENDPOINT` / `BEAM_TOKEN`），由 Worker 服务端调用。

## 接口（仅 Worker 调用）

`POST /v1/remove-background?profile=fast|fur` — body 为图片字节（raw 或 multipart `image` 字段）。
返回 `image/png`(RGBA) + 头 `X-Profile-Used` / `X-Processing-Ms` / `X-Request-Id`。
错误：`400` 空/缺图、`413` 超大、`422` 图片损坏/像素超限、`500` 推理异常。

`GET /healthz` 存活；`GET /readyz` 模型就绪。

## 配置（环境变量）

| 变量 | 默认 | 说明 |
|---|---|---|
| `MAX_UPLOAD_MB` | 15 | 上限（Worker 侧也会先拦 `Content-Length`） |
| `MAX_IMAGE_PIXELS` | 16777216 | 4096×4096 像素上限 |
| `MAX_CONCURRENCY` | 1 | GPU 串行；并发靠 Beam 扩容 |
| `DECONTAMINATE` | 1 | 去污染+去彩边，纯硬边图自动跳过 |
| `DECONTAM_MAX_EDGE` | 2048 | 前景色估计的最大边长，大图先降采样 |

## 关键约束

- **GPU = RTX 4090（24GB）**。单图 bs1 显存富余（HR@2048 ~5GB、两模型常驻 ~7~8GB，16GB 都够）。
- **纯 scale-to-zero**：闲置缩到 0，零常驻成本；首请求遇冷启动（容器+模型加载约数秒），`keep_warm_seconds=60` 让连续请求复用热容器。
- **不批处理**：BiRefNet 算力受限，凑批 0 收益，单张串行即可。
- **不落盘**：单图全程内存，保住「不存图」承诺（大批量 Phase 2 才落 R2）。

> ⚠️ Beam SDK 装饰器/参数名随版本变化，`gpu` 取值、`on_start`、`keep_warm_seconds`、`@function`、`beam deploy` 子命令请对当前官方文档核对。本目录代码是按当前主流 Beam decorator API 写的第一版，尚未在 Beam 上实跑。
