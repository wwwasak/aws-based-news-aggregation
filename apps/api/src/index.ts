import type { APIGatewayProxyHandler } from 'aws-lambda';
import { handleHealth, handleBigTech, handleSearch } from './handlers/index.js';
import { ErrorCode } from './types.js';

/**
 * 主 API Lambda 处理器 (API Gateway v2 compatible)
 */
export const handler: APIGatewayProxyHandler = async (event, context) => {
  const startTime = Date.now();
  
  // 兼容API Gateway v1和v2事件格式
  const path = event.path || (event as any).rawPath || '/';
  const method = event.httpMethod || (event as any).requestContext?.http?.method || 'GET';
  const headers = event.headers || {};
  const queryParams = event.queryStringParameters || (event as any).queryStringParameters || {};
  
  console.log('API request received', {
    requestId: context.awsRequestId,
    path: path,
    method: method,
    userAgent: headers['User-Agent'] || headers['user-agent'],
    sourceIp: event.requestContext?.identity?.sourceIp || (event as any).requestContext?.http?.sourceIp,
  });

  try {
    // 处理 CORS 预检请求
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
        body: '',
      };
    }

    // 只允许 GET 请求
    if (method !== 'GET') {
      console.warn('Method not allowed', { method: method });
      return createErrorResponse(405, ErrorCode.VALIDATION_ERROR, 'Method not allowed');
    }

    // 路由处理
    const pathSegments = path.split('/').filter(segment => segment.length > 0);

    // 创建适配的事件对象
    const adaptedEvent = {
      ...event,
      path: path,
      httpMethod: method,
      headers: headers,
      queryStringParameters: queryParams,
    };

    // 健康检查路由
    if (path === '/health' || path === '/v1/health') {
      return await handleHealth(adaptedEvent);
    }

    // API v1 路由
    if (pathSegments.length >= 2 && pathSegments[0] === 'v1') {
      const resource = pathSegments[1];
      
      if (resource === 'feed' && pathSegments.length >= 3) {
        const feedType = pathSegments[2];
        
        if (feedType === 'bigtech') {
          return await handleBigTech(adaptedEvent);
        } else {
          console.warn('Unknown feed type', { feedType });
          return createErrorResponse(404, ErrorCode.NOT_FOUND, `Feed type '${feedType}' not found`);
        }
      }
      
      if (resource === 'search') {
        return await handleSearch(adaptedEvent);
      }
      
      console.warn('Unknown API resource', { resource });
      return createErrorResponse(404, ErrorCode.NOT_FOUND, `Resource '${resource}' not found`);
    }

    // 未匹配的路径
    console.warn('Path not found', { path });
    return createErrorResponse(404, ErrorCode.NOT_FOUND, `Path '${path}' not found`);

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('Unhandled API error', {
      requestId: context.awsRequestId,
      path: event.path,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration,
    });

    return createErrorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error');
  } finally {
    const duration = Date.now() - startTime;
    console.log('API request completed', {
      requestId: context.awsRequestId,
      path: event.path,
      duration,
    });
  }
};

/**
 * 创建错误响应
 */
function createErrorResponse(statusCode: number, errorCode: ErrorCode, message: string) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
    body: JSON.stringify({
      success: false,
      error: {
        code: errorCode,
        message,
      },
    }),
  };
}