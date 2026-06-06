/**
 * 전적 관련 타입 정의
 */

export interface UserItem {
  wizard_id: string;
  wizard_name: string;
  /** SWEX playerImage — 없으면 wizard_id 로 폴백 */
  channel_uid?: string | null;
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
  /** 전체 판수 (LIMIT 전 윈도우 집계 — 페이지네이션과 무관하게 일정) */
  full_total_count?: number;
  full_win_count?: number;
  full_lose_count?: number;
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

/** 시즌 목록에서 가장 높은(최신) season_no 문자열 — 없으면 '' */
export function getLatestSeasonNo(seasonList: SeasonItem[] | null | undefined): string {
  if (!seasonList?.length) return '';
  let max = 0;
  for (const item of seasonList) {
    const no = getSeasonNo(item as Record<string, unknown>);
    if (no > max) max = no;
  }
  return max > 0 ? String(max) : '';
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

/** record-detail 1회 요청 건수 (WAS normalizeRecordDetailQuery 상한 200) */
export const BATTLE_RECORD_DETAIL_PAGE_SIZE = 50;

