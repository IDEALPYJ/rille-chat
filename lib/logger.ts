type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

const isProd = process.env.NODE_ENV === 'production';
const isDebugEnabled = process.env.DEBUG === 'true' || process.env.LOG_LEVEL === 'debug';

/**
 * 格式化日志输出
 */
function formatLog(level: LogLevel, message: string, context?: LogContext) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  if (isProd) {
    // 生产环境输出 JSON 格式，便于日志采集系统（如 ELK, CloudWatch）解析
    return JSON.stringify(logEntry);
  } else {
    // 开发环境输出易读格式
    const { timestamp, level: _, message: msg, ...rest } = logEntry;
    const contextStr = Object.keys(rest).length > 0 
      ? `\nContext: ${JSON.stringify(rest, null, 2)}` 
      : '';
    
    // 使用颜色（在支持的终端中）
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m'
    };
    
    const color = colors[level] || colors.reset;
    return `${timestamp} ${color}[${level.toUpperCase()}]${colors.reset} ${msg}${contextStr}`;
  }
}

/**
 * 结构化日志工具
 */
export const logger = {
  debug: (message: string, context?: LogContext) => {
    // 只在开发环境或显式启用 debug 时输出
    if (!isProd || isDebugEnabled) {
      console.log(formatLog('debug', message, context));
    }
  },

  info: (message: string, context?: LogContext) => {
    console.log(formatLog('info', message, context));
  },
  
  warn: (message: string, context?: LogContext) => {
    console.warn(formatLog('warn', message, context));
  },
  
  error: (message: string, error?: any, context?: LogContext) => {
    let errorInfo: any = {};
    
    if (error instanceof Error) {
      errorInfo = {
        errorName: error.name,
        errorMessage: error.message,
        stack: isProd ? undefined : error.stack,
      };
    } else if (error) {
      errorInfo = { error };
    }

    console.error(formatLog('error', message, { ...errorInfo, ...context }));
  },
};
