# 🚀 免费部署指南

本指南将帮您将科技新闻聚合前端应用免费部署到多个平台。

## 📋 部署前准备

### 1. 确保项目构建成功

```bash
cd news-frontend
npm run build
```

### 2. 配置环境变量

在部署平台设置以下环境变量：
```
VITE_API_URL=https://3vjtu2vg9j.execute-api.us-east-1.amazonaws.com
VITE_APP_NAME=科技新闻聚合
VITE_APP_VERSION=1.0.0
```

## 🌟 方案一：Vercel 部署（推荐）

### 优势
- ✅ 零配置部署
- ✅ 自动HTTPS
- ✅ 全球CDN
- ✅ 自动部署
- ✅ 自定义域名

### 部署步骤

#### 方法1：通过Vercel网站（推荐）

1. **访问 [Vercel](https://vercel.com)**
2. **注册/登录账号**（支持GitHub登录）
3. **点击 "New Project"**
4. **导入GitHub仓库**
   - 选择您的仓库
   - 选择 `news-frontend` 文件夹
5. **配置项目**
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
6. **设置环境变量**
   - 在项目设置中添加：
     - `VITE_API_URL` = `https://3vjtu2vg9j.execute-api.us-east-1.amazonaws.com`
7. **点击 Deploy**

#### 方法2：通过Vercel CLI

```bash
# 安装Vercel CLI
npm i -g vercel

# 登录Vercel
vercel login

# 部署
cd news-frontend
vercel

# 生产部署
vercel --prod
```

### 自定义域名（可选）

1. 在Vercel项目设置中添加自定义域名
2. 配置DNS记录指向Vercel
3. 自动获得SSL证书

---

## 🌐 方案二：Netlify 部署

### 优势
- ✅ 拖拽部署
- ✅ 表单处理
- ✅ 分支预览
- ✅ 边缘函数

### 部署步骤

#### 方法1：通过Netlify网站

1. **访问 [Netlify](https://netlify.com)**
2. **注册/登录账号**
3. **点击 "New site from Git"**
4. **连接GitHub仓库**
5. **配置构建设置**
   - Base directory: `news-frontend`
   - Build command: `npm run build`
   - Publish directory: `news-frontend/dist`
6. **设置环境变量**
   - 在Site settings > Environment variables中添加：
     - `VITE_API_URL` = `https://3vjtu2vg9j.execute-api.us-east-1.amazonaws.com`
7. **点击 Deploy site**

#### 方法2：拖拽部署

```bash
# 构建项目
cd news-frontend
npm run build

# 将dist文件夹拖拽到Netlify网站
```

---

## 📄 方案三：GitHub Pages 部署

### 优势
- ✅ 完全免费
- ✅ 与GitHub集成
- ✅ 自动部署
- ✅ 版本控制

### 部署步骤

1. **启用GitHub Actions**
   - 在仓库设置中启用Actions

2. **设置环境变量**
   - 在仓库Settings > Secrets and variables > Actions中添加：
     - `VITE_API_URL` = `https://3vjtu2vg9j.execute-api.us-east-1.amazonaws.com`

3. **推送代码到main分支**
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

4. **查看部署状态**
   - 在仓库的Actions标签页查看部署进度

5. **访问网站**
   - 部署完成后，访问：`https://your-username.github.io/your-repo-name`

---

## 🔧 方案四：其他免费平台

### Firebase Hosting

```bash
# 安装Firebase CLI
npm install -g firebase-tools

# 登录Firebase
firebase login

# 初始化项目
firebase init hosting

# 构建并部署
npm run build
firebase deploy
```

### Surge.sh

```bash
# 安装Surge
npm install -g surge

# 构建项目
npm run build

# 部署
cd dist
surge
```

### Render

1. 访问 [Render](https://render.com)
2. 连接GitHub仓库
3. 选择Static Site
4. 配置构建设置
5. 设置环境变量

---

## 🎯 推荐部署方案

### 最佳选择：Vercel
- **原因**: 零配置、性能优秀、功能丰富
- **适合**: 所有用户，特别是初学者

### 备选方案：Netlify
- **原因**: 功能强大、拖拽部署简单
- **适合**: 需要更多功能的用户

### 简单方案：GitHub Pages
- **原因**: 完全免费、与GitHub集成
- **适合**: 开源项目、预算有限的用户

---

## 🔍 部署后验证

### 1. 功能测试
- [ ] 页面正常加载
- [ ] 搜索功能正常
- [ ] 分类筛选正常
- [ ] 响应式设计正常
- [ ] API请求正常

### 2. 性能测试
- [ ] 页面加载速度 < 3秒
- [ ] 移动端体验良好
- [ ] 图片和资源正常加载

### 3. SEO检查
- [ ] 页面标题正确
- [ ] 元数据完整
- [ ] 结构化数据正常

---

## 🛠 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 清除缓存重新构建
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. 环境变量未生效
- 检查环境变量名称是否正确
- 确保在部署平台正确设置
- 重新部署项目

#### 3. API请求失败
- 检查CORS配置
- 确认API URL正确
- 检查网络连接

#### 4. 样式不显示
- 检查构建输出
- 确认CSS文件生成
- 清除浏览器缓存

---

## 📊 部署平台对比

| 平台 | 免费额度 | 自定义域名 | 自动部署 | 性能 | 易用性 |
|------|----------|------------|----------|------|--------|
| Vercel | 100GB带宽/月 | ✅ | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Netlify | 100GB带宽/月 | ✅ | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| GitHub Pages | 1GB存储 | ✅ | ✅ | ⭐⭐⭐ | ⭐⭐⭐ |
| Firebase | 10GB存储 | ✅ | ❌ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎉 部署完成

部署成功后，您将获得：
- 🌐 一个可访问的网站URL
- 🔒 自动HTTPS证书
- ⚡ 全球CDN加速
- 📱 完美的移动端体验
- 🔄 自动更新部署

恭喜！您的科技新闻聚合平台现在已经可以在线访问了！

---

## 📞 获取帮助

如果在部署过程中遇到问题：
1. 查看平台文档
2. 检查错误日志
3. 参考故障排除部分
4. 联系技术支持

**祝您部署成功！** 🚀
