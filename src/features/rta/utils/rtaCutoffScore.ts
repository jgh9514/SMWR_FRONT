/**
 * 과거 WAS: 리플레이로 티어 최저점을 못 구할 때 COALESCE 마지막 값(공식 최소 승점과 무관).
 * 현재는 DB에 0으로 저장 — 둘 다 "추정 불가"로 취급.
 */
export const RTA_CUTOFF_FALLBACK_SCORE_LEGACY = 1000;

export function isRtaCutoffMissing(score: number | null | undefined): boolean {
  if (score == null || !Number.isFinite(score)) return true;
  if (score <= 0) return true;
  if (score === RTA_CUTOFF_FALLBACK_SCORE_LEGACY) return true;
  return false;
}

export function formatRtaCutoffScore(score: number | null | undefined): string {
  return isRtaCutoffMissing(score) ? '—' : Math.round(Number(score)).toLocaleString();
}
