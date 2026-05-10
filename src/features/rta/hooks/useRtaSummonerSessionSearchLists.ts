'use client';

import { useRtaSearchStore } from '@/features/rta/context/RtaSearchStoreContext';
import type { RtaSummonerSessionBookmark } from '@/features/rta/lib/rtaSummonerSessionSearchStorage';

/**
 * RTA 소환사 검색 — Context 기반 전역 상태. 홈·헤더 어느 인스턴스든 같은 상태.
 */
export function useRtaSummonerSessionSearchLists() {
  return useRtaSearchStore();
}

export type { RtaSummonerSessionBookmark };
