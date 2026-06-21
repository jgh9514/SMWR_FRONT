import type { ApiResult } from '@/features/auth/types/auth';

function isSuccessResultCode(code: string): boolean {
  const upper = code.trim().toUpperCase();
  return upper === 'SUCCESS' || upper === 'OK';
}

function isFailureResultCode(code: string): boolean {
  const upper = code.trim().toUpperCase();
  return upper === 'FAIL' || upper === 'FAILED' || upper === 'ERROR';
}

function readResultCode(res: unknown): string {
  if (res == null) {
    return '';
  }
  if (typeof res === 'string') {
    return res.trim();
  }
  if (typeof res === 'object' && 'result' in res) {
    const result = (res as { result?: unknown }).result;
    if (result === true) {
      return 'SUCCESS';
    }
    if (result === false) {
      return 'FAIL';
    }
    return result == null ? '' : String(result).trim();
  }
  return '';
}

/**
 * `{ data: { result, message } }` 이중 래핑·plain string 등 레거시 응답 정규화.
 * `{ result, data }` 목록 래퍼는 그대로 둔다(data 안의 result로 내리지 않음).
 */
export function normalizeApiResponse(res: unknown): unknown {
  if (res == null || typeof res !== 'object' || Array.isArray(res)) {
    return res;
  }

  const obj = res as Record<string, unknown>;
  if ('result' in obj || 'success' in obj) {
    return res;
  }

  const data = obj.data;
  if (typeof data === 'string') {
    const upper = data.trim().toUpperCase();
    if (upper === 'SUCCESS' || upper === 'FAIL') {
      return data;
    }
  }
  if (data != null && typeof data === 'object' && !Array.isArray(data) && ('result' in data || 'success' in data)) {
    return data;
  }

  return res;
}

/** 백엔드 ApiResult·plain "SUCCESS"·{ success: true }·레거시 식별자 문자열 등 공통 성공 판별 */
export function isApiSuccess(res: unknown): res is ApiResult {
  const normalized = normalizeApiResponse(res);
  if (typeof normalized === 'string') {
    if (isSuccessResultCode(normalized)) {
      return true;
    }
    if (isFailureResultCode(normalized)) {
      return false;
    }
    // 레거시: /sm/user/save 등 HTTP 200 + user_id 문자열만 반환
    return normalized.trim().length > 0;
  }
  if (normalized == null || typeof normalized !== 'object' || Array.isArray(normalized)) {
    return false;
  }
  const obj = normalized as Record<string, unknown>;
  if ('success' in obj) {
    return obj.success === true;
  }
  if ('ok' in obj && typeof obj.ok === 'boolean') {
    return obj.ok === true;
  }
  if ('rslt_cd' in obj) {
    const cd = String(obj.rslt_cd ?? '').trim().toUpperCase();
    if (cd === 'SUCCESS') {
      return true;
    }
    if (cd === 'FAIL') {
      return false;
    }
  }
  const code = readResultCode(normalized);
  if (isSuccessResultCode(code)) {
    return true;
  }
  if (isFailureResultCode(code)) {
    return false;
  }
  return false;
}

export function isApiFailure(res: unknown): boolean {
  return !isApiSuccess(res);
}

/** mutation onSuccess — 실패 시 Error throw (mutateAsync catch용) */
export function requireApiSuccess(res: unknown, fallback: string): void {
  if (!isApiSuccess(res)) {
    throw new Error(getApiResultMessage(res, fallback));
  }
}

/** @deprecated isApiSuccess와 동일 — 기존 호출부 호환 */
export function isPlainApiSuccess(res: unknown, expected = 'SUCCESS'): boolean {
  if (isApiSuccess(res)) {
    return true;
  }
  return typeof res === 'string' && res.toUpperCase() === expected.toUpperCase();
}

/** `{ result, data }` 래퍼에서 payload 추출 (목록·페이지 조회 등) */
export function unwrapApiData<T>(res: unknown): T {
  const normalized = normalizeApiResponse(res);
  if (
    normalized != null &&
    typeof normalized === 'object' &&
    !Array.isArray(normalized) &&
    'data' in normalized &&
    (normalized as { data?: unknown }).data !== undefined
  ) {
    return (normalized as { data: T }).data;
  }
  if (res != null && typeof res === 'object' && 'data' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

export function getApiResultMessage(res: unknown, fallback: string): string {
  const normalized = normalizeApiResponse(res);
  if (normalized != null && typeof normalized === 'object' && !Array.isArray(normalized) && 'message' in normalized) {
    const message = (normalized as ApiResult).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  if (
    normalized != null &&
    typeof normalized === 'object' &&
    !Array.isArray(normalized) &&
    'success' in normalized &&
    (normalized as { success?: boolean }).success === false &&
    'message' in normalized
  ) {
    const message = (normalized as { message?: string }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}
