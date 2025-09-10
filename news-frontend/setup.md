# 快速设置指南

## 🚀 快速开始

### 1. 安装依赖

```bash
cd news-frontend
npm install
```

### 2. 配置API端点

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，替换为您的实际API端点：
```env
VITE_API_URL=https://your-actual-api-gateway-url.amazonaws.com
```

### 3. 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:5173 启动

### 4. 构建生产版本

```bash
npm run build
```

### 5. 预览生产版本

```bash
npm run preview
```

## 📋 功能检查清单

启动应用后，请验证以下功能：

- [ ] 页面正常加载
- [ ] 新闻列表显示（如果API可用）
- [ ] 搜索功能工作
- [ ] 分类筛选工作
- [ ] 响应式设计（调整浏览器窗口大小）
- [ ] 移动端适配（使用浏览器开发者工具）

## 🔧 故障排除

### API连接失败
- 检查 `.env` 文件中的API URL是否正确
- 确认API服务正在运行
- 检查浏览器控制台的错误信息

### 样式问题
- 确认Tailwind CSS正确加载
- 检查是否有CSS构建错误

### 构建失败
- 运行 `npm run type-check` 检查TypeScript错误
- 确认所有依赖已正确安装

## 📱 移动端测试

使用以下方法测试移动端：

1. **浏览器开发者工具**
   - 按F12打开开发者工具
   - 点击设备图标切换到移动视图
   - 测试不同屏幕尺寸

2. **实际设备测试**
   - 在同一网络下使用手机访问开发服务器
   - 地址通常是：`http://your-computer-ip:5173`

## 🚀 部署准备

部署前确保：

- [ ] 所有功能测试通过
- [ ] 生产构建成功：`npm run build`
- [ ] 环境变量配置正确
- [ ] API端点可从生产环境访问

详细部署说明请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📚 项目结构

```
src/
├── components/          # React组件
│   ├── NewsCard.tsx    # 新闻卡片
│   ├── SearchBar.tsx   # 搜索栏
│   ├── CategoryFilter.tsx # 分类筛选
│   ├── LoadingSpinner.tsx # 加载动画
│   ├── ErrorMessage.tsx   # 错误提示
│   └── index.ts        # 组件导出
├── services/           # API服务
│   └── api.ts         # API调用逻辑
├── types/             # TypeScript类型
│   └── index.ts       # 类型定义
├── App.tsx            # 主应用组件
├── main.tsx           # 应用入口
└── index.css          # 全局样式
```

## 🎨 定制化

### 修改主题颜色

编辑 `tailwind.config.js`：

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // 修改主色调
        500: '#your-color',
        600: '#your-darker-color',
      }
    }
  }
}
```

### 添加新的新闻分类

编辑 `src/types/index.ts` 中的 `NEWS_CATEGORIES`：

```typescript
export const NEWS_CATEGORIES = [
  // 添加新分类
  { id: 'your-category', name: '您的分类', color: 'bg-color text-color' },
] as const;
```

### 修改API端点

编辑 `src/services/api.ts` 中的 `API_CONFIG`。

## 🔍 开发提示

- 使用React DevTools浏览器扩展进行调试
- 检查浏览器控制台的网络请求
- 使用TypeScript严格模式确保类型安全
- 遵循ESLint规则保持代码质量

## 📞 获取帮助

- 查看 [README.md](./README.md) 了解详细信息
- 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 了解部署说明
- 检查浏览器控制台错误信息
- 确认API服务状态
