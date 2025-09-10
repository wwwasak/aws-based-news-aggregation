const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const https = require('https');
const http = require('http');

// 初始化DynamoDB客户端
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Node.js 20兼容的宽松关键词引擎
 * 更容易收录科技和宏观经济相关新闻
 */
class RelaxedKeywordEngine {
  constructor() {
    // 内嵌更新后的keywords.yaml配置，更宽松的收录标准
    this.config = {
      companies: [
        'Apple', 'Microsoft', 'Google', 'Alphabet', 'Amazon', 'AWS', 'Meta', 'Facebook',
        'Nvidia', 'OpenAI', 'Tesla', 'Netflix', 'Uber', 'Airbnb', 'Spotify', 'Twitter', 'X'
      ],
      topics: [
        'AI', 'LLM', 'model', 'policy', 'regulation', 'antitrust', 'DOJ', 'FTC',
        'export controls', 'cloud', 'datacenter', 'layoffs', 'GPU', 'TPU', 'inference',
        'training', 'Copilot', 'Apple Intelligence', 'ChatGPT', 'GPT', 'machine learning',
        'artificial intelligence', 'blockchain', 'cryptocurrency', 'bitcoin', 'ethereum'
      ],
      rules: [
        // 原有的高权重规则
        {
          name: 'bigtech_ai_policy',
          description: '大科技公司的AI和政策相关新闻',
          patterns: [
            '(Apple|Microsoft|Google|Amazon|Meta|Nvidia|OpenAI|Tesla).*(AI|LLM|model|policy|regulation|antitrust|FTC|DOJ)',
            '(AI|LLM|model|policy|regulation|antitrust|FTC|DOJ).*(Apple|Microsoft|Google|Amazon|Meta|Nvidia|OpenAI|Tesla)'
          ],
          addTags: ['bigtech', 'ai', 'policy'],
          weight: 5
        },
        {
          name: 'cloud_infrastructure',
          description: '云计算和基础设施相关新闻',
          patterns: [
            '(Apple|Microsoft|Google|Amazon|Meta|Nvidia).*(cloud|datacenter|GPU|TPU|inference|training|server|compute)',
            '(cloud|datacenter|GPU|TPU|inference|training|server|compute).*(Apple|Microsoft|Google|Amazon|Meta|Nvidia)'
          ],
          addTags: ['bigtech', 'cloud', 'infrastructure'],
          weight: 3
        },
        {
          name: 'ai_breakthrough',
          description: 'AI技术突破和产品发布',
          patterns: [
            '(breakthrough|launch|release|announce).*(AI|LLM|model|ChatGPT|GPT|Copilot)',
            '(AI|LLM|model|ChatGPT|GPT|Copilot).*(breakthrough|launch|release|announce)'
          ],
          addTags: ['ai', 'technology', 'breakthrough'],
          weight: 4
        },
        {
          name: 'breaking_news',
          description: '突发新闻标识符',
          patterns: [
            '^\\s*(BREAKING|URGENT|ALERT|JUST IN|DEVELOPING)',
            '\\b(breaking|urgent|alert|developing|just in)\\b'
          ],
          addTags: ['breaking', 'urgent'],
          weight: 6
        },
        {
          name: 'security_incidents',
          description: '安全事件和数据泄露',
          patterns: [
            '\\b(data breach|hack|cyber attack|security incident|leak|vulnerability)\\b',
            '(Apple|Microsoft|Google|Amazon|Meta).*(breach|hack|attack|leak|vulnerability|security)'
          ],
          addTags: ['security', 'incident', 'urgent'],
          weight: 5
        },
        // 新增的宽松规则
        {
          name: 'general_tech',
          description: '广泛的科技相关新闻',
          patterns: [
            '\\b(technology|tech|digital|software|hardware|internet|web|mobile|app|platform|startup|innovation)\\b',
            '\\b(programming|developer|coding|algorithm|database|API|framework|library)\\b',
            '\\b(cybersecurity|blockchain|cryptocurrency|fintech|healthtech|edtech|cleantech)\\b',
            '\\b(robotics|automation|IoT|5G|6G|VR|AR|metaverse|quantum|semiconductor)\\b'
          ],
          addTags: ['technology', 'general'],
          weight: 2
        },
        {
          name: 'macro_economics',
          description: '宏观经济相关新闻',
          patterns: [
            '\\b(economy|economic|GDP|inflation|recession|recovery|growth|market|stock|bond|currency)\\b',
            '\\b(Federal Reserve|Fed|central bank|interest rate|monetary policy|fiscal policy)\\b',
            '\\b(trade|tariff|export|import|supply chain|manufacturing|employment|unemployment)\\b',
            '\\b(energy|oil|gas|renewable|climate|sustainability|ESG|green|carbon)\\b'
          ],
          addTags: ['economics', 'macro', 'finance'],
          weight: 3
        },
        {
          name: 'business_investment',
          description: '商业、投资和市场相关新闻',
          patterns: [
            '\\b(business|investment|venture|capital|funding|IPO|merger|acquisition|valuation)\\b',
            '\\b(earnings|revenue|profit|loss|quarterly|annual|financial|budget)\\b',
            '\\b(market cap|shares|dividend|stock price|trading|exchange|nasdaq|NYSE)\\b',
            '\\b(startup|unicorn|scale-up|entrepreneur|founder|CEO|CFO|CTO)\\b'
          ],
          addTags: ['business', 'investment', 'market'],
          weight: 2
        },
        {
          name: 'policy_regulation_broad',
          description: '政策、监管和法律相关新闻',
          patterns: [
            '\\b(policy|regulation|law|legal|government|congress|senate|bill|legislation)\\b',
            '\\b(antitrust|monopoly|competition|privacy|data protection|GDPR|compliance)\\b',
            '\\b(tax|taxation|subsidy|incentive|grant|public|federal|state)\\b',
            '\\b(election|political|vote|campaign|democracy|reform)\\b'
          ],
          addTags: ['policy', 'regulation', 'government'],
          weight: 2
        },
        {
          name: 'global_international',
          description: '全球化和国际相关新闻',
          patterns: [
            '\\b(global|international|worldwide|China|Europe|Asia|America|trade war)\\b',
            '\\b(geopolitical|diplomatic|sanctions|tariff|export control|supply chain)\\b',
            '\\b(emerging market|developing|BRICS|G7|G20|World Bank|IMF)\\b',
            '\\b(pandemic|crisis|disaster|climate change|sustainability)\\b'
          ],
          addTags: ['global', 'international', 'geopolitics'],
          weight: 2
        }
      ],
      blacklist: [
        'advertisement', 'sponsored', 'ad content', 'promotional', 'marketing',
        'press release', 'rumors', 'speculation', 'unconfirmed'
      ],
      scoreThresholds: {
        bigtech: 3,
        policy: 2,
        ai: 2,
        breaking: 4,
        security: 3,
        technology: 2,
        economics: 2
      },
      minScore: 1,
      maxScore: 100,
      defaultWeight: 2
    };

    // 编译正则表达式
    this.compiledRules = this.config.rules.map(rule => ({
      ...rule,
      compiledPatterns: rule.patterns.map(pattern => new RegExp(pattern, 'i'))
    }));

    // 编译黑名单
    this.blacklistRegex = new RegExp(this.config.blacklist.join('|'), 'i');
  }

