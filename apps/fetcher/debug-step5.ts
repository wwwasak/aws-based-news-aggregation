// 测试 workspace 包导入
import { createLambdaLogger } from '@news-agg/shared';

console.log('Step 5: Testing workspace package imports');

try {
  console.log('Testing @news-agg/shared import...');
  console.log('✅ @news-agg/shared import successful');
  
  console.log('Testing logger creation...');
  const logger = createLambdaLogger('test');
  console.log('✅ Logger created successfully');
  
  console.log('Testing logger.info...');
  logger.info('Test log message', { test: true });
  console.log('✅ Logger.info executed successfully');
  
} catch (error) {
  console.error('❌ Workspace import error:', error);
  if (error instanceof Error) {
    console.error('Stack:', error.stack);
  }
}

console.log('Step 5 completed');
