/**
 * 점령전 목록 조회 Hook
 */

import { useEffect, useState } from 'react';
import { useApiPostQuery, useApiPostSuspenseQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import { isApiSuccess } from '@/shared/lib/api/result';
import { GuildItem, MonsterItem, SiegeSearchParams } from '@/types';
import { normalizeMonsterList } from '@/features/siege/lib/normalizeMonsterOption';
import type {
  PopularAttackDeckCombosResponse,
  RecordAttackDeckDefenseMatchupsResponse,
  ImportableRecommendedDecksResponse,
} from '@/features/siege/types/siegeDetail';

export type MonsterOption = {
  monster_id: string;
  kr_name: string;
  un_name: string;
  image_url: string;
  modified_kr_name?: string;
  monster_elemental?: string; // 몬스터 속성 (Fire, Water, Wind, Light, Dark)
  /** 별 개수 — monster-list API `star` (정규화 후 number) */
  star?: number;
  /** Normal / Awakened */
  arousal_type?: string;
  /** Attack, Defense, Support, HP 등 */
  archetype?: string;
  /** 각성 시 보너스 텍스트(에센스 상세 없을 때 대체 표시) */
  awaken_bonus?: string;
  skill_ups_to_max?: number;
  /** 노말↔각성 페어링 (com2us) */
  com2us_id?: number;
  awakens_from_id?: number;
  awakens_to_id?: number;
  /** 같은 패밀리(다른 속성) 묶음용 */
  family_id?: number;
  /** monster-list 응답 — 획득 불가 제외용(캐시/구버전 대비) */
  obtainable?: boolean;
  /** RTA 통계 집계 키(콜라보는 원본 monster_id, 비콜라보는 monster_id와 동일) — WAS `rta_stats_monster_id` */
  rta_stats_monster_id?: string;
  /** 각성 단계: 0=노말, 1=1차각성, 2=2차각성 — WAS `awaken_level` */
  awaken_level?: number;
};

const MONSTER_LIST_CACHE_KEY = 'smwr:monster-list:v14';
const MONSTER_LIST_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

type MonsterListCachePayload = {
  v: 2;
  ts: number; // epoch ms
  data: MonsterOption[];
};

function readMonsterListCache(): { isFresh: boolean; data: MonsterOption[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MONSTER_LIST_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MonsterListCachePayload;
    if (!parsed || parsed.v !== 2 || !Array.isArray(parsed.data) || typeof parsed.ts !== 'number') return null;
    const isFresh = Date.now() - parsed.ts < MONSTER_LIST_CACHE_TTL_MS;
    return { isFresh, data: parsed.data };
  } catch {
    return null;
  }
}

function writeMonsterListCache(data: MonsterOption[]) {
  if (typeof window === 'undefined') return;
  try {
    const payload: MonsterListCachePayload = { v: 2, ts: Date.now(), data };
    window.localStorage.setItem(MONSTER_LIST_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage quota/disabled 등은 무시
  }
}

/**
 * 몬스터 목록 조회
 */
/** 점령전 전용: WAS에서 1각 제외(2각 존재 시). 키만 있으면 캐시 비활성화되므로 상수로 고정 */
export const MONSTER_LIST_SIEGE_PARAMS: Record<string, unknown> = {
  siegeDedupeSecondAwakening: true,
};

export const useMonsterList = (
  params: Record<string, unknown> = MONSTER_LIST_SIEGE_PARAMS,
  options?: { enabled?: boolean },
) => {
  // monster-list는 고정 데이터에 가깝고, siegeDedupeSecondAwakening 일 때만 로컬 TTL 캐시(빈 body로 호출하면 캐시·SQL 모두 비권장)
  const isCacheable = params?.siegeDedupeSecondAwakening === true;
  const [cacheSnapshot] = useState(() => (isCacheable ? readMonsterListCache() : null));
  const queryEnabled = options?.enabled ?? true;
  const hasFreshNonEmptyCache =
    isCacheable && cacheSnapshot?.isFresh === true && (cacheSnapshot.data?.length ?? 0) > 0;

  const q = useApiPostQuery<MonsterOption[]>('/summonerswar/monster-list', params, {
    enabled: queryEnabled && !hasFreshNonEmptyCache,
    initialData: hasFreshNonEmptyCache ? cacheSnapshot?.data : undefined,
    placeholderData: hasFreshNonEmptyCache ? cacheSnapshot?.data : undefined,
    select: (data) => normalizeMonsterList(data, { awakenedOnly: true }),
    staleTime: 30 * 60 * 1000, // 30분 (몬스터 목록은 자주 변경되지 않음)
    gcTime: 60 * 60 * 1000, // 1시간
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // TanStack Query v5에서는 useQuery onSuccess 콜백이 제거되어 effect로 캐시 갱신
  useEffect(() => {
    if (!isCacheable) return;
    const data = q.data;
    if (Array.isArray(data) && data.length > 0) {
      writeMonsterListCache(data);
    }
  }, [isCacheable, q.data]);

  return q;
};

/**
 * 길드 목록 조회
 * @deprecated SpringBoot 컨트롤러에 해당 엔드포인트가 없습니다. API 추가 필요
 */
export const useGuildList = () => {
  return useApiPostQuery<GuildItem[]>('/summonerswar/guild-list', {}, { enabled: true });
};

/**
 * 점령전 몬스터 목록 조회
 * @deprecated enemyTeam-list를 사용하세요
 */
export const useSiegeMonsterList = (params: SiegeSearchParams, enabled = false) => {
  return useApiPostQuery<MonsterItem[]>('/summonerswar/siege-list', params, { enabled });
};

const ENEMY_TEAM_QUERY_STALE_MS = 10 * 60 * 1000;
const ENEMY_TEAM_QUERY_GC_MS = 15 * 60 * 1000;

/**
 * 적 팀 목록 조회 (방어덱 정보)
 */
export const useEnemyTeamList = (params: SiegeSearchParams & { paging?: number; offset?: number }, enabled = false) => {
  return useApiPostQuery<MonsterItem[]>('/summonerswar/enemyTeam-list', params, { 
    enabled,
    staleTime: ENEMY_TEAM_QUERY_STALE_MS,
    gcTime: ENEMY_TEAM_QUERY_GC_MS,
    placeholderData: (previousData) => previousData, // 이전 데이터 유지 (페이지네이션 시 깜빡임 방지)
  });
};

/**
 * 적 팀 목록 조회 (Suspense)
 * - Suspense fallback(스켈레톤 등)로 선언적으로 로딩 UI를 구성할 때 사용
 */
export const useEnemyTeamListSuspense = (params: SiegeSearchParams & { paging?: number; offset?: number }) => {
  return useApiPostSuspenseQuery<MonsterItem[]>('/summonerswar/enemyTeam-list', params, {
    staleTime: ENEMY_TEAM_QUERY_STALE_MS,
    gcTime: ENEMY_TEAM_QUERY_GC_MS,
    // 페이지네이션/조건 변경 시 이전 데이터 유지 -> Suspense로 매번 화면이 날아가는 걸 방지
    placeholderData: (previousData) => previousData,
  });
};

/** 방덱 수동 등록(siege_defense_deck_manual) — 전투 집계 없이 목록 노출 */
export type RegisterSiegeDefenseDeckManualPayload = {
  def_monster_1: string;
  def_monster_2: string;
  def_monster_3: string;
  season_yyyymm?: string;
};

export const useRegisterSiegeDefenseDeckManual = (
  options?: Parameters<
    typeof useApiPostMutation<string, RegisterSiegeDefenseDeckManualPayload>
  >[1],
) => {
  return useApiPostMutation<string, RegisterSiegeDefenseDeckManualPayload>(
    '/summonerswar/siege-defense-deck-manual',
    options,
  );
};

/**
 * 전체 페이지 수 조회
 */
export const useTotalPageCount = (params: SiegeSearchParams, enabled = false) => {
  return useApiPostQuery<number>('/summonerswar/total-page-count', params, { 
    enabled,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  });
};

/** deck_id 우선, 없으면 방덱(def)+공덱(atk) 3쌍으로 조회 */
export type DeckDetailQueryParams =
  | { deck_id: string }
  | {
      def_monster_1: string;
      def_monster_2: string;
      def_monster_3: string;
      atk_monster_1: string;
      atk_monster_2: string;
      atk_monster_3: string;
    };

function isDeckDetailQueryEnabled(p: DeckDetailQueryParams | null): boolean {
  if (!p) return false;
  if ('deck_id' in p && p.deck_id) return true;
  if (
    'def_monster_1' in p &&
    p.def_monster_1 &&
    p.def_monster_2 &&
    p.def_monster_3 &&
    p.atk_monster_1 &&
    p.atk_monster_2 &&
    p.atk_monster_3
  ) {
    return true;
  }
  return false;
}

/**
 * 공덱 상세 정보 조회
 */
export const useDeckDetail = (params: DeckDetailQueryParams | null) => {
  return useApiPostQuery<unknown>('/summonerswar/deck-detail', params, {
    enabled: isDeckDetailQueryEnabled(params),
  });
};

export type DeleteDeckPayload =
  | { deck_id: string }
  | {
      atk_monster_1: string;
      atk_monster_2: string;
      atk_monster_3: string;
    };

/** 백엔드 deck-detail-delete 등 plain string "SUCCESS" | "FAIL" 포함 */
export function isDeckDeleteSuccess(res: unknown): boolean {
  return isApiSuccess(res);
}

/**
 * 공덱 삭제 Mutation
 * 백엔드: /api/v1/summonerswar/deck-detail-delete
 */
export const useDeleteDeck = (
  options?: Parameters<typeof useApiPostMutation<string, DeleteDeckPayload>>[1],
) => {
  return useApiPostMutation<string, DeleteDeckPayload>('/summonerswar/deck-detail-delete', options);
};

export type DeckVoteType = 'UP' | 'DOWN' | 'CLEAR';

export type DeckVotePayload = {
  /** 추천 공덱에 등록된 경우. 없으면 atk만으로 자유 투표 */
  deck_id?: string;
  def_monster_1: string;
  def_monster_2: string;
  def_monster_3: string;
  /** deck_id 없을 때 필수(또는 서버가 등록 행으로 매칭할 때 자유 투표와 병합용) */
  atk_monster_1?: string;
  atk_monster_2?: string;
  atk_monster_3?: string;
  vote: DeckVoteType;
};

/**
 * 공덱 추천/비추천 — 특정 방덱(def) + 특정 공덱(deck_id)당 사용자 1건
 * 백엔드: POST /api/v1/summonerswar/deck-vote
 */
export const useDeckVoteMutation = (
  options?: Parameters<typeof useApiPostMutation<{ result: string }, DeckVotePayload>>[1],
) => {
  return useApiPostMutation<{ result: string }, DeckVotePayload>('/summonerswar/deck-vote', options);
};

export type AttackDeckComboSource = 'RECOMMENDED' | 'RECORD';

export type PopularAttackDeckCombosParams = {
  paging?: number;
  offset?: number;
  monster_id?: string;
  min_usage_count?: number;
  sort?: 'USAGE_DESC' | 'LATEST_DESC';
  source?: AttackDeckComboSource;
};

/**
 * 자주 사용되는 공덱 조합 목록 조회
 */
export const usePopularAttackDeckCombos = (
  params: PopularAttackDeckCombosParams,
  enabled = true,
) => {
  return useApiPostQuery<PopularAttackDeckCombosResponse>(
    '/summonerswar/popular-attack-decks',
    params,
    {
      enabled,
      placeholderData: (previousData) => previousData,
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );
};

export type RecordAttackDeckDefenseMatchupsQueryParams = {
  atk_monster_1: string;
  atk_monster_2: string;
  atk_monster_3: string;
  paging?: number;
  offset?: number;
};

/**
 * 전적 공덱이 사용된 방덱 목록
 * 백엔드: POST /api/v1/summonerswar/record-attack-deck-defenses
 */
export const useRecordAttackDeckDefenseMatchups = (
  params: RecordAttackDeckDefenseMatchupsQueryParams | null,
  enabled = true,
) => {
  return useApiPostQuery<RecordAttackDeckDefenseMatchupsResponse>(
    '/summonerswar/record-attack-deck-defenses',
    params ?? {},
    {
      enabled:
        enabled
        && !!params?.atk_monster_1
        && !!params?.atk_monster_2
        && !!params?.atk_monster_3,
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );
};

export type ImportableRecommendedDecksParams = {
  exclude_def_monster_1?: string;
  exclude_def_monster_2?: string;
  exclude_def_monster_3?: string;
  monster_id?: string;
  paging?: number;
  offset?: number;
};

export const useImportableRecommendedDecks = (
  params: ImportableRecommendedDecksParams,
  enabled = true,
) => {
  return useApiPostQuery<ImportableRecommendedDecksResponse>(
    '/summonerswar/recommended-deck-import/list',
    params,
    {
      enabled,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );
};

