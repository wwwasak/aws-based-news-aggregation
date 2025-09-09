import {
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from './client.js';
import {
  type NewsArticle,
  type QueryParams,
  TABLE_NAMES,
  INDEX_NAMES,
  getCurrentTimestamp,
} from '@news-agg/shared';

export class NewsStore {
  private readonly tableName: string;

  constructor(tableName: string = TABLE_NAMES.NEWS_ARTICLES) {
    this.tableName = tableName;
  }

  /**
   * 保存单篇文章
   */
  async putArticle(article: NewsArticle): Promise<void> {
    const now = getCurrentTimestamp();
    const item = {
      ...article,
      createdAt: article.createdAt || now,
      updatedAt: now,
      // GSI 分区键
      tagTime: this.generateTagTimeKey(article.tags, article.publishedAt),
      sourceTime: `${article.source}#${article.publishedAt}`,
    };

    await dynamoClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );
  }

  /**
   * 批量保存文章
   */
  async putArticles(articles: NewsArticle[]): Promise<void> {
    if (articles.length === 0) return;

    const now = getCurrentTimestamp();
    const chunks = this.chunkArray(articles, 25); // DynamoDB 批量写入限制

    for (const chunk of chunks) {
      const putRequests = chunk.map(article => ({
        PutRequest: {
          Item: {
            ...article,
            createdAt: article.createdAt || now,
            updatedAt: now,
            tagTime: this.generateTagTimeKey(article.tags, article.publishedAt),
            sourceTime: `${article.source}#${article.publishedAt}`,
          },
        },
      }));

      await dynamoClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: putRequests,
          },
        })
      );
    }
  }

  /**
   * 根据 ID 获取文章
   */
  async getArticle(id: string): Promise<NewsArticle | null> {
    const result = await dynamoClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id },
      })
    );

    return result.Item as NewsArticle || null;
  }

  /**
   * 根据标签查询文章
   */
  async queryByTag(tag: string, params: QueryParams = {}): Promise<{
    items: NewsArticle[];
    nextToken?: string;
  }> {
    const { limit = 20, nextToken, startTime, endTime } = params;
    
    let keyConditionExpression = 'tagTime = :tagTime';
    const expressionAttributeValues: Record<string, any> = {
      ':tagTime': `${tag}#${startTime || '2020-01-01'}`,
    };

    // 如果有结束时间，使用 BETWEEN
    if (endTime) {
      keyConditionExpression = 'tagTime BETWEEN :startTagTime AND :endTagTime';
      expressionAttributeValues[':startTagTime'] = `${tag}#${startTime || '2020-01-01'}`;
      expressionAttributeValues[':endTagTime'] = `${tag}#${endTime}`;
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: INDEX_NAMES.BY_TAG_TIME,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: false, // 按时间降序
      Limit: limit,
      ExclusiveStartKey: nextToken ? JSON.parse(nextToken) : undefined,
    });

    const result = await dynamoClient.send(command);

    return {
      items: (result.Items as NewsArticle[]) || [],
      nextToken: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined,
    };
  }

  /**
   * 查询大科技公司相关文章
   */
  async queryBigTech(params: QueryParams = {}): Promise<{
    items: NewsArticle[];
    nextToken?: string;
  }> {
    const { limit = 20, nextToken, startTime, endTime } = params;
    
    // 使用 Scan 查找包含 bigtech 标签的文章
    let filterExpression = 'contains(tags, :bigtechTag)';
    const expressionAttributeValues: Record<string, any> = {
      ':bigtechTag': 'bigtech',
    };

    // 添加时间范围过滤
    if (startTime) {
      filterExpression += ' AND publishedAt >= :startTime';
      expressionAttributeValues[':startTime'] = startTime;
    }
    
    if (endTime) {
      filterExpression += ' AND publishedAt <= :endTime';
      expressionAttributeValues[':endTime'] = endTime;
    }

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: nextToken ? JSON.parse(nextToken) : undefined,
    });

    const result = await dynamoClient.send(command);

    // 按发布时间降序排序
    const items = (result.Items as NewsArticle[]) || [];
    items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return {
      items,
      nextToken: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined,
    };
  }

  /**
   * 搜索文章
   */
  async searchArticles(
    query: string,
    params: QueryParams = {}
  ): Promise<{
    items: NewsArticle[];
    nextToken?: string;
  }> {
    const { limit = 20, nextToken, startTime, endTime } = params;
    
    let filterExpression = '(contains(title, :query) OR contains(summary, :query))';
    const expressionAttributeValues: Record<string, any> = {
      ':query': query.toLowerCase(),
    };

    // 添加时间范围过滤
    if (startTime) {
      filterExpression += ' AND publishedAt >= :startTime';
      expressionAttributeValues[':startTime'] = startTime;
    }
    
    if (endTime) {
      filterExpression += ' AND publishedAt <= :endTime';
      expressionAttributeValues[':endTime'] = endTime;
    }

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: nextToken ? JSON.parse(nextToken) : undefined,
    });

    const result = await dynamoClient.send(command);

    // 按分数和发布时间排序
    const items = (result.Items as NewsArticle[]) || [];
    items.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score; // 分数降序
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(); // 时间降序
    });

    return {
      items,
      nextToken: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined,
    };
  }

  /**
   * 检查文章是否已存在
   */
  async articleExists(normalizedUrl: string): Promise<boolean> {
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'normalizedUrl = :url',
        ExpressionAttributeValues: {
          ':url': normalizedUrl,
        },
        Limit: 1,
        Select: 'COUNT',
      })
    );

    return (result.Count || 0) > 0;
  }

  /**
   * 生成标签时间复合键
   */
  private generateTagTimeKey(tags: string[], publishedAt: string): string {
    // 使用第一个标签或默认标签
    const primaryTag = tags.length > 0 ? tags[0] : 'general';
    return `${primaryTag}#${publishedAt}`;
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

