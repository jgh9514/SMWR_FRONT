/**
 * 점령전 상세 관련 타입 정의
 */

export interface EnemyData {
  team_id: string;
  image_url1?: string;
  image_url2?: string;
  image_url3?: string;
  leader_icon?: string;
  leader_type?: string;
  leader_stat?: string;
  leader_increase_by?: number;
  leader_skill_description?: string;
  m1_kr_name?: string;
  m2_kr_name?: string;
  m3_kr_name?: string;
  total_rate?: number;
  total_count?: number;
  win_count?: number;
  lose_count?: number;
}

export interface HistoryItem {
  image_url1?: string;
  image_url2?: string;
  image_url3?: string;
  leader_icon?: string;
  leader_type?: string;
  leader_stat?: string;
  leader_increase_by?: number;
  win_rate?: number;
  total_rate?: number;
  total_count?: number;
  win_count?: number;
  lose_count?: number;
  /** 공격 조합(공성률 이력 행) — 공덱 상세·투표 연동용 */
  atk_monster_1?: string;
  atk_monster_2?: string;
  atk_monster_3?: string;
  /** 추천 공덱 테이블에 등록된 경우에만 존재 */
  deck_id?: string | number;
  recommend_count?: number;
  not_recommend_count?: number;
  /** 로그인 사용자 기준 UP / DOWN / null */
  my_vote?: string;
}

export interface RecommendedItem {
  team_id?: string;
  deck_id?: string;
  /** 방덱(적 수비) — deck_id 없이 상세 조회 시 */
  def_monster_1?: string;
  def_monster_2?: string;
  def_monster_3?: string;
  atk_monster_1?: string;
  atk_monster_2?: string;
  atk_monster_3?: string;
  image_url1?: string;
  image_url2?: string;
  image_url3?: string;
  win_rate?: number;
  win_count?: number;
  lose_count?: number;
  recommend_count?: number;
  not_recommend_count?: number;
  /** 로그인 사용자 기준 UP / DOWN / null */
  my_vote?: string;
  [key: string]: unknown;
}

export interface MonsterDetailResponse {
  enemyData: EnemyData;
  historyList: HistoryItem[];
  historyTotalCount: number;
  recommendedList: RecommendedItem[];
  recommendedTotalCount: number;
}

export interface MonsterDetailParams {
  match_id?: string;
  dm1?: string;
  dm2?: string;
  dm3?: string;
  view_all_guilds?: boolean;
  view_guild_id?: string;
  /** C=최근 시즌, A=전체 시즌 — 설정(userInfo)과 동기화 */
  siege_view_scope?: 'C' | 'A';
  historyLimit?: number;
  historyOffset?: number;
  recommendedLimit?: number;
  recommendedOffset?: number;
  recentLimit?: number;
  recentOffset?: number;
}

/** 기본 정보만 */
export interface MonsterDetailBasicResponse {
  enemyData: EnemyData[];
}

/** 추천 공덱만 */
export interface MonsterDetailRecommendedResponse {
  recommendedList: RecommendedItem[];
  recommendedHasNext: boolean;
}

/** 공성률 이력만 */
export interface MonsterDetailHistoryResponse {
  historyList: HistoryItem[];
  historyHasNext: boolean;
  historyTotalCount?: number;
}

export interface RecentBattleItem {
  log_id?: string;
  log_timestamp?: string | number;
  wizard_name?: string;
  opp_wizard_name?: string;
  win_lose?: string;
  opp_guild_name?: string;
  atk_guild_name?: string;
  atk_image_url1?: string;
  atk_image_url2?: string;
  atk_image_url3?: string;
  def_image_url1?: string;
  def_image_url2?: string;
  def_image_url3?: string;
}

/** 최근 전적 */
export interface MonsterDetailRecentBattlesResponse {
  recentBattleList: RecentBattleItem[];
  recentBattleHasNext: boolean;
  recentBattleTotalCount?: number;
}

