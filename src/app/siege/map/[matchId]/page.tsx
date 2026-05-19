'use client';

import { use } from 'react';
import { Container, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { Button } from '@mui/material';
import GuildRequiredGate from '@/features/guild/components/GuildRequiredGate';
import SiegeMapViewer from '@/features/siege/map/components/SiegeMapViewer';

type PageProps = {
  params: Promise<{ matchId: string }>;
};

function SiegeMapMatchPageContent({ matchId }: { matchId: string }) {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Button component={Link} href="/siege/map/history" size="small" sx={{ alignSelf: 'flex-start' }}>
          ← 히스토리
        </Button>
        <Typography variant="h5" component="h1">
          점령전 지도
        </Typography>
        <SiegeMapViewer matchId={decodeURIComponent(matchId)} />
      </Stack>
    </Container>
  );
}

export default function SiegeMapMatchPage({ params }: PageProps) {
  const { matchId } = use(params);
  return (
    <GuildRequiredGate title="점령전 지도는 길드 가입이 필요합니다">
      <SiegeMapMatchPageContent matchId={matchId} />
    </GuildRequiredGate>
  );
}
