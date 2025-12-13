/**
 * 몬스터 상세 조회 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { MonsterDetailResponse, MonsterDetailParams } from '@/types';

/**
 * 몬스터 상세 정보 조회
 */
export const useMonsterDetail = (params: MonsterDetailParams | null) => {
  return useApiPostQuery<MonsterDetailResponse>('/summonerswar/monster-detail-list', params, {
    enabled: !!params,
    placeholderData: (previousData) => previousData, // 이전 데이터 유지 (페이지네이션 시 깜빡임 방지)
    refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 리프레시 방지
  });
};

