# 📝 配置更新指南

## 🎯 何时需要更新部署

每当您修改以下配置文件时，需要重新部署：
- `configs/keywords.yaml` - 关键词和评分规则
- `configs/sources.yaml` - 新闻源配置

## 🚀 更新部署方法

### 方法1: 使用自动化脚本（推荐）

**Windows用户：**
```bash
# 在项目根目录运行
update-config.bat
```

**Linux/Mac用户：**
```bash
# 在项目根目录运行
./update-config.sh
```

### 方法2: 手动执行命令

```bash
# 1. 构建应用
cd apps/fetcher && npm run build
cd ../api && npm run build  
cd ../notifier && npm run build

# 2. 构建CDK
cd ../../infra && npm run build

# 3. 重新部署Lambda函数
npx cdk deploy news-agg-lambda --require-approval never
```

### 方法3: 仅重新部署Lambda（最快）

如果只修改了配置文件，可以直接：

```bash
cd infra
npx cdk deploy news-agg-lambda --require-approval never
```

## ✅ 验证更新是否成功

部署完成后，测试新配置：

```bash
# 手动触发Lambda函数
aws lambda invoke --function-name news-agg-fetcher --payload "{}" response.json

# 查看结果
cat response.json

# 查看详细日志
aws logs tail /aws/lambda/news-agg-fetcher --since 5m
```

## ⚡ 快速更新流程

1. **编辑配置** → `configs/keywords.yaml` 或 `configs/sources.yaml`
2. **运行脚本** → `update-config.bat` (Windows) 或 `./update-config.sh` (Linux/Mac)  
3. **测试验证** → 检查Lambda函数是否正常工作

## 🔍 常见问题

**Q: 修改配置后为什么没有生效？**
A: 需要重新部署Lambda函数，因为配置文件是打包到Lambda部署包中的。

**Q: 部署失败怎么办？**
A: 检查AWS CLI配置，确保有足够的权限，然后重试部署命令。

**Q: 如何回滚配置？**
A: 恢复配置文件到之前的版本，然后重新部署。

## 📊 部署时间参考

- **仅Lambda部署**: ~30-60秒
- **完整部署**: ~2-3分钟
- **首次部署**: ~5-10分钟
