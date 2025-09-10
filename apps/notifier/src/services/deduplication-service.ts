import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { getEnvironmentConfig } from '../config.js';

/**
 * 通知去重服务
 */
export class DeduplicationService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: getEnvironmentConfig().awsRegion,
    });

    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
      },
    });

    this.tableName = getEnvironmentConfig().notificationsTableName;
  }

  /**
   * 检查是否已经发送过通知
   */
  async hasBeenNotified(urlHash: string): Promise<boolean> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          pk: `notification#${urlHash}`,
          sk: 'latest',
        },
      });

      const result = await this.client.send(command);
      
      if (!result.Item) {
        return false;
      }

      // 检查通知是否在去重窗口内
      const notificationTime = new Date(result.Item.sentAt);
      const windowHours = 24; // 24小时去重窗口
      const windowMs = windowHours * 60 * 60 * 1000;
      const now = new Date();

      const isWithinWindow = (now.getTime() - notificationTime.getTime()) < windowMs;
      
      if (isWithinWindow) {
        console.log(`Notification already sent for urlHash ${urlHash} within ${windowHours}h window`);
        return true;
      }

      console.log(`Previous notification for urlHash ${urlHash} is outside window, allowing new notification`);
      return false;

    } catch (error) {
      console.error('Failed to check notification deduplication:', error);
      // 在错误情况下，允许发送通知以避免丢失重要消息
      return false;
    }
  }

  /**
   * 记录通知发送
   */
  async recordNotification(
    urlHash: string,
    messageId: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const item = {
        pk: `notification#${urlHash}`,
        sk: 'latest',
        GSI1PK: `status#${success ? 'success' : 'failed'}`,
        GSI1SK: now,
        urlHash,
        messageId: success ? messageId : undefined,
        success,
        error,
        sentAt: now,
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30天TTL
      };

      const command = new PutCommand({
        TableName: this.tableName,
        Item: item,
      });

      await this.client.send(command);
      
      console.log(`Recorded notification for urlHash ${urlHash}: ${success ? 'success' : 'failed'}`);

    } catch (error) {
      console.error('Failed to record notification:', error);
      // 记录失败不应该阻止主流程
    }
  }

  /**
   * 获取通知历史统计
   */
  async getNotificationStats(hours: number = 24): Promise<{
    total: number;
    successful: number;
    failed: number;
  }> {
    try {
      // 这里可以实现更复杂的统计查询
      // 暂时返回基础统计
      return {
        total: 0,
        successful: 0,
        failed: 0,
      };
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
      };
    }
  }
}



