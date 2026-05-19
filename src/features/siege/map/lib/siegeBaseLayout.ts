/**
 * 거점 1~39 고정 좌표 (%). DB 마스터 로드 실패 시 FALLBACK 사용.
 * 본진: slot_no === 0 (게임 base_number 1·14·27)
 */
import {
  defaultSiegeDisplaySize,
} from '@/features/siege/map/lib/siegeMapConfig';
import type {
  SiegeBaseRingKind,
  SiegeMapBaseImageMasterRow,
  SiegeMapBaseLayoutMasterRow,
} from '@/features/siege/map/types/siegeMap';

export type { SiegeBaseRingKind } from '@/features/siege/map/types/siegeMap';

export type SiegeBaseZone = 'shield' | 'square' | 'circle';

export type SiegeBaseLayout = {
  top: number;
  left: number;
  zone: SiegeBaseZone;
  slotNo: number;
  ringKind: SiegeBaseRingKind;
  displayWidth: number;
  displayHeight: number;
};

/** 게임 MatchupInfo base_type=3(요새) — 성채당 3개, 4성 거점 */
export const SIEGE_FOUR_STAR_BASE_NUMBERS = new Set([3, 9, 13, 16, 22, 26, 29, 35, 39]);

/** @deprecated slot_no === 0 사용. 폴백·빈 슬롯 병합용 */
export const SIEGE_HQ_BASE_NUMBERS = new Set([1, 14, 27]);

export const POS_GUILD_COLORS: Record<number, string> = {
  1: '#1976d2',
  2: '#d32f2f',
  3: '#ed6c02',
};

export function ringKindFromGameBase(baseNumber: number, slotNo: number): SiegeBaseRingKind {
  if (slotNo === 0) {
    return 'base';
  }
  return SIEGE_FOUR_STAR_BASE_NUMBERS.has(baseNumber) ? 'star4' : 'star5';
}

function asRingKind(v: unknown, slotNo: number, gameBaseNumber?: number): SiegeBaseRingKind {
  if (slotNo === 0) {
    return 'base';
  }
  if (v === 'star4' || v === 'star5') {
    return v;
  }
  if (v === 'inner' || v === 'outer') {
    return gameBaseNumber != null
      ? ringKindFromGameBase(gameBaseNumber, slotNo)
      : 'star5';
  }
  if (gameBaseNumber != null) {
    return ringKindFromGameBase(gameBaseNumber, slotNo);
  }
  return 'star5';
}

function fb(
  top: number,
  left: number,
  zone: SiegeBaseZone,
  slotNo: number,
  baseNumber: number,
): SiegeBaseLayout {
  const ringKind = ringKindFromGameBase(baseNumber, slotNo);
  const size = defaultSiegeDisplaySize(slotNo, ringKind);
  return {
    top,
    left,
    zone,
    slotNo,
    ringKind,
    displayWidth: size.width,
    displayHeight: size.height,
  };
}

const FALLBACK: Record<number, SiegeBaseLayout> = {
  1: fb(46, 10, 'shield', 0, 1),
  2: fb(24, 16, 'shield', 1, 2),
  3: fb(68, 20, 'shield', 9, 3),
  4: fb(18, 24, 'shield', 3, 4),
  5: fb(34, 22, 'shield', 4, 5),
  6: fb(50, 24, 'shield', 5, 6),
  7: fb(66, 26, 'shield', 6, 7),
  8: fb(58, 18, 'shield', 8, 8),
  9: fb(42, 20, 'shield', 7, 9),
  10: fb(22, 12, 'shield', 2, 10),
  11: fb(30, 28, 'shield', 10, 11),
  12: fb(48, 28, 'shield', 11, 12),
  13: fb(64, 14, 'shield', 12, 13),
  14: fb(46, 38, 'square', 0, 14),
  15: fb(68, 42, 'square', 3, 15),
  16: fb(72, 50, 'square', 9, 16),
  17: fb(20, 44, 'square', 1, 17),
  18: fb(58, 48, 'square', 4, 18),
  19: fb(26, 52, 'square', 5, 19),
  20: fb(34, 56, 'square', 6, 20),
  21: fb(50, 58, 'square', 7, 21),
  22: fb(62, 54, 'square', 8, 22),
  23: fb(18, 56, 'square', 2, 23),
  24: fb(30, 62, 'square', 10, 24),
  25: fb(44, 64, 'square', 11, 25),
  26: fb(66, 58, 'square', 12, 26),
  27: fb(46, 66, 'circle', 0, 27),
  28: fb(24, 72, 'circle', 1, 28),
  29: fb(68, 76, 'circle', 9, 29),
  30: fb(18, 80, 'circle', 3, 30),
  31: fb(34, 78, 'circle', 4, 31),
  32: fb(50, 82, 'circle', 5, 32),
  33: fb(66, 84, 'circle', 6, 33),
  34: fb(58, 74, 'circle', 8, 34),
  35: fb(42, 76, 'circle', 7, 35),
  36: fb(22, 86, 'circle', 2, 36),
  37: fb(30, 88, 'circle', 10, 37),
  38: fb(48, 90, 'circle', 12, 38),
  39: fb(64, 88, 'circle', 11, 39),
};

export const ALL_SIEGE_BASE_NUMBERS = Object.keys(FALLBACK)
  .map(Number)
  .sort((a, b) => a - b);

