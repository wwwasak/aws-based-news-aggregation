# News Aggregation System

基于 AWS Serverless 的新闻聚合系统，支持关键词过滤、去重、评分和实时通知。

## 🏗️ 架构

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   EventBridge   │───▶│   Fetcher    │───▶│   DynamoDB      │
│   (定时调度)     │    │   Lambda     │    │   (新闻存储)     │
└─────────────────┘    └──────────────┘    └─────────────────┘
                                                      │
                                                      ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   API Gateway   │◀───│     API      │    │  DynamoDB       │
│   (HTTP API)    │    │   Lambda     │    │   Streams       │
└─────────────────┘    └──────────────┘    └─────────────────┘
                                                      │
                                                      ▼
                                           ┌─────────────────┐
                                           │   Notifier      │
                                           │   Lambda        │
                                           └─────────────────┘
                                                      │
                                                      ▼
                                           ┌─────────────────┐
                                           │      SNS        │
                                           │   (推送通知)     │
                                           └─────────────────┘
```

## 📁 项目结构

```
news-agg/
├── apps/                           # Lambda 应用
│   ├── api/                        # REST API 服务
│   ├── fetcher/                    # 新闻抓取和处理
│   └── notifier/                   # 推送通知服务
├── packages/                       # 共享包
│   ├── shared/                     # 类型定义和工具函数
│   ├── store/                      # DynamoDB 数据访问层
│   └── keyword-engine/             # 关键词匹配引擎
├── configs/                        # 配置文件
│   ├── sources.yaml                # 新闻源配置
│   └── keywords.yaml               # 关键词规则配置
├── infra/                          # CDK 基础设施
│   └── cdk/                        # CDK 应用和栈
└── .github/workflows/              # CI/CD 管道
```

## 🚀 快速开始

### 先决条件

#### 1. **系统环境**
- **Node.js**: 18.x 或更高版本
- **pnpm**: 8.x 或更高版本 (`npm install -g pnpm`)
- **AWS CLI**: 2.x 已配置 (`aws configure`)
- **AWS CDK**: 2.x (`npm install -g aws-cdk`)

#### 2. **AWS 账户准备**
```bash
# 验证 AWS 配置
aws sts get-caller-identity

# CDK Bootstrap（每个 AWS 账户+区域只需一次）
npx cdk bootstrap aws://ACCOUNT-ID/REGION
```

#### 3. **权限要求**
AWS 用户/角色需要以下权限：
- `AWSLambdaFullAccess`
- `AmazonDynamoDBFullAccess`
- `AmazonAPIGatewayAdministrator`
- `AmazonEventBridgeFullAccess`
- `AmazonSNSFullAccess`
- `CloudFormationFullAccess`
- `IAMFullAccess`（用于创建 Lambda 执行角色）

### 环境变量配置

#### **必需环境变量**
```bash
# 部署时设置
export AWS_DEFAULT_REGION=us-east-1
export CDK_DEFAULT_ACCOUNT=123456789012
export CDK_DEFAULT_REGION=us-east-1

# Lambda 运行时环境变量（CDK 自动设置）
export ARTICLES_TABLE_NAME=news-agg-articles
export NOTIFICATIONS_TABLE_NAME=news-agg-notifications
export SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:news-notifications
export LOG_LEVEL=info
```

#### **可选配置变量**
```bash
# 业务逻辑阈值
export BIG_TECH_MIN_SCORE=70          # BigTech 文章最小分数
export POLICY_MIN_SCORE=50            # 政策文章最小分数
export AI_MIN_SCORE=40                # AI 文章最小分数
export BREAKING_MIN_SCORE=80          # 突发新闻最小分数

# 通知配置
export DEDUP_WINDOW_HOURS=24          # 通知去重时间窗口（小时）
export MAX_NOTIFICATIONS_PER_HOUR=10  # 每小时最大通知数

# 抓取配置
export FETCH_TIMEOUT_MS=30000         # 抓取超时时间
export MAX_CONCURRENT_FETCHES=5       # 最大并发抓取数
export RETRY_MAX_ATTEMPTS=3           # 最大重试次数
```

### 一键部署

```bash
# 完整部署流程
pnpm install           # 安装所有依赖
pnpm run build        # 构建所有 Lambda 包
pnpm run deploy       # CDK synth + deploy

