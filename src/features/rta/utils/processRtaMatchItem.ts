import { getMonsterImageUrl } from '@/shared/utils/image';
import type { MatchItem, RawMatchItem } from '@/types';

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

/** SQL boolean[]·직렬화 편차를 boolean[] 으로 정규화 */
function normalizeUnitBannedFlags(raw: unknown): boolean[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((v) => isTruthyBanFlag(v));
}

/** WAS `p1_unit_pick_slot_no` 배열의 i번째 = 해당 유닛 `pick_slot_no` — 서버 값을 그대로 매칭 카드에 전달 */
function pickSlotNoAt(pickNos: unknown, i: number): number | undefined {
  if (!Array.isArray(pickNos) || i < 0 || i >= pickNos.length) return undefined;
  const v = pickNos[i];
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function createUnits(
  unitNames?: string[],
  unitImages?: string[],
  bannedUnit?: number,
  leaderUnit?: number,
  unitBannedFlags?: boolean[] | (boolean | string | number)[],
  unitPickSlotNos?: unknown,
  unitIds?: string[],
) {
  if (!Array.isArray(unitNames) || !Array.isArray(unitImages) || unitNames.length === 0) {
    return [];
  }

  const flags = normalizeUnitBannedFlags(unitBannedFlags);

  return unitNames.map((name, i) => ({
    name: name || `Unit ${i + 1}`,
    image: unitImages[i] || getMonsterImageUrl('/images/default-unit.png'),
    banned:
      flags != null && i < flags.length
        ? flags[i] === true
        : bannedUnit === i + 1,
    leader: leaderUnit === i + 1,
    pickSlotNo: pickSlotNoAt(unitPickSlotNos, i),
    monsterId: unitIds?.[i] ?? undefined,
  }));
}

export function processRawMatchToMatchItem(match: RawMatchItem): MatchItem {
  return {
    p1Name: match.p1_name || 'Player',
    p2Name: match.p2_name || 'Opponent',
    date: match.date_add || (typeof window !== 'undefined' ? new Date().toISOString() : ''),
    p1Units: createUnits(
      match.p1_unit_names,
      match.p1_unit_images,
      match.p1_banned_unit,
      match.p1_leader_unit,
      match.p1_unit_banned,
      match.p1_unit_pick_slot_no,
      match.p1_units,
    ),
    p2Units: createUnits(
      match.p2_unit_names,
      match.p2_unit_images,
      match.p2_banned_unit,
      match.p2_leader_unit,
      match.p2_unit_banned,
      match.p2_unit_pick_slot_no,
      match.p2_units,
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
