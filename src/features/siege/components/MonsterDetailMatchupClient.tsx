'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, LinearProgress } from '@mui/material';
import { useMonsterInfoContext } from '@/features/siege/context/MonsterInfoContext';
import RtaMonsterDetailContent from '@/features/rta/components/RtaMonsterDetailContent';
import RtaSeasonTierSelectRow from '@/features/rta/components/RtaSeasonTierSelectRow';
import {
  useRtaMonsterDetail,
  useRtaSeasons,
  useRtaSeasonSelect,
  useRtaRatingGradeRules,
  buildMonsterStatsTierBody,
} from '@/features/rta/hooks/useRtaData';
import { getRtaTierShortLabel } from '@/shared/utils/util';

export default function MonsterDetailMatchupClient() {
  const { monsterInfo } = useMonsterInfoContext();

  const rtaMonsterNumericId = useMemo(() => {
    const n = Number.parseInt(String(monsterInfo.monster_id), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [monsterInfo.monster_id]);

  const { data: seasonsData } = useRtaSeasons();
  const { seasonSelectValue, setSeason, seasonOptions, seasonIdForApi } = useRtaSeasonSelect(seasonsData);
  const { data: gradeRules = [], isLoading: tierRulesLoading } = useRtaRatingGradeRules();
  const [tierSelection, setTierSelection] = useState('');

  useEffect(() => {
    if (gradeRules.length > 0 && !tierSelection) {
      const rule = gradeRules.find((r) => r.ratingId === 4003) ?? gradeRules[0];
      setTierSelection(getRtaTierShortLabel(rule.ratingId));
    }
  }, [gradeRules, tierSelection]);

  const ratingId = useMemo(() => {
    if (!tierSelection) return null;
    const body = buildMonsterStatsTierBody(tierSelection, gradeRules);
    return body.ratingId ?? null;
  }, [tierSelection, gradeRules]);

  const { data: rtaDetail, isLoading, isFetching, isError } = useRtaMonsterDetail(
    rtaMonsterNumericId,
    null,
    seasonIdForApi ?? null,
    {},
    ratingId,
  );

  return (
    <>
      <RtaSeasonTierSelectRow
        seasonSelectValue={seasonSelectValue}
        setSeason={setSeason}
        seasonOptions={seasonOptions}
        tierSelection={tierSelection}
        setTierSelection={setTierSelection}
        gradeRules={gradeRules}
        tierRulesLoading={tierRulesLoading}
        seasonLabelId="monster-detail-matchup-season"
        hideBulkTierOptions
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
