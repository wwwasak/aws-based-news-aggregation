import { Construct } from 'constructs';
import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Rule, Schedule, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface SchedulerStackProps extends StackProps {
  fetcherFunction: NodejsFunction;
}

export class SchedulerStack extends Stack {
  public readonly fetcherScheduleRule: Rule;

  constructor(scope: Construct, id: string, props: SchedulerStackProps) {
    super(scope, id, props);

    const { fetcherFunction } = props;

    // 创建定时调度规则 - 每 10 分钟触发一次
    this.fetcherScheduleRule = new Rule(this, 'FetcherScheduleRule', {
      ruleName: 'news-agg-fetcher-schedule',
      description: 'Triggers news fetcher Lambda function every 10 minutes',
      schedule: Schedule.rate(Duration.minutes(10)),
      enabled: true,
    });

    // 添加 Lambda 目标
    this.fetcherScheduleRule.addTarget(
      new LambdaFunction(fetcherFunction, {
        event: RuleTargetInput.fromObject({
          'detail-type': 'Scheduled Event',
          detail: {
            scheduledTime: new Date().toISOString(),
            triggerSource: 'eventbridge-scheduler',
          },
        }),
      })
    );

    // 创建手动触发规则（用于测试和调试）
    const manualTriggerRule = new Rule(this, 'FetcherManualTriggerRule', {
      ruleName: 'news-agg-fetcher-manual',
      description: 'Manual trigger rule for news fetcher (testing/debugging)',
      enabled: false, // 默认禁用，需要手动启用
    });

    // 手动触发目标
    manualTriggerRule.addTarget(
      new LambdaFunction(fetcherFunction, {
        event: RuleTargetInput.fromObject({
          'detail-type': 'Manual Trigger',
          detail: {
            triggerSource: 'manual',
            forceRefresh: true,
          },
        }),
      })
    );
  }
}