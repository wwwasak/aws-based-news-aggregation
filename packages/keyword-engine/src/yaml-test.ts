#!/usr/bin/env tsx

/**
 * 测试从 YAML 文件加载配置
 */

import { KeywordEngine } from './keyword-engine.js';
import { join } from 'path';

async function testYamlLoading() {
  console.log('📁 Testing YAML configuration loading...\n');

  try {
    // 测试从指定路径加载
    const configPath = join(process.cwd(), '../../configs/keywords.yaml');
    console.log(`📂 Loading config from: ${configPath}`);
    
    const engine = KeywordEngine.fromYamlFile(configPath);
    
    console.log(`✅ Successfully loaded YAML configuration`);
    console.log(`📊 Rules loaded: ${engine.getRuleCount()}`);
    console.log(`🏷️  Available tags: ${engine.getAllTags().join(', ')}`);
    console.log('');

    // 测试一些示例
    const testCases = [
      {
        title: 'Apple announces new AI features',
        summary: 'Apple Intelligence brings advanced capabilities to iOS.',
      },
      {
        title: 'BREAKING: Google faces antitrust lawsuit',
        summary: 'DOJ files major lawsuit against Google search monopoly.',
      },
      {
        title: 'Microsoft expands cloud infrastructure',
        summary: 'New datacenter with GPU clusters for AI training.',
      },
    ];

    console.log('🧪 Testing with sample articles:');
    console.log('');

    for (const testCase of testCases) {
      const result = engine.evaluate(testCase);
      
      console.log(`📰 "${testCase.title}"`);
      console.log(`   🏷️  Tags: [${Array.from(result.tags).join(', ')}]`);
      console.log(`   📊 Score: ${result.score}`);
      console.log(`   🎯 Matches: [${result.matches.join(', ')}]`);
      console.log('');
    }

    console.log('🎉 YAML configuration test completed successfully!');

  } catch (error) {
    console.error('❌ Failed to load YAML configuration:', error);
    process.exit(1);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testYamlLoading().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}