  /**
   * 评估文章并返回标签和分数 (更宽松的评分)
   */
  evaluate(article) {
    const { title = '', summary = '' } = article;
    const text = `${title} ${summary}`.toLowerCase();

    let score = this.config.defaultWeight; // 从默认权重开始
    const tags = new Set();
    const matches = [];

    // 检查黑名单
    if (this.blacklistRegex.test(text)) {
      return { tags: new Set(['blacklisted']), score: 0, matches: ['blacklisted'] };
    }

    // 应用规则
    for (const rule of this.compiledRules) {
      for (const regex of rule.compiledPatterns) {
        if (regex.test(text)) {
          score += rule.weight;
          rule.addTags.forEach(tag => tags.add(tag));
          matches.push(rule.name);
          break; // 每个规则只匹配一次
        }
      }
    }

    // 确保分数在范围内
    score = Math.min(Math.max(score, this.config.minScore), this.config.maxScore);

    return { tags, score, matches };
  }

  getRuleCount() {
    return this.compiledRules.length;
  }

  getAllTags() {
    const allTags = new Set();
    this.config.rules.forEach(rule => {
      rule.addTags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags);
  }
}

/**
 * 简单的HTTP请求函数
 */
function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;

    const reqOptions = {
      headers: {
        'User-Agent': 'NewsAggregator/1.0 (+https://github.com/news-aggregator)',
        'Accept': 'application/rss+xml, application/xml, text/xml, text/html, */*',
        ...options.headers
      },
      timeout: options.timeout || 30000
    };

