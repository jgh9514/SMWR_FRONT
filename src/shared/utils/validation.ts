/**
 * 유효성 검사 유틸리티
 */

import { containsSqlInjection } from './security';

// Re-export for convenience
export { containsSqlInjection };

/**
 * 이메일 유효성 검사
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 숫자만 포함하는지 확인
 */
export function isNumeric(value: string): boolean {
  return /^[0-9]*$/.test(value);
}

/**
 * 최소/최대 길이 검사
 */
export function isValidLength(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max;
}

/**
 * URL 유효성 검사
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 필수 필드 검사
 */
export function validateRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/**
 * 비밀번호 강도 검사 (국제 표준 중간 수준)
 * 최소 8자 이상, 대문자, 소문자, 숫자, 특수문자 포함
 * SQL Injection 패턴 검사 포함
 */
export function isValidPassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('대문자가 포함되어야 합니다.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('소문자가 포함되어야 합니다.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('숫자가 포함되어야 합니다.');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('특수문자가 포함되어야 합니다.');
  }

  // SQL Injection 패턴 검사
  if (containsSqlInjection(password)) {
    errors.push('비밀번호에 허용되지 않은 문자가 포함되어 있습니다.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 사용자 입력값 검증 및 sanitization
 */
export function validateAndSanitizeInput(input: string, maxLength?: number): string {
  if (!input) return '';
  
  // 길이 제한
  let sanitized = input.trim();
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // SQL Injection 검사
  if (containsSqlInjection(sanitized)) {
    throw new Error('입력값에 허용되지 않은 문자가 포함되어 있습니다.');
  }
  
  return sanitized;
}

