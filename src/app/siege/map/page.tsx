'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Alert, Button, Container, Stack, Typography } from '@mui/material';
import GuildRequiredGate from '@/features/guild/components/GuildRequiredGate';
import SiegeMapBoard from '@/features/siege/map/components/SiegeMapBoard';
import SiegeMapViewer from '@/features/siege/map/components/SiegeMapViewer';

function SiegeMapPageContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get('match_id') ?? undefined;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <Typography variant="h5" component="h1" sx={{ flex: 1 }}>
            점령전 실시간 지도
          </Typography>
          <Button component={Link} href="/siege/map/history" variant="outlined" size="small">
            지도 히스토리
          </Button>
        </Stack>
        <Alert severity="info" sx={{ py: 0.5 }}>
          지도 데이터는 DB에 적재된 MatchupInfo 스냅샷을 조회합니다. (로그 파일 업로드 없음)
        </Alert>
        {matchId ? (
          <SiegeMapViewer matchId={matchId} livePoll />
        ) : (
          <Stack spacing={2}>
            <Typography color="text.secondary">
              <Link href="/siege/map/history">지도 히스토리</Link>에서 매치를 선택하거나, URL에{' '}
              <code>?match_id=...</code> 를 지정하세요. 아래는 기본 맵 레이아웃(거점 39)입니다.
            </Typography>
            <SiegeMapBoard guilds={[]} bases={[]} showAllSlots />
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

export default function SiegeMapPage() {
  return (
    <GuildRequiredGate title="점령전 지도는 길드 가입이 필요합니다">
      <Suspense
        fallback={
          <Container maxWidth="lg" sx={{ py: 3 }}>
            <Typography>로딩 중…</Typography>
          </Container>
        }
      >
        <SiegeMapPageContent />
      </Suspense>
    </GuildRequiredGate>
  );
}
