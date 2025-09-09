#!/usr/bin/env tsx

/**
 * 本地开发脚本 - 测试 Notifier 处理器
 */

import { handler } from './index.js';
import { DynamoDBStreamEvent } from 'aws-lambda';

/**
 * 创建模拟的 DynamoDB Stream 事件
 */
function createMockStreamEvent(articles: Array<{
  eventName: 'INSERT' | 'MODIFY';
  article: any;
}>): DynamoDBStreamEvent {
  return {
    Records: articles.map((item, index) => ({
      eventID: `event-${index}`,
      eventName: item.eventName,
      eventVersion: '1.1',
      eventSource: 'aws:dynamodb',
      awsRegion: 'us-east-1',
      dynamodb: {
        ApproximateCreationDateTime: new Date(),
        Keys: {
          pk: { S: `source#${item.article.domain}` },
          sk: { S: `ts#${Date.now()}#${item.article.urlHash}` },
        },
        NewImage: {
          pk: { S: `source#${item.article.domain}` },
          sk: { S: `ts#${Date.now()}#${item.article.urlHash}` },
          url: { S: item.article.url },
          urlHash: { S: item.article.urlHash },
          title: { S: item.article.title },
          source: { S: item.article.source },
          domain: { S: item.article.domain },
          summary: { S: item.article.summary },
          publishedAt: { S: item.article.publishedAt },
          tags: { SS: item.article.tags },
          score: { N: item.article.score.toString() },
          isBigTech: { BOOL: item.article.isBigTech },
          isPolicy: { BOOL: item.article.isPolicy },
        },
        SequenceNumber: `seq-${index}`,
        SizeBytes: 1024,
        StreamViewType: 'NEW_AND_OLD_IMAGES',
      },
      eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/articles/stream/2023-12-01T00:00:00.000',
    })),
  };
}

async function runNotifierTests() {
  console.log('🔔 Starting Notifier development tests...\n');

  // 设置测试环境变量
  process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:news-notifications';
  process.env.ARTICLES_TABLE_NAME = 'articles';
  process.env.NOTIFICATIONS_TABLE_NAME = 'notifications';
  process.env.BIG_TECH_MIN_SCORE = '70';
  process.env.AWS_REGION = 'us-east-1';

  const mockContext = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'news-agg-notifier-dev',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:news-agg-notifier-dev',
    memoryLimitInMB: '512',
    awsRequestId: 'notifier-dev-' + Date.now(),
    logGroupName: '/aws/lambda/news-agg-notifier-dev',
    logStreamName: '2023/12/01/[$LATEST]notifier-stream',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };

  const testCases = [
    {
      name: '高分大科技公司文章',
      articles: [{
        eventName: 'INSERT' as const,
        article: {
          urlHash: 'test-hash-1',
          url: 'https://techcrunch.com/google-antitrust-investigation',
          title: 'Google faces major antitrust investigation by DOJ',
          source: 'TechCrunch',
          domain: 'techcrunch.com',
          summary: 'The Department of Justice launches comprehensive antitrust investigation into Google search practices.',
          publishedAt: new Date().toISOString(),
          tags: ['company:google', 'antitrust', 'doj', 'bigtech'],
          score: 85,
          isBigTech: true,
          isPolicy: true,
        },
      }],
    },
    {
      name: '政策相关文章',
      articles: [{
        eventName: 'INSERT' as const,
        article: {
          urlHash: 'test-hash-2',
          url: 'https://wired.com/ftc-apple-investigation',
          title: 'FTC opens investigation into Apple App Store practices',
          source: 'Wired',
          domain: 'wired.com',
          summary: 'Federal Trade Commission investigates Apple monopolistic practices in App Store.',
          publishedAt: new Date().toISOString(),
          tags: ['company:apple', 'ftc', 'regulation', 'app-store'],
          score: 75,
          isBigTech: true,
          isPolicy: true,
        },
      }],
    },
    {
      name: '突发新闻',
      articles: [{
        eventName: 'INSERT' as const,
        article: {
          urlHash: 'test-hash-3',
          url: 'https://venturebeat.com/microsoft-acquisition-breaking',
          title: 'BREAKING: Microsoft announces $50B acquisition',
          source: 'VentureBeat',
          domain: 'venturebeat.com',
          summary: 'Microsoft announces surprise acquisition in major industry shake-up.',
          publishedAt: new Date().toISOString(),
          tags: ['company:microsoft', 'acquisition', 'breaking', 'bigtech'],
          score: 95,
          isBigTech: true,
          isPolicy: false,
        },
      }],
    },
    {
      name: '低分文章 (不应通知)',
      articles: [{
        eventName: 'INSERT' as const,
        article: {
          urlHash: 'test-hash-4',
          url: 'https://example.com/low-score-article',
          title: 'Minor tech update',
          source: 'Example Tech',
          domain: 'example.com',
          summary: 'Small technical update with minimal impact.',
          publishedAt: new Date().toISOString(),
          tags: ['technology'],
          score: 30,
          isBigTech: false,
          isPolicy: false,
        },
      }],
    },
    {
      name: '批量通知测试',
      articles: [
        {
          eventName: 'INSERT' as const,
          article: {
            urlHash: 'batch-test-1',
            url: 'https://engadget.com/apple-privacy-update',
            title: 'Apple releases major privacy update',
            source: 'Engadget',
            domain: 'engadget.com',
            summary: 'New privacy features announced by Apple.',
            publishedAt: new Date().toISOString(),
            tags: ['company:apple', 'privacy', 'bigtech'],
            score: 78,
            isBigTech: true,
            isPolicy: false,
          },
        },
        {
          eventName: 'INSERT' as const,
          article: {
            urlHash: 'batch-test-2',
            url: 'https://gizmodo.com/google-ai-breakthrough',
            title: 'Google AI achieves breakthrough in machine learning',
            source: 'Gizmodo',
            domain: 'gizmodo.com',
            summary: 'Revolutionary AI advancement from Google Research.',
            publishedAt: new Date().toISOString(),
            tags: ['company:google', 'ai', 'machine-learning', 'bigtech'],
            score: 82,
            isBigTech: true,
            isPolicy: false,
          },
        },
      ],
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      console.log(`🧪 Testing: ${testCase.name}`);
      console.log(`   📰 Articles: ${testCase.articles.length}`);
      
      const event = createMockStreamEvent(testCase.articles);
      const startTime = Date.now();
      
      // 注意：这里会尝试连接真实的 AWS 服务
      // 在真实环境中，你需要配置 AWS 凭证或使用 LocalStack
      console.log('⚠️  Note: This test requires AWS credentials for SNS and DynamoDB access');
      
      await handler(event, mockContext, () => {});
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${testCase.name} - Completed (${duration}ms)`);
      passed++;
      
    } catch (error) {
      console.log(`❌ ${testCase.name} - Error:`, error instanceof Error ? error.message : String(error));
      failed++;
    }
    
    console.log(''); // 空行分隔
  }

  console.log('📊 Test Summary:');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. This is expected in local development without AWS services.');
    console.log('💡 To test with real AWS services, ensure you have:');
    console.log('   - AWS credentials configured');
    console.log('   - SNS topic created');
    console.log('   - DynamoDB notifications table created');
  } else {
    console.log('\n🎉 All tests passed!');
  }
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, exiting gracefully...');
  process.exit(0);
});

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runNotifierTests().catch(error => {
    console.error('💥 Fatal error in Notifier development script:', error);
    process.exit(1);
  });
}