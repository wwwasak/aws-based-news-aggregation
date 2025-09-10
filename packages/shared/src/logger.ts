/**
 * 统一日志系统 - 基于 pino 的结构化 JSON 日志
 */

import pino from 'pino';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  level?: LogLevel;
  name?: string;
  environment?: string;
  service?: string;
  version?: string;
}

/**
 * 获取日志级别
 */
function getLogLevel(): LogLevel {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
  const validLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  
  if (validLevels.includes(level as LogLevel)) {
    return level as LogLevel;
  }
  
  return 'info';
}

/**
 * 获取运行环境
 */
function getEnvironment(): string {
  return process.env.NODE_ENV || process.env.ENVIRONMENT || 'development';
}

/**
 * 判断是否为 Lambda 环境
 */
function isLambdaEnvironment(): boolean {
  return !!(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_RUNTIME_DIR);
}

/**
 * 创建 pino 日志器实例
 */
function createPinoLogger(config: LoggerConfig = {}): pino.Logger {
  const environment = getEnvironment();
  const isProduction = environment === 'production';
  const isLambda = isLambdaEnvironment();

  // Lambda 环境配置
  const lambdaConfig: pino.LoggerOptions = {
    level: config.level || getLogLevel(),
    base: {
      service: config.service || 'news-aggregator',
      version: config.version || '1.0.0',
      environment,
      ...(config.name && { name: config.name }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      log: (object) => object,
    },
  };

  // 本地开发环境配置
  const developmentConfig: pino.LoggerOptions = {
    ...lambdaConfig,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
        messageFormat: '{service}[{name}]: {msg}',
        levelFirst: true,
      },
    },
  };

  return pino(isLambda || isProduction ? lambdaConfig : developmentConfig);
}

/**
 * 日志器类
 */
export class Logger {
  private pino: pino.Logger;
  private context: Record<string, any> = {};

  constructor(config: LoggerConfig = {}) {
    this.pino = createPinoLogger(config);
  }

  /**
   * 设置上下文信息
   */
  setContext(context: Record<string, any>): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * 清空上下文
   */
  clearContext(): this {
    this.context = {};
    return this;
  }

  /**
   * 创建子日志器
   */
  child(bindings: Record<string, any>): Logger {
    const childLogger = new Logger();
    childLogger.pino = this.pino.child(bindings);
    childLogger.context = { ...this.context };
    return childLogger;
  }

  /**
   * Trace 级别日志
   */
  trace(message: string, data?: Record<string, any>): void;
  trace(data: Record<string, any>, message?: string): void;
  trace(messageOrData: string | Record<string, any>, data?: Record<string, any> | string): void {
    this.log('trace', messageOrData, data);
  }

  /**
   * Debug 级别日志
   */
  debug(message: string, data?: Record<string, any>): void;
  debug(data: Record<string, any>, message?: string): void;
  debug(messageOrData: string | Record<string, any>, data?: Record<string, any> | string): void {
    this.log('debug', messageOrData, data);
  }

  /**
   * Info 级别日志
   */
  info(message: string, data?: Record<string, any>): void;
  info(data: Record<string, any>, message?: string): void;
  info(messageOrData: string | Record<string, any>, data?: Record<string, any> | string): void {
    this.log('info', messageOrData, data);
  }

  /**
   * Warn 级别日志
   */
  warn(message: string, data?: Record<string, any>): void;
  warn(data: Record<string, any>, message?: string): void;
  warn(messageOrData: string | Record<string, any>, data?: Record<string, any> | string): void {
    this.log('warn', messageOrData, data);
  }

  /**
   * Error 级别日志
   */
  error(message: string, error?: Error | Record<string, any>): void;
  error(error: Error, message?: string): void;
  error(data: Record<string, any>, message?: string): void;
  error(messageOrError: string | Error | Record<string, any>, errorOrMessage?: Error | Record<string, any> | string): void {
    this.log('error', messageOrError, errorOrMessage);
  }

