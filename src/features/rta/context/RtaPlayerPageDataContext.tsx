'use client';

import { createContext, useContext } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { RtaPlayerPageData } from '@/features/rta/types/rta';

export type RtaPlayerPageDataContextValue = Pick<
  UseQueryResult<RtaPlayerPageData, Error>,
  'data' | 'isLoading' | 'isFetching' | 'refetch'
>;

const RtaPlayerPageDataContext = createContext<RtaPlayerPageDataContextValue | null>(null);

export const RtaPlayerPageDataProvider = RtaPlayerPageDataContext.Provider;

export function useOptionalRtaPlayerPageDataContext(): RtaPlayerPageDataContextValue | null {
  return useContext(RtaPlayerPageDataContext);
}

export function useRtaPlayerPageDataContext(): RtaPlayerPageDataContextValue {
  const ctx = useContext(RtaPlayerPageDataContext);
  if (!ctx) {
    throw new Error('useRtaPlayerPageDataContext는 RtaPlayerDetailShell 안에서만 사용하세요.');
  }
  return ctx;
}
