# 科技新闻聚合平台

一个现代化的科技新闻聚合平台，提供实时新闻浏览、智能分类和全文搜索功能。

## 功能特点

- 📰 **新闻浏览** - 按时间排序显示最新科技资讯
- 🏷️ **分类筛选** - 根据标签（AI、科技、政策等）筛选新闻
- 🔍 **全文搜索** - 支持关键词搜索新闻内容
- 📱 **响应式设计** - 完美适配电脑和手机端
- ⚡ **实时更新** - 自动获取最新新闻内容
- 🎨 **现代化UI** - 简洁美观的用户界面

## 技术栈

- **前端框架**: React 19 + TypeScript
- **样式方案**: Tailwind CSS
- **构建工具**: Vite
- **图标库**: Lucide React
- **API**: AWS API Gateway + Lambda
- **数据库**: DynamoDB

## 快速开始

### 环境要求

- Node.js >= 18
- npm 或 yarn

### 安装依赖

\`\`\`bash
npm install
\`\`\`

### 配置环境变量

复制 \`.env.example\` 为 \`.env\`，并配置您的API端点：

\`\`\`bash
cp .env.example .env
\`\`\`

编辑 \`.env\` 文件：

\`\`\`env
VITE_API_URL=https://your-api-gateway-url.amazonaws.com
\`\`\`

### 本地开发

\`\`\`bash
npm run dev
\`\`\`

应用将在 http://localhost:5173 启动

### 构建生产版本

\`\`\`bash
npm run build
\`\`\`

### 预览生产版本

\`\`\`bash
npm run preview
\`\`\`

## API 配置

本应用需要连接到您的新闻聚合API。API应该提供以下端点：

- \`GET /v1/feed/bigtech\` - 获取大科技公司新闻
- \`GET /v1/search\` - 搜索新闻
- \`GET /health\` - 健康检查

### API响应格式

\`\`\`typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    nextCursor?: string;
    hasMore: boolean;
    count: number;
  };
}
\`\`\`

## 部署

### Vercel 部署

1. 将项目推送到GitHub
2. 在Vercel中导入项目
3. 配置环境变量 \`VITE_API_URL\`
4. 部署

### Netlify 部署

1. 将项目推送到GitHub
2. 在Netlify中连接GitHub仓库
3. 设置构建命令: \`npm run build\`
4. 设置发布目录: \`dist\`
5. 配置环境变量 \`VITE_API_URL\`
6. 部署

### 其他平台

构建后的 \`dist\` 目录可以部署到任何静态网站托管服务。

## 项目结构

\`\`\`
src/
├── components/          # React组件
│   ├── NewsCard.tsx    # 新闻卡片组件
│   ├── SearchBar.tsx   # 搜索栏组件
│   ├── CategoryFilter.tsx # 分类筛选组件
│   └── ...
├── services/           # API服务
│   └── api.ts         # API调用逻辑
├── types/             # TypeScript类型定义
│   └── index.ts       # 类型定义
├── App.tsx            # 主应用组件
└── main.tsx           # 应用入口
\`\`\`

## 功能说明

### 新闻浏览

- 默认显示最新的科技新闻
- 按发布时间倒序排列
- 支持分页加载更多内容
- 显示新闻标题、摘要、来源和标签

### 分类筛选

支持以下分类：
- 全部新闻
- AI人工智能
- 科技
- 政策监管
- 安全事件
- 商业投资
- 大科技公司

### 搜索功能

- 支持关键词搜索
- 搜索新闻标题和内容
- 实时搜索结果
- 搜索历史保存（本地存储）

### 响应式设计

- 桌面端：多列布局，完整功能
- 平板端：自适应布局
- 移动端：单列布局，优化触摸操作

## 开发指南

### 添加新组件

1. 在 \`src/components/\` 目录下创建组件文件
2. 使用TypeScript和函数式组件
3. 添加适当的props类型定义
4. 在 \`src/components/index.ts\` 中导出

### 添加新的API端点

1. 在 \`src/services/api.ts\` 中添加新的方法
2. 定义相应的类型接口
3. 添加错误处理

### 样式指南

- 使用Tailwind CSS类名
- 遵循响应式设计原则
- 保持一致的颜色和间距

## 浏览器支持

- Chrome >= 88
- Firefox >= 85
- Safari >= 14
- Edge >= 88

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！