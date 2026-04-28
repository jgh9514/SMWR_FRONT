'use client';

import { Fragment, memo, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Alert,
  Box,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import { useRtaMonsterPickBreakdown, useRtaPlayerMonsterUsage } from '@/features/rta/hooks/useRtaData';
import { useRtaPlayerSeason } from '@/features/rta/context/RtaPlayerSeasonContext';
import type {
  RtaMonsterPickBucketRow,
  RtaPlayerMonsterFightSnapshot,
  RtaPlayerMonsterUsageRow,
} from '@/features/rta/types/rta';
import {
  MonsterCell,
  StatsEmptyState,
  TABLE_HEAD_CELL_SX,
  NUMERIC_CELL_SX,
  formatPercentage,
  toNum,
} from '@/features/rta/components/RtaMonsterStatsClient';

function n(v: unknown): number {
  if (v == null || v === '') return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function rowFromApi(r: RtaPlayerMonsterUsageRow & Record<string, unknown>): RtaPlayerMonsterUsageRow {
  const pick = n(r.pick_cnt);
  const ban = n(r.ban_cnt);
  /** 화면 픽횟수 = 픽 수 + 벤 수(WAS actual_pick_cnt 또는 합산 폴백) */
  const actual =
    r.actual_pick_cnt != null ? n(r.actual_pick_cnt as unknown) : pick + ban;
  return {
    unit_master_id: n(r.unit_master_id),
    pick_cnt: pick,
    ban_cnt: ban,
    win_cnt: n(r.win_cnt),
    lose_cnt: n(r.lose_cnt),
    first_pick_cnt: n(r.first_pick_cnt),
    actual_pick_cnt: actual,
    monster_name: r.monster_name != null ? String(r.monster_name) : null,
    monster_image: r.monster_image != null ? String(r.monster_image) : null,
    monster_elemental: r.monster_elemental != null ? String(r.monster_elemental) : null,
    pick_rate_pct: r.pick_rate_pct == null ? null : n(r.pick_rate_pct),
    ban_rate_pct: r.ban_rate_pct == null ? null : n(r.ban_rate_pct),
    win_rate_pct: r.win_rate_pct == null ? null : n(r.win_rate_pct),
    first_pick_rate_pct: r.first_pick_rate_pct == null ? null : n(r.first_pick_rate_pct),
  };
}

/** 펼침 행 — 슬롯 구간별 픽 비중(막대) + 구간 승률 */
function MonsterPickSlotBreakdownBlock({
  rows,
  loading,
}: {
  rows: RtaMonsterPickBucketRow[];
  loading: boolean;
}) {
  const theme = useTheme();
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={28} aria-label="슬롯별 집계 불러오는 중" />
      </Box>
    );
  }
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        슬롯별 기록이 없습니다.
      </Typography>
    );
  }
  return (
    <Stack spacing={1.25} sx={{ py: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 0.5 }}>
        배치 스냅(<code>pick_slot_no</code> 구간) 기준입니다. 1st Pick 은 슬롯 1번이며 밴 여부와 무관합니다. 막대 비중
        분모는 이 몬스터 유닛픽 기록 합(스냅 집계 시점·시즌 적재 범위 일치)입니다.
      </Typography>
      {rows.map((b) => {
        const pct = Math.min(100, Math.max(0, toNum(b.pick_share_pct)));
        const wr = b.win_rate_pct == null ? null : toNum(b.win_rate_pct);
        const ev = toNum(b.event_cnt);
        return (
          <Box
            key={String(b.bucket_id ?? b.bucket_label)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Box sx={{ width: 92, flexShrink: 0, textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                {b.bucket_label ?? '—'}
              </Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                position: 'relative',
                height: 36,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                bgcolor: alpha(theme.palette.primary.main, 0.06),
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.55)} 0%, ${alpha(theme.palette.primary.main, 0.32)} 100%)`,
                  transition: 'width 0.35s ease',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  px: 1.5,
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{
                    color: theme.palette.mode === 'dark' ? 'grey.50' : 'grey.900',
                    textShadow: theme.palette.mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.45)' : 'none',
                  }}
                >
                  {b.pick_share_pct == null ? '—' : `${toNum(b.pick_share_pct).toFixed(1)}%`}
                </Typography>
              </Box>
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  px: 1.5,
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                  {ev.toLocaleString()}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ width: 68, flexShrink: 0, textAlign: 'right' }}>
              <Typography
                variant="body2"
                fontWeight={800}
                sx={{ color: 'success.main', fontVariantNumeric: 'tabular-nums' }}
              >
                {wr == null ? '—' : formatPercentage(wr)}
              </Typography>
            </Box>
          </Box>
        );
      })}
      <Stack
        direction="row"
        justifyContent="flex-end"
        spacing={3}
        sx={{ pt: 1.5, mt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 0.5,
              background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.55)}, ${alpha(theme.palette.primary.main, 0.32)})`,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Pick Rate
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'success.main' }} />
          <Typography variant="caption" color="text.secondary">
            Win Rate
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  );
}

/** 상단 카드 — 시즌 전체 경기 수 + 시즌 승률 */
const SeasonTotalsStrip = memo(function SeasonTotalsStrip({ fight }: { fight: RtaPlayerMonsterFightSnapshot }) {
  const mc = toNum(fight.match_cnt);
  const wr = fight.season_win_rate_pct != null ? toNum(fight.season_win_rate_pct) : null;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        gap: { xs: 1.75, sm: 2 },
        alignItems: 'stretch',
      }}
    >
      <Box
        sx={{
          minWidth: 0,
          borderRight: { sm: '1px solid' },
          borderColor: 'divider',
          pr: { sm: 2 },
          borderBottom: { xs: '1px solid', sm: 'none' },
          pb: { xs: 1.75, sm: 0 },
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.02em' }}>
          경기 수
        </Typography>
        <Typography variant="h6" component="p" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums', m: 0, mt: 0.25 }}>
          {mc.toLocaleString()}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.02em' }}>
          시즌 승률
        </Typography>
        <Typography variant="h6" component="p" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums', m: 0, mt: 0.25 }}>
          {wr == null ? '—' : formatPercentage(wr)}
        </Typography>
      </Box>
    </Box>
  );
});