# 等同于：
# cd infra && pnpm run build && cdk synth && cdk deploy --all --require-approval never
```

#### **分步部署**（可选）
```bash
# 1. 安装依赖
pnpm install

# 2. 构建项目
pnpm run build

# 3. CDK 语法检查
cd infra && npx cdk synth

# 4. 查看部署计划
npx cdk diff

# 5. 执行部署
npx cdk deploy --all

# 6. 验证部署
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `news-agg`)].FunctionName'
```

## 🔄 回滚和更新

### 完整回滚
```bash
# 销毁所有资源
cd infra
npx cdk destroy --all --force

# 确认资源清理
aws cloudformation list-stacks --stack-status-filter DELETE_COMPLETE
```

### 选择性更新

#### **仅更新 Lambda 函数**
```bash
# 重新构建特定 Lambda
cd apps/fetcher && pnpm run build

# 更新单个函数
aws lambda update-function-code \
  --function-name news-agg-fetcher \
  --zip-file fileb://dist/index.zip

# 或使用 CDK 选择性部署
cd infra
npx cdk deploy NewsAggLambdaStack --require-approval never
```

#### **仅更新配置**
```bash
# 更新环境变量
aws lambda update-function-configuration \
  --function-name news-agg-fetcher \
  --environment Variables='{LOG_LEVEL=debug,BIG_TECH_MIN_SCORE=80}'

# 更新 DynamoDB 表配置
cd infra
npx cdk deploy NewsAggDatabaseStack --require-approval never
```

#### **版本回滚**
```bash
# 查看 Lambda 版本
aws lambda list-versions-by-function --function-name news-agg-fetcher

# 回滚到特定版本
aws lambda update-alias \
  --function-name news-agg-fetcher \
  --name LIVE \
  --function-version 2

# 使用 CDK 回滚到上一个版本
cd infra
git checkout HEAD~1 -- .
npx cdk deploy --all --require-approval never
```

## 🐛 本地调试

### Fetcher 本地运行

#### **完整流程测试**
```bash
# 设置环境变量
export LOG_LEVEL=debug
export ARTICLES_TABLE_NAME=articles-dev
export NODE_ENV=development

# 运行 Fetcher（读取本地 YAML 配置）
pnpm run dev:fetcher

# 输出示例：
# {"level":"info","service":"news-aggregator","name":"fetcher","msg":"Starting news fetch process"}
# {"level":"info","msg":"Configuration loaded","sourcesCount":6,"enabledSources":6}
# {"level":"info","msg":"Processing source started","source":"TechCrunch","type":"rss"}
# {"level":"info","msg":"Fetch process completed successfully","stats":{"totalProcessed":25,"successCount":20}}
```

#### **单源测试**
```bash
# 修改 apps/fetcher/src/dev.ts 中的 sourceNames
# detail: { sourceNames: ['TechCrunch'] }

pnpm run dev:fetcher
```

#### **错峰调度测试**
```bash
# 测试调度算法（运行 2 分钟）
pnpm run dev:scheduler

# 观察输出：
# - 初始错峰延迟
# - 令牌桶限速效果
# - 指数退避重试
# - 实时调度状态
```

### API 本地测试
```bash
# 启动本地 API 服务器
pnpm run dev:api

# 在另一个终端测试
curl http://localhost:3000/health
curl "http://localhost:3000/v1/feed/bigtech?limit=10"
```

### 关键词引擎测试
```bash
cd packages/keyword-engine

# 测试内置用例
pnpm run dev:test

# 测试 YAML 配置加载
pnpm run dev:yaml

# 运行单元测试
pnpm test
```

## 📡 API 使用指南

### 获取部署后的 API 端点
```bash
# 从 CDK 输出获取
cd infra
npx cdk list
aws cloudformation describe-stacks --stack-name NewsAggApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text
```

### API 端点和示例

#### **1. 健康检查**
```bash
curl -X GET "https://api-id.execute-api.us-east-1.amazonaws.com/health"

# 响应示例：
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

