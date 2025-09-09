import type { Handler, EventBridgeEvent } from 'aws-lambda';
import { NewsStore } from '@news-agg/store';
import { KeywordEngine } from '@news-agg/keyword-engine';
import { normalizeUrl, normalizeTitle, hash, getCurrentTimestamp, createLambdaLogger } from '@news-agg/shared';
import { ConfigLoader } from './config-loader.js';
import { RSSFetcher } from './sources/rss-fetcher.js';
import { WebpageFetcher } from './sources/webpage-fetcher.js';
import { Deduplicator } from './deduplicator.js';
import { RateLimiter } from './rate-limiter.js';
import { FetchStats, NewsCandidate } from './types.js';

interface FetcherEvent {
  sourceNames?: string[];
  forceRefresh?: boolean;
  triggerSource?: string;
}

/**
 * 新闻抓取 Lambda 处理器
 */
export const handler: Handler<EventBridgeEvent<'Scheduled Event', FetcherEvent>> = async (event, context) => {
  const startTime = Date.now();
  const logger = createLambdaLogger('fetcher');
  
  logger.info('Starting news fetch process', {
    requestId: context.awsRequestId,
    event: event.detail,
    functionName: context.functionName,
    memoryLimit: context.memoryLimitInMB,
    remainingTime: context.getRemainingTimeInMillis(),
  });
  
  // 初始化统计
  const stats: FetchStats = {
    totalProcessed: 0,
    successCount: 0,
    skippedCount: 0,
    failedCount: 0,
    duplicateCount: 0,
    filteredCount: 0,
  };

  try {
    // 初始化组件
    const configLoader = new ConfigLoader();
    const store = new NewsStore();
    const deduplicator = new Deduplicator(store);
    const rateLimiter = new RateLimiter(3, 10, 1000); // 3并发，每秒最多10个请求
    
    const rssFetcher = new RSSFetcher();
    const webpageFetcher = new WebpageFetcher();
    
    // 加载配置
    const sources = configLoader.loadSources();
    const keywordConfig = configLoader.loadKeywords();
    const keywordEngine = new KeywordEngine(keywordConfig);
    
    logger.info('Configuration loaded', {
      sourcesCount: sources.sources.length,
      enabledSources: sources.sources.filter(s => s.enabled).length,
      keywordRules: keywordEngine.getRuleCount(),
    });
    
    // 过滤要处理的源
    const enabledSources = sources.sources.filter(source => source.enabled !== false);
    const sourcesToProcess = event.detail?.sourceNames
      ? enabledSources.filter(source => event.detail.sourceNames!.includes(source.name))
      : enabledSources;
    
    logger.info('Sources filtered for processing', {
      totalSources: sources.sources.length,
      enabledSources: enabledSources.length,
      sourcesToProcess: sourcesToProcess.length,
      sourceNames: sourcesToProcess.map(s => s.name),
    });
    
    // 处理每个新闻源
    for (const source of sourcesToProcess) {
      try {
        const sourceLogger = logger.child({ source: source.name, type: source.type });
        sourceLogger.info('Processing source started', {
          url: source.url,
          weight: source.weight,
          intervalSec: source.intervalSec,
        });
        
        // 使用速率限制器抓取候选项
        const candidates = await rateLimiter.executeWithRetry(async () => {
          if (source.type === 'rss') {
            return await rssFetcher.fetchCandidates(source);
          } else if (source.type === 'page') {
            return await webpageFetcher.fetchCandidates(source);
          } else {
            console.warn(`⚠️  Unknown source type: ${source.type}`);
            return [];
          }
        }, `fetch-${source.name}`);
        
        console.log(`📊 Fetched ${candidates.length} candidates from ${source.name}`);
        
        // 处理每个候选项
        for (const candidate of candidates) {
          stats.totalProcessed++;
          
          try {
            await processCandidate(candidate, store, deduplicator, keywordEngine, keywordConfig, stats);
          } catch (error) {
            stats.failedCount++;
            console.error(`❌ Failed to process candidate: ${candidate.title.substring(0, 50)}...`, error);
          }
        }
        
      } catch (error) {
        console.error(`❌ Failed to process source ${source.name}:`, error);
      }
    }
    
    // 等待所有任务完成
    await rateLimiter.waitForQueue();
    
    const duration = Date.now() - startTime;
    
    // 输出最终统计
    console.log('\n📊 Final Statistics:');
    console.log(`   Total Processed: ${stats.totalProcessed}`);
    console.log(`   ✅ Success: ${stats.successCount}`);
    console.log(`   ⏭️  Skipped (Duplicate): ${stats.duplicateCount}`);
    console.log(`   🚫 Filtered (Low Score): ${stats.filteredCount}`);
    console.log(`   ❌ Failed: ${stats.failedCount}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    
    // 写入 CloudWatch 日志（结构化）
    console.log('METRICS', JSON.stringify({
      totalProcessed: stats.totalProcessed,
      successCount: stats.successCount,
      duplicateCount: stats.duplicateCount,
      filteredCount: stats.filteredCount,
      failedCount: stats.failedCount,
      duration,
      sourcesProcessed: sourcesToProcess.length,
    }));
    
    const successRate = (stats.successCount / Math.max(stats.totalProcessed, 1)) * 100;
    
    const result = {
      success: true,
      stats,
      duration,
      sourcesProcessed: sourcesToProcess.length,
    };
    
    // 记录详细的执行统计
    logger.info('Fetch process completed successfully', {
      duration,
      stats: {
        totalProcessed: stats.totalProcessed,
        successCount: stats.successCount,
        skippedCount: stats.skippedCount,
        failedCount: stats.failedCount,
        duplicateCount: stats.duplicateCount,
        filteredCount: stats.filteredCount,
        successRate: Number(successRate.toFixed(1)),
      },
      performance: {
        articlesPerSecond: stats.totalProcessed > 0 ? Number((stats.totalProcessed / (duration / 1000)).toFixed(2)) : 0,
        avgProcessingTime: stats.totalProcessed > 0 ? Number((duration / stats.totalProcessed).toFixed(2)) : 0,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        limit: context.memoryLimitInMB,
        utilization: Math.round((process.memoryUsage().heapUsed / 1024 / 1024 / parseInt(context.memoryLimitInMB)) * 100),
      },
    });

    // 记录 CloudWatch 指标
    logger.metric('articles.processed', stats.totalProcessed, 'count');
    logger.metric('articles.success', stats.successCount, 'count');
    logger.metric('articles.failed', stats.failedCount, 'count');
    logger.metric('articles.duplicates', stats.duplicateCount, 'count');
    logger.metric('articles.filtered', stats.filteredCount, 'count');
    logger.metric('fetch.duration', duration, 'milliseconds');
    logger.metric('fetch.success_rate', successRate, 'percent');
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('Fetch process failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      stats,
      requestId: context.awsRequestId,
    });

    // 记录失败指标
    logger.metric('fetch.errors', 1, 'count');
    logger.metric('fetch.duration', duration, 'milliseconds');
    
    throw error;
  }
};

/**
 * 处理单个新闻候选项
 */
async function processCandidate(
  candidate: NewsCandidate,
  store: NewsStore,
  deduplicator: Deduplicator,
  keywordEngine: KeywordEngine,
  keywordConfig: any,
  stats: FetchStats
): Promise<void> {
  // 1. 标准化处理
  const normalizedUrl = normalizeUrl(candidate.url);
  const normalizedTitleStr = normalizeTitle(candidate.title);
  const urlHash = hash(normalizedUrl);
  
  // 2. 去重检查
  const duplicateCheck = await deduplicator.isDuplicate(candidate);
  if (duplicateCheck.isDuplicate) {
    stats.duplicateCount++;
    console.log(`⏭️  Skipping duplicate: ${candidate.title.substring(0, 50)}... (${duplicateCheck.reason})`);
    return;
  }
  
  // 3. 关键词匹配和评分
  const matchResult = keywordEngine.matchArticle({
    title: candidate.title,
    summary: candidate.summary,
    url: candidate.url,
  });
  
  // 4. 分数过滤
  if (matchResult.score < keywordConfig.minScore) {
    stats.filteredCount++;
    console.log(`🚫 Filtering low-score article: ${candidate.title.substring(0, 50)}... (score: ${matchResult.score})`);
    return;
  }
  
  // 5. 构建文章对象
  const epoch = Math.floor(new Date(candidate.publishedAt).getTime() / 1000);
  const article = {
    // 主键设计
    pk: `source#${candidate.domain}`,
    sk: `ts#${epoch}#${urlHash}`,
    
    // GSI 键
    GSI1PK: matchResult.tags.length > 0 ? `tag#${matchResult.tags[0]}` : `tag#general`,
    GSI1SK: candidate.publishedAt,
    GSI2PK: `source#${candidate.domain}`,
    GSI2SK: candidate.publishedAt,
    
    // 文章属性
    url: candidate.url,
    urlHash,
    source: candidate.source,
    domain: candidate.domain,
    title: candidate.title,
    titleNorm: normalizedTitleStr,
    summary: candidate.summary,
    publishedAt: candidate.publishedAt,
    lang: 'en', // 默认英文，可以后续添加语言检测
    tags: matchResult.tags,
    score: matchResult.score,
    isBigTech: matchResult.score >= 50, // 阈值可配置
    isPolicy: matchResult.tags.some(tag => tag.includes('policy')),
    
    // 元数据
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
  
  // 6. 幂等写入（使用 urlHash 作为条件）
  try {
    await store.putArticle(article as any);
    stats.successCount++;
    console.log(`✅ Saved article: ${candidate.title.substring(0, 50)}... (score: ${matchResult.score})`);
  } catch (error) {
    // 如果是条件写入失败（已存在），视为跳过
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ConditionalCheckFailedException') {
      stats.skippedCount++;
      console.log(`⏭️  Article already exists: ${candidate.title.substring(0, 50)}...`);
    } else {
      throw error;
    }
  }
}