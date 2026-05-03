'use client';

import { createContext, useContext } from 'react';
import type { MonsterInfoResponse } from '@/features/siege/hooks/useMonsterInfo';

interface MonsterInfoContextValue {
  monsterInfo: MonsterInfoResponse;
  devilmonImageUrl: string;
}

export const MonsterInfoContext = createContext<MonsterInfoContextValue | null>(null);

export function useMonsterInfoContext(): MonsterInfoContextValue {
  const ctx = useContext(MonsterInfoContext);
  if (!ctx) throw new Error('useMonsterInfoContext must be inside MonsterDetailContent');
  return ctx;
}