#### **2. BigTech 新闻流**
```bash
# 获取最新 BigTech 新闻
curl -X GET "https://api-id.execute-api.us-east-1.amazonaws.com/v1/feed/bigtech?limit=20"

# 分页查询
curl -X GET "https://api-id.execute-api.us-east-1.amazonaws.com/v1/feed/bigtech?limit=20&cursor=eyJHU0kxU0siOiIyMDIzLTEyLTAxVDEwOjMwOjAwLjAwMFoifQ=="

# 响应示例：
{
  "items": [
    {
      "id": "ts#1701423000#abc123",
      "title": "Apple Unveils New AI-Powered Features",
      "source": "TechCrunch",
      "domain": "techcrunch.com",
      "url": "https://techcrunch.com/2023/12/01/apple-ai-features",
      "summary": "Apple announced new artificial intelligence capabilities...",
      "publishedAt": "2023-12-01T10:30:00.000Z",
      "tags": ["apple", "ai", "bigtech"],
      "score": 85
    }
  ],
  "nextCursor": "eyJHU0kxU0siOiIyMDIzLTEyLTAxVDA5OjMwOjAwLjAwMFoifQ==",
  "total": 150
}
```

#### **3. 搜索文章**
```bash
# 关键词搜索
curl -X GET "https://api-id.execute-api.us-east-1.amazonaws.com/v1/search?q=antitrust+Google&limit=10"

# 复合搜索
curl -X GET "https://api-id.execute-api.us-east-1.amazonaws.com/v1/search?q=AI+regulation&tags=policy,bigtech&limit=20"

# 分页搜索
curl -X GET "https://api-id.execute-api.us-east-1.amazonaws.com/v1/search?q=OpenAI&limit=10&cursor=eyJzY29yZSI6ODUsInRzIjoiMjAyMy0xMi0wMVQxMDozMDowMC4wMDBaIn0="

# 响应示例：
{
  "items": [
    {
      "id": "ts#1701423000#def456",
      "title": "DOJ Launches Antitrust Investigation into Google",
      "source": "Reuters",
      "domain": "reuters.com",
      "url": "https://reuters.com/technology/doj-google-antitrust-2023",
      "summary": "The Department of Justice has opened a new investigation...",
      "publishedAt": "2023-12-01T09:15:00.000Z",
      "tags": ["google", "antitrust", "policy", "doj"],
      "score": 92,
      "relevanceScore": 0.95
    }
  ],
  "nextCursor": "eyJzY29yZSI6OTAsInRzIjoiMjAyMy0xMi0wMVQwOToxNTowMC4wMDBaIn0=",
  "total": 45,
  "searchStats": {
    "query": "antitrust Google",
    "matchedTerms": ["antitrust", "google"],
    "searchTime": 150
  }
}
```

#### **4. 错误响应**
```bash
# 无效请求
curl -X GET "https://api-id.execute-api.us-east-1.amazonaws.com/v1/feed/bigtech?limit=1001"

# 响应：
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Limit must be between 1 and 100",
    "details": {
      "parameter": "limit",
      "value": 1001,
      "allowedRange": "1-100"
    }
  },
  "requestId": "12345-67890-abcdef"
}
```

### 本地开发

```bash
# 运行抓取器测试
pnpm run dev:fetcher

# 运行 API 测试
pnpm run dev:api
```

### 部署

#### 1. 环境准备

```bash
# 设置 AWS 环境变量
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=us-east-1  # 或您选择的区域

# 可选：设置通知邮箱
export NOTIFICATION_EMAIL=your-email@example.com
```

#### 2. CDK Bootstrap（首次部署必需）

```bash
# 进入基础设施目录
cd infra

# Bootstrap CDK（为您的账户/区域准备 CDK 部署环境）
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION
```

#### 3. 部署基础设施

```bash
# 检查将要部署的资源
pnpm run diff

# 部署所有栈
pnpm run deploy

# 或者逐个部署栈（推荐用于生产环境）
npx cdk deploy news-agg-database
npx cdk deploy news-agg-notification
npx cdk deploy news-agg-lambda
npx cdk deploy news-agg-api
npx cdk deploy news-agg-scheduler
```

#### 4. 验证部署

```bash
# 查看输出的 API URL
aws cloudformation describe-stacks \
  --stack-name news-agg-api \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text

# 测试 API 健康检查
curl $(aws cloudformation describe-stacks \
  --stack-name news-agg-api \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text)/health
```

