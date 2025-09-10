/**
 * 新闻文章类型定义
 */
export interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  url: string;
  source: string;
  domain?: string;
  publishedAt: string;
  tags: string[];
  score: number;
}

/**
 * API响应基础类型
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
 * 搜索参数
 */
export interface SearchParams {
  q: string;
  limit?: number;
  cursor?: string;
}

/**
 * 查询参数
 */
export interface QueryParams {
  limit?: number;
  cursor?: string;
}

/**
 * 新闻标签颜色映射
 */
export const TAG_COLORS: Record<string, string> = {
  ai: 'tag-ai',
  tech: 'tag-tech',
  technology: 'tag-tech',
  policy: 'tag-policy',
  security: 'tag-security',
  business: 'tag-business',
  bigtech: 'tag-tech',
  breaking: 'tag-security',
  urgent: 'tag-security',
  default: 'tag-default',
};

/**
 * 新闻分类选项
 */
export const NEWS_CATEGORIES = [
  { id: 'all', name: '全部', color: 'bg-gray-100 text-gray-800' },
  { id: 'ai', name: 'AI人工智能', color: 'bg-purple-100 text-purple-800' },
  { id: 'tech', name: '科技', color: 'bg-blue-100 text-blue-800' },
  { id: 'policy', name: '政策监管', color: 'bg-red-100 text-red-800' },
  { id: 'security', name: '安全事件', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'business', name: '商业投资', color: 'bg-green-100 text-green-800' },
  { id: 'bigtech', name: '大科技公司', color: 'bg-indigo-100 text-indigo-800' },
] as const;

export type CategoryId = typeof NEWS_CATEGORIES[number]['id'];
