import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * DynamoDB 客户端单例
 */
class DynamoDBClientSingleton {
  private static instance: DynamoDBDocumentClient;

  static getInstance(): DynamoDBDocumentClient {
    if (!DynamoDBClientSingleton.instance) {
      const client = new DynamoDBClient({
        region: process.env.AWS_REGION || 'us-east-1',
      });
      
      DynamoDBClientSingleton.instance = DynamoDBDocumentClient.from(client, {
        marshallOptions: {
          removeUndefinedValues: true,
          convertEmptyValues: false,
        },
        unmarshallOptions: {
          wrapNumbers: false,
        },
      });
    }
    
    return DynamoDBClientSingleton.instance;
  }
}

export const dynamoClient = DynamoDBClientSingleton.getInstance();

