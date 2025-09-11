import React from 'react';
import { ExternalLink, Calendar, Tag, Award, Zap, Target } from 'lucide-react';
import { TAG_COLORS } from '../types';
import type { NewsArticle } from '../types';

interface NewsCardProps {
  article: NewsArticle;
  className?: string;
}

/**
 * 格式化发布时间
 */
function formatPublishTime(publishedAt: string): string {
  try {
    const date = new Date(publishedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? '刚刚' : `${diffMinutes}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  } catch {
    return '时间未知';
  }
}

/**
 * 获取标签样式
 */
function getTagClassName(tag: string): string {
  const normalizedTag = tag.toLowerCase();
  return TAG_COLORS[normalizedTag] || TAG_COLORS.default;
}

/**
 * 获取评分徽章样式
 */
function getScoreBadgeClass(score: number): string {
  if (score >= 80) return 'badge-score-high';
  if (score >= 60) return 'badge-score-medium';
  return 'badge-score-low';
}

/**
 * 获取评分图标
 */
function getScoreIcon(score: number) {
  if (score >= 80) return <Award className="w-3 h-3" />;
  if (score >= 60) return <Zap className="w-3 h-3" />;
  return <Target className="w-3 h-3" />;
}

/**
 * 现代化响应式新闻卡片组件
 */
export const NewsCard: React.FC<NewsCardProps> = ({ article, className = '' }) => {
  const handleOpenArticle = () => {
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <article className={`group card-elevated hover:shadow-glow-lg transition-all duration-500 cursor-pointer overflow-hidden ${className}`}>
      <div onClick={handleOpenArticle} className="space-y-2 md:space-y-4">
        {/* 头部区域 - 标题 */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base md:text-lg lg:text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-gradient transition-all duration-300 leading-tight">
            {article.title}
          </h2>
        </div>

        {/* 摘要区域 - 移动端优化 */}
        {article.summary && (
          <div className="relative">
            <p className="text-sm md:text-base text-gray-600 leading-relaxed line-clamp-2 md:line-clamp-3 group-hover:text-gray-700 transition-colors duration-300">
              {article.summary}
            </p>
            {/* 渐变遮罩效果 - 移动端隐藏 */}
            <div className="absolute bottom-0 left-0 right-0 h-6 md:h-8 bg-gradient-to-t from-white to-transparent pointer-events-none hidden md:block" />
          </div>
        )}

        {/* 标签区域 - 移动端紧凑布局 */}
        {article.tags && article.tags.length > 0 && (
          <div className="space-y-1 md:space-y-2 min-w-0">
            <div className="flex items-center gap-2 text-gray-400">
              <Tag className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span className="text-xs font-medium">分类</span>
            </div>
            <div className="flex flex-wrap gap-1 md:gap-1.5 min-w-0">
              {article.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className={`tag ${getTagClassName(tag)} hover:scale-105 transition-transform duration-200 text-xs px-2 py-0.5 flex-shrink-0`}
                >
                  {tag}
                </span>
              ))}
              {article.tags.length > 3 && (
                <span className="tag tag-default text-xs px-2 py-0.5 flex-shrink-0">
                  +{article.tags.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 底部信息区域 - 移动端紧凑布局 */}
        <div className="flex flex-col gap-2 md:gap-3 pt-2 md:pt-3 border-t border-gray-100">
          {/* 第一行：时间、来源、评分 - 移动端横向排列 */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs text-gray-500 min-w-0">
            {/* 发布时间 */}
            <div className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
              <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="font-medium truncate">{formatPublishTime(article.publishedAt)}</span>
            </div>
            
            {/* 分隔符 */}
            <div className="w-1 h-1 bg-gray-300 rounded-full hidden sm:block flex-shrink-0" />
            
            {/* 新闻源 */}
            {article.source && (
              <div className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse flex-shrink-0" />
                <span className="font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-xs truncate">
                  {article.source}
                </span>
              </div>
            )}
            
            {/* 评分显示 - 移动端紧凑 */}
            {article.score > 0 && (
              <>
                <div className="w-1 h-1 bg-gray-300 rounded-full hidden sm:block flex-shrink-0" />
                <div className={`badge ${getScoreBadgeClass(article.score)} flex items-center gap-1 px-1.5 py-0.5 flex-shrink-0`}>
                  {getScoreIcon(article.score)}
                  <span className="font-semibold text-xs">{article.score}</span>
                </div>
              </>
            )}
          </div>
          
          {/* 第二行：阅读按钮 - 移动端全宽 */}
          <button 
            className="btn-ghost group/btn flex items-center justify-center gap-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-all duration-200 text-sm py-2 px-3 rounded-lg w-full sm:w-auto"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenArticle();
            }}
          >
            <span className="font-semibold">阅读原文</span>
            <ExternalLink className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform duration-200" />
          </button>
        </div>

        {/* 悬停效果装饰 */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-secondary-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
    </article>
  );
};