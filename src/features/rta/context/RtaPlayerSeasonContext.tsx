'use client';

import { createContext, useContext } from 'react';

/** 플레이어 상세 레이아웃(RtaPlayerDetailShell)에서 선택한 시즌 코드 */
export const RtaPlayerSeasonContext = createContext<string | null>(null);

export function useRtaPlayerSeasonCode(): string | null {
  return useContext(RtaPlayerSeasonContext);
}
