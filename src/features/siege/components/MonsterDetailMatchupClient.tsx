'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Skeleton,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { useMonsterInfoContext } from '@/features/siege/context/MonsterInfoContext';
import RtaSeasonTierSelectRow from '@/features/rta/components/RtaSeasonTierSelectRow';
import {
  useRtaSeasons,
  useRtaSeasonSelect,
  useRtaRatingGradeRules,
  useRtaCounterMatchup,
  buildMonsterStatsTierBody,
} from '@/features/rta/hooks/useRtaData';
import { getRtaTierShortLabel } from '@/shared/utils/util';
import { getRenderableImageUrl } from '@/shared/utils/image';
import type { CounterMatchupRow } from '@/features/rta/types/rta';

function MonsterAvatar({ image, name }: { image?: string | null; name: string }) {
  return (
    <Avatar
      src={getRenderableImageUrl(image)}
      alt={name}
      sx={{ width: 32, height: 32 }}
      variant="rounded"
    >
      {name.charAt(0)}
    </Avatar>
  );
}

function WinRateText({ value }: { value: number | null | undefined }) {
  const v = value != null && Number.isFinite(Number(value)) ? Number(value) : null;
  if (v == null) return <Typography variant="body2" color="text.secondary">—</Typography>;
  return (
    <Typography variant="body2" fontWeight={600} color={v >= 50 ? 'success.main' : 'error.main'}>
      {v.toFixed(2)}%
    </Typography>
  );
}

function CounterTableSkeleton() {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>상대 조합</TableCell>
            <TableCell align="right">경기수</TableCell>
            <TableCell align="right">승률</TableCell>
            <TableCell align="right">승 / 패</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Skeleton variant="rounded" width={32} height={32} />
                  <Skeleton variant="text" width={80} />
                </Box>
              </TableCell>
              <TableCell align="right"><Skeleton variant="text" width={40} sx={{ ml: 'auto' }} /></TableCell>
              <TableCell align="right"><Skeleton variant="text" width={50} sx={{ ml: 'auto' }} /></TableCell>
              <TableCell align="right"><Skeleton variant="text" width={50} sx={{ ml: 'auto' }} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function CounterTable({ rows, isLoading, isError }: { rows: CounterMatchupRow[]; isLoading: boolean; isError: boolean }) {
  if (isLoading) return <CounterTableSkeleton />;
  if (isError) return <Alert severity="warning" sx={{ mt: 1 }}>데이터를 불러오지 못했습니다.</Alert>;
  if (!rows.length) return <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>데이터가 없습니다.</Typography>;

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>상대 조합</TableCell>
            <TableCell align="right">경기수</TableCell>
            <TableCell align="right">승률</TableCell>
            <TableCell align="right">승 / 패</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.slice(0, 30).map((r, i) => {
            const wr = r.winRate != null && Number.isFinite(Number(r.winRate)) ? Number(r.winRate) : null;
            const matchCnt = r.matchCnt ?? (Number(r.winCnt ?? 0) + Number(r.loseCnt ?? 0));
            const monsters = r.opponentMonsters ?? [];
            return (
              <TableRow key={`${r.opponentComboKey}-${i}`}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    {monsters.length > 0 ? monsters.map((m, mi) => (
                      <Box key={m.monsterId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {mi > 0 && <Typography variant="body2" color="text.secondary">+</Typography>}
                        <MonsterAvatar image={m.monsterImage ?? undefined} name={m.monsterName} />
                        <Typography variant="body2">{m.monsterName}</Typography>
                      </Box>
                    )) : (
                      <Typography variant="body2">{r.opponentLabel ?? r.opponentComboKey ?? '—'}</Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {matchCnt > 0 ? matchCnt.toLocaleString() : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right"><WinRateText value={wr} /></TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {r.winCnt ?? 0} / {r.loseCnt ?? 0}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

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
  const [activeTab, setActiveTab] = useState(0);

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

  const sid = seasonIdForApi ?? null;

  const soloQuery = useRtaCounterMatchup(rtaMonsterNumericId, sid, ratingId, 1);
  const duoQuery  = useRtaCounterMatchup(rtaMonsterNumericId, sid, ratingId, 2);
  const trioQuery = useRtaCounterMatchup(rtaMonsterNumericId, sid, ratingId, 3);

  const tabs = [
    { label: '솔로', query: soloQuery },
    { label: '듀오', query: duoQuery },
    { label: '트리오', query: trioQuery },
  ] as const;

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

      <Box sx={{ mt: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 1.5 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((t) => (
            <Tab key={t.label} label={t.label} />
          ))}
        </Tabs>

        {tabs.map((t, idx) => (
          <Box key={t.label} hidden={activeTab !== idx}>
            <CounterTable
              rows={t.query.data?.rows ?? []}
              isLoading={t.query.isLoading}
              isError={t.query.isError}
            />
          </Box>
        ))}
      </Box>
    </>
  );
}
