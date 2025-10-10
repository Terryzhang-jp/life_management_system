/**
 * Google Search with Gemini 测试脚本
 *
 * 测试 AI SDK 的 Google Search 功能是否可用
 */

const { google } = require('@ai-sdk/google');
const { generateText } = require('ai');

async function testGoogleSearch() {
  console.log('🔍 开始测试 Google Search with Gemini...\n');

  try {
    // 检查 API Key
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error(
        '❌ 缺少 GOOGLE_GENERATIVE_AI_API_KEY 环境变量\n' +
        '请在 .env.local 文件中设置：GOOGLE_GENERATIVE_AI_API_KEY=your_key_here'
      );
    }

    console.log('✅ API Key 已设置');
    console.log('📡 正在调用 Gemini with Google Search...\n');

    // 测试查询：获取最新的新闻
    const { text, experimental_providerMetadata } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      prompt: '今天是2025年10月10日，请告诉我最近一周 Google 公司有哪些重要动向和新闻？包括产品发布、公司战略、AI 领域进展等。列出前5条，包括日期和来源。',
      maxSteps: 5, // 允许多步调用
    });

    console.log('✅ 搜索成功！\n');
    console.log('📄 结果：');
    console.log('─'.repeat(80));
    console.log(text);
    console.log('─'.repeat(80));

    // 检查 metadata
    if (experimental_providerMetadata?.google) {
      console.log('\n📊 Metadata:');
      console.log(JSON.stringify(experimental_providerMetadata.google, null, 2));
    }

    console.log('\n✅ 测试完成！Google Search 功能正常工作。');
    return true;

  } catch (error) {
    console.error('\n❌ 测试失败：', error.message);

    if (error.message.includes('API key')) {
      console.error('\n💡 提示：');
      console.error('1. 前往 https://aistudio.google.com/app/apikey 获取 API Key');
      console.error('2. 在项目根目录创建 .env.local 文件');
      console.error('3. 添加：GOOGLE_GENERATIVE_AI_API_KEY=your_key_here');
    }

    console.error('\n完整错误信息：', error);
    return false;
  }
}

// 运行测试
testGoogleSearch()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
