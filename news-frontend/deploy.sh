#!/bin/bash

# 科技新闻聚合前端 - 快速部署脚本
# 支持多种免费部署平台

echo "🚀 科技新闻聚合前端部署脚本"
echo "================================"

# 检查Node.js版本
echo "📋 检查环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js 版本过低，请升级到 16 或更高版本"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建项目
echo "🔨 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi

echo "✅ 构建成功！"

# 显示部署选项
echo ""
echo "🎯 选择部署平台："
echo "1) Vercel (推荐)"
echo "2) Netlify"
echo "3) GitHub Pages"
echo "4) 仅构建，手动部署"
echo ""

read -p "请选择 (1-4): " choice

case $choice in
    1)
        echo "🚀 部署到 Vercel..."
        if ! command -v vercel &> /dev/null; then
            echo "📦 安装 Vercel CLI..."
            npm install -g vercel
        fi
        
        echo "🔐 登录 Vercel..."
        vercel login
        
        echo "🚀 部署中..."
        vercel --prod
        
        echo "✅ Vercel 部署完成！"
        ;;
    2)
        echo "🚀 部署到 Netlify..."
        if ! command -v netlify &> /dev/null; then
            echo "📦 安装 Netlify CLI..."
            npm install -g netlify-cli
        fi
        
        echo "🔐 登录 Netlify..."
        netlify login
        
        echo "🚀 部署中..."
        netlify deploy --prod --dir=dist
        
        echo "✅ Netlify 部署完成！"
        ;;
    3)
        echo "📄 准备 GitHub Pages 部署..."
        echo "请按照以下步骤操作："
        echo "1. 将代码推送到 GitHub 仓库"
        echo "2. 在仓库设置中启用 GitHub Pages"
        echo "3. 设置环境变量 VITE_API_URL"
        echo "4. 推送代码到 main 分支触发自动部署"
        echo ""
        echo "📁 构建文件位于: dist/"
        ;;
    4)
        echo "📁 构建完成，文件位于: dist/"
        echo "您可以手动上传到任何静态网站托管服务"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "🎉 部署完成！"
echo "📖 详细部署指南请查看: FREE-DEPLOYMENT-GUIDE.md"
