#!/bin/bash
# =============================================
# Bing 搜索引擎 URL 主动推送脚本 (IndexNow)
# 自动从 sitemap.xml 提取 URL 并提交到 Bing
# =============================================

set -euo pipefail

# --- 配置 ---
HOST="miaocut.app"
KEY="b27e253973b44d85af293d4f007fba0c"
KEY_LOCATION="https://${HOST}/${KEY}.txt"
# 提交到 IndexNow API 接口 (也可使用 https://www.bing.com/indexnow)
INDEXNOW_API="https://api.indexnow.org/indexnow"

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SITEMAP="$PROJECT_DIR/sitemap.xml"
JSON_PAYLOAD="$PROJECT_DIR/indexnow_payload.json"

# --- 从 sitemap.xml 提取 URL ---
echo "📄 从 sitemap.xml 提取 URL 并生成 IndexNow 请求数据..."

if [ ! -f "$SITEMAP" ]; then
  echo "❌ 错误：未找到 sitemap.xml（路径：$SITEMAP）"
  exit 1
fi

python3 - "$SITEMAP" "$JSON_PAYLOAD" "$HOST" "$KEY" "$KEY_LOCATION" <<'EOF'
import sys
import re
import json

sitemap_path = sys.argv[1]
output_path  = sys.argv[2]
host = sys.argv[3]
key = sys.argv[4]
key_location = sys.argv[5]

with open(sitemap_path, 'r', encoding='utf-8') as f:
    content = f.read()

urls = re.findall(r'<loc>(.*?)</loc>', content)

payload = {
    "host": host,
    "key": key,
    "keyLocation": key_location,
    "urlList": urls
}

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

print(f"共提取到 {len(urls)} 条 URL")
EOF

# --- 提交到 IndexNow ---
echo "🚀 正在提交到 Bing (IndexNow)..."

# 执行提交并获取 HTTP 状态码
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @"$JSON_PAYLOAD" \
  "$INDEXNOW_API")

echo "📊 API 响应状态码：$HTTP_STATUS"

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 202 ]; then
  echo "✅ 成功提交到 IndexNow!"
else
  echo "❌ 提交失败，返回状态码：$HTTP_STATUS"
fi

# 清理临时文件
rm -f "$JSON_PAYLOAD"

echo ""
echo "🕐 提交时间：$(date '+%Y-%m-%d %H:%M:%S')"
