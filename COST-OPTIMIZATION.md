# AWS新闻聚合系统 - 免费额度成本优化指南

## 🎯 优化目标

将系统运行成本控制在AWS免费额度内，实现**$0月费用**，并在7天后自动清理新闻数据。

## 📊 优化后的配置摘要

### Lambda函数配置
- **Fetcher**: 512MB内存，3分钟超时，30分钟调度间隔
- **API**: 128MB内存，25秒超时
- **Notifier**: 128MB内存，90秒超时

### 新闻源抓取间隔
- **高优先级源** (TechCrunch, Wired): 30分钟
- **中优先级源** (VentureBeat, Engadget, Gizmodo): 40分钟  
- **特殊源** (Techmeme): 20分钟

### 数据保留策略
- **文章数据**: 7天TTL自动清理
- **通知数据**: 30天TTL自动清理

### 日志优化
- **日志级别**: WARN（仅记录警告和错误）
- **Source Map**: 禁用以减少包大小

## 📈 预估资源使用量

### Lambda使用量（月）
```bash
# 优化后预估
Fetcher: 1,440次 × 20秒 × 512MB = 14,400 GB-秒
API: 1,000次 × 1秒× 128MB = 128 GB-秒
Notifier: 50次 × 2秒 × 128MB = 12.8 GB-秒
总计: ~14,541 GB-秒 (远低于40万GB-秒免费额度)
```

### DynamoDB使用量（月）
```bash
# 优化后预估
存储: ~200MB (7天TTL清理，远低于25GB免费额度)
读取: ~1,500次 (远低于25万次免费额度)
写入: ~2,000次 (远低于25万次免费额度)
```

### 其他服务使用量（月）
```bash
API Gateway: ~1,000次 (远低于100万次免费额度)
SNS: ~50次 (远低于100万次免费额度)
EventBridge: ~1,440次 (远低于1400万次免费额度)
CloudWatch日志: ~100MB (远低于5GB免费额度)
```

## 🚀 部署步骤

### 1. 环境准备
```bash
# 设置环境变量（成本优化）
export AWS_DEFAULT_REGION=us-east-1
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=us-east-1

# 可选：设置通知邮箱
export NOTIFICATION_EMAIL=your-email@example.com
```

### 2. 构建和部署
```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm run build

# 部署基础设施
cd infra
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION
npx cdk deploy --all --require-approval never
```

### 3. 设置成本监控
```bash
# 运行成本监控脚本
chmod +x scripts/setup-cost-monitoring.sh
./scripts/setup-cost-monitoring.sh
```

## 📊 成本监控

### 预算告警
- **月度预算**: $5 USD
- **80%告警**: 实际花费超过$4时邮件通知
- **100%告警**: 预测花费超过$5时邮件通知

### CloudWatch告警
- **Lambda调用次数**: 超过80万次/月时告警
- **DynamoDB读取**: 超过20单位/小时时告警
- **DynamoDB写入**: 超过20单位/小时时告警

### 实时监控命令
```bash
# 查看当前月费用
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '1 month ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE

# 查看Lambda调用次数
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=news-agg-fetcher \
  --start-time $(date -d '1 day ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 3600 \
  --statistics Sum

# 查看DynamoDB容量使用
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=articles \
  --start-time $(date -d '1 day ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 3600 \
  --statistics Sum
```

## ⚠️ 重要注意事项

### 免费额度限制
- **AWS免费额度仅适用于新账户的前12个月**
- **超出免费额度将按标准费率计费**
- **建议设置预算告警防止意外费用**

### 性能与成本平衡
- **较低的内存配置可能导致Lambda执行时间延长**
- **较长的抓取间隔可能错过实时新闻**
- **7天数据保留可能不满足历史数据分析需求**

### 扩展考虑
如需更高频率或更多功能，考虑以下升级路径：
- **增加Lambda内存**: 512MB → 1024MB
- **缩短抓取间隔**: 30分钟 → 15分钟
- **延长数据保留**: 7天 → 30天
- **预估额外成本**: $10-25/月

## 🔧 故障排除

### 常见问题
1. **Lambda超时**: 增加timeout配置或优化代码
2. **DynamoDB限流**: 检查读写容量配置
3. **成本超预期**: 检查CloudWatch指标找出高用量服务

### 紧急成本控制
```bash
# 暂停定时调度（紧急情况）
aws events disable-rule --name news-agg-fetcher-schedule

# 恢复定时调度
aws events enable-rule --name news-agg-fetcher-schedule

# 完全销毁资源
cd infra
npx cdk destroy --all --force
```

## 📋 优化检查清单

- [x] **抓取间隔**: 设置为30分钟以上
- [x] **Lambda内存**: Fetcher 512MB，API/Notifier 128MB
- [x] **日志级别**: 设置为WARN
- [x] **TTL清理**: Articles表7天自动清理
- [x] **预算告警**: 设置$5月度预算
- [x] **监控指标**: 设置关键指标告警
- [x] **Source Map**: 禁用以减少包大小

## 💡 进一步优化建议

### 阶段性部署
1. **第一周**: 最保守配置，观察使用量
2. **第二周**: 根据实际使用情况微调
3. **第三周**: 达到最佳成本效益平衡

### 高级优化
- **预留并发**: 避免Lambda冷启动（需额外费用）
- **DynamoDB预置容量**: 预测性工作负载（可能更经济）
- **S3配置存储**: 将配置文件存储在S3（减少Lambda包大小）

---

**🎯 结论**: 通过以上优化，系统可以在AWS免费额度内稳定运行，实现$0月费用，同时保持基本的新闻聚合功能。
