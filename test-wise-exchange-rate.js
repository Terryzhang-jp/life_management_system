/**
 * Wise 汇率获取测试脚本
 *
 * 测试能否从 Wise 网站获取任意货币对的汇率
 */

const https = require('https');

async function fetchExchangeRate(fromCurrency, toCurrency, amount = 10000) {
  return new Promise((resolve, reject) => {
    const url = `https://wise.com/jp/currency-converter/${fromCurrency}-to-${toCurrency}-rate?amount=${amount}`;

    console.log(`🔍 正在获取 ${fromCurrency} → ${toCurrency} 的汇率...`);
    console.log(`📡 URL: ${url}\n`);

    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // 尝试从 HTML 中提取汇率信息
          console.log(`✅ 成功获取页面 (${res.statusCode})`);
          console.log(`📄 页面大小: ${data.length} 字符\n`);

          // 查找汇率信息的几种常见模式
          const patterns = [
            // 查找类似 "1 JPY = 0.0088 BND" 的模式
            /(\d+(?:\.\d+)?)\s*([A-Z]{3})\s*=\s*(\d+(?:\.\d+)?)\s*([A-Z]{3})/g,
            // 查找 JSON 数据
            /"rate":\s*(\d+(?:\.\d+)?)/,
            /"value":\s*(\d+(?:\.\d+)?)/,
            // 查找 meta 标签中的汇率
            /<meta[^>]*content="([^"]*rate[^"]*)"/gi,
          ];

          const results = [];

          patterns.forEach((pattern, index) => {
            const matches = data.match(pattern);
            if (matches) {
              results.push({
                pattern: index + 1,
                matches: matches.slice(0, 5) // 只显示前5个匹配
              });
            }
          });

          // 查找包含货币代码的文本
          const currencyMentions = data.match(new RegExp(`(${fromCurrency}|${toCurrency})`, 'gi'));

          console.log('📊 分析结果：');
          console.log('─'.repeat(80));
          console.log(`货币代码出现次数: ${currencyMentions ? currencyMentions.length : 0}`);
          console.log(`找到的模式匹配数: ${results.length}`);

          if (results.length > 0) {
            console.log('\n🎯 找到的汇率信息：');
            results.forEach(result => {
              console.log(`\n模式 ${result.pattern}:`);
              result.matches.forEach(match => {
                console.log(`  - ${match}`);
              });
            });
          }

          // 尝试查找 JSON 数据块
          const jsonMatches = data.match(/<script[^>]*>(.*?"rate".*?)<\/script>/s);
          if (jsonMatches) {
            console.log('\n💡 找到可能包含汇率的 JSON 数据');
            const jsonText = jsonMatches[1].substring(0, 500); // 只显示前500字符
            console.log(jsonText);
          }

          console.log('─'.repeat(80));

          resolve({
            success: true,
            statusCode: res.statusCode,
            dataLength: data.length,
            patterns: results,
            currencyMentions: currencyMentions ? currencyMentions.length : 0
          });

        } catch (error) {
          reject(error);
        }
      });

    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function testMultipleCurrencies() {
  console.log('🌍 开始测试 Wise 汇率获取功能\n');
  console.log('═'.repeat(80));

  const testCases = [
    { from: 'jpy', to: 'bnd', amount: 10000 },
    { from: 'usd', to: 'cny', amount: 1000 },
    { from: 'eur', to: 'jpy', amount: 1000 },
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n测试 ${testCase.amount} ${testCase.from.toUpperCase()} → ${testCase.to.toUpperCase()}`);
      console.log('─'.repeat(80));

      const result = await fetchExchangeRate(testCase.from, testCase.to, testCase.amount);

      console.log(`\n✅ 测试完成`);
      console.log(`   状态码: ${result.statusCode}`);
      console.log(`   找到模式: ${result.patterns.length} 个`);
      console.log(`   货币提及: ${result.currencyMentions} 次`);

    } catch (error) {
      console.error(`\n❌ 测试失败: ${error.message}`);
    }

    console.log('═'.repeat(80));

    // 等待1秒避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n\n📋 总结：');
  console.log('Wise 网站使用了动态渲染，直接 HTML 请求可能无法获取完整数据。');
  console.log('建议使用以下方法之一：');
  console.log('1. 使用 Wise API（如果有公开 API）');
  console.log('2. 使用 Puppeteer/Playwright 进行浏览器自动化');
  console.log('3. 使用其他提供 API 的汇率服务（如 exchangerate-api.com）');
}

// 运行测试
testMultipleCurrencies()
  .then(() => {
    console.log('\n✅ 所有测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 测试出错:', error);
    process.exit(1);
  });
