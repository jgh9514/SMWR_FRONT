/**
 * 몬스터 관리 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';

export interface MonsterItem {
  monster_id: string;
  monster_elemental: string;
  kr_name: string;
  un_name: string;
  star_type: string;
  star: number;
  arousal_type: string;
  image_url: string;
  leader_id?: string;
  crt_user_id: string;
  crt_date: string;
  upt_user_id: string;
  upt_date: string;
}

export interface MonsterListResponse {
  list: MonsterItem[];
  totalCount: number;
  page: number;
  limit: number;
}

/**
 * 몬스터 목록 조회
 */
export const useMonsterList = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<MonsterListResponse>('/admin/monster/list', params, { enabled: false });
};

/**
 * 몬스터 상세 정보 조회
 */
export const useMonsterDetail = (monsterId: string | null) => {
  return useApiPostQuery<MonsterItem>(
    '/admin/monster/detail',
    { monster_id: monsterId },
    { enabled: !!monsterId }
  );
};

/**
 * 몬스터 정보 수정
 */
export const useMonsterUpdate = (options?: Parameters<typeof useApiPostMutation>[2]) => {
  return useApiPostMutation<{ success: boolean; message: string }, Partial<MonsterItem>>(
    '/admin/monster/update',
    options
  );
};
