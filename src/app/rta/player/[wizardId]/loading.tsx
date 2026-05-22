import { Avatar, Box, Container, Skeleton, Stack, Tab, Tabs } from '@mui/material';

export default function RtaPlayerLoading() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1.25, md: 4 }, px: { xs: 1.25, sm: 3 } }}>
      <Box sx={{ mb: { xs: 1.5, md: 3 } }}>
        <Skeleton variant="text" width={200} height={32} />
      </Box>

      <Box
        sx={{
          p: { xs: 1.25, sm: 3 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          mb: 0,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 3 }}
          alignItems={{ xs: 'center', sm: 'flex-start' }}
          justifyContent="space-between"
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 2, sm: 3 }}
            alignItems={{ xs: 'center', sm: 'flex-start' }}
            sx={{ flex: 1, minWidth: 0 }}
          >
            <Avatar
              variant="rounded"
              sx={{ width: 80, height: 80, border: '2px solid', borderColor: 'divider' }}
            >
              <Skeleton variant="rectangular" width={80} height={80} />
            </Avatar>

            <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
                <Skeleton variant="text" width={160} height={36} />
                <Skeleton variant="circular" width={28} height={28} />
                <Skeleton variant="rounded" width={40} height={24} />
              </Stack>
              <Stack direction="row" alignItems="center" gap={3} flexWrap="wrap" sx={{ mt: 1 }}>
                <Skeleton variant="text" width={80} height={24} />
                <Skeleton variant="text" width={80} height={24} />
                <Skeleton variant="text" width={80} height={24} />
              </Stack>
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ flexShrink: 0 }}>
            <Skeleton variant="rounded" width={180} height={40} />
            <Skeleton variant="rounded" width={90} height={40} />
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs value={0} sx={{ minHeight: { xs: 44, sm: 48 } }}>
          {['개요', '사용 몬스터', '라이벌', '보유 몬스터'].map((label) => (
            <Tab
              key={label}
              label={label}
              disabled
              sx={{ minHeight: { xs: 44, sm: 48 }, textTransform: 'none', fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}
            />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ pt: { xs: 1.5, sm: 2 } }}>
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={200} />
          <Skeleton variant="rounded" height={160} />
        </Stack>
      </Box>
    </Container>
  );
}
