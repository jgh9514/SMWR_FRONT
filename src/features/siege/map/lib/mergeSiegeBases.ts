import type { SiegeMapBaseRow } from '@/features/siege/map/types/siegeMap';
import { ALL_SIEGE_BASE_NUMBERS, isSiegeHqGameBase } from '@/features/siege/map/lib/siegeBaseLayout';

/** API bases를 39거점 슬롯에 병합 — 없는 거점은 빈 슬롯(회색) */
export function mergeSiegeBasesWithAllSlots(bases: SiegeMapBaseRow[]): SiegeMapBaseRow[] {
  const byNum = new Map(bases.map((b) => [Number(b.base_number), b]));
  return ALL_SIEGE_BASE_NUMBERS.map((baseNumber) => {
    const existing = byNum.get(baseNumber);
    if (existing) {
      return existing;
    }
    return {
      base_number: baseNumber,
      base_type: isSiegeHqGameBase(baseNumber) ? 1 : 2,
      guild_id: '',
      base_status: -1,
      battle_start_time: 0,
      construct_time: 0,
      remain_sec: null,
    };
  });
}
