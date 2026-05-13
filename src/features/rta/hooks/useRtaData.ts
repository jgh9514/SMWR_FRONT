/**
 * RTA 데이터 조회 Hook
 *
 * 백엔드 컨트롤러: /api/v1/rta
 * 시즌: body에 seasonId(우선, rta_season.season_id) 또는 seasonCode — 둘 다 없으면 서버 기본 시즌
 */

import { useEffect, useMemo, useState } from 'react';
import type { UseQueryOptions } from '@tanstack/react-query';
import { keyPart, useApiPostQuery } from '@/hooks/api/useApiQuery';
import {
  RtaStatsResponse,
  RtaMatchesResponse,
  RtaMatchListParams,
  RtaListPageResponse,
} from '@/types';
import type {
  RtaMonsterOverviewStats,
  RtaMonsterDailySnapRow,
  RtaMonsterPickSlotRow,
  RtaMonsterTopSummonerRow,
  RtaRankCutDetailResponse,
} from '@/features/rta/types/rta';

function ratingIdBody(ratingId?: number | null): Record<string, number> {
  if (ratingId == null || ratingId <= 0) return {};
  return { ratingId };
}

/** 매치 목록/페이지 API — 몬스터 통계와 동일: ratingId 단일 우선, 없으면 ratingIds */
function matchListTierBody(ratingId?: number | null, ratingIds?: number[] | null): Record<string, number | number[]> {
  if (ratingId != null && ratingId > 0) return { ratingId };
  if (ratingIds != null && ratingIds.length > 0) return { ratingIds };
  return {};
}
import type {
  MonsterDetail,
  RtaDashboardLinkPreviewResponse,
  RtaDashboardRankCutoffResponse,
  RtaDashboardTierDistributionResponse,
  RtaMonsterStatsResponse,
  RtaPlayerSummary,
  RtaMonsterPickBreakdownResponse,
  RtaMonsterPickSlotMatchesResponse,
  RtaPlayerMonsterUsageResponse,
  RtaPlayerOwnedBoxResponse,
  RtaPlayerOpponentResponse,
  RtaVsMatchesResponse,
  RtaRatingGradeRule,
  RtaSeasonRow,
  RtaSeasonsResponse,
  RtaSummonerRankingResponse,
  RtaSummonerSearchResponse,
  RtaMonsterOverviewResponse,
} from '@/features/rta/types/rta';
import { useApiQuery } from '@/hooks/api/useApiQuery';
import { apiClient } from '@/shared/lib/api/client';
import { getRtaTierShortLabel } from '@/shared/utils/util';

const MONSTER_TIER_BULK_PRED: Record<string, (short: string) => boolean> = {
  CH_ALL: (s) => s.startsWith('Ch'),
  F_ALL: (s) => /^F[123]$/.test(s),
  C_ALL: (s) => /^C[123]$/.test(s),
  P_ALL: (s) => /^P[123]$/.test(s),
  G_ALL: (s) => /^G[123]$/.test(s),
};

/**
 * 몬스터 통계 API body — 세부 슬롯·구간 전체(CH_ALL 등)를 rating_id 로 변환.
 */
export function buildMonsterStatsTierBody(
  selection: string,
  rules: RtaRatingGradeRule[],
): { ratingId?: number; ratingIds?: number[] } {
  const t = selection.trim();
  if (!t) return {};
  const pred = MONSTER_TIER_BULK_PRED[t];
  if (pred) {
    const ids = rules
      .filter((r) => pred(getRtaTierShortLabel(r.ratingId)))
      .map((r) => r.ratingId)
      .filter((id) => Number.isFinite(id) && id > 0);
    return ids.length ? { ratingIds: ids } : {};
  }
  const rule = rules.find((r) => getRtaTierShortLabel(r.ratingId) === t);
  if (rule) return { ratingId: rule.ratingId };
  return {};
}

function monsterStatsTierBody(
  ratingId?: number | null,
  ratingIds?: number[] | null,
): Record<string, number | number[]> {
  const o: Record<string, number | number[]> = {};
  if (ratingId != null && ratingId > 0) o.ratingId = ratingId;
  if (ratingIds != null && ratingIds.length > 0) o.ratingIds = ratingIds;
  return o;
}

/** 시즌 API 응답 전 렌더링용 빈 목록 — 로딩 중에는 옵션을 표시하지 않는다. */
export const RTA_SEASON_FALLBACK: { value: string; label: string }[] = [];

