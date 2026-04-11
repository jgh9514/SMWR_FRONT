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
  /** 백엔드 직렬화에 따라 문자열 또는 숫자(1|2)로 올 수 있음 */
  winner_position?: string | number;
  winnerPosition?: string | number;
  date_add?: string;
  dateAdd?: string;
  date?: string;
  created_at?: string;
  updated_at?: string;
  p1_unit_names?: string[];
  p1_unit_images?: string[];
  /** pick_slot_no 순서와 동일한 길이의 벤 여부 (백엔드 getRtaMatches) */
  p1_unit_banned?: boolean[] | (boolean | string | number)[];
  p1_banned_unit?: number;
  p1_leader_unit?: number;
  p2_unit_names?: string[];
  p2_unit_images?: string[];
  p2_unit_banned?: boolean[] | (boolean | string | number)[];
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
  /** 시즌 전체 매치 수는 COUNT 부하로 /stats 에서 제외 */
  todayMatches?: number;
  weeklyMatches?: number;
  [key: string]: unknown;
}

export interface RtaMatchesResponse {
  matches?: MatchItem[];
  [key: string]: unknown;
}

/** POST /api/v1/rta/page — stats.hasMore + 매치 목록 (전체 건수 COUNT 없음) */
export interface RtaListPageResponse {
  stats: RtaStatsResponse & { hasMore?: boolean; has_more?: boolean };
  matches?: RawMatchItem[];
  [key: string]: unknown;
}

export interface RtaData {
  stats: RtaStatsResponse;
  /** 전체 건수 미조회 — 페이지네이션은 hasMore·상한으로만 추정 */
  totalMatches?: number;
  matches: MatchItem[];
  totalPages: number;
}

/** 세부 티어 키 (레전드 제외) — 서버·getRtaTierShortLabel 과 동일 */
export type RtaTierKey =
  | 'Ch1'
  | 'Ch2'
  | 'Ch3'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'C1'
  | 'C2'
  | 'C3'
  | 'P1'
  | 'P2'
  | 'P3'
  | 'G1'
  | 'G2'
  | 'G3';

/** 드롭다운 표시: G3 → Ch1 내림차순, 마지막에 전체. 별 개수는 rating_id 일의 자리와 동일 */
export const DEFAULT_RTA_LIST_TIER_KEY: RtaTierKey = 'G3';

export const RTA_TIER_KEY_FILTER_ITEMS: { value: '' | RtaTierKey; previewRating?: number }[] = [
  { value: 'G3', previewRating: 4033 },
  { value: 'G2', previewRating: 4022 },
  { value: 'G1', previewRating: 4011 },
  { value: 'P3', previewRating: 3533 },
  { value: 'P2', previewRating: 3522 },
  { value: 'P1', previewRating: 3511 },
  { value: 'C3', previewRating: 3033 },
  { value: 'C2', previewRating: 3022 },
  { value: 'C1', previewRating: 3011 },
  { value: 'F3', previewRating: 2033 },
  { value: 'F2', previewRating: 2022 },
  { value: 'F1', previewRating: 2011 },
  { value: 'Ch3', previewRating: 1033 },
  { value: 'Ch2', previewRating: 1022 },
  { value: 'Ch1', previewRating: 1011 },
  { value: '' },
];

export interface RtaMatchListParams {
  limit: number;
  offset: number;
  /** rta_season.season_code — 없으면 서버가 금일 기준 기본 시즌 사용 */
  seasonCode?: string | null;
  /** Ch1~G3 — 해당 세부 티어 플레이어가 한 명이라도 있는 매치만 */
  tierKey?: '' | RtaTierKey | null;
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
  /** 솔로(표본≥100) 전체 행 수 */
  stats_total?: number;
  /** 듀오 조합 전체 행 수 */
  duo_total?: number;
  /** 트리오 조합 전체 행 수 */
  trio_total?: number;
  /** 페이지 크기(기본 20) */
  limit?: number;
  stats_offset?: number;
  duo_offset?: number;
  trio_offset?: number;
  has_more?: boolean; // 더 불러올 데이터가 있는지
  seasonCode?: string | null;
  /** 적용된 티어 필터 — null/미포함이면 전체(합산) */
  tierKey?: string | null;
}

