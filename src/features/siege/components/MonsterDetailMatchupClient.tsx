'use client';

import { useMemo } from 'react';
import { Alert, LinearProgress } from '@mui/material';
import { useMonsterInfoContext } from '@/features/siege/context/MonsterInfoContext';
import RtaMonsterDetailContent from '@/features/rta/components/RtaMonsterDetailContent';
import { useRtaMonsterDetail } from '@/features/rta/hooks/useRtaData';

export default function MonsterDetailMatchupClient() {
  const { monsterInfo } = useMonsterInfoContext();

  const rtaMonsterNumericId = useMemo(() => {
    const n = Number.parseInt(String(monsterInfo.monster_id), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [monsterInfo.monster_id]);

  const { data: rtaDetail, isLoading, isFetching, isError } = useRtaMonsterDetail(
    rtaMonsterNumericId,
    undefined,
    undefined,
    {},
  );

  if (isLoading || isFetching) return <LinearProgress sx={{ my: 2 }} />;

  if (isError && !rtaDetail) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        RTA 집계를 불러오지 못했습니다.
      </Alert>
    );
  }

  if (!rtaDetail) {
    return <Alert severity="info">RTA 집계 데이터가 아직 없습니다.</Alert>;
  }

  return <RtaMonsterDetailContent data={rtaDetail} embedded embeddedPart="tables" />;
}
