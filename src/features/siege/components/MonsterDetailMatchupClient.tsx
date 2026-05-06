'use client';

import { useMemo } from 'react';
import { Alert, LinearProgress } from '@mui/material';
import { useMonsterInfoContext } from '@/features/siege/context/MonsterInfoContext';
import RtaMonsterDetailContent from '@/features/rta/components/RtaMonsterDetailContent';
import RtaSeasonTierSelectRow from '@/features/rta/components/RtaSeasonTierSelectRow';
import {
  useRtaMonsterDetail,
  useRtaSeasons,
  useRtaSeasonSelect,
  useRtaRatingGradeRules,
} from '@/features/rta/hooks/useRtaData';

export default function MonsterDetailMatchupClient() {
  const { monsterInfo } = useMonsterInfoContext();

  const rtaMonsterNumericId = useMemo(() => {
    const n = Number.parseInt(String(monsterInfo.monster_id), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [monsterInfo.monster_id]);

  const { data: seasonsData } = useRtaSeasons();
  const { seasonSelectValue, setSeason, seasonOptions, seasonIdForApi } = useRtaSeasonSelect(seasonsData);
  const { data: gradeRules = [], isLoading: tierRulesLoading } = useRtaRatingGradeRules();

  const { data: rtaDetail, isLoading, isFetching, isError } = useRtaMonsterDetail(
    rtaMonsterNumericId,
    null,
    seasonIdForApi ?? null,
    {},
  );

  return (
    <>
      <RtaSeasonTierSelectRow
        seasonSelectValue={seasonSelectValue}
        setSeason={setSeason}
        seasonOptions={seasonOptions}
        tierSelection="CH_ALL"
        setTierSelection={() => {}}
        gradeRules={gradeRules}
        tierRulesLoading={tierRulesLoading}
        hideTierSelect
        seasonLabelId="monster-detail-matchup-season"
      />

      {(isLoading || isFetching) && <LinearProgress sx={{ my: 2 }} />}

      {isError && !rtaDetail && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          RTA 집계를 불러오지 못했습니다.
        </Alert>
      )}

      {!isLoading && !isFetching && !isError && !rtaDetail && (
        <Alert severity="info">RTA 집계 데이터가 아직 없습니다.</Alert>
      )}

      {rtaDetail && (
        <RtaMonsterDetailContent data={rtaDetail} embedded embeddedPart="tables" />
      )}
    </>
  );
}