    const req = client.get(url, reqOptions, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            data,
            contentType: res.headers['content-type'] || '',
            statusCode: res.statusCode
          });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * RSS解析函数
 */
function parseRSS(xmlData) {
  const items = [];
  const itemRegex = /<item[^>]*>(.*?)<\/item>/gis;
  const titleRegex = /<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/i;
  const linkRegex = /<link[^>]*>(.*?)<\/link>/i;
  const descRegex = /<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/i;
  const pubDateRegex = /<pubDate[^>]*>(.*?)<\/pubDate>/i;
  const guidRegex = /<guid[^>]*>(.*?)<\/guid>/i;

  let match;
  while ((match = itemRegex.exec(xmlData)) !== null) {
    const itemXml = match[1];
    const titleMatch = titleRegex.exec(itemXml);
    const linkMatch = linkRegex.exec(itemXml);
    const descMatch = descRegex.exec(itemXml);
    const pubDateMatch = pubDateRegex.exec(itemXml);
    const guidMatch = guidRegex.exec(itemXml);

    const title = (titleMatch && (titleMatch[1] || titleMatch[2])) || '';
    const link = (linkMatch && linkMatch[1]) || '';
    const description = (descMatch && (descMatch[1] || descMatch[2])) || '';
    const pubDate = (pubDateMatch && pubDateMatch[1]) || '';
    const guid = (guidMatch && guidMatch[1]) || '';

    if (title && link) {
      items.push({
        title: title.trim(),
        link: link.trim(),
        description: description.trim(),
        pubDate: pubDate.trim(),
        guid: guid.trim()
      });
    }
  }

  return items;
}

/**
 * 简单的HTML解析函数 (用于Techmeme)
 */
function parseHTML(htmlData) {
  const items = [];

  // Techmeme特定的解析逻辑
  const itemRegex = /<div class="item"[^>]*>.*?<h3[^>]*><a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a><\/h3>.*?(<div class="excerpt">([^<]*)<\/div>)?/gis;
  const timestampRegex = /<span class="timestamp">([^<]*)<\/span>/gis;

  let match;
  let timestampMatch;
  const timestamps = [];

  // 提取时间戳
  while ((timestampMatch = timestampRegex.exec(htmlData)) !== null) {
    timestamps.push(timestampMatch[1]);
  }

  let itemIndex = 0;
  while ((match = itemRegex.exec(htmlData)) !== null) {
    const link = match[1];
    const title = match[2];
    const excerpt = match[4] || '';
    const timestamp = timestamps[itemIndex] || new Date().toISOString();

    if (title && link) {
      items.push({
        title: title.trim(),
        link: link.trim(),
        description: excerpt.trim(),
        pubDate: timestamp.trim(),
        guid: link
      });
    }
    itemIndex++;
  }

  return items;
}

/**
 * 提取域名
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown.com';
  }
}

/**
 * 延迟函数 (用于rate limiting)
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Node.js 20兼容的完整新闻源抓取函数
 */
