import { Construct } from 'constructs';
import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime, Architecture, Tracing } from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { join } from 'path';

export interface LambdaStackProps extends StackProps {
  articlesTable: Table;
  notificationsTable: Table;
  notificationTopic: Topic;
  sourcesBucket?: Bucket;
}

export class LambdaStack extends Stack {
  public readonly fetcherFunction: NodejsFunction;
  public readonly apiFunction: NodejsFunction;
  public readonly notifierFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const { articlesTable, notificationsTable, notificationTopic, sourcesBucket } = props;

    // 通用 Lambda 配置
    const commonLambdaProps: Partial<NodejsFunctionProps> = {
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.minutes(5),
      memorySize: 512,
      tracing: Tracing.ACTIVE,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
        format: 'esm',
        mainFields: ['module', 'main'],
        banner: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
      },
    };

    // 新闻抓取函数
    this.fetcherFunction = new NodejsFunction(this, 'FetcherFunction', {
      ...commonLambdaProps,
      functionName: 'news-agg-fetcher',
      description: 'Fetches and processes news articles from configured sources',
      entry: join(__dirname, '../../../apps/fetcher/src/index.ts'),
      timeout: Duration.minutes(15),
      memorySize: 1024,
      environment: {
        ...commonLambdaProps.environment,
        ARTICLES_TABLE_NAME: articlesTable.tableName,
        SOURCES_BUCKET: sourcesBucket?.bucketName || '',
        SOURCES_PATH: 'configs/sources.yaml',
      },
    });

    // API 函数
    this.apiFunction = new NodejsFunction(this, 'ApiFunction', {
      ...commonLambdaProps,
      functionName: 'news-agg-api',
      description: 'REST API for news articles access',
      entry: join(__dirname, '../../../apps/api/src/index.ts'),
      timeout: Duration.seconds(30),
      environment: {
        ...commonLambdaProps.environment,
        ARTICLES_TABLE_NAME: articlesTable.tableName,
      },
    });

    // 通知函数
    this.notifierFunction = new NodejsFunction(this, 'NotifierFunction', {
      ...commonLambdaProps,
      functionName: 'news-agg-notifier',
      description: 'Sends notifications for high-score articles via SNS',
      entry: join(__dirname, '../../../apps/notifier/src/index.ts'),
      timeout: Duration.minutes(2),
      environment: {
        ...commonLambdaProps.environment,
        SNS_TOPIC_ARN: notificationTopic.topicArn,
        ARTICLES_TABLE_NAME: articlesTable.tableName,
        NOTIFICATIONS_TABLE_NAME: notificationsTable.tableName,
        BIG_TECH_MIN_SCORE: '70',
        DEDUP_WINDOW_HOURS: '24',
      },
    });

    // 配置 DynamoDB Stream 触发器
    this.notifierFunction.addEventSource(
      new DynamoEventSource(articlesTable, {
        startingPosition: 'LATEST',
        batchSize: 10,
        maxBatchingWindow: Duration.seconds(5),
        retryAttempts: 3,
        reportBatchItemFailures: true,
      })
    );

    // 配置 IAM 权限
    this.setupPermissions(articlesTable, notificationsTable, notificationTopic, sourcesBucket);

    // 配置 CloudWatch 日志组
    this.setupLogGroups();
  }

  /**
   * 配置最小 IAM 权限
   */
  private setupPermissions(
    articlesTable: Table,
    notificationsTable: Table,
    notificationTopic: Topic,
    sourcesBucket?: Bucket
  ): void {
    // Fetcher 权限: DynamoDB 读写
    const fetcherDynamoPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:PutItem',
        'dynamodb:BatchWriteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [
        articlesTable.tableArn,
        `${articlesTable.tableArn}/index/*`,
      ],
    });

    // API 权限: DynamoDB 只读
    const apiDynamoPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [
        articlesTable.tableArn,
        `${articlesTable.tableArn}/index/*`,
      ],
    });

    // Notifier 权限: SNS 发布
    const notifierSnsPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['sns:Publish'],
      resources: [notificationTopic.topicArn],
    });

    // Notifier 权限: DynamoDB Streams
    const notifierStreamsPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:DescribeStream',
        'dynamodb:GetRecords',
        'dynamodb:GetShardIterator',
        'dynamodb:ListStreams',
      ],
      resources: [`${articlesTable.tableArn}/stream/*`],
    });

    // Notifier 权限: 通知表读写
    const notifierNotificationTablePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:Query',
      ],
      resources: [
        notificationsTable.tableArn,
        `${notificationsTable.tableArn}/index/*`,
      ],
    });

    // Sources bucket 权限 (如果提供)
    if (sourcesBucket) {
      const s3Policy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: [`${sourcesBucket.bucketArn}/*`],
      });
      this.fetcherFunction.addToRolePolicy(s3Policy);
    }

    // 应用权限
    this.fetcherFunction.addToRolePolicy(fetcherDynamoPolicy);
    this.apiFunction.addToRolePolicy(apiDynamoPolicy);
    this.notifierFunction.addToRolePolicy(notifierSnsPolicy);
    this.notifierFunction.addToRolePolicy(notifierStreamsPolicy);
    this.notifierFunction.addToRolePolicy(notifierNotificationTablePolicy);
  }

  /**
   * 配置 CloudWatch 日志组
   */
  private setupLogGroups(): void {
    // Fetcher 日志组
    new LogGroup(this, 'FetcherLogGroup', {
      logGroupName: `/aws/lambda/${this.fetcherFunction.functionName}`,
      retention: RetentionDays.ONE_WEEK,
    });

    // API 日志组
    new LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/lambda/${this.apiFunction.functionName}`,
      retention: RetentionDays.ONE_WEEK,
    });

    // Notifier 日志组
    new LogGroup(this, 'NotifierLogGroup', {
      logGroupName: `/aws/lambda/${this.notifierFunction.functionName}`,
      retention: RetentionDays.ONE_WEEK,
    });
  }
}