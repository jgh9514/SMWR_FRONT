/**
 * 로그 조회 Hooks
 */

import { useApiPostQuery } from '@/hooks/api';
import type { ApiHistoryResponse, LoginHisItem } from '@/types';

/**
 * API 이력 목록 조회
 */
export const useApiHistoryList = (params: Record<string, unknown>, enabled = true) => {
  return useApiPostQuery<ApiHistoryResponse>('/common/sm/api-his', params, { enabled });
};

/**
 * 로그인 이력 목록 조회
 */
export const useLoginHistoryList = (params: Record<string, unknown>, enabled = true) => {
  return useApiPostQuery<LoginHisItem[]>('/common/sm/login-his', params, { enabled });
};

