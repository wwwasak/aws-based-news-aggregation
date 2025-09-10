import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * 错误信息组件
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = '出错了',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`card border-red-200 bg-red-50 ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-medium text-red-900">{title}</h3>
          <p className="text-red-700">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              <span>重试</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
