import * as yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 关键词规则定义
 */
export interface KeywordRule {
  name: string;
  description?: string;
  any?: string[];
  all?: string[];
  addTags: string[];
  weight: number;
}

/**
 * 关键词配置
 */
export interface KeywordEngineConfig {
  companies: string[];
  topics: string[];
  rules: KeywordRule[];
  scoreThresholds: Record<string, number>;
  blacklist?: string[];
  config?: {
    minScore?: number;
    maxScore?: number;
    caseSensitive?: boolean;
    wordBoundary?: boolean;
    defaultWeight?: number;
  };
}

/**
 * 编译后的规则
 */
interface CompiledRule {
  name: string;
  anyPatterns: RegExp[];
  allPatterns: RegExp[];
  addTags: string[];
  weight: number;
}

/**
 * 评估结果
 */
export interface EvaluationResult {
  tags: Set<string>;
  score: number;
  matches: string[];
}

/**
 * 关键词引擎 - 处理关键词匹配和评分
 */
export class KeywordEngine {
  private config: KeywordEngineConfig;
  private compiledRules: CompiledRule[] = [];
  private blacklistPatterns: RegExp[] = [];
  private companies: string[] = [];
  private topics: string[] = [];

  constructor(config: KeywordEngineConfig) {
    this.config = config;
    this.companies = config.companies || [];
    this.topics = config.topics || [];
    this.compileRules();
    this.compileBlacklist();
  }

  /**
   * 从 YAML 文件加载配置
   */
  static fromYamlFile(filePath: string): KeywordEngine {
    try {
      const yamlContent = readFileSync(filePath, 'utf8');
      const config = yaml.load(yamlContent) as KeywordEngineConfig;
      return new KeywordEngine(config);
    } catch (error) {
      console.error('Failed to load keyword config from YAML:', error);
      throw new Error(`Failed to load keyword configuration: ${error}`);
    }
  }

  /**
   * 从默认配置路径加载
   */
  static fromDefaultConfig(): KeywordEngine {
    const configPath = join(process.cwd(), 'configs', 'keywords.yaml');
    return KeywordEngine.fromYamlFile(configPath);
  }

  /**
   * 预编译所有规则的正则表达式
   */
  private compileRules(): void {
    this.compiledRules = this.config.rules.map(rule => {
      const anyPatterns = (rule.any || []).map(pattern => this.compilePattern(pattern));
      const allPatterns = (rule.all || []).map(pattern => this.compilePattern(pattern));

      return {
        name: rule.name,
        anyPatterns,
        allPatterns,
        addTags: rule.addTags,
        weight: rule.weight,
      };
    });

    console.log(`Compiled ${this.compiledRules.length} keyword rules`);
  }

  /**
   * 编译黑名单模式
   */
  private compileBlacklist(): void {
    if (!this.config.blacklist) {
      return;
    }

    this.blacklistPatterns = this.config.blacklist.map(keyword => {
      const flags = this.config.config?.caseSensitive ? 'g' : 'gi';
      const pattern = this.config.config?.wordBoundary ? `\\b${this.escapeRegex(keyword)}\\b` : this.escapeRegex(keyword);
      return new RegExp(pattern, flags);
    });

    console.log(`Compiled ${this.blacklistPatterns.length} blacklist patterns`);
  }

