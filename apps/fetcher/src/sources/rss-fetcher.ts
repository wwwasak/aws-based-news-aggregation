import RSSParser from 'rss-parser';
import { extractDomain, parseDate, isValidUrl } from '@news-agg/shared';
import { NewsCandidate } from '../types';

interface RSSItem {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  pubDate?: string;
  isoDate?: string;
}

export class RSSFetcher {
  private parser: RSSParser<any, RSSItem>;

  constructor() {
    this.parser = new RSSParser({
      timeout: 30000,
      headers: {
        'User-Agent': 'NewsAgg/1.0 (+https://github.com/news-agg)',
      },
    });
  }

  /**
   * 从 RSS 源抓取新闻候选项
   */
  async fetchCandidates(source: { name: string; url: string }): Promise<NewsCandidate[]> {
    try {
      console.log(`📡 Fetching RSS from ${source.name}: ${source.url}`);

      const feed = await this.parser.parseURL(source.url);
      const candidates: NewsCandidate[] = [];

      if (!feed.items || feed.items.length === 0) {
        console.log(`⚠️  No items found in RSS feed: ${source.name}`);
        return candidates;
      }

      console.log(`📰 Found ${feed.items.length} items from ${source.name}`);

      for (const item of feed.items) {
        try {
          const candidate = this.convertItemToCandidate(item, source);
          if (candidate) {
            candidates.push(candidate);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to convert RSS item from ${source.name}:`, error);
        }
      }

      console.log(`✅ Converted ${candidates.length} valid candidates from ${source.name}`);
      return candidates;
    } catch (error) {
      console.error(`❌ Failed to fetch RSS from ${source.name}:`, error);
      return [];
    }
  }

  /**
   * 将 RSS 条目转换为新闻候选项
   */
  private convertItemToCandidate(
    item: RSSItem,
    source: { name: string; url: string }
  ): NewsCandidate | null {
    // 验证必需字段
    if (!item.title || !item.link) {
      return null;
    }

    // 验证 URL 格式
    if (!isValidUrl(item.link)) {
      console.warn(`⚠️  Invalid URL from ${source.name}: ${item.link}`);
      return null;
    }

    // 解析发布时间
    let publishedAt: string;
    if (item.isoDate) {
      publishedAt = new Date(item.isoDate).toISOString();
    } else if (item.pubDate) {
      publishedAt = parseDate(item.pubDate).toISOString();
    } else {
      publishedAt = new Date().toISOString();
    }

    // 提取摘要
    let summary = '';
    if (item.contentSnippet) {
      summary = item.contentSnippet.trim();
    } else if (item.content) {
      // 从 HTML 内容中提取纯文本摘要
      summary = item.content.replace(/<[^>]*>/g, '').trim().substring(0, 300);
    }

    const candidate: NewsCandidate = {
      source: source.name,
      domain: extractDomain(source.url),
      title: item.title.trim(),
      summary,
      url: item.link,
      publishedAt,
    };

    return candidate;
  }
}