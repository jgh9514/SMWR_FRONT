/**
 * RTA 데이터 조회 Hook
 *
 * 백엔드 컨트롤러: /api/v1/rta
 * 시즌: 요청 body에 seasonCode(또는 season_code) — 생략 시 서버가 금일 기준 기본 시즌 적용
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import {
  RtaStatsResponse,
  RtaMatchesResponse,
  RtaMatchListParams,
  RtaListPageResponse,
} from '@/types';

function tierKeyBody(tierKey?: string | null | undefined): Record<string, string> {
  const t = tierKey?.trim();
  if (!t) return {};
  return { tierKey: t };
}
import type {
  MonsterDetail,
  RtaDashboardResponse,
  RtaMonsterStatsResponse,
  RtaPlayerSummary,
  RtaRatingGradeRule,
  RtaSeasonRow,
  RtaSeasonsResponse,
  RtaSummonerRankingResponse,
  RtaSummonerSearchResponse,
} from '@/features/rta/types/rta';
import { useApiQuery } from '@/hooks/api/useApiQuery';
import { apiClient } from '@/shared/lib/api/client';
import { toYmdKst } from '@/features/rta/utils/ymdKst';

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
      startAt:
        String(r.startYmdKst ?? r.start_ymd_kst ?? toYmdKst(r.startAt ?? r.start_at) ?? ''),
      /** 서버 lastInclusiveYmdKst = bucket_date < end 배타상한의 전날(KST). 티어 집계와 동일 */
      endAt: String(
        r.lastInclusiveYmdKst ?? r.last_inclusive_ymd_kst ?? toYmdKst(r.endAt ?? r.end_at) ?? '',
      ),
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
/** /rta 등 조회 위주 — 서버 rtaListRead 캐시와 맞춰 클라이언트도 짧게 재사용 */
const RTA_READ_STALE_MS = 2 * 60 * 1000;
const RTA_READ_GC_MS = 15 * 60 * 1000;

export const useRtaStats = (seasonCode?: string | null) => {
  return useApiPostQuery<RtaStatsResponse>('/rta/stats', seasonBody(seasonCode), {
    enabled: true,
    staleTime: RTA_READ_STALE_MS,
    gcTime: RTA_READ_GC_MS,
    refetchOnWindowFocus: false,
  });
};

/**
 * RTA 매치 목록 조회
 * 백엔드: POST /api/v1/rta/matches
 */
export const useRtaMatchList = (params: RtaMatchListParams) => {
  const { limit, offset, seasonCode, tierKey } = params;
  return useApiPostQuery<RtaMatchesResponse>(
    '/rta/matches',
    { limit, offset, ...seasonBody(seasonCode), ...tierKeyBody(tierKey) },
    {
      enabled: true,
      staleTime: RTA_READ_STALE_MS,
      gcTime: RTA_READ_GC_MS,
      refetchOnWindowFocus: false,
    },
  );
};

/** /rta 목록 화면 권장: 통계 + 매치 목록 HTTP 1회 — POST /api/v1/rta/page */
export const useRtaListPage = (params: RtaMatchListParams) => {
  const { limit, offset, seasonCode, tierKey } = params;
  return useApiPostQuery<RtaListPageResponse>(
    '/rta/page',
    { limit, offset, ...seasonBody(seasonCode), ...tierKeyBody(tierKey) },
    {
      enabled: true,
      staleTime: RTA_READ_STALE_MS,
      gcTime: RTA_READ_GC_MS,
      refetchOnWindowFocus: false,
    },
  );
};

export type RtaMonsterStatsQueryParams = {
  limit?: number;
  statsOffset?: number;
  duoOffset?: number;
  trioOffset?: number;
  seasonCode?: string | null;
  /** null/빈값=전체 합산, CH_ALL·F_ALL·C_ALL·P_ALL·G_ALL, 또는 tier_key(Ch1, F3…) */
  tierKey?: string | null;
};

function normalizeRtaRatingGradeRules(raw: unknown): RtaRatingGradeRule[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const r = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const id = r.ratingId ?? r.rating_id;
      const tk = r.tierKey ?? r.tier_key;
      const ratingId = Number(id);
      return {
        ratingId,
        tierKey: tk != null ? String(tk).trim() : '',
        gradeName:
          r.gradeName != null
            ? String(r.gradeName)
            : r.grade_name != null
              ? String(r.grade_name)
              : undefined,
      };
    })
    .filter((x) => x.tierKey !== '' && Number.isFinite(x.ratingId));
}

/**
 * RTA 공식 등급 규칙 (티어 키·rating_id) — 몬스터 통계 티어 필터 등
 * 백엔드: GET /api/v1/rta/rating-grade-rules
 */
export const useRtaRatingGradeRules = () => {
  return useApiQuery<RtaRatingGradeRule[]>({
    queryKey: ['rta', 'rating-grade-rules'],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>('/rta/rating-grade-rules');
      return normalizeRtaRatingGradeRules(raw);
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * RTA 몬스터별 통계 조회
 * 백엔드: POST /api/v1/rta/monster-stats — limit=페이지 크기, stats_offset·duo_offset·trio_offset, tierKey
 */
export const useRtaMonsterStats = (params: RtaMonsterStatsQueryParams = {}) => {
  const { limit = 20, statsOffset = 0, duoOffset = 0, trioOffset = 0, seasonCode, tierKey } = params;
  return useApiPostQuery<RtaMonsterStatsResponse>(
    '/rta/monster-stats',
    {
      limit,
      stats_offset: statsOffset,
      duo_offset: duoOffset,
      trio_offset: trioOffset,
      ...seasonBody(seasonCode),
      ...tierKeyBody(tierKey),
    },
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
 * RTA 소환사 검색 (집계 랭킹 기준)
 * 백엔드: POST /api/v1/rta/summoner-search — seasonCode 생략 시 서버 기본 시즌
 */
export const useRtaSummonerSearch = (
  q: string,
  seasonCode: string | null | undefined,
  options?: Omit<UseQueryOptions<RtaSummonerSearchResponse, Error>, 'queryKey' | 'queryFn'> & {
    enabled?: boolean;
  },
) => {
  const { enabled: enabledOpt, ...queryOptions } = options ?? {};
  const trimmed = q.trim();
  const body: Record<string, unknown> = { q: trimmed, ...seasonBody(seasonCode) };
  const enabled = (enabledOpt !== false) && trimmed.length >= 1;
  return useApiPostQuery<RtaSummonerSearchResponse>('/rta/summoner-search', body, {
    enabled,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    ...queryOptions,
  });
};

/**
 * RTA 소환사 랭킹
 * 백엔드: POST /api/v1/rta/summoner-ranking
 * @param country 국가 코드(2자) 또는 미상 `—`; 생략 시 전체
 */

export const useRtaSummonerRanking = (
  limit: number = 50,
  offset: number = 0,
  seasonCode?: string | null,
  options?: Omit<UseQueryOptions<RtaSummonerRankingResponse, Error>, 'queryKey' | 'queryFn'> & {
    country?: string | null;
  },
) => {
  const { country, ...queryOptions } = options ?? {};
  const body: Record<string, unknown> = { limit, offset, ...seasonBody(seasonCode) };
  const c = country?.trim();
  if (c !== undefined && c !== null && c !== '') {
    body.country = c;
  }
  return useApiPostQuery<RtaSummonerRankingResponse>(
    '/rta/summoner-ranking',
    body,
    {
      enabled: true,
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: true,
      ...queryOptions,
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
