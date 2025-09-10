import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { ArticleNotification, SNSMessagePayload, NotificationResult } from '../types.js';
import { getEnvironmentConfig } from '../config.js';

/**
 * SNS 通知服务
 */
export class SNSService {
  private client: SNSClient;
  private topicArn: string;

  constructor() {
    this.client = new SNSClient({
      region: getEnvironmentConfig().awsRegion,
    });
    
    this.topicArn = getEnvironmentConfig().snsTopicArn!;
  }

  /**
   * 发送文章通知到 SNS Topic
   */
  async sendNotification(
    article: ArticleNotification,
    retryCount: number = 0
  ): Promise<NotificationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Sending notification for article: ${article.title} (score: ${article.score})`);

      // 构建 SNS 消息负载
      const messagePayload: SNSMessagePayload = {
        type: 'article_notification',
        article,
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      // 构建消息属性
      const messageAttributes = {
        notificationType: {
          DataType: 'String',
          StringValue: 'article_notification',
        },
        priority: {
          DataType: 'String',
          StringValue: article.priority,
        },
        source: {
          DataType: 'String',
          StringValue: article.source,
        },
        score: {
          DataType: 'Number',
          StringValue: article.score.toString(),
        },
        isBigTech: {
          DataType: 'String',
          StringValue: article.isBigTech.toString(),
        },
        isPolicy: {
          DataType: 'String',
          StringValue: article.isPolicy.toString(),
        },
      };

      // 添加标签属性
      if (article.tags && article.tags.length > 0) {
        messageAttributes.tags = {
          DataType: 'String',
          StringValue: article.tags.slice(0, 5).join(','), // 限制标签数量
        };
      }

      // 添加通知原因属性
      if (article.notificationReason && article.notificationReason.length > 0) {
        messageAttributes.reasons = {
          DataType: 'String',
          StringValue: article.notificationReason.join(','),
        };
      }

      // 构建消息主题和内容
      const subject = this.buildMessageSubject(article);
      const message = JSON.stringify(messagePayload, null, 2);

      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Subject: subject,
        Message: message,
        MessageAttributes: messageAttributes,
      });

      const result = await this.client.send(command);
      const duration = Date.now() - startTime;

      console.log(`Notification sent successfully`, {
        messageId: result.MessageId,
        article: article.title,
        duration,
        retryCount,
      });

      return {
        success: true,
        messageId: result.MessageId,
        retryCount,
        sentAt: new Date().toISOString(),
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`Failed to send notification`, {
        article: article.title,
        error: errorMessage,
        duration,
        retryCount,
      });

      return {
        success: false,
        error: errorMessage,
        retryCount,
        sentAt: new Date().toISOString(),
      };
    }
  }

  /**
   * 批量发送通知
   */
  async sendBatchNotifications(
    articles: ArticleNotification[]
  ): Promise<NotificationResult[]> {
    console.log(`Sending batch notifications for ${articles.length} articles`);

    const results: NotificationResult[] = [];
    
    // 并发发送通知，但限制并发数
    const maxConcurrency = 5;
    const chunks = this.chunkArray(articles, maxConcurrency);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(article => 
        this.sendNotification(article)
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Batch notification completed: ${successful} successful, ${failed} failed`);
    
    return results;
  }

  /**
   * 构建消息主题
   */
  private buildMessageSubject(article: ArticleNotification): string {
    const priority = article.priority.toUpperCase();
    const source = article.source;
    
    // 根据通知原因构建主题
    if (article.notificationReason.includes('POLICY_TAG_MATCH')) {
      return `[${priority}] Policy News: ${source}`;
    }
    
    if (article.notificationReason.includes('BIG_TECH_HIGH_SCORE')) {
      return `[${priority}] BigTech Alert: ${source}`;
    }
    
    if (article.notificationReason.includes('BREAKING_NEWS')) {
      return `[${priority}] Breaking: ${source}`;
    }
    
    return `[${priority}] Tech News: ${source}`;
  }

  /**
   * 数组分块工具
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 重试发送通知
   */
  async retryNotification(
    article: ArticleNotification,
    maxRetries: number = 3
  ): Promise<NotificationResult> {
    let lastResult: NotificationResult = {
      success: false,
      error: 'No attempts made',
      retryCount: 0,
      sentAt: new Date().toISOString(),
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      lastResult = await this.sendNotification(article, attempt);
      
      if (lastResult.success) {
        return lastResult;
      }
      
      // 指数退避
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // 最大10秒
        console.log(`Retrying notification in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await this.sleep(delay);
      }
    }

    console.error(`All retry attempts failed for article: ${article.title}`);
    return lastResult;
  }

  /**
   * 休眠工具
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}



