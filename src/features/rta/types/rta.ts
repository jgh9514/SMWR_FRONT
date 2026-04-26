/**
 * RTA 관련 타입 정의
 */

/**
 * 서버 매치 한 행 — WAS `getRtaMatches` / `getPlayerRtaMatches` (컬럼명 그대로, 별칭 없음).
 */
export interface RawMatchItem {
  rid?: string | number;
  battle_type?: string | number;
  date_add?: string;
  /** 백엔드 직렬화에 따라 문자열 또는 숫자(1|2)로 올 수 있음 */
  winner_position?: string | number;
  p1_wizard_id?: string;
  p2_wizard_id?: string;
  p1_channel_uid?: string | number;
  p2_channel_uid?: string | number;
  p1_name?: string;
  p2_name?: string;
  p1_country?: string;
  p2_country?: string;
  p1_score?: string | number;
  p2_score?: string | number;
  p1_rating?: string | number;
  p2_rating?: string | number;
  p1_result?: string;
  p2_result?: string;
  p1_first_pick?: string;
  p2_first_pick?: string;
  p1_alive_count?: number;
  p2_alive_count?: number;
  p1_banned_unit?: number;
  p2_banned_unit?: number;
  p1_leader_unit?: number;
  p2_leader_unit?: number;
  p1_units?: string[];
  p2_units?: string[];
  p1_unit_names?: string[];
  p1_unit_images?: string[];
  /** pick_slot_no 순서와 동일한 길이의 벤 여부 */
  p1_unit_banned?: boolean[] | (boolean | string | number)[];
  p2_unit_names?: string[];
  p2_unit_images?: string[];
  p2_unit_banned?: boolean[] | (boolean | string | number)[];
  p1_units_str?: string;
  p2_units_str?: string;
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

/** POST /api/v1/rta/page — WAS `getRtaListPage`: stats.hasMore + matches */
export interface RtaListPageResponse {
  stats: RtaStatsResponse & { hasMore?: boolean };
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

/** 대시보드 막대 순서 (Ch1 → G3) — `rta_rating_grade.rating_id`(게임 마스터) 슬롯 */
export const RTA_DASHBOARD_TIER_RATING_IDS: readonly number[] = [
  1001, 1002, 1003, 2001, 2002, 2003, 3001, 3002, 3003, 3501, 3502, 3503, 4001, 4002, 4003,
];

export interface RtaMatchListParams {
  limit: number;
  offset: number;
  /** rta_season.season_code — seasonId가 있으면 요청에서는 생략 가능 */
  seasonCode?: string | null;
  /** rta_season.season_id (우선). 시즌 목록에서 받은 PK를 넘기면 서버가 코드 조회를 생략 */
  seasonId?: number | null;
  /** 단일 티어 — 몬스터 통계와 동일하게 ratingIds 와 동시에 쓰지 않음(서버는 ratingId 우선) */
  ratingId?: number | null;
  /** 복수 티어(구간 전체 등) */
  ratingIds?: number[] | null;
  /** 시즌 미확정 시 요청 차단 (기본 true) */
  enabled?: boolean;
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
  rows: MonsterStats[] | DuoComboStat[] | TrioComboStat[];
  has_more: boolean;
  type: 'solo' | 'duo' | 'trio';
  limit?: number;
  offset?: number;
  seasonId?: number | null;
  ratingId?: number | null;
  ratingIds?: number[] | null;
}

/** GET /rta/rating-grade-rules — 티어 선택 UI용 */
export interface RtaRatingGradeRule {
  ratingId: number;
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
  /** (시즌·몬스터·상대 조합) */
  counter_matchups?: CounterMatchupRow[];
}

/** 카운터 매치업 — WAS `getRtaMonsterCounterMatchups` (camelCase 별칭만) */
export interface CounterMatchupRow {
  opponentComboKey?: string;
  opponentComboSize?: number;
  winCnt?: number;
  loseCnt?: number;
  winRate?: number | null;
  opponentLabel?: string | null;
}

/** RTA 대시보드 티어 분포 (rating_id 기반) */
export interface RtaTierBucket {
  ratingId: number;
  player_count: number;
  sort_order?: number;
}

/** 일별×티어 누적 — 대시보드 `daily_tiers` (WAS `getRtaTierDistributionDaily`: gradeSlot·ratingId 별칭, 나머지 컬럼명 그대로) */
export interface RtaTierDailyRow {
  bucket_date: string;
  /** rta_agg_tier_daily.grade_slot — 마스터 JOIN 실패 시에도 표시 */
  gradeSlot?: string;
  /** rta_rating_grade.rating_id — 마스터 JOIN 성공 시 */
  ratingId?: number;
  player_count: number;
  sort_order?: number;
}

/** 앵커 시각(3h·6h·12h·3d·7d) × 티어별 최저 점수 — WAS `getRtaRankCutoffAnchorsFromAgg` */
export interface RtaRankCutoffAnchorRow {
  sort_order?: number;
  anchor_key?: string;
  ratingId?: number;
  cutoff_score: number;
}

/** 배치 적재 시 rta_snapshot_rank_cut 최신 스냅샷 — WAS `getRtaSnapshotRankCutLatest` */
export interface RtaSnapshotRankCutRow {
  snapshotAt: string;
  ratingId: number;
  gradeName?: string;
  gradeAbbr?: string;
  cutoffScore: number;
}

export interface RtaDashboardResponse {
  daily_tiers: RtaTierDailyRow[];
  rank_cutoff_anchors?: RtaRankCutoffAnchorRow[];
  /** DB 스냅샷 컷 (rta_snapshot_rank_cut, 배치 적재 후) */
  snapshot_rank_cut?: RtaSnapshotRankCutRow[];
  /** 서버가 설정하는 적용 시즌 PK */
  seasonId?: number | null;
}

/** POST /api/v1/rta/dashboard/tier-distribution */
export interface RtaDashboardTierDistributionResponse {
  daily_tiers: RtaTierDailyRow[];
  seasonId?: number | null;
}

/** POST /api/v1/rta/dashboard/rank-cutoff */
export interface RtaDashboardRankCutoffResponse {
  rank_cutoff_anchors?: RtaRankCutoffAnchorRow[];
  snapshot_rank_cut?: RtaSnapshotRankCutRow[];
  seasonId?: number | null;
}

/** DB rta_season (GET /api/v1/rta/seasons) */
export interface RtaSeasonRow {
  /** rta_season.season_id — API 필터에 권장 */
  seasonId: number;
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
  /** 벤 슬롯 제외 필드 출전 횟수 상위 1~3위 */
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
}

export interface RtaSummonerRankingResponse {
  total: number;
  rankings: RtaSummonerRankingRow[];
  seasonCode?: string | null;
  /** 서버가 적용한 국가 필터(있을 때만) */
  countryFilter?: string | null;
}

/** POST /rta/dashboard/link-preview — 메인 4패널 한 번에 */
export interface RtaDashboardLinkPreviewResponse {
  seasonId?: number | null;
  previewLimit: number;
  solo: RtaMonsterStatsResponse;
  duo: RtaMonsterStatsResponse;
  trio: RtaMonsterStatsResponse;
  summoner_ranking: RtaSummonerRankingResponse;
}

/** POST /rta/summoner-search — 검색 전용: wizard_id·닉·국가만 (snake_case) */
export interface RtaSummonerSearchHit {
  wizard_id?: string;
  wizard_name?: string;
  country?: string;
}

export interface RtaSummonerSearchResponse {
  results: RtaSummonerSearchHit[];
  seasonCode?: string | null;
}

/** POST /rta/player/:wizardId/summary — 집계 행(snake_case) + 서버가 넣는 found·seasonId */
export interface RtaPlayerSummary {
  found: boolean;
  /** 서버 `getRtaPlayerSummary`가 row 병합 후 설정 */
  seasonId?: number | null;
  rank_position?: number;
  wizard_id?: string;
  wizard_name?: string;
  country?: string;
  channel_uid?: string | number | null;
  score?: number;
  /** 시즌 구간 내 최고 점수(집계). 없으면 score와 동일 취급 가능 */
  max_season_score?: number | null;
  rating_id?: number | null;
  match_count?: number;
  win_count?: number;
  win_rate_pct?: number | null;
  last_match_at?: string;
}

/** 소환사×시즌 RTA 몬스터 스냅 분모(`rta_agg_summoner_season_fight_snap`) */
export interface RtaPlayerMonsterFightSnapshot {
  match_cnt?: number;
  non_ban_pick_cnt?: number;
  ban_event_cnt?: number;
  computed_at?: string;
}

/** 소환사×시즌×몬스터 스냅 한 행 */
export interface RtaPlayerMonsterUsageRow {
  unit_master_id: number;
  pick_cnt: number;
  ban_cnt: number;
  win_cnt: number;
  lose_cnt: number;
  first_pick_cnt: number;
  owned_copy_count?: number | null;
  monster_name?: string | null;
  monster_image?: string | null;
  monster_elemental?: string | null;
  pick_rate_pct?: number | null;
  ban_rate_pct?: number | null;
  win_rate_pct?: number | null;
  first_pick_rate_pct?: number | null;
}

/** POST /rta/player/{wizardId}/monster-usage */
export interface RtaPlayerMonsterUsageResponse {
  seasonId?: number | null;
  wizardId?: string;
  fight: RtaPlayerMonsterFightSnapshot | null;
  rows: RtaPlayerMonsterUsageRow[];
}

