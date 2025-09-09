import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '../types.js';

/**
 * 健康检查处理器
 */
export async function handleHealth(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Health check requested', { path: event.path });

  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'news-aggregation-api',
      path: event.path,
    },
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify(response),
  };
}

