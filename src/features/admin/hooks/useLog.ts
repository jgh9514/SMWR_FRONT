/**
 * 로그 조회 Hooks
 */

import { useApiPostQuery } from '@/hooks/api';
import type { ApiHistoryResponse, LoginHisItem } from '@/types';

/**
 * API 이력 목록 조회
 */
export const useApiHistoryList = (params: Record<string, unknown>, enabled = false) => {
  return useApiPostQuery<ApiHistoryResponse>('/sm/log/api', params, { enabled });
};

/**
 * 로그인 이력 목록 조회
 */
export const useLoginHistoryList = (params: Record<string, unknown>, enabled = false) => {
  return useApiPostQuery<LoginHisItem[]>('/sm/log/login', params, { enabled });
};

