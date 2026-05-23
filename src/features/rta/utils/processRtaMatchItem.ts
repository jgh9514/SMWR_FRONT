import { getMonsterImageUrl } from '@/shared/utils/image';
import type { MatchItem, RawMatchItem } from '@/types';
import type { MonsterCatalogEntry } from '@/features/rta/hooks/useRtaMonsterCatalog';

/** API가 winner_position을 숫자(1|2)로 줄 때도 승패 판정이 맞도록 문자열로 고정 */
function normalizeWinnerPosition(raw: unknown): '1' | '2' {
  if (raw == null || raw === '') return '1';
  const s = String(raw).trim();
  if (s === '1' || s === '2') return s;
  const n = Number(s);
  if (n === 1) return '1';
  if (n === 2) return '2';
  return '1';
}

function isTruthyBanFlag(v: unknown): boolean {
  return v === true || v === 'true' || v === 't' || v === 1 || v === '1';
}

function normalizeUnitBannedFlags(raw: unknown): boolean[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((v) => isTruthyBanFlag(v));
}

function pickSlotNoAt(pickNos: unknown, i: number): number | undefined {
  if (!Array.isArray(pickNos) || i < 0 || i >= pickNos.length) return undefined;
  const v = pickNos[i];
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const DEFAULT_IMAGE = getMonsterImageUrl('/images/default-unit.png');

function createUnits(
  unitIds: string[] | undefined,
  bannedUnit: number | undefined,
  leaderUnit: number | undefined,
  unitBannedFlags: boolean[] | (boolean | string | number)[] | undefined,
  unitPickSlotNos: unknown,
  catalog: Map<string, MonsterCatalogEntry>,
) {
  if (!Array.isArray(unitIds) || unitIds.length === 0) return [];

  const flags = normalizeUnitBannedFlags(unitBannedFlags);

  return unitIds.map((id, i) => {
    const entry = catalog.get(String(id ?? '').trim());
    return {
      name: entry?.name ?? `#${id}`,
      image: entry?.imageUrl ?? DEFAULT_IMAGE,
      banned: flags != null && i < flags.length ? flags[i] === true : bannedUnit === i + 1,
      leader: leaderUnit === i + 1,
      pickSlotNo: pickSlotNoAt(unitPickSlotNos, i),
      monsterId: id ?? undefined,
    };
  });
}

export function processRawMatchToMatchItem(
  match: RawMatchItem,
  catalog: Map<string, MonsterCatalogEntry>,
): MatchItem {
  return {
    p1Name: match.p1_name || 'Player',
    p2Name: match.p2_name || 'Opponent',
    date: match.date_add || (typeof window !== 'undefined' ? new Date().toISOString() : ''),
    p1Units: createUnits(
      match.p1_units,
      match.p1_banned_unit,
      match.p1_leader_unit,
      match.p1_unit_banned,
      match.p1_unit_pick_slot_no,
      catalog,
    ),
    p2Units: createUnits(
      match.p2_units,
      match.p2_banned_unit,
      match.p2_leader_unit,
      match.p2_unit_banned,
      match.p2_unit_pick_slot_no,
      catalog,
    ),
    p1Id: String(match.p1_wizard_id ?? ''),
    p2Id: String(match.p2_wizard_id ?? ''),
    p1ChannelUid:
      match.p1_channel_uid != null && match.p1_channel_uid !== ''
        ? String(match.p1_channel_uid)
        : undefined,
    p2ChannelUid:
      match.p2_channel_uid != null && match.p2_channel_uid !== ''
        ? String(match.p2_channel_uid)
        : undefined,
    winnerPosition: normalizeWinnerPosition(match.winner_position),
    p1Country: match.p1_country,
    p2Country: match.p2_country,
    p1Score: Number(match.p1_score || 0),
    p2Score: Number(match.p2_score || 0),
    p1Rating: Number(match.p1_rating || 0),
    p2Rating: Number(match.p2_rating || 0),
    p1FirstPick: match.p1_first_pick || '0',
    p2FirstPick: match.p2_first_pick || '0',
  };
}
