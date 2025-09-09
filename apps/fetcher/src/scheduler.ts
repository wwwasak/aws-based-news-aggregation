/**
 * 新闻抓取调度器 - 支持错峰调度和令牌桶限速
 */

import { RateLimiter, ExponentialBackoff, StaggeredScheduler } from './rate-limiter.js';
import { NewsSource, SourcesConfig, FetchResult } from './types.js';

export interface SchedulerOptions {
  maxConcurrency?: number;
  enableRateLimit?: boolean;
  enableStaggering?: boolean;
  onFetchComplete?: (result: FetchResult) => void;
  onError?: (source: NewsSource, error: Error) => void;
}

export interface SourceStatus {
  source: NewsSource;
  lastFetch?: Date;
  nextFetch?: Date;
  isRunning: boolean;
  consecutiveFailures: number;
  lastError?: string;
  totalFetches: number;
  successfulFetches: number;
  avgDuration: number;
}

/**
 * 智能新闻抓取调度器
 */
export class FetchScheduler {
  private rateLimiter: RateLimiter;
  private backoff: ExponentialBackoff;
  private staggerer: StaggeredScheduler;
  private sourceStatuses = new Map<string, SourceStatus>();
  private activeJobs = new Set<string>();
  private timers = new Map<string, NodeJS.Timeout>();
  private options: SchedulerOptions;
  private config: SourcesConfig;

  constructor(config: SourcesConfig, options: SchedulerOptions = {}) {
    this.config = config;
    this.options = {
      maxConcurrency: config.config.maxConcurrency || 5,
      enableRateLimit: true,
      enableStaggering: true,
      ...options,
    };

    // 初始化限流器
    this.rateLimiter = new RateLimiter();
    
    // 初始化退避策略
    const backoffConfig = config.scheduling.backoffStrategy;
    this.backoff = new ExponentialBackoff(
      backoffConfig.baseDelay * 1000, // 转换为毫秒
      backoffConfig.maxDelay * 1000,
      backoffConfig.multiplier,
      backoffConfig.maxRetries
    );

    // 初始化错峰调度器
    this.staggerer = new StaggeredScheduler(config.scheduling.jitterRange);

    this.initializeSources();
  }

  /**
   * 初始化所有源
   */
  private initializeSources(): void {
    console.log('🔧 Initializing fetch scheduler...');

    for (const source of this.config.sources) {
      if (!source.enabled) {
        console.log(`⏸️  Skipping disabled source: ${source.name}`);
        continue;
      }

      // 创建限流器
      if (this.options.enableRateLimit && source.rateLimit) {
        this.rateLimiter.createBucket(source.name, source.rateLimit);
      }

      // 初始化源状态
      this.sourceStatuses.set(source.name, {
        source,
        isRunning: false,
        consecutiveFailures: 0,
        totalFetches: 0,
        successfulFetches: 0,
        avgDuration: 0,
      });

      console.log(`✅ Initialized source: ${source.name} (interval: ${source.intervalSec}s, weight: ${source.weight})`);
    }

    console.log(`🚀 Scheduler initialized with ${this.sourceStatuses.size} active sources`);
  }

  /**
   * 启动调度器
   */
  start(): void {
    console.log('🎯 Starting fetch scheduler...');

    for (const [sourceName, status] of this.sourceStatuses) {
      if (!status.source.enabled) {
        continue;
      }

      // 计算初始延迟（避免启动时同时执行）
      const initialDelay = this.options.enableStaggering
        ? this.staggerer.getInitialDelay(sourceName, this.config.scheduling.initialDelayRange)
        : 0;

      // 调度第一次执行
      const timer = setTimeout(() => {
        this.scheduleFetch(sourceName);
      }, initialDelay);

      this.timers.set(sourceName, timer);
      
      const nextTime = new Date(Date.now() + initialDelay);
      status.nextFetch = nextTime;
      
      console.log(`⏰ Scheduled ${sourceName} for ${nextTime.toISOString()}`);
    }

    console.log('🎉 Fetch scheduler started successfully');
  }

  /**
   * 停止调度器
   */
  stop(): void {
    console.log('⏹️  Stopping fetch scheduler...');

    // 清理所有定时器
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    // 等待正在运行的任务完成
    const runningJobs = Array.from(this.activeJobs);
    if (runningJobs.length > 0) {
      console.log(`⏳ Waiting for ${runningJobs.length} running jobs to complete...`);
    }

    console.log('✅ Fetch scheduler stopped');
  }

  /**
   * 调度单个源的抓取
   */
  private async scheduleFetch(sourceName: string): Promise<void> {
    const status = this.sourceStatuses.get(sourceName);
    if (!status || status.isRunning) {
      return;
    }

    // 检查并发限制
    if (this.activeJobs.size >= this.options.maxConcurrency!) {
      console.log(`🚦 Concurrent limit reached (${this.options.maxConcurrency}), delaying ${sourceName}`);
      
      // 延迟重试
      const timer = setTimeout(() => this.scheduleFetch(sourceName), 5000);
      this.timers.set(sourceName, timer);
      return;
    }

    // 检查是否需要等待限流
    if (this.options.enableRateLimit) {
      const canProceed = await this.rateLimiter.waitForToken(sourceName, 30000);
      if (!canProceed) {
        console.warn(`⚠️  Rate limit timeout for ${sourceName}, skipping this cycle`);
        this.scheduleNext(sourceName);
        return;
      }
    }

    // 开始抓取
    await this.executeFetch(sourceName);
  }

