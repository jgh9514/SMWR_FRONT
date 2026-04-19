'use client';

import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import Link from 'next/link';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import RtaRankCutoffsSection from '@/features/rta/components/RtaRankCutoffsSection';
import { RtaRankCutoffSectionSkeleton } from '@/features/rta/components/RtaDashboardSkeletons';
import { useRtaDashboardRankCutoff, useRtaSeasonSelect } from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';

export default function RtaRankCutoffsPageClient() {
  const { data: seasonsData } = useRtaSeasonsContext();
  const { seasonSelectValue, seasonIdForApi, setSeason, seasonOptions } = useRtaSeasonSelect(seasonsData);

  const { data, isPending, error } = useRtaDashboardRankCutoff(seasonSelectValue, seasonIdForApi);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', md: 1100, lg: 1280, xl: 1536 },
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        py: { xs: 2, md: 4 },
      }}
    >
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

      {isPending && !data ? (
        <RtaRankCutoffSectionSkeleton />
      ) : error ? (
        <Typography color="error">{error.message || '불러오기에 실패했습니다.'}</Typography>
      ) : (
        <RtaRankCutoffsSection rankCutoffAnchors={data?.rank_cutoff_anchors} showTrendChart />
      )}
    </Box>
  );
}
