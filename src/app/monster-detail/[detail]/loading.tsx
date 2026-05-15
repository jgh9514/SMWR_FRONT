import { Box, Container, Skeleton, Stack, Tab, Tabs } from '@mui/material';

export default function MonsterDetailLoading() {
  return (
    <Box>
      {/* 헤더 */}
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
            {/* 몬스터 이미지 */}
            <Skeleton
              variant="circular"
              width={96}
              height={96}
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
            />
            <Stack spacing={1} flex={1}>
              {/* 이름 */}
              <Skeleton variant="text" width={160} height={36} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
              {/* 별점 */}
              <Skeleton variant="text" width={100} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
              {/* 스탯 뱃지들 */}
              <Stack direction="row" spacing={1}>
                {[80, 64, 72].map((w) => (
                  <Skeleton key={w} variant="rounded" width={w} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                ))}
              </Stack>
            </Stack>
          </Stack>

          {/* 탭 */}
          <Tabs value={false} sx={{ mt: 2, minHeight: 40 }}>
            {['개요', '스탯', '상성'].map((label) => (
              <Tab key={label} label={label} disabled sx={{ color: 'rgba(255,255,255,0.3)', minHeight: 40 }} />
            ))}
          </Tabs>
        </Container>
      </Box>

      {/* 콘텐츠 스켈레톤 */}
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
