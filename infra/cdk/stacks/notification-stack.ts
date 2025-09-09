import { Construct } from 'constructs';
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

export interface NotificationStackProps extends StackProps {
  notificationEmail?: string;
}

export class NotificationStack extends Stack {
  public readonly notificationTopic: Topic;

  constructor(scope: Construct, id: string, props: NotificationStackProps = {}) {
    super(scope, id, props);

    // 创建 SNS 主题（占位，未来接 APNs/FCM）
    this.notificationTopic = new Topic(this, 'NotificationTopic', {
      topicName: 'news-agg-notifications',
      displayName: 'News Aggregation Notifications',
      description: 'SNS topic for news notifications - placeholder for future APNs/FCM integration',
    });

    // 如果提供了邮箱地址，添加邮件订阅（用于测试）
    if (props.notificationEmail) {
      this.notificationTopic.addSubscription(
        new EmailSubscription(props.notificationEmail)
      );
    }

    // 输出 SNS 主题 ARN
    new CfnOutput(this, 'NotificationTopicArn', {
      value: this.notificationTopic.topicArn,
      description: 'SNS notification topic ARN (placeholder for APNs/FCM)',
      exportName: 'NotificationTopicArn',
    });

    // 输出 SNS 主题名称
    new CfnOutput(this, 'NotificationTopicName', {
      value: this.notificationTopic.topicName,
      description: 'SNS notification topic name',
      exportName: 'NotificationTopicName',
    });
  }
}