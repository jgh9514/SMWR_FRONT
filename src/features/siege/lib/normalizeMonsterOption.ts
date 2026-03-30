import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';

/**
 * WAS(MyBatis mapUnderscoreToCamelCase) + Jackson Map 직렬화로
 * snake_case / camelCase가 섞여 올 수 있어 프론트에서 한 형태로 맞춤.
 */
export function normalizeMonsterOption(row: Record<string, unknown>): MonsterOption {
  const starRaw = row.star ?? row.Star;
  let star: number | undefined;
  if (starRaw !== undefined && starRaw !== null && starRaw !== '') {
    const n = typeof starRaw === 'number' ? starRaw : Number(String(starRaw).trim());
    if (!Number.isNaN(n)) star = Math.trunc(n);
  }

  const skillRaw = row.skill_ups_to_max ?? row.skillUpsToMax;
  let skill_ups_to_max: number | undefined;
  if (skillRaw !== undefined && skillRaw !== null && skillRaw !== '') {
    const n = typeof skillRaw === 'number' ? skillRaw : Number(String(skillRaw).trim());
    if (!Number.isNaN(n)) skill_ups_to_max = Math.trunc(n);
  }

  const parseOptInt = (v: unknown): number | undefined => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    if (Number.isNaN(n)) return undefined;
    return Math.trunc(n);
  };
  const com2us_id = parseOptInt(row.com2us_id ?? row.com2usId);
  const awakens_from_id = parseOptInt(row.awakens_from_id ?? row.awakensFromId);
  const awakens_to_id = parseOptInt(row.awakens_to_id ?? row.awakensToId);
  const family_id = parseOptInt(row.family_id ?? row.familyId);

  const obRaw = row.obtainable;
  let obtainable: boolean | undefined;
  if (obRaw === true || obRaw === 'true' || obRaw === 1) obtainable = true;
  else if (obRaw === false || obRaw === 'false' || obRaw === 0) obtainable = false;

  return {
    monster_id: String(row.monster_id ?? row.monsterId ?? ''),
    kr_name: String(row.kr_name ?? row.krName ?? ''),
    un_name: String(row.un_name ?? row.unName ?? ''),
    image_url: String(row.image_url ?? row.imageUrl ?? ''),
    modified_kr_name: (row.modified_kr_name ?? row.modifiedKrName) as string | undefined,
    monster_elemental: (row.monster_elemental ?? row.monsterElemental) as string | undefined,
    star,
    arousal_type: (row.arousal_type ?? row.arousalType) as string | undefined,
    archetype: (row.archetype ?? row.Archetype) as string | undefined,
    awaken_bonus: (row.awaken_bonus ?? row.awakenBonus) as string | undefined,
    skill_ups_to_max,
    com2us_id,
    awakens_from_id,
    awakens_to_id,
    family_id,
    obtainable,
  };
}

/**
 * monster-list는 WAS에서 usg_yn=Y & obtainable 이지만,
 * 캐시/구버전/비정상 행이 섞일 수 있어 동일 조건으로 한 번 더 걸러냄.
 * (예: obtainable=false·usg_yn=N 노말 행은 SQL상 목록에 없어야 함)
 */
function rawRowAllowedForMonsterList(row: Record<string, unknown>): boolean {
  const usg = row.usg_yn ?? row.usgYn;
  if (usg !== undefined && usg !== null && String(usg).trim().toUpperCase() !== 'Y') {
    return false;
  }
  const ob = row.obtainable;
  if (ob === false || ob === 'false' || ob === 'f' || ob === 0) return false;
  return true;
}

/** DB/관리자 값은 Normal / Awakened 등 — 점령전 검색은 각성 행만 쓰기 위해 필터 */
function rawRowIsAwakenedMonster(row: Record<string, unknown>): boolean {
  const a = row.arousal_type ?? row.arousalType;
  if (a === undefined || a === null || a === '') return false;
  return String(a).trim().toLowerCase() === 'awakened';
}

export type NormalizeMonsterListOptions = {
  /** true면 각성(Awakened) 행만 — 점령전 검색/덱 등 */
  awakenedOnly?: boolean;
};

export function normalizeMonsterList(rows: unknown, options?: NormalizeMonsterListOptions): MonsterOption[] {
  if (!Array.isArray(rows)) return [];
  const awakenedOnly = options?.awakenedOnly === true;
  return rows
    .filter((r) => rawRowAllowedForMonsterList(r as Record<string, unknown>))
    .filter((r) => !awakenedOnly || rawRowIsAwakenedMonster(r as Record<string, unknown>))
    .map((r) => normalizeMonsterOption(r as Record<string, unknown>))
    .filter((m) => m.obtainable !== false);
}
