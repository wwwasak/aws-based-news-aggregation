/**
 * API 响应类型定义
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    nextCursor?: string;
    hasMore: boolean;
    count: number;
  };
}

/**
 * 文章响应格式
 */
export interface ArticleResponse {
  id: string;
  title: string;
  source: string;
  domain: string;
  url: string;
  summary: string;
  publishedAt: string;
  tags: string[];
  score: number;
}

/**
 * 查询参数
 */
export interface QueryParams {
  limit?: number;
  cursor?: string;
}

/**
 * 搜索参数
 */
export interface SearchParams extends QueryParams {
  q: string;
}

/**
 * 分页游标
 */
export interface PaginationCursor {
  lastEvaluatedKey?: Record<string, any>;
  timestamp?: string;
}

/**
 * 错误码枚举
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
}

/**
 * DynamoDB 文章项
 */
export interface DynamoArticleItem {
  pk: string;
  sk: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  url: string;
  urlHash: string;
  source: string;
  domain: string;
  title: string;
  titleNorm: string;
  summary: string;
  publishedAt: string;
  lang: string;
  tags: string[];
  score: number;
  isBigTech: boolean;
  isPolicy: boolean;
  createdAt: string;
  updatedAt: string;
}



