/**
 * 최근 점령전 관련 타입 정의
 */

export interface SiegeItem {
  match_id: string;
  guild_count?: number; // 2=1대1 레전드 토너먼트, 3=3파전 일반 점령전
  guild_1st: string;
  guild_2nd: string;
  guild_3rd: string;
  guild_id_1st?: string;
  guild_id_2nd?: string;
  guild_id_3rd?: string;
  rating_1st: number;
  rating_2nd: number;
  rating_3rd: number;
  // 길드별 통계
  attack_rate_1st?: number; // 공성률 (1등)
  attack_win_count_1st?: number; // 공격 성공 수 (1등)
  total_attack_count_1st?: number; // 총 공격 횟수 (1등)
  defense_rate_1st?: number; // 방성률 (1등)
  defense_win_count_1st?: number; // 방어 성공 수 (1등)
  total_defense_count_1st?: number; // 총 방어 횟수 (1등)
  monster_usage_rate_1st?: number; // 몬스터 사용률 (1등)
  unique_monster_deck_count_1st?: number; // 사용된 고유 몬스터 덱 수 (1등)
  available_attack_count_1st?: number; // 사용 가능 칼 수 (1등)
  attack_rate_2nd?: number; // 공성률 (2등)
  attack_win_count_2nd?: number; // 공격 성공 수 (2등)
  total_attack_count_2nd?: number; // 총 공격 횟수 (2등)
  defense_rate_2nd?: number; // 방성률 (2등)
  defense_win_count_2nd?: number; // 방어 성공 수 (2등)
  total_defense_count_2nd?: number; // 총 방어 횟수 (2등)
  monster_usage_rate_2nd?: number; // 몬스터 사용률 (2등)
  unique_monster_deck_count_2nd?: number; // 사용된 고유 몬스터 덱 수 (2등)
  available_attack_count_2nd?: number; // 사용 가능 칼 수 (2등)
  attack_rate_3rd?: number; // 공성률 (3등)
  attack_win_count_3rd?: number; // 공격 성공 수 (3등)
  total_attack_count_3rd?: number; // 총 공격 횟수 (3등)
  defense_rate_3rd?: number; // 방성률 (3등)
  defense_win_count_3rd?: number; // 방어 성공 수 (3등)
  total_defense_count_3rd?: number; // 총 방어 횟수 (3등)
  monster_usage_rate_3rd?: number; // 몬스터 사용률 (3등)
  unique_monster_deck_count_3rd?: number; // 사용된 고유 몬스터 덱 수 (3등)
  available_attack_count_3rd?: number; // 사용 가능 칼 수 (3등)
}

export interface SiegeListResponse {
  list: SiegeItem[];
  totalPage: number;
}

export interface SiegeListParams {
  paging?: number;
  offset?: number;
}

