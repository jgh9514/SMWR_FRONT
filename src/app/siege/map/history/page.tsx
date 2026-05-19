'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Pagination,
  Stack,
  Typography,
} from '@mui/material';
import GuildRequiredGate from '@/features/guild/components/GuildRequiredGate';
import { useSiegeMapHistory } from '@/features/siege/map/hooks/useSiegeMap';
import type { SiegeMapHistoryItem } from '@/features/siege/map/types/siegeMap';

function HistoryCard({ item }: { item: SiegeMapHistoryItem }) {
  const names = [item.guild_name_1, item.guild_name_2, item.guild_name_3].filter(Boolean).join(' vs ');
  return (
    <Card variant="outlined">
      <CardActionArea component={Link} href={`/siege/map/${item.match_id}`}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            {item.season_yyyymm} · 스냅샷 {item.snapshot_count}건
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            {names || item.match_id}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            match_id {item.match_id}
            {item.last_snapshot_at
              ? ` · 마지막 ${new Date(item.last_snapshot_at).toLocaleString('ko-KR')}`
              : ''}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function SiegeMapHistoryContent() {
  const [page, setPage] = useState(1);
  const paging = 10;
  const params = useMemo(() => ({ paging, page }), [page]);
  const { data, isLoading } = useSiegeMapHistory(params);

  const list = data?.list ?? [];
  const totalPage = data?.totalPage ?? 0;

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h5" component="h1" sx={{ flex: 1 }}>
            점령전 지도 히스토리
          </Typography>
          <Button component={Link} href="/siege/map" variant="outlined" size="small">
            점령전 지도
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          DB에 스냅샷이 적재된 점령전 매치만 표시됩니다. 참여한 길드 기준으로 필터됩니다.
        </Typography>
        {isLoading && <Typography>불러오는 중…</Typography>}
        {!isLoading && list.length === 0 && (
          <Typography color="text.secondary">히스토리가 없습니다. 스냅샷 DB 적재 후 다시 확인해 주세요.</Typography>
        )}
        <Stack spacing={1.5}>
          {list.map((item) => (
            <HistoryCard key={item.match_id} item={item} />
          ))}
        </Stack>
        {totalPage > 1 && (
          <Box display="flex" justifyContent="center">
            <Pagination count={totalPage} page={page} onChange={(_, p) => setPage(p)} color="primary" />
          </Box>
        )}
      </Stack>
    </Container>
  );
}

export default function SiegeMapHistoryPage() {
  return (
    <GuildRequiredGate title="점령전 지도 히스토리는 길드 가입이 필요합니다">
      <SiegeMapHistoryContent />
    </GuildRequiredGate>
  );
}