/**
 * 시즌 기본 seasonCode — `listRtaSeasons` 행만으로 결정(WAS `selectDefaultSeasonIdForNow` 와 동일 규칙).
 * 1) is_active=true 인 행 중 sort_order ASC → season_no DESC → season_code ASC
 * 2) 없으면 전체 중 season_no DESC → season_id DESC (폴백 1건 시즌)
 */
export function resolveDefaultRtaSeasonCode(
  seasonsData: RtaSeasonsResponse | undefined,
  fallback: string,
): string {
  const rows = seasonsData?.seasons;
  if (!rows?.length) return fallback;

  const active = rows.filter((r) => r.isActive);
  if (active.length > 0) {
    active.sort((a, b) => {
      const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (so !== 0) return so;
      const sn = (b.seasonNo ?? 0) - (a.seasonNo ?? 0);
      if (sn !== 0) return sn;
      return (a.seasonCode ?? '').localeCompare(b.seasonCode ?? '');
    });
    const c = active[0]?.seasonCode?.trim();
    if (c) return c;
  }

  const sorted = [...rows].sort((a, b) => {
    const sn = (b.seasonNo ?? 0) - (a.seasonNo ?? 0);
    if (sn !== 0) return sn;
    return (b.seasonId ?? 0) - (a.seasonId ?? 0);
  });
  const c = sorted[0]?.seasonCode?.trim();
  return c || fallback;
}

/** 시즌 목록 행에서 선택 코드에 해당하는 season_id — API에 PK로 넘길 때 사용 */
export function resolveRtaSeasonIdForApi(
  seasons: RtaSeasonRow[] | undefined,
  seasonCode: string | null | undefined,
): number | null {
  const c = seasonCode?.trim();
  if (!c || !seasons?.length) return null;
  const id = seasons.find((r) => r.seasonCode === c)?.seasonId;
  return id != null && id > 0 ? id : null;
}

/** 양의 seasonId가 있으면 코드 조회 없이 서버에 PK만 넘긴다. */
export function seasonBody(
  seasonCode: string | null | undefined,
  seasonId?: number | null,
): Record<string, string | number> {
  const sid =
    seasonId != null && Number.isFinite(Number(seasonId)) ? Math.trunc(Number(seasonId)) : null;
  if (sid != null && sid > 0) {
    return { seasonId: sid };
  }
  const c = seasonCode?.trim();
  if (!c) return {};
  return { seasonCode: c };
}

/** WAS `listRtaSeasons` — 컬럼별 camelCase 별칭만 사용 */
function normalizeRtaSeasonsResponse(raw: unknown): RtaSeasonsResponse {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawList = o.seasons;
  const list = Array.isArray(rawList) ? rawList : [];
  const seasons: RtaSeasonRow[] = list.map((item) => {
    const r = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const rawSid = r.seasonId;
    const sidNum = rawSid != null && String(rawSid).trim() !== '' ? Number(rawSid) : NaN;
    return {
      seasonId: Number.isFinite(sidNum) ? sidNum : 0,
      seasonCode: r.seasonCode != null ? String(r.seasonCode) : '',
      seasonNo: Number(r.seasonNo ?? 0),
      leagueType: String(r.leagueType ?? ''),
      seasonName: r.seasonName != null ? String(r.seasonName) : '',
      startAt: String(r.startYmdKst ?? ''),
      /** lastInclusiveYmdKst = end 배타 상한 전날(KST) */
      endAt: String(r.lastInclusiveYmdKst ?? ''),
      isActive: Boolean(r.isActive),
      sortOrder: Number(r.sortOrder ?? 0),
    };
  });
  return { seasons };
}

/**
 * RTA 통계 조회
 * 백엔드: POST /api/v1/rta/stats
 */
/** /rta 등 조회 위주 — 서버 rtaListRead 캐시와 맞춰 클라이언트도 짧게 재사용 */
const RTA_READ_STALE_MS = 2 * 60 * 1000;
const RTA_READ_GC_MS = 15 * 60 * 1000;

/** 몬스터 집계 통계(솔·듀·트) — 배치 갱신 위주로 목록/매치보다 길게 재사용 */
export const RTA_MONSTER_STATS_STALE_MS = 10 * 60 * 1000;
export const RTA_MONSTER_STATS_GC_MS = 30 * 60 * 1000;