const PlayerPickStatCard = memo(function PlayerPickStatCard({
  rank,
  row,
  expanded,
  onToggleExpand,
  slotBreakdownLoading,
  slotBuckets,
}: {
  rank: number;
  row: RtaPlayerMonsterUsageRow;
  expanded: boolean;
  onToggleExpand: () => void;
  slotBreakdownLoading: boolean;
  slotBuckets: RtaMonsterPickBucketRow[];
}) {
  const pr = toNum(row.pick_rate_pct);
  const wr = toNum(row.win_rate_pct);
  const br = toNum(row.ban_rate_pct);
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: expanded ? 'primary.light' : 'divider',
        p: { xs: 1.75, sm: 2 },
        background: (t) =>
          `linear-gradient(120deg, ${alpha(t.palette.primary.main, 0.03)} 0%, ${alpha(t.palette.background.paper, 1)} 45%)`,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: (t) => `0 6px 22px ${alpha(t.palette.common.black, 0.07)}`,
        },
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: 0.25 }}>
            <IconButton
              size="small"
              onClick={onToggleExpand}
              aria-expanded={expanded}
              aria-label={expanded ? '슬롯 상세 접기' : '슬롯 상세 펼치기'}
              sx={{ p: '4px', flexShrink: 0 }}
            >
              <ExpandMoreIcon
                sx={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  fontSize: '1.35rem',
                }}
              />
            </IconButton>
            <Typography
              component="span"
              sx={{
                fontWeight: 900,
                fontSize: '0.8rem',
                color: 'text.secondary',
                minWidth: '1.35em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.2,
                pt: '2px',
              }}
            >
              #{rank}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <MonsterCell
              name={row.monster_name ?? undefined}
              image={row.monster_image ?? undefined}
              elemental={row.monster_elemental ?? undefined}
              monsterId={String(row.unit_master_id)}
            />
          </Box>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, minmax(0, 1fr))' },
            gap: { xs: 1.25, sm: 1.5 },
            alignItems: 'flex-start',
            pt: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              픽횟수
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.95rem' }}>
              {toNum(row.actual_pick_cnt).toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              픽률
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.95rem' }}>
              {formatPercentage(pr)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              승률
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.95rem' }}>
              {formatPercentage(wr)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              벤율
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.95rem' }}>
              {formatPercentage(br)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
            선픽률
          </Typography>
          <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.9rem' }}>
            {row.first_pick_rate_pct == null ? '—' : formatPercentage(toNum(row.first_pick_rate_pct))}
          </Typography>
        </Box>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ mb: 1 }} />
          <MonsterPickSlotBreakdownBlock
            loading={expanded && slotBreakdownLoading}
            rows={expanded ? slotBuckets : []}
          />
        </Collapse>
      </Stack>
    </Paper>
  );
});

