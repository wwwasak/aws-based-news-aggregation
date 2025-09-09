/**
 * 令牌桶限流器 - 为每个新闻源提供独立的速率限制
 */

export interface RateLimitConfig {
  /** 每分钟允许的请求数 */
  requestsPerMinute: number;
  /** 突发请求容量 */
  burstSize: number;
}

export interface TokenBucket {
  /** 当前令牌数 */
  tokens: number;
  /** 桶容量 */
  capacity: number;
  /** 令牌补充速率 (令牌/毫秒) */
  refillRate: number;
  /** 上次补充时间 */
  lastRefill: number;
}

/**
 * 令牌桶限流器
 */
export class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private defaultConfig: RateLimitConfig;

  constructor(defaultConfig: RateLimitConfig = { requestsPerMinute: 60, burstSize: 10 }) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * 为特定源创建令牌桶
   */
  createBucket(sourceId: string, config?: RateLimitConfig): void {
    const finalConfig = config || this.defaultConfig;
    const refillRate = finalConfig.requestsPerMinute / (60 * 1000); // 令牌/毫秒

    this.buckets.set(sourceId, {
      tokens: finalConfig.burstSize,
      capacity: finalConfig.burstSize,
      refillRate,
      lastRefill: Date.now(),
    });

    console.log(`Created rate limiter for ${sourceId}:`, {
      requestsPerMinute: finalConfig.requestsPerMinute,
      burstSize: finalConfig.burstSize,
      refillRate: refillRate * 1000 * 60, // 显示为令牌/分钟
    });
  }

  /**
   * 尝试获取令牌
   */
  async acquireToken(sourceId: string): Promise<boolean> {
    const bucket = this.buckets.get(sourceId);
    if (!bucket) {
      // 如果没有配置限流器，默认允许
      console.warn(`No rate limiter configured for ${sourceId}, allowing request`);
      return true;
    }

    this.refillBucket(bucket);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      console.log(`Token acquired for ${sourceId}, remaining: ${bucket.tokens.toFixed(2)}`);
      return true;
    }

    console.log(`Rate limit exceeded for ${sourceId}, tokens: ${bucket.tokens.toFixed(2)}`);
    return false;
  }

  /**
   * 等待直到可以获取令牌
   */
  async waitForToken(sourceId: string, maxWaitMs: number = 60000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      if (await this.acquireToken(sourceId)) {
        return true;
      }
      
      // 计算等待时间
      const bucket = this.buckets.get(sourceId);
      if (bucket) {
        const timeToNextToken = 1 / bucket.refillRate; // 毫秒
        const waitTime = Math.min(timeToNextToken, 1000); // 最多等待1秒
        
        console.log(`Waiting ${waitTime.toFixed(0)}ms for token for ${sourceId}`);
        await this.sleep(waitTime);
      } else {
        await this.sleep(1000);
      }
    }

    console.warn(`Timeout waiting for token for ${sourceId} after ${maxWaitMs}ms`);
    return false;
  }

  /**
   * 补充令牌桶
   */
  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = timePassed * bucket.refillRate;

    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * 获取限流器状态
   */
  getStatus(sourceId: string): {
    tokens: number;
    capacity: number;
    refillRate: number;
    utilizationPercent: number;
  } | null {
    const bucket = this.buckets.get(sourceId);
    if (!bucket) {
      return null;
    }

    this.refillBucket(bucket);
    
    return {
      tokens: Math.floor(bucket.tokens * 100) / 100, // 保留2位小数
      capacity: bucket.capacity,
      refillRate: bucket.refillRate * 60 * 1000, // 转换为令牌/分钟
      utilizationPercent: Math.round(((bucket.capacity - bucket.tokens) / bucket.capacity) * 100),
    };
  }

  /**
   * 获取所有限流器状态
   */
  getAllStatus(): Record<string, ReturnType<typeof this.getStatus>> {
    const status: Record<string, ReturnType<typeof this.getStatus>> = {};
    
    for (const sourceId of this.buckets.keys()) {
      status[sourceId] = this.getStatus(sourceId);
    }
    
    return status;
  }

  /**
   * 重置特定源的令牌桶
   */
  resetBucket(sourceId: string): void {
    const bucket = this.buckets.get(sourceId);
    if (bucket) {
      bucket.tokens = bucket.capacity;
      bucket.lastRefill = Date.now();
      console.log(`Reset rate limiter for ${sourceId}`);
    }
  }

  /**
   * 移除特定源的限流器
   */
  removeBucket(sourceId: string): boolean {
    const removed = this.buckets.delete(sourceId);
    if (removed) {
      console.log(`Removed rate limiter for ${sourceId}`);
    }
    return removed;
  }

  /**
   * 清理所有限流器
   */
  clear(): void {
    this.buckets.clear();
    console.log('Cleared all rate limiters');
  }

  /**
   * 休眠工具函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取建议的等待时间
   */
  getRecommendedWaitTime(sourceId: string): number {
    const bucket = this.buckets.get(sourceId);
    if (!bucket) {
      return 0;
    }

    this.refillBucket(bucket);
    
    if (bucket.tokens >= 1) {
      return 0;
    }

    // 计算获取下一个令牌需要的时间
    const tokensNeeded = 1 - bucket.tokens;
    return Math.ceil(tokensNeeded / bucket.refillRate);
  }
}

