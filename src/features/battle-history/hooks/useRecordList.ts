/**
 * 전적 목록 조회 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { QUERY_STALE_TIME_MS } from '@/shared/constants';
import { UserItem, RecordListParams } from '@/types';

/**
 * 전적 목록 조회
 */
export const useRecordList = (params: RecordListParams, enabled = true) => {
  return useApiPostQuery<UserItem[]>('/summonerswar/record-list', params, {
    enabled,
    staleTime: QUERY_STALE_TIME_MS,
  });
};

