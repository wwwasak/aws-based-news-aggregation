import { type KeywordConfig } from '@news-agg/shared';
import { DynamoArticleItem } from '../types.js';

/**
 * 搜索工具类 - 处理文章搜索和评分逻辑
 */
export class SearchUtils {
  private keywordConfig: KeywordConfig;

  constructor(keywordConfig: KeywordConfig) {
    this.keywordConfig = keywordConfig;
  }

  /**
   * 检查文章是否匹配搜索查询
   */
  matchesQuery(article: DynamoArticleItem, query: string): boolean {
    const normalizedQuery = query.toLowerCase().trim();
    const searchTerms = normalizedQuery.split(/\s+/);

    // 在标题和摘要中搜索
    const titleLower = article.title.toLowerCase();
    const summaryLower = article.summary.toLowerCase();
    const combinedContent = `${titleLower} ${summaryLower}`;

    // 简单包含匹配 - 所有搜索词都必须存在
    return searchTerms.every(term => combinedContent.includes(term));
  }

  /**
   * 计算搜索相关性分数（基于关键词匹配增分）
   */
  calculateRelevanceScore(article: DynamoArticleItem, query: string): number {
    let relevanceScore = article.score; // 基础分数
    const normalizedQuery = query.toLowerCase().trim();
    const searchTerms = normalizedQuery.split(/\s+/);

    // 公司关键词匹配增分
    const companyBoost = this.calculateCompanyBoost(article, searchTerms);
    
    // 主题关键词匹配增分
    const topicBoost = this.calculateTopicBoost(article, searchTerms);

    // 标题匹配额外加分
    const titleBoost = this.calculateTitleBoost(article, searchTerms);

    relevanceScore += companyBoost + topicBoost + titleBoost;

    return Math.min(relevanceScore, 100); // 限制最高分数为 100
  }

  /**
   * 计算公司关键词匹配增分
   */
  private calculateCompanyBoost(article: DynamoArticleItem, searchTerms: string[]): number {
    let boost = 0;
    const titleLower = article.title.toLowerCase();
    const summaryLower = article.summary.toLowerCase();

    for (const [company, rule] of Object.entries(this.keywordConfig.companies)) {
      const companyKeywords = rule.keywords.map(kw => kw.toLowerCase());
      
      // 检查搜索词是否包含公司关键词
      const hasCompanyKeyword = searchTerms.some(term => 
        companyKeywords.some(kw => kw.includes(term) || term.includes(kw))
      );

      // 检查文章内容是否包含公司关键词
      const hasCompanyInContent = companyKeywords.some(kw => 
        titleLower.includes(kw) || summaryLower.includes(kw)
      );

      if (hasCompanyKeyword && hasCompanyInContent) {
        boost += rule.weight * 0.2; // 公司匹配增分 20%
        console.log(`Company boost: ${company} (+${rule.weight * 0.2})`);
      }
    }

    return boost;
  }

  /**
   * 计算主题关键词匹配增分
   */
  private calculateTopicBoost(article: DynamoArticleItem, searchTerms: string[]): number {
    let boost = 0;
    const titleLower = article.title.toLowerCase();
    const summaryLower = article.summary.toLowerCase();

    for (const [topic, rule] of Object.entries(this.keywordConfig.topics)) {
      const topicKeywords = rule.keywords.map(kw => kw.toLowerCase());
      
      // 检查搜索词是否包含主题关键词
      const hasTopicKeyword = searchTerms.some(term => 
        topicKeywords.some(kw => kw.includes(term) || term.includes(kw))
      );

      // 检查文章内容是否包含主题关键词
      const hasTopicInContent = topicKeywords.some(kw => 
        titleLower.includes(kw) || summaryLower.includes(kw)
      );

      if (hasTopicKeyword && hasTopicInContent) {
        boost += rule.weight * 0.15; // 主题匹配增分 15%
        console.log(`Topic boost: ${topic} (+${rule.weight * 0.15})`);
      }
    }

    return boost;
  }

  /**
   * 计算标题匹配增分
   */
  private calculateTitleBoost(article: DynamoArticleItem, searchTerms: string[]): number {
    const titleLower = article.title.toLowerCase();
    let boost = 0;

    // 标题中每个搜索词匹配加 5 分
    searchTerms.forEach(term => {
      if (titleLower.includes(term)) {
        boost += 5;
      }
    });

    return boost;
  }

  /**
   * 对搜索结果排序
   */
  sortSearchResults(articles: Array<{ article: DynamoArticleItem; relevanceScore: number }>): Array<{ article: DynamoArticleItem; relevanceScore: number }> {
    return articles.sort((a, b) => {
      // 首先按相关性分数降序
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      
      // 相关性分数相同时，按发布时间降序
      const timeA = new Date(a.article.publishedAt).getTime();
      const timeB = new Date(b.article.publishedAt).getTime();
      return timeB - timeA;
    });
  }

  /**
   * 获取默认关键词配置
   */
  static getDefaultKeywordConfig(): KeywordConfig {
    return {
      companies: {
        google: {
          keywords: ['google', 'alphabet', 'android', 'chrome'],
          weight: 25,
          tags: ['bigtech', 'company'],
        },
        apple: {
          keywords: ['apple', 'iphone', 'ios', 'mac'],
          weight: 25,
          tags: ['bigtech', 'company'],
        },
        microsoft: {
          keywords: ['microsoft', 'windows', 'azure', 'office'],
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
        antitrust: {
          keywords: ['antitrust', 'monopoly', 'competition', 'regulation'],
          weight: 15,
          tags: ['policy', 'regulation'],
        },
      },
      blacklist: ['advertisement', 'sponsored'],
      minScore: 10,
    };
  }
}



