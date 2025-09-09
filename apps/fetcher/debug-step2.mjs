// 测试 tsx 是否工作
console.log('Step 2: Testing tsx execution');

import { execSync } from 'child_process';

try {
  console.log('Checking tsx version...');
  const result = execSync('npx tsx --version', { encoding: 'utf8' });
  console.log('tsx version:', result.trim());
} catch (error) {
  console.error('tsx error:', error.message);
}

console.log('Step 2 completed');
