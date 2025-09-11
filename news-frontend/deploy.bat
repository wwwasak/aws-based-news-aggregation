@echo off
chcp 65001 >nul
title 科技新闻聚合前端部署脚本

echo 🚀 科技新闻聚合前端部署脚本
echo ================================

REM 检查Node.js
echo 📋 检查环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

echo ✅ Node.js 版本:
node --version

REM 安装依赖
echo 📦 安装依赖...
call npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

REM 构建项目
echo 🔨 构建项目...
call npm run build
if errorlevel 1 (
    echo ❌ 构建失败，请检查错误信息
    pause
    exit /b 1
)

echo ✅ 构建成功！

REM 显示部署选项
echo.
echo 🎯 选择部署平台：
echo 1) Vercel (推荐)
echo 2) Netlify
echo 3) GitHub Pages
echo 4) 仅构建，手动部署
echo.

set /p choice="请选择 (1-4): "

if "%choice%"=="1" (
    echo 🚀 部署到 Vercel...
    where vercel >nul 2>&1
    if errorlevel 1 (
        echo 📦 安装 Vercel CLI...
        call npm install -g vercel
    )
    
    echo 🔐 登录 Vercel...
    call vercel login
    
    echo 🚀 部署中...
    call vercel --prod
    
    echo ✅ Vercel 部署完成！
) else if "%choice%"=="2" (
    echo 🚀 部署到 Netlify...
    where netlify >nul 2>&1
    if errorlevel 1 (
        echo 📦 安装 Netlify CLI...
        call npm install -g netlify-cli
    )
    
    echo 🔐 登录 Netlify...
    call netlify login
    
    echo 🚀 部署中...
    call netlify deploy --prod --dir=dist
    
    echo ✅ Netlify 部署完成！
) else if "%choice%"=="3" (
    echo 📄 准备 GitHub Pages 部署...
    echo 请按照以下步骤操作：
    echo 1. 将代码推送到 GitHub 仓库
    echo 2. 在仓库设置中启用 GitHub Pages
    echo 3. 设置环境变量 VITE_API_URL
    echo 4. 推送代码到 main 分支触发自动部署
    echo.
    echo 📁 构建文件位于: dist/
) else if "%choice%"=="4" (
    echo 📁 构建完成，文件位于: dist/
    echo 您可以手动上传到任何静态网站托管服务
) else (
    echo ❌ 无效选择
    pause
    exit /b 1
)

echo.
echo 🎉 部署完成！
echo 📖 详细部署指南请查看: FREE-DEPLOYMENT-GUIDE.md
pause
