/**
 * RTA 데이터 조회 Hook
 *
 * 백엔드 컨트롤러: /api/v1/rta
 * 시즌: 요청 body에 seasonCode(또는 season_code) — 생략 시 서버가 금일 기준 기본 시즌 적용
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { RtaStatsResponse, RtaMatchCountResponse, RtaMatchesResponse, RtaMatchListParams } from '@/types';
import type {
  MonsterDetail,
  RtaDashboardResponse,
  RtaMonsterStatsResponse,
  RtaPlayerSummary,
  RtaSeasonRow,
  RtaSeasonsResponse,
  RtaSummonerRankingResponse,
} from '@/features/rta/types/rta';
import { useApiQuery } from '@/hooks/api/useApiQuery';
import { apiClient } from '@/shared/lib/api/client';

function seasonBody(seasonCode: string | null | undefined): Record<string, string> {
  const c = seasonCode?.trim();
  if (!c) return {};
  return { seasonCode: c };
}

/**
 * MyBatis resultType=map → JSON 키가 snake_case(season_code)인 경우가 많아
 * 화면에서 쓰는 camelCase RtaSeasonRow로 통일한다.
 */
function normalizeRtaSeasonsResponse(raw: unknown): RtaSeasonsResponse {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawList = o.seasons;
  const list = Array.isArray(rawList) ? rawList : [];
  const seasons: RtaSeasonRow[] = list.map((item) => {
    const r = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const sc = r.seasonCode ?? r.season_code;
    const sn = r.seasonName ?? r.season_name;
    return {
      seasonCode: sc != null ? String(sc) : '',
      seasonNo: Number(r.seasonNo ?? r.season_no ?? 0),
      leagueType: String(r.leagueType ?? r.league_type ?? ''),
      seasonName: sn != null ? String(sn) : '',
      startAt: String(r.startAt ?? r.start_at ?? ''),
      endAt: String(r.endAt ?? r.end_at ?? ''),
      isActive: Boolean(r.isActive ?? r.is_active),
      sortOrder: Number(r.sortOrder ?? r.sort_order ?? 0),
    };
  });
  const def = o.defaultSeasonCode ?? o.default_season_code;
  return {
    seasons,
    defaultSeasonCode: def != null && String(def).trim() !== '' ? String(def).trim() : null,
  };
}

/**
 * RTA 통계 조회
 * 백엔드: POST /api/v1/rta/stats
 */
export const useRtaStats = (seasonCode?: string | null) => {
  return useApiPostQuery<RtaStatsResponse>('/rta/stats', seasonBody(seasonCode), {
    enabled: true,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
};

/**
 * RTA 매치 수 조회
 * 백엔드: POST /api/v1/rta/matches/count
 */
export const useRtaMatchCount = (seasonCode?: string | null) => {
  return useApiPostQuery<RtaMatchCountResponse>('/rta/matches/count', seasonBody(seasonCode), {
    enabled: true,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
};

/**
 * RTA 매치 목록 조회
 * 백엔드: POST /api/v1/rta/matches
 */
export const useRtaMatchList = (params: RtaMatchListParams) => {
  const { limit, offset, seasonCode } = params;
  return useApiPostQuery<RtaMatchesResponse>(
    '/rta/matches',
    { limit, offset, ...seasonBody(seasonCode) },
    {
      enabled: true,
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: true,
    },
  );
};

/**
 * RTA 몬스터별 통계 조회
 * 백엔드: POST /api/v1/rta/monster-stats
 */
export const useRtaMonsterStats = (limit: number = 20, offset: number = 0, seasonCode?: string | null) => {
  return useApiPostQuery<RtaMonsterStatsResponse>(
    '/rta/monster-stats',
    { limit, offset, ...seasonBody(seasonCode) },
    {
      enabled: true,
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: true,
    },
  );
};

/**
 * RTA 대시보드 (일별×티어 전체 — 기간은 클라이언트에서 합산)
 * 백엔드: POST /api/v1/rta/dashboard
 */
export const useRtaDashboard = (seasonCode?: string | null) => {
  return useApiPostQuery<RtaDashboardResponse>(
    '/rta/dashboard',
    seasonBody(seasonCode),
    {
      enabled: true,
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: true,
    },
  );
};

/** RTA 시즌 목록 (DB) — GET /api/v1/rta/seasons */
export const useRtaSeasons = () => {
  return useApiQuery<RtaSeasonsResponse>({
    queryKey: ['rta', 'seasons'],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>('/rta/seasons');
      return normalizeRtaSeasonsResponse(raw);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

/**
 * RTA 소환사 랭킹
 * 백엔드: POST /api/v1/rta/summoner-ranking
 */
export const useRtaSummonerRanking = (
  limit: number = 50,
  offset: number = 0,
  seasonCode?: string | null,
  options?: Omit<UseQueryOptions<RtaSummonerRankingResponse, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useApiPostQuery<RtaSummonerRankingResponse>(
    '/rta/summoner-ranking',
    { limit, offset, ...seasonBody(seasonCode) },
    {
      enabled: true,
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: true,
      ...options,
    },
  );
};

/** RTA 소환사 상세 헤더 요약 (서버 initialData와 병행 가능) */
export const useRtaPlayerSummary = (
  wizardId: string,
  initialData?: RtaPlayerSummary | null,
  seasonCode?: string | null,
  options?: Omit<UseQueryOptions<RtaPlayerSummary, Error>, 'queryKey' | 'queryFn'>,
) => {
  const id = wizardId?.trim() ?? '';
  const path = id ? `/rta/player/${encodeURIComponent(id)}/summary` : '/rta/player/-/summary';
  return useApiPostQuery<RtaPlayerSummary>(
    path,
    seasonBody(seasonCode),
    {
      enabled: Boolean(id),
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: true,
      ...(initialData != null ? { initialData } : {}),
      ...options,
    },
  );
};

export const useRtaMonsterDetail = (monsterId: number | null, seasonCode?: string | null) => {
  const isValidId = monsterId !== null && !isNaN(monsterId) && monsterId > 0;
  return useApiPostQuery<MonsterDetail>(
    '/rta/monster-detail',
    isValidId ? { monster_id: monsterId, ...seasonBody(seasonCode) } : {},
    {
      enabled: isValidId,
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: true,
      refetchOnReconnect: false,
      retry: false,
    },
  );
};
