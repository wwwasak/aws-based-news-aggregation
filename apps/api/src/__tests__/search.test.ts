import { describe, it, expect, beforeEach } from 'vitest';
import { SearchUtils } from '../utils/search.js';
import { DynamoArticleItem } from '../types.js';
import { type KeywordConfig } from '@news-agg/shared';

describe('SearchUtils', () => {
  let searchUtils: SearchUtils;
  let keywordConfig: KeywordConfig;
  let mockArticle: DynamoArticleItem;

  beforeEach(() => {
    keywordConfig = {
      companies: {
        google: {
          keywords: ['google', 'alphabet', 'android'],
          weight: 25,
          tags: ['bigtech', 'company'],
        },
        apple: {
          keywords: ['apple', 'iphone', 'ios'],
          weight: 25,
          tags: ['bigtech', 'company'],
        },
      },
      topics: {
        antitrust: {
          keywords: ['antitrust', 'monopoly', 'regulation'],
          weight: 15,
          tags: ['policy', 'regulation'],
        },
        ai: {
          keywords: ['artificial intelligence', 'machine learning', 'ai'],
          weight: 20,
          tags: ['ai', 'technology'],
        },
      },
      blacklist: ['advertisement', 'sponsored'],
      minScore: 10,
    };

    searchUtils = new SearchUtils(keywordConfig);

    mockArticle = {
      pk: 'source#techcrunch.com',
      sk: 'ts#1701234567#abc123',
      GSI1PK: 'tag#bigtech',
      GSI1SK: '2023-11-29T10:30:00Z',
      url: 'https://techcrunch.com/google-antitrust-case',
      urlHash: 'abc123',
      source: 'TechCrunch',
      domain: 'techcrunch.com',
      title: 'Google faces new antitrust investigation over search monopoly',
      titleNorm: 'google faces new antitrust investigation over search monopoly',
      summary: 'The Department of Justice is investigating Google for potential antitrust violations in its search business, marking a significant escalation in regulatory scrutiny.',
      publishedAt: '2023-11-29T10:30:00Z',
      lang: 'en',
      tags: ['company:google', 'topic:antitrust', 'bigtech'],
      score: 75,
      isBigTech: true,
      isPolicy: true,
      createdAt: '2023-11-29T10:30:00Z',
      updatedAt: '2023-11-29T10:30:00Z',
    };
  });

  describe('matchesQuery', () => {
    it('should match query in title', () => {
      expect(searchUtils.matchesQuery(mockArticle, 'google antitrust')).toBe(true);
      expect(searchUtils.matchesQuery(mockArticle, 'Google')).toBe(true);
      expect(searchUtils.matchesQuery(mockArticle, 'investigation')).toBe(true);
    });

    it('should match query in summary', () => {
      expect(searchUtils.matchesQuery(mockArticle, 'Department Justice')).toBe(true);
      expect(searchUtils.matchesQuery(mockArticle, 'regulatory scrutiny')).toBe(true);
    });

    it('should require all terms to match', () => {
      expect(searchUtils.matchesQuery(mockArticle, 'google microsoft')).toBe(false);
      expect(searchUtils.matchesQuery(mockArticle, 'apple antitrust')).toBe(false);
    });

    it('should handle empty or invalid queries', () => {
      expect(searchUtils.matchesQuery(mockArticle, '')).toBe(true);
      expect(searchUtils.matchesQuery(mockArticle, '   ')).toBe(true);
      expect(searchUtils.matchesQuery(mockArticle, 'nonexistent')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(searchUtils.matchesQuery(mockArticle, 'GOOGLE ANTITRUST')).toBe(true);
      expect(searchUtils.matchesQuery(mockArticle, 'Google Antitrust')).toBe(true);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should return base score when no keyword matches', () => {
      const score = searchUtils.calculateRelevanceScore(mockArticle, 'random query');
      expect(score).toBe(mockArticle.score); // Base score only
    });

    it('should add company boost when company keywords match', () => {
      const score = searchUtils.calculateRelevanceScore(mockArticle, 'google antitrust');
      expect(score).toBeGreaterThan(mockArticle.score);
      
      // Should include company boost (25 * 0.2 = 5) + title boost (2 * 5 = 10)
      const expectedMinScore = mockArticle.score + 5 + 10;
      expect(score).toBeGreaterThanOrEqual(expectedMinScore);
    });

    it('should add topic boost when topic keywords match', () => {
      const score = searchUtils.calculateRelevanceScore(mockArticle, 'antitrust regulation');
      expect(score).toBeGreaterThan(mockArticle.score);
      
      // Should include topic boost (15 * 0.15 = 2.25) + title boost (1 * 5 = 5)
      const expectedMinScore = mockArticle.score + 2.25 + 5;
      expect(score).toBeGreaterThanOrEqual(expectedMinScore);
    });

    it('should add title boost for title matches', () => {
      const score = searchUtils.calculateRelevanceScore(mockArticle, 'investigation monopoly');
      expect(score).toBeGreaterThan(mockArticle.score);
      
      // Each title match should add 5 points
      const expectedMinScore = mockArticle.score + 10; // 2 matches * 5 points
      expect(score).toBeGreaterThanOrEqual(expectedMinScore);
    });

    it('should cap score at 100', () => {
      // Create article with high base score
      const highScoreArticle = { ...mockArticle, score: 95 };
      
      const score = searchUtils.calculateRelevanceScore(highScoreArticle, 'google antitrust investigation');
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should combine multiple boosts correctly', () => {
      const score = searchUtils.calculateRelevanceScore(mockArticle, 'google antitrust investigation');
      
      // Should combine company boost + topic boost + title boost
      expect(score).toBeGreaterThan(mockArticle.score + 15); // Significant boost expected
    });
  });

  describe('sortSearchResults', () => {
    it('should sort by relevance score descending', () => {
      const results = [
        { article: { ...mockArticle, title: 'Low relevance' }, relevanceScore: 50 },
        { article: { ...mockArticle, title: 'High relevance' }, relevanceScore: 90 },
        { article: { ...mockArticle, title: 'Medium relevance' }, relevanceScore: 70 },
      ];

      const sorted = searchUtils.sortSearchResults(results);
      
      expect(sorted[0].relevanceScore).toBe(90);
      expect(sorted[1].relevanceScore).toBe(70);
      expect(sorted[2].relevanceScore).toBe(50);
    });

    it('should sort by publish time when relevance scores are equal', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const results = [
        { 
          article: { ...mockArticle, publishedAt: twoHoursAgo.toISOString(), title: 'Oldest' }, 
          relevanceScore: 80 
        },
        { 
          article: { ...mockArticle, publishedAt: now.toISOString(), title: 'Newest' }, 
          relevanceScore: 80 
        },
        { 
          article: { ...mockArticle, publishedAt: oneHourAgo.toISOString(), title: 'Middle' }, 
          relevanceScore: 80 
        },
      ];

      const sorted = searchUtils.sortSearchResults(results);
      
      expect(sorted[0].article.title).toBe('Newest');
      expect(sorted[1].article.title).toBe('Middle');
      expect(sorted[2].article.title).toBe('Oldest');
    });
  });

  describe('getDefaultKeywordConfig', () => {
    it('should return valid keyword configuration', () => {
      const config = SearchUtils.getDefaultKeywordConfig();
      
      expect(config.companies).toBeDefined();
      expect(config.topics).toBeDefined();
      expect(config.blacklist).toBeDefined();
      expect(config.minScore).toBeDefined();
      
      expect(Object.keys(config.companies).length).toBeGreaterThan(0);
      expect(Object.keys(config.topics).length).toBeGreaterThan(0);
      expect(config.blacklist.length).toBeGreaterThan(0);
      expect(typeof config.minScore).toBe('number');
    });

    it('should have properly structured company entries', () => {
      const config = SearchUtils.getDefaultKeywordConfig();
      
      Object.entries(config.companies).forEach(([company, rule]) => {
        expect(typeof company).toBe('string');
        expect(Array.isArray(rule.keywords)).toBe(true);
        expect(typeof rule.weight).toBe('number');
        expect(Array.isArray(rule.tags)).toBe(true);
        expect(rule.keywords.length).toBeGreaterThan(0);
        expect(rule.weight).toBeGreaterThan(0);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle articles with missing fields', () => {
      const incompleteArticle = {
        ...mockArticle,
        summary: '',
        tags: [],
      };

      expect(searchUtils.matchesQuery(incompleteArticle, 'google')).toBe(true);
      
      const score = searchUtils.calculateRelevanceScore(incompleteArticle, 'google');
      expect(score).toBeGreaterThanOrEqual(incompleteArticle.score);
    });

    it('should handle special characters in queries', () => {
      expect(searchUtils.matchesQuery(mockArticle, 'google & antitrust')).toBe(false);
      expect(searchUtils.matchesQuery(mockArticle, 'google antitrust')).toBe(true);
    });

    it('should handle very long queries', () => {
      const longQuery = 'google '.repeat(50) + 'antitrust';
      expect(() => searchUtils.matchesQuery(mockArticle, longQuery)).not.toThrow();
    });
  });
});









