/**
 * 전적 관련 타입 정의
 */

export interface UserItem {
  wizard_id: string;
  wizard_name: string;
  total_rate: number;
  win_count: number;
  lose_count: number;
}

export interface BattleItem {
  match_id: string;
  log_id?: string;
  log_timestamp?: string;
  guild_name: string;
  opp_guild_name: string;
  win_lose: string;
  wizard_name?: string;
  opp_wizard_name?: string;
  image_url1?: string;
  image_url2?: string;
  image_url3?: string;
  opp_image_url1?: string;
  opp_image_url2?: string;
  opp_image_url3?: string;
  attack_monster_1?: string;
  attack_monster_2?: string;
  attack_monster_3?: string;
  defense_monster_1?: string;
  defense_monster_2?: string;
  defense_monster_3?: string;
}

export interface BattleGroup {
  dateLabel: string;
  guildsLabel: string;
  battles: BattleItem[];
  winCount: number;
  loseCount: number;
}

export interface SeasonItem {
  season_no?: number;
  seasonNo?: number; // camelCase fallback
  start_date?: string;
  end_date?: string | null;
  start_yyyymm?: string;
  end_yyyymm?: string;
}

/** API 응답에서 season_no 추출 (snake_case/camelCase 모두 지원) */
export function getSeasonNo(item: Record<string, unknown>): number {
  const v = item?.season_no ?? item?.seasonNo ?? item?.SEASON_NO;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** season_no: 없으면 전체, 있으면 해당 시즌만 */
export interface RecordListParams {
  paging?: number;
  offset?: number;
  season_no?: number | string;
}

export interface RecordDetailParams extends RecordListParams {
  wizard_id: string;
}

