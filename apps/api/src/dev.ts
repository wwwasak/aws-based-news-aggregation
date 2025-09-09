#!/usr/bin/env tsx

/**
 * 本地开发脚本 - 测试 API 处理器
 */

import { handler } from './index.js';

interface TestCase {
  name: string;
  event: any;
  expectedStatus?: number;
}

async function runApiTests() {
  console.log('🧪 Starting API development tests...\n');

  const mockContext = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'news-agg-api-dev',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:news-agg-api-dev',
    memoryLimitInMB: '512',
    awsRequestId: 'dev-request-' + Date.now(),
    logGroupName: '/aws/lambda/news-agg-api-dev',
    logStreamName: '2023/12/01/[$LATEST]dev-stream',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };

  const testCases: TestCase[] = [
    // 健康检查测试
    {
      name: 'Health Check',
      event: createMockEvent('GET', '/health'),
      expectedStatus: 200,
    },
    {
      name: 'Health Check v1',
      event: createMockEvent('GET', '/v1/health'),
      expectedStatus: 200,
    },

    // BigTech 推送测试
    {
      name: 'BigTech Feed - Basic',
      event: createMockEvent('GET', '/v1/feed/bigtech'),
      expectedStatus: 200,
    },
    {
      name: 'BigTech Feed - With Limit',
      event: createMockEvent('GET', '/v1/feed/bigtech', { limit: '10' }),
      expectedStatus: 200,
    },
    {
      name: 'BigTech Feed - Invalid Limit',
      event: createMockEvent('GET', '/v1/feed/bigtech', { limit: '150' }),
      expectedStatus: 400,
    },

    // 搜索测试
    {
      name: 'Search - Basic Query',
      event: createMockEvent('GET', '/v1/search', { q: 'google antitrust' }),
      expectedStatus: 200,
    },
    {
      name: 'Search - With Limit',
      event: createMockEvent('GET', '/v1/search', { q: 'apple iphone', limit: '5' }),
      expectedStatus: 200,
    },
    {
      name: 'Search - Missing Query',
      event: createMockEvent('GET', '/v1/search'),
      expectedStatus: 400,
    },
    {
      name: 'Search - Empty Query',
      event: createMockEvent('GET', '/v1/search', { q: '' }),
      expectedStatus: 400,
    },

    // 错误情况测试
    {
      name: 'Method Not Allowed',
      event: createMockEvent('POST', '/v1/feed/bigtech'),
      expectedStatus: 405,
    },
    {
      name: 'Path Not Found',
      event: createMockEvent('GET', '/v1/unknown'),
      expectedStatus: 404,
    },
    {
      name: 'Unknown Feed Type',
      event: createMockEvent('GET', '/v1/feed/unknown'),
      expectedStatus: 404,
    },

    // CORS 预检请求
    {
      name: 'CORS Preflight',
      event: createMockEvent('OPTIONS', '/v1/feed/bigtech'),
      expectedStatus: 200,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      console.log(`🧪 Testing: ${testCase.name}`);
      
      const startTime = Date.now();
      const result = await handler(testCase.event, mockContext, () => {});
      const duration = Date.now() - startTime;

      const success = !testCase.expectedStatus || result.statusCode === testCase.expectedStatus;
      
      if (success) {
        console.log(`✅ ${testCase.name} - Status: ${result.statusCode} (${duration}ms)`);
        
        // 解析响应体并显示摘要
        try {
          const body = JSON.parse(result.body);
          if (body.data && Array.isArray(body.data)) {
            console.log(`   📊 Returned ${body.data.length} items`);
          } else if (body.data) {
            console.log(`   📋 Response:`, Object.keys(body.data).join(', '));
          }
          if (body.pagination) {
            console.log(`   📄 Pagination: hasMore=${body.pagination.hasMore}, count=${body.pagination.count}`);
          }
        } catch {
          // 忽略 JSON 解析错误
        }
        
        passed++;
      } else {
        console.log(`❌ ${testCase.name} - Expected: ${testCase.expectedStatus}, Got: ${result.statusCode}`);
        console.log(`   Response:`, result.body.substring(0, 200));
        failed++;
      }
      
    } catch (error) {
      console.log(`💥 ${testCase.name} - Error:`, error);
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
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
  }
}

/**
 * 创建模拟的 API Gateway 事件
 */
function createMockEvent(method: string, path: string, queryParams?: Record<string, string>) {
  return {
    httpMethod: method,
    path,
    pathParameters: null,
    queryStringParameters: queryParams || null,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'news-agg-dev-client/1.0',
    },
    multiValueHeaders: {},
    body: null,
    isBase64Encoded: false,
    requestContext: {
      requestId: 'dev-request-' + Date.now(),
      stage: 'dev',
      resourcePath: path,
      httpMethod: method,
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'news-agg-dev-client/1.0',
      },
      accountId: '123456789012',
      apiId: 'dev-api',
      resourceId: 'dev-resource',
      requestTime: new Date().toISOString(),
      requestTimeEpoch: Date.now(),
      protocol: 'HTTP/1.1',
    } as any,
    resource: path,
    stageVariables: null,
    multiValueQueryStringParameters: null,
  };
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
  runApiTests().catch(error => {
    console.error('💥 Fatal error in API development script:', error);
    process.exit(1);
  });
}