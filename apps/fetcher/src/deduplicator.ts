import { NewsStore } from '@news-agg/store';
import { jaccard, normalizeTitle, normalizeUrl, hash } from '@news-agg/shared';
import { NewsCandidate } from './types';

/**
 * 去重器 - 检查新闻候选项是否重复
 */
export class Deduplicator {
  private store: NewsStore;
  private recentArticlesCache: Map<string, { title: string; normalizedTitle: string }> = new Map();
  private cacheExpiry: number = 48 * 60 * 60 * 1000; // 48 小时

  constructor(store: NewsStore) {
    this.store = store;
  }

  /**
   * 检查候选项是否重复
   */
  async isDuplicate(candidate: NewsCandidate): Promise<{ isDuplicate: boolean; reason?: string }> {
    const normalizedUrl = normalizeUrl(candidate.url);
    const normalizedTitleStr = normalizeTitle(candidate.title);
    const urlHash = hash(normalizedUrl);

    // 1. 检查 URL 哈希是否已存在（精确重复）
    const existingByUrl = await this.checkUrlDuplicate(urlHash);
    if (existingByUrl) {
      return { isDuplicate: true, reason: 'URL already exists' };
    }

    // 2. 检查标题相似度（近似重复）
    const similarTitle = await this.checkTitleSimilarity(normalizedTitleStr, candidate.publishedAt);
    if (similarTitle) {
      return { isDuplicate: true, reason: `Similar title found: ${similarTitle.title}` };
    }

    return { isDuplicate: false };
  }

  /**
   * 检查 URL 哈希是否已存在
   */
  private async checkUrlDuplicate(urlHash: string): Promise<boolean> {
    try {
      // 更新缓存以确保有最新数据
      await this.updateRecentArticlesCache();
      
      // 检查缓存中是否存在相同的URL哈希
      for (const [cachedUrlHash] of this.recentArticlesCache) {
        if (cachedUrlHash === urlHash) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn('⚠️  Failed to check URL duplicate:', error);
      return false;
    }
  }

  /**
   * 检查标题相似度
   */
  private async checkTitleSimilarity(
    normalizedTitle: string, 
    publishedAt: string
  ): Promise<{ title: string; normalizedTitle: string } | null> {
    try {
      // 更新缓存
      await this.updateRecentArticlesCache();

      // 检查缓存中的文章
      for (const [, article] of this.recentArticlesCache) {
        const similarity = jaccard(normalizedTitle, article.normalizedTitle);
        
        if (similarity >= 0.8) {
          console.log(`🔍 Found similar title (similarity: ${similarity.toFixed(3)})`);
          console.log(`   Existing: ${article.title.substring(0, 80)}...`);
          console.log(`   New: ${normalizedTitle.substring(0, 80)}...`);
          return article;
        }
      }

      return null;
    } catch (error) {
      console.warn('⚠️  Failed to check title similarity:', error);
      return null;
    }
  }

  /**
   * 更新最近文章缓存
   */
  private async updateRecentArticlesCache(): Promise<void> {
    try {
      const now = Date.now();
      const recentWindow = new Date(now - this.cacheExpiry).toISOString();

      // 清理过期缓存
      this.recentArticlesCache.clear();

      // 查询最近 48 小时的文章
      // 使用扫描获取所有最近文章，而不只是BigTech文章
      const recentArticles = await this.store.scanRecentArticles({
        limit: 500,
        startTime: recentWindow,
      });

      // 更新缓存
      for (const article of recentArticles.items) {
        const key = hash(article.normalizedUrl || article.url);
        this.recentArticlesCache.set(key, {
          title: article.title,
          normalizedTitle: article.normalizedTitle || normalizeTitle(article.title),
        });
      }

      console.log(`📚 Updated deduplication cache with ${this.recentArticlesCache.size} recent articles`);
    } catch (error) {
      console.warn('⚠️  Failed to update recent articles cache:', error);
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.recentArticlesCache.clear();
    console.log('🧹 Cleared deduplication cache');
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; expiryHours: number } {
    return {
      size: this.recentArticlesCache.size,
      expiryHours: this.cacheExpiry / (60 * 60 * 1000),
    };
  }
}

