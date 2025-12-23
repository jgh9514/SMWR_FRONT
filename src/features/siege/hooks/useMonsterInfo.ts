/**
 * 몬스터 기본 정보 조회 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';

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
}

export interface MonsterSkill {
  skill_id: number;
  skill_order: number;
  skill_name: string;
  skill_description: string;
  slot: number;
  cooltime: number;
  hits: number;
  passive: boolean;
  aoe: boolean;
  random: boolean;
  max_level: number;
  multiplier_formula: string;
  icon_path: string;
  level_progress_description: string;
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
    }
  );
};

