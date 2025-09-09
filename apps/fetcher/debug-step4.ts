// 测试基础导入
import { readFileSync } from 'fs';
import { join } from 'path';

console.log('Step 4: Testing basic imports');

try {
  console.log('Testing fs import...');
  console.log('✅ fs import successful');
  
  console.log('Testing path import...');
  console.log('✅ path import successful');
  
  console.log('Testing file read...');
  const testPath = join(process.cwd(), 'package.json');
  const content = readFileSync(testPath, 'utf-8');
  const pkg = JSON.parse(content);
  console.log('✅ Package name:', pkg.name);
  
} catch (error) {
  console.error('❌ Runtime error:', error);
}

console.log('Step 4 completed');
