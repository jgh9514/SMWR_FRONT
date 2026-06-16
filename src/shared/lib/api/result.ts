import type { ApiResult } from '@/features/auth/types/auth';

/** 백엔드 ApiResult 성공 여부 (응답 unwrap·null data 등에 안전) */
export function isApiSuccess(res: unknown): res is ApiResult {
  if (res == null || typeof res !== 'object') {
    return false;
  }
  const result = (res as ApiResult).result;
  return String(result ?? '').toUpperCase() === 'SUCCESS';
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
