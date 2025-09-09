import type { Handler } from 'aws-lambda';

/**
 * 简化的测试处理器
 */
export const handler: Handler = async (event, context) => {
  console.log('🚀 Simple test handler called!');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // 测试基本功能
    console.log('✅ Basic logging works');
    
    // 测试环境变量
    console.log('Environment variables:');
    console.log('- AWS_LAMBDA_FUNCTION_NAME:', process.env.AWS_LAMBDA_FUNCTION_NAME);
    console.log('- ARTICLES_TABLE_NAME:', process.env.ARTICLES_TABLE_NAME);
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    
    // 测试简单的数据处理
    const testData = {
      timestamp: new Date().toISOString(),
      requestId: context.awsRequestId,
      functionName: context.functionName,
      memoryLimit: context.memoryLimitInMB,
      remainingTime: context.getRemainingTimeInMillis(),
    };
    
    console.log('✅ Test data created:', testData);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Simple test completed successfully',
        data: testData,
      }),
    };
    
  } catch (error) {
    console.error('❌ Error in simple test:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
