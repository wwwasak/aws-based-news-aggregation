import type { DynamoDBStreamHandler } from 'aws-lambda';
import { StreamProcessor } from './stream-processor.js';
import { SNSService, DeduplicationService } from './services/index.js';
import { getNotificationConfig, validateEnvironment } from './config.js';
import { ProcessingStats } from './types.js';

/**
 * DynamoDB Streams 处理器 - 文章通知 Lambda
 */
export const handler: DynamoDBStreamHandler = async (event, context) => {
  const startTime = Date.now();
  
  console.log('DynamoDB Stream event received', {
    requestId: context.awsRequestId,
    recordCount: event.Records.length,
  });

  // 验证环境变量
  try {
    validateEnvironment();
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw error;
  }

  // 初始化服务
  const config = getNotificationConfig();
  const streamProcessor = new StreamProcessor(config);
  const snsService = new SNSService();
  const deduplicationService = new DeduplicationService();

  const stats: ProcessingStats = {
    totalRecords: event.Records.length,
    processed: 0,
    skipped: 0,
    notified: 0,
    failed: 0,
    duplicates: 0,
  };

  try {
    // 批量处理流记录
    const { validRecords, notifiableRecords } = streamProcessor.processBatchRecords(event.Records);
    
    stats.processed = validRecords.length;
    stats.skipped = event.Records.length - validRecords.length;

    if (notifiableRecords.length === 0) {
      console.log('No records require notification');
      logProcessingStats(stats, Date.now() - startTime);
      return;
    }

    console.log(`Processing ${notifiableRecords.length} notification-worthy records`);

    // 处理每个需要通知的记录
    for (const record of notifiableRecords) {
      if (!record.article) {
        stats.skipped++;
        continue;
      }

      try {
        // 检查去重
        const hasBeenNotified = await deduplicationService.hasBeenNotified(record.article.id);
        if (hasBeenNotified) {
          console.log(`Skipping duplicate notification for article: ${record.article.title}`);
          stats.duplicates++;
          continue;
        }

        // 发送通知
        console.log(`Sending notification for article: ${record.article.title} (score: ${record.article.score}, reasons: ${record.article.notificationReason.join(', ')})`);
        
        const result = await snsService.retryNotification(record.article, 2); // 最多重试2次
        
        // 记录发送结果
        await deduplicationService.recordNotification(
          record.article.id,
          result.messageId || '',
          result.success,
          result.error
        );

        if (result.success) {
          stats.notified++;
          console.log(`Notification sent successfully for article: ${record.article.title}`);
        } else {
          stats.failed++;
          console.error(`Notification failed for article: ${record.article.title}`, result.error);
        }

      } catch (error) {
        stats.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error processing notification for article: ${record.article?.title}`, errorMessage);
        
        // 记录失败
        if (record.article) {
          await deduplicationService.recordNotification(
            record.article.id,
            '',
            false,
            errorMessage
          ).catch(recordError => {
            console.error('Failed to record notification failure:', recordError);
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    logProcessingStats(stats, duration);

    // 如果有太多失败，可以考虑抛出错误让 Lambda 重试
    const failureRate = stats.failed / (stats.notified + stats.failed);
    if (stats.failed > 0 && failureRate > 0.5) {
      console.warn(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('Unhandled error in stream processor', {
      requestId: context.awsRequestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      stats,
    });

    throw error; // 重新抛出错误让 Lambda 重试
  }
};

/**
 * 记录处理统计信息
 */
function logProcessingStats(stats: ProcessingStats, duration: number): void {
  console.log('Processing completed', {
    stats,
    duration,
    successRate: stats.notified + stats.failed > 0 
      ? `${((stats.notified / (stats.notified + stats.failed)) * 100).toFixed(1)}%`
      : 'N/A',
  });

  // 记录关键指标到 CloudWatch Logs (可以被监控系统解析)
  console.log('METRICS', {
    totalRecords: stats.totalRecords,
    processed: stats.processed,
    notified: stats.notified,
    failed: stats.failed,
    duplicates: stats.duplicates,
    duration,
  });
}