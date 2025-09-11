import React, { useState, useEffect, useCallback } from 'react';
import { Newspaper, Wifi, WifiOff, Sparkles, TrendingUp, Clock } from 'lucide-react';
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
 * 现代化主应用程序组件
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* 现代化顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-soft border-b border-gray-200/50">
        <div className="container-modern">
          <div className="flex items-center justify-between h-20">
            {/* Logo区域 */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="p-3 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl shadow-glow">
                  <Newspaper className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-success-500 rounded-full border-2 border-white animate-pulse" />
              </div>
      <div>
                <h1 className="text-2xl font-bold text-gradient-hero">科技新闻聚合</h1>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  实时科技资讯，智能分类推荐
                </p>
              </div>
            </div>
            
            {/* 状态指示器 */}
            <div className="flex items-center space-x-4">
              {/* 网络状态 */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl ${
                isOnline ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'
              }`}>
                {isOnline ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {isOnline ? '在线' : '离线'}
                </span>
              </div>
              
              {/* 实时更新指示器 */}
              <div className="flex items-center space-x-2 px-3 py-2 bg-primary-50 text-primary-700 rounded-xl">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">实时更新</span>
              </div>
            </div>
          </div>
      </div>
      </header>

      {/* 主要内容区域 */}
      <main className="container-modern py-8">
        <div className="space-y-8">
          {/* 搜索区域 */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                发现最新科技动态
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                智能聚合全球科技新闻，为您提供最及时、最相关的科技资讯
        </p>
      </div>
            
            <div className="max-w-3xl mx-auto">
              <SearchBar
                onSearch={handleSearch}
                onClear={handleClearSearch}
                isLoading={loading}
                placeholder="搜索AI、政策、安全等关键词..."
              />
            </div>
          </div>

          {/* 分类筛选区域 */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 shadow-soft border border-gray-200/50">
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>

          {/* 状态信息区域 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-primary-600" />
                <span>
                  {isSearchMode ? (
                    <>搜索 "<span className="font-semibold text-primary-600">{searchQuery}</span>" 的结果</>
                  ) : (
                    '最新科技新闻'
                  )}
                </span>
                <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                  {filteredArticles.length} 条
                </span>
              </div>
            </div>
            
            {!isOnline && (
              <div className="flex items-center gap-2 px-3 py-2 bg-warning-50 text-warning-700 rounded-xl border border-warning-200">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">离线模式：显示缓存内容</span>
              </div>
            )}
          </div>

          {/* 新闻列表区域 */}
          <div className="space-y-6">
            {loading ? (
              <div className="py-16">
                <LoadingSpinner size="xl" variant="news" />
              </div>
            ) : error ? (
              <ErrorMessage
                message={error}
                onRetry={isOnline ? handleRetry : undefined}
                type={isOnline ? 'server' : 'network'}
                className="max-w-2xl mx-auto"
              />
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="relative">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-r from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center">
                      <Newspaper className="w-12 h-12 text-gray-400" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary-600" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {isSearchMode ? '没有找到相关新闻' : '暂无新闻'}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {isSearchMode 
                        ? '尝试使用不同的关键词搜索，或者清除搜索查看所有新闻'
                        : '请稍后再试，或检查网络连接'
                      }
                    </p>
                  </div>
                  
                  {isSearchMode && (
                    <button
                      onClick={handleClearSearch}
                      className="btn-primary"
                    >
                      查看所有新闻
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* 新闻卡片网格 */}
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
                  {filteredArticles.map((article, index) => (
                    <div
                      key={`${article.id}-${index}`}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <NewsCard article={article} />
                    </div>
                  ))}
                </div>

                {/* 加载更多按钮 */}
                {hasMore && (
                  <div className="text-center py-8">
                    {loadingMore ? (
                      <LoadingSpinner variant="news" text="加载更多新闻..." />
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

      {/* 现代化底部 */}
      <footer className="mt-16 bg-white/60 backdrop-blur-sm border-t border-gray-200/50">
        <div className="container-modern py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">科技新闻聚合平台</span>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <p>数据来源于各大科技媒体 • 实时更新 • 智能分类</p>
              <p className="flex items-center justify-center gap-4">
                <span>支持全文搜索</span>
                <span>•</span>
                <span>智能分类</span>
                <span>•</span>
                <span>响应式设计</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;