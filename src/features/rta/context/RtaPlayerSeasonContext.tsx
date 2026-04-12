'use client';

import { createContext, useContext } from 'react';

export type RtaPlayerSeasonSelection = {
  seasonCode: string | null;
  /** rta_season.season_id — 있으면 API에 우선 전달 */
  seasonId: number | null;
};

/** 플레이어 상세 레이아웃(RtaPlayerDetailShell)에서 선택한 시즌 */
export const RtaPlayerSeasonContext = createContext<RtaPlayerSeasonSelection>({
  seasonCode: null,
  seasonId: null,
});

export function useRtaPlayerSeason(): RtaPlayerSeasonSelection {
  return useContext(RtaPlayerSeasonContext);
}

/** @deprecated {@link useRtaPlayerSeason} 사용 권장 */
export function useRtaPlayerSeasonCode(): string | null {
  return useContext(RtaPlayerSeasonContext).seasonCode;
}
