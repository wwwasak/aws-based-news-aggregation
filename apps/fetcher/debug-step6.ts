// 测试本地文件导入
import { FetchStats, NewsCandidate } from './src/types';
import { ConfigLoader } from './src/config-loader';

console.log('Step 6: Testing local file imports');

try {
  console.log('Testing ./types import...');
  console.log('✅ ./types import successful');
  
  console.log('Testing ./config-loader import...');
  console.log('✅ ./config-loader import successful');
  
  console.log('Testing ConfigLoader instantiation...');
  const configLoader = new ConfigLoader();
  console.log('✅ ConfigLoader created successfully');
  
} catch (error) {
  console.error('❌ Local import error:', error);
  if (error instanceof Error) {
    console.error('Stack:', error.stack);
  }
}

console.log('Step 6 completed');
