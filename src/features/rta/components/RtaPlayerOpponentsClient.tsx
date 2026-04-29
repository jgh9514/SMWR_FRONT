'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useRtaPlayerOpponentRecords } from '@/features/rta/hooks/useRtaData';
import { useRtaPlayerSeason } from '@/features/rta/context/RtaPlayerSeasonContext';
import type { RtaPlayerOpponentRow } from '@/features/rta/types/rta';

const PAGE_SIZE = 50;

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function rowFromApi(r: Record<string, unknown>): RtaPlayerOpponentRow {
  return {
    opponent_wizard_id: r.opponent_wizard_id != null ? String(r.opponent_wizard_id) : '',
    opponent_wizard_name: r.opponent_wizard_name != null ? String(r.opponent_wizard_name) : null,
    opponent_channel_uid: r.opponent_channel_uid != null ? String(r.opponent_channel_uid) : null,
    opponent_country_code: r.opponent_country_code != null ? String(r.opponent_country_code) : null,
    match_cnt: n(r.match_cnt),
    win_cnt: n(r.win_cnt),
    lose_cnt: n(r.lose_cnt),
    win_rate_pct: r.win_rate_pct != null && r.win_rate_pct !== '' ? n(r.win_rate_pct) : null,
  };
}


function WinRateLabel({ value }: { value: number | null | undefined }) {
  if (value == null) return <Typography variant="caption" color="text.disabled">—</Typography>;
  const color = value >= 60 ? 'success.main' : value <= 40 ? 'error.main' : 'warning.main';
  return (
    <Typography sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '0.85rem', color }}>
      {value.toFixed(1)}%
    </Typography>
  );
}

export default function RtaPlayerOpponentsClient() {
  const params = useParams<{ wizardId: string }>();
  const wizardId = String(params?.wizardId ?? '').trim();
  const { seasonCode, seasonId } = useRtaPlayerSeason();

  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState<RtaPlayerOpponentRow[]>([]);
  const prevSeasonRef = useRef(seasonCode);

  // 시즌 변경 시 초기화
  useEffect(() => {
    if (prevSeasonRef.current !== seasonCode) {
      prevSeasonRef.current = seasonCode;
      setOffset(0);
      setAccumulated([]);
    }
  }, [seasonCode]);

  const { data, isLoading, isFetching, error } = useRtaPlayerOpponentRecords(
    wizardId,
    seasonCode,
    { seasonId, limit: PAGE_SIZE, offset, enabled: Boolean(wizardId) },
  );

  const pageRows = (data?.rows ?? []).map((r) => rowFromApi(r as unknown as Record<string, unknown>));
  const hasMore = data?.has_more ?? false;

  // offset=0 응답 → accumulated 교체, offset>0 → 누적
  useEffect(() => {
    if (!data) return;
    if ((data.offset ?? 0) === 0) {
      setAccumulated(pageRows);
    } else {
      setAccumulated((prev) => {
        const ids = new Set(prev.map((r) => r.opponent_wizard_id));
        const added = pageRows.filter((r) => !ids.has(r.opponent_wizard_id));
        return added.length > 0 ? [...prev, ...added] : prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const onLoadMore = () => {
    setOffset(accumulated.length);
  };

  if (!wizardId) {
    return <Typography variant="body2" color="text.secondary">위자드 ID가 없습니다.</Typography>;
  }

  if (isLoading && accumulated.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={36} />
      </Box>
    );
  }

  if (error) {
    return <Typography variant="body2" color="error">{error.message || '불러오기에 실패했습니다.'}</Typography>;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        배치 집계 기준 (
        <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          rta_agg_summoner_opponent_h2h_snap
        </Box>
        ) — 실시간 반영이 아니며 대전 횟수 기준 내림차순입니다.
      </Typography>

      {accumulated.length === 0 && !isLoading ? (
        <Typography variant="body2" color="text.secondary">
          이 시즌에 집계된 상대 전적이 없습니다. 배치 Job 실행 후 조회해 주세요.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {isFetching && accumulated.length > 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', minHeight: 20 }}>
              <CircularProgress size={16} />
            </Box>
          ) : null}

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small" sx={{ minWidth: { xs: 0, sm: 480 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>소환사</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap', px: { xs: 1, sm: 2 } }}>대전</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, px: { xs: 1, sm: 2 } }}>승</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, px: { xs: 1, sm: 2 } }}>패</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap', px: { xs: 1, sm: 2 } }}>승률</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accumulated.map((row) => {
                  const name = row.opponent_wizard_name?.trim() || `소환사 ${row.opponent_wizard_id}`;
                  const href = `/rta/player/${encodeURIComponent(row.opponent_wizard_id)}`;
                  return (
                    <TableRow key={row.opponent_wizard_id} hover>
                      <TableCell>
                        <Link href={href} style={{ fontWeight: 600, textDecoration: 'none', color: 'inherit' }}>
                          {name}
                        </Link>
                      </TableCell>
                      <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums', px: { xs: 1, sm: 2 } }}>
                        {row.match_cnt}
                      </TableCell>
                      <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums', color: 'success.main', fontWeight: 700, px: { xs: 1, sm: 2 } }}>
                        {row.win_cnt}
                      </TableCell>
                      <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums', color: 'error.main', fontWeight: 700, px: { xs: 1, sm: 2 } }}>
                        {row.lose_cnt}
                      </TableCell>
                      <TableCell align="center" sx={{ px: { xs: 1, sm: 2 } }}>
                        <WinRateLabel value={row.win_rate_pct} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {hasMore ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={onLoadMore}
                disabled={isFetching}
                startIcon={isFetching ? <CircularProgress size={14} /> : undefined}
              >
                더 보기
              </Button>
            </Box>
          ) : null}

          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
            총 {accumulated.length.toLocaleString()}명{hasMore ? '+' : ''}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