#### 5. 回滚和清理

```bash
# 销毁所有资源（注意：这将删除所有数据！）
pnpm run destroy

# 或者逐个销毁栈
npx cdk destroy news-agg-scheduler
npx cdk destroy news-agg-api
npx cdk destroy news-agg-lambda
npx cdk destroy news-agg-notification
npx cdk destroy news-agg-database
```

## 🗄️ 数据库设计

### DynamoDB 表结构

#### 主表：`articles`

**主键设计**
- **PK (分区键)**: `tag#<tag>` | `source#<domain>` | `day#YYYYMMDD`
- **SK (排序键)**: `ts#<epoch>#<urlHash>`

**属性**
- `url` - 原始文章 URL
- `urlHash` - URL 哈希值
- `source` - 新闻源名称
- `domain` - 新闻源域名
- `title` - 文章标题
- `titleNorm` - 标准化标题
- `summary` - 文章摘要
- `publishedAt` - 发布时间 (ISO 8601)
- `lang` - 语言代码
- `tags` - 标签数组
- `score` - 文章分数 (0-100)
- `isBigTech` - 是否大科技公司相关
- `isPolicy` - 是否政策相关

**全局二级索引**

**GSI1 (按标签查询)**
- **GSI1PK**: `tag#<tag>`
- **GSI1SK**: `publishedAt`
- 用途: 按标签和时间范围查询文章

**GSI2 (按来源查询)**
- **GSI2PK**: `source#<domain>`
- **GSI2SK**: `publishedAt`
- 用途: 按新闻源和时间范围查询文章

**DynamoDB Streams**
- 视图类型: `NEW_IMAGE`
- 用途: 触发通知 Lambda 处理高分文章

## 📊 API 文档

### 端点

#### 健康检查
```http
GET /health
```

#### 大科技公司新闻
```http
GET /v1/feed/bigtech?limit=50&cursor=<cursor>
```

**参数**:
- `limit`: 返回数量 (1-100, 默认20)
- `cursor`: 分页游标 (Base64 编码的 LastEvaluatedKey)

**查询策略**: 使用 GSI1 查询 `tag#bigtech` 标签，按时间倒序返回

#### 搜索新闻
```http
GET /v1/search?q=antitrust+Google&limit=50&cursor=<cursor>
```

**参数**:
- `q`: 搜索查询词 (必需, 2-200字符)
- `limit`: 返回数量 (1-100, 默认20)
- `cursor`: 分页游标

**搜索逻辑**:
- 简单包含匹配 (title|summary)
- 关键词交集增分 (companies/topics)
- 按相关性分数 + 时间排序
- 超时保护 (25秒)

### 响应格式

```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "title": "Apple announces new iPhone",
      "summary": "Apple has unveiled...",
      "url": "https://example.com/article",
      "source": "TechCrunch",
      "publishedAt": "2023-12-01T10:00:00Z",
      "score": 75,
      "tags": ["company:apple", "bigtech"],
      "matches": ["apple", "iphone"]
    }
  ],
  "pagination": {
    "nextCursor": "eyJsYXN0RXZhbHVhdGVkS2V5Ijp7InBrIjoic291cmNlI3RlY2hjcnVuY2guY29tIiwic2siOiJ0cyMxNzAxMjM0NTY3I2FiYzEyMyJ9fQ==",
    "hasMore": true,
    "count": 20
  }
}
```

## ⚙️ 配置

### 新闻源配置 (configs/sources.yaml)

**完整配置示例**:
```yaml
# 全局配置
config:
  requestTimeout: 30000
  userAgent: "NewsAggregator/1.0"
  maxConcurrency: 5

# 新闻源列表
sources:
  - name: TechCrunch
    type: rss
    url: https://techcrunch.com/feed/
    weight: 2
    intervalSec: 600  # 10分钟
    enabled: true
    rateLimit:
      requestsPerMinute: 10
      burstSize: 5

  - name: Techmeme
    type: page
    url: https://www.techmeme.com/
    weight: 3
    intervalSec: 300  # 5分钟
    enabled: true
    rateLimit:
      requestsPerMinute: 12
      burstSize: 6

# 错峰调度配置
scheduling:
  initialDelayRange: [0, 300]  # 启动时随机延迟
  jitterRange: [-60, 60]       # 执行时间随机偏移
  backoffStrategy:
    type: "exponential"
    baseDelay: 30
    maxDelay: 3600
    multiplier: 2
```

