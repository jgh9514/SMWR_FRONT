import type { CounterMatchupRow } from '@/features/rta/types/rta';

/** 경기 수 — matchCnt 우선, 없으면 win+lose */
export function counterMatchupMatchCnt(row: CounterMatchupRow): number {
  const mc = row.matchCnt;
  if (mc != null && Number.isFinite(Number(mc))) {
    return Number(mc);
  }
  return Number(row.winCnt ?? 0) + Number(row.loseCnt ?? 0);
}

export function sortCounterMatchupsByMatchCntDesc(rows: CounterMatchupRow[]): CounterMatchupRow[] {
  return [...rows].sort((a, b) => counterMatchupMatchCnt(b) - counterMatchupMatchCnt(a));
}
