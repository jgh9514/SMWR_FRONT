/**
 * 점령전 관련 타입 정의
 */

export interface GuildItem {
  guild_name: string;
  rating: number;
}

export interface MonsterItem {
  key: string;
  image_url1?: string;
  image_url2?: string;
  image_url3?: string;
  win_rate?: number;
  win_count?: number;
  lose_count?: number;
}

export interface SiegeSearchParams {
  guild_names?: string[];
  monster_ids?: string[];
  deck_star_filter?: 'ALL' | 'FOUR_STAR' | 'FIVE_STAR';
  min_lose_count?: number;
  view_all_guilds?: boolean;
  view_guild_id?: string;
}

/**
 * 점령전 길드 정보 (필터링용)
 */
export interface GuildInfo {
  guild_id?: string;
  guild_name: string;
  rating: number;
}

/**
 * 몬스터 스탯 정보
 */
export interface MonsterStats {
  hp: { base: number; plus?: number };
  atk: { base: number; plus?: number };
  def: { base: number; plus?: number };
  spd: { base: number; plus?: number };
  cr: { base: number; plus?: number };
  cd: { base: number; plus?: number };
  res: { base: number; plus?: number };
  acc: { base: number; plus?: number };
}

/**
 * 몬스터 상세 정보
 */
export interface Monster {
  name: string;
  runeSet: string;
  rune2: string;
  stats: MonsterStats;
}

/**
 * 덱 저장용 몬스터 스탯 정보 (AddDeckPopup에서 사용)
 */
export interface DeckMonsterStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;
  critDmg: number;
  resistance: number;
  accuracy: number;
}

