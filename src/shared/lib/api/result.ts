import type { ApiResult } from '@/features/auth/types/auth';

/** 백엔드 ApiResult 성공 여부 (응답 unwrap·null data 등에 안전) */
export function isApiSuccess(res: unknown): res is ApiResult {
  if (res == null || typeof res !== 'object') {
    return false;
  }
  const result = (res as ApiResult).result;
  return String(result ?? '').toUpperCase() === 'SUCCESS';
}

/** 문자열 SUCCESS 또는 ApiResult SUCCESS (공덱 저장 등 레거시 API) */
export function isPlainApiSuccess(res: unknown, expected = 'SUCCESS'): boolean {
  if (typeof res === 'string') {
    return res.toUpperCase() === expected.toUpperCase();
  }
  return isApiSuccess(res);
}

/** `{ result, data }` 래퍼에서 payload 추출 (목록 조회 등) */
export function unwrapApiData<T>(res: unknown): T {
  if (res != null && typeof res === 'object' && 'data' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

export function getApiResultMessage(res: unknown, fallback: string): string {
  if (res != null && typeof res === 'object' && 'message' in res) {
    const message = (res as ApiResult).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}
