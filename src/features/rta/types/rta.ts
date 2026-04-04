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
  /** SWEX playerImage/{channel_uid}.jpg — wizard_id 와 다를 수 있음 */
  p1_channel_uid?: string | number;
  p2_channel_uid?: string | number;
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
  /** 프로필용, 없으면 p1Id(wizard)로 폴백 */
  p1ChannelUid?: string;
  p1Name: string;
  p1Country?: string;
  p1Rating: number;
  p1Score: number;
  p2Id: string;
  p2ChannelUid?: string;
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

/** 2마리가 같은 팀 덱에 동시에 포함된 경우의 승률 */
export interface DuoComboStat {
  monster_id_1?: string;
  monster_id_2?: string;
  monster_name_1?: string;
  monster_name_2?: string;
  monster_image_1?: string;
  monster_image_2?: string;
  monster_elemental_1?: string;
  monster_elemental_2?: string;
  match_count: number;
  win_rate: number;
}

/** 3마리가 같은 팀 덱에 동시에 포함된 경우의 승률 */
export interface TrioComboStat {
  monster_id_1?: string;
  monster_id_2?: string;
  monster_id_3?: string;
  monster_name_1?: string;
  monster_name_2?: string;
  monster_name_3?: string;
  monster_image_1?: string;
  monster_image_2?: string;
  monster_image_3?: string;
  monster_elemental_1?: string;
  monster_elemental_2?: string;
  monster_elemental_3?: string;
  match_count: number;
  win_rate: number;
}

export interface RtaMonsterStatsResponse {
  stats: MonsterStats[];
  duo_stats?: DuoComboStat[];
  trio_stats?: TrioComboStat[];
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

/** RTA 대시보드 티어 분포 (rating_id 기반) */
export interface RtaTierBucket {
  tier_key: string;
  player_count: number;
  sort_order?: number;
}

/** 일별×티어 집계 행 (서버 전체 조회 후 클라이언트에서 기간 합산) */
export interface RtaTierDailyRow {
  bucket_date: string;
  tier_key: string;
  player_count: number;
  sort_order?: number;
}

/** 앵커 시각(3h·6h·12h·3d·7d) × 티어별 최저 점수 (랭크 컷 추정) */
export interface RtaRankCutoffAnchorRow {
  sort_order?: number;
  anchor_key?: string;
  tier_key: string;
  cutoff_score: number;
}

export interface RtaDashboardResponse {
  daily_tiers: RtaTierDailyRow[];
  date_range?: {
    min_date?: string;
    max_date?: string;
  };
  rank_cutoff_anchors?: RtaRankCutoffAnchorRow[];
}

/** RTA 소환사 랭킹 한 행 (리플레이 집계 기준) */
export interface RtaSummonerRankingRow {
  rank_position?: number;
  wizard_id?: string;
  wizard_name?: string;
  country?: string;
  /** SWEX playerImage — 없으면 RTA 목록과 같이 wizard_id 로 폴백 */
  channel_uid?: string | number | null;
  score?: number;
  rating_id?: number | null;
  last_match_at?: string;
  /** 수집 리플레이 전체 기준 승·경기 수 (집계 방식 설명과 동일 데이터셋) */
  win_count?: number;
  match_count?: number;
  /** 벤 슬롯 제외 필드 출전 횟수 상위 1~3위 (MyBatis camelCase 병행 가능) */
  most_monster_1_id?: string | number;
  most_monster_1_name?: string;
  most_monster_1_image?: string;
  most_monster_1_pick_count?: number;
  most_monster_2_id?: string | number;
  most_monster_2_name?: string;
  most_monster_2_image?: string;
  most_monster_2_pick_count?: number;
  most_monster_3_id?: string | number;
  most_monster_3_name?: string;
  most_monster_3_image?: string;
  most_monster_3_pick_count?: number;
  mostMonster1Id?: string | number;
  mostMonster1Name?: string;
  mostMonster1Image?: string;
  mostMonster1PickCount?: number;
  mostMonster2Id?: string | number;
  mostMonster2Name?: string;
  mostMonster2Image?: string;
  mostMonster2PickCount?: number;
  mostMonster3Id?: string | number;
  mostMonster3Name?: string;
  mostMonster3Image?: string;
  mostMonster3PickCount?: number;
}

export interface RtaSummonerRankingResponse {
  total: number;
  rankings: RtaSummonerRankingRow[];
}

