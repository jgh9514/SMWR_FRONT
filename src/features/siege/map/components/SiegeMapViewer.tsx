'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import SiegeMapBaseDefensePanel from '@/features/siege/map/components/SiegeMapBaseDefensePanel';
import SiegeMapBattleLogPanel from '@/features/siege/map/components/SiegeMapBattleLogPanel';
import SiegeMapBoard from '@/features/siege/map/components/SiegeMapBoard';
import { useSiegeMapTimeline, useSiegeMapView } from '@/features/siege/map/hooks/useSiegeMap';
import { formatCapturedAt } from '@/features/siege/map/lib/formatSiegeMap';

type SiegeMapViewerProps = {
  matchId: string;
  initialSnapshotId?: number | null;
  livePoll?: boolean;
};

export default function SiegeMapViewer({ matchId, initialSnapshotId, livePoll = false }: SiegeMapViewerProps) {
  const [snapshotId, setSnapshotId] = useState<number | null>(initialSnapshotId ?? null);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [selectedBaseNumber, setSelectedBaseNumber] = useState<number | null>(null);

  const timelineQuery = useSiegeMapTimeline(matchId);
  const timeline = timelineQuery.data ?? [];

  const effectiveSnapshotId = livePoll && snapshotId == null ? null : snapshotId;
  const viewQuery = useSiegeMapView(matchId, effectiveSnapshotId, Boolean(matchId));
  const view = viewQuery.data;

  useEffect(() => {
    if (initialSnapshotId != null) {
      setSnapshotId(initialSnapshotId);
    }
  }, [initialSnapshotId]);

  useEffect(() => {
    if (timeline.length === 0 || snapshotId != null) {
      return;
    }
    setSliderIndex(timeline.length - 1);
    setSnapshotId(timeline[timeline.length - 1].id);
  }, [timeline, snapshotId]);

  const handleSlider = useCallback(
    (_: unknown, value: number | number[]) => {
      const idx = Array.isArray(value) ? value[0] : value;
      setSliderIndex(idx);
      const point = timeline[idx];
      if (point) {
        setSnapshotId(point.id);
      }
    },
    [timeline],
  );

  const handleLive = useCallback(() => {
    setSnapshotId(null);
    setSliderIndex(Math.max(0, timeline.length - 1));
    void viewQuery.refetch();
  }, [timeline.length, viewQuery]);

  const sliderLabel = useMemo(() => {
    if (timeline.length === 0) {
      return '';
    }
    const pt = timeline[sliderIndex];
    return pt ? formatCapturedAt(pt.captured_at) : '';
  }, [timeline, sliderIndex]);

  if (viewQuery.isLoading && !view) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (!view?.snapshot) {
    return (
      <Stack spacing={2}>
        <Alert severity="info">
          이 매치에 저장된 지도 스냅샷이 없습니다. DB 적재가 완료되면 자동으로 표시됩니다.
        </Alert>
        <SiegeMapBoard guilds={[]} bases={[]} showAllSlots />
      </Stack>
    );
  }

  const guilds = (view.guilds ?? []).map((g) => ({
    ...g,
    guild_id: String(g.guild_id),
    match_score: Number(g.match_score),
    match_score_increment: Number(g.match_score_increment),
  }));
  const bases = (view.bases ?? []).map((b) => ({
    ...b,
    base_number: Number(b.base_number),
    guild_id: String(b.guild_id),
  }));

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          매치 {matchId}
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            스냅샷 {view.match?.snapshot_count ?? 0}건
          </Typography>
        </Typography>
        <Button component={Link} href="/siege/map/history" size="small" variant="outlined">
          히스토리 목록
        </Button>
        {livePoll && (
          <Button size="small" variant="contained" onClick={handleLive}>
            최신으로
          </Button>
        )}
      </Stack>

      {timeline.length > 1 && (
        <Card variant="outlined">
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              시점 재생 · {sliderLabel}
            </Typography>
            <Slider
              size="small"
              min={0}
              max={Math.max(0, timeline.length - 1)}
              value={sliderIndex}
              onChange={handleSlider}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => formatCapturedAt(timeline[v]?.captured_at ?? 0)}
            />
          </CardContent>
        </Card>
      )}

      <SiegeMapBoard
        guilds={guilds}
        bases={bases}
        capturedAt={Number(view.snapshot.captured_at)}
        onBaseClick={(baseNumber) => setSelectedBaseNumber(baseNumber)}
      />

      <SiegeMapBattleLogPanel matchId={matchId} baseNumber={selectedBaseNumber} />

      <SiegeMapBaseDefensePanel
        open={selectedBaseNumber != null}
        onClose={() => setSelectedBaseNumber(null)}
        matchId={matchId}
        baseNumber={selectedBaseNumber}
        snapshotId={view.snapshot?.id ?? snapshotId}
      />
    </Stack>
  );
}
