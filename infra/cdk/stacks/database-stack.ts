import { Construct } from 'constructs';
import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import {
  Table,
  AttributeType,
  BillingMode,
  StreamViewType,
  ProjectionType,
} from 'aws-cdk-lib/aws-dynamodb';

export class DatabaseStack extends Stack {
  public readonly articlesTable: Table;
  public readonly notificationsTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 新闻文章表
    this.articlesTable = new Table(this, 'ArticlesTable', {
      tableName: 'articles',
      
      // 主键设计
      partitionKey: {
        name: 'pk',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: AttributeType.STRING,
      },
      
      // 按需计费模式
      billingMode: BillingMode.PAY_PER_REQUEST,
      
      // 开启 DynamoDB Streams (NEW_AND_OLD_IMAGES) - 用于 Notifier
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      
      // TTL 自动清理 - 7天后自动删除文章（成本优化）
      timeToLiveAttribute: 'ttl',
      
      // 启用时间点恢复
      pointInTimeRecovery: true,
      
      // 删除策略 (生产环境应使用 RETAIN)
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // 添加全局二级索引
    // GSI1: 按标签查询
    this.articlesTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'GSI1PK',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI1SK',
        type: AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });

    // GSI2: 按来源查询
    this.articlesTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: {
        name: 'GSI2PK',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI2SK',
        type: AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });

    // 输出表名
    new CfnOutput(this, 'ArticlesTableName', {
      value: this.articlesTable.tableName,
      description: 'DynamoDB Articles Table Name',
      exportName: 'ArticlesTableName',
    });

    // 输出表 ARN
    new CfnOutput(this, 'ArticlesTableArn', {
      value: this.articlesTable.tableArn,
      description: 'DynamoDB Articles Table ARN',
      exportName: 'ArticlesTableArn',
    });

    // 输出 Stream ARN
    new CfnOutput(this, 'ArticlesTableStreamArn', {
      value: this.articlesTable.tableStreamArn!,
      description: 'DynamoDB Articles Table Stream ARN',
      exportName: 'ArticlesTableStreamArn',
    });

    // 通知表 - 用于通知去重和历史记录
    this.notificationsTable = new Table(this, 'NotificationsTable', {
      tableName: 'notifications',
      
      // 主键设计
      partitionKey: {
        name: 'pk',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: AttributeType.STRING,
      },
      
      // 按需计费模式
      billingMode: BillingMode.PAY_PER_REQUEST,
      
      // TTL 自动清理旧记录 (30天)
      timeToLiveAttribute: 'ttl',
      
      // 删除策略 (生产环境应使用 RETAIN)
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // 添加全局二级索引
    // GSI1: 按状态查询通知历史
    this.notificationsTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'GSI1PK',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI1SK',
        type: AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });

    // 输出通知表名
    new CfnOutput(this, 'NotificationsTableName', {
      value: this.notificationsTable.tableName,
      description: 'DynamoDB Notifications Table Name',
      exportName: 'NotificationsTableName',
    });

    // 输出通知表 ARN
    new CfnOutput(this, 'NotificationsTableArn', {
      value: this.notificationsTable.tableArn,
      description: 'DynamoDB Notifications Table ARN',
      exportName: 'NotificationsTableArn',
    });
  }
}