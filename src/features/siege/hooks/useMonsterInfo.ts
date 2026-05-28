/**
 * 몬스터 기본 정보 조회 Hook
 */

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { keyPart, useApiPostQuery } from '@/hooks/api/useApiQuery';
import { apiClient } from '@/shared/lib/api/client';
import type { AttributeType } from '@/features/siege/types/monster';

/** WAS detail_context에서 내려주는 패밀리·진화용 요약 행 */
export interface MonsterDetailSlimRow {
  monster_id: string;
  kr_name?: string;
  un_name?: string;
  image_url?: string;
  monster_elemental?: string;
  star?: number;
  archetype?: string | null;
  arousal_type?: string | null;
  family_id?: string | number | null;
}

/** 같은 별·같은 각성 단계(코호트)에서 스탯별 최솟값·최댓값 — Max 막대 구간 */
export interface MonsterStatCohortBounds {
  cohort_min_hp?: number | null;
  cohort_max_hp?: number | null;
  cohort_min_attack?: number | null;
  cohort_max_attack?: number | null;
  cohort_min_defense?: number | null;
  cohort_max_defense?: number | null;
  cohort_min_speed?: number | null;
  cohort_max_speed?: number | null;
  cohort_min_crit_rate?: number | null;
  cohort_max_crit_rate?: number | null;
  cohort_min_crit_damage?: number | null;
  cohort_max_crit_damage?: number | null;
  cohort_min_resistance?: number | null;
  cohort_max_resistance?: number | null;
  cohort_min_accuracy?: number | null;
  cohort_max_accuracy?: number | null;
  cohort_min_skill_ups?: number | null;
  cohort_max_skill_ups?: number | null;
}

export interface MonsterDetailContextPayload {
  evolution: {
    normal?: MonsterDetailSlimRow | null;
    awakened?: MonsterDetailSlimRow | null;
    second_awakening?: MonsterDetailSlimRow | null;
  };
  siblings: { element: AttributeType | string; monster: MonsterDetailSlimRow }[];
  /** WAS: 같은 star + monster_id 각성 자리 코호트 MIN/MAX */
  stat_cohort?: MonsterStatCohortBounds | null;
}

export interface MonsterInfoResponse {
  monster_id: string;
  monster_elemental: string;
  kr_name: string;
  un_name: string;
  star_type: string;
  star: number;
  arousal_type: string;
  image_url: string;
  leader_id: string;
  /** 스카이아레나식 아키타입 (Attack, Defense, HP, Support 등) */
  archetype?: string | null;
  base_stars?: number | null;
  natural_stars?: number | null;
  family_id?: string | number | null;
  com2us_id?: string | number | null;
  swarfarm_id?: string | number | null;
  awaken_level?: number | null;
  awaken_bonus?: string | null;
  skill_ups_to_max?: number | null;
  base_hp: number;
  base_attack: number;
  base_defense: number;
  speed: number;
  crit_rate: number;
  crit_damage: number;
  resistance: number;
  accuracy: number;
  raw_hp: number;
  raw_attack: number;
  raw_defense: number;
  max_lvl_hp: number;
  max_lvl_attack: number;
  max_lvl_defense: number;
  leader_type: string;
  leader_stat: string;
  leader_increase_by: number;
  leader_icon: string;
  leader_skill_description: string;
  skills: MonsterSkill[];
  /** monster-list와 무관, WAS에서 family 단위로 조회해 포함 */
  detail_context?: MonsterDetailContextPayload | null;
}

/** 스킬에 붙은 이펙트 1행 + skill_effect_master 아이콘 */
export interface MonsterSkillEffectRow {
  skill_id: number;
  effect_id: number;
  effect_order: number;
  effectOrder?: number | null;
  effect_name?: string | null;
  effectName?: string | null;
  effect_type?: string | null;
  effect_description?: string | null;
  is_buff?: boolean | null;
  chance?: number | null;
  effect_icon_path?: string | null;
  effect_icon_filename?: string | null;
  /** MyBatis camelCase 키 (API JSON에 snake와 함께 올 수 있음) */
  effectIconPath?: string | null;
  effectIconFilename?: string | null;
  effect_swarfarm_url?: string | null;
  /** skill_effect_master.remark (예: 아이콘 다운로드 실패) */
  effect_remark?: string | null;
  effectRemark?: string | null;
}

export interface MonsterSkill {
  skill_id: number;
  skill_order: number;
  /** MyBatis camelCase — skill_order와 동일 */
  skillOrder?: number | null;
  skill_name: string;
  skill_description: string;
  slot: number;
  cooltime: number;
  hits: number;
  passive: boolean;
  aoe: boolean;
  random: boolean;
  max_level?: number | null;
  multiplier_formula: string;
  icon_path: string;
  /** MyBatis camelCase — icon_path와 동일 의미 */
  iconPath?: string | null;
  level_progress_description: string;
  /** skill_master.remark (예: 아이콘 다운로드 실패) */
  remark?: string | null;
  swarfarm_url?: string | null;
  icon_filename?: string | null;
  /** skill_effects + skill_effect_master (아이콘) */
  effects?: MonsterSkillEffectRow[];
}

export const MONSTER_INFO_STALE_MS = 10 * 60 * 1000;

export function monsterInfoQueryKey(monsterId: string) {
  return ['/summonerswar/monster/info', keyPart({ monster_id: monsterId.trim() })] as const;
}

export function prefetchMonsterInfo(queryClient: QueryClient, monsterId: string | undefined | null) {
  const id = monsterId?.trim();
  if (!id) return;
  void queryClient.prefetchQuery({
    queryKey: monsterInfoQueryKey(id),
    queryFn: () => apiClient.post<MonsterInfoResponse>('/summonerswar/monster/info', { monster_id: id }),
    staleTime: MONSTER_INFO_STALE_MS,
  });
}

/** 몬스터 상세 라우트·info API hover prefetch (150ms 디바운스) */
export function useMonsterDetailLinkPrefetch() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (monsterId: string | undefined, href: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        router.prefetch(href);
        prefetchMonsterInfo(queryClient, monsterId);
      }, 150);
    },
    [queryClient, router],
  );
}

/**
 * 몬스터 기본 정보 조회
 */
export const useMonsterInfo = (monsterId: string | null) => {
  return useApiPostQuery<MonsterInfoResponse>(
    '/summonerswar/monster/info',
    monsterId ? { monster_id: monsterId } : null,
    {
      enabled: !!monsterId,
      refetchOnWindowFocus: false,
      staleTime: MONSTER_INFO_STALE_MS,
      gcTime: MONSTER_INFO_STALE_MS * 2,
    }
  );
};

