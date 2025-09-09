import { Construct } from 'constructs';
import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { HttpApi, HttpMethod, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface ApiStackProps extends StackProps {
  apiFunction: NodejsFunction;
}

export class ApiStack extends Stack {
  public readonly httpApi: HttpApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { apiFunction } = props;

    // 创建 Lambda 集成
    const lambdaIntegration = new HttpLambdaIntegration('ApiIntegration', apiFunction);

    // 创建 HTTP API Gateway
    this.httpApi = new HttpApi(this, 'NewsHttpApi', {
      apiName: 'news-agg-api',
      description: 'News Aggregation HTTP API Gateway',
      
      // CORS 配置
      corsPreflight: {
        allowOrigins: ['*'], // 生产环境应限制为特定域名
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.OPTIONS],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'Accept',
        ],
        maxAge: Duration.seconds(300),
      },
    });

    // 添加路由
    
    // 健康检查路由
    this.httpApi.addRoutes({
      path: '/health',
      methods: [HttpMethod.GET],
      integration: lambdaIntegration,
    });

    // 大科技公司新闻推送路由
    this.httpApi.addRoutes({
      path: '/v1/feed/bigtech',
      methods: [HttpMethod.GET],
      integration: lambdaIntegration,
    });

    // 搜索路由
    this.httpApi.addRoutes({
      path: '/v1/search',
      methods: [HttpMethod.GET],
      integration: lambdaIntegration,
    });

    // 输出 API Gateway URL
    new CfnOutput(this, 'ApiGatewayUrl', {
      value: this.httpApi.apiEndpoint,
      description: 'HTTP API Gateway endpoint URL',
      exportName: 'NewsApiGatewayUrl',
    });

    // 输出 API ID
    new CfnOutput(this, 'ApiGatewayId', {
      value: this.httpApi.httpApiId,
      description: 'HTTP API Gateway ID',
      exportName: 'NewsApiGatewayId',
    });
  }
}