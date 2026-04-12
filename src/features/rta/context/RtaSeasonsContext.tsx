'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { RtaSeasonsResponse } from '@/features/rta/types/rta';
import { useRtaSeasons } from '@/features/rta/hooks/useRtaData';

const RtaSeasonsQueryContext = createContext<UseQueryResult<RtaSeasonsResponse, Error> | null>(null);

/** /rta 레이아웃에서 한 번만 마운트 — 하위 화면은 {@link useRtaSeasonsContext} 로 동일 쿼리 결과를 쓴다. */
export function RtaSeasonsProvider({ children }: { children: ReactNode }) {
  const query = useRtaSeasons();
  return <RtaSeasonsQueryContext.Provider value={query}>{children}</RtaSeasonsQueryContext.Provider>;
}

export function useRtaSeasonsContext(): UseQueryResult<RtaSeasonsResponse, Error> {
  const ctx = useContext(RtaSeasonsQueryContext);
  if (!ctx) {
    throw new Error('useRtaSeasonsContext는 RtaSeasonsProvider(/rta 레이아웃) 안에서만 사용하세요.');
  }
  return ctx;
}
