/**
 * 新闻文章类型定义
 */
export interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  url: string;
  normalizedUrl: string;
  normalizedTitle: string;
  source: string;
  publishedAt: string;
  tags: string[];
  score: number;
  matches: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 新闻源配置
 */
export interface NewsSource {
  name: string;
  type: 'rss' | 'webpage';
  url: string;
  weight: number;
  intervalSec: number;
  enabled?: boolean;
  selectors?: {
    title?: string;
    link?: string;
    description?: string;
    pubDate?: string;
  };
}

/**
 * 关键词规则
 */
export interface KeywordRule {
  keywords: string[];
  weight: number;
  tags?: string[];
  priority?: number;
}

/**
 * 关键词配置
 */
export interface KeywordConfig {
  companies: Record<string, KeywordRule>;
  topics: Record<string, KeywordRule>;
  blacklist: string[];
  minScore: number;
}

/**
 * 关键词匹配结果
 */
export interface MatchResult {
  tags: string[];
  score: number;
  matches: string[];
}

/**
 * API 响应类型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    nextToken?: string;
    hasMore: boolean;
    count: number;
  };
}

/**
 * DynamoDB 查询参数
 */
export interface QueryParams {
  limit?: number;
  nextToken?: string;
  startTime?: string;
  endTime?: string;
}