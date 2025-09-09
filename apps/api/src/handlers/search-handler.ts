import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoService } from '../services/index.js';
import { SearchUtils } from '../utils/index.js';
import { ApiResponse, SearchParams, ErrorCode, ArticleResponse } from '../types.js';

/**
 * 搜索处理器
 */
export async function handleSearch(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  
  try {
    console.log('Processing search request', {
      path: event.path,
      queryParams: event.queryStringParameters,
    });

    // 解析查询参数
    const params = parseSearchParams(event.queryStringParameters);
    
    // 验证参数
    const validationError = validateSearchParams(params);
    if (validationError) {
      return createErrorResponse(400, ErrorCode.VALIDATION_ERROR, validationError);
    }

    console.log(`Searching for: "${params.q}" (limit: ${params.limit || 20})`);

    // 执行搜索
    const dynamoService = new DynamoService();
    const searchResult = await dynamoService.searchArticles(params.q, params.limit, params.cursor);

    // 初始化搜索工具（使用默认配置）
    const keywordConfig = SearchUtils.getDefaultKeywordConfig();
    const searchUtils = new SearchUtils(keywordConfig);

    // 处理搜索结果
    const processedResults = searchResult.items
      .filter(item => searchUtils.matchesQuery(item, params.q))
      .map(item => ({
        article: item,
        relevanceScore: searchUtils.calculateRelevanceScore(item, params.q),
      }));

    // 排序结果
    const sortedResults = searchUtils.sortSearchResults(processedResults);

    // 转换为响应格式
    const responseItems: ArticleResponse[] = sortedResults.map(result => ({
      id: result.article.urlHash,
      title: result.article.title,
      source: result.article.source,
      domain: result.article.domain,
      url: result.article.url,
      summary: result.article.summary,
      publishedAt: result.article.publishedAt,
      tags: result.article.tags || [],
      score: Math.round(result.relevanceScore), // 使用增强后的相关性分数
    }));

    const duration = Date.now() - startTime;
    
    console.log(`Search request completed`, {
      query: params.q,
      totalMatches: processedResults.length,
      returnedItems: responseItems.length,
      hasMore: searchResult.hasMore,
      duration,
    });

    // 构建响应
    const response: ApiResponse = {
      success: true,
      data: responseItems,
      pagination: {
        nextCursor: searchResult.nextCursor,
        hasMore: searchResult.hasMore,
        count: responseItems.length,
      },
    };

    return createSuccessResponse(response);

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('Search request failed', {
      query: event.queryStringParameters?.q,
      error: error instanceof Error ? error.message : String(error),
      duration,
    });

    // 根据错误类型返回适当的错误响应
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return createErrorResponse(408, ErrorCode.TIMEOUT_ERROR, 'Search request timed out');
      }
      if (error.message.includes('Database') || error.message.includes('Search failed')) {
        return createErrorResponse(503, ErrorCode.INTERNAL_ERROR, 'Search service temporarily unavailable');
      }
    }

    return createErrorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error');
  }
}

/**
 * 解析搜索参数
 */
function parseSearchParams(queryParams: Record<string, string> | null): SearchParams {
  const params: SearchParams = {
    q: '', // 默认空查询
  };

  if (queryParams?.q) {
    params.q = decodeURIComponent(queryParams.q.trim());
  }

  if (queryParams?.limit) {
    const limit = parseInt(queryParams.limit, 10);
    if (!isNaN(limit)) {
      params.limit = limit;
    }
  }

  if (queryParams?.cursor) {
    params.cursor = queryParams.cursor;
  }

  return params;
}

/**
 * 验证搜索参数
 */
function validateSearchParams(params: SearchParams): string | null {
  // 验证查询字符串
  if (!params.q || params.q.length === 0) {
    return 'Query parameter "q" is required';
  }

  if (params.q.length < 2) {
    return 'Query must be at least 2 characters long';
  }

  if (params.q.length > 200) {
    return 'Query must not exceed 200 characters';
  }

  // 验证 limit
  if (params.limit !== undefined) {
    if (params.limit < 1 || params.limit > 100) {
      return 'Limit must be between 1 and 100';
    }
  }

  // 验证 cursor（如果提供）
  if (params.cursor) {
    try {
      Buffer.from(params.cursor, 'base64').toString('utf-8');
    } catch {
      return 'Invalid cursor format';
    }
  }

  return null;
}

/**
 * 创建成功响应
 */
function createSuccessResponse(data: ApiResponse): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=60', // 1分钟缓存（搜索结果变化较快）
    },
    body: JSON.stringify(data),
  };
}

/**
 * 创建错误响应
 */
function createErrorResponse(
  statusCode: number,
  errorCode: ErrorCode,
  message: string
): APIGatewayProxyResult {
  const response: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
    },
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
    body: JSON.stringify(response),
  };
}