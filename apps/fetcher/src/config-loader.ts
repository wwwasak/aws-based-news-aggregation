import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { type KeywordConfig } from '@news-agg/shared';
import { NewsSourceConfig, NewsSource, SourcesConfig } from './types';

export class ConfigLoader {
  private configPath: string;

  constructor(configPath?: string) {
    // 在开发环境中，配置文件位于项目根目录的 configs 文件夹
    this.configPath = configPath || join(process.cwd(), '../../configs');
  }

  /**
   * 读取 sources.yaml 配置文件
   */
  loadSources(): SourcesConfig {
    try {
      const sourcesPath = join(this.configPath, 'sources.yaml');
      const content = readFileSync(sourcesPath, 'utf8');
      const config = yaml.load(content) as SourcesConfig;
      
      console.log('✅ Loaded news sources configuration');
      console.log(`   📊 Found ${config.sources.length} sources (${config.sources.filter(s => s.enabled).length} enabled)`);
      
      return config;
    } catch (error) {
      console.error('❌ Failed to load sources config:', error);
      return this.getDefaultSourcesConfig();
    }
  }

  /**
   * 读取 keywords.yaml 配置文件
   */
  loadKeywords(): KeywordConfig {
    try {
      const keywordsPath = join(this.configPath, 'keywords.yaml');
      const content = readFileSync(keywordsPath, 'utf8');
      const config = yaml.load(content) as KeywordConfig;
      
      console.log('✅ Loaded keyword configuration');
      return config;
    } catch (error) {
      console.error('❌ Failed to load keywords config:', error);
      return this.getDefaultKeywordConfig();
    }
  }

  /**
   * 获取默认新闻源配置
   */
  private getDefaultSourcesConfig(): SourcesConfig {
    console.log('📝 Using default news sources configuration');
    return {
      config: {
        requestTimeout: 30000,
        userAgent: 'NewsAggregator/1.0 (+https://github.com/news-aggregator)',
        maxConcurrency: 5,
        defaultRetries: 3,
        defaultWeight: 1,
        defaultInterval: 3600,
      },
      sources: [
        {
          name: 'TechCrunch',
          type: 'rss',
          url: 'https://techcrunch.com/feed/',
          weight: 2,
          intervalSec: 600,
          enabled: true,
          description: 'Leading technology media property',
          tags: ['tech', 'startup', 'venture-capital'],
          rateLimit: {
            requestsPerMinute: 10,
            burstSize: 5,
          },
        },
        {
          name: 'Wired',
          type: 'rss',
          url: 'https://www.wired.com/feed/rss',
          weight: 2,
          intervalSec: 600,
          enabled: true,
          description: 'Technology, science, culture, and business news',
          tags: ['tech', 'science', 'culture'],
          rateLimit: {
            requestsPerMinute: 10,
            burstSize: 5,
          },
        },
        {
          name: 'Techmeme',
          type: 'page',
          url: 'https://www.techmeme.com/',
          weight: 3,
          intervalSec: 300,
          enabled: true,
          description: 'Technology news aggregation and curation',
          tags: ['tech', 'aggregation', 'breaking'],
          rateLimit: {
            requestsPerMinute: 12,
            burstSize: 6,
          },
          pageConfig: {
            selectors: {
              title: '.ourh',
              link: '.ourh a',
              summary: '.excerpt',
              timestamp: '.timestamp',
            },
            followLinks: false,
            maxItems: 50,
          },
        },
      ],
      scheduling: {
        initialDelayRange: [0, 300],
        jitterRange: [-60, 60],
        backoffStrategy: {
          type: 'exponential',
          baseDelay: 30,
          maxDelay: 3600,
          multiplier: 2,
          maxRetries: 5,
        },
      },
      monitoring: {
        verboseLogging: true,
        collectMetrics: true,
        errorRateThreshold: 0.1,
        slowRequestThreshold: 10000,
      },
      healthCheck: {
        interval: 300,
        failureThreshold: 3,
        recoveryInterval: 1800,
      },
    };
  }

  /**
   * 获取默认关键词配置
   */
  private getDefaultKeywordConfig(): KeywordConfig {
    console.log('📝 Using default keyword configuration');
    return {
      companies: {
        apple: {
          keywords: ['apple', 'iphone', 'ios'],
          weight: 25,
          tags: ['bigtech', 'company'],
        },
        google: {
          keywords: ['google', 'android', 'chrome'],
          weight: 25,
          tags: ['bigtech', 'company'],
        },
      },
      topics: {
        ai: {
          keywords: ['artificial intelligence', 'machine learning', 'ai'],
          weight: 20,
          tags: ['ai', 'technology'],
        },
      },
      blacklist: ['advertisement', 'sponsored'],
      minScore: 10,
    };
  }
}