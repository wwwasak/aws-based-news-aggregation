import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractDomain, isValidUrl, getCurrentTimestamp } from '@news-agg/shared';
import { NewsCandidate } from '../types.js';

export class WebpageFetcher {
  /**
   * 从网页源抓取新闻候选项
   */
  async fetchCandidates(source: { name: string; url: string }): Promise<NewsCandidate[]> {
    try {
      console.log(`🌐 Fetching webpage from ${source.name}: ${source.url}`);

      const response = await axios.get(source.url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsAgg/1.0; +https://github.com/news-agg)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      const $ = cheerio.load(response.data);
      const candidates: NewsCandidate[] = [];

      // Techmeme 特定解析
      if (source.url.includes('techmeme.com')) {
        candidates.push(...this.parseTechmeme($, source));
      } else {
        console.warn(`⚠️  Unknown webpage source: ${source.name}`);
      }

      console.log(`✅ Extracted ${candidates.length} candidates from ${source.name}`);
      return candidates;
    } catch (error) {
      console.error(`❌ Failed to fetch webpage from ${source.name}:`, error);
      return [];
    }
  }

  /**
   * 解析 Techmeme 网站
   */
  private parseTechmeme($: cheerio.CheerioAPI, source: { name: string; url: string }): NewsCandidate[] {
    const candidates: NewsCandidate[] = [];
    const baseUrl = new URL(source.url);

    $('.item').each((_, element) => {
      try {
        const $item = $(element);
        const $titleLink = $item.find('.storylink');
        
        if ($titleLink.length === 0) return;

        const title = $titleLink.text().trim();
        let url = $titleLink.attr('href');
        
        if (!title || !url) return;

        // 处理相对 URL
        if (url.startsWith('/')) {
          url = `${baseUrl.origin}${url}`;
        } else if (!url.startsWith('http')) {
          url = `${baseUrl.origin}/${url}`;
        }

        if (!isValidUrl(url)) {
          console.warn(`⚠️  Invalid URL from Techmeme: ${url}`);
          return;
        }

        // 尝试获取摘要
        let summary = '';
        const $excerpt = $item.find('.excerpt');
        if ($excerpt.length > 0) {
          summary = $excerpt.text().trim();
        }

        // 尝试从相关链接获取更多信息
        if (!summary) {
          const $relatedLinks = $item.find('.related a');
          if ($relatedLinks.length > 0) {
            const relatedTexts = $relatedLinks.map((_, el) => $(el).text().trim()).get();
            summary = relatedTexts.join(' ').substring(0, 200);
          }
        }

        const candidate: NewsCandidate = {
          source: source.name,
          domain: extractDomain(source.url),
          title,
          summary,
          url,
          publishedAt: getCurrentTimestamp(), // Techmeme 通常没有明确的发布时间
        };

        candidates.push(candidate);
      } catch (error) {
        console.warn('⚠️  Failed to parse Techmeme item:', error);
      }
    });

    return candidates;
  }
}