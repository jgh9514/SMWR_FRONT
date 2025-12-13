/**
 * JSON 업로드 관련 타입 정의
 */

export interface GuildInfo {
  guildId?: string;
  guildName?: string;
  rating?: number;
  matchRank?: string;
}

export interface SiegeItem {
  siegeId?: string;
  matchId?: string;
  timestamp?: string;
  battleCount?: number;
  isDuplicate?: boolean;
  status?: 'pending' | 'skip' | 'overwrite' | 'inserted' | 'failed';
  index?: number; // log_list 내 인덱스
  guilds?: GuildInfo[]; // 3파전 길드 정보 (1등, 2등, 3등)
}

export interface SiegeValidationResponse {
  totalSiegeCount?: number;
  totalBattleCount?: number;
  siegeItems?: SiegeItem[];
}

export interface SiegeSaveRequest {
  log_list: any[];
  siegeOptions?: Record<string, 'skip' | 'overwrite'>; // 인덱스별 처리 옵션 (키는 문자열)
}

export interface SiegeUploadResponse {
  totalSiegeCount?: number;
  insertedSiegeCount?: number;
  totalBattleCount?: number;
  insertedBattleCount?: number;
  siegeItems?: SiegeItem[];
}

export interface ArenaUploadResponse {
  success?: number;
  fail?: number;
}

