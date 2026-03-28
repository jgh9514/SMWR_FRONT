/**
 * monster_id 규칙 (서머너즈워 내부 ID 패턴):
 * - 맨 끝 1자리: 속성(속성번호)
 * - 맨 끝에서 두 번째 1자리: 각성 단계 (0=노말, 1=1차 각성, 2=2차 각성 등 오름차순)
 *
 * 같은 라인(동일 몬스터·동일 속성)은 앞부분 + 마지막 속성 자리만 같고, 각성 자리만 다름.
 */
export function monsterEvolutionGroupKey(monsterId: string): string {
  const s = monsterId.trim();
  if (s.length < 2) return `solo:${s}`;
  return s.slice(0, -2) + s.slice(-1);
}

/** 끝에서 두 번째 자리 숫자 — 각성 단계 정렬용 */
export function monsterAwakenStepDigit(monsterId: string): number | null {
  const s = monsterId.trim();
  if (s.length < 2) return null;
  const ch = s[s.length - 2];
  const n = parseInt(ch, 10);
  return Number.isNaN(n) ? null : n;
}
