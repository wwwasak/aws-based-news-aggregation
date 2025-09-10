import { NotificationConfig } from './types.js';

/**
 * 获取通知配置
 */
export function getNotificationConfig(): NotificationConfig {
  return {
    // 大科技公司文章的最小分数阈值
    bigTechMinScore: parseInt(process.env.BIG_TECH_MIN_SCORE || '70', 10),
    
    // 政策相关标签 (触发高优先级通知)
    policyTags: [
      'antitrust',
      'doj',
      'ftc',
      'regulation',
      'policy',
      'lawsuit',
      'investigation',
      'monopoly',
      'competition',
      'privacy',
      'data-protection',
      'gdpr',
      'ccpa',
    ],
    
    // 高优先级关键词标签
    highPriorityTags: [
      'breaking',
      'urgent',
      'acquisition',
      'merger',
      'ipo',
      'earnings',
      'layoffs',
      'ceo',
      'security-breach',
      'data-leak',
    ],
    
    // 通知去重的时间窗口（小时）
    deduplicationWindow: parseInt(process.env.DEDUP_WINDOW_HOURS || '24', 10),
  };
}

/**
 * 获取环境变量配置
 */
export function getEnvironmentConfig() {
  return {
    snsTopicArn: process.env.SNS_TOPIC_ARN,
    articlesTableName: process.env.ARTICLES_TABLE_NAME || 'articles',
    notificationsTableName: process.env.NOTIFICATIONS_TABLE_NAME || 'notifications',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    environment: process.env.ENVIRONMENT || 'dev',
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}

/**
 * 验证必需的环境变量
 */
export function validateEnvironment(): void {
  const config = getEnvironmentConfig();
  
  const requiredVars = [
    { name: 'SNS_TOPIC_ARN', value: config.snsTopicArn },
    { name: 'ARTICLES_TABLE_NAME', value: config.articlesTableName },
  ];
  
  const missing = requiredVars.filter(({ value }) => !value);
  
  if (missing.length > 0) {
    const missingNames = missing.map(({ name }) => name).join(', ');
    throw new Error(`Missing required environment variables: ${missingNames}`);
  }
}



