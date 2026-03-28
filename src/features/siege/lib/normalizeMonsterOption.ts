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
  };
}

export function normalizeMonsterList(rows: unknown): MonsterOption[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => normalizeMonsterOption(r as Record<string, unknown>));
}
