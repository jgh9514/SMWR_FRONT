/**
 * 보안 관련 유틸리티 함수
 */

/**
 * 입력값 sanitization (XSS 방지)
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // HTML 태그 제거
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * 파일 확장자 검증
 */
export function isValidFileExtension(
  filename: string,
  allowedExtensions: string[]
): boolean {
  const extension = filename.toLowerCase().split('.').pop();
  return extension ? allowedExtensions.includes(extension) : false;
}

/**
 * 파일 크기 검증 (바이트 단위)
 */
export function isValidFileSize(fileSize: number, maxSizeBytes: number): boolean {
  return fileSize > 0 && fileSize <= maxSizeBytes;
}

/**
 * 파일 타입 검증 (MIME type)
 */
export function isValidFileType(file: File, allowedMimeTypes: string[]): boolean {
  return allowedMimeTypes.includes(file.type);
}

/**
 * 파일 업로드 검증 (종합)
 */
export interface FileValidationOptions {
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
}

export function validateFile(
  file: File,
  options: FileValidationOptions
): { valid: boolean; error?: string } {
  const {
    allowedExtensions = [],
    allowedMimeTypes = [],
    maxSizeBytes = 10 * 1024 * 1024, // 기본 10MB
  } = options;

  // 파일명 검증
  if (allowedExtensions.length > 0) {
    if (!isValidFileExtension(file.name, allowedExtensions)) {
      return {
        valid: false,
        error: `허용되지 않은 파일 형식입니다. 허용 형식: ${allowedExtensions.join(', ')}`,
      };
    }
  }

  // MIME type 검증
  if (allowedMimeTypes.length > 0) {
    if (!isValidFileType(file, allowedMimeTypes)) {
      return {
        valid: false,
        error: `허용되지 않은 파일 타입입니다.`,
      };
    }
  }

  // 파일 크기 검증
  if (!isValidFileSize(file.size, maxSizeBytes)) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. 최대 크기: ${maxSizeMB}MB`,
    };
  }

  // 파일명에 위험한 문자 검증
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(file.name)) {
    return {
      valid: false,
      error: '파일명에 허용되지 않은 문자가 포함되어 있습니다.',
    };
  }

  return { valid: true };
}

/**
 * Rate Limiting 유틸리티
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    // 매직 넘버는 상수로 관리 (기본값만 여기서 사용)
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * 요청이 허용되는지 확인만 (카운트 증가 안 함)
   * @param key 요청자 식별 키 (예: IP, user_id)
   * @returns 허용 여부
   */
  checkIsAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter((time) => now - time < this.windowMs);
    return validRequests.length < this.maxRequests;
  }

  /**
   * 요청을 기록 (실제 API 호출 시에만 사용)
   * @param key 요청자 식별 키
   */
  recordRequest(key: string): void {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter((time) => now - time < this.windowMs);
    validRequests.push(now);
    this.requests.set(key, validRequests);
  }

  /**
   * 요청이 허용되는지 확인하고 기록 (기존 호환성 유지)
   * @param key 요청자 식별 키 (예: IP, user_id)
   * @returns 허용 여부
   */
  isAllowed(key: string): boolean {
    if (this.checkIsAllowed(key)) {
      this.recordRequest(key);
      return true;
    }
    return false;
  }

  /**
   * 남은 요청 수 반환
   */
  getRemainingRequests(key: string): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter((time) => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * 특정 키의 요청 기록 초기화
   */
  reset(key: string): void {
    this.requests.delete(key);
  }
}

// 전역 Rate Limiter 인스턴스
// 개발 환경: 1분에 20회, 프로덕션: 1분에 5회
const isDevelopment = process.env.NODE_ENV === 'development';
export const rateLimiter = new RateLimiter(
  isDevelopment ? 20 : 5, 
  isDevelopment ? 60000 : 60000
);

/**
 * URL 검증 (XSS 방지)
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // 허용된 프로토콜만
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    return allowedProtocols.includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

/**
 * SQL Injection 방지를 위한 입력값 검증
 */
export function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
    /(--|#|\/\*|\*\/|;|\||&)/,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]\w+['"]\s*=\s*['"]\w+['"])/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * 민감 정보 마스킹
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }
  const visible = data.slice(-visibleChars);
  return '*'.repeat(data.length - visibleChars) + visible;
}

