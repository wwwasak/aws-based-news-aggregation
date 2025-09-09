#!/usr/bin/env tsx

/**
 * 调度器测试脚本 - 验证错峰调度和令牌桶限速
 */

import { FetchScheduler } from './scheduler.js';
import { ConfigLoader } from './config-loader.js';

async function testScheduler() {
  console.log('🧪 Testing Fetch Scheduler with Rate Limiting and Staggering...\n');

  // 加载配置
  const configLoader = new ConfigLoader();
  const sourcesConfig = configLoader.loadSources();

  console.log(`📋 Loaded ${sourcesConfig.sources.length} sources from config`);
  console.log(`   Enabled sources: ${sourcesConfig.sources.filter(s => s.enabled).length}`);
  console.log('');

  // 创建调度器
  const scheduler = new FetchScheduler(sourcesConfig, {
    maxConcurrency: 3,
    enableRateLimit: true,
    enableStaggering: true,
    onFetchComplete: (result) => {
      console.log(`✅ Fetch completed: ${result.source.name} (${result.duration}ms)`);
    },
    onError: (source, error) => {
      console.error(`❌ Fetch error: ${source.name} - ${error.message}`);
    },
  });

  // 显示初始状态
  console.log('📊 Initial Scheduler Status:');
  const initialStatus = scheduler.getStatus();
  for (const [sourceName, status] of Object.entries(initialStatus)) {
    console.log(`   ${sourceName}:`);
    console.log(`     Next fetch: ${status.nextFetch?.toISOString() || 'Not scheduled'}`);
    console.log(`     Rate limit: ${status.rateLimitStatus?.tokens.toFixed(2) || 'N/A'} tokens`);
    console.log(`     Interval: ${status.source.intervalSec}s`);
  }
  console.log('');

  // 启动调度器
  scheduler.start();

  // 运行一段时间来观察行为
  console.log('⏱️  Running scheduler for 2 minutes to observe behavior...\n');

  // 定期显示状态
  const statusInterval = setInterval(() => {
    const stats = scheduler.getStats();
    const status = scheduler.getStatus();
    
    console.log(`📈 Scheduler Stats (${new Date().toISOString()}):`);
    console.log(`   Active Sources: ${stats.activeSources}/${stats.totalSources}`);
    console.log(`   Running Jobs: ${stats.runningJobs}`);
    console.log(`   Total Fetches: ${stats.totalFetches}`);
    console.log(`   Success Rate: ${stats.avgSuccessRate.toFixed(1)}%`);
    
    console.log('📊 Source Status:');
    for (const [sourceName, sourceStatus] of Object.entries(status)) {
      const nextFetch = sourceStatus.nextFetch 
        ? Math.round((sourceStatus.nextFetch.getTime() - Date.now()) / 1000)
        : null;
      
      console.log(`   ${sourceName}:`);
      console.log(`     Running: ${sourceStatus.isRunning ? '🔄' : '⏸️'}`);
      console.log(`     Next: ${nextFetch ? `${nextFetch}s` : 'Not scheduled'}`);
      console.log(`     Tokens: ${sourceStatus.rateLimitStatus?.tokens.toFixed(2) || 'N/A'}`);
      console.log(`     Failures: ${sourceStatus.consecutiveFailures}`);
      console.log(`     Fetches: ${sourceStatus.successfulFetches}/${sourceStatus.totalFetches}`);
    }
    console.log('');
  }, 30000); // 每30秒显示一次状态

  // 测试手动触发
  setTimeout(async () => {
    console.log('🔄 Testing manual trigger for TechCrunch...');
    try {
      await scheduler.triggerFetch('TechCrunch');
      console.log('✅ Manual trigger successful');
    } catch (error) {
      console.error('❌ Manual trigger failed:', error);
    }
  }, 45000);

  // 测试暂停和恢复
  setTimeout(() => {
    console.log('⏸️  Testing pause/resume for Wired...');
    const paused = scheduler.pauseSource('Wired');
    console.log(`Pause result: ${paused}`);
    
    setTimeout(() => {
      const resumed = scheduler.resumeSource('Wired');
      console.log(`Resume result: ${resumed}`);
    }, 15000);
  }, 60000);

  // 2分钟后停止
  setTimeout(() => {
    console.log('🛑 Stopping scheduler...');
    clearInterval(statusInterval);
    scheduler.stop();
    
    // 显示最终统计
    const finalStats = scheduler.getStats();
    console.log('\n📊 Final Statistics:');
    console.log(`   Total Sources: ${finalStats.totalSources}`);
    console.log(`   Active Sources: ${finalStats.activeSources}`);
    console.log(`   Total Fetches: ${finalStats.totalFetches}`);
    console.log(`   Successful Fetches: ${finalStats.successfulFetches}`);
    console.log(`   Success Rate: ${finalStats.avgSuccessRate.toFixed(1)}%`);
    
    console.log('\n🎉 Scheduler test completed!');
    process.exit(0);
  }, 120000);

  // 优雅退出处理
  process.on('SIGINT', () => {
    console.log('\n👋 Received SIGINT, stopping scheduler...');
    clearInterval(statusInterval);
    scheduler.stop();
    process.exit(0);
  });
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

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testScheduler().catch(error => {
    console.error('💥 Fatal error in scheduler test:', error);
    process.exit(1);
  });
}

