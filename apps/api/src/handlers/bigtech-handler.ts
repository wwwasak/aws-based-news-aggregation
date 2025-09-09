import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoService } from '../services/index.js';
import { ApiResponse, QueryParams, ErrorCode } from '../types.js';

/**
 * BigTech 新闻推送处理器
 */
export async function handleBigTech(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  
  try {
    console.log('Processing BigTech feed request', {
      path: event.path,
      queryParams: event.queryStringParameters,
    });

    // 解析查询参数
    const params = parseQueryParams(event.queryStringParameters);
    
    // 验证参数
    const validationError = validateParams(params);
    if (validationError) {
      return createErrorResponse(400, ErrorCode.VALIDATION_ERROR, validationError);
    }

    // 查询数据
    const dynamoService = new DynamoService();
    const result = await dynamoService.queryBigTechArticles(params.limit, params.cursor);

    const duration = Date.now() - startTime;
    
    console.log(`BigTech feed request completed`, {
      itemsCount: result.items.length,
      hasMore: result.hasMore,
      duration,
    });

    // 构建响应
    const response: ApiResponse = {
      success: true,
      data: result.items,
      pagination: {
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        count: result.items.length,
      },
    };

    return createSuccessResponse(response);

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('BigTech feed request failed', {
      error: error instanceof Error ? error.message : String(error),
      duration,
    });

    // 根据错误类型返回适当的错误响应
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return createErrorResponse(408, ErrorCode.TIMEOUT_ERROR, 'Request timed out');
      }
      if (error.message.includes('Database')) {
        return createErrorResponse(503, ErrorCode.INTERNAL_ERROR, 'Database temporarily unavailable');
      }
    }

    return createErrorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error');
  }
}

/**
 * 解析查询参数
 */
function parseQueryParams(queryParams: Record<string, string> | null): QueryParams {
  const params: QueryParams = {};

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
 * 验证查询参数
 */
function validateParams(params: QueryParams): string | null {
  // 验证 limit
  if (params.limit !== undefined) {
    if (params.limit < 1 || params.limit > 100) {
      return 'Limit must be between 1 and 100';
    }
  }

  // 验证 cursor（如果提供）
  if (params.cursor) {
    try {
      // 这里可以添加更严格的 cursor 验证
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
      'Cache-Control': 'public, max-age=300', // 5分钟缓存
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

