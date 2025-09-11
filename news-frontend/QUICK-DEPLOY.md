# ⚡ 快速部署指南

## 🚀 一键部署（推荐）

### 方法1：使用部署脚本

**Windows用户：**
```bash
# 双击运行
deploy.bat
```

**Mac/Linux用户：**
```bash
# 给脚本执行权限
chmod +x deploy.sh
# 运行脚本
./deploy.sh
```

### 方法2：使用npm脚本

```bash
# 部署到Vercel
npm run deploy

# 或分别执行
npm run build
npm run deploy:vercel
```

## 🌟 最简单的部署方式：Vercel

### 步骤1：访问Vercel
1. 打开 [vercel.com](https://vercel.com)
2. 点击 "Sign up" 注册账号（支持GitHub登录）

### 步骤2：导入项目
1. 点击 "New Project"
2. 选择 "Import Git Repository"
3. 选择您的GitHub仓库
4. 选择 `news-frontend` 文件夹

### 步骤3：配置项目
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 步骤4：设置环境变量
在项目设置中添加：
```
VITE_API_URL = https://3vjtu2vg9j.execute-api.us-east-1.amazonaws.com
```

### 步骤5：部署
点击 "Deploy" 按钮，等待部署完成！

## 🎯 其他快速部署方式

### Netlify（拖拽部署）
1. 访问 [netlify.com](https://netlify.com)
2. 注册账号
3. 将 `dist` 文件夹拖拽到部署区域
4. 设置环境变量
5. 完成！

### GitHub Pages（自动部署）
1. 推送代码到GitHub
2. 在仓库设置中启用GitHub Pages
3. 设置环境变量
4. 自动部署完成！

## 📱 部署后访问

部署完成后，您将获得一个类似这样的URL：
- Vercel: `https://your-project.vercel.app`
- Netlify: `https://your-project.netlify.app`
- GitHub Pages: `https://your-username.github.io/your-repo`

## 🔧 环境变量配置

确保在部署平台设置以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_API_URL` | `https://3vjtu2vg9j.execute-api.us-east-1.amazonaws.com` | API端点 |
| `VITE_APP_NAME` | `科技新闻聚合` | 应用名称 |
| `VITE_APP_VERSION` | `1.0.0` | 应用版本 |

## ✅ 部署验证清单

部署完成后，请验证以下功能：

- [ ] 页面正常加载
- [ ] 搜索功能正常
- [ ] 分类筛选正常
- [ ] 新闻列表显示
- [ ] 响应式设计正常
- [ ] 移动端体验良好

## 🆘 遇到问题？

1. **构建失败**: 检查Node.js版本（需要16+）
2. **样式不显示**: 清除浏览器缓存
3. **API请求失败**: 检查环境变量设置
4. **部署失败**: 查看部署日志

## 📞 获取帮助

- 查看详细指南：`FREE-DEPLOYMENT-GUIDE.md`
- 检查构建日志
- 联系平台技术支持

---

**🎉 恭喜！您的科技新闻聚合平台即将上线！**
