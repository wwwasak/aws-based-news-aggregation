import React from 'react';
import { Filter, Sparkles } from 'lucide-react';
import { NEWS_CATEGORIES } from '../types';
import type { CategoryId } from '../types';

interface CategoryFilterProps {
  selectedCategory: CategoryId;
  onCategoryChange: (category: CategoryId) => void;
  className?: string;
}

/**
 * 现代化分类筛选组件
 */
export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* 标题区域 */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-primary-100 to-secondary-100 rounded-xl">
          <Filter className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">新闻分类</h3>
          <p className="text-sm text-gray-500">选择您感兴趣的新闻类别</p>
        </div>
      </div>
      
      {/* 桌面端：现代化标签选择器 */}
      <div className="hidden md:block">
        <div className="flex flex-wrap gap-3">
          {NEWS_CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`
                  relative group inline-flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  ${isSelected
                    ? `${category.color} shadow-medium border-2 border-current ring-2 ring-current/20 scale-105`
                    : 'bg-white/80 backdrop-blur-sm text-gray-600 border border-gray-200 hover:bg-white hover:shadow-soft hover:text-gray-900'
                  }
                `}
              >
                {/* 选中状态的装饰 */}
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 rounded-xl" />
                )}
                
                {/* 内容 */}
                <span className="relative z-10 flex items-center gap-2">
                  {category.id === 'all' && <Sparkles className="w-4 h-4" />}
                  {category.name}
                </span>
                
                {/* 悬停效果 */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/5 to-secondary-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 移动端：现代化下拉选择器 */}
      <div className="md:hidden">
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value as CategoryId)}
            className="w-full px-4 py-3 text-gray-900 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-soft focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
          >
            {NEWS_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          
          {/* 自定义下拉箭头 */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* 分类统计信息 */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
        <span>实时更新 • 智能分类 • 个性化推荐</span>
      </div>
    </div>
  );
};