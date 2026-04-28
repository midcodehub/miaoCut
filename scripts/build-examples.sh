#!/usr/bin/env bash
# ============================================================
# build-examples.sh — 构建首页 Examples gallery 用的 4 张抠图样本
# ============================================================
# 流程：
#   examples/raw/{product,portrait,logo,pet}.{jpg,png,webp}
#     ↓ sips 预压缩到 2048px 以内（和前端一致，避免 413）
#   *_compressed.jpg（临时文件）
#     ↓ 调本地后端 /api/remove-background?profile=fur 抠图
#   *_nobg.png（临时文件）
#     ↓ sips 中心裁成 512×512
#   *_512.png
#     ↓ cwebp 编码（alpha 单独高质量，防边缘锯齿）
#   examples/{product,portrait,logo,pet}-cutout.webp
#
# 用法：
#   1. 把原图丢进 examples/raw/，文件名必须是 product / portrait / logo / pet
#      （扩展名 jpg/png/webp/jpeg 任意，大小写都行）
#   2. 另一个终端起后端：python main.py
#   3. ./scripts/build-examples.sh        # 只补缺的
#      ./scripts/build-examples.sh --force # 全部重跑
#
# 依赖：curl + sips（macOS 自带）+ cwebp（brew install webp）
#
# 环境变量：
#   MIAOCUT_API_BASE     默认 http://127.0.0.1:8000
#   MIAOCUT_PROFILE      默认 fur（边缘最干净；想快可改 sharp）
#   MIAOCUT_WEBP_Q       默认 85（颜色通道质量）
#   MIAOCUT_WEBP_ALPHA_Q 默认 90（alpha 通道质量，建议 >= 颜色质量）
# ============================================================

set -euo pipefail

API_BASE="${MIAOCUT_API_BASE:-http://127.0.0.1:8000}"
PROFILE="${MIAOCUT_PROFILE:-fur}"
QUALITY="${MIAOCUT_WEBP_Q:-85}"
ALPHA_Q="${MIAOCUT_WEBP_ALPHA_Q:-90}"
SIZE=512
TARGETS=(product portrait logo pet)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW_DIR="$ROOT/examples/raw"
OUT_DIR="$ROOT/examples"

FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

# ---------- 输出 ----------
RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; CYAN=$'\033[36m'; RESET=$'\033[0m'
say()  { echo "${CYAN}==>${RESET} $*"; }
ok()   { echo "  ${GREEN}✓${RESET} $*"; }
warn() { echo "  ${YELLOW}⚠${RESET} $*"; }
err()  { echo "  ${RED}✗${RESET} $*" >&2; }

# ---------- 依赖检查 ----------
require() {
    if ! command -v "$1" >/dev/null 2>&1; then
        err "缺少命令: $1   ($2)"
        exit 1
    fi
}
require curl  "macOS / Linux 都自带，应该不会缺"
require sips  "macOS 自带；如不在 macOS 请改用 ImageMagick 重写本脚本"
require cwebp "安装：brew install webp"

mkdir -p "$RAW_DIR" "$OUT_DIR"

# ---------- 找原图 ----------
# 支持任意常见扩展名，按顺序找第一个匹配
find_raw() {
    local name="$1" ext
    for ext in jpg jpeg png webp JPG JPEG PNG WEBP; do
        if [[ -f "$RAW_DIR/$name.$ext" ]]; then
            echo "$RAW_DIR/$name.$ext"
            return 0
        fi
    done
    return 1
}

# ---------- 后端可用性 ----------
say "检查后端: $API_BASE"
if ! curl -sf --max-time 3 "$API_BASE/" > /dev/null; then
    err "后端不可达。先在另一个终端跑: python main.py"
    exit 1
fi
ok "后端可用 (profile=$PROFILE, webp q=$QUALITY/alpha=$ALPHA_Q, 输出 ${SIZE}×${SIZE})"

# ---------- 主流程 ----------
PROCESSED=0
SKIPPED=0
FAILED=0

