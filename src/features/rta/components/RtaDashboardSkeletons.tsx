'use client';

import { Box, Card, Skeleton, useMediaQuery } from '@mui/material';
import { RTA_DASHBOARD_TIER_RATING_IDS } from '@/features/rta/types/rta';

const TIER_BAR_COUNT = RTA_DASHBOARD_TIER_RATING_IDS.length;

/** 소환사 티어별 분포 카드 내부 — 슬라이더·막대 영역 */
export function RtaTierDistributionSkeleton() {
  const isWide = useMediaQuery('(min-width:480px)');

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Skeleton variant="rounded" width={72} height={18} />
        <Skeleton variant="rounded" width={88} height={22} />
        <Skeleton variant="rounded" width={72} height={18} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Skeleton variant="circular" width={28} height={28} />
        <Skeleton variant="rounded" height={6} sx={{ flex: 1, borderRadius: 1 }} />
      </Box>
      <Skeleton variant="text" width="85%" height={14} sx={{ mb: 2 }} />

      {!isWide ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {Array.from({ length: TIER_BAR_COUNT }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton width={28} height={14} />
              <Skeleton variant="rounded" height={20} sx={{ flex: 1 }} />
              <Skeleton width={40} height={14} />
            </Box>
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 0.75,
            height: 180,
            px: 0.5,
          }}
        >
          {Array.from({ length: TIER_BAR_COUNT }).map((_, i) => (
            <Box
              key={i}
              sx={{
                flex: 1,
                minWidth: 0,
                maxWidth: 48,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 0.5,
                height: '100%',
              }}
            >
              <Skeleton width={36} height={14} />
              <Skeleton variant="rounded" width="100%" sx={{ height: `${40 + (i % 5) * 24}px`, borderRadius: '4px 4px 0 0' }} />
              <Skeleton width={28} height={16} />
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Skeleton variant="rounded" width={220} height={22} />
      </Box>
    </Box>
  );
}

/** 랭크 컷 섹션 — 표·차트 자리 */
export function RtaRankCutoffSectionSkeleton({
  noTopMargin = false,
  fillHeight = false,
}: {
  noTopMargin?: boolean;
  fillHeight?: boolean;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        mt: noTopMargin ? 0 : 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: { xs: 2, sm: 3 },
        ...(fillHeight
          ? {
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
            }
          : {}),
      }}
    >
      <Box
        sx={
          fillHeight
            ? { flex: 1, minHeight: 0, overflowY: 'auto' }
            : { display: 'contents' }
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Skeleton variant="circular" width={22} height={22} />
          <Skeleton width={160} height={24} />
        </Box>
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={200} />
      </Box>
    </Card>
  );
}
