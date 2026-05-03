'use client';

import { useMemo } from 'react';
import { useMonsterInfoContext } from '@/features/siege/context/MonsterInfoContext';
import MonsterDetailRtaOverviewTab from '@/features/rta/components/MonsterDetailRtaOverviewTab';

export default function MonsterDetailOverviewClient() {
  const { monsterInfo } = useMonsterInfoContext();

  const monsterId = useMemo(() => {
    const n = Number.parseInt(String(monsterInfo.monster_id), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [monsterInfo.monster_id]);

  return <MonsterDetailRtaOverviewTab monsterId={monsterId} />;
}
