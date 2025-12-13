/**
 * 로깅 유틸리티
 * 프로덕션 환경에서는 console.log를 제거하거나 로깅 서비스로 전송
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.isDevelopment && level === 'debug') {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    switch (level) {
      case 'debug':
        console.debug('[DEBUG]', logEntry);
        break;
      case 'info':
        console.info('[INFO]', logEntry);
        break;
      case 'warn':
        console.warn('[WARN]', logEntry);
        break;
      case 'error':
        console.error('[ERROR]', logEntry);
        break;
    }

    // 프로덕션 환경에서는 로깅 서비스로 전송
    // if (process.env.NODE_ENV === 'production') {
    //   this.sendToLoggingService(logEntry);
    // }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };
    this.log('error', message, errorContext);
  }
}

export const logger = new Logger();

