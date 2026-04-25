'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import {
  addRtaSessionRecent,
  getRtaSessionSearchStoreRevision,
  isRtaSessionFavorite,
  readRtaSessionFavorites,
  readRtaSessionRecent,
  removeRtaSessionRecent,
  setRtaSessionFavorite,
  subscribeRtaSessionSearchStore,
  toggleRtaSessionFavorite,
  type RtaSummonerSessionBookmark,
} from '@/features/rta/lib/rtaSummonerSessionSearchStorage';

const serverRevisionSnapshot = 0;

/**
 * RTA 소환사 검색 — sessionStorage(탭 단위). 홈·헤더 공통.
 * - `revision` + 커스텀 이벤트로 **즉시** 반환 (effect 순서로 이벤트 유실 방지)
 * - `pathname`이 바뀔 때마다 **다시 읽기** (플레이어 → 홈 이동 직후 목록 갱신)
 */
export function useRtaSummonerSessionSearchLists() {
  const pathname = usePathname();
  const storeRevision = useSyncExternalStore(
    subscribeRtaSessionSearchStore,
    getRtaSessionSearchStoreRevision,
    () => serverRevisionSnapshot,
  );

  const recent = useMemo(
    () => (typeof window === 'undefined' ? [] : readRtaSessionRecent()),
    [storeRevision, pathname],
  );
  const favorites = useMemo(
    () => (typeof window === 'undefined' ? [] : readRtaSessionFavorites()),
    [storeRevision, pathname],
  );

  const addRecent = useCallback(
    (entry: Omit<RtaSummonerSessionBookmark, 'updatedAt'>) => {
      addRtaSessionRecent(entry);
    },
    [],
  );

  const removeRecent = useCallback(
    (wizardId: string) => {
      removeRtaSessionRecent(wizardId);
    },
    [],
  );

  const isFavorite = useCallback(
    (wizardId: string) => isRtaSessionFavorite(wizardId),
    [storeRevision, pathname],
  );

  const setFavorite = useCallback(
    (entry: Omit<RtaSummonerSessionBookmark, 'updatedAt'>, favor: boolean) => {
      setRtaSessionFavorite(entry, favor);
    },
    [],
  );

  const toggleFavorite = useCallback(
    (entry: Omit<RtaSummonerSessionBookmark, 'updatedAt'>) => {
      return toggleRtaSessionFavorite(entry);
    },
    [],
  );

  return {
    recent,
    favorites,
    addRecent,
    removeRecent,
    isFavorite,
    setFavorite,
    toggleFavorite,
  };
}
