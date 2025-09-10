import React from 'react';
import { NEWS_CATEGORIES } from '../types';
import type { CategoryId } from '../types';

interface CategoryFilterProps {
  selectedCategory: CategoryId;
  onCategoryChange: (category: CategoryId) => void;
  className?: string;
}

/**
 * 分类筛选组件
 */
export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700">新闻分类</h3>
      
      {/* 桌面端：水平滚动标签 */}
      <div className="hidden md:flex md:flex-wrap md:gap-2">
        {NEWS_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`
              inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${selectedCategory === category.id
                ? `${category.color} ring-2 ring-offset-1 ring-current`
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }
            `}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* 移动端：下拉选择器 */}
      <div className="md:hidden">
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value as CategoryId)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {NEWS_CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
