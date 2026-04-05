'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import Link from 'next/link';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import RtaRankCutoffsSection from '@/features/rta/components/RtaRankCutoffsSection';
import { useRtaDashboard, useRtaSeasons } from '@/features/rta/hooks/useRtaData';

const SEASON_FALLBACK = [{ value: 's36-sl', label: '시즌 36 스페셜 리그' }];

export default function RtaRankCutoffsPageClient() {
  const { data: seasonsData } = useRtaSeasons();
  const seasonOptions = useMemo(() => {
    const rows = seasonsData?.seasons;
    if (!rows?.length) return SEASON_FALLBACK;
    return rows.map((r) => ({ value: r.seasonCode, label: r.seasonName }));
  }, [seasonsData]);

  const resolvedDefaultSeason = useMemo(() => {
    const def = seasonsData?.defaultSeasonCode;
    const rows = seasonsData?.seasons;
    if (def && rows?.some((r) => r.seasonCode === def)) return def;
    return rows?.[0]?.seasonCode ?? SEASON_FALLBACK[0].value;
  }, [seasonsData]);

  const [season, setSeason] = useState<string | null>(null);
  useEffect(() => {
    if (seasonOptions.length === 0) return;
    setSeason((prev) => {
      if (prev !== null && seasonOptions.some((o) => o.value === prev)) return prev;
      return resolvedDefaultSeason;
    });
  }, [seasonOptions, resolvedDefaultSeason]);

  const seasonSelectValue = season ?? resolvedDefaultSeason;

  const { data, isLoading, error } = useRtaDashboard(seasonSelectValue);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, md: 4 } }}>
      <PageHeader title="랭크 컷 기록" backPath="/" />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <Link href="/" style={{ color: 'inherit' }}>
          ← 홈
        </Link>
      </Typography>

      <Box sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="rta-cutoffs-season-label">시즌</InputLabel>
          <Select
            labelId="rta-cutoffs-season-label"
            label="시즌"
            value={seasonSelectValue}
            onChange={(e) => setSeason(String(e.target.value))}
          >
            {seasonOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {isLoading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error.message || '불러오기에 실패했습니다.'}</Typography>
      ) : (
        <RtaRankCutoffsSection rankCutoffAnchors={data?.rank_cutoff_anchors} showTrendChart />
      )}
    </Box>
  );
}
