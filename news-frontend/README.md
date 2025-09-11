# 🚀 科技新闻聚合前端

一个现代化的科技新闻聚合平台前端应用，提供实时新闻浏览、智能分类和全文搜索功能。

## ✨ 功能特点

- 📰 **新闻浏览** - 按时间排序显示最新科技资讯
- 🏷️ **分类筛选** - 根据标签（AI、科技、政策等）筛选新闻
- 🔍 **全文搜索** - 支持关键词搜索新闻内容
- 📱 **响应式设计** - 完美适配电脑和手机端
- ⚡ **实时更新** - 自动获取最新新闻内容
- 🎨 **现代化UI** - 玻璃拟态效果、渐变设计、流畅动画

## 🛠 技术栈

- **前端框架**: React 19 + TypeScript
- **样式方案**: Tailwind CSS
- **构建工具**: Vite
- **图标库**: Lucide React
- **API**: AWS API Gateway + Lambda
- **数据库**: DynamoDB

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env`，并配置您的API端点：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
VITE_API_URL=https://your-api-gateway-url.amazonaws.com
```

### 本地开发

```bash
npm run dev
```

应用将在 http://localhost:5173 启动

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 🌐 免费部署

### 一键部署

**Windows用户：**
```bash
deploy.bat
```

**Mac/Linux用户：**
```bash
chmod +x deploy.sh
./deploy.sh
```

### 支持的部署平台

- ✅ **Vercel** (推荐) - 零配置部署
- ✅ **Netlify** - 拖拽部署
- ✅ **GitHub Pages** - 自动部署
- ✅ **Firebase Hosting** - Google平台
- ✅ **Surge.sh** - 简单部署

### 快速部署到Vercel

1. 访问 [vercel.com](https://vercel.com)
2. 注册账号（支持GitHub登录）
3. 点击 "New Project"
4. 导入GitHub仓库
5. 选择 `news-frontend` 文件夹
6. 设置环境变量：`VITE_API_URL`
7. 点击 "Deploy"

详细部署指南请查看：
- 📖 [快速部署指南](QUICK-DEPLOY.md)
- 📚 [完整部署指南](FREE-DEPLOYMENT-GUIDE.md)

## 🎨 设计特色

### 现代化UI设计
- **玻璃拟态效果** - 半透明背景和模糊效果
- **渐变设计** - 丰富的色彩渐变和视觉层次
- **微交互** - 细腻的动画和过渡效果
- **响应式设计** - 完美适配各种设备

### 组件设计
- **新闻卡片** - 玻璃拟态效果、悬停动画、评分徽章
- **搜索栏** - 现代化输入框、智能提示、实时验证
- **分类筛选** - 渐变标签、响应式布局、状态指示
- **加载动画** - 多层旋转、变体设计、进度提示

详细设计说明请查看：[设计文档](DESIGN.md)

## 📁 项目结构

```
src/
├── components/          # React组件
│   ├── NewsCard.tsx    # 新闻卡片组件
│   ├── SearchBar.tsx   # 搜索栏组件
│   ├── CategoryFilter.tsx # 分类筛选组件
│   ├── LoadingSpinner.tsx # 加载动画组件
│   ├── ErrorMessage.tsx   # 错误提示组件
│   └── index.ts        # 组件导出
├── services/           # API服务
│   └── api.ts         # API调用逻辑
├── types/             # TypeScript类型定义
│   └── index.ts       # 类型定义
├── App.tsx            # 主应用组件
├── main.tsx           # 应用入口
└── index.css          # 全局样式
```

## 🔧 开发指南

### 添加新组件

1. 在 `src/components/` 目录下创建组件文件
2. 使用TypeScript和函数式组件
3. 添加适当的props类型定义
4. 在 `src/components/index.ts` 中导出

### 添加新的API端点

1. 在 `src/services/api.ts` 中添加新的方法
2. 定义相应的类型接口
3. 添加错误处理

### 样式指南

- 使用Tailwind CSS类名
- 遵循响应式设计原则
- 保持一致的颜色和间距

## 🌍 浏览器支持

- Chrome >= 88
- Firefox >= 85
- Safari >= 14
- Edge >= 88

## 📊 性能优化

- **代码分割** - Vite自动进行代码分割
- **Tree Shaking** - 移除未使用的代码
- **资源压缩** - CSS和JS文件自动压缩
- **图片优化** - 支持现代图片格式
- **缓存策略** - 静态资源缓存优化

## 🔒 安全特性

- **HTTPS** - 自动SSL证书
- **CSP** - 内容安全策略
- **XSS防护** - 跨站脚本攻击防护
- **CSRF防护** - 跨站请求伪造防护

## 📈 监控和分析

- **性能监控** - 页面加载时间监控
- **错误追踪** - 自动错误收集
- **用户分析** - 用户行为分析
- **SEO优化** - 搜索引擎优化

## 🤝 贡献

欢迎提交Issue和Pull Request！

### 开发流程

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

MIT License

## 📞 支持

如果您遇到问题：

1. 查看 [故障排除指南](CSS-FIX-GUIDE.md)
2. 检查 [部署指南](FREE-DEPLOYMENT-GUIDE.md)
3. 提交Issue
4. 联系技术支持

---

**🎉 感谢使用科技新闻聚合平台！**