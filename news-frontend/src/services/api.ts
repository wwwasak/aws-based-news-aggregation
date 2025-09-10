import type { ApiResponse, NewsArticle, SearchParams, QueryParams } from '../types';

/**
 * API配置
 */
const API_CONFIG = {
  // 您需要将此URL替换为您的实际API Gateway URL
  baseUrl: import.meta.env.VITE_API_URL || 'https://your-api-gateway-url.amazonaws.com',
  timeout: 30000,
};

/**
 * HTTP请求工具函数
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = API_CONFIG.timeout): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * API错误处理
 */
class ApiError extends Error {
  public code: string;
  public status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/**
 * 新闻API服务类
 */
export class NewsApiService {
  /**
   * 获取BigTech新闻
   */
  static async getBigTechNews(params: QueryParams = {}): Promise<ApiResponse<NewsArticle[]>> {
    try {
      const searchParams = new URLSearchParams();
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.cursor) searchParams.append('cursor', params.cursor);

      const url = `${API_CONFIG.baseUrl}/v1/feed/bigtech${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      
      console.log('Fetching BigTech news from:', url);
      
      const response = await fetchWithTimeout(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error?.code || 'HTTP_ERROR',
          errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('TIMEOUT_ERROR', '请求超时，请稍后重试');
        }
        throw new ApiError('NETWORK_ERROR', `网络错误: ${error.message}`);
      }
      
      throw new ApiError('UNKNOWN_ERROR', '未知错误');
    }
  }

  /**
   * 搜索新闻
   */
  static async searchNews(params: SearchParams): Promise<ApiResponse<NewsArticle[]>> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('q', params.q);
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.cursor) searchParams.append('cursor', params.cursor);

      const url = `${API_CONFIG.baseUrl}/v1/search?${searchParams.toString()}`;
      
      console.log('Searching news with query:', params.q);
      
      const response = await fetchWithTimeout(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error?.code || 'HTTP_ERROR',
          errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('TIMEOUT_ERROR', '搜索请求超时，请稍后重试');
        }
        throw new ApiError('NETWORK_ERROR', `网络错误: ${error.message}`);
      }
      
      throw new ApiError('UNKNOWN_ERROR', '未知错误');
    }
  }

  /**
   * 健康检查
   */
  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetchWithTimeout(`${API_CONFIG.baseUrl}/health`);
      
      if (!response.ok) {
        throw new ApiError('HEALTH_CHECK_FAILED', 'API服务不可用');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('HEALTH_CHECK_FAILED', 'API服务连接失败');
    }
  }
}

export { ApiError };
