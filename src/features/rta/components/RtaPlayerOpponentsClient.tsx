'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Collapse,
  IconButton,
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
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import {
  RTA_PLAYER_OPPONENT_RECORDS_PAGE_SIZE,
  useRtaPlayerOpponentRecords,
  useRtaVsMatches,
} from '@/features/rta/hooks/useRtaData';
import { useRtaPlayerSeason } from '@/features/rta/context/RtaPlayerSeasonContext';
import { processRawMatchToMatchItem } from '@/features/rta/utils/processRtaMatchItem';
import { useRtaMonsterCatalog } from '@/features/rta/hooks/useRtaMonsterCatalog';
import { RtaMatchCard } from '@/features/rta/components/RtaMatchCard';
import type { RtaPlayerOpponentRow } from '@/features/rta/types/rta';
import type { RawMatchItem } from '@/types';

const PAGE_SIZE = RTA_PLAYER_OPPONENT_RECORDS_PAGE_SIZE;

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

function VsMatchList({
  wizardId,
  opponentWizardId,
  seasonCode,
  seasonId,
  fetchEnabled,
}: {
  wizardId: string;
  opponentWizardId: string;
  seasonCode: string | null;
  seasonId: number | null;
  /** 펼친 뒤에만 맞대결 목록 조회 — 표 전적(row)과 완전 분리 */
  fetchEnabled: boolean;
}) {
  const catalog = useRtaMonsterCatalog();
  const { data, isLoading, error } = useRtaVsMatches(wizardId, opponentWizardId, seasonCode, {
    seasonId,
    enabled: Boolean(wizardId) && Boolean(opponentWizardId) && fetchEnabled,
  });

  const matches = (data?.matches ?? []).map((r) =>
    processRawMatchToMatchItem(r as unknown as RawMatchItem, catalog),
  );

  const hasMore = data?.has_more ?? false;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ p: 1.5 }}>
        {error.message || '불러오기에 실패했습니다.'}
      </Typography>
    );
  }

  if (matches.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
        이 시즌에 수집된 맞대결 기록이 없습니다.
      </Typography>
    );
  }

  return (
    <Stack spacing={1} sx={{ p: { xs: 1, sm: 1.5 } }}>
      {hasMore ? (
        <Typography variant="caption" color="text.secondary">
          최근 맞대결만 표시합니다 (최대 20경기).
        </Typography>
      ) : null}
      {matches.map((match) => (
        <RtaMatchCard key={`${match.p1Id}-${match.p2Id}-${match.date}`} match={match} wizardId={wizardId} />
      ))}
      {hasMore && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          더 많은 경기가 있습니다.
        </Typography>
      )}
    </Stack>
  );
}

function OpponentRow({
  row,
  wizardId,
  seasonCode,
  seasonId,
}: {
  row: RtaPlayerOpponentRow;
  wizardId: string;
  seasonCode: string | null;
  seasonId: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const name = row.opponent_wizard_name?.trim() || `소환사 ${row.opponent_wizard_id}`;

  /* 표의 대전·승·패·승률은 opponent-records 스냅만 사용. 펼친 목록 API와 숫자를 섞지 않는다. */
  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer', '& > td': { borderBottom: expanded ? 0 : undefined } }}
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell sx={{ width: 40, pr: 0 }}>
          <IconButton size="small" tabIndex={-1} sx={{ p: 0.25 }}>
            {expanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar
              src={getSwexPlayerImageUrl(row.opponent_channel_uid ?? row.opponent_wizard_id)}
              alt={name}
              sx={{ width: 32, height: 32, flexShrink: 0 }}
            />
            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{name}</Typography>
          </Stack>
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

      <TableRow sx={{ '& > td': { p: 0 } }}>
        <TableCell colSpan={6} sx={{ borderBottom: expanded ? undefined : 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
              <VsMatchList
                wizardId={wizardId}
                opponentWizardId={row.opponent_wizard_id}
                seasonCode={seasonCode}
                seasonId={seasonId}
                fetchEnabled={expanded}
              />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function RtaPlayerOpponentsClient() {
  const params = useParams<{ wizardId: string }>();
  const wizardId = String(params?.wizardId ?? '').trim();
  const { seasonCode, seasonId } = useRtaPlayerSeason();

  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState<RtaPlayerOpponentRow[]>([]);
  const prevSeasonRef = useRef(seasonCode);

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

  const onLoadMore = () => setOffset(accumulated.length);

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
      {accumulated.length === 0 && !isLoading ? (
        <Typography variant="body2" color="text.secondary">
          이 시즌에 집계된 상대 전적이 없습니다. 배치 Job 실행 후 조회해 주세요.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {isFetching && accumulated.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', minHeight: 20 }}>
              <CircularProgress size={16} />
            </Box>
          )}

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small" sx={{ minWidth: { xs: 0, sm: 480 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 40, pr: 0 }} />
                  <TableCell sx={{ fontWeight: 700 }}>소환사</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap', px: { xs: 1, sm: 2 } }}>대전</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, px: { xs: 1, sm: 2 } }}>승</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, px: { xs: 1, sm: 2 } }}>패</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap', px: { xs: 1, sm: 2 } }}>승률</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accumulated.map((row) => (
                  <OpponentRow
                    key={row.opponent_wizard_id}
                    row={row}
                    wizardId={wizardId}
                    seasonCode={seasonCode}
                    seasonId={seasonId}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {hasMore && (
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
          )}

          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
            총 {accumulated.length.toLocaleString()}명{hasMore ? '+' : ''}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
