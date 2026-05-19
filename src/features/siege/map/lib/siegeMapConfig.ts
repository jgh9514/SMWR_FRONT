import type { SiegeBaseRingKind } from '@/features/siege/map/types/siegeMap';

/** 점령전 지도 캔버스 — 배경 원본 1358×911px */
export const SIEGE_MAP_WIDTH = 1358;
export const SIEGE_MAP_HEIGHT = 911;
export const SIEGE_MAP_ASPECT = `${SIEGE_MAP_WIDTH} / ${SIEGE_MAP_HEIGHT}`;

/** S3/CDN 점령전 맵 배경 경로 */
export const SIEGE_MAP_BACKGROUND_PATH = '/siege/siege_background.png';

/** 상단 3길드 패널 높이 — 거점 좌표는 그 아래 영역 기준 */
export const SIEGE_MAP_HEADER_RATIO = 0.14;

/** 거점 아이콘 기본 크기(px) — DB 미로드 시 폴백 */
export const SIEGE_DISPLAY_HQ = { width: 61, height: 88 } as const;
export const SIEGE_DISPLAY_TOWER_4 = { width: 22, height: 22 } as const;
export const SIEGE_DISPLAY_TOWER_5 = { width: 28, height: 28 } as const;

export function defaultSiegeDisplaySize(
  slotNo: number,
  ringKind: SiegeBaseRingKind,
): { width: number; height: number } {
  if (slotNo === 0 || ringKind === 'base') {
    return SIEGE_DISPLAY_HQ;
  }
  return ringKind === 'star4' ? SIEGE_DISPLAY_TOWER_4 : SIEGE_DISPLAY_TOWER_5;
}

export const SIEGE_MAP_ZONE_LABELS = {
  shield: '방패 성채',
  square: '사각 성채',
  circle: '원형 성채',
} as const;