export const useRtaStats = (seasonCode?: string | null, seasonId?: number | null) => {
  return useApiPostQuery<RtaStatsResponse>('/rta/stats', seasonBody(seasonCode, seasonId), {
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
  const { limit, offset, seasonCode, seasonId, ratingId, ratingIds, enabled = true } = params;
  return useApiPostQuery<RtaMatchesResponse>(
    '/rta/matches',
    { limit, offset, ...seasonBody(seasonCode, seasonId), ...matchListTierBody(ratingId, ratingIds) },
    {
      enabled,
      staleTime: RTA_READ_STALE_MS,
      gcTime: RTA_READ_GC_MS,
      refetchOnWindowFocus: false,
    },
  );
};

/** /rta 목록 화면 권장: 통계 + 매치 목록 HTTP 1회 — POST /api/v1/rta/page */
export const useRtaListPage = (params: RtaMatchListParams) => {
  const { limit, offset, seasonCode, seasonId, ratingId, ratingIds, enabled = true } = params;
  return useApiPostQuery<RtaListPageResponse>(
    '/rta/page',
    { limit, offset, ...seasonBody(seasonCode, seasonId), ...matchListTierBody(ratingId, ratingIds) },
    {
      enabled,
      staleTime: RTA_READ_STALE_MS,
      gcTime: RTA_READ_GC_MS,
      refetchOnWindowFocus: false,
    },
  );
};

export type RtaMonsterStatsQueryParams = {
  limit?: number;
  offset?: number;
  type?: 'solo' | 'duo' | 'trio';
  seasonCode?: string | null;
  seasonId?: number | null;
  /** 단일 rta_rating_grade.rating_id — ratingIds 와 동시에 쓰지 않음 */
  ratingId?: number | null;
  /** 복수 rating_id (구간 합산) */
  ratingIds?: number[] | null;
  /** 정렬 기준 컬럼 */
  sortField?: string | null;
  /** 정렬 방향 */
  sortOrder?: 'asc' | 'desc' | null;
  enabled?: boolean;
};

function buildRtaMonsterStatsRequestBody(params: RtaMonsterStatsQueryParams) {
  const { limit = 20, offset = 0, type = 'solo', seasonCode, seasonId, ratingId, ratingIds, sortField, sortOrder } = params;
  return {
    limit,
    offset,
    type,
    ...seasonBody(seasonCode, seasonId),
    ...monsterStatsTierBody(ratingId, ratingIds),
    ...(sortField ? { sortField, sortOrder: sortOrder ?? 'desc' } : {}),
  };
}

/** {@link useRtaMonsterStats} / prefetch 와 동일한 React Query 키 */
export function getRtaMonsterStatsQueryKey(params: RtaMonsterStatsQueryParams) {
  return ['/rta/monster-stats', keyPart(buildRtaMonsterStatsRequestBody(params))] as const;
}

export async function fetchRtaMonsterStats(params: RtaMonsterStatsQueryParams) {
  return apiClient.post<RtaMonsterStatsResponse>('/rta/monster-stats', buildRtaMonsterStatsRequestBody(params));
}

function normalizeRtaRatingGradeRules(raw: unknown): RtaRatingGradeRule[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const r = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const ratingId = Number(r.ratingId);
      return {
        ratingId,
        gradeName: r.gradeName != null ? String(r.gradeName) : undefined,
      };
    })
    .filter((x) => Number.isFinite(x.ratingId) && x.ratingId > 0);
}

/**
 * RTA 공식 등급 규칙 (티어 키·rating_id) — 몬스터 통계 티어 필터 등
 * 백엔드: POST /api/v1/rta/rating-grade-rules
 */
