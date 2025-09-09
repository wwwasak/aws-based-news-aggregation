/**
 * 新闻候选项类型
 */
export interface NewsCandidate {
  source: string;
  domain: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
}

/**
 * 抓取结果统计
 */
export interface FetchStats {
  totalProcessed: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
  duplicateCount: number;
  filteredCount: number;
}

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  burstSize: number;
}

/**
 * 页面抓取配置
 */
export interface PageConfig {
  selectors: {
    title: string;
    link: string;
    summary?: string;
    timestamp?: string;
  };
  followLinks?: boolean;
  maxItems?: number;
}

/**
 * 新闻源定义
 */
export interface NewsSource {
  name: string;
  type: 'rss' | 'page';
  url: string;
  weight: number;
  intervalSec: number;
  enabled: boolean;
  description?: string;
  tags?: string[];
  rateLimit?: RateLimitConfig;
  pageConfig?: PageConfig;
}

/**
 * 调度配置
 */
export interface SchedulingConfig {
  initialDelayRange: [number, number];
  jitterRange: [number, number];
  backoffStrategy: {
    type: 'exponential' | 'linear' | 'fixed';
    baseDelay: number;
    maxDelay: number;
    multiplier: number;
    maxRetries: number;
  };
}

/**
 * 监控配置
 */
export interface MonitoringConfig {
  verboseLogging: boolean;
  collectMetrics: boolean;
  errorRateThreshold: number;
  slowRequestThreshold: number;
}

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  interval: number;
  failureThreshold: number;
  recoveryInterval: number;
}

/**
 * 全局配置
 */
export interface GlobalConfig {
  requestTimeout: number;
  userAgent: string;
  maxConcurrency: number;
  defaultRetries: number;
  defaultWeight: number;
  defaultInterval: number;
}

/**
 * 完整的源配置
 */
export interface SourcesConfig {
  config: GlobalConfig;
  sources: NewsSource[];
  scheduling: SchedulingConfig;
  monitoring: MonitoringConfig;
  healthCheck: HealthCheckConfig;
}

/**
 * 新闻源配置 (兼容性保持)
 */
export interface NewsSourceConfig {
  sources: NewsSource[];
}

/**
 * 抓取结果
 */
export interface FetchResult {
  source: NewsSource;
  candidates: NewsCandidate[];
  stats: FetchStats;
  error?: string;
  duration: number;
}

/**
 * 文章候选项 (扩展版)
 */
export interface NewsArticleCandidate {
  source: string;
  domain: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  weight: number;
  tags?: string[];
}