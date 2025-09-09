/**
 * DynamoDB 表名和索引名常量
 */
export const TABLE_NAMES = {
  NEWS_ARTICLES: 'NewsArticles',
} as const;

export const INDEX_NAMES = {
  BY_TAG_TIME: 'ByTagTimeIndex',
  BY_SOURCE_TIME: 'BySourceTimeIndex',
} as const;

/**
 * 默认配置值
 */
export const DEFAULT_CONFIG = {
  FETCH_INTERVAL: 3600, // 1小时
  MIN_SCORE: 10,
  MAX_ARTICLES_PER_FETCH: 100,
  SIMILARITY_THRESHOLD: 0.8,
  PAGINATION_LIMIT: 20,
  MAX_PAGINATION_LIMIT: 100,
} as const;

/**
 * API 路径
 */
export const API_PATHS = {
  HEALTH: '/health',
  BIGTECH: '/bigtech',
  SEARCH: '/search',
} as const;

/**
 * 错误码
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;