export const useRtaRatingGradeRules = () => {
  return useApiQuery<RtaRatingGradeRule[]>({
    queryKey: ['rta', 'rating-grade-rules'],
    queryFn: async () => {
      const raw = await apiClient.post<unknown>('/rta/rating-grade-rules', {});
      return normalizeRtaRatingGradeRules(raw);
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * RTA 몬스터별 통계 조회 (type별 독립 호출)
 * 백엔드: POST /api/v1/rta/monster-stats — type: solo|duo|trio
 */
export const useRtaMonsterStats = (params: RtaMonsterStatsQueryParams = {}) => {
  const { enabled = true, ...rest } = params;
  return useApiPostQuery<RtaMonsterStatsResponse>(
    '/rta/monster-stats',
    buildRtaMonsterStatsRequestBody(rest),
    {
      enabled,
      staleTime: RTA_MONSTER_STATS_STALE_MS,
      gcTime: RTA_MONSTER_STATS_GC_MS,
      refetchOnWindowFocus: false,
    },
  );
};

/**
 * RTA 대시보드 — 소환사 티어별 분포 (일별×티어)
 * 백엔드: POST /api/v1/rta/dashboard/tier-distribution
 */
export const useRtaDashboardTierDistribution = (seasonCode?: string | null, seasonId?: number | null) => {
  return useApiPostQuery<RtaDashboardTierDistributionResponse>(
    '/rta/dashboard/tier-distribution',
    seasonBody(seasonCode, seasonId),
    {
      enabled: true,
      staleTime: RTA_READ_STALE_MS,
      gcTime: RTA_READ_GC_MS,
      refetchOnWindowFocus: false,
    },
  );
};

/**
 * RTA 대시보드 — 랭크 컷 (앵커·스냅샷)
 * 백엔드: POST /api/v1/rta/dashboard/rank-cutoff
 */
export const useRtaDashboardRankCutoff = (seasonCode?: string | null, seasonId?: number | null) => {
  return useApiPostQuery<RtaDashboardRankCutoffResponse>(
    '/rta/dashboard/rank-cutoff',
    seasonBody(seasonCode, seasonId),
    {
      enabled: true,
      staleTime: RTA_READ_STALE_MS,
      gcTime: RTA_READ_GC_MS,
      refetchOnWindowFocus: false,
    },
  );
};

export const useRtaRankCutDetail = (seasonCode?: string | null, seasonId?: number | null) => {
  return useApiPostQuery<RtaRankCutDetailResponse>(
    '/rta/rank-cutoff/detail',
    seasonBody(seasonCode, seasonId),
    {
      enabled: true,
      staleTime: RTA_READ_STALE_MS,
      gcTime: RTA_READ_GC_MS,
      refetchOnWindowFocus: false,
    },
  );
};

/**
 * 시즌 선택 UI 공통 훅 — 5개 RTA 페이지 컴포넌트의 반복 로직을 하나로 묶는다.
 *
 * - seasonsData 로드 전에는 기본값을 state에 확정하지 않는다(fallback 값이 굳는 버그 방지).
 * - 실제 데이터 로드 후: 목록의 is_active·sort_order 로 기본 시즌 선택(resolveDefaultRtaSeasonCode).
 * - 사용자가 이미 유효한 시즌을 선택했으면 변경하지 않는다.
 */
export function useRtaSeasonSelect(seasonsData: RtaSeasonsResponse | undefined): {
  /** Select에 바인딩할 현재 선택 값 (로딩 중에는 fallback 코드) */
  seasonSelectValue: string;
  /** API 호출에 쓸 season_id (목록에 없으면 null) */
  seasonIdForApi: number | null;
  /** 선택 변경 핸들러 */
  setSeason: (code: string) => void;
  /** Select <MenuItem> 목록 */
  seasonOptions: { value: string; label: string }[];
} {
  const resolvedDefaultSeason = useMemo(
    () => resolveDefaultRtaSeasonCode(seasonsData, ''),
    [seasonsData],
  );

  const seasonOptions = useMemo(() => {
    const rows = seasonsData?.seasons;
    if (!rows?.length) return RTA_SEASON_FALLBACK;
    return rows.map((r) => ({ value: r.seasonCode, label: r.seasonName }));
  }, [seasonsData]);

  const [season, setSeason] = useState<string | null>(null);
  useEffect(() => {
    if (!seasonsData) return;
    queueMicrotask(() => {
      setSeason((prev) => {
        if (prev !== null && seasonsData.seasons.some((r) => r.seasonCode === prev)) return prev;
        return resolvedDefaultSeason;
      });
    });
  }, [seasonsData, resolvedDefaultSeason]);

  const seasonSelectValue = season ?? resolvedDefaultSeason;

  const seasonIdForApi = useMemo(
    () => resolveRtaSeasonIdForApi(seasonsData?.seasons, seasonSelectValue),
    [seasonsData?.seasons, seasonSelectValue],
  );

  return { seasonSelectValue, seasonIdForApi, setSeason, seasonOptions };
}

/** RTA 시즌 목록 (DB) — POST /api/v1/rta/seasons. /rta 레이아웃에서 Provider로 한 번만 마운트 권장 */
export const useRtaSeasons = () => {
  return useApiQuery<RtaSeasonsResponse>({
    queryKey: ['rta', 'seasons'],
    queryFn: async () => {
      const raw = await apiClient.post<unknown>('/rta/seasons', {});
      return normalizeRtaSeasonsResponse(raw);
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * RTA 소환사 검색 (집계 검색 스냅, 시즌과 무관)
 * 백엔드: POST /api/v1/rta/summoner-search — seasonCode 는 응답 메타용(선택)
 */
export const useRtaSummonerSearch = (
  q: string,
  seasonCode: string | null | undefined,
  options?: Omit<UseQueryOptions<RtaSummonerSearchResponse, Error>, 'queryKey' | 'queryFn'> & {
    enabled?: boolean;
    seasonId?: number | null;
  },
) => {
  const { enabled: enabledOpt, seasonId, ...queryOptions } = options ?? {};
  const trimmed = q.trim();
  const body: Record<string, unknown> = { q: trimmed, ...seasonBody(seasonCode, seasonId) };
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
    seasonId?: number | null;
  },
) => {
  const { country, seasonId, ...queryOptions } = options ?? {};
  const body: Record<string, unknown> = { limit, offset, ...seasonBody(seasonCode, seasonId) };
  const c = country?.trim();
  if (c !== undefined && c !== null && c !== '') {
    body.country = c;
  }
  return useApiPostQuery<RtaSummonerRankingResponse>(
    '/rta/summoner-ranking',
    body,
    {
      enabled: true,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      ...queryOptions,
    },
  );
};

/**
 * 메인/대시보드 4패널(솔·듀·트 + 소환사 랭킹) — WAS 가 한 응답으로 병렬 집계
 */
export const useRtaDashboardLinkPreview = (
  seasonCode: string,
  seasonId: number | null,
  previewLimit: number = 5,
) => {
  return useApiPostQuery<RtaDashboardLinkPreviewResponse>(
    '/rta/dashboard/link-preview',
    { previewLimit, ...seasonBody(seasonCode, seasonId) },
    {
      enabled: true,
      staleTime: RTA_MONSTER_STATS_STALE_MS,
      gcTime: RTA_MONSTER_STATS_GC_MS,
      refetchOnWindowFocus: false,
    },
  );
};

/**
 * 대시보드 프리뷰 — 4개 패널 별도 훅 (독립 로딩, 먼저 오는 패널부터 렌더링)
 * 각 훅은 /rta/dashboard/preview/{solo|duo|trio|summoner} 를 각각 호출한다.
 */
export const useRtaDashboardPreviewSolo = (
  seasonCode: string,
  seasonId: number | null,
  limit: number = 5,
) =>
  useApiPostQuery<RtaMonsterStatsResponse>(
    '/rta/dashboard/preview/solo',
    { limit, ...seasonBody(seasonCode, seasonId) },
    { enabled: true, staleTime: RTA_MONSTER_STATS_STALE_MS, gcTime: RTA_MONSTER_STATS_GC_MS, refetchOnWindowFocus: false },
  );

export const useRtaDashboardPreviewDuo = (
  seasonCode: string,
  seasonId: number | null,
  limit: number = 5,
) =>
  useApiPostQuery<RtaMonsterStatsResponse>(
    '/rta/dashboard/preview/duo',
    { limit, ...seasonBody(seasonCode, seasonId) },
    { enabled: true, staleTime: RTA_MONSTER_STATS_STALE_MS, gcTime: RTA_MONSTER_STATS_GC_MS, refetchOnWindowFocus: false },
  );

export const useRtaDashboardPreviewTrio = (
  seasonCode: string,
  seasonId: number | null,
  limit: number = 5,
) =>
  useApiPostQuery<RtaMonsterStatsResponse>(
    '/rta/dashboard/preview/trio',
    { limit, ...seasonBody(seasonCode, seasonId) },
    { enabled: true, staleTime: RTA_MONSTER_STATS_STALE_MS, gcTime: RTA_MONSTER_STATS_GC_MS, refetchOnWindowFocus: false },
  );

export const useRtaDashboardPreviewSummoner = (
  seasonCode: string,
  seasonId: number | null,
  limit: number = 5,
) =>
  useApiPostQuery<RtaSummonerRankingResponse>(
    '/rta/dashboard/preview/summoner',
    { limit, ...seasonBody(seasonCode, seasonId) },
    { enabled: true, staleTime: RTA_MONSTER_STATS_STALE_MS, gcTime: RTA_MONSTER_STATS_GC_MS, refetchOnWindowFocus: false },
  );

/**
 * RTA 소환사 상세 헤더 요약 (서버 initialData와 병행 가능).
 * - `initialData`는 RSC가 가져온 **기본 시즌** 요약일 때만 넘기는 것이 안전(시즌 변경 시 다른 season 키에 잘못 시드되지 않게 Shell에서 필터).
 * - RSC와 함께 쓸 때 `staleTime>0`으로 마운트 직후 중복 `summary` POST를 막는다.
 */
export const useRtaPlayerSummary = (
  wizardId: string,
  initialData?: RtaPlayerSummary | null,
  seasonCode?: string | null,
  options?: Omit<UseQueryOptions<RtaPlayerSummary, Error>, 'queryKey' | 'queryFn'> & {
    seasonId?: number | null;
  },
) => {
  const { seasonId, ...restOptions } = options ?? {};
  const id = wizardId?.trim() ?? '';
  const path = id ? `/rta/player/${encodeURIComponent(id)}/summary` : '/rta/player/-/summary';
  const fromRsc = initialData != null;
  return useApiPostQuery<RtaPlayerSummary>(
    path,
    seasonBody(seasonCode, seasonId),
    {
      enabled: Boolean(id),
      staleTime: fromRsc ? RTA_PLAYER_SUMMARY_RSC_STALE_MS : 0,
      gcTime: fromRsc ? RTA_PLAYER_SUMMARY_RSC_GC_MS : 0,
      refetchOnWindowFocus: true,
      ...(fromRsc ? { initialData: initialData as RtaPlayerSummary } : {}),
      ...restOptions,
    },
  );
};

/** RSC `getRtaPlayerSummaryData` 직후 하이드레이션 — staleTime 0이면 동일 API가 즉시 한 번 더 나간다. */
const RTA_PLAYER_SUMMARY_RSC_STALE_MS = 2 * 60 * 1000;
const RTA_PLAYER_SUMMARY_RSC_GC_MS = 10 * 60 * 1000;

const RTA_PLAYER_MONSTER_USAGE_STALE_MS = 60_000;

/**
 * 소환사×시즌 몬스터 사용 스냅(픽/밴/승/선첫비밴/보유). 배치 rta_agg_summoner_monster_snap.
 */
export const useRtaPlayerMonsterUsage = (
  wizardId: string,
  seasonCode: string | null | undefined,
  options: {
    seasonId: number | null;
    enabled?: boolean;
  },
) => {
  const id = wizardId?.trim() ?? '';
  const path = id ? `/rta/player/${encodeURIComponent(id)}/monster-usage` : '/rta/player/-/monster-usage';
  return useApiPostQuery<RtaPlayerMonsterUsageResponse>(path, seasonBody(seasonCode ?? null, options.seasonId), {
    enabled: Boolean(id) && (options.enabled !== false),
    staleTime: RTA_PLAYER_MONSTER_USAGE_STALE_MS,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
};

const RTA_MONSTER_PICK_BREAKDOWN_STALE_MS = 120_000;

/**
 * 소환사×몬스터별 드래프트 슬롯 묶음(펼치기 행 용 라이브 집계).
 */
export const useRtaMonsterPickBreakdown = (
  wizardId: string,
  seasonCode: string | null | undefined,
  seasonId: number | null,
  unitMasterId: number | null,
  options?: { enabled?: boolean },
) => {
  const id = wizardId?.trim() ?? '';
  const path = id ? `/rta/player/${encodeURIComponent(id)}/monster-pick-breakdown` : '/rta/player/-/monster-pick-breakdown';
  const enabled =
    Boolean(id) &&
    seasonId != null &&
    typeof seasonId === 'number' &&
    unitMasterId != null &&
    unitMasterId > 0 &&
    (options?.enabled !== false);

  return useApiPostQuery<RtaMonsterPickBreakdownResponse>(
    path,
    {
      ...seasonBody(seasonCode ?? null, seasonId ?? null),
      unit_master_id: unitMasterId ?? 0,
    },
    {
      enabled,
      staleTime: RTA_MONSTER_PICK_BREAKDOWN_STALE_MS,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  );
};

/** 소환사×몬스터 특정 픽 슬롯 경기 — pick_slot_no·team_side(선턴·후턴)만 전송(WAS 픽 번호는 팀 내 1~5). */
export const useRtaMonsterPickSlotMatches = (
  wizardId: string,
  seasonCode: string | null | undefined,
  seasonId: number | null,
  unitMasterId: number | null,
  teamSide: number | null,
  pickSlotNo: number | null,
  options?: { enabled?: boolean },
) => {
  const id = wizardId?.trim() ?? '';
  const path = id
    ? `/rta/player/${encodeURIComponent(id)}/monster-pick-slot-matches`
    : '/rta/player/-/monster-pick-slot-matches';
  const enabled =
    Boolean(id) &&
    seasonId != null &&
    unitMasterId != null && unitMasterId > 0 &&
    teamSide != null && teamSide >= 1 && teamSide <= 2 &&
    pickSlotNo != null && pickSlotNo >= 1 && pickSlotNo <= 5 &&
    (options?.enabled !== false);

  return useApiPostQuery<RtaMonsterPickSlotMatchesResponse>(
    path,
    {
      ...seasonBody(seasonCode ?? null, seasonId ?? null),
      unit_master_id: unitMasterId ?? 0,
      team_side: teamSide ?? 0,
      pick_slot_no: pickSlotNo ?? 0,
      limit: 20,
    },
    {
      enabled,
      staleTime: 120_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  );
};

/** 소환사 상대 전적(H2H) — rta_agg_summoner_opponent_h2h_snap (배치, 시즌별) */
export const useRtaPlayerOpponentRecords = (
  wizardId: string,
  seasonCode: string | null,
  options?: { seasonId?: number | null; limit?: number; offset?: number; enabled?: boolean },
) => {
  const id = wizardId?.trim() ?? '';
  const path = id
    ? `/rta/player/${encodeURIComponent(id)}/opponent-records`
    : '/rta/player/-/opponent-records';
  const body: Record<string, unknown> = {
    limit: options?.limit ?? 50,
    offset: options?.offset ?? 0,
    ...seasonBody(seasonCode, options?.seasonId ?? null),
  };
  return useApiPostQuery<RtaPlayerOpponentResponse>(path, body, {
    enabled: Boolean(id) && (options?.enabled !== false),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
};

/** 두 소환사 간 맞대결 경기 목록 */
export const useRtaVsMatches = (
  wizardId: string,
  opponentWizardId: string,
  seasonCode: string | null,
  options?: { seasonId?: number | null; enabled?: boolean },
) => {
  const id = wizardId?.trim() ?? '';
  const oppId = opponentWizardId?.trim() ?? '';
  const path = id && oppId
    ? `/rta/matches/player/${encodeURIComponent(id)}/vs/${encodeURIComponent(oppId)}`
    : '/rta/matches/player/-/vs/-';
  return useApiPostQuery<RtaVsMatchesResponse>(
    path,
    { limit: 20, ...seasonBody(seasonCode, options?.seasonId ?? null) },
    {
      enabled: Boolean(id) && Boolean(oppId) && (options?.enabled !== false),
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  );
};

/** RTA 픽·밴 스냅 rta_agg_summoner_owned_box_snap (시즌 무관, 무거운 스냅 배치 갱신) */
export const useRtaPlayerOwnedBox = (wizardId: string, options?: { enabled?: boolean }) => {
  const id = wizardId?.trim() ?? '';
  const path = id ? `/rta/player/${encodeURIComponent(id)}/owned-box` : '/rta/player/-/owned-box';
  return useApiPostQuery<RtaPlayerOwnedBoxResponse>(path, {}, {
    enabled: Boolean(id) && (options?.enabled !== false),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
};

export const useRtaMonsterOverview = (
  monsterId: number | null | undefined,
  options: {
    seasonCode?: string | null;
    seasonId?: number | null;
    ratingId?: number | null;
    ratingIds?: number[] | null;
    enabled?: boolean;
  } = {},
) => {
  const isValid = monsterId != null && monsterId > 0;
  const body = isValid
    ? {
        monster_id: monsterId,
        ...seasonBody(options.seasonCode, options.seasonId ?? null),
        ...(options.ratingIds != null && options.ratingIds.length > 0
          ? { rating_ids: options.ratingIds }
          : options.ratingId != null
            ? { rating_id: options.ratingId }
            : {}),
      }
    : {};
  return useApiPostQuery<RtaMonsterOverviewResponse>('/rta/monster/overview', body, {
    enabled: isValid && options.enabled !== false,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
};

type MonsterSectionOptions = {
  seasonId?: number | null;
  ratingId?: number | null;
  enabled?: boolean;
};

function monsterSectionBody(monsterId: number, opts: MonsterSectionOptions) {
  return {
    monster_id: monsterId,
    ...seasonBody(null, opts.seasonId ?? null),
    ...(opts.ratingId != null ? { rating_id: opts.ratingId } : {}),
  };
}

export const useRtaMonsterSummaryStats = (
  monsterId: number | null | undefined,
  options: MonsterSectionOptions = {},
) => {
  const valid = monsterId != null && monsterId > 0;
  return useApiPostQuery<{ data: RtaMonsterOverviewStats | null; seasonId?: number | null; ratingId?: number | null }>(
    '/rta/monster/summary-stats',
    valid ? monsterSectionBody(monsterId!, options) : {},
    { enabled: valid && options.enabled !== false, staleTime: 5 * 60_000, gcTime: 10 * 60_000, refetchOnWindowFocus: false },
  );
};

export const useRtaMonsterDailyTrend = (
  monsterId: number | null | undefined,
  options: MonsterSectionOptions = {},
) => {
  const valid = monsterId != null && monsterId > 0;
  return useApiPostQuery<{ data: RtaMonsterDailySnapRow[] }>(
    '/rta/monster/daily-trend',
    valid ? monsterSectionBody(monsterId!, options) : {},
    { enabled: valid && options.enabled !== false, staleTime: 5 * 60_000, gcTime: 10 * 60_000, refetchOnWindowFocus: false },
  );
};

export const useRtaMonsterPickSlotsData = (
  monsterId: number | null | undefined,
  options: MonsterSectionOptions = {},
) => {
  const valid = monsterId != null && monsterId > 0;
  return useApiPostQuery<{ data: RtaMonsterPickSlotRow[] }>(
    '/rta/monster/pick-slots',
    valid ? monsterSectionBody(monsterId!, options) : {},
    { enabled: valid && options.enabled !== false, staleTime: 5 * 60_000, gcTime: 10 * 60_000, refetchOnWindowFocus: false },
  );
};

export const useRtaMonsterTopSummonersData = (
  monsterId: number | null | undefined,
  options: Omit<MonsterSectionOptions, 'ratingId'> = {},
) => {
  const valid = monsterId != null && monsterId > 0;
  return useApiPostQuery<{ data: RtaMonsterTopSummonerRow[] }>(
    '/rta/monster/top-summoners',
    valid ? { monster_id: monsterId!, ...seasonBody(null, options.seasonId ?? null) } : {},
    { enabled: valid && options.enabled !== false, staleTime: 5 * 60_000, gcTime: 10 * 60_000, refetchOnWindowFocus: false },
  );
};

export const useRtaMonsterRecentMatches = (
  monsterId: number | null | undefined,
  options: {
    seasonId?: number | null;
    ratingId?: number | null;
    ratingIds?: number[] | null;
    enabled?: boolean;
    limit?: number;
  } = {},
) => {
  const valid = monsterId != null && monsterId > 0;
  const body = valid
    ? {
        monster_id: monsterId!,
        limit: options.limit ?? 10,
        ...seasonBody(null, options.seasonId ?? null),
        ...(options.ratingIds != null && options.ratingIds.length > 0
          ? { rating_ids: options.ratingIds }
          : options.ratingId != null
            ? { rating_id: options.ratingId }
            : {}),
      }
    : {};
  return useApiPostQuery<{ matches: Record<string, unknown>[]; seasonId: number | null }>(
    '/rta/monster/recent-matches',
    body,
    { enabled: valid && options.enabled !== false, staleTime: 2 * 60_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false },
  );
};

export const useRtaMonsterDetail = (
  monsterId: number | null,
  seasonCode?: string | null,
  seasonId?: number | null,
  /** 서버에서 prefetch한 값 — 클라이언트 첫 페인트에 사용 */
  queryOptions?: Omit<UseQueryOptions<MonsterDetail, Error>, 'queryKey' | 'queryFn'>,
  ratingId?: number | null,
) => {
  const isValidId = monsterId !== null && !isNaN(monsterId) && monsterId > 0;
  const isValidRating = ratingId != null && ratingId > 0;
  const enabled = isValidId && isValidRating;
  return useApiPostQuery<MonsterDetail>(
    '/rta/monster-detail',
    enabled ? { monster_id: monsterId, ratingId, ...seasonBody(seasonCode, seasonId) } : {},
    {
      enabled,
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
      ...queryOptions,
    },
  );
};
