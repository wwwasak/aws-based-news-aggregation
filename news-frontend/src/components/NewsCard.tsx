import React from 'react';
import { ExternalLink, Calendar, Tag } from 'lucide-react';
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
 * 新闻卡片组件
 */
export const NewsCard: React.FC<NewsCardProps> = ({ article, className = '' }) => {
  const handleOpenArticle = () => {
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <article className={`card hover:shadow-md transition-shadow duration-200 cursor-pointer ${className}`}>
      <div onClick={handleOpenArticle} className="space-y-3">
        {/* 标题和分数 */}
        <div className="flex justify-between items-start gap-3">
          <h2 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1 hover:text-primary-600 transition-colors">
            {article.title}
          </h2>
          {article.score > 0 && (
            <div className="flex-shrink-0">
              <span className={`
                inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                ${article.score >= 80 ? 'bg-red-100 text-red-800' :
                  article.score >= 60 ? 'bg-orange-100 text-orange-800' :
                  article.score >= 40 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'}
              `}>
                {article.score}分
              </span>
            </div>
          )}
        </div>

        {/* 摘要 */}
        {article.summary && (
          <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
            {article.summary}
          </p>
        )}

        {/* 标签 */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Tag className="w-3 h-3 text-gray-400 mt-0.5" />
            {article.tags.slice(0, 4).map((tag, index) => (
              <span
                key={index}
                className={`tag ${getTagClassName(tag)}`}
              >
                {tag}
              </span>
            ))}
            {article.tags.length > 4 && (
              <span className="tag tag-default">
                +{article.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* 底部信息 */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatPublishTime(article.publishedAt)}</span>
            </div>
            {article.source && (
              <span className="font-medium text-gray-700">
                {article.source}
              </span>
            )}
          </div>
          
          <button 
            className="flex items-center gap-1 text-primary-600 hover:text-primary-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenArticle();
            }}
          >
            <ExternalLink className="w-4 h-4" />
            <span>阅读原文</span>
          </button>
        </div>
      </div>
    </article>
  );
};
