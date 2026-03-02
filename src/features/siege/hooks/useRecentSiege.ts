/**
 * 최근 점령전 조회 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import type { SiegeListResponse, SiegeListParams, SiegeItem } from '@/types';

/**
 * 최근 점령전 목록 조회
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