**核心特性**:
- **错峰调度**: 避免所有源同时执行，减少服务器压力
- **令牌桶限速**: 每个源独立的速率限制，防止被封禁
- **指数退避**: 失败后自动延长重试间隔
- **健康检查**: 自动监控源的可用性

### 关键词配置 (configs/keywords.yaml)

```yaml
companies:
  apple:
    keywords: [apple, iphone, ios]
    weight: 25
    tags: [bigtech, company]
    priority: 1

topics:
  ai:
    keywords: [artificial intelligence, machine learning, /\\bai\\b/]
    weight: 20
    tags: [ai, technology]
    priority: 2

blacklist: [advertisement, sponsored]
minScore: 10
```

## 🔧 开发脚本

```bash
# 构建所有包
pnpm run build

# 运行测试
pnpm run test

# 代码检查
pnpm run lint

# 类型检查
pnpm run typecheck

# 本地开发
pnpm run dev:fetcher    # 运行一次 Fetcher 主函数（读取本地 YAML）
pnpm run dev:scheduler  # 测试错峰调度和令牌桶限速
pnpm run dev:api        # 测试 API 接口

# 部署
pnpm run build         # 打包所有 Lambda
pnpm run deploy        # CDK synth && deploy --require-approval never

# 清理构建文件
pnpm run clean
```

## 🏗️ 核心功能

### 新闻抓取 (Fetcher Lambda)

**核心功能**
- **多源支持**: RSS (rss-parser) 和网页抓取 (axios + cheerio)
- **智能去重**: 
  - URL 归一化去除 UTM/跟踪参数
  - 48小时近窗内标题 Jaccard 相似度 ≥ 0.8 检测重复
- **关键词评分**: 基于 keyword-engine 的智能评分和标签匹配
- **幂等写入**: 使用 urlHash 作为条件写入，避免重复存储

**技术特性**
- **QPS 限流**: 使用 p-queue 控制并发和速率
- **指数退避**: 对 429/5xx 错误自动重试
- **结构化日志**: 成功/跳过/失败计数写入 CloudWatch
- **本地调试**: `pnpm dev:fetcher` 单次执行并显示详细统计

**数据流程**
1. 读取 `configs/sources.yaml` 配置
2. 按源类型调用对应抓取器（RSS/网页）
3. 生成候选项：`{source, domain, title, summary, url, publishedAt}`
4. URL/标题标准化和哈希计算
5. 与 DynamoDB 近窗对比去重
6. 关键词引擎评分和标签匹配
7. 幂等写入 DynamoDB (pk/sk 设计)

### 关键词引擎

**智能关键词匹配和评分引擎** (`packages/keyword-engine`)

**核心功能**:
- **占位符展开**: `$company` 和 `$topic` 自动展开为公司/主题列表
- **正则匹配**: 支持复杂的正则表达式模式（大小写不敏感）
- **规则引擎**: 支持 `any` (任一匹配) 和 `all` (全部匹配) 逻辑
- **智能评分**: 基于权重的累积评分系统
- **标签分类**: 自动添加 `bigtech`, `ai`, `policy`, `breaking` 等标签
- **黑名单过滤**: 广告和推广内容自动扣分

**配置示例**:
```yaml
companies: [Apple, Google, Microsoft, Amazon, Meta, OpenAI]
topics: [AI, LLM, antitrust, regulation, cloud, GPU]

rules:
  - name: bigtech_ai_policy
    any:
      - "$company\\b.*(AI|LLM|policy|regulation|antitrust)"
      - "(AI|LLM|policy|regulation|antitrust).*$company\\b"
    addTags: [bigtech, ai, policy]
    weight: 5

scoreThresholds:
  bigtech: 4    # isBigTech() 判断阈值
```

**使用方法**:
```typescript
const engine = KeywordEngine.fromYamlFile('configs/keywords.yaml');
const result = engine.evaluate({
  title: "Google faces DOJ antitrust investigation",
  summary: "Major lawsuit filed against search giant"
});
// result: { tags: Set(['bigtech', 'policy']), score: 5, matches: [...] }
```

