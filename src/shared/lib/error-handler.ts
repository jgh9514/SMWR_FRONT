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

export function handleApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || '알 수 없는 오류가 발생했습니다.';

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

