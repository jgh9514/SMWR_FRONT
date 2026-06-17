import { createEmptyDeckMonsterStats, type DeckMonsterStats } from '@/features/siege/types/siege';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';
import {
  pickDeckStat,
  resolveAtkMonsters,
  resolveMonsterImageUrl,
  resolveMonsterKrName,
} from '@/features/siege/utils/deckRecord';
import { buildMonsterOrderString, parseMonsterOrderString } from '@/features/siege/utils/deckOrder';

type DeckDetailRecord = Record<string, unknown>;

const normalizeStatValue = (value: unknown, defaultValue = 0): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const numValue = Number(value);
  return Number.isNaN(numValue) ? defaultValue : numValue;
};

export function extractStatsFromDeckDetail(
  detail: DeckDetailRecord,
  index: 1 | 2 | 3,
  prefix = '',
): DeckMonsterStats {
  const get = (key: string) => normalizeStatValue(pickDeckStat(detail, index, `${prefix}${key}`), 0);
  const runeId1Raw = pickDeckStat(detail, index, `${prefix}rune_id_1`);
  const runeId2Raw = pickDeckStat(detail, index, `${prefix}rune_id_2`);
  const runeId3Raw = pickDeckStat(detail, index, `${prefix}rune_id_3`);
  const runeId1 = runeId1Raw == null || runeId1Raw === '' ? null : Number(runeId1Raw);
  const runeId2 = runeId2Raw == null || runeId2Raw === '' ? null : Number(runeId2Raw);
  const runeId3 = runeId3Raw == null || runeId3Raw === '' ? null : Number(runeId3Raw);
  return {
    hp: get('hp'),
    atk: get('atk'),
    def: get('def'),
    spd: get('spd'),
    critRate: get('crit_rate'),
    critDmg: get('crit_dmg'),
    resistance: get('resistance'),
    accuracy: get('accuracy'),
    runeId1: typeof runeId1 === 'number' && Number.isFinite(runeId1) && runeId1 > 0 ? runeId1 : null,
    runeId2: typeof runeId2 === 'number' && Number.isFinite(runeId2) && runeId2 > 0 ? runeId2 : null,
    runeId3: typeof runeId3 === 'number' && Number.isFinite(runeId3) && runeId3 > 0 ? runeId3 : null,
  };
}

export function extractOrStatsListFromDeckDetail(detail: DeckDetailRecord, index: 1 | 2 | 3): DeckMonsterStats[] {
  const raw = pickDeckStat(detail, index, 'or_options_json');
  const parseItem = (item: Record<string, unknown>): DeckMonsterStats => ({
    hp: normalizeStatValue(item.hp),
    atk: normalizeStatValue(item.atk),
    def: normalizeStatValue(item.def),
    spd: normalizeStatValue(item.spd),
    critRate: normalizeStatValue(item.crit_rate ?? item.critRate),
    critDmg: normalizeStatValue(item.crit_dmg ?? item.critDmg),
    resistance: normalizeStatValue(item.resistance),
    accuracy: normalizeStatValue(item.accuracy),
    runeId1: normalizeStatValue(item.rune_id_1 ?? item.runeId1, 0) || null,
    runeId2: normalizeStatValue(item.rune_id_2 ?? item.runeId2, 0) || null,
    runeId3: normalizeStatValue(item.rune_id_3 ?? item.runeId3, 0) || null,
  });
  const normalizeList = (arr: unknown[]): DeckMonsterStats[] =>
    arr.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object').map(parseItem);

  if (Array.isArray(raw)) {
    return normalizeList(raw);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return normalizeList(parsed);
    } catch {
      // ignore
    }
  }
  const legacy = extractStatsFromDeckDetail(detail, index, 'or_');
  const hasLegacy =
    legacy.hp !== 0
    || legacy.atk !== 0
    || legacy.def !== 0
    || legacy.spd !== 0
    || legacy.critRate !== 0
    || legacy.critDmg !== 0
    || legacy.resistance !== 0
    || legacy.accuracy !== 0
    || legacy.runeId1 != null
    || legacy.runeId2 != null
    || legacy.runeId3 != null;
  return hasLegacy ? [legacy] : [];
}

function resolveMonsterOption(
  detail: DeckDetailRecord,
  monsterList: MonsterOption[],
  slot: 1 | 2 | 3,
  monsterId: string,
): MonsterOption {
  const fromList = monsterList.find((m) => m.monster_id === monsterId);
  if (fromList) {
    return fromList;
  }
  return {
    monster_id: monsterId,
    kr_name: resolveMonsterKrName(detail, slot) || monsterId,
    un_name: '',
    image_url: resolveMonsterImageUrl(detail, slot) ?? '',
  };
}

export interface DeckFormImportState {
  selectedMonsterList: MonsterOption[];
  monsterStats: DeckMonsterStats[];
  monsterStatsOrList: DeckMonsterStats[][];
  turnOrderIds: string[];
  turnOrder: string;
  deckComment: string;
}

/** deck-detail 응답 → 추천 공덱 등록 폼 상태 (타겟팅 순서는 현재 방덱 기준으로 유지) */
export function buildDeckFormStateFromDetail(
  detail: DeckDetailRecord,
  monsterList: MonsterOption[],
): DeckFormImportState | null {
  const atk = resolveAtkMonsters(detail);
  if (!atk) {
    return null;
  }
  const compositionMonsterIds = [atk.atk_monster_1, atk.atk_monster_2, atk.atk_monster_3];
  const selectedMonsterList: MonsterOption[] = [
    resolveMonsterOption(detail, monsterList, 1, atk.atk_monster_1),
    resolveMonsterOption(detail, monsterList, 2, atk.atk_monster_2),
    resolveMonsterOption(detail, monsterList, 3, atk.atk_monster_3),
  ];
  const turnRaw = String(detail.turn_order ?? detail.turnOrder ?? '').trim();
  const turnOrderIds = parseMonsterOrderString(turnRaw, compositionMonsterIds);
  return {
    selectedMonsterList,
    monsterStats: [
      extractStatsFromDeckDetail(detail, 1),
      extractStatsFromDeckDetail(detail, 2),
      extractStatsFromDeckDetail(detail, 3),
    ],
    monsterStatsOrList: [
      extractOrStatsListFromDeckDetail(detail, 1),
      extractOrStatsListFromDeckDetail(detail, 2),
      extractOrStatsListFromDeckDetail(detail, 3),
    ],
    turnOrderIds: turnOrderIds.length ? turnOrderIds : compositionMonsterIds,
    turnOrder: turnOrderIds.length ? buildMonsterOrderString(turnOrderIds) : turnRaw,
    deckComment: String(detail.deck_comment ?? detail.deckComment ?? '').trim(),
  };
}

export function createEmptyDeckFormStats(): DeckMonsterStats[] {
  return [createEmptyDeckMonsterStats(), createEmptyDeckMonsterStats(), createEmptyDeckMonsterStats()];
}
