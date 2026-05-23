import { Box, Skeleton, Stack } from '@mui/material';

/** layout RtaPlayerDetailShell(헤더·프로필·탭) 아래 children 슬롯 전용 */
export default function RtaPlayerLoading() {
  return (
    <Box aria-busy="true" aria-label="탭 콘텐츠 불러오는 중">
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
      </Stack>
    </Box>
  );
}
