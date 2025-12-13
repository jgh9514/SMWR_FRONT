/**
 * 최근 점령전 조회 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import type { SiegeListResponse, SiegeListParams, SiegeItem } from '@/types';

/**
 * 최근 점령전 목록 조회
 * @deprecated SpringBoot 컨트롤러에 해당 엔드포인트가 없습니다. API 추가 필요
 * 현재는 /summonerswar/guild-siege-history를 사용할 수 있습니다.
 */
export const useRecentSiegeList = (params: SiegeListParams) => {
  return useApiPostQuery<SiegeListResponse>('/summonerswar/recent-siege-list', params, {
    enabled: true,
  });
};

/**
 * 점령전 이력 목록 조회 (기존 사용 API)
 */
export const useGuildSiegeHistory = (params: Record<string, unknown>, enabled = true) => {
  return useApiPostQuery<SiegeItem[]>('/summonerswar/guild-siege-history', params, {
    enabled,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

/**
 * 점령전 이력 총 건수 조회
 */
export const useGuildSiegeHistoryCount = (params: Record<string, unknown>, enabled = true) => {
  return useApiPostQuery<number>('/summonerswar/guild-siege-history-count', params, {
    enabled,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

