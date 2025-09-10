import React, { useState, useEffect, useCallback } from 'react';
import { Newspaper, Wifi, WifiOff } from 'lucide-react';
import { 
  NewsCard, 
  SearchBar, 
  CategoryFilter, 
  LoadingSpinner, 
  ErrorMessage 
} from './components';
import { NewsApiService, ApiError } from './services/api';
import type { NewsArticle, CategoryId } from './types';

/**
 * 主应用程序组件
 */
function App() {
  // 状态管理
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 网络状态监听
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * 加载BigTech新闻
   */
  const loadBigTechNews = useCallback(async (cursor?: string, append = false) => {
    try {
      if (!append) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const response = await NewsApiService.getBigTechNews({
        limit: 20,
        cursor,
      });

      if (response.success && response.data) {
        if (append) {
          setArticles(prev => [...prev, ...response.data!]);
        } else {
          setArticles(response.data);
        }
        setNextCursor(response.pagination?.nextCursor);
        setHasMore(response.pagination?.hasMore || false);
      } else {
        throw new Error(response.error?.message || '获取新闻失败');
      }
    } catch (err) {
      console.error('Error loading BigTech news:', err);
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : '网络连接失败，请检查网络设置';
      
      if (!append) {
        setError(errorMessage);
        setArticles([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  /**
   * 搜索新闻
   */
  const searchNews = useCallback(async (query: string, cursor?: string, append = false) => {
    try {
      if (!append) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const response = await NewsApiService.searchNews({
        q: query,
        limit: 20,
        cursor,
      });

      if (response.success && response.data) {
        if (append) {
          setArticles(prev => [...prev, ...response.data!]);
        } else {
          setArticles(response.data);
        }
        setNextCursor(response.pagination?.nextCursor);
        setHasMore(response.pagination?.hasMore || false);
      } else {
        throw new Error(response.error?.message || '搜索失败');
      }
    } catch (err) {
      console.error('Error searching news:', err);
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : '搜索失败，请检查网络设置';
      
      if (!append) {
        setError(errorMessage);
        setArticles([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  /**
   * 处理搜索
   */
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearchMode(true);
    setSelectedCategory('all');
    searchNews(query);
  }, [searchNews]);

  /**
   * 清除搜索
   */
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearchMode(false);
    setSelectedCategory('all');
    loadBigTechNews();
  }, [loadBigTechNews]);

  /**
   * 处理分类变更
   */
  const handleCategoryChange = useCallback((category: CategoryId) => {
    setSelectedCategory(category);
    if (isSearchMode) {
      // 在搜索模式下，分类变更会过滤搜索结果
      return;
    }
    // 目前只支持BigTech新闻，后续可扩展其他分类
    loadBigTechNews();
  }, [isSearchMode, loadBigTechNews]);

  /**
   * 加载更多新闻
   */
  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;

    if (isSearchMode && searchQuery) {
      searchNews(searchQuery, nextCursor, true);
    } else {
      loadBigTechNews(nextCursor, true);
    }
  }, [hasMore, loadingMore, isSearchMode, searchQuery, nextCursor, searchNews, loadBigTechNews]);

  /**
   * 重试加载
   */
  const handleRetry = useCallback(() => {
    if (isSearchMode && searchQuery) {
      searchNews(searchQuery);
    } else {
      loadBigTechNews();
    }
  }, [isSearchMode, searchQuery, searchNews, loadBigTechNews]);

  /**
   * 过滤文章（按分类）
   */
  const filteredArticles = React.useMemo(() => {
    if (selectedCategory === 'all') {
      return articles;
    }
    
    return articles.filter(article => 
      article.tags.some(tag => 
        tag.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        (selectedCategory === 'tech' && (tag.toLowerCase().includes('technology') || tag.toLowerCase().includes('bigtech'))) ||
        (selectedCategory === 'bigtech' && tag.toLowerCase().includes('tech'))
      )
    );
  }, [articles, selectedCategory]);

  // 初始加载
  useEffect(() => {
    loadBigTechNews();
  }, [loadBigTechNews]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Newspaper className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">科技新闻聚合</h1>
                <p className="text-xs text-gray-500">实时科技资讯，智能分类推荐</p>
              </div>
            </div>
            
            {/* 网络状态指示器 */}
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs">在线</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-600">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-xs">离线</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* 搜索栏 */}
          <SearchBar
            onSearch={handleSearch}
            onClear={handleClearSearch}
            isLoading={loading}
            className="max-w-2xl mx-auto"
          />

          {/* 分类筛选 */}
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />

          {/* 当前状态显示 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isSearchMode ? (
                <span>搜索 "{searchQuery}" 的结果，共 {filteredArticles.length} 条</span>
              ) : (
                <span>最新科技新闻，共 {filteredArticles.length} 条</span>
              )}
            </div>
            {!isOnline && (
              <div className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                离线模式：显示缓存内容
              </div>
            )}
          </div>

          {/* 新闻列表 */}
          <div className="space-y-6">
            {loading ? (
              <LoadingSpinner size="lg" text="正在加载新闻..." className="py-12" />
            ) : error ? (
              <ErrorMessage
                message={error}
                onRetry={isOnline ? handleRetry : undefined}
                className="max-w-2xl mx-auto"
              />
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <Newspaper className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {isSearchMode ? '没有找到相关新闻' : '暂无新闻'}
                </h3>
                <p className="text-gray-600">
                  {isSearchMode 
                    ? '尝试使用不同的关键词搜索，或者清除搜索查看所有新闻'
                    : '请稍后再试，或检查网络连接'
                  }
                </p>
                {isSearchMode && (
                  <button
                    onClick={handleClearSearch}
                    className="mt-4 btn-primary"
                  >
                    查看所有新闻
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* 新闻卡片列表 */}
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
                  {filteredArticles.map((article, index) => (
                    <NewsCard
                      key={`${article.id}-${index}`}
                      article={article}
                      className="animate-fade-in"
                    />
                  ))}
      </div>

                {/* 加载更多按钮 */}
                {hasMore && (
                  <div className="text-center py-6">
                    {loadingMore ? (
                      <LoadingSpinner text="加载更多..." />
                    ) : (
                      <button
                        onClick={handleLoadMore}
                        disabled={!isOnline}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        加载更多新闻
        </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* 底部信息 */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>科技新闻聚合平台 · 数据来源于各大科技媒体 · 实时更新</p>
            <p className="mt-1">
              支持全文搜索 · 智能分类 · 响应式设计
        </p>
      </div>
        </div>
      </footer>
    </div>
  );
}

export default App;