exports.handler = async (event, context) => {
  console.log('🚀 Node.js 20 complete sources fetcher handler called!');
  console.log('Event:', JSON.stringify(event, null, 2));

  const startTime = Date.now();
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  const sourceStats = {};

  try {
    console.log('🔧 Initializing relaxed keyword engine for Node.js 20...');
    const keywordEngine = new RelaxedKeywordEngine();

    console.log(`✅ Relaxed keyword engine initialized with ${keywordEngine.getRuleCount()} rules`);
    console.log(`🏷️  Available tags: ${keywordEngine.getAllTags().join(', ')}`);

    // 内嵌完整的sources.yaml配置 (只包含enabled: true的源)
    const enabledSources = [
      {
        name: 'TechCrunch',
        type: 'rss',
        url: 'https://techcrunch.com/feed/',
        weight: 2,
        enabled: true,
        description: 'Leading technology media property',
        tags: ['tech', 'startup', 'venture-capital'],
        category: 'BigTech'
      },
      {
        name: 'Wired',
        type: 'rss',
        url: 'https://www.wired.com/feed/rss',
        weight: 2,
        enabled: true,
        description: 'Technology, science, culture, and business news',
        tags: ['tech', 'science', 'culture'],
        category: 'Tech'
      },
      {
        name: 'VentureBeat',
        type: 'rss',
        url: 'https://venturebeat.com/feed/',
        weight: 1,
        enabled: true,
        description: 'Technology news and analysis',
        tags: ['tech', 'business', 'ai'],
        category: 'Tech'
      },
      {
        name: 'Engadget',
        type: 'rss',
        url: 'https://www.engadget.com/rss.xml',
        weight: 1,
        enabled: true,
        description: 'Consumer technology news and reviews',
        tags: ['tech', 'gadgets', 'reviews'],
        category: 'Tech'
      },
      {
        name: 'Gizmodo',
        type: 'rss',
        url: 'https://gizmodo.com/rss',
        weight: 1,
        enabled: true,
        description: 'Design, technology, and science news',
        tags: ['tech', 'science', 'design'],
        category: 'Tech'
      },
      {
        name: 'Techmeme',
        type: 'page',
        url: 'https://www.techmeme.com/',
        weight: 3,
        enabled: true,
        description: 'Technology news aggregation and curation',
        tags: ['tech', 'aggregation', 'breaking'],
        category: 'Tech'
      }
    ];

    console.log(`📊 Processing ${enabledSources.length} enabled sources with complete sources.yaml support on Node.js 20`);

    // 处理每个启用的新闻源
    for (const source of enabledSources) {
      sourceStats[source.name] = { processed: 0, successful: 0, errors: 0 };

      try {
        console.log(`🔄 Fetching from ${source.name} (${source.type}): ${source.url}`);

        let items = [];

        if (source.type === 'rss') {
          // RSS源处理
          const response = await httpGet(source.url);
          console.log(`✅ Successfully fetched RSS from ${source.name} (${response.data.length} bytes)`);

          // 解析RSS
          items = parseRSS(response.data);
          console.log(`📄 Found ${items.length} RSS items from ${source.name}`);

        } else if (source.type === 'page') {
          // 网页抓取处理 (Techmeme)
          const response = await httpGet(source.url);
          console.log(`✅ Successfully fetched page from ${source.name} (${response.data.length} bytes)`);

          // 解析HTML
          items = parseHTML(response.data);
          console.log(`📄 Found ${items.length} page items from ${source.name}`);
        }

        // 处理每个新闻项 (限制为前3个以获取更多样本)
        const itemsToProcess = items.slice(0, 3);
        for (const item of itemsToProcess) {
          try {
            processedCount++;
            sourceStats[source.name].processed++;

            // 使用宽松的关键词引擎进行评估
            const evaluation = keywordEngine.evaluate({
              title: item.title,
              summary: item.description
            });

            console.log(`🧠 Evaluating "${item.title.substring(0, 50)}..." from ${source.name}`);
            console.log(`   📊 Score: ${evaluation.score}`);
            console.log(`   🏷️  Tags: [${Array.from(evaluation.tags).join(', ')}]`);
            console.log(`   🎯 Matches: [${evaluation.matches.join(', ')}]`);

            // 更宽松的保存标准 (分数>=2)
            if (evaluation.score >= 2) {
              // 创建文章记录
              const article = {
                pk: 'ARTICLE',
                sk: `${source.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                id: `${source.name}-${item.title?.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-') || 'untitled'}`,
                title: item.title || 'No Title',
                summary: item.description || 'No Description',
                url: item.link || source.url,
                source: source.name,
                category: source.category,
                publishedAt: new Date(item.pubDate || Date.now()).toISOString(),
                score: evaluation.score,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // 正确的GSI配置
                GSI1PK: source.category === 'BigTech' ? 'tag#bigtech' : `tag#${source.category.toLowerCase()}`,
                GSI1SK: `${new Date().toISOString()}#${Math.random().toString(36).substr(2, 9)}`,
                isBigTech: source.category === 'BigTech',
                isPolicy: evaluation.tags.has('policy'),
                tags: Array.from(evaluation.tags),
                domain: extractDomain(item.link || source.url),
                urlHash: `hash-${Math.random().toString(36).substr(2, 9)}`,
                titleNorm: (item.title || '').toLowerCase(),
                lang: 'en',
                keywordMatches: evaluation.matches
              };

              // 保存到DynamoDB
              await docClient.send(new PutCommand({
                TableName: process.env.ARTICLES_TABLE_NAME || 'articles',
                Item: article
              }));

              successCount++;
              sourceStats[source.name].successful++;
              console.log(`✅ Saved article from ${source.name}: ${article.title.substring(0, 50)}... (score: ${evaluation.score})`);
            } else {
              console.log(`⏭️  Skipping low-score article from ${source.name}: ${item.title.substring(0, 50)}... (score: ${evaluation.score})`);
            }

          } catch (itemError) {
            errorCount++;
            sourceStats[source.name].errors++;
            console.error(`❌ Failed to process item from ${source.name}:`, itemError.message);
          }
        }

        // 简单的rate limiting - 每个源之间延迟1秒
        await delay(1000);

      } catch (sourceError) {
        errorCount++;
        sourceStats[source.name].errors++;
        console.error(`❌ Failed to process source ${source.name}:`, sourceError.message);
      }
    }

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      message: 'Node.js 20 complete sources fetcher with all enabled sources from sources.yaml',
      runtime: 'nodejs20.x',
      keywordEngine: {
        rulesCount: keywordEngine.getRuleCount(),
        availableTags: keywordEngine.getAllTags(),
        configurationSource: 'embedded sources.yaml (enabled: true only)',
        relaxedFeatures: [
          'Lower score thresholds (2+ instead of 3+)',
          'Broader tech & economics coverage',
          'All enabled sources from sources.yaml',
          'RSS and webpage scraping support',
          'Node.js 20 compatibility verified'
        ]
      },
      sources: {
        totalEnabled: enabledSources.length,
        processed: enabledSources.map(s => ({
          name: s.name,
          type: s.type,
          category: s.category,
          stats: sourceStats[s.name]
        })),
        skipped: [
          'Ars Technica', 'The Verge', 'BBC Technology', 'Reuters Technology',
          'Hacker News', 'The Information'  // These are not in sources.yaml
        ],
        reason: 'Only processing enabled: true sources from sources.yaml'
      },
      stats: {
        totalProcessed: processedCount,
        totalSuccessful: successCount,
        totalErrors: errorCount,
        duration: `${duration}ms`,
        inclusionRate: `${Math.round((successCount / processedCount) * 100)}%`,
        averagePerSource: Math.round(processedCount / enabledSources.length)
      },
      timestamp: new Date().toISOString()
    };

    console.log('📊 Final Results (Complete Sources - Node.js 20):', result);

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Fatal error in complete sources fetcher solution:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        runtime: 'nodejs20.x',
        stats: {
          totalProcessed: processedCount,
          totalSuccessful: successCount,
          totalErrors: errorCount + 1,
          duration: `${duration}ms`
        },
        sources: sourceStats
      })
    };
  }
};
