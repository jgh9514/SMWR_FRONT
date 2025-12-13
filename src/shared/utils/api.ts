/**
 * API 유틸리티 (하위 호환성을 위한 래퍼)
 * @deprecated useApiPostMutation, useApiPostQuery 또는 apiClient를 사용하세요
 */

import { apiClient } from '@/shared/lib/api/client';

/**
 * POST 요청 (하위 호환성)
 * @deprecated useApiPostMutation 또는 apiClient.post를 사용하세요
 */
export const apiPost = async <T = unknown>(url: string, body?: unknown): Promise<T> => {
  return apiClient.post<T>(url, body);
};

