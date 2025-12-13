/**
 * RTA 관련 타입 정의
 */

// 서버에서 받는 원본 매치 데이터 (snake_case)
export interface RawMatchItem {
  p1_name?: string;
  p1Name?: string;
  p1_player_name?: string;
  p1PlayerName?: string;
  p2_name?: string;
  p2Name?: string;
  p2_player_name?: string;
  p2PlayerName?: string;
  winner_position?: string;
  date_add?: string;
  dateAdd?: string;
  date?: string;
  created_at?: string;
  updated_at?: string;
  p1_unit_names?: string[];
  p1_unit_images?: string[];
  p1_banned_unit?: number;
  p1_leader_unit?: number;
  p2_unit_names?: string[];
  p2_unit_images?: string[];
  p2_banned_unit?: number;
  p2_leader_unit?: number;
  p1_pick_order?: number[];
  p2_pick_order?: number[];
  p1_first_pick?: string;
  p2_first_pick?: string;
  p1_wizard_id?: string;
  p2_wizard_id?: string;
  p1_country?: string;
  p2_country?: string;
  p1_score?: string | number;
  p1Score?: string | number;
  p2_score?: string | number;
  p2Score?: string | number;
  p1_rating?: string | number;
  p1Rating?: string | number;
  p2_rating?: string | number;
  p2Rating?: string | number;
}

// 클라이언트에서 사용하는 매치 데이터 (camelCase)
export interface MatchItem {
  p1Id: string;
  p1Name: string;
  p1Country?: string;
  p1Rating: number;
  p1Score: number;
  p2Id: string;
  p2Name: string;
  p2Country?: string;
  p2Rating: number;
  p2Score: number;
  winnerPosition: '1' | '2';
  date: string;
  p1Units?: Array<{ image: string; name: string; banned?: boolean; leader?: boolean }>;
  p2Units?: Array<{ image: string; name: string; banned?: boolean; leader?: boolean }>;
  p1FirstPick?: string;
  p2FirstPick?: string;
}

export interface RtaStatsResponse {
  todayMatches?: number;
  weeklyMatches?: number;
  [key: string]: unknown;
}

export interface RtaMatchCountResponse {
  count: number;
}

export interface RtaMatchesResponse {
  matches?: MatchItem[];
  [key: string]: unknown;
}

export interface RtaData {
  stats: RtaStatsResponse;
  totalMatches: number;
  matches: MatchItem[];
  totalPages: number;
}

export interface RtaMatchListParams {
  limit: number;
  offset: number;
}

// 몬스터별 통계 타입
export interface MonsterStats {
  monster_id?: string; // 몬스터 ID (unit_master_id)
  monster_elemental?: string; // 몬스터 속성 (Fire, Water, Wind, Light, Dark)
  monster_name: string;
  monster_image?: string;
  pick_count: number; // 픽횟수
  pick_rate: number; // 픽률 (%)
  win_rate: number; // 승률 (%)
  first_pick_rate: number; // 선픽율 (%)
  ban_rate: number; // 벤율 (%)
}

export interface RtaMonsterStatsResponse {
  stats: MonsterStats[];
  total_matches: number;
  has_more?: boolean; // 더 불러올 데이터가 있는지
}

// 몬스터 상세 정보 타입
export interface MonsterDetail {
  monster_id: number;
  monster_elemental: string;
  monster_name: string;
  monster_image?: string;
  pick_count: number;
  pick_rate: number;
  win_rate: number;
  first_pick_rate: number;
  ban_rate: number;
  strong_against: Array<{
    monster_id: number;
    monster_elemental: string;
    monster_name: string;
    monster_image?: string;
    win_rate: number;
    match_count: number;
  }>;
  good_combos: Array<{
    monster_id: number;
    monster_elemental: string;
    monster_name: string;
    monster_image?: string;
    win_rate: number;
    match_count: number;
  }>;
  good_triple_combos: Array<{
    monster1_id: number;
    monster1_elemental: string;
    monster1_name: string;
    monster1_image?: string;
    monster2_id: number;
    monster2_elemental: string;
    monster2_name: string;
    monster2_image?: string;
    win_rate: number;
    match_count: number;
  }>;
  recent_matches: Array<{
    match_id: string;
    match_date: string;
    win_lose: 'WIN' | 'LOSE';
    opponent_team: Array<{
      monster_id: number;
      monster_name: string;
      monster_image?: string;
    }>;
    my_team: Array<{
      monster_id: number;
      monster_name: string;
      monster_image?: string;
    }>;
  }>;
}

