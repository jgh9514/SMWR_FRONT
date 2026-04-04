/**
 * RTA 데이터 조회 Hook
 * 
 * 백엔드 컨트롤러: /api/v1/rta
 * - /stats: RTA 통계 조회
 * - /matches/count: RTA 매치 수 조회
 * - /matches: RTA 매치 목록 조회
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { RtaStatsResponse, RtaMatchCountResponse, RtaMatchesResponse, RtaMatchListParams } from '@/types';
import type {
  MonsterDetail,
  RtaDashboardResponse,
  RtaMonsterStatsResponse,
  RtaSummonerRankingResponse,
} from '@/features/rta/types/rta';

/**
 * RTA 통계 조회
 * 백엔드: POST /api/v1/rta/stats
 */
export const useRtaStats = () => {
  return useApiPostQuery<RtaStatsResponse>('/rta/stats', {}, {
    enabled: true,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};

/**
 * RTA 매치 수 조회
 * 백엔드: POST /api/v1/rta/matches/count
 */
export const useRtaMatchCount = () => {
  return useApiPostQuery<RtaMatchCountResponse>('/rta/matches/count', {}, {
    enabled: true,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};

/**
 * RTA 매치 목록 조회
 * 백엔드: POST /api/v1/rta/matches
 */
export const useRtaMatchList = (params: RtaMatchListParams) => {
  return useApiPostQuery<RtaMatchesResponse>('/rta/matches', params, {
    enabled: true,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};

/**
 * RTA 몬스터별 통계 조회
 * 백엔드: POST /api/v1/rta/monster-stats
 */
export const useRtaMonsterStats = (limit: number = 20, offset: number = 0) => {
  return useApiPostQuery<RtaMonsterStatsResponse>('/rta/monster-stats', { limit, offset }, { 
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    refetchOnWindowFocus: false, // 윈도우 포커스 시 리프레시 방지
  });
};

/**
 * RTA 몬스터 상세 정보 조회
 * 백엔드: POST /api/v1/rta/monster-detail
 */
/**
 * RTA 대시보드 (일별×티어 전체 — 기간은 클라이언트에서 합산)
 * 백엔드: POST /api/v1/rta/dashboard
 */
export const useRtaDashboard = () => {
  return useApiPostQuery<RtaDashboardResponse>(
    '/rta/dashboard',
    {},
    {
      enabled: true,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );
};

/**
 * RTA 소환사 랭킹
 * 백엔드: POST /api/v1/rta/summoner-ranking
 */
export const useRtaSummonerRanking = (limit: number = 50, offset: number = 0) => {
  return useApiPostQuery<RtaSummonerRankingResponse>(
    '/rta/summoner-ranking',
    { limit, offset },
    {
      enabled: true,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );
};

export const useRtaMonsterDetail = (monsterId: number | null) => {
  const isValidId = monsterId !== null && !isNaN(monsterId) && monsterId > 0;
  return useApiPostQuery<MonsterDetail>(
    '/rta/monster-detail', 
    isValidId ? { pk: monsterId } : {}, 
    { 
      enabled: isValidId,
      staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
      refetchOnWindowFocus: false, // 윈도우 포커스 시 리프레시 방지
      refetchOnReconnect: false,
      retry: false, // 429 방지를 위해 재시도 비활성화
    }
  );
};

