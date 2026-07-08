#!/bin/bash
echo "========================================================="
echo "    MiaoCut Pro - Cloudflare Worker 机密环境变量自动注入"
echo "========================================================="
echo "💡 提示：输入机密信息时，屏幕不会显示任何字符，粘贴后直接回车即可。"
echo "（如果某个值您暂时不想填，可以直接按回车跳过）"
echo

# 定义需要注入的 Secrets 列表和中文说明
declare -A SECRETS
SECRETS=(
    ["SUPABASE_SERVICE_ROLE_KEY"]="Supabase 的 service_role_key (最高权限密钥)"
    ["SUPABASE_JWT_SECRET"]="Supabase 的 JWT Secret (用于验证用户 Token)"
    ["BEAM_TOKEN"]="Beam 官网的 API Token"
    ["R2_ACCESS_KEY_ID"]="Cloudflare R2 的 Access Key ID"
    ["R2_SECRET_ACCESS_KEY"]="Cloudflare R2 的 Secret Access Key"
    ["BATCH_CALLBACK_SECRET"]="刚才生成的 BATCH_CALLBACK_SECRET (暗号)"
    ["STRIPE_SECRET_KEY"]="Stripe 的私有密钥 (sk_live_... 或 sk_test_...)"
    ["STRIPE_WEBHOOK_SECRET"]="Stripe Webhook 签名密钥 (whsec_...)"
    ["STRIPE_PRICE_STARTER_100"]="Stripe 商品 Price ID (100积分, price_...)"
    ["STRIPE_PRICE_CREATOR_500"]="Stripe 商品 Price ID (500积分, price_...)"
    ["STRIPE_PRICE_SELLER_1500"]="Stripe 商品 Price ID (1500积分, price_...)"
    ["STRIPE_PRICE_STUDIO_5000"]="Stripe 商品 Price ID (5000积分, price_...)"
)

# 确保顺序提问，因为 Bash 关联数组是无序的
ORDER=(
    "SUPABASE_SERVICE_ROLE_KEY"
    "SUPABASE_JWT_SECRET"
    "BEAM_TOKEN"
    "R2_ACCESS_KEY_ID"
    "R2_SECRET_ACCESS_KEY"
    "BATCH_CALLBACK_SECRET"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "STRIPE_PRICE_STARTER_100"
    "STRIPE_PRICE_CREATOR_500"
    "STRIPE_PRICE_SELLER_1500"
    "STRIPE_PRICE_STUDIO_5000"
)

for KEY in "${ORDER[@]}"; do
    DESC=${SECRETS[$KEY]}
    echo "▶ 请输入 $KEY"
    echo "  说明: $DESC"
    read -s -p "  值: " VAL
    echo
    
    if [ -n "$VAL" ]; then
        echo "$VAL" | npx wrangler secret put "$KEY"
        if [ $? -eq 0 ]; then
            echo "  ✅ 成功注入: $KEY"
        else
            echo "  ❌ 注入失败: $KEY"
        fi
    else
        echo "  ⏭ 跳过: $KEY (输入为空)"
    fi
    echo "---------------------------------------------------------"
done

echo
echo "========================================================="
echo "🎉 所有提供的密码已成功注入 Cloudflare！"
echo "========================================================="
read -p "现在要立即运行发布 (npx wrangler deploy) 吗？(y/n): " DO_DEPLOY
if [[ "$DO_DEPLOY" == "y" || "$DO_DEPLOY" == "Y" ]]; then
    echo "🚀 正在为您发布至 Cloudflare 全球边缘节点..."
    npx wrangler deploy
else
    echo "好的，发布操作已取消。您可以稍后随时执行 npx wrangler deploy 来发布。"
fi
