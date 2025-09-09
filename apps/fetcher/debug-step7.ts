// 测试真正的 handler 导入
async function testHandler() {
  console.log('Step 7: Testing real handler import');

  try {
    console.log('Testing ./src/index import...');
    const { handler } = await import('./src/index');
    console.log('✅ ./src/index import successful');
    console.log('Handler type:', typeof handler);
    
  } catch (error) {
    console.error('❌ Handler import error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }

  console.log('Step 7 completed');
}

testHandler();