  /**
   * 编译单个模式，处理占位符展开
   */
  private compilePattern(pattern: string): RegExp {
    let expandedPattern = pattern;

    // 展开 $company 占位符
    if (pattern.includes('$company')) {
      const companiesRegex = this.companies.map(company => this.escapeRegex(company)).join('|');
      expandedPattern = expandedPattern.replace(/\$company/g, `(?:${companiesRegex})`);
    }

    // 展开 $topic 占位符
    if (pattern.includes('$topic')) {
      const topicsRegex = this.topics.map(topic => this.escapeRegex(topic)).join('|');
      expandedPattern = expandedPattern.replace(/\$topic/g, `(?:${topicsRegex})`);
    }

    const flags = this.config.config?.caseSensitive ? 'g' : 'gi';
    return new RegExp(expandedPattern, flags);
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 评估文章内容并返回标签和分数
   */
  evaluate(content: {
    title: string;
    summary: string;
    source?: string;
    domain?: string;
  }): EvaluationResult {
    const { title, summary, source = '', domain = '' } = content;
    
    // 合并所有文本内容用于匹配
    const combinedText = `${title} ${summary} ${source} ${domain}`.trim();
    
    if (!combinedText) {
      return {
        tags: new Set<string>(),
        score: 0,
        matches: [],
      };
    }

    const tags = new Set<string>();
    let totalScore = 0;
    const matches: string[] = [];

    // 检查黑名单
    const blacklistPenalty = this.checkBlacklist(combinedText);
    
    // 评估每个规则
    for (const rule of this.compiledRules) {
      const ruleResult = this.evaluateRule(rule, combinedText);
      
      if (ruleResult.matched) {
        // 添加标签
        rule.addTags.forEach(tag => tags.add(tag));
        
        // 累加分数
        totalScore += rule.weight;
        
        // 记录匹配的文本片段
        matches.push(...ruleResult.matches);
        
        console.log(`Rule '${rule.name}' matched with weight ${rule.weight}:`, ruleResult.matches);
      }
    }

    // 应用黑名单惩罚
    totalScore = Math.max(0, totalScore - blacklistPenalty);

    // 应用配置限制
    const minScore = this.config.config?.minScore || 0;
    const maxScore = this.config.config?.maxScore || 100;
    const defaultWeight = this.config.config?.defaultWeight || 1;
    
    // 如果没有匹配任何规则，给予默认分数
    if (totalScore === 0 && matches.length === 0) {
      totalScore = defaultWeight;
    }

    // 限制分数范围
    totalScore = Math.max(minScore, Math.min(maxScore, totalScore));

    return {
      tags,
      score: totalScore,
      matches: [...new Set(matches)], // 去重
    };
  }

  /**
   * 评估单个规则
   */
  private evaluateRule(rule: CompiledRule, text: string): {
    matched: boolean;
    matches: string[];
  } {
    const matches: string[] = [];
    
    // 检查 ANY 条件 (任一匹配即可)
    let anyMatched = rule.anyPatterns.length === 0; // 如果没有 ANY 条件，默认为 true
    for (const pattern of rule.anyPatterns) {
      const patternMatches = text.match(pattern);
      if (patternMatches) {
        anyMatched = true;
        matches.push(...patternMatches);
      }
    }

    // 检查 ALL 条件 (必须全部匹配)
    let allMatched = true;
    for (const pattern of rule.allPatterns) {
      const patternMatches = text.match(pattern);
      if (patternMatches) {
        matches.push(...patternMatches);
      } else {
        allMatched = false;
        break;
      }
    }

    const matched = anyMatched && allMatched;
    
    return {
      matched,
      matches: matched ? matches : [],
    };
  }

  /**
   * 检查黑名单并返回惩罚分数
   */
  private checkBlacklist(text: string): number {
    let penalty = 0;
    
    for (const pattern of this.blacklistPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        penalty += matches.length; // 每个黑名单匹配扣1分
        console.log(`Blacklist penalty applied for:`, matches);
      }
    }
    
    return penalty;
  }

  /**
   * 检查文章是否满足特定类别的阈值
   */
  isBigTech(tags: Set<string>, score: number): boolean {
    const threshold = this.config.scoreThresholds.bigtech || 0;
    return tags.has('bigtech') && score >= threshold;
  }

  /**
   * 检查文章是否为政策相关
   */
  isPolicy(tags: Set<string>, score: number): boolean {
    const threshold = this.config.scoreThresholds.policy || 0;
    return tags.has('policy') && score >= threshold;
  }

  /**
   * 检查文章是否为AI相关
   */
  isAI(tags: Set<string>, score: number): boolean {
    const threshold = this.config.scoreThresholds.ai || 0;
    return tags.has('ai') && score >= threshold;
  }

  /**
   * 检查文章是否为突发新闻
   */
  isBreaking(tags: Set<string>, score: number): boolean {
    const threshold = this.config.scoreThresholds.breaking || 0;
    return tags.has('breaking') && score >= threshold;
  }

  /**
   * 获取配置信息
   */
  getConfig(): KeywordEngineConfig {
    return this.config;
  }

  /**
   * 获取编译后的规则数量
   */
  getRuleCount(): number {
    return this.compiledRules.length;
  }

  /**
   * 获取所有可用标签
   */
  getAllTags(): string[] {
    const allTags = new Set<string>();
    this.config.rules.forEach(rule => {
      rule.addTags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  }
}