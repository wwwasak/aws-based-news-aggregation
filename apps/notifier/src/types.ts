/**
 * Notifier 类型定义
 */

import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';

/**
 * 通知配置
 */
export interface NotificationConfig {
  /** 大科技公司文章的最小分数阈值 */
  bigTechMinScore: number;
  /** 政策相关标签触发通知 */
  policyTags: string[];
  /** 高优先级关键词标签 */
  highPriorityTags: string[];
  /** 通知去重的时间窗口（小时） */
  deduplicationWindow: number;
}

/**
 * 文章通知数据
 */
export interface ArticleNotification {
  /** 文章唯一标识 */
  id: string;
  /** 文章标题 */
  title: string;
  /** 来源 */
  source: string;
  /** 域名 */
  domain: string;
  /** 文章链接 */
  url: string;
  /** 摘要 */
  summary: string;
  /** 发布时间 */
  publishedAt: string;
  /** 标签列表 */
  tags: string[];
  /** 文章分数 */
  score: number;
  /** 是否为大科技公司相关 */
  isBigTech: boolean;
  /** 是否为政策相关 */
  isPolicy: boolean;
  /** 通知原因 */
  notificationReason: NotificationReason[];
  /** 通知优先级 */
  priority: NotificationPriority;
}

/**
 * 通知原因
 */
export enum NotificationReason {
  BIG_TECH_HIGH_SCORE = 'BIG_TECH_HIGH_SCORE',
  POLICY_TAG_MATCH = 'POLICY_TAG_MATCH',
  HIGH_PRIORITY_TAG = 'HIGH_PRIORITY_TAG',
  BREAKING_NEWS = 'BREAKING_NEWS',
}

/**
 * 通知优先级
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * SNS 消息负载
 */
export interface SNSMessagePayload {
  /** 消息类型 */
  type: 'article_notification';
  /** 文章通知数据 */
  article: ArticleNotification;
  /** 消息时间戳 */
  timestamp: string;
  /** 消息版本 */
  version: string;
}

/**
 * 通知发送结果
 */
export interface NotificationResult {
  /** 是否成功 */
  success: boolean;
  /** 消息ID */
  messageId?: string;
  /** 错误信息 */
  error?: string;
  /** 重试次数 */
  retryCount: number;
  /** 发送时间戳 */
  sentAt: string;
}

/**
 * DynamoDB 流记录解析结果
 */
export interface ParsedStreamRecord {
  /** 事件类型 */
  eventName: string;
  /** 新图像 */
  newImage?: Record<string, any>;
  /** 旧图像 */
  oldImage?: Record<string, any>;
  /** 文章数据 */
  article?: ArticleNotification;
}

/**
 * 处理统计
 */
export interface ProcessingStats {
  /** 总记录数 */
  totalRecords: number;
  /** 处理成功数 */
  processed: number;
  /** 跳过数 */
  skipped: number;
  /** 通知发送数 */
  notified: number;
  /** 失败数 */
  failed: number;
  /** 去重数 */
  duplicates: number;
}


