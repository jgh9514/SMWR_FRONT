import type { MatchItem } from '@/types';

export type RtaPlayerMatchPerspective = {
  won: boolean;
  myRating: number;
  oppRating: number;
  myName: string;
  oppName: string;
  myId: string;
  oppId: string;
  myChannelUid?: string;
  oppChannelUid?: string;
  myUnits: NonNullable<MatchItem['p1Units']>;
  oppUnits: NonNullable<MatchItem['p2Units']>;
  /** 0-based unit index — 선픽 슬롯 (없으면 -1) */
  myFirstPickIndex: number;
  /** 상대 선픽 슬롯 (없으면 -1) */
  oppFirstPickIndex: number;
};

function parseFirstPickSlot(raw: string | undefined): number {
  if (raw == null || raw === '' || raw === '0') return -1;
  const n = Number(raw);
  if (!Number.isFinite(n)) return -1;
  return Math.max(0, Math.floor(n) - 1);
}

/**
 * wizardId 기준으로 매치를 본인 시점으로 정규화한다.
 */
export function getMatchPerspective(match: MatchItem, wizardId: string): RtaPlayerMatchPerspective | null {
  const w = String(wizardId).trim();
  if (!w) return null;

  const isP1 = match.p1Id === w;
  const isP2 = match.p2Id === w;
  if (!isP1 && !isP2) return null;

  const wp = String(match.winnerPosition).trim();
  const won = isP1 ? wp === '1' : wp === '2';

  if (isP1) {
    const fp = parseFirstPickSlot(match.p1FirstPick);
    const oppFp = parseFirstPickSlot(match.p2FirstPick);
    return {
      won,
      myRating: match.p1Rating,
      oppRating: match.p2Rating,
      myName: match.p1Name,
      oppName: match.p2Name,
      myId: match.p1Id,
      oppId: match.p2Id,
      myChannelUid: match.p1ChannelUid,
      oppChannelUid: match.p2ChannelUid,
      myUnits: match.p1Units ?? [],
      oppUnits: match.p2Units ?? [],
      myFirstPickIndex: fp,
      oppFirstPickIndex: oppFp,
    };
  }

  const fp = parseFirstPickSlot(match.p2FirstPick);
  const oppFp = parseFirstPickSlot(match.p1FirstPick);
  return {
    won,
    myRating: match.p2Rating,
    oppRating: match.p1Rating,
    myName: match.p2Name,
    oppName: match.p1Name,
    myId: match.p2Id,
    oppId: match.p1Id,
    myChannelUid: match.p2ChannelUid,
    oppChannelUid: match.p1ChannelUid,
    myUnits: match.p2Units ?? [],
    oppUnits: match.p1Units ?? [],
    myFirstPickIndex: fp,
    oppFirstPickIndex: oppFp,
  };
}
