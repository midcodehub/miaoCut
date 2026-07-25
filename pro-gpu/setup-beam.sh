#!/bin/bash
# beam / modal 都装在项目 .venv 里（Python 3.11）。
# ⚠️ 别再往 ~/Library/Python/3.x/bin 里装：那个目录不在默认 PATH，
#    裸终端敲 beam 会 command not found，而且和 .venv 里的版本会打架。
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$REPO_ROOT/.venv/bin:$PATH"

echo "=========================================="
echo "    MiaoCut Pro - Beam 环境变量自动配置"
echo "=========================================="
echo
echo "步骤 1/2：登录 Beam"
echo "请前往 Beam 官网仪表盘获取您的 API Token，然后粘贴在下方："
read -p "Token: " BEAM_TOKEN
beam configure --token "$BEAM_TOKEN"
if [ $? -ne 0 ]; then
    echo "❌ 登录失败，请检查 Token！"
    exit 1
fi
echo "✅ 登录成功！"
echo

echo "步骤 2/2：自动生成回调 Secret"
SECRET=$(openssl rand -hex 32)
beam secret create BATCH_CALLBACK_SECRET "$SECRET"
beam secret create BATCH_CALLBACK_URL "https://pro-api.miaocut.app/internal/batch-callback"

echo "=========================================="
echo "🎉 恭喜！Beam 所有环境变量已配置完毕！"
echo "=========================================="
echo
echo "⚠️ 【极其重要】：请立刻复制并保存下面这行 Secret："
echo "$SECRET"
echo "（稍后在配置 Cloudflare Worker 时，必须要用到它！）"
echo
