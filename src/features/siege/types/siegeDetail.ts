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
  win_count?: number;
  lose_count?: number;
}

export interface RecommendedItem {
  team_id?: string;
  deck_id?: string;
  image_url1?: string;
  image_url2?: string;
  image_url3?: string;
  win_rate?: number;
  win_count?: number;
  lose_count?: number;
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
  historyLimit?: number;
  historyOffset?: number;
  recommendedLimit?: number;
  recommendedOffset?: number;
}

/** 기본 정보만 */
export interface MonsterDetailBasicResponse {
  enemyData: EnemyData[];
}

/** 추천 공덱만 */
export interface MonsterDetailRecommendedResponse {
  recommendedList: RecommendedItem[];
  recommendedTotalCount: number;
}

/** 공성률 이력만 */
export interface MonsterDetailHistoryResponse {
  historyList: HistoryItem[];
  historyTotalCount: number;
}

