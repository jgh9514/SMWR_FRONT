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

  private getConsole(): {
    debug?: (...args: unknown[]) => void;
    info?: (...args: unknown[]) => void;
    warn?: (...args: unknown[]) => void;
    error?: (...args: unknown[]) => void;
  } | null {
    if (!this.isDevelopment) return null;
    // eslint/no-console 회피 + 브라우저/노드 모두에서 안전 접근
    const c = (globalThis as unknown as { [key: string]: unknown })['console'] as any;
    if (!c) return null;
    return c;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    // 프로덕션에서는 콘솔 출력 금지 (필요 시 로깅 서비스로 전송하도록 확장)
    const c = this.getConsole();
    if (!c) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    switch (level) {
      case 'debug':
        c.debug?.('[DEBUG]', logEntry);
        break;
      case 'info':
        c.info?.('[INFO]', logEntry);
        break;
      case 'warn':
        c.warn?.('[WARN]', logEntry);
        break;
      case 'error':
        c.error?.('[ERROR]', logEntry);
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

