import { describe, it, expect, beforeEach } from 'vitest';
import { KeywordEngine, KeywordEngineConfig } from '../keyword-engine.js';

describe('KeywordEngine', () => {
  let engine: KeywordEngine;
  let config: KeywordEngineConfig;

  beforeEach(() => {
    config = {
      companies: ['Apple', 'Microsoft', 'Google', 'Alphabet', 'Amazon', 'Meta', 'OpenAI'],
      topics: ['AI', 'LLM', 'model', 'policy', 'regulation', 'antitrust', 'DOJ', 'FTC'],
      rules: [
        {
          name: 'bigtech_ai_policy',
          any: [
            '$company\\b.*(AI|LLM|model|policy|regulation|antitrust|FTC|DOJ)',
            '(AI|LLM|model|policy|regulation|antitrust|FTC|DOJ).*$company\\b',
          ],
          addTags: ['bigtech', 'ai', 'policy'],
          weight: 5,
        },
        {
          name: 'cloud_infra',
          any: [
            '\\b(cloud|datacenter|GPU|TPU|inference|training)\\b.*$company\\b',
          ],
          addTags: ['bigtech', 'cloud'],
          weight: 3,
        },
        {
          name: 'breaking_news',
          any: [
            '^\\s*(BREAKING|URGENT|ALERT|JUST IN)',
            '\\b(breaking|urgent|alert)\\b',
          ],
          addTags: ['breaking', 'urgent'],
          weight: 6,
        },
      ],
      scoreThresholds: {
        bigtech: 4,
        policy: 3,
        ai: 3,
        breaking: 5,
      },
      blacklist: ['advertisement', 'sponsored', 'promotional'],
      config: {
        minScore: 0,
        maxScore: 100,
        caseSensitive: false,
        wordBoundary: true,
        defaultWeight: 1,
      },
    };

    engine = new KeywordEngine(config);
  });

  describe('基础功能', () => {
    it('应该正确初始化引擎', () => {
      expect(engine.getRuleCount()).toBe(3);
      expect(engine.getAllTags()).toContain('bigtech');
      expect(engine.getAllTags()).toContain('ai');
      expect(engine.getAllTags()).toContain('policy');
    });

    it('应该正确获取配置', () => {
      const engineConfig = engine.getConfig();
      expect(engineConfig.companies).toContain('Apple');
      expect(engineConfig.topics).toContain('AI');
      expect(engineConfig.rules).toHaveLength(3);
    });
  });

  describe('公司和AI/政策关键词匹配', () => {
    it('应该匹配 Apple + AI 组合', () => {
      const result = engine.evaluate({
        title: 'Apple announces new AI features in iOS',
        summary: 'Apple Intelligence brings advanced AI capabilities to iPhone users.',
      });

      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('ai')).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(5);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('应该匹配 Google + antitrust 组合', () => {
      const result = engine.evaluate({
        title: 'DOJ files antitrust lawsuit against Google',
        summary: 'Department of Justice alleges Google maintains illegal monopoly in search.',
      });

      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('policy')).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(5);
      expect(result.matches).toContain('Google');
    });

    it('应该匹配反向组合 (policy + company)', () => {
      const result = engine.evaluate({
        title: 'FTC investigation targets Meta advertising practices',
        summary: 'Federal Trade Commission examines Meta data collection policies.',
      });

      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('policy')).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(5);
    });
  });

  describe('云基础设施匹配', () => {
    it('应该匹配云计算相关新闻', () => {
      const result = engine.evaluate({
        title: 'Amazon expands cloud datacenter capacity',
        summary: 'AWS announces new GPU instances for machine learning training.',
      });

      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('cloud')).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('应该匹配 GPU/TPU 相关新闻', () => {
      const result = engine.evaluate({
        title: 'Microsoft unveils new TPU architecture',
        summary: 'Advanced tensor processing units for AI inference workloads.',
      });

      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('cloud')).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(3);
    });
  });

  describe('突发新闻匹配', () => {
    it('应该匹配 BREAKING 标识符', () => {
      const result = engine.evaluate({
        title: 'BREAKING: OpenAI announces GPT-5',
        summary: 'Major breakthrough in artificial intelligence capabilities.',
      });

      expect(result.tags.has('breaking')).toBe(true);
      expect(result.tags.has('urgent')).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(6);
    });

    it('应该匹配小写的突发新闻标识符', () => {
      const result = engine.evaluate({
        title: 'urgent: Apple CEO announces resignation',
        summary: 'Unexpected leadership change at technology giant.',
      });

      expect(result.tags.has('breaking')).toBe(true);
      expect(result.tags.has('urgent')).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(6);
    });
  });

  describe('大小写不敏感匹配', () => {
    it('应该匹配大写公司名', () => {
      const result = engine.evaluate({
        title: 'GOOGLE launches new AI model',
        summary: 'ARTIFICIAL INTELLIGENCE breakthrough from ALPHABET.',
      });

      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('ai')).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it('应该匹配混合大小写', () => {
      const result = engine.evaluate({
        title: 'aPpLe announces new aI features',
        summary: 'Machine Learning capabilities in iOS.',
      });

      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('ai')).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('复合匹配测试', () => {
    it('应该累加多个规则的分数', () => {
      const result = engine.evaluate({
        title: 'BREAKING: Google cloud AI training infrastructure',
        summary: 'Major announcement about TPU datacenter expansion and LLM training capabilities.',
      });

      expect(result.tags.has('breaking')).toBe(true);
      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('ai')).toBe(true);
      expect(result.tags.has('cloud')).toBe(true);
      
      // 应该匹配多个规则: breaking_news (6) + bigtech_ai_policy (5) + cloud_infra (3) = 14
      expect(result.score).toBeGreaterThanOrEqual(10);
    });

    it('应该处理多个公司提及', () => {
      const result = engine.evaluate({
        title: 'Apple vs Google: AI competition intensifies',
        summary: 'Both companies announce competing LLM models and policy responses.',
      });

      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('ai')).toBe(true);
      expect(result.tags.has('policy')).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('无匹配情况', () => {
    it('应该对无关内容返回低分', () => {
      const result = engine.evaluate({
        title: 'Local restaurant opens new location',
        summary: 'Family-owned business expands to downtown area.',
      });

      expect(result.tags.size).toBe(0);
      expect(result.score).toBe(1); // 默认权重
      expect(result.matches).toHaveLength(0);
    });

    it('应该对空内容返回零分', () => {
      const result = engine.evaluate({
        title: '',
        summary: '',
      });

      expect(result.tags.size).toBe(0);
      expect(result.score).toBe(0);
      expect(result.matches).toHaveLength(0);
    });
  });

  describe('黑名单过滤', () => {
    it('应该对广告内容扣分', () => {
      const result = engine.evaluate({
        title: 'Apple AI features - sponsored advertisement',
        summary: 'This is promotional content about Apple Intelligence.',
      });

      // 应该匹配 bigtech_ai_policy 规则但被黑名单扣分
      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('ai')).toBe(true);
      // 分数应该被黑名单减少 (原本5分，扣除2分黑名单惩罚)
      expect(result.score).toBeLessThan(5);
    });

    it('应该对多个黑名单词汇累计扣分', () => {
      const result = engine.evaluate({
        title: 'Google sponsored advertisement promotional content',
        summary: 'Marketing material about Google AI services.',
      });

      expect(result.score).toBeLessThan(5); // 应该被多个黑名单词汇扣分
    });
  });

  describe('阈值检查方法', () => {
    it('应该正确识别 BigTech 文章', () => {
      const tags = new Set(['bigtech', 'ai']);
      
      expect(engine.isBigTech(tags, 5)).toBe(true); // 分数 ≥ 阈值 4
      expect(engine.isBigTech(tags, 3)).toBe(false); // 分数 < 阈值 4
      expect(engine.isBigTech(new Set(['ai']), 5)).toBe(false); // 没有 bigtech 标签
    });

    it('应该正确识别政策相关文章', () => {
      const tags = new Set(['policy', 'regulation']);
      
      expect(engine.isPolicy(tags, 4)).toBe(true); // 分数 ≥ 阈值 3
      expect(engine.isPolicy(tags, 2)).toBe(false); // 分数 < 阈值 3
    });

    it('应该正确识别 AI 相关文章', () => {
      const tags = new Set(['ai', 'technology']);
      
      expect(engine.isAI(tags, 3)).toBe(true); // 分数 ≥ 阈值 3
      expect(engine.isAI(tags, 2)).toBe(false); // 分数 < 阈值 3
    });

    it('应该正确识别突发新闻', () => {
      const tags = new Set(['breaking', 'urgent']);
      
      expect(engine.isBreaking(tags, 6)).toBe(true); // 分数 ≥ 阈值 5
      expect(engine.isBreaking(tags, 4)).toBe(false); // 分数 < 阈值 5
    });
  });

  describe('边界情况', () => {
    it('应该处理特殊字符', () => {
      const result = engine.evaluate({
        title: 'Apple's "AI" features & Google\'s response',
        summary: 'Companies compete in AI/ML space with $100M investment.',
      });

      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('ai')).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it('应该处理非常长的文本', () => {
      const longTitle = 'Apple ' + 'announces '.repeat(50) + 'AI breakthrough';
      const longSummary = 'This is a very long summary about artificial intelligence ' + 'and machine learning '.repeat(100) + 'from Apple.';
      
      const result = engine.evaluate({
        title: longTitle,
        summary: longSummary,
      });

      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('ai')).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it('应该处理只有标题的情况', () => {
      const result = engine.evaluate({
        title: 'Google announces new AI model',
        summary: '',
      });

      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('ai')).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it('应该处理只有摘要的情况', () => {
      const result = engine.evaluate({
        title: '',
        summary: 'Microsoft launches new cloud AI training platform.',
      });

      expect(result.tags.has('bigtech')).toBe(true);
      expect(result.tags.has('ai')).toBe(true);
      expect(result.tags.has('cloud')).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('分数范围限制', () => {
    it('应该限制最大分数', () => {
      // 创建一个会产生高分的配置
      const highScoreConfig = {
        ...config,
        config: {
          ...config.config,
          maxScore: 50,
        },
      };
      
      const highScoreEngine = new KeywordEngine(highScoreConfig);
      
      const result = highScoreEngine.evaluate({
        title: 'BREAKING: Apple Google Microsoft Amazon Meta AI antitrust investigation',
        summary: 'Major policy changes affect all big tech companies with AI and cloud services.',
      });

      expect(result.score).toBeLessThanOrEqual(50); // 应该被限制在最大值
    });

    it('应该限制最小分数', () => {
      const minScoreConfig = {
        ...config,
        config: {
          ...config.config,
          minScore: 5,
        },
      };
      
      const minScoreEngine = new KeywordEngine(minScoreConfig);
      
      const result = minScoreEngine.evaluate({
        title: 'Random unrelated content',
        summary: 'Nothing interesting here.',
      });

      expect(result.score).toBeGreaterThanOrEqual(5); // 应该被提升到最小值
    });
  });
});









