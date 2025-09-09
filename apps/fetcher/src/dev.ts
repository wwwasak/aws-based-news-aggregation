#!/usr/bin/env tsx

/**
 * 本地调试入口脚本 - 单次执行新闻抓取并打印统计
 */

import { handler } from './index';

async function runLocalFetch() {
  console.log('🔧 Starting local news fetcher development run...\n');
  console.log('📍 Current working directory:', process.cwd());
  console.log('📍 Node.js version:', process.version);
  console.log('📍 Environment:', process.env.NODE_ENV || 'not set');
  console.log('📍 Script started at:', new Date().toISOString());
  console.log('');
  
  // 模拟 EventBridge 事件
  const mockEvent = {
    version: '0',
    id: 'dev-test-' + Date.now(),
    'detail-type': 'Scheduled Event',
    source: 'aws.events',
    account: '123456789012',
    time: new Date().toISOString(),
    region: 'us-east-1',
    resources: ['arn:aws:events:us-east-1:123456789012:rule/news-agg-fetcher-schedule'],
    detail: {
      triggerSource: 'development',
      forceRefresh: true,
      // 可以指定特定源进行测试
      // sourceNames: ['TechCrunch', 'Wired'],
    },
  };

  const mockContext = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'news-agg-fetcher-dev',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:news-agg-fetcher-dev',
    memoryLimitInMB: '1024',
    awsRequestId: 'dev-request-' + Date.now(),
    logGroupName: '/aws/lambda/news-agg-fetcher-dev',
    logStreamName: '2023/12/01/[$LATEST]dev-stream',
    getRemainingTimeInMillis: () => 900000, // 15 minutes
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };

  try {
    console.log('📡 Invoking fetcher handler...\n');
    console.log('🔧 Mock event:', JSON.stringify(mockEvent, null, 2));
    console.log('');
    
    const startTime = Date.now();
    console.log('⏰ Handler execution started at:', new Date().toISOString());
    const result = await handler(mockEvent, mockContext, () => {});
    const duration = Date.now() - startTime;
    console.log('⏰ Handler execution completed at:', new Date().toISOString());
    
    console.log('\n🎉 Development fetch completed successfully!');
    console.log('📊 Results Summary:');
    console.log('=' .repeat(50));
    
    if (result && typeof result === 'object' && 'stats' in result) {
      const stats = result.stats as any;
      console.log(`📈 Total Processed: ${stats.totalProcessed}`);
      console.log(`✅ Successfully Saved: ${stats.successCount}`);
      console.log(`⏭️  Skipped (Duplicates): ${stats.duplicateCount}`);
      console.log(`🚫 Filtered (Low Score): ${stats.filteredCount}`);
      console.log(`❌ Failed: ${stats.failedCount}`);
      console.log(`🏭 Sources Processed: ${result.sourcesProcessed || 'N/A'}`);
      console.log(`⏱️  Total Duration: ${duration}ms`);
      
      // 计算成功率
      const successRate = stats.totalProcessed > 0 
        ? ((stats.successCount / stats.totalProcessed) * 100).toFixed(1)
        : '0';
      console.log(`📊 Success Rate: ${successRate}%`);
      
      // 性能指标
      const articlesPerSecond = stats.totalProcessed > 0 && duration > 0
        ? ((stats.totalProcessed / duration) * 1000).toFixed(2)
        : '0';
      console.log(`⚡ Processing Speed: ${articlesPerSecond} articles/second`);
    } else {
      console.log('📋 Result:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('\n💥 Development fetch failed!');
    console.error('❌ Error details:', error);
    
    if (error instanceof Error) {
      console.error('📝 Stack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// 优雅退出处理
process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, gracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM, gracefully shutting down...');
  process.exit(0);
});

// 如果直接运行此脚本
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  runLocalFetch().catch(error => {
    console.error('💥 Fatal error in development script:', error);
    process.exit(1);
  });
}