function fightFromApi(fight: Record<string, unknown>): RtaPlayerMonsterFightSnapshot {
  return {
    match_cnt: n(fight.match_cnt),
    non_ban_pick_cnt: n(fight.non_ban_pick_cnt),
    ban_event_cnt: n(fight.ban_event_cnt),
    season_win_rate_pct: fight.season_win_rate_pct == null ? null : n(fight.season_win_rate_pct),
    computed_at: fight.computed_at != null ? String(fight.computed_at) : undefined,
  };
}

export default function RtaPlayerPicksClient() {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const params = useParams<{ wizardId: string }>();
  const wizardId = String(params?.wizardId ?? '').trim();
  const { seasonCode, seasonId } = useRtaPlayerSeason();

  const { data, isLoading, error, isFetching } = useRtaPlayerMonsterUsage(wizardId, seasonCode, {
    seasonId,
    enabled: Boolean(wizardId),
  });

  const [expandedUnitId, setExpandedUnitId] = useState<number | null>(null);
  const { data: breakdown, isFetching: breakdownFetching } = useRtaMonsterPickBreakdown(
    wizardId,
    seasonCode,
    seasonId,
    expandedUnitId,
    { enabled: Boolean(wizardId) },
  );

  const breakdownRows = useMemo(() => {
    if (expandedUnitId == null || breakdown?.unitMasterId !== expandedUnitId) return [];
    return breakdown.buckets ?? [];
  }, [expandedUnitId, breakdown]);

  const toggleExpandedUnit = (unitId: number) => {
    setExpandedUnitId((prev) => (prev === unitId ? null : unitId));
  };

  /** API rows 그대로 사용 — 쿼리 행 수와 화면 행 수 일치(추가 filter 금지) */
  const rawRows = useMemo(
    () =>
      (data?.rows ?? []).map((r) => rowFromApi(r as RtaPlayerMonsterUsageRow & Record<string, unknown>)),
    [data?.rows],
  );
  const fightParsed = data?.fight != null ? fightFromApi(data.fight as Record<string, unknown>) : null;

  if (!wizardId) {
    return (
      <Typography variant="body2" color="text.secondary">
        위자드 ID가 없습니다.
      </Typography>
    );
  }

  if (isLoading && rawRows.length === 0) {
    return (
      <Container maxWidth="xl" disableGutters sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
          <CircularProgress aria-label="통계 불러오는 중" />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" disableGutters sx={{ width: '100%' }}>
      {isFetching ? (
        <LinearProgress
          sx={{ position: 'sticky', top: 0, zIndex: (t) => t.zIndex.appBar - 1, mb: 1 }}
          aria-busy="true"
        />
      ) : null}

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <BarChartOutlinedIcon color="primary" fontSize="small" aria-hidden />
        <Typography variant="h6" component="h2" fontWeight={800} sx={{ m: 0 }}>
          사용 몬스터
        </Typography>
      </Stack>

      {error ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          통계를 최신으로 가져오지 못했습니다. 새로고침하거나 잠시 후 다시 시도해 주세요.
        </Alert>
      ) : null}

      {fightParsed ? (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            mb: 2.5,
            borderRadius: 2.5,
            p: { xs: 1.75, sm: 2 },
            borderColor: 'divider',
            bgcolor: (t) => alpha(t.palette.background.paper, 0.94),
          }}
        >
          <SeasonTotalsStrip fight={fightParsed} />
        </Paper>
      ) : (
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2.5 }} variant="outlined">
          이 시즌·소환사에 대한 요약 분모 데이터가 아직 없어요. 서버 집계가 반영되면 여기 요약 숫자가 표시됩니다.
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.65 }}>
        픽률·승률 등은 해당 시즌에 수집·반영된 RTA 리플레이를 기준으로 계산된 값입니다.
      </Typography>

      {rawRows.length === 0 ? (
        <StatsEmptyState title="표시할 몬스터가 없습니다" description="해당 시즌 스냅이 비어 있을 수 있습니다." />
      ) : isNarrow ? (
        <Stack spacing={1.5}>
          {rawRows.map((row, idx) => {
            const open = expandedUnitId === row.unit_master_id;
            const slotBusy =
              open &&
              (breakdownFetching ||
                (breakdown != null && breakdown.unitMasterId !== row.unit_master_id));
            return (
              <PlayerPickStatCard
                key={row.unit_master_id}
                rank={idx + 1}
                row={row}
                expanded={open}
                onToggleExpand={() => toggleExpandedUnit(row.unit_master_id)}
                slotBreakdownLoading={Boolean(slotBusy)}
                slotBuckets={open ? breakdownRows : []}
              />
            );
          })}
        </Stack>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'auto',
          }}
        >
          <Table size="small" stickyHeader sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ ...TABLE_HEAD_CELL_SX, width: 52 }}>
                  #
                </TableCell>
                <TableCell align="left" sx={TABLE_HEAD_CELL_SX}>
                  몬스터
                </TableCell>
                <TableCell align="right" sx={TABLE_HEAD_CELL_SX}>
                  픽횟수
                </TableCell>
                <TableCell align="right" sx={TABLE_HEAD_CELL_SX}>
                  픽률
                </TableCell>
                <TableCell align="right" sx={TABLE_HEAD_CELL_SX}>
                  승률
                </TableCell>
                <TableCell align="right" sx={TABLE_HEAD_CELL_SX}>
                  벤율
                </TableCell>
                <TableCell align="right" sx={TABLE_HEAD_CELL_SX}>
                  선픽률
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rawRows.map((row, idx) => {
                const rank = idx + 1;
                const open = expandedUnitId === row.unit_master_id;
                const slotBusy =
                  open &&
                  (breakdownFetching ||
                    (breakdown != null && breakdown.unitMasterId !== row.unit_master_id));
                return (
                  <Fragment key={row.unit_master_id}>
                    <TableRow hover>
                      <TableCell align="center" sx={{ ...NUMERIC_CELL_SX, color: 'text.secondary', verticalAlign: 'middle' }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                          <IconButton
                            size="small"
                            onClick={() => toggleExpandedUnit(row.unit_master_id)}
                            aria-expanded={open}
                            aria-label={open ? '슬롯 상세 접기' : '슬롯 상세 펼치기'}
                            sx={{ p: '4px', flexShrink: 0 }}
                          >
                            <ExpandMoreIcon
                              sx={{
                                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                                fontSize: '1.35rem',
                              }}
                            />
                          </IconButton>
                          <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                            {rank}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ minWidth: 200, maxWidth: 300 }}>
                        <MonsterCell
                          name={row.monster_name ?? undefined}
                          image={row.monster_image ?? undefined}
                          elemental={row.monster_elemental ?? undefined}
                          monsterId={String(row.unit_master_id)}
                        />
                      </TableCell>
                      <TableCell align="right" sx={NUMERIC_CELL_SX}>
                        {toNum(row.actual_pick_cnt).toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={NUMERIC_CELL_SX}>
                        {row.pick_rate_pct == null ? '—' : formatPercentage(toNum(row.pick_rate_pct))}
                      </TableCell>
                      <TableCell align="right" sx={NUMERIC_CELL_SX}>
                        {row.win_rate_pct == null ? '—' : formatPercentage(toNum(row.win_rate_pct))}
                      </TableCell>
                      <TableCell align="right" sx={NUMERIC_CELL_SX}>
                        {row.ban_rate_pct == null ? '—' : formatPercentage(toNum(row.ban_rate_pct))}
                      </TableCell>
                      <TableCell align="right" sx={NUMERIC_CELL_SX}>
                        {row.first_pick_rate_pct == null ? '—' : formatPercentage(toNum(row.first_pick_rate_pct))}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} sx={{ p: 0, verticalAlign: 'top' }}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                          <Box sx={{ px: 2.5, py: 2, bgcolor: alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.22 : 0.1) }}>
                            <MonsterPickSlotBreakdownBlock
                              loading={Boolean(slotBusy)}
                              rows={open ? breakdownRows : []}
                            />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