  /**
   * Fatal 级别日志
   */
  fatal(message: string, error?: Error | Record<string, any>): void;
  fatal(error: Error, message?: string): void;
  fatal(data: Record<string, any>, message?: string): void;
  fatal(messageOrError: string | Error | Record<string, any>, errorOrMessage?: Error | Record<string, any> | string): void {
    this.log('fatal', messageOrError, errorOrMessage);
  }

  /**
   * 统一日志处理
   */
  private log(
    level: LogLevel,
    messageOrData: string | Error | Record<string, any>,
    data?: Record<string, any> | string | Error
  ): void {
    let message: string;
    let logData: Record<string, any> = { ...this.context };

    // 解析参数
    if (typeof messageOrData === 'string') {
      message = messageOrData;
      if (data) {
        if (data instanceof Error) {
          logData.error = {
            name: data.name,
            message: data.message,
            stack: data.stack,
            cause: data.cause,
          };
        } else if (typeof data === 'object') {
          logData = { ...logData, ...data };
        }
      }
    } else if (messageOrData instanceof Error) {
      message = data && typeof data === 'string' ? data : messageOrData.message;
      logData.error = {
        name: messageOrData.name,
        message: messageOrData.message,
        stack: messageOrData.stack,
        cause: messageOrData.cause,
      };
    } else {
      // messageOrData is Record<string, any>
      message = (data && typeof data === 'string') ? data : 'Log entry';
      logData = { ...logData, ...messageOrData };
    }

    // 发送日志
    this.pino[level](logData, message);
  }

  /**
   * 记录性能指标
   */
  metric(name: string, value: number, unit: string = 'count', tags?: Record<string, string>): void {
    this.info('metric', {
      metric: {
        name,
        value,
        unit,
        tags: tags || {},
        timestamp: Date.now(),
      },
    });
  }

  /**
   * 记录业务事件
   */
  event(name: string, data?: Record<string, any>): void {
    this.info('event', {
      event: {
        name,
        data: data || {},
        timestamp: Date.now(),
      },
    });
  }

  /**
   * 记录请求开始
   */
  requestStart(requestId: string, method?: string, path?: string): void {
    this.info('request_start', {
      request: {
        id: requestId,
        method,
        path,
        startTime: Date.now(),
      },
    });
  }

  /**
   * 记录请求结束
   */
  requestEnd(
    requestId: string,
    statusCode?: number,
    duration?: number,
    error?: Error
  ): void {
    const logData: Record<string, any> = {
      request: {
        id: requestId,
        statusCode,
        duration,
        endTime: Date.now(),
      },
    };

    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      this.error('request_end', logData);
    } else {
      this.info('request_end', logData);
    }
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): string {
    return this.pino.level;
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.pino.level = level;
  }

  /**
   * 检查是否启用了指定级别
   */
  isLevelEnabled(level: LogLevel): boolean {
    return this.pino.isLevelEnabled(level);
  }
}

/**
 * 默认日志器实例
 */
export const logger = new Logger({
  service: 'news-aggregator',
  version: '1.0.0',
});

/**
 * 创建命名日志器
 */
export function createLogger(name: string, config?: Omit<LoggerConfig, 'name'>): Logger {
  return new Logger({
    name,
    service: 'news-aggregator',
    version: '1.0.0',
    ...config,
  });
}

/**
 * Lambda 函数日志器工厂
 */
export function createLambdaLogger(functionName: string): Logger {
  return createLogger(functionName, {
    environment: process.env.NODE_ENV || 'production',
  });
}

/**
 * 测试环境日志器
 */
export function createTestLogger(): Logger {
  return new Logger({
    level: 'silent' as LogLevel,
    name: 'test',
  });
}

/**
 * 日志中间件 (用于 Express 等)
 */
export function loggerMiddleware() {
  return (req: any, res: any, next: any) => {
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    req.logger = logger.child({ requestId });
    req.logger.requestStart(requestId, req.method, req.path);

    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = Date.now() - startTime;
      req.logger.requestEnd(requestId, res.statusCode, duration);
      originalEnd.apply(res, args);
    };

    next();
  };
}

export default logger;


