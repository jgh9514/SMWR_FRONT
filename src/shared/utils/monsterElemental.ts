import type { AttributeType } from '@/features/siege/types/monster';

/**
 * DB/API `monster_elemental` — 영문, 숫자(1~5, 서머스워 기본), 한글 모두 → AttributeType
 * (MonsterDetailContent / MonsterSearchClient 와 동일 규칙)
 */
export function parseMonsterElemental(
  raw: string | number | null | undefined,
): AttributeType | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === '') return null;
  const k = s.toLowerCase();
  if (k === '1' || k === 'fire' || s === '불') return 'fire';
  if (k === '2' || k === 'water' || s === '물') return 'water';
  if (k === '3' || k === 'wind' || s === '바람') return 'wind';
  if (k === '4' || k === 'light' || s === '빛') return 'light';
  if (k === '5' || k === 'dark' || s === '어둠') return 'dark';
  return null;
}
