#!/bin/bash
# =============================================
# Bing / IndexNow URL 主动推送脚本
# =============================================
# 把一批 URL 提交给 IndexNow（Bing、Yandex 等参与方共享这个协议，提交一次都能收到），
# 让搜索引擎更快发现并重爬这些页面。
#
# URL 来源（按优先级）：
#   1) 命令行参数：bash bing_submit.sh https://miaocut.app/zh/ https://miaocut.app/...
#   2) 环境变量 INDEXNOW_URL_FILE 指向的文件（每行一个 URL，空行忽略）—— CI 用这个
#   3) 都没有时，回退到从 sitemap.xml 提取全部 <loc>（手动全量提交的老行为，保持兼容）
#
# 增量提交（只交本次真正改动的页面）由 .github/workflows/indexnow.yml +
# scripts/indexnow_changed_urls.py 负责算出 URL 列表后，经 INDEXNOW_URL_FILE 传进来。
# =============================================

set -euo pipefail

# --- 配置 ---
HOST="miaocut.app"
# IndexNow key：本身就是公开信息（明文挂在 https://miaocut.app/<key>.txt），无需当 secret 管理。
KEY="b27e253973b44d85af293d4f007fba0c"
KEY_LOCATION="https://${HOST}/${KEY}.txt"
# 提交到 IndexNow API 接口 (也可使用 https://www.bing.com/indexnow)
INDEXNOW_API="https://api.indexnow.org/indexnow"

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SITEMAP="$PROJECT_DIR/sitemap.xml"
JSON_PAYLOAD="$PROJECT_DIR/indexnow_payload.json"

# --- 收集要提交的 URL ---
URLS=()
if [ "$#" -gt 0 ]; then
  echo "📥 使用命令行参数里的 URL（$# 条）"
  URLS=("$@")
elif [ -n "${INDEXNOW_URL_FILE:-}" ] && [ -s "${INDEXNOW_URL_FILE}" ]; then
  echo "📥 从 INDEXNOW_URL_FILE 读取 URL：${INDEXNOW_URL_FILE}"
  while IFS= read -r line; do
    [ -n "$line" ] && URLS+=("$line")
  done < "${INDEXNOW_URL_FILE}"
else
  echo "📄 未指定 URL，回退到从 sitemap.xml 提取全部 <loc>..."
  if [ ! -f "$SITEMAP" ]; then
    echo "❌ 错误：未找到 sitemap.xml（路径：$SITEMAP）"
    exit 1
  fi
  while IFS= read -r line; do
    [ -n "$line" ] && URLS+=("$line")
  done < <(grep -oE '<loc>[^<]+</loc>' "$SITEMAP" | sed -E 's#</?loc>##g')
fi

if [ "${#URLS[@]}" -eq 0 ]; then
  echo "ℹ️ 没有需要提交的 URL，跳过。"
  exit 0
fi

echo "🚀 准备提交 ${#URLS[@]} 条 URL 到 IndexNow："
printf '   - %s\n' "${URLS[@]}"

# --- 用 python 构造 JSON payload（稳妥处理 JSON 转义）---
python3 - "$JSON_PAYLOAD" "$HOST" "$KEY" "$KEY_LOCATION" "${URLS[@]}" <<'EOF'
import sys, json
output_path, host, key, key_location = sys.argv[1:5]
urls = sys.argv[5:]
payload = {
    "host": host,
    "key": key,
    "keyLocation": key_location,
    "urlList": urls,
}
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)
print(f"共准备 {len(urls)} 条 URL")
EOF

# --- 提交到 IndexNow ---
echo "🚀 正在提交到 IndexNow..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @"$JSON_PAYLOAD" \
  "$INDEXNOW_API")

echo "📊 API 响应状态码：$HTTP_STATUS"

# 清理临时文件
rm -f "$JSON_PAYLOAD"

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "202" ]; then
  echo "✅ 成功提交到 IndexNow!"
else
  echo "❌ 提交失败，返回状态码：$HTTP_STATUS"
  exit 1
fi

echo ""
echo "🕐 提交时间：$(date '+%Y-%m-%d %H:%M:%S')"
