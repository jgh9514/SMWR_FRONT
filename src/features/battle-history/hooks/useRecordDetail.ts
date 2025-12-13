/**
 * 전적 상세 조회 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { BattleItem, RecordDetailParams } from '@/types';

/**
 * 전적 상세 조회
 */
export const useRecordDetail = (params: RecordDetailParams | null) => {
  return useApiPostQuery<BattleItem[]>('/summonerswar/record-detail', params, {
    enabled: !!params,
  });
};

