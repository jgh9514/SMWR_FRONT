'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  addRtaSessionRecent,
  filterSessionBookmarks,
  readRtaSessionFavorites,
  readRtaSessionRecent,
  removeRtaSessionRecent,
  setRtaSessionFavorite,
  toggleRtaSessionFavorite,
  type RtaSummonerSessionBookmark,
} from '@/features/rta/lib/rtaSummonerSessionSearchStorage';

type Entry = Omit<RtaSummonerSessionBookmark, 'updatedAt'>;

interface RtaSearchStoreValue {
  recent: RtaSummonerSessionBookmark[];
  favorites: RtaSummonerSessionBookmark[];
  addRecent: (entry: Entry) => void;
  removeRecent: (wizardId: string) => void;
  isFavorite: (wizardId: string) => boolean;
  setFavorite: (entry: Entry, favor: boolean) => void;
  toggleFavorite: (entry: Entry) => boolean;
  filterRecent: (query: string) => RtaSummonerSessionBookmark[];
  filterFavorites: (query: string) => RtaSummonerSessionBookmark[];
}

const RtaSearchStoreContext = createContext<RtaSearchStoreValue | null>(null);

export function RtaSearchStoreProvider({ children }: { children: React.ReactNode }) {
  const [recent, setRecent] = useState<RtaSummonerSessionBookmark[]>([]);
  const [favorites, setFavorites] = useState<RtaSummonerSessionBookmark[]>([]);

  useEffect(() => {
    setRecent(readRtaSessionRecent());
    setFavorites(readRtaSessionFavorites());
  }, []);

  const addRecent = useCallback((entry: Entry) => {
    addRtaSessionRecent(entry);
    setRecent(readRtaSessionRecent());
  }, []);

  const removeRecent = useCallback((wizardId: string) => {
    removeRtaSessionRecent(wizardId);
    setRecent(readRtaSessionRecent());
  }, []);

  const isFavorite = useCallback(
    (wizardId: string) => favorites.some((f) => f.wizardId === wizardId),
    [favorites],
  );

  const setFavorite = useCallback((entry: Entry, favor: boolean) => {
    setRtaSessionFavorite(entry, favor);
    setFavorites(readRtaSessionFavorites());
  }, []);

  const toggleFavorite = useCallback((entry: Entry): boolean => {
    const next = toggleRtaSessionFavorite(entry);
    setFavorites(readRtaSessionFavorites());
    return next;
  }, []);

  const filterRecent = useCallback(
    (query: string) => filterSessionBookmarks(recent, query),
    [recent],
  );

  const filterFavorites = useCallback(
    (query: string) => filterSessionBookmarks(favorites, query),
    [favorites],
  );

  return (
    <RtaSearchStoreContext.Provider
      value={{ recent, favorites, addRecent, removeRecent, isFavorite, setFavorite, toggleFavorite, filterRecent, filterFavorites }}
    >
      {children}
    </RtaSearchStoreContext.Provider>
  );
}

export function useRtaSearchStore(): RtaSearchStoreValue {
  const ctx = useContext(RtaSearchStoreContext);
  if (!ctx) throw new Error('useRtaSearchStore must be used within RtaSearchStoreProvider');
  return ctx;
}
