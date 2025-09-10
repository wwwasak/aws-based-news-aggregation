# 部署指南

本文档介绍如何部署科技新闻聚合平台前端应用。

## 前置条件

1. 确保您的AWS后端API已经部署并正常运行
2. 获取您的API Gateway URL
3. 准备GitHub账号（用于自动部署）

## 配置API端点

在部署前，您需要配置正确的API端点：

### 方法1：环境变量（推荐）

在部署平台设置环境变量：
```
VITE_API_URL=https://your-actual-api-gateway-url.amazonaws.com
```

### 方法2：直接修改代码

编辑 `src/services/api.ts` 文件：
```typescript
const API_CONFIG = {
  baseUrl: 'https://your-actual-api-gateway-url.amazonaws.com',
  timeout: 30000,
};
```

## 部署到Vercel（推荐）

### 自动部署

1. 将代码推送到GitHub仓库
2. 访问 [Vercel](https://vercel.com)
3. 点击 "New Project"
4. 导入您的GitHub仓库
5. 配置环境变量：
   - `VITE_API_URL`: 您的API Gateway URL
6. 点击 "Deploy"

### 手动部署

```bash
# 安装Vercel CLI
npm i -g vercel

# 构建项目
npm run build

# 部署
vercel --prod
```

## 部署到Netlify

### 自动部署

1. 将代码推送到GitHub仓库
2. 访问 [Netlify](https://netlify.com)
3. 点击 "New site from Git"
4. 选择您的GitHub仓库
5. 配置构建设置：
   - Build command: `npm run build`
   - Publish directory: `dist`
6. 配置环境变量：
   - `VITE_API_URL`: 您的API Gateway URL
7. 点击 "Deploy site"

### 手动部署

```bash
# 安装Netlify CLI
npm i -g netlify-cli

# 构建项目
npm run build

# 部署
netlify deploy --prod --dir=dist
```

## 部署到GitHub Pages

1. 安装gh-pages包：
```bash
npm install -D gh-pages
```

2. 在package.json中添加脚本：
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

3. 配置vite.config.ts：
```typescript
export default defineConfig({
  base: '/your-repo-name/',
  // ... 其他配置
})
```

4. 部署：
```bash
npm run deploy
```

## 部署到AWS S3 + CloudFront

### 创建S3存储桶

```bash
aws s3 mb s3://your-news-frontend-bucket
aws s3 website s3://your-news-frontend-bucket --index-document index.html
```

### 构建并上传

```bash
# 构建项目
npm run build

# 上传到S3
aws s3 sync dist/ s3://your-news-frontend-bucket --delete
```

### 配置CloudFront（可选）

创建CloudFront分发以获得更好的性能和HTTPS支持。

## 环境变量配置

### 必需的环境变量

- `VITE_API_URL`: 您的API Gateway URL

### 可选的环境变量

- `VITE_APP_NAME`: 应用名称（默认：科技新闻聚合）
- `VITE_APP_VERSION`: 应用版本（默认：1.0.0）

## 域名配置

### Vercel

1. 在Vercel项目设置中添加自定义域名
2. 配置DNS记录指向Vercel

### Netlify

1. 在Netlify项目设置中添加自定义域名
2. 配置DNS记录指向Netlify

### CloudFront

1. 在CloudFront中配置自定义域名
2. 申请SSL证书（AWS Certificate Manager）
3. 配置DNS记录指向CloudFront分发

## 性能优化

### 构建优化

项目已经配置了以下优化：

1. **代码分割**: Vite自动进行代码分割
2. **Tree Shaking**: 移除未使用的代码
3. **资源压缩**: CSS和JS文件自动压缩
4. **图片优化**: 支持现代图片格式

### 缓存策略

建议配置以下缓存头：

```
# 静态资源（1年）
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# HTML文件（不缓存）
/*.html
  Cache-Control: public, max-age=0, must-revalidate

# API请求（5分钟）
/api/*
  Cache-Control: public, max-age=300
```

## 监控和分析

### Google Analytics

在 `index.html` 中添加Google Analytics代码。

### Sentry错误监控

```bash
npm install @sentry/react
```

在 `src/main.tsx` 中配置Sentry。

## 故障排除

### 常见问题

1. **API请求失败**
   - 检查CORS配置
   - 确认API URL正确
   - 检查网络连接

2. **构建失败**
   - 检查TypeScript错误
   - 确认所有依赖已安装
   - 检查环境变量

3. **样式问题**
   - 确认Tailwind CSS配置正确
   - 检查PostCSS配置

### 调试步骤

1. 检查浏览器控制台错误
2. 检查网络请求
3. 验证环境变量
4. 测试API端点

## 更新部署

### 自动更新

如果使用GitHub集成，推送代码到主分支会自动触发部署。

### 手动更新

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 构建并部署
npm run build
# 然后使用相应的部署命令
```

## 安全考虑

1. **环境变量**: 敏感信息使用环境变量
2. **HTTPS**: 始终使用HTTPS
3. **CSP**: 配置内容安全策略
4. **依赖更新**: 定期更新依赖包

## 备份和恢复

1. **代码备份**: 使用Git版本控制
2. **配置备份**: 导出环境变量和设置
3. **数据备份**: API数据由后端负责

## 支持

如果遇到部署问题，请：

1. 检查此文档的故障排除部分
2. 查看平台特定的文档
3. 检查GitHub Issues
4. 联系技术支持
