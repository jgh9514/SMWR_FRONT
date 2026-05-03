'use client';

import { useMemo } from 'react';
import { Alert, LinearProgress } from '@mui/material';
import { useMonsterInfoContext } from '@/features/siege/context/MonsterInfoContext';
import MonsterDetailRtaOverviewTab from '@/features/rta/components/MonsterDetailRtaOverviewTab';
import { useRtaMonsterDetail } from '@/features/rta/hooks/useRtaData';

export default function MonsterDetailOverviewClient() {
  const { monsterInfo } = useMonsterInfoContext();

  const rtaMonsterNumericId = useMemo(() => {
    const n = Number.parseInt(String(monsterInfo.monster_id), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [monsterInfo.monster_id]);

  const {
    data: rtaDetail,
    isLoading,
    isFetching,
    isError,
  } = useRtaMonsterDetail(rtaMonsterNumericId, undefined, undefined, {});

  const rtaOverviewPending = rtaMonsterNumericId != null && rtaDetail == null && (isLoading || isFetching);
  const rtaOverviewFailed = rtaMonsterNumericId != null && rtaDetail == null && isError && !isLoading && !isFetching;

  if (rtaOverviewPending) {
    return <LinearProgress sx={{ my: 2 }} />;
  }

  if (rtaOverviewFailed) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        RTA 집계를 불러오지 못했습니다.
      </Alert>
    );
  }

  return (
    <MonsterDetailRtaOverviewTab
      monsterId={rtaMonsterNumericId}
      rtaDetail={rtaDetail ?? null}
    />
  );
}
