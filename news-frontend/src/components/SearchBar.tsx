import React, { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * 搜索栏组件
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onClear,
  isLoading = false,
  placeholder = '搜索新闻内容...',
  className = '',
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery.length >= 2) {
      onSearch(trimmedQuery);
    }
  }, [query, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onClear();
  }, [onClear]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  }, [handleClear]);

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className={`h-5 w-5 ${isLoading ? 'animate-pulse text-primary-500' : 'text-gray-400'}`} />
          </div>
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className={`
              block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg
              bg-white text-gray-900 placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              transition-colors duration-200
            `}
          />
          
          {query && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200 disabled:cursor-not-allowed"
                title="清除搜索"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* 搜索提示 */}
        {query.length > 0 && query.length < 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            请输入至少2个字符进行搜索
          </div>
        )}
      </form>

      {/* 搜索建议 */}
      <div className="mt-2 text-xs text-gray-500">
        <span>搜索提示：可以搜索关键词如 "AI"、"政策"、"安全" 等，或公司名如 "Apple"、"Google" 等</span>
      </div>
    </div>
  );
};
