import type { RtaRankCutoffAnchorRow } from '@/features/rta/types/rta';
import { isRtaCutoffMissing } from '@/features/rta/utils/rtaCutoffScore';

/** 티어 컷 차트·데이터 순서 (낮은 티어 → 높은 티어: P1 ~ G3) */
export const CUT_TIER_ORDER = ['P1', 'P2', 'P3', 'G1', 'G2', 'G3'] as const;

/** X축: 좌=과거(앵커가 더 옛날) → 우=현재에 가까움 */
export const ANCHOR_CHART_KEYS = ['7d', '3d', '12h', '6h', '3h'] as const;

export const CUT_CHART_Y_MARGIN = 100;

export const ANCHOR_CHART_LABELS: Record<string, string> = {
  '7d': '7일 전',
  '3d': '3일 전',
  '12h': '12시간 전',
  '6h': '6시간 전',
  '3h': '3시간 전',
};

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function pivotRankCutoffAnchors(
  rows: RtaRankCutoffAnchorRow[] | undefined,
  tierOrder: readonly string[] = CUT_TIER_ORDER,
): Map<string, Record<string, number>> {
  const byAnchor = new Map<string, Record<string, number>>();
  const tierSet = new Set(tierOrder);
  for (const row of rows ?? []) {
    const ak = String(row.anchor_key ?? '').trim();
    if (!ak) continue;
    const tk = row.tier_key;
    if (!tk || !tierSet.has(tk)) continue;
    if (!byAnchor.has(ak)) byAnchor.set(ak, {});
    const rec = byAnchor.get(ak)!;
    rec[tk] = toNum(row.cutoff_score);
  }
  return byAnchor;
}

export function buildCutChartRows(byAnchor: Map<string, Record<string, number>>) {
  return ANCHOR_CHART_KEYS.map((ak) => {
    const rec = byAnchor.get(ak) ?? {};
    const row: Record<string, string | number | null> = { anchor: ak };
    for (const tk of CUT_TIER_ORDER) {
      const v = rec[tk];
      row[tk] = v != null && !isRtaCutoffMissing(v) ? v : null;
    }
    return row;
  });
}

/** P1·G3 끝점으로 Y 범위 우선 산출(없으면 전 티어 폴백). Recharts domain [min, max] */
export function computeCutChartYDomain(
  chartRows: Record<string, string | number | null>[],
): [number, number] | undefined {
  const collect = (keys: readonly string[]) => {
    const nums: number[] = [];
    for (const row of chartRows) {
      for (const k of keys) {
        const v = row[k];
        if (typeof v === 'number' && Number.isFinite(v) && !isRtaCutoffMissing(v)) nums.push(v);
      }
    }
    return nums;
  };
  const loKey = CUT_TIER_ORDER[0];
  const hiKey = CUT_TIER_ORDER[CUT_TIER_ORDER.length - 1];
  let nums = collect([loKey, hiKey]);
  if (nums.length === 0) {
    nums = collect([...CUT_TIER_ORDER]);
  }
  if (nums.length === 0) return undefined;
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  return [lo - CUT_CHART_Y_MARGIN, hi + CUT_CHART_Y_MARGIN];
}