  /**
   * 执行抓取
   */
  private async executeFetch(sourceName: string): Promise<void> {
    const status = this.sourceStatuses.get(sourceName)!;
    const source = status.source;

    console.log(`🔄 Starting fetch for ${sourceName}`);

    status.isRunning = true;
    status.lastFetch = new Date();
    this.activeJobs.add(sourceName);

    const startTime = Date.now();

    try {
      // 这里应该调用实际的抓取逻辑
      // const result = await this.fetchFromSource(source);
      
      // 模拟抓取过程
      const result = await this.mockFetch(source);

      const duration = Date.now() - startTime;
      
      // 更新统计信息
      status.totalFetches++;
      status.successfulFetches++;
      status.avgDuration = (status.avgDuration * (status.totalFetches - 1) + duration) / status.totalFetches;
      status.consecutiveFailures = 0;

      // 重置退避状态
      this.backoff.recordSuccess(sourceName);

      console.log(`✅ Fetch completed for ${sourceName} (${duration}ms, ${result.candidates.length} items)`);

      // 回调通知
      if (this.options.onFetchComplete) {
        this.options.onFetchComplete(result);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`❌ Fetch failed for ${sourceName} (${duration}ms):`, errorMessage);

      // 更新失败统计
      status.consecutiveFailures++;
      status.lastError = errorMessage;

      // 记录失败用于退避
      this.backoff.recordFailure(sourceName);

      // 错误回调
      if (this.options.onError) {
        this.options.onError(source, error instanceof Error ? error : new Error(String(error)));
      }

    } finally {
      status.isRunning = false;
      this.activeJobs.delete(sourceName);

      // 调度下次执行
      this.scheduleNext(sourceName);
    }
  }

  /**
   * 调度下次执行
   */
  private scheduleNext(sourceName: string): void {
    const status = this.sourceStatuses.get(sourceName)!;
    const source = status.source;

    let delay = source.intervalSec * 1000; // 转换为毫秒

    // 如果有连续失败，应用退避策略
    if (status.consecutiveFailures > 0) {
      const backoffDelay = this.backoff.getDelay(sourceName);
      if (backoffDelay === -1) {
        console.warn(`🚫 Max retries exceeded for ${sourceName}, disabling temporarily`);
        return;
      }
      delay = Math.max(delay, backoffDelay);
    }

    // 应用错峰调度
    if (this.options.enableStaggering) {
      const nextTime = this.staggerer.getNextExecutionTime(sourceName, delay / 1000);
      delay = nextTime - Date.now();
    }

    // 调度下次执行
    const timer = setTimeout(() => {
      this.scheduleFetch(sourceName);
    }, delay);

    this.timers.set(sourceName, timer);
    
    const nextTime = new Date(Date.now() + delay);
    status.nextFetch = nextTime;

    console.log(`⏰ Next fetch for ${sourceName} scheduled for ${nextTime.toISOString()}`);
  }

  /**
   * 模拟抓取（用于测试）
   */
  private async mockFetch(source: NewsSource): Promise<FetchResult> {
    // 模拟网络延迟
    const delay = Math.random() * 2000 + 500; // 500-2500ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // 模拟可能的失败
    if (Math.random() < 0.1) { // 10% 失败率
      throw new Error(`Mock fetch error for ${source.name}`);
    }

    return {
      source,
      candidates: [], // 模拟空结果
      stats: {
        totalProcessed: 0,
        successCount: 0,
        skippedCount: 0,
        failedCount: 0,
        duplicateCount: 0,
        filteredCount: 0,
      },
      duration: delay,
    };
  }

  /**
   * 获取所有源的状态
   */
  getStatus(): Record<string, SourceStatus & { rateLimitStatus?: any }> {
    const result: Record<string, SourceStatus & { rateLimitStatus?: any }> = {};

    for (const [sourceName, status] of this.sourceStatuses) {
      result[sourceName] = {
        ...status,
        rateLimitStatus: this.rateLimiter.getStatus(sourceName),
      };
    }

    return result;
  }

  /**
   * 手动触发特定源的抓取
   */
  async triggerFetch(sourceName: string): Promise<void> {
    const status = this.sourceStatuses.get(sourceName);
    if (!status) {
      throw new Error(`Source ${sourceName} not found`);
    }

    if (status.isRunning) {
      throw new Error(`Source ${sourceName} is already running`);
    }

    console.log(`🔄 Manual trigger for ${sourceName}`);
    await this.scheduleFetch(sourceName);
  }

  /**
   * 暂停特定源
   */
  pauseSource(sourceName: string): boolean {
    const timer = this.timers.get(sourceName);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sourceName);
      console.log(`⏸️  Paused ${sourceName}`);
      return true;
    }
    return false;
  }

  /**
   * 恢复特定源
   */
  resumeSource(sourceName: string): boolean {
    const status = this.sourceStatuses.get(sourceName);
    if (status && !this.timers.has(sourceName)) {
      this.scheduleNext(sourceName);
      console.log(`▶️  Resumed ${sourceName}`);
      return true;
    }
    return false;
  }

  /**
   * 获取调度统计信息
   */
  getStats(): {
    totalSources: number;
    activeSources: number;
    runningJobs: number;
    totalFetches: number;
    successfulFetches: number;
    avgSuccessRate: number;
  } {
    const statuses = Array.from(this.sourceStatuses.values());
    const totalFetches = statuses.reduce((sum, s) => sum + s.totalFetches, 0);
    const successfulFetches = statuses.reduce((sum, s) => sum + s.successfulFetches, 0);

    return {
      totalSources: statuses.length,
      activeSources: statuses.filter(s => s.source.enabled).length,
      runningJobs: this.activeJobs.size,
      totalFetches,
      successfulFetches,
      avgSuccessRate: totalFetches > 0 ? (successfulFetches / totalFetches) * 100 : 0,
    };
  }
}

