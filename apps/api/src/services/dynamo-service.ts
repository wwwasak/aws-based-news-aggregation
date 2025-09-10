import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoArticleItem, ArticleResponse } from '../types.js';
import { CursorUtils } from '../utils/index.js';

/**
 * DynamoDB 服务类
 */
export class DynamoService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });

    this.tableName = process.env.ARTICLES_TABLE_NAME || 'articles';
  }

  /**
   * 查询 BigTech 相关文章
   */
  async queryBigTechArticles(limit: number = 20, cursor?: string): Promise<{
    items: ArticleResponse[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    try {
      console.log(`Querying BigTech articles (limit: ${limit}, cursor: ${cursor ? 'provided' : 'none'})`);

      // 方案1: 使用 GSI1 查询 tag#bigtech
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :tagPK',
        ExpressionAttributeValues: {
          ':tagPK': 'tag#bigtech',
        },
        ScanIndexForward: false, // 按时间倒序
        Limit: limit,
        ExclusiveStartKey: CursorUtils.toExclusiveStartKey(cursor),
      });

      const result = await this.client.send(command);
      const items = (result.Items as DynamoArticleItem[]) || [];

      console.log(`Found ${items.length} BigTech articles`);

      return {
        items: items.map(this.transformToResponse),
        nextCursor: CursorUtils.fromLastEvaluatedKey(result.LastEvaluatedKey),
        hasMore: !!result.LastEvaluatedKey,
      };
    } catch (error) {
      console.error('Failed to query BigTech articles:', error);
      throw new Error('Database query failed');
    }
  }

  /**
   * 搜索文章（使用全表扫描 + 过滤）
   */
  async searchArticles(
    query: string,
    limit: number = 20,
    cursor?: string,
    timeout: number = 25000 // 25秒超时保护
  ): Promise<{
    items: DynamoArticleItem[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    try {
      console.log(`Searching articles (query: "${query}", limit: ${limit}, cursor: ${cursor ? 'provided' : 'none'})`);

      // 设置超时保护
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Search timeout')), timeout);
      });

      const searchPromise = this.performSearch(query, limit, cursor);
      
      const result = await Promise.race([searchPromise, timeoutPromise]);
      
      console.log(`Search completed, found ${result.items.length} articles`);
      return result;
    } catch (error) {
      console.error('Failed to search articles:', error);
      if (error instanceof Error && error.message === 'Search timeout') {
        throw new Error('Search request timed out');
      }
      throw new Error('Search failed');
    }
  }

  /**
   * 执行实际的搜索操作
   */
  private async performSearch(
    query: string,
    limit: number,
    cursor?: string
  ): Promise<{
    items: DynamoArticleItem[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    
    if (searchTerms.length === 0) {
      return { items: [], hasMore: false };
    }

    // 构建过滤表达式
    let filterExpression = '';
    const expressionAttributeValues: Record<string, any> = {};

    // 为每个搜索词创建条件
    searchTerms.forEach((term, index) => {
      const titleKey = `:term${index}_title`;
      const summaryKey = `:term${index}_summary`;
      
      if (index > 0) {
        filterExpression += ' AND ';
      }
      
      filterExpression += `(contains(title, ${titleKey}) OR contains(summary, ${summaryKey}))`;
      expressionAttributeValues[titleKey] = term;
      expressionAttributeValues[summaryKey] = term;
    });

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit * 2, // 扫描更多项以提高匹配概率
      ExclusiveStartKey: CursorUtils.toExclusiveStartKey(cursor),
    });

    const result = await this.client.send(command);
    const items = (result.Items as DynamoArticleItem[]) || [];

    // 限制返回数量
    const limitedItems = items.slice(0, limit);

    return {
      items: limitedItems,
      nextCursor: CursorUtils.fromLastEvaluatedKey(result.LastEvaluatedKey),
      hasMore: !!result.LastEvaluatedKey || items.length > limit,
    };
  }

  /**
   * 将 DynamoDB 项转换为 API 响应格式
   */
  private transformToResponse(item: DynamoArticleItem): ArticleResponse {
    return {
      id: item.urlHash,
      title: item.title,
      source: item.source,
      domain: item.domain,
      url: item.url,
      summary: item.summary,
      publishedAt: item.publishedAt,
      tags: item.tags || [],
      score: item.score || 0,
    };
  }
}







