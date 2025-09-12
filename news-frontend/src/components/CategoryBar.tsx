import React from 'react';
import { Filter, Sparkles, TrendingUp, Shield, Building2, Gavel, DollarSign, Zap, Cpu } from 'lucide-react';
import { NEWS_CATEGORIES } from '../types';
import type { CategoryId } from '../types';

interface CategoryBarProps {
  selectedCategory: CategoryId;
  onCategoryChange: (category: CategoryId) => void;
  className?: string;
}

// 为每个分类添加图标
const getCategoryIcon = (categoryId: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    all: <Sparkles className="w-4 h-4" />,
    ai: <Cpu className="w-4 h-4" />,
    bigtech: <Building2 className="w-4 h-4" />,
    technology: <TrendingUp className="w-4 h-4" />,
    policy: <Gavel className="w-4 h-4" />,
    economics: <DollarSign className="w-4 h-4" />,
    politics: <Shield className="w-4 h-4" />,
    breaking: <Zap className="w-4 h-4" />,
    security: <Shield className="w-4 h-4" />,
  };
  return iconMap[categoryId] || <Filter className="w-4 h-4" />;
};

// 获取移动端短名称
const getShortName = (categoryId: string) => {
  const shortNames: Record<string, string> = {
    all: '全部',
    ai: 'AI',
    bigtech: '大厂',
    technology: '科技',
    policy: '政策',
    economics: '经济',
    politics: '政治',
    breaking: '突发',
    security: '安全',
  };
  return shortNames[categoryId] || categoryId;
};

/**
 * 直观的分类选择栏组件 - 类似导航栏的设计
 */
export const CategoryBar: React.FC<CategoryBarProps> = ({
  selectedCategory,
  onCategoryChange,
  className = '',
}) => {
  return (
    <div className={`bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-soft ${className}`}>
      {/* 桌面端：水平滚动标签栏 */}
      <div className="hidden md:block p-2">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {NEWS_CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap
                  ${isSelected
                    ? `${category.color} shadow-md border border-current/20 transform scale-105`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 border border-transparent'
                  }
                `}
              >
                {getCategoryIcon(category.id)}
                <span>{category.name}</span>
                {isSelected && (
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 移动端：紧凑的滑动标签栏 */}
      <div className="md:hidden p-2">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {NEWS_CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap
                  ${isSelected
                    ? `${category.color} shadow-md border border-current/20`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 border border-transparent'
                  }
                `}
              >
                {getCategoryIcon(category.id)}
                <span className="hidden sm:inline">{category.name}</span>
                <span className="sm:hidden">
                  {getShortName(category.id)}
                </span>
                {isSelected && (
                  <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