**本地开发**:
```bash
cd packages/keyword-engine
npm run dev:test    # 运行内置测试用例
npm run dev:yaml    # 测试从 YAML 文件加载
npm test           # 运行完整单元测试
```

### 统一日志系统

**基于 pino 的结构化 JSON 日志** (`packages/shared/logger.ts`)

**核心特性**:
- **结构化日志**: 所有日志输出为 JSON 格式，便于解析和搜索
- **环境变量控制**: `LOG_LEVEL` 环境变量控制日志级别
- **Lambda 优化**: 自动检测 Lambda 环境，优化输出格式
- **本地开发友好**: 开发环境使用 pino-pretty 美化输出
- **性能指标**: 内置 metric() 方法记录业务指标
- **上下文支持**: 支持子日志器和上下文信息传递

**日志级别**: trace, debug, info, warn, error, fatal

**使用示例**:
```typescript
import { createLambdaLogger } from '@news-agg/shared';

const logger = createLambdaLogger('fetcher');

// 结构化日志
logger.info('Processing completed', {
  duration: 1500,
  stats: { processed: 10, success: 8, failed: 2 },
  performance: { articlesPerSecond: 6.67 }
});

// 业务指标
logger.metric('articles.processed', 10, 'count');
logger.metric('fetch.duration', 1500, 'milliseconds');
```

**Fetcher 日志输出**:
- **抓取数**: `articles.processed` 指标
- **入库数**: `articles.success` 指标  
- **重复数**: `articles.duplicates` 指标
- **失败数**: `articles.failed` 指标
- **性能指标**: 处理速度、内存使用、成功率等

### 数据存储

- **DynamoDB**: 无服务器数据库
- **GSI 索引**: 优化的查询性能
- **自动分页**: 支持大数据集查询
- **流式处理**: DynamoDB Streams 触发通知

### 通知系统

**Notifier Lambda** 监听 DynamoDB Streams，当有新文章满足条件时发送通知到 SNS Topic。

**触发条件**:
- **大科技高分**: `isBigTech=true` 且 `score ≥ 70`
- **政策标签**: 包含 `antitrust`, `doj`, `ftc`, `regulation` 等政策相关标签
- **高优先级标签**: 包含 `breaking`, `urgent`, `acquisition` 等高优先级标签
- **突发新闻**: 分数 ≥ 90 或包含突发新闻标签

**通知优先级**:
- **URGENT**: 突发新闻
- **HIGH**: 政策相关、高分大科技文章 (≥85分)
- **NORMAL**: 常规大科技文章、高优先级标签
- **LOW**: 其他符合条件的文章

**去重机制**: 基于 `urlHash` 的24小时去重窗口，防止重复通知

**重试策略**: 最多3次重试，指数退避 (1s, 2s, 4s)

**环境变量**:
- `SNS_TOPIC_ARN`: SNS 主题 ARN
- `BIG_TECH_MIN_SCORE`: 大科技公司最小分数阈值 (默认70)
- `DEDUP_WINDOW_HOURS`: 去重时间窗口 (默认24小时)

## 🚀 CI/CD 流水线

### GitHub Actions 自动化

**完整的 CI/CD 流水线** (`.github/workflows/ci.yml`)

**流水线阶段**:
1. **测试阶段**: pnpm 缓存 → lint → build → test → cdk synth
2. **安全扫描**: 依赖漏洞扫描和高危漏洞检查  
3. **开发部署**: `develop` 分支自动部署到开发环境
4. **生产部署**: `main` 分支自动部署到生产环境

**本地部署脚本**:
```bash
# 构建所有 Lambda 包
pnpm run build

# 一键部署到 AWS
pnpm run deploy
# 等同于: cd infra && cdk synth && cdk deploy --require-approval never
```

## 💰 费用估算与 Free Tier 优化

### AWS Free Tier 使用情况

**每月免费额度（新账户 12 个月）**:
- **Lambda**: 100 万次请求 + 40 万 GB-秒计算时间
- **DynamoDB**: 25 GB 存储 + 25 个读写容量单元
- **API Gateway**: 100 万次 API 调用
- **SNS**: 100 万次发布
- **EventBridge**: 1400 万次自定义事件
- **CloudWatch**: 10 个指标 + 5 GB 日志存储

