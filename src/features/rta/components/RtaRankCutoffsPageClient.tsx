'use client';

import { Box, CircularProgress, Typography } from '@mui/material';
import Link from 'next/link';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import RtaRankCutoffsSection from '@/features/rta/components/RtaRankCutoffsSection';
import { useRtaDashboard } from '@/features/rta/hooks/useRtaData';

export default function RtaRankCutoffsPageClient() {
  const { data, isLoading, error } = useRtaDashboard();

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, md: 4 } }}>
      <PageHeader title="랭크 컷 기록" backPath="/rta/dashboard" />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <Link href="/rta/dashboard" style={{ color: 'inherit' }}>
          ← RTA 대시보드
        </Link>
      </Typography>

      {isLoading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error.message || '불러오기에 실패했습니다.'}</Typography>
      ) : (
        <RtaRankCutoffsSection rankCutoffAnchors={data?.rank_cutoff_anchors} />
      )}
    </Box>
  );
}