for target in "${TARGETS[@]}"; do
    out="$OUT_DIR/${target}-cutout.webp"

    raw=""
    raw="$(find_raw "$target" || true)"
    if [[ -z "$raw" ]]; then
        say "$target"
        warn "未找到原图：把 ${target}.{jpg,png,webp} 丢进 examples/raw/"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    if [[ -f "$out" && "$FORCE" -eq 0 ]]; then
        say "$target"
        ok "已存在，跳过：$(basename "$out")  (加 --force 强制重跑)"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    say "$target  ←  $(basename "$raw")"

    # 临时工作文件
    tmp_dir="$(mktemp -d -t miaocut-example.XXXXXX)"
    trap 'rm -rf "$tmp_dir"' EXIT
    compressed="$tmp_dir/compressed.jpg"
    cutout="$tmp_dir/cutout.png"
    cropped="$tmp_dir/cropped.png"

    # 1) 原图预压缩：和前端一样先缩到 2048px 以内，避免触发后端像素上限 413
    #    sips 会等比缩放，长边对齐 MAX_DIM，短边自动 ≤ MAX_DIM
    MAX_DIM=2048
    W=$(sips -g pixelWidth  "$raw" | awk '/pixelWidth/{print $2}')
    H=$(sips -g pixelHeight "$raw" | awk '/pixelHeight/{print $2}')
    if [[ "$W" -gt "$MAX_DIM" || "$H" -gt "$MAX_DIM" ]]; then
        if [[ "$W" -gt "$H" ]]; then
            sips --resampleWidth "$MAX_DIM" "$raw" --out "$compressed" >/dev/null
        else
            sips --resampleHeight "$MAX_DIM" "$raw" --out "$compressed" >/dev/null
        fi
        upload_file="$compressed"
        ok "原图 ${W}×${H} 超过 ${MAX_DIM}px，已预压缩"
    else
        upload_file="$raw"
    fi

    # 2) 调后端抠图
    # 后端在 ALLOWED_ORIGINS 为空时会跳过 origin 校验（dev 默认）；
    # 若线上后端开启了校验，curl 默认不带 Origin 也会通过 verify_origin 的"无 origin 直接放行"分支。
    if ! curl -sf -X POST "$API_BASE/api/remove-background?profile=$PROFILE" \
         -F "file=@$upload_file" \
         --output "$cutout"; then
        err "抠图请求失败（命中限流就等 1 分钟，或者把 main.py 里的 limiter 临时关掉）"
        FAILED=$((FAILED + 1))
        rm -rf "$tmp_dir"; trap - EXIT
        continue
    fi

    # 3) 中心裁成 SIZE×SIZE
    cp "$cutout" "$cropped"
    # 先按"短边对齐 SIZE"做 cover 缩放：取较短那条边等比缩到 SIZE，长边自动 ≥ SIZE
    W=$(sips -g pixelWidth  "$cropped" | awk '/pixelWidth/{print $2}')
    H=$(sips -g pixelHeight "$cropped" | awk '/pixelHeight/{print $2}')
    if [[ "$W" -lt "$H" ]]; then
        sips --resampleWidth "$SIZE" "$cropped" >/dev/null
    else
        sips --resampleHeight "$SIZE" "$cropped" >/dev/null
    fi
    # 再中心裁掉多出来的部分
    sips -c "$SIZE" "$SIZE" "$cropped" >/dev/null

    # 4) 编码 webp
    cwebp -quiet -q "$QUALITY" -alpha_q "$ALPHA_Q" "$cropped" -o "$out"

    rm -rf "$tmp_dir"; trap - EXIT

    size=$(du -h "$out" | cut -f1)
    bytes=$(wc -c < "$out" | tr -d ' ')
    ok "输出：$(basename "$out")  ($size)"
    if [[ "$bytes" -gt 61440 ]]; then
        warn "  > 60KB，可以把 MIAOCUT_WEBP_Q 调到 75 重跑节省体积"
    fi

    PROCESSED=$((PROCESSED + 1))

    # 限流保险（默认 5/分钟）；4 张图本来就够，只是防再次手动连跑
    sleep 1
done

echo
say "完成: ${PROCESSED} 处理 / ${SKIPPED} 跳过 / ${FAILED} 失败"
if compgen -G "$OUT_DIR/*.webp" > /dev/null; then
    echo
    ls -lh "$OUT_DIR"/*.webp
fi
