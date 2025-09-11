import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff, Server } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  type?: 'network' | 'server' | 'general';
}

/**
 * 现代化错误信息组件
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  onRetry,
  className = '',
  type = 'general',
}) => {
  const getIcon = () => {
    switch (type) {
      case 'network':
        return <WifiOff className="w-6 h-6 text-red-600" />;
      case 'server':
        return <Server className="w-6 h-6 text-orange-600" />;
      default:
        return <AlertCircle className="w-6 h-6 text-red-600" />;
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'network':
        return '网络连接失败';
      case 'server':
        return '服务暂时不可用';
      default:
        return '出现错误';
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'network':
        return 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200';
      case 'server':
        return 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200';
      default:
        return 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200';
    }
  };

  return (
    <div className={`card border-2 ${getBgColor()} ${className}`}>
      <div className="flex items-start space-x-4">
        {/* 图标区域 */}
        <div className="flex-shrink-0">
          <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-soft">
            {getIcon()}
          </div>
        </div>
        
        {/* 内容区域 */}
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {getTitle()}
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {message}
            </p>
          </div>
          
          {/* 操作按钮 */}
          {onRetry && (
            <div className="flex items-center gap-3">
              <button
                onClick={onRetry}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>重试</span>
              </button>
              
              {/* 额外提示 */}
              <div className="text-xs text-gray-500">
                {type === 'network' && (
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    <span>检查网络连接</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 装饰性背景 */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5 rounded-2xl pointer-events-none" />
    </div>
  );
};