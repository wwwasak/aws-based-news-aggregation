import { createHash } from 'crypto';

/**
 * URL 归一化 - 移除 UTM 参数和其他跟踪参数
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // 移除常见的跟踪参数
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'ref', 'referrer', '_ga', 'mc_cid', 'mc_eid',
      'source', 'medium', 'campaign'
    ];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // 移除片段标识符
    urlObj.hash = '';
    
    // 标准化路径 - 移除末尾斜杠
    if (urlObj.pathname.endsWith('/') && urlObj.pathname.length > 1) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * 标题标准化 - 移除多余空白字符和特殊符号
 */
export function normalizeTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, ' ') // 合并多个空白字符
    .replace(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\uf900-\ufaff\u{2f800}-\u{2fa1f}]/gu, ' ') // 保留字母数字和中文字符
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Jaccard 相似度计算
 */
export function jaccard(a: string, b: string): number {
  if (!a || !b) return 0;
  
  const setA = new Set(normalizeTitle(a).split(/\s+/).filter(word => word.length > 2));
  const setB = new Set(normalizeTitle(b).split(/\s+/).filter(word => word.length > 2));
  
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  
  return intersection.size / union.size;
}

/**
 * 字符串哈希函数
 */
export function hash(str: string): string {
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

/**
 * 生成文章唯一 ID
 */
export function generateArticleId(normalizedUrl: string, normalizedTitle: string): string {
  const content = `${normalizedUrl}:${normalizedTitle}`;
  return hash(content).substring(0, 16);
}

/**
 * 解析 RSS 日期
 */
export function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  try {
    // 尝试直接解析
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // 处理 RFC 2822 格式
    const rfc2822Match = dateStr.match(
      /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/i
    );
    
    if (rfc2822Match) {
      const [, day, month, year, hour, minute, second] = rfc2822Match;
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                     'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = months.indexOf(month.toLowerCase());
      
      if (monthIndex !== -1) {
        return new Date(
          parseInt(year),
          monthIndex,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
      }
    }
    
    return new Date();
  } catch {
    return new Date();
  }
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * 检查是否为有效 URL
 */
export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * 从 URL 提取域名
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * 生成当前时间戳
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}