/**
 * 몬스터 상세 - 섹션별 분리 조회 Hooks (병렬 로딩용)
 * 기본정보 / 추천공덱 / 공성률을 각각 API 호출 후 먼저 도착하는 것부터 표시
 */

import { keepPreviousData } from '@tanstack/react-query';
import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import type {
  MonsterDetailParams,
  MonsterDetailBasicResponse,
  MonsterDetailRecommendedResponse,
  MonsterDetailHistoryResponse,
} from '@/features/siege/types/siegeDetail';

const SHARED_OPTIONS = {
  refetchOnWindowFocus: false,
  placeholderData: keepPreviousData,
} as const;

/** 기본 정보 (enemyData) - 보통 가장 빠르게 응답 */
export const useMonsterDetailBasic = (params: MonsterDetailParams | null) => {
  return useApiPostQuery<MonsterDetailBasicResponse>(
    '/summonerswar/monster-detail-basic',
    params,
    { enabled: !!params, ...SHARED_OPTIONS },
  );
};

/** 추천 공덱 */
export const useMonsterDetailRecommended = (params: MonsterDetailParams | null) => {
  return useApiPostQuery<MonsterDetailRecommendedResponse>(
    '/summonerswar/monster-detail-recommended',
    params,
    { enabled: !!params, ...SHARED_OPTIONS },
  );
};

/** 공성률 이력 */
export const useMonsterDetailHistory = (params: MonsterDetailParams | null) => {
  return useApiPostQuery<MonsterDetailHistoryResponse>(
    '/summonerswar/monster-detail-history',
    params,
    { enabled: !!params, ...SHARED_OPTIONS },
  );
};
