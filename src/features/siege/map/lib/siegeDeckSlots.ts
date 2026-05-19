import type { SiegeBaseRingKind } from '@/features/siege/map/types/siegeMap';

/** 하단 막대 — 구역 배지 한 변(px), SiegeMapZoneShape 와 동일 */
export const SIEGE_MARKER_BADGE_SIZE = 14;

/** 게이지 칸 최소 너비(px) */
const SIEGE_GAUGE_SEGMENT_MIN_PX = 5;

/** 거점 방어 덱 슬롯 수 (게임: 4성 3팀, 5성 5팀) */
export function siegeDeckSlotCount(ringKind: SiegeBaseRingKind): number {
  if (ringKind === 'star4') {
    return 3;
  }
  return 5;
}

/** 접근성·툴팁용 라벨 */
export function siegeRingKindLabel(ringKind: SiegeBaseRingKind): string {
  if (ringKind === 'base') {
    return '본진';
  }
  if (ringKind === 'star4') {
    return '4성';
  }
  return '5성';
}

/** 하단 (모양|게이지) 막대 — 타워보다 좁지 않게, 슬롯 수만큼 최소 너비 확보 */
export function siegeMarkerBarWidth(ringKind: SiegeBaseRingKind, towerWidthPx: number): number {
  if (ringKind === 'base') {
    return towerWidthPx;
  }
  const slots = siegeDeckSlotCount(ringKind);
  const minForGauge = SIEGE_MARKER_BADGE_SIZE + slots * SIEGE_GAUGE_SEGMENT_MIN_PX + 2;
  return Math.max(towerWidthPx, minForGauge);
}
