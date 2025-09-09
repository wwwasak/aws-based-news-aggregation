#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from './stacks/database-stack';
import { NotificationStack } from './stacks/notification-stack';
import { LambdaStack } from './stacks/lambda-stack';
import { ApiStack } from './stacks/api-stack';
import { SchedulerStack } from './stacks/scheduler-stack';

const app = new cdk.App();

// 获取环境配置
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// 获取可选配置
const notificationEmail = app.node.tryGetContext('notificationEmail') || process.env.NOTIFICATION_EMAIL;

// 项目名称前缀
const projectName = 'news-agg';

// 1. 创建数据库栈
const databaseStack = new DatabaseStack(app, `${projectName}-database`, {
  env,
  description: 'DynamoDB table for news articles with streams enabled',
});

// 2. 创建通知栈
const notificationStack = new NotificationStack(app, `${projectName}-notification`, {
  env,
  description: 'SNS topic for notifications (placeholder for APNs/FCM)',
  notificationEmail,
});

// 3. 创建 Lambda 函数栈
const lambdaStack = new LambdaStack(app, `${projectName}-lambda`, {
  env,
  description: 'Lambda functions for news fetching, API, and notifications',
  articlesTable: databaseStack.articlesTable,
  notificationsTable: databaseStack.notificationsTable,
  notificationTopic: notificationStack.notificationTopic,
});

// 4. 创建 API Gateway 栈
const apiStack = new ApiStack(app, `${projectName}-api`, {
  env,
  description: 'HTTP API Gateway for news access endpoints',
  apiFunction: lambdaStack.apiFunction,
});

// 5. 创建调度器栈
const schedulerStack = new SchedulerStack(app, `${projectName}-scheduler`, {
  env,
  description: 'EventBridge scheduler for periodic news fetching',
  fetcherFunction: lambdaStack.fetcherFunction,
});

// 设置栈依赖关系
lambdaStack.addDependency(databaseStack);
lambdaStack.addDependency(notificationStack);
apiStack.addDependency(lambdaStack);
schedulerStack.addDependency(lambdaStack);

// 添加全局标签
cdk.Tags.of(app).add('Project', 'NewsAggregation');
cdk.Tags.of(app).add('Environment', app.node.tryGetContext('environment') || 'dev');
cdk.Tags.of(app).add('ManagedBy', 'AWS-CDK');

// 合成应用
app.synth();