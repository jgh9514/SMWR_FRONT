/**
 * 에러 처리 유틸리티
 */

import { AxiosError } from 'axios';
import { showToast } from './notification';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

/** Spring Boot 기본 에러 JSON: { error, message, path, status } 등 혼재 */
function messageFromResponseData(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data === 'string') {
    const t = data.trim();
    if (!t || t.startsWith('<')) return undefined;
    return t.length > 300 ? `${t.slice(0, 300)}…` : t;
  }
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
    if (typeof o.error === 'string' && o.error.trim()) return o.error.trim();
  }
  return undefined;
}

const GENERIC_SERVER_EN = /^internal server error$/i;

export function handleApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const fromBody = messageFromResponseData(error.response?.data);
    let message =
      fromBody ||
      error.message ||
      '알 수 없는 오류가 발생했습니다.';

    if (status !== undefined && status >= 500) {
      if (GENERIC_SERVER_EN.test(message) || message === 'Request failed with status code 500') {
        message =
          '서버에서 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. (문제가 계속되면 관리자에게 문의)';
      }
    }

    return {
      message,
      status,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: '알 수 없는 오류가 발생했습니다.',
  };
}

export function showApiError(error: unknown): void {
  const apiError = handleApiError(error);
  showToast.error(apiError.message);
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return !error.response || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';
  }
  return false;
}

export function isServerError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    return status !== undefined && status >= 500;
  }
  return false;
}

export function isClientError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    return status !== undefined && status >= 400 && status < 500;
  }
  return false;
}

