# 部署指南

本文档详细说明了 AWS 新闻聚合系统的部署流程。

## 📋 部署前检查清单

### 1. 环境准备
- [ ] Node.js >= 18.0.0
- [ ] pnpm >= 8.0.0
- [ ] AWS CLI 已配置
- [ ] AWS CDK >= 2.110.0
- [ ] 足够的 AWS 权限

### 2. AWS 权限要求
确保您的 AWS 凭证具有以下权限：
- CloudFormation (完整权限)
- Lambda (完整权限)
- DynamoDB (完整权限)
- API Gateway (完整权限)
- EventBridge (完整权限)
- SNS (完整权限)
- S3 (完整权限)
- IAM (创建角色和策略)
- CloudWatch (日志和指标)

## 🚀 部署步骤

### 步骤 1: 环境配置

```bash
# 设置环境变量
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=us-east-1  # 或您偏好的区域
export NOTIFICATION_EMAIL=your-email@example.com  # 可选
```

### 步骤 2: 项目准备

```bash
# 克隆项目
git clone <repository-url>
cd aws-news-aggregation

# 安装依赖
pnpm install

# 构建项目
pnpm run build
```

### 步骤 3: CDK Bootstrap

首次在账户/区域中使用 CDK 时需要执行：

```bash
# Bootstrap CDK
pnpm run bootstrap

# 或手动执行
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION
```

### 步骤 4: 语法检查

```bash
# 检查 CDK 模板语法
pnpm run synth
```

如果成功，您将看到生成的 CloudFormation 模板在 `infra/cdk.out/` 目录中。

### 步骤 5: 预览变更

```bash
# 查看将要部署的资源
cd infra
npx cdk diff
```

### 步骤 6: 执行部署

```bash
# 部署所有栈
pnpm run deploy

# 或逐个部署
npx cdk deploy aws-news-s3-stack
npx cdk deploy aws-news-dynamodb-stack
npx cdk deploy aws-news-sns-stack
npx cdk deploy aws-news-lambda-stack
npx cdk deploy aws-news-api-stack
npx cdk deploy aws-news-eventbridge-stack
```

部署过程大约需要 5-10 分钟。

## 📊 部署验证

### 1. 检查资源创建

```bash
# 检查 Lambda 函数
aws lambda list-functions --query 'Functions[?contains(FunctionName, `aws-news`)].FunctionName'

# 检查 DynamoDB 表
aws dynamodb list-tables --query 'TableNames[?contains(@, `NewsArticles`)]'

# 检查 API Gateway
aws apigatewayv2 get-apis --query 'Items[?contains(Name, `news`)].{Name:Name,ApiEndpoint:ApiEndpoint}'
```

### 2. 测试 API 端点

部署完成后，CDK 会输出 API Gateway 的端点 URL：

```bash
# 测试健康检查
curl https://<api-id>.execute-api.<region>.amazonaws.com/health

# 预期响应
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2023-12-01T10:00:00.000Z",
    "version": "1.0.0"
  }
}
```

### 3. 触发新闻抓取

```bash
# 手动触发抓取
aws lambda invoke \
  --function-name aws-news-fetcher \
  --payload '{"detail":{"forceRefresh":true}}' \
  response.json

# 查看响应
cat response.json
```

### 4. 检查 DynamoDB 数据

```bash
# 查看文章数量
aws dynamodb scan \
  --table-name NewsArticles \
  --select "COUNT" \
  --query 'Count'
```

## 🔧 配置更新

### 更新新闻源配置

1. 修改 `configs/sources.yaml`
2. 重新部署 S3 栈：
   ```bash
   npx cdk deploy aws-news-s3-stack
   ```

### 更新关键词配置

1. 修改 `configs/keywords.yaml`
2. 重新部署 S3 栈：
   ```bash
   npx cdk deploy aws-news-s3-stack
   ```

## 🔄 回滚操作

### 查看部署历史

```bash
# 查看栈状态
aws cloudformation describe-stacks \
  --query 'Stacks[?contains(StackName, `aws-news`)].{Name:StackName,Status:StackStatus}'

# 查看栈事件
aws cloudformation describe-stack-events \
  --stack-name aws-news-lambda-stack \
  --query 'StackEvents[0:10].{Time:Timestamp,Status:ResourceStatus,Reason:ResourceStatusReason}'
```

### 回滚到上一个版本

```bash
# 方式 1: 使用 CloudFormation 控制台回滚

# 方式 2: 使用 CLI 回滚
aws cloudformation cancel-update-stack --stack-name <stack-name>

# 方式 3: 重新部署上一个版本的代码
git checkout <previous-commit>
pnpm run build
pnpm run deploy
```

### 完全销毁环境

```bash
# 销毁所有资源 (谨慎操作!)
pnpm run destroy

# 或手动销毁
npx cdk destroy --all --force
```

**注意**: 销毁操作会删除所有数据，包括 DynamoDB 表中的文章数据。

## 🚨 故障排除

### 常见问题

#### 1. CDK Bootstrap 失败
```
Error: Need to perform AWS CDK bootstrap
```
**解决方案**:
```bash
npx cdk bootstrap --trust-account-id $CDK_DEFAULT_ACCOUNT
```

#### 2. 权限不足
```
Error: User is not authorized to perform: iam:CreateRole
```
**解决方案**: 确保 AWS 凭证具有足够的 IAM 权限。

#### 3. Lambda 部署失败
```
Error: The role defined for the function cannot be assumed by Lambda
```
**解决方案**: 等待几分钟让 IAM 角色传播，然后重试。

#### 4. API Gateway 无法访问
**解决方案**: 检查 CORS 配置和安全组设置。

### 日志查看

```bash
# 查看 Lambda 日志
aws logs tail /aws/lambda/aws-news-fetcher --follow

# 查看特定时间段的日志
aws logs filter-log-events \
  --log-group-name /aws/lambda/aws-news-api \
  --start-time $(date -d '1 hour ago' +%s)000
```

### 监控指标

```bash
# 查看 Lambda 调用次数
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=aws-news-fetcher \
  --statistics Sum \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 3600
```

## 📈 性能优化建议

### 1. Lambda 冷启动优化
- 使用预留并发
- 减少依赖包大小
- 使用 ARM64 架构

### 2. DynamoDB 优化
- 监控读写容量单位
- 优化查询模式
- 考虑使用 DAX 缓存

### 3. API Gateway 优化
- 启用缓存
- 配置节流限制
- 使用 CloudFront 分发

## 🔒 安全最佳实践

### 1. IAM 权限最小化
```bash
# 创建专用的部署角色
aws iam create-role --role-name CDKDeploymentRole --assume-role-policy-document file://trust-policy.json
```

### 2. 加密配置
- 启用 DynamoDB 加密
- 使用 KMS 管理密钥
- 启用 S3 存储桶加密

### 3. 网络安全
- 配置 VPC 端点
- 启用 WAF 保护
- 设置 API 速率限制

## 📞 获取帮助

如果遇到部署问题：

1. 检查 [故障排除](#-故障排除) 部分
2. 查看 CloudFormation 控制台的错误信息
3. 查看 Lambda 函数日志
4. 提交 GitHub Issue 并附上错误信息

---

**重要提醒**: 
- 部署会产生 AWS 费用，请监控使用情况
- 生产环境部署前请进行充分测试
- 定期备份重要数据和配置

