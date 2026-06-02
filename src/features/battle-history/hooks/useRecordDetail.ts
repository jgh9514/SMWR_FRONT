/**
 * 전적 상세 조회 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { QUERY_STALE_TIME_MS } from '@/shared/constants';
import { BattleItem, RecordDetailParams } from '@/types';

/**
 * 전적 상세 조회
 */
export const useRecordDetail = (params: RecordDetailParams | null) => {
  return useApiPostQuery<BattleItem[]>('/summonerswar/record-detail', params, {
    enabled: !!params,
    staleTime: QUERY_STALE_TIME_MS,
  });
};