### 预估月费用（超出 Free Tier 后）

#### **默认配置（10 分钟间隔）**
```bash
# Lambda 执行
Fetcher: 4,320 次/月 × 30 秒 × 512 MB = ~$0.50
API: 10,000 次/月 × 1 秒 × 256 MB = ~$0.20
Notifier: 100 次/月 × 2 秒 × 256 MB = ~$0.01

# DynamoDB
存储: 1 GB × $0.25 = $0.25
读取: 50,000 RCU × $0.25 = $12.50
写入: 10,000 WCU × $1.25 = $12.50

# API Gateway
HTTP API: 10,000 次 × $1.00/百万 = $0.01

# 总计: ~$25.97/月
```

#### **优化配置（30 分钟间隔）**
```bash
# 降低抓取频率 + 优化查询
Fetcher: 1,440 次/月 × 20 秒 × 256 MB = ~$0.15
DynamoDB 读写减少 60% = ~$15.00

# 优化后总计: ~$15.50/月
```

### Free Tier 优化策略

#### **1. 抓取频率优化**
```yaml
# configs/sources.yaml - 降低轮询频率
sources:
  - name: TechCrunch
    intervalSec: 1800  # 30 分钟（而非 10 分钟）
    
  - name: Techmeme  
    intervalSec: 900   # 15 分钟（而非 5 分钟）
```

#### **2. Lambda 内存优化**
```typescript
// infra/stacks/lambda-stack.ts
new NodejsFunction(this, 'FetcherFunction', {
  memorySize: 256,    // 降低到 256 MB
  timeout: Duration.seconds(60),  // 减少超时时间
});
```

#### **3. DynamoDB 查询优化**
```bash
# 环境变量优化
export DEDUP_WINDOW_HOURS=12      # 减少去重窗口到 12 小时
export MAX_CONCURRENT_FETCHES=3   # 降低并发数
export RETRY_MAX_ATTEMPTS=2       # 减少重试次数
```

#### **4. 日志级别优化**
```bash
# 生产环境减少日志输出
export LOG_LEVEL=warn  # 只记录警告和错误
```

### 成本监控和告警

#### **设置预算告警**
```bash
# 创建预算告警（$20/月）
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "NewsAggBudget",
    "BudgetLimit": {"Amount": "20", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80
    },
    "Subscribers": [{"Address": "your-email@example.com", "SubscriptionType": "EMAIL"}]
  }]'
```

#### **成本优化检查清单**
- ✅ **抓取间隔**: 生产环境设为 15-30 分钟
- ✅ **Lambda 内存**: Fetcher 256MB，API 128MB  
- ✅ **超时设置**: Fetcher 60s，API 30s
- ✅ **日志级别**: 生产环境 `warn` 或 `error`
- ✅ **去重窗口**: 12-24 小时（而非 48 小时）
- ✅ **DynamoDB TTL**: 文章 30 天自动删除
- ✅ **预算告警**: 设置 $20/月预算告警

### 高频使用场景注意事项

#### **短轮询间隔风险**
```bash
# ⚠️ 高费用配置（避免）
intervalSec: 60    # 1 分钟间隔
# 月费用: Lambda $15 + DynamoDB $150+ = $165+

# ✅ 推荐配置
intervalSec: 1800  # 30 分钟间隔  
# 月费用: Lambda $1 + DynamoDB $25 = $26
```

#### **重试和超时策略**
```bash
# ⚠️ 避免过度重试
export RETRY_MAX_ATTEMPTS=5       # 可能导致费用翻倍
export FETCH_TIMEOUT_MS=60000     # 长超时增加计算费用

# ✅ 优化配置
export RETRY_MAX_ATTEMPTS=2       # 最多重试 2 次
export FETCH_TIMEOUT_MS=15000     # 15 秒超时
```

### 实时成本监控

#### **CloudWatch 成本指标**
```bash
# 查看 Lambda 调用次数
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=news-agg-fetcher \
  --start-time 2023-12-01T00:00:00Z \
  --end-time 2023-12-01T23:59:59Z \
  --period 3600 \
  --statistics Sum

# 查看 DynamoDB 读写消耗
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=news-agg-articles \
  --start-time 2023-12-01T00:00:00Z \
  --end-time 2023-12-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## 📈 监控和运维

### CloudWatch 日志

**结构化日志查询**:
```bash
# 查看 Lambda 日志
aws logs tail /aws/lambda/news-agg-fetcher --follow

