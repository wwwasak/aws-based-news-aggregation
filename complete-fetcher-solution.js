const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const https = require('https');
const http = require('http');

// 初始化DynamoDB客户端
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

/**
 * 完整的关键词引擎 - 内嵌keywords.yaml配置
 * 解决配置加载和File is not defined问题
 */
class EmbeddedKeywordEngine {
  constructor() {
    // 直接内嵌keywords.yaml的完整配置，避免文件系统访问
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
        }
      ],
      blacklist: [
        'advertisement', 'sponsored', 'ad content', 'promotional', 'marketing',
        'press release', 'rumors', 'speculation', 'unconfirmed'
      ],
      scoreThresholds: {
        bigtech: 4,
        policy: 3,
        ai: 3,
        breaking: 5,
        security: 4
      },
      minScore: 1,
      maxScore: 100
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
   * 评估文章并返回标签和分数
   */
  evaluate(article) {
    const { title = '', summary = '' } = article;
    const text = `${title} ${summary}`.toLowerCase();
    
    let score = 0;
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
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.get(url, {
      headers: {
        'User-Agent': 'NewsAgg/1.0 (+https://github.com/news-agg)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
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
  
  let match;
  while ((match = itemRegex.exec(xmlData)) !== null) {
    const itemXml = match[1];
    const titleMatch = titleRegex.exec(itemXml);
    const linkMatch = linkRegex.exec(itemXml);
    const descMatch = descRegex.exec(itemXml);
    const pubDateMatch = pubDateRegex.exec(itemXml);
    
    const title = (titleMatch && (titleMatch[1] || titleMatch[2])) || '';
    const link = (linkMatch && linkMatch[1]) || '';
    const description = (descMatch && (descMatch[1] || descMatch[2])) || '';
    const pubDate = (pubDateMatch && pubDateMatch[1]) || new Date().toISOString();
    
    if (title && link) {
      items.push({
        title: title.trim(),
        link: link.trim(),
        description: description.trim(),
        pubDate: pubDate.trim()
      });
    }
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
 * 主要的Lambda处理函数
 */
exports.handler = async (event, context) => {
  console.log('🚀 Complete fetcher solution handler called!');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const startTime = Date.now();
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  
  try {
    console.log('🔧 Initializing embedded keyword engine...');
    const keywordEngine = new EmbeddedKeywordEngine();
    
    console.log(`✅ Keyword engine initialized with ${keywordEngine.getRuleCount()} rules`);
    console.log(`🏷️  Available tags: ${keywordEngine.getAllTags().join(', ')}`);
    
    // 配置感知的新闻源 (只有启用的)
    const enabledSources = [
      {
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        category: 'BigTech',
        enabled: true
      },
      {
        name: 'Hacker News',
        url: 'https://feeds.feedburner.com/hn/frontpage',
        category: 'Tech',
        enabled: true
      },
      {
        name: 'The Information',
        url: 'https://www.theinformation.com/feed',
        category: 'BigTech',
        enabled: true
      }
      // 注意：Ars Technica 和 The Verge 在源配置中是 enabled: false，所以不包含
    ];
    
    console.log(`📊 Processing ${enabledSources.length} enabled RSS sources`);
    
    // 处理每个启用的RSS源
    for (const source of enabledSources) {
      try {
        console.log(`🔄 Fetching from ${source.name}: ${source.url}`);
        
        // 获取RSS内容
        const rssData = await httpGet(source.url);
        console.log(`✅ Successfully fetched RSS from ${source.name} (${rssData.length} bytes)`);
        
        // 解析RSS
        const items = parseRSS(rssData);
        console.log(`📄 Found ${items.length} items in RSS feed`);
        
        // 处理每个新闻项 (限制为前3个)
        for (const item of items.slice(0, 3)) {
          try {
            processedCount++;
            
            // 使用内嵌的关键词引擎进行评估
            const evaluation = keywordEngine.evaluate({
              title: item.title,
              summary: item.description
            });
            
            console.log(`🧠 Keyword evaluation for "${item.title.substring(0, 50)}..."`);
            console.log(`   📊 Score: ${evaluation.score}`);
            console.log(`   🏷️  Tags: [${Array.from(evaluation.tags).join(', ')}]`);
            console.log(`   🎯 Matches: [${evaluation.matches.join(', ')}]`);
            
            // 只保存高分文章
            if (evaluation.score >= 3) {
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
              console.log(`✅ Saved high-quality article: ${article.title.substring(0, 50)}... (score: ${evaluation.score})`);
            } else {
              console.log(`⏭️  Skipping low-score article: ${item.title.substring(0, 50)}... (score: ${evaluation.score})`);
            }
            
          } catch (itemError) {
            errorCount++;
            console.error(`❌ Failed to process item from ${source.name}:`, itemError.message);
          }
        }
        
      } catch (sourceError) {
        errorCount++;
        console.error(`❌ Failed to process source ${source.name}:`, sourceError.message);
      }
    }
    
    const duration = Date.now() - startTime;
    
    const result = {
      success: true,
      message: 'Complete fetcher solution with embedded keyword engine',
      keywordEngine: {
        rulesCount: keywordEngine.getRuleCount(),
        availableTags: keywordEngine.getAllTags(),
        configurationSource: 'embedded (keywords.yaml equivalent)'
      },
      sources: {
        processed: enabledSources.map(s => ({ name: s.name, category: s.category })),
        skipped: ['Ars Technica', 'The Verge'], // 根据配置禁用
        reason: 'Respecting enabled: false in sources.yaml'
      },
      stats: {
        processed: processedCount,
        successful: successCount,
        errors: errorCount,
        duration: `${duration}ms`
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Final Results:', result);
    
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Fatal error in complete fetcher solution:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stats: {
          processed: processedCount,
          successful: successCount,
          errors: errorCount + 1,
          duration: `${duration}ms`
        }
      })
    };
  }
};
