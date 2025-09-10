import { DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { 
  ArticleNotification, 
  ParsedStreamRecord, 
  NotificationReason, 
  NotificationPriority,
  NotificationConfig 
} from './types.js';

/**
 * DynamoDB Streams 记录处理器
 */
export class StreamProcessor {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  /**
   * 解析 DynamoDB Stream 记录
   */
  parseStreamRecord(record: DynamoDBRecord): ParsedStreamRecord | null {
    try {
      const eventName = record.eventName;
      
      if (!eventName || !['INSERT', 'MODIFY'].includes(eventName)) {
        console.log(`Skipping event: ${eventName}`);
        return null;
      }

      const newImage = record.dynamodb?.NewImage;
      if (!newImage) {
        console.log('No NewImage found in stream record');
        return null;
      }

      // 解析 DynamoDB 格式的数据
      const parsedNewImage = unmarshall(newImage);
      
      // 验证这是一个文章记录
      if (!this.isArticleRecord(parsedNewImage)) {
        console.log('Skipping non-article record');
        return null;
      }

      const article = this.transformToArticleNotification(parsedNewImage);
      if (!article) {
        return null;
      }

      return {
        eventName,
        newImage: parsedNewImage,
        oldImage: record.dynamodb?.OldImage ? unmarshall(record.dynamodb.OldImage) : undefined,
        article,
      };

    } catch (error) {
      console.error('Failed to parse stream record:', error);
      return null;
    }
  }

  /**
   * 检查记录是否应该触发通知
   */
  shouldNotify(parsedRecord: ParsedStreamRecord): boolean {
    const { article } = parsedRecord;
    if (!article) {
      return false;
    }

    const reasons = this.getNotificationReasons(article);
    return reasons.length > 0;
  }

  /**
   * 获取通知原因
   */
  getNotificationReasons(article: ArticleNotification): NotificationReason[] {
    const reasons: NotificationReason[] = [];

    // 检查大科技公司高分文章
    if (article.isBigTech && article.score >= this.config.bigTechMinScore) {
      reasons.push(NotificationReason.BIG_TECH_HIGH_SCORE);
    }

    // 检查政策相关标签
    const hasPolicyTag = article.tags.some(tag => 
      this.config.policyTags.some(policyTag => 
        tag.toLowerCase().includes(policyTag.toLowerCase())
      )
    );
    if (hasPolicyTag) {
      reasons.push(NotificationReason.POLICY_TAG_MATCH);
    }

    // 检查高优先级标签
    const hasHighPriorityTag = article.tags.some(tag => 
      this.config.highPriorityTags.some(priorityTag => 
        tag.toLowerCase().includes(priorityTag.toLowerCase())
      )
    );
    if (hasHighPriorityTag) {
      reasons.push(NotificationReason.HIGH_PRIORITY_TAG);
    }

    // 检查突发新闻 (基于分数和标签)
    if (article.score >= 90 || article.tags.some(tag => 
      ['breaking', 'urgent', 'alert'].includes(tag.toLowerCase())
    )) {
      reasons.push(NotificationReason.BREAKING_NEWS);
    }

    return reasons;
  }

  /**
   * 确定通知优先级
   */
  determineNotificationPriority(reasons: NotificationReason[], score: number): NotificationPriority {
    // 突发新闻 = 紧急
    if (reasons.includes(NotificationReason.BREAKING_NEWS)) {
      return NotificationPriority.URGENT;
    }

    // 政策相关 = 高优先级
    if (reasons.includes(NotificationReason.POLICY_TAG_MATCH)) {
      return NotificationPriority.HIGH;
    }

    // 高分大科技文章 = 高优先级
    if (reasons.includes(NotificationReason.BIG_TECH_HIGH_SCORE) && score >= 85) {
      return NotificationPriority.HIGH;
    }

    // 高优先级标签 = 正常优先级
    if (reasons.includes(NotificationReason.HIGH_PRIORITY_TAG)) {
      return NotificationPriority.NORMAL;
    }

    // 其他大科技文章 = 正常优先级
    if (reasons.includes(NotificationReason.BIG_TECH_HIGH_SCORE)) {
      return NotificationPriority.NORMAL;
    }

    return NotificationPriority.LOW;
  }

  /**
   * 检查是否为文章记录
   */
  private isArticleRecord(record: any): boolean {
    // 检查必需字段
    const requiredFields = ['url', 'urlHash', 'title', 'source', 'publishedAt'];
    return requiredFields.every(field => record[field] !== undefined);
  }

  /**
   * 转换为文章通知格式
   */
  private transformToArticleNotification(record: any): ArticleNotification | null {
    try {
      const reasons = this.getNotificationReasons({
        id: record.urlHash,
        title: record.title,
        source: record.source,
        domain: record.domain,
        url: record.url,
        summary: record.summary || '',
        publishedAt: record.publishedAt,
        tags: record.tags || [],
        score: record.score || 0,
        isBigTech: record.isBigTech || false,
        isPolicy: record.isPolicy || false,
        notificationReason: [],
        priority: NotificationPriority.LOW,
      });

      if (reasons.length === 0) {
        return null;
      }

      const priority = this.determineNotificationPriority(reasons, record.score || 0);

      return {
        id: record.urlHash,
        title: record.title,
        source: record.source,
        domain: record.domain || this.extractDomain(record.url),
        url: record.url,
        summary: record.summary || '',
        publishedAt: record.publishedAt,
        tags: record.tags || [],
        score: record.score || 0,
        isBigTech: record.isBigTech || false,
        isPolicy: record.isPolicy || false,
        notificationReason: reasons,
        priority,
      };

    } catch (error) {
      console.error('Failed to transform article notification:', error);
      return null;
    }
  }

  /**
   * 从 URL 提取域名
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * 批量处理流记录
   */
  processBatchRecords(records: DynamoDBRecord[]): {
    validRecords: ParsedStreamRecord[];
    notifiableRecords: ParsedStreamRecord[];
    totalRecords: number;
  } {
    console.log(`Processing batch of ${records.length} stream records`);

    const validRecords: ParsedStreamRecord[] = [];
    const notifiableRecords: ParsedStreamRecord[] = [];

    for (const record of records) {
      const parsed = this.parseStreamRecord(record);
      if (!parsed) {
        continue;
      }

      validRecords.push(parsed);

      if (this.shouldNotify(parsed)) {
        notifiableRecords.push(parsed);
      }
    }

    console.log(`Processed ${validRecords.length} valid records, ${notifiableRecords.length} require notification`);

    return {
      validRecords,
      notifiableRecords,
      totalRecords: records.length,
    };
  }
}