/** GET /rta/rating-grade-rules — 티어 선택 UI용 */
export interface RtaRatingGradeRule {
  ratingId: number;
  tierKey: string;
  gradeName?: string;
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
  /** rta_agg_counter_matchup (시즌·몬스터·상대 조합) */
  counter_matchups?: CounterMatchupRow[];
}

/** 카운터 매치업 (상대 조합 대비 승패) */
export interface CounterMatchupRow {
  opponent_combo_key?: string;
  opponentComboKey?: string;
  opponent_combo_size?: number;
  opponentComboSize?: number;
  win_cnt?: number;
  winCnt?: number;
  lose_cnt?: number;
  loseCnt?: number;
  win_rate?: number | null;
  winRate?: number | null;
  opponent_label?: string | null;
  opponentLabel?: string | null;
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

/** 배치 적재 시 rta_snapshot_rank_cut 최신 스냅샷 행 */
export interface RtaSnapshotRankCutRow {
  snapshot_at?: string;
  snapshotAt?: string;
  rating_id?: number;
  ratingId?: number;
  tier_key?: string;
  tierKey?: string;
  grade_name?: string;
  gradeName?: string;
  grade_abbr?: string;
  gradeAbbr?: string;
  cutoff_score?: number;
  cutoffScore?: number;
}

export interface RtaDashboardResponse {
  daily_tiers: RtaTierDailyRow[];
  date_range?: {
    min_date?: string;
    max_date?: string;
  };
  rank_cutoff_anchors?: RtaRankCutoffAnchorRow[];
  /** DB 스냅샷 컷 (rta_snapshot_rank_cut, 배치 적재 후) */
  snapshot_rank_cut?: RtaSnapshotRankCutRow[];
  /** 적용된 시즌 코드 (요청 미지정 시 서버 기본) */
  seasonCode?: string | null;
}

/** DB rta_season (GET /api/v1/rta/seasons) */
export interface RtaSeasonRow {
  seasonCode: string;
  seasonNo: number;
  leagueType: string;
  seasonName: string;
  /** KST 달력 첫 버킷일(서버 startYmdKst 우선) */
  startAt: string;
  /** 집계 가능한 마지막 포함일(KST). DB end_at 배타 상한의 전날 — 티어 일별과 동일 */
  endAt: string;
  isActive: boolean;
  sortOrder: number;
}

export interface RtaSeasonsResponse {
  seasons: RtaSeasonRow[];
  /** 금일 시각이 시즌 구간에 포함될 때의 seasonCode (없으면 DB 최신 시즌). 서버 계산 */
  defaultSeasonCode?: string | null;
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
  seasonCode?: string | null;
  /** 서버가 적용한 국가 필터(있을 때만) */
  countryFilter?: string | null;
}

/** POST /rta/summoner-search */
export interface RtaSummonerSearchHit {
  rank_position?: number;
  rankPosition?: number;
  wizard_id?: string;
  wizardId?: string;
  wizard_name?: string;
  wizardName?: string;
  country?: string;
  /** SWEX 프로필 이미지 — 없으면 wizard_id 로 폴백 */
  channel_uid?: string | number | null;
  channelUid?: string | number | null;
  score?: number;
  rating_id?: number;
  ratingId?: number;
}

export interface RtaSummonerSearchResponse {
  results: RtaSummonerSearchHit[];
  seasonCode?: string | null;
}

/** POST /rta/player/:wizardId/summary — MyBatis·JSON camelCase 병행 */
export interface RtaPlayerSummary {
  found: boolean;
  seasonCode?: string | null;
  rank_position?: number;
  rankPosition?: number;
  wizard_id?: string;
  wizard_name?: string;
  wizardName?: string;
  country?: string;
  channel_uid?: string | number | null;
  channelUid?: string | number | null;
  score?: number;
  /** 시즌 구간 내 최고 점수(집계 테이블). 없으면 score와 동일하게 취급 가능 */
  max_season_score?: number | null;
  maxSeasonScore?: number | null;
  rating_id?: number | null;
  ratingId?: number | null;
  match_count?: number;
  matchCount?: number;
  win_count?: number;
  winCount?: number;
  win_rate_pct?: number | null;
  winRatePct?: number | null;
  last_match_at?: string;
  lastMatchAt?: string;
}

