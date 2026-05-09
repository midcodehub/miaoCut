#!/bin/bash
# =============================================
# 百度搜索引擎 URL 主动推送脚本
# 自动从 sitemap.xml 提取 URL 并提交到百度
# =============================================

set -euo pipefail

# --- 配置 ---
SITE="https://miaocut.app"
TOKEN="DBj6fozxGm9AfKMQ"
BAIDU_API="http://data.zz.baidu.com/urls?site=${SITE}&token=${TOKEN}"

# 脚本所在目录（确保相对路径正确）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SITEMAP="$PROJECT_DIR/sitemap.xml"
URLS_FILE="$PROJECT_DIR/urls.txt"

# --- 检查依赖 ---
if ! command -v curl &>/dev/null; then
  echo "❌ 错误：未找到 curl，请先安装。"
  exit 1
fi

# --- 从 sitemap.xml 提取 URL ---
echo "📄 从 sitemap.xml 提取 URL..."

if [ ! -f "$SITEMAP" ]; then
  echo "❌ 错误：未找到 sitemap.xml（路径：$SITEMAP）"
  exit 1
fi

# 用 python3 提取 <loc> 标签内容（兼容 macOS/Linux）
python3 - "$SITEMAP" "$URLS_FILE" <<'EOF'
import sys
import re

sitemap_path = sys.argv[1]
output_path  = sys.argv[2]

with open(sitemap_path, 'r', encoding='utf-8') as f:
    content = f.read()

urls = re.findall(r'<loc>(.*?)</loc>', content)

with open(output_path, 'w', encoding='utf-8') as f:
    for url in urls:
        f.write(url.strip() + '\n')

print(f"共提取到 {len(urls)} 条 URL")
EOF

echo ""
echo "提取的 URL 列表："
cat "$URLS_FILE"
echo ""

URL_COUNT=$(wc -l < "$URLS_FILE" | tr -d ' ')

# --- 提交到百度 ---
echo "🚀 正在提交到百度主动推送..."

RESPONSE=$(curl -s \
  -H 'Content-Type:text/plain' \
  --data-binary "@$URLS_FILE" \
  "$BAIDU_API")

echo "📊 百度响应：$RESPONSE"

# --- 解析结果（兼容 macOS）---
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',0))" 2>/dev/null || echo "0")
REMAIN=$(echo "$RESPONSE"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('remain','?'))"  2>/dev/null || echo "?")
ERROR=$(echo "$RESPONSE"   | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))"  2>/dev/null || echo "")

echo ""
if [ -n "$ERROR" ]; then
  echo "❌ 提交失败：$ERROR"
  exit 1
else
  echo "✅ 成功提交 ${SUCCESS} 条 URL"
  echo "📅 今日剩余配额：${REMAIN} 条"
fi

echo ""
echo "🕐 提交时间：$(date '+%Y-%m-%d %H:%M:%S')"
