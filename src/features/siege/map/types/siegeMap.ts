export type SiegeMapGuildRow = {
  guild_id: string;
  pos_id: number;
  guild_name: string;
  match_score: number;
  match_score_increment: number;
  match_rank: number;
  play_member_count: number;
  attack_count: number;
  attack_unit_count: number;
  disqualified: number;
};

export type SiegeMapBaseRow = {
  base_number: number;
  base_type: number;
  guild_id: string;
  base_status: number;
  battle_start_time: number;
  construct_time: number;
  remain_sec?: number | null;
};

export type SiegeMapSnapshotHeader = {
  id: number;
  match_id: string;
  captured_at: number;
  war_rest_start_time?: number;
  war_rest_finish_time?: number;
  max_match_score?: number;
  max_deck_count_per_member?: number;
  max_attack_unit_count?: number;
};

export type SiegeMapMatchMeta = {
  match_id: string;
  siege_id: string;
  season_yyyymm: string;
  snapshot_count: number;
  last_snapshot_at?: string;
};

export type SiegeMapViewResponse = {
  match: SiegeMapMatchMeta;
  snapshot: SiegeMapSnapshotHeader | null;
  guilds: SiegeMapGuildRow[];
  bases: SiegeMapBaseRow[];
};

export type SiegeMapHistoryItem = {
  match_id: string;
  siege_id: string;
  season_yyyymm: string;
  snapshot_count: number;
  last_snapshot_at?: string;
  guild_name_1?: string;
  guild_name_2?: string;
  guild_name_3?: string;
  guild_id_1?: string;
  guild_id_2?: string;
  guild_id_3?: string;
  match_score_1?: number;
  match_score_2?: number;
  match_score_3?: number;
};

export type SiegeMapTimelinePoint = {
  id: number;
  captured_at: number;
};

export type SiegeMapHistoryListResponse = {
  list: SiegeMapHistoryItem[];
  totalPage: number;
  totalCount: number;
};

export type SiegeMapBaseDefenseUnit = {
  posId: number;
  unitMasterId: number;
  unitLevel: number;
  krName?: string | null;
  imageUrl?: string | null;
};

export type SiegeMapBaseDefenseDeck = {
  deckId: number;
  wizardId?: string | null;
  wizardName?: string | null;
  wizardLevel?: number | null;
  guildId?: string | null;
  deckStatus: number;
  winCount?: number | null;
  loseCount?: number | null;
  drawCount?: number | null;
  totalCount?: number | null;
  winningRate?: number | null;
  attackWizardId?: string | null;
  battleStartTime?: number | null;
  units: SiegeMapBaseDefenseUnit[];
};

export type SiegeMapBaseDefenseResponse = {
  matchId: string;
  baseNumber: number;
  captureId?: number | null;
  capturedAt?: number | null;
  baseStatus?: number | null;
  guildId?: string | null;
  remainSec?: number | null;
  decks: SiegeMapBaseDefenseDeck[];
};

/** 거점 종류 — layout·이미지 마스터 공통 */
export type SiegeBaseRingKind = 'base' | 'star4' | 'star5';

export type SiegeMapBaseLayoutMasterRow = {
  gameBaseNumber: number;
  castleZone: 'shield' | 'square' | 'circle';
  slotNo: number;
  posXPct: number;
  posYPct: number;
  ringKind: SiegeBaseRingKind;
};

export type SiegeMapBaseImageMasterRow = {
  castleZone: 'shield' | 'square' | 'circle';
  ringKind: SiegeBaseRingKind;
  /** 본진(base)은 null — 단일 이미지 */
  baseStatus: number | null;
  imagePath: string;
  displayWidthPx: number;
  displayHeightPx: number;
};

/** 지도에 쓰는 거점 이미지(경로·표시 크기) */
export type ResolvedSiegeBaseImage = {
  imagePath: string | null;
  displayWidth: number;
  displayHeight: number;
};

export type SiegeMapLayoutMasterResponse = {
  layouts: SiegeMapBaseLayoutMasterRow[];
  images: SiegeMapBaseImageMasterRow[];
};