/**
 * 指数退避重试器
 */
export class ExponentialBackoff {
  private attempts = new Map<string, number>();

  constructor(
    private baseDelay: number = 1000,
    private maxDelay: number = 60000,
    private multiplier: number = 2,
    private maxRetries: number = 5
  ) {}

  /**
   * 获取下次重试的延迟时间
   */
  getDelay(key: string): number {
    const attempts = this.attempts.get(key) || 0;
    
    if (attempts >= this.maxRetries) {
      return -1; // 表示不应该再重试
    }

    const delay = Math.min(
      this.baseDelay * Math.pow(this.multiplier, attempts),
      this.maxDelay
    );

    // 添加随机抖动 (±20%)
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.max(0, delay + jitter);
  }

  /**
   * 记录一次失败尝试
   */
  recordFailure(key: string): number {
    const attempts = (this.attempts.get(key) || 0) + 1;
    this.attempts.set(key, attempts);
    return attempts;
  }

  /**
   * 记录一次成功，重置计数器
   */
  recordSuccess(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * 检查是否应该重试
   */
  shouldRetry(key: string): boolean {
    const attempts = this.attempts.get(key) || 0;
    return attempts < this.maxRetries;
  }

  /**
   * 获取重试次数
   */
  getAttempts(key: string): number {
    return this.attempts.get(key) || 0;
  }

  /**
   * 重置特定键的重试状态
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * 清理所有重试状态
   */
  clear(): void {
    this.attempts.clear();
  }
}

/**
 * 错峰调度器
 */
export class StaggeredScheduler {
  private schedules = new Map<string, number>();
  private jitterRange: [number, number];

  constructor(jitterRange: [number, number] = [-60, 60]) {
    this.jitterRange = jitterRange;
  }

  /**
   * 计算下次执行时间 (错峰)
   */
  getNextExecutionTime(sourceId: string, intervalSec: number): number {
    const baseTime = Date.now() + (intervalSec * 1000);
    
    // 添加随机抖动
    const [minJitter, maxJitter] = this.jitterRange;
    const jitter = (Math.random() * (maxJitter - minJitter) + minJitter) * 1000;
    
    const nextTime = baseTime + jitter;
    this.schedules.set(sourceId, nextTime);
    
    console.log(`Scheduled ${sourceId} for ${new Date(nextTime).toISOString()} (in ${Math.round((nextTime - Date.now()) / 1000)}s)`);
    
    return nextTime;
  }

  /**
   * 获取初始延迟 (避免启动时同时执行)
   */
  getInitialDelay(sourceId: string, maxDelayRange: [number, number] = [0, 300]): number {
    const [min, max] = maxDelayRange;
    const delay = Math.random() * (max - min) + min;
    
    console.log(`Initial delay for ${sourceId}: ${Math.round(delay)}s`);
    return delay * 1000; // 转换为毫秒
  }

  /**
   * 检查是否到了执行时间
   */
  shouldExecute(sourceId: string): boolean {
    const scheduledTime = this.schedules.get(sourceId);
    if (!scheduledTime) {
      return true; // 没有调度记录，可以执行
    }
    
    return Date.now() >= scheduledTime;
  }

  /**
   * 获取距离下次执行的时间
   */
  getTimeUntilNext(sourceId: string): number {
    const scheduledTime = this.schedules.get(sourceId);
    if (!scheduledTime) {
      return 0;
    }
    
    return Math.max(0, scheduledTime - Date.now());
  }

  /**
   * 移除调度
   */
  removeSchedule(sourceId: string): boolean {
    return this.schedules.delete(sourceId);
  }

  /**
   * 获取所有调度状态
   */
  getAllSchedules(): Record<string, { nextExecution: string; timeUntil: number }> {
    const result: Record<string, { nextExecution: string; timeUntil: number }> = {};
    
    for (const [sourceId, scheduledTime] of this.schedules) {
      result[sourceId] = {
        nextExecution: new Date(scheduledTime).toISOString(),
        timeUntil: Math.max(0, scheduledTime - Date.now()),
      };
    }
    
    return result;
  }

  /**
   * 清理所有调度
   */
  clear(): void {
    this.schedules.clear();
  }
}