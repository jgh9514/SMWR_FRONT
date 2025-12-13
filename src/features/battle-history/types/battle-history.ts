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

export interface RecordListParams {
  paging?: number;
  offset?: number;
}

export interface RecordDetailParams extends RecordListParams {
  wizard_id: string;
}