# 查看 Fetcher 处理统计
aws logs filter-log-events --log-group-name /aws/lambda/news-agg-fetcher \
  --filter-pattern '{ $.stats.successCount > 0 }'

# 查看性能指标
aws logs filter-log-events --log-group-name /aws/lambda/news-agg-fetcher \
  --filter-pattern '{ $.metric.name = "articles.processed" }'
```

### 手动触发

```bash
# 手动触发新闻抓取
aws lambda invoke \
  --function-name news-agg-fetcher \
  --payload '{"detail":{"forceRefresh":true}}' \
  response.json
```

### 回滚部署

```bash
# 查看栈状态
cd infra
pnpm run diff

# 销毁所有资源
pnpm run destroy
```

## 🔒 安全考虑

- **IAM 权限**: 最小权限原则
- **CORS 配置**: API 跨域访问控制
- **输入验证**: 严格的参数验证
- **错误处理**: 安全的错误信息处理

## 💰 成本估算

基于每小时抓取 100 篇文章的使用场景：

- **Lambda**: ~$10-15/月
- **DynamoDB**: ~$5-10/月
- **API Gateway**: ~$3-5/月
- **其他服务**: ~$2-5/月

**总计**: ~$20-35/月

## 🤝 贡献

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

---

## 🔍 故障排除

### 常见问题

#### 1. Lambda 冷启动慢
- 使用预留并发
- 优化依赖包大小

#### 2. DynamoDB 读写限流
- 监控容量指标
- 考虑使用按需计费

#### 3. 新闻源抓取失败
- 检查网络连接
- 验证源 URL 可访问性
- 查看 CloudWatch 日志

#### 4. 关键词匹配不准确
- 调整关键词权重
- 增加更多关键词
- 使用正则表达式匹配

### 性能优化

- 使用 ARM64 架构 Lambda
- 启用 Lambda 分层
- 优化 DynamoDB 查询模式
- 实现智能缓存策略

### 扩展建议

- 添加更多新闻源
- 实现用户订阅管理
- 支持多语言内容
- 集成机器学习分类

## 📋 部署检查清单

### 部署前准备

- [ ] AWS CLI 已配置并有足够权限
- [ ] Node.js >= 18 已安装
- [ ] pnpm >= 8 已安装
- [ ] AWS CDK >= 2.110.0 已安装
- [ ] 项目依赖已安装 (`pnpm install`)
- [ ] 项目已构建 (`pnpm run build`)

### 部署步骤

1. [ ] 设置环境变量
2. [ ] 执行 CDK Bootstrap
3. [ ] 检查部署差异 (`pnpm run diff`)
4. [ ] 执行部署 (`pnpm run deploy`)
5. [ ] 验证 API 端点
6. [ ] 检查 Lambda 函数日志
7. [ ] 验证定时任务是否正常运行

### 部署后验证

```bash
# 1. 检查所有栈状态
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# 2. 获取 API 端点
API_URL=$(aws cloudformation describe-stacks \
  --stack-name news-agg-api \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text)

# 3. 测试健康检查
curl $API_URL/health

# 4. 测试大科技新闻接口
curl "$API_URL/v1/feed/bigtech?limit=5"

# 5. 测试搜索接口
curl "$API_URL/v1/search?q=apple&limit=3"

# 6. 手动触发新闻抓取（测试）
aws lambda invoke \
  --function-name news-agg-fetcher \
  --payload '{"source":"manual","detail":{"forceRefresh":true}}' \
  response.json && cat response.json

# 7. 检查 DynamoDB 表
aws dynamodb describe-table --table-name articles

# 8. 查看最近的 Lambda 日志
aws logs tail /aws/lambda/news-agg-fetcher --since 1h
```

### 监控和告警建议

- 设置 CloudWatch 告警监控 Lambda 错误率
- 监控 DynamoDB 读写容量使用情况
- 设置 API Gateway 4xx/5xx 错误告警
- 监控新闻抓取成功率和文章数量