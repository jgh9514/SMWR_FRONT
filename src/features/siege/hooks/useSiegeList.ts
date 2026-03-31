/**
 * 점령전 목록 조회 Hook
 */

import { useEffect, useState } from 'react';
import { useApiPostQuery, useApiPostSuspenseQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import { GuildItem, MonsterItem, SiegeSearchParams } from '@/types';
import { normalizeMonsterList } from '@/features/siege/lib/normalizeMonsterOption';

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
};

const MONSTER_LIST_CACHE_KEY = 'smwr:monster-list:v11';
const MONSTER_LIST_CACHE_TTL_MS = 7 * 24 * 60 * 60; // 1일

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
export const useMonsterList = (params: Record<string, unknown> = {}) => {
  // monster-list는 사실상 고정 데이터라 (params가 비어있을 때) localStorage TTL 캐시를 사용
  const isCacheable = params && Object.keys(params).length === 0;
  const [cacheSnapshot] = useState(() => (isCacheable ? readMonsterListCache() : null));

  const q = useApiPostQuery<MonsterOption[]>('/summonerswar/monster-list', params, {
    enabled: !(isCacheable && cacheSnapshot?.isFresh),
    initialData: isCacheable ? cacheSnapshot?.data : undefined,
    placeholderData: isCacheable ? cacheSnapshot?.data : undefined,
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

/**
 * 적 팀 목록 조회 (방어덱 정보)
 */
export const useEnemyTeamList = (params: SiegeSearchParams & { paging?: number; offset?: number }, enabled = false) => {
  return useApiPostQuery<MonsterItem[]>('/summonerswar/enemyTeam-list', params, { 
    enabled,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    placeholderData: (previousData) => previousData, // 이전 데이터 유지 (페이지네이션 시 깜빡임 방지)
  });
};

/**
 * 적 팀 목록 조회 (Suspense)
 * - Suspense fallback(스켈레톤 등)로 선언적으로 로딩 UI를 구성할 때 사용
 */
export const useEnemyTeamListSuspense = (params: SiegeSearchParams & { paging?: number; offset?: number }) => {
  return useApiPostSuspenseQuery<MonsterItem[]>('/summonerswar/enemyTeam-list', params, {
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
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

/**
 * 공덱 상세 정보 조회
 */
export const useDeckDetail = (params: { deck_id: string } | null) => {
  return useApiPostQuery<unknown>('/summonerswar/deck-detail', params, {
    enabled: !!params?.deck_id,
  });
};

/**
 * 공덱 삭제 Mutation
 * 백엔드: /api/v1/summonerswar/deck-detail-delete
 */
export const useDeleteDeck = (
  options?: Parameters<typeof useApiPostMutation<{ result: string }, { deck_id: string }>>[1],
) => {
  return useApiPostMutation<{ result: string }, { deck_id: string }>('/summonerswar/deck-detail-delete', options);
};

