import React from 'react';
import { Loader2, Sparkles, Newspaper } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  variant?: 'default' | 'news' | 'search';
}

/**
 * 现代化加载动画组件
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  text,
  variant = 'default',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const getIcon = () => {
    switch (variant) {
      case 'news':
        return <Newspaper className={`${sizeClasses[size]} text-primary-600`} />;
      case 'search':
        return <Sparkles className={`${sizeClasses[size]} text-secondary-600`} />;
      default:
        return <Loader2 className={`${sizeClasses[size]} text-primary-600`} />;
    }
  };

  const getText = () => {
    if (text) return text;
    switch (variant) {
      case 'news':
        return '正在加载最新新闻...';
      case 'search':
        return '正在搜索相关内容...';
      default:
        return '加载中...';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {/* 主加载动画 */}
      <div className="relative">
        {/* 背景圆圈 */}
        <div className={`${sizeClasses[size]} border-2 border-gray-200 rounded-full`} />
        
        {/* 旋转圆圈 */}
        <div className={`
          absolute inset-0 ${sizeClasses[size]} border-2 border-transparent border-t-primary-600 
          rounded-full animate-spin
        `} />
        
        {/* 中心图标 */}
        <div className="absolute inset-0 flex items-center justify-center">
          {variant === 'default' ? (
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse" />
          ) : (
            <div className="animate-bounce-gentle">
              {getIcon()}
            </div>
          )}
        </div>
      </div>

      {/* 加载文本 */}
      {text !== null && (
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-600 animate-pulse-soft">
            {getText()}
          </p>
          
          {/* 加载进度点 */}
          <div className="flex items-center justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1s',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 装饰性元素 */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-secondary-500/5 rounded-full blur-xl animate-pulse-soft" />
    </div>
  );
};