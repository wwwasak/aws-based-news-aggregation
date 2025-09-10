#!/usr/bin/env tsx

/**
 * 本地开发脚本 - 测试关键词引擎
 */

import { KeywordEngine, KeywordEngineConfig } from './keyword-engine.js';

/**
 * 创建测试配置
 */
function createTestConfig(): KeywordEngineConfig {
  return {
    companies: ['Apple', 'Microsoft', 'Google', 'Alphabet', 'Amazon', 'Meta', 'OpenAI'],
    topics: ['AI', 'LLM', 'model', 'policy', 'regulation', 'antitrust', 'DOJ', 'FTC'],
    rules: [
      {
        name: 'bigtech_ai_policy',
        description: '大科技公司的AI和政策相关新闻',
        any: [
          '$company\\b.*(AI|LLM|model|policy|regulation|antitrust|FTC|DOJ)',
          '(AI|LLM|model|policy|regulation|antitrust|FTC|DOJ).*$company\\b',
        ],
        addTags: ['bigtech', 'ai', 'policy'],
        weight: 5,
      },
      {
        name: 'cloud_infra',
        description: '云计算和基础设施相关新闻',
        any: [
          '\\b(cloud|datacenter|GPU|TPU|inference|training)\\b.*$company\\b',
        ],
        addTags: ['bigtech', 'cloud'],
        weight: 3,
      },
      {
        name: 'breaking_news',
        description: '突发新闻标识符',
        any: [
          '^\\s*(BREAKING|URGENT|ALERT|JUST IN)',
          '\\b(breaking|urgent|alert)\\b',
        ],
        addTags: ['breaking', 'urgent'],
        weight: 6,
      },
    ],
    scoreThresholds: {
      bigtech: 4,
      policy: 3,
      ai: 3,
      breaking: 5,
    },
    blacklist: ['advertisement', 'sponsored', 'promotional'],
    config: {
      minScore: 0,
      maxScore: 100,
      caseSensitive: false,
      wordBoundary: true,
      defaultWeight: 1,
    },
  };
}

/**
 * 测试用例
 */
const testCases = [
  {
    name: 'Apple + AI 组合',
    title: 'Apple announces new AI features in iOS',
    summary: 'Apple Intelligence brings advanced AI capabilities to iPhone users.',
    expected: { tags: ['bigtech', 'ai'], minScore: 5 },
  },
  {
    name: 'Google + antitrust 组合',
    title: 'DOJ files antitrust lawsuit against Google',
    summary: 'Department of Justice alleges Google maintains illegal monopoly in search.',
    expected: { tags: ['bigtech', 'policy'], minScore: 5 },
  },
  {
    name: '云基础设施',
    title: 'Amazon expands cloud datacenter capacity',
    summary: 'AWS announces new GPU instances for machine learning training.',
    expected: { tags: ['bigtech', 'cloud'], minScore: 3 },
  },
  {
    name: '突发新闻',
    title: 'BREAKING: OpenAI announces GPT-5',
    summary: 'Major breakthrough in artificial intelligence capabilities.',
    expected: { tags: ['breaking', 'urgent'], minScore: 6 },
  },
  {
    name: '大小写不敏感',
    title: 'GOOGLE launches new AI model',
    summary: 'ARTIFICIAL INTELLIGENCE breakthrough from ALPHABET.',
    expected: { tags: ['bigtech', 'ai'], minScore: 5 },
  },
  {
    name: '复合匹配',
    title: 'BREAKING: Google cloud AI training infrastructure',
    summary: 'Major announcement about TPU datacenter expansion and LLM training capabilities.',
    expected: { tags: ['breaking', 'bigtech', 'ai', 'cloud'], minScore: 10 },
  },
  {
    name: '无匹配内容',
    title: 'Local restaurant opens new location',
    summary: 'Family-owned business expands to downtown area.',
    expected: { tags: [], minScore: 1 },
  },
  {
    name: '黑名单扣分',
    title: 'Apple AI features - sponsored advertisement',
    summary: 'This is promotional content about Apple Intelligence.',
    expected: { tags: ['bigtech', 'ai'], maxScore: 4 }, // 原本5分，扣除1-2分
  },
];

async function runKeywordEngineTests() {
  console.log('🔍 Starting Keyword Engine development tests...\n');

  // 创建引擎实例
  const config = createTestConfig();
  const engine = new KeywordEngine(config);

  console.log(`📊 Engine initialized with ${engine.getRuleCount()} rules`);
  console.log(`🏷️  Available tags: ${engine.getAllTags().join(', ')}`);
  console.log('');

  let passed = 0;
  let failed = 0;

  // 运行测试用例
  for (const testCase of testCases) {
    console.log(`🧪 Testing: ${testCase.name}`);
    
    try {
      const result = engine.evaluate({
        title: testCase.title,
        summary: testCase.summary,
      });

      console.log(`   📰 Title: "${testCase.title}"`);
      console.log(`   📝 Summary: "${testCase.summary}"`);
      console.log(`   🏷️  Tags: [${Array.from(result.tags).join(', ')}]`);
      console.log(`   📊 Score: ${result.score}`);
      console.log(`   🎯 Matches: [${result.matches.join(', ')}]`);

      // 验证期望结果
      let success = true;
      const errors: string[] = [];

      // 检查标签
      if (testCase.expected.tags) {
        for (const expectedTag of testCase.expected.tags) {
          if (!result.tags.has(expectedTag)) {
            success = false;
            errors.push(`Missing expected tag: ${expectedTag}`);
          }
        }
      }

      // 检查最小分数
      if (testCase.expected.minScore && result.score < testCase.expected.minScore) {
        success = false;
        errors.push(`Score ${result.score} below minimum ${testCase.expected.minScore}`);
      }

      // 检查最大分数
      if (testCase.expected.maxScore && result.score > testCase.expected.maxScore) {
        success = false;
        errors.push(`Score ${result.score} above maximum ${testCase.expected.maxScore}`);
      }

      if (success) {
        console.log('   ✅ PASSED');
        passed++;
      } else {
        console.log('   ❌ FAILED');
        errors.forEach(error => console.log(`      - ${error}`));
        failed++;
      }

    } catch (error) {
      console.log('   💥 ERROR:', error);
      failed++;
    }

    console.log(''); // 空行分隔
  }

  // 测试阈值检查方法
  console.log('🔍 Testing threshold methods...');
  
  const tags = new Set(['bigtech', 'ai', 'policy']);
  const score = 5;
  
  console.log(`   isBigTech(${Array.from(tags)}, ${score}): ${engine.isBigTech(tags, score)}`);
  console.log(`   isPolicy(${Array.from(tags)}, ${score}): ${engine.isPolicy(tags, score)}`);
  console.log(`   isAI(${Array.from(tags)}, ${score}): ${engine.isAI(tags, score)}`);
  console.log(`   isBreaking(['breaking'], 6): ${engine.isBreaking(new Set(['breaking']), 6)}`);
  console.log('');

  // 测试总结
  console.log('📊 Test Summary:');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
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
  runKeywordEngineTests().catch(error => {
    console.error('💥 Fatal error in Keyword Engine development script:', error);
    process.exit(1);
  });
}









