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

function createUnits(
  unitNames?: string[],
  unitImages?: string[],
  bannedUnit?: number,
  leaderUnit?: number,
) {
  if (!Array.isArray(unitNames) || !Array.isArray(unitImages) || unitNames.length === 0) {
    return [];
  }

  return unitNames.map((name, i) => ({
    name: name || `Unit ${i + 1}`,
    image: unitImages[i] || getMonsterImageUrl('/images/default-unit.png'),
    banned: bannedUnit === i + 1,
    leader: leaderUnit === i + 1,
  }));
}

export function processRawMatchToMatchItem(match: RawMatchItem): MatchItem {
  return {
    p1Name:
      match.p1_name ||
      match.p1Name ||
      match.p1_player_name ||
      match.p1PlayerName ||
      'Player',
    p2Name:
      match.p2_name ||
      match.p2Name ||
      match.p2_player_name ||
      match.p2PlayerName ||
      'Opponent',
    date:
      match.date_add ||
      match.dateAdd ||
      match.date ||
      match.created_at ||
      match.updated_at ||
      (typeof window !== 'undefined' ? new Date().toISOString() : ''),
    p1Units: createUnits(
      match.p1_unit_names,
      match.p1_unit_images,
      match.p1_banned_unit,
      match.p1_leader_unit,
    ),
    p2Units: createUnits(
      match.p2_unit_names,
      match.p2_unit_images,
      match.p2_banned_unit,
      match.p2_leader_unit,
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
    winnerPosition: normalizeWinnerPosition(match.winner_position ?? match.winnerPosition),
    p1Country: match.p1_country,
    p2Country: match.p2_country,
    p1Score: Number(match.p1_score || match.p1Score || 0),
    p2Score: Number(match.p2_score || match.p2Score || 0),
    p1Rating: Number(match.p1_rating || match.p1Rating || 0),
    p2Rating: Number(match.p2_rating || match.p2Rating || 0),
    p1FirstPick: match.p1_first_pick || '0',
    p2FirstPick: match.p2_first_pick || '0',
  };
}
