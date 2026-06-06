'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { RtaSeasonsResponse } from '@/features/rta/types/rta';
import { useRtaSeasons } from '@/features/rta/hooks/useRtaData';

const RtaSeasonsQueryContext = createContext<UseQueryResult<RtaSeasonsResponse, Error> | null>(null);

/** AppProviders 에서 앱 전역 1회 마운트 — {@link useRtaSeasonsContext} 로 시즌 쿼리 결과를 공유한다. */
export function RtaSeasonsProvider({ children }: { children: ReactNode }) {
  const query = useRtaSeasons();
  return <RtaSeasonsQueryContext.Provider value={query}>{children}</RtaSeasonsQueryContext.Provider>;
}

export function useRtaSeasonsContext(): UseQueryResult<RtaSeasonsResponse, Error> {
  const ctx = useContext(RtaSeasonsQueryContext);
  if (!ctx) {
    throw new Error('useRtaSeasonsContext는 RtaSeasonsProvider(AppProviders) 안에서만 사용하세요.');
  }
  return ctx;
}
