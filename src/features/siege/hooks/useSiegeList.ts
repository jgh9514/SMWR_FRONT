/**
 * 점령전 목록 조회 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import { GuildItem, MonsterItem, SiegeSearchParams } from '@/types';

export type MonsterOption = {
  monster_id: string;
  kr_name: string;
  un_name: string;
  image_url: string;
  modified_kr_name?: string;
  monster_elemental?: string; // 몬스터 속성 (Fire, Water, Wind, Light, Dark)
};

/**
 * 몬스터 목록 조회
 */
export const useMonsterList = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<MonsterOption[]>('/summonerswar/monster-list', params, { 
    enabled: true,
    staleTime: 30 * 60 * 1000, // 30분 (몬스터 목록은 자주 변경되지 않음)
    gcTime: 60 * 60 * 1000, // 1시간
  });
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

