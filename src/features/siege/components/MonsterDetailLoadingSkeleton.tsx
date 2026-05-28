import { Box, Container, Skeleton, Stack, Tab, Tabs } from '@mui/material';

/** monster-detail `[detail]/loading.tsx` · Shell 초기 fetch 공용 */
export default function MonsterDetailLoadingSkeleton() {
  return (
    <Box aria-busy="true" aria-label="몬스터 상세 불러오는 중">
      <Box
        sx={{
          background: 'linear-gradient(120deg, #0d0d0d 0%, #1c2226 40%, #37474f 100%)',
          pt: 3,
          pb: 2,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" spacing={3}>
            <Skeleton
              variant="circular"
              width={96}
              height={96}
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
            />
            <Stack spacing={1} flex={1}>
              <Skeleton variant="text" width={160} height={36} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
              <Skeleton variant="text" width={100} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
              <Stack direction="row" spacing={1}>
                {[80, 64, 72].map((w) => (
                  <Skeleton key={w} variant="rounded" width={w} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                ))}
              </Stack>
            </Stack>
          </Stack>
          <Tabs value={false} sx={{ mt: 2, minHeight: 40 }}>
            {['개요', '스탯', '상성'].map((label) => (
              <Tab key={label} label={label} disabled sx={{ color: 'rgba(255,255,255,0.3)', minHeight: 40 }} />
            ))}
          </Tabs>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={120} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
          <Stack direction="row" spacing={2}>
            <Skeleton variant="rounded" height={200} sx={{ bgcolor: 'rgba(255,255,255,0.06)', flex: 1 }} />
            <Skeleton variant="rounded" height={200} sx={{ bgcolor: 'rgba(255,255,255,0.06)', flex: 1 }} />
          </Stack>
          <Skeleton variant="rounded" height={160} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
        </Stack>
      </Container>
    </Box>
  );
}