export function layoutRowToSiegeBaseLayout(row: SiegeMapBaseLayoutMasterRow): SiegeBaseLayout {
  const ringKind = asRingKind(row.ringKind, row.slotNo, row.gameBaseNumber);
  const fallback = defaultSiegeDisplaySize(row.slotNo, ringKind);
  const displayWidth = Number(row.displayWidthPx) > 0 ? Number(row.displayWidthPx) : fallback.width;
  const displayHeight = Number(row.displayHeightPx) > 0 ? Number(row.displayHeightPx) : fallback.height;
  return {
    top: Number(row.posYPct),
    left: Number(row.posXPct),
    zone: row.castleZone,
    slotNo: row.slotNo,
    ringKind,
    displayWidth,
    displayHeight,
  };
}

function asCastleZone(v: unknown): SiegeBaseZone {
  if (v === 'shield' || v === 'square' || v === 'circle') {
    return v;
  }
  return 'shield';
}

function resolveImageRingKind(raw: unknown): SiegeBaseRingKind {
  if (raw === 'base' || raw === 'star4' || raw === 'star5') {
    return raw;
  }
  if (raw === 'inner') {
    return 'star5';
  }
  if (raw === 'outer') {
    return 'star5';
  }
  return 'star5';
}

/** API camelCase·snake_case 모두 수용 */
export function normalizeLayoutMasterRow(row: Record<string, unknown>): SiegeMapBaseLayoutMasterRow {
  const slotNo = Number(row.slotNo ?? row.slot_no ?? -1);
  const gameBaseNumber = Number(row.gameBaseNumber ?? row.game_base_number);
  return {
    gameBaseNumber,
    castleZone: asCastleZone(row.castleZone ?? row.castle_zone),
    slotNo,
    posXPct: Number(row.posXPct ?? row.pos_x_pct),
    posYPct: Number(row.posYPct ?? row.pos_y_pct),
    ringKind: asRingKind(row.ringKind ?? row.ring_kind, slotNo, gameBaseNumber),
    displayWidthPx: Number(row.displayWidthPx ?? row.display_width_px ?? 0),
    displayHeightPx: Number(row.displayHeightPx ?? row.display_height_px ?? 0),
  };
}

export function normalizeLayoutMasterImage(row: Record<string, unknown>): SiegeMapBaseImageMasterRow {
  const ringKind = resolveImageRingKind(row.ringKind ?? row.ring_kind);
  const isBase = ringKind === 'base';
  const rawStatus = row.baseStatus ?? row.base_status;
  return {
    castleZone: asCastleZone(row.castleZone ?? row.castle_zone),
    ringKind,
    baseStatus: isBase ? null : Number(rawStatus),
    imagePath: String(row.imagePath ?? row.image_path ?? ''),
  };
}

export function buildLayoutMapFromMaster(
  layouts: SiegeMapBaseLayoutMasterRow[] | undefined,
): Map<number, SiegeBaseLayout> | null {
  if (!layouts?.length) {
    return null;
  }
  const map = new Map<number, SiegeBaseLayout>();
  for (const row of layouts) {
    const normalized = normalizeLayoutMasterRow(row as unknown as Record<string, unknown>);
    map.set(normalized.gameBaseNumber, layoutRowToSiegeBaseLayout(normalized));
  }
  return map;
}

export function normalizeLayoutMasterImages(
  images: SiegeMapBaseImageMasterRow[] | undefined,
): SiegeMapBaseImageMasterRow[] {
  if (!images?.length) {
    return [];
  }
  return images.map((row) =>
    normalizeLayoutMasterImage(row as unknown as Record<string, unknown>),
  );
}

export function getSiegeBaseLayout(
  baseNumber: number,
  layoutMap?: Map<number, SiegeBaseLayout> | null,
): SiegeBaseLayout {
  const fromMaster = layoutMap?.get(baseNumber);
  if (fromMaster) {
    return fromMaster;
  }
  const slotNo = isSiegeHqGameBase(baseNumber) ? 0 : 1;
  const ringKind = ringKindFromGameBase(baseNumber, slotNo);
  const size = defaultSiegeDisplaySize(slotNo, ringKind);
  return (
    FALLBACK[baseNumber] ?? {
      top: 50,
      left: 50,
      zone: 'shield',
      slotNo: isSiegeHqGameBase(baseNumber) ? 0 : -1,
      ringKind,
      displayWidth: size.width,
      displayHeight: size.height,
    }
  );
}

/** 본진: 마스터 slot_no 0 또는 게임 base_type 1 */
export function isSiegeHqBase(layout: SiegeBaseLayout | undefined, baseType?: number): boolean {
  if (layout?.slotNo === 0) {
    return true;
  }
  if (baseType === 1) {
    return true;
  }
  return false;
}

export function isSiegeHqGameBase(baseNumber: number, layout?: SiegeBaseLayout): boolean {
  if (layout) {
    return layout.slotNo === 0;
  }
  return SIEGE_HQ_BASE_NUMBERS.has(baseNumber);
}

export function resolveSiegeBaseImagePath(
  images: SiegeMapBaseImageMasterRow[] | undefined,
  layout: SiegeBaseLayout,
  baseStatus: number,
): string | null {
  if (!images?.length) {
    return null;
  }
  if (layout.ringKind === 'base') {
    return images.find((i) => i.castleZone === layout.zone && i.ringKind === 'base')?.imagePath ?? null;
  }
  const status = baseStatus < 0 ? 0 : baseStatus > 2 ? 2 : baseStatus;
  return (
    images.find(
      (i) =>
        i.castleZone === layout.zone &&
        i.ringKind === layout.ringKind &&
        Number(i.baseStatus) === status,
    )?.imagePath ?? null
  );
}
