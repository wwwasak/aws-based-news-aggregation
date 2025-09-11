import React, { useState, useCallback } from 'react';
import { Search, X, Sparkles, Filter } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * 现代化响应式搜索栏组件
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onClear,
  isLoading = false,
  placeholder = '搜索新闻内容...',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

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
        <div className="relative group">
          {/* 搜索图标 */}
          <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
            <div className="relative">
              <Search className={`h-4 w-4 md:h-5 md:w-5 transition-all duration-300 ${
                isLoading 
                  ? 'text-primary-500 animate-pulse' 
                  : isFocused 
                    ? 'text-primary-600 scale-110' 
                    : 'text-gray-400 group-hover:text-gray-600'
              }`} />
              {isLoading && (
                <div className="absolute inset-0 bg-primary-500/20 rounded-full animate-ping" />
              )}
            </div>
          </div>
          
          {/* 输入框 - 响应式设计 */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={isLoading}
            className={`
              w-full pl-10 md:pl-12 pr-10 md:pr-12 py-3 md:py-4 text-gray-900 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl md:rounded-2xl shadow-lg placeholder-gray-500
              ${isFocused 
                ? 'ring-2 ring-primary-500/50 shadow-glow border-primary-300' 
                : 'hover:shadow-xl hover:border-gray-300'
              }
              ${isLoading ? 'cursor-wait' : 'cursor-text'}
              transition-all duration-300 text-sm md:text-base
            `}
          />
          
          {/* 清除按钮 */}
          {query && (
            <div className="absolute inset-y-0 right-0 pr-3 md:pr-4 flex items-center">
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading}
                className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:cursor-not-allowed group/clear"
                title="清除搜索"
              >
                <X className="h-3 w-3 md:h-4 md:w-4 group-hover/clear:scale-110 transition-transform duration-200" />
              </button>
            </div>
          )}

          {/* 装饰性元素 */}
          <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-r from-primary-500/5 to-secondary-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>

        {/* 搜索提示 - 移动端优化 */}
        {query.length > 0 && query.length < 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 md:mt-2 p-2 md:p-3 bg-yellow-50 border border-yellow-200 rounded-lg md:rounded-xl text-xs md:text-sm text-yellow-800 animate-fade-in-down">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-yellow-600" />
              <span>请输入至少2个字符进行搜索</span>
            </div>
          </div>
        )}

        {/* 搜索建议 - 桌面端显示 */}
        {isFocused && query.length === 0 && (
          <div className="hidden md:block absolute top-full left-0 right-0 mt-2 p-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-large animate-fade-in-down">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Filter className="w-4 h-4 text-primary-600" />
                <span>搜索建议</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {['AI人工智能', '科技政策', '安全事件', '商业投资'].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setQuery(suggestion);
                      onSearch(suggestion);
                    }}
                    className="text-left p-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>

      {/* 搜索提示文本 - 移动端隐藏 */}
      <div className="hidden md:block mt-2 md:mt-3 text-xs text-gray-500 flex items-center gap-2">
        <Sparkles className="w-3 h-3" />
        <span>搜索提示：可以搜索关键词如 "AI"、"政策"、"安全" 等，或公司名如 "Apple"、"Google" 等</span>
      </div>
    </div>
  );
};