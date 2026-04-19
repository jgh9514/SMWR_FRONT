import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';
import { monsterAwakenStepDigit, monsterEvolutionGroupKey } from '@/features/siege/lib/monsterIdEvolution';

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

  const mid = String(row.monster_id ?? row.monsterId ?? '');
  const rtaStatsRaw = row.rta_stats_monster_id ?? row.rtaStatsMonsterId;
  const rtaStats =
    rtaStatsRaw != null && String(rtaStatsRaw).trim() !== '' ? String(rtaStatsRaw).trim() : mid;

  return {
    monster_id: mid,
    rta_stats_monster_id: rtaStats,
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
  if (usg !== undefined && usg !== null && String(usg).trim() !== '') {
    const s = String(usg).trim().toUpperCase();
    // WAS/SQL은 Y만 쓰지만, 직렬화·캐시에 따라 값 형태가 달라질 수 있음.
    // 'Y'가 아닌 모든 값을 배제하면(예: 숫자 1) 목록 전체가 비는 경우가 있어, 명시적 비활성만 제외.
    if (s === 'N' || s === 'NO' || s === 'F' || s === 'FALSE' || s === '0') {
      return false;
    }
  }
  const ob = row.obtainable;
  if (ob === false || ob === 'false' || ob === 'f' || ob === 0) return false;
  return true;
}

/** DB/관리자 값은 Normal / Awakened 등 — 점령전 검색은 각성 행만 쓰기 위해 필터 */
function rawRowIsAwakenedMonster(row: Record<string, unknown>): boolean {
  const mid = String(row.monster_id ?? row.monsterId ?? '');
  // 2각은 monster_id 자리로만 구분되는 경우가 있어 arousal 과 무관하게 포함
  if (monsterAwakenStepDigit(mid) === 2) return true;
  const a = row.arousal_type ?? row.arousalType;
  if (a === undefined || a === null || a === '') return false;
  return String(a).trim().toLowerCase() === 'awakened';
}

/** 1각·2각은 monster_id 접두가 달라질 수 있어, 진화 그룹은 family_id + 속성으로 묶음 */
function rawRowFamilyElementKey(row: Record<string, unknown>): string {
  const fidRaw = row.family_id ?? row.familyId;
  const elRaw = row.monster_elemental ?? row.monsterElemental;
  const elNorm = elRaw != null && elRaw !== '' ? String(elRaw).trim().toLowerCase() : '';
  if (fidRaw !== undefined && fidRaw !== null && fidRaw !== '') {
    const fid = typeof fidRaw === 'number' ? fidRaw : Number(String(fidRaw).trim());
    if (!Number.isNaN(fid)) {
      return `f:${fid}|e:${elNorm}`;
    }
  }
  const mid = String(row.monster_id ?? row.monsterId ?? '');
  return `eid:${monsterEvolutionGroupKey(mid)}`;
}

/**
 * 같은 패밀리·같은 속성에 2각(끝에서 두 번째 자리=2) 행이 있으면 1각 행은 제외하고 2각만 유지.
 * 2각이 없는 몹은 1각만 남김.
 */
function filterPreferSecondAwakeningRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byGroup = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) {
    const key = rawRowFamilyElementKey(r);
    let list = byGroup.get(key);
    if (!list) {
      list = [];
      byGroup.set(key, list);
    }
    list.push(r);
  }
  const out: Record<string, unknown>[] = [];
  for (const group of byGroup.values()) {
    const hasSecond = group.some((r) => {
      const mid = String(r.monster_id ?? r.monsterId ?? '');
      return monsterAwakenStepDigit(mid) === 2;
    });
    if (hasSecond) {
      for (const r of group) {
        const mid = String(r.monster_id ?? r.monsterId ?? '');
        if (monsterAwakenStepDigit(mid) === 2) out.push(r);
      }
    } else {
      out.push(...group);
    }
  }
  return out;
}

export type NormalizeMonsterListOptions = {
  /** true면 각성(Awakened) 행만 — 점령전 검색/덱 등 */
  awakenedOnly?: boolean;
};

function sortByMonsterId(a: MonsterOption, b: MonsterOption): number {
  return a.monster_id.localeCompare(b.monster_id, undefined, { numeric: true, sensitivity: 'base' });
}

export function normalizeMonsterList(rows: unknown, options?: NormalizeMonsterListOptions): MonsterOption[] {
  if (!Array.isArray(rows)) return [];
  const awakenedOnly = options?.awakenedOnly === true;
  let list = rows
    .filter((r) => rawRowAllowedForMonsterList(r as Record<string, unknown>))
    .filter((r) => !awakenedOnly || rawRowIsAwakenedMonster(r as Record<string, unknown>))
    .map((r) => r as Record<string, unknown>);
  if (awakenedOnly) {
    list = filterPreferSecondAwakeningRows(list);
  }
  const mapped = list.map((r) => normalizeMonsterOption(r)).filter((m) => m.obtainable !== false);
  if (awakenedOnly) {
    mapped.sort(sortByMonsterId);
  }
  return mapped;
}
