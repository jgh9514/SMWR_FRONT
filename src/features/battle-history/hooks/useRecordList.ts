/**
 * 전적 목록 조회 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { UserItem, RecordListParams } from '@/types';

/**
 * 전적 목록 조회
 */
export const useRecordList = (params: RecordListParams) => {
  return useApiPostQuery<UserItem[]>('/summonerswar/record-list', params, { enabled: true });
};

