#!/bin/bash

# AWS新闻聚合系统成本监控和预算告警设置脚本
# 用于AWS免费额度监控

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 设置AWS新闻聚合系统成本监控${NC}"
echo "=================================================="

# 获取AWS账户ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}📍 AWS账户ID: ${ACCOUNT_ID}${NC}"

# 设置预算告警邮箱
read -p "请输入接收预算告警的邮箱地址: " ALERT_EMAIL
if [[ -z "$ALERT_EMAIL" ]]; then
    echo -e "${RED}❌ 邮箱地址不能为空${NC}"
    exit 1
fi

echo -e "${YELLOW}📊 创建预算告警...${NC}"

# 创建$5月度预算告警
aws budgets create-budget \
  --account-id $ACCOUNT_ID \
  --budget '{
    "BudgetName": "NewsAgg-Monthly-Budget",
    "BudgetLimit": {
      "Amount": "5.00",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST",
    "CostFilters": {
      "Service": [
        "Amazon DynamoDB",
        "AWS Lambda",
        "Amazon API Gateway",
        "Amazon Simple Notification Service",
        "Amazon EventBridge",
        "Amazon CloudWatch"
      ]
    }
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "Address": "'$ALERT_EMAIL'",
          "SubscriptionType": "EMAIL"
        }
      ]
    },
    {
      "Notification": {
        "NotificationType": "FORECASTED",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 100,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "Address": "'$ALERT_EMAIL'",
          "SubscriptionType": "EMAIL"
        }
      ]
    }
  ]' || echo -e "${YELLOW}⚠️ 预算可能已存在，跳过创建${NC}"

echo -e "${YELLOW}📈 创建CloudWatch告警...${NC}"

# Lambda调用次数告警 - 防止超出免费额度
aws cloudwatch put-metric-alarm \
  --alarm-name "NewsAgg-HighLambdaInvocations" \
  --alarm-description "Lambda调用次数接近免费额度限制" \
  --metric-name Invocations \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 800000 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:$(aws configure get region):$ACCOUNT_ID:news-agg-notifications || echo -e "${YELLOW}⚠️ SNS主题可能不存在，请部署后重新运行${NC}"

# DynamoDB读取容量告警
aws cloudwatch put-metric-alarm \
  --alarm-name "NewsAgg-HighDynamoDBReads" \
  --alarm-description "DynamoDB读取容量使用过高" \
  --metric-name ConsumedReadCapacityUnits \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 20 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=TableName,Value=articles || echo -e "${YELLOW}⚠️ DynamoDB表可能不存在，请部署后重新运行${NC}"

# DynamoDB写入容量告警
aws cloudwatch put-metric-alarm \
  --alarm-name "NewsAgg-HighDynamoDBWrites" \
  --alarm-description "DynamoDB写入容量使用过高" \
  --metric-name ConsumedWriteCapacityUnits \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 20 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=TableName,Value=articles || echo -e "${YELLOW}⚠️ DynamoDB表可能不存在，请部署后重新运行${NC}"

echo -e "${GREEN}✅ 成本监控设置完成！${NC}"
echo ""
echo -e "${BLUE}📋 监控摘要:${NC}"
echo "• 月度预算: $5 USD"
echo "• 告警邮箱: $ALERT_EMAIL"
echo "• 80%预算时发送实际花费告警"
echo "• 100%预算时发送预测花费告警"
echo "• Lambda调用次数告警阈值: 80万次/月"
echo "• DynamoDB读写容量告警阈值: 20单位/小时"
echo ""
echo -e "${YELLOW}🔍 查看当前成本命令:${NC}"
echo "aws ce get-cost-and-usage --time-period Start=\$(date -d '1 month ago' +%Y-%m-%d),End=\$(date +%Y-%m-%d) --granularity MONTHLY --metrics BlendedCost --group-by Type=DIMENSION,Key=SERVICE"
echo ""
echo -e "${YELLOW}📊 查看预算状态命令:${NC}"
echo "aws budgets describe-budgets --account-id $ACCOUNT_ID"
