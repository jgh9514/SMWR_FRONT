'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CounterMatchupRow, MonsterDetail } from '@/features/rta/types/rta';
import {
  useRtaRatingGradeRules,
  useRtaSeasonSelect,
  useRtaSeasons,
  useRtaMonsterOverview,
  buildMonsterStatsTierBody,
} from '@/features/rta/hooks/useRtaData';
import RtaSeasonTierSelectRow from '@/features/rta/components/RtaSeasonTierSelectRow';
import { getRenderableImageUrl, getSwexPlayerImageUrl } from '@/shared/utils/image';

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function fmt1(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return `${Number(v).toFixed(1)}%`;
}

function fmtInt(v: number | null | undefined): string {
  if (v == null) return '—';
  return Number(v).toLocaleString('ko-KR');
}

const SLOT_LABEL: Record<number, string> = { 1: '1픽', 2: '2픽', 3: '3픽', 4: '4픽', 5: '5픽' };

// ── 요약 카드 ─────────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: 'success' | 'error' | 'primary' | 'default';
}) {
  return (
    <Box sx={{ textAlign: 'center', px: 1 }}>
      <Typography
        variant="h5"
        fontWeight={800}
        color={
          color === 'success'
            ? 'success.main'
            : color === 'error'
              ? 'error.main'
              : color === 'primary'
                ? 'primary.main'
                : 'text.primary'
        }
        sx={{ lineHeight: 1.1 }}
      >
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
        {label}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.65rem' }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

// ── 픽 슬롯 테이블 ─────────────────────────────────────────────────────────────

function PickSlotTable({
  slots,
  teamSide,
  label,
}: {
  slots: { pick_slot_no: number; team_side: number; pick_cnt: number; win_cnt: number; field_cnt: number; pick_share_pct?: number | null; win_rate_pct?: number | null }[];
  teamSide: number;
  label: string;
}) {
  const rows = slots.filter((s) => s.team_side === teamSide);
  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: '12px !important' }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          {label}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>슬롯</TableCell>
                <TableCell align="right">픽 횟수</TableCell>
                <TableCell align="right">픽률</TableCell>
                <TableCell align="right">승률</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[1, 2, 3, 4, 5].map((slot) => {
                const r = rows.find((s) => s.pick_slot_no === slot);
                return (
                  <TableRow key={slot}>
                    <TableCell>{SLOT_LABEL[slot] ?? `${slot}픽`}</TableCell>
                    <TableCell align="right">{r ? fmtInt(r.pick_cnt) : '—'}</TableCell>
                    <TableCell align="right">{r ? fmt1(r.pick_share_pct) : '—'}</TableCell>
                    <TableCell align="right">
                      {r?.win_rate_pct != null ? (
                        <Typography
                          component="span"
                          variant="body2"
                          color={Number(r.win_rate_pct) >= 50 ? 'success.main' : 'error.main'}
                        >
                          {fmt1(r.win_rate_pct)}
                        </Typography>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MonsterDetailRtaOverviewTabProps {
  monsterId?: number | null;
  rtaDetail: MonsterDetail | null;
  rtaOverviewPending?: boolean;
  rtaOverviewFailed?: boolean;
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

export default function MonsterDetailRtaOverviewTab({
  monsterId,
  rtaDetail,
  rtaOverviewPending = false,
  rtaOverviewFailed = false,
}: MonsterDetailRtaOverviewTabProps) {
  const { data: seasonsData } = useRtaSeasons();
  const { seasonSelectValue, setSeason, seasonOptions, seasonIdForApi } =
    useRtaSeasonSelect(seasonsData);
  const { data: gradeRules = [], isLoading: tierRulesLoading } = useRtaRatingGradeRules();
  const [tierSelection, setTierSelection] = useState('CH_ALL');

  const selectedRatingId = useMemo(() => {
    if (!tierSelection || tierSelection === 'CH_ALL') return null;
    return buildMonsterStatsTierBody(tierSelection, gradeRules).ratingId ?? null;
  }, [tierSelection, gradeRules]);

  const { data: overview, isFetching: overviewFetching } = useRtaMonsterOverview(monsterId, {
    seasonId: seasonIdForApi ?? null,
    ratingId: selectedRatingId,
    enabled: monsterId != null && monsterId > 0,
  });

  const stats = overview?.overview_stats ?? null;
  const dailyTrend = overview?.daily_trend ?? [];
  const pickSlots = overview?.pick_slots ?? [];
  const topSummoners = overview?.top_summoners ?? [];

  const chartData = useMemo(
    () =>
      dailyTrend.map((r) => ({
        day: r.snap_date?.slice(5) ?? '',
        픽률: r.pick_rate_pct != null ? Number(r.pick_rate_pct) : null,
        승률: r.win_rate_pct != null ? Number(r.win_rate_pct) : null,
        밴률: r.ban_rate_pct != null ? Number(r.ban_rate_pct) : null,
      })),
    [dailyTrend],
  );

  const soloCounters = useMemo(
    () =>
      (rtaDetail?.counter_matchups ?? [])
        .filter((r: CounterMatchupRow) => Number(r.opponentComboSize ?? 0) === 1)
        .slice(0, 5),
    [rtaDetail?.counter_matchups],
  );

  if (rtaOverviewPending) {
    return (
      <Box sx={{ py: 2 }}>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          RTA 집계를 불러오는 중입니다…
        </Typography>
      </Box>
    );
  }

  if (rtaOverviewFailed) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        RTA 집계를 불러오지 못했습니다.
      </Alert>
    );
  }

  return (
    <Box>
      <RtaSeasonTierSelectRow
        seasonSelectValue={seasonSelectValue}
        setSeason={setSeason}
        seasonOptions={seasonOptions}
        tierSelection={tierSelection}
        setTierSelection={setTierSelection}
        gradeRules={gradeRules}
        tierRulesLoading={tierRulesLoading}
        seasonLabelId="monster-detail-rta-overview-season"
      />

      {/* ── 상단 요약 지표 ── */}
      <Paper
        variant="outlined"
        sx={(t) => ({
          mb: 2,
          p: { xs: 2, sm: 3 },
          background: t.palette.mode === 'dark'
            ? alpha(t.palette.primary.main, 0.04)
            : alpha(t.palette.primary.main, 0.02),
        })}
      >
        {overviewFetching ? (
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" width={80} height={56} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        ) : stats ? (
          <>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: { xs: 2, sm: 4 },
                mb: 1,
              }}
            >
              <StatChip
                label="Win Rate"
                value={fmt1(stats.win_rate_pct)}
                color={stats.win_rate_pct != null && Number(stats.win_rate_pct) >= 50 ? 'success' : 'error'}
              />
              <StatChip
                label="Pick Rate"
                value={fmt1(stats.pick_rate_pct)}
                sub={`${fmtInt(stats.pick_cnt)} / ${fmtInt(stats.field_cnt)} games`}
                color="primary"
              />
              <StatChip label="Ban Rate" value={fmt1(stats.ban_rate_pct)} />
              <StatChip label="Lead Rate" value={fmt1(stats.lead_rate_pct)} />
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            집계 데이터가 없습니다. (배치 실행 후 표시됩니다)
          </Typography>
        )}
      </Paper>

      {/* ── 7일 추이 차트 ── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          최근 7일 지표 추이 (%)
        </Typography>
        {overviewFetching ? (
          <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: 1 }} />
        ) : chartData.length > 0 ? (
          <Box sx={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v, name) => [`${v ?? '—'}%`, name]} />
                <Legend />
                <Line type="monotone" dataKey="픽률" stroke="#1976d2" strokeWidth={2} dot connectNulls />
                <Line type="monotone" dataKey="승률" stroke="#2e7d32" strokeWidth={2} dot connectNulls />
                <Line type="monotone" dataKey="밴률" stroke="#c62828" strokeWidth={2} dot connectNulls strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Alert severity="info" variant="outlined" sx={{ py: 1 }}>
            일별 집계 데이터가 없습니다. 배치가 실행되면 표시됩니다.
          </Alert>
        )}
      </Paper>

      {/* ── 픽 슬롯별 집계 ── */}
      <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 2, mb: 1 }}>
        픽 순서별 통계
      </Typography>
      {overviewFetching ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
          <PickSlotTable slots={pickSlots as any} teamSide={1} label="선픽 팀 슬롯별 픽률·승률" />
          <PickSlotTable slots={pickSlots as any} teamSide={2} label="후픽 팀 슬롯별 픽률·승률" />
        </Box>
      )}

      {/* ── 상성 / 시너지 ── */}
      <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 2, mb: 1 }}>
        몬스터 상성
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              상대하기 어려운 몬스터 (카운터 · 솔로)
            </Typography>
            {soloCounters.length ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {soloCounters.map((r, i) => (
                  <Box key={`${r.opponentComboKey}-${i}`} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" noWrap title={String(r.opponentLabel ?? r.opponentComboKey)}>
                      {r.opponentLabel ?? r.opponentComboKey ?? '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      승률 {r.winRate != null ? `${Number(r.winRate).toFixed(1)}%` : '—'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">데이터가 없습니다.</Typography>
            )}
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              함께 사용된 몬스터 (듀오 시너지)
            </Typography>
            {rtaDetail?.good_combos?.length ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {rtaDetail.good_combos.slice(0, 5).map((c, i) => (
                  <Box key={`${c.monster_id}-${i}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={getRenderableImageUrl(c.monster_image)} variant="rounded" sx={{ width: 32, height: 32 }}>
                      {(c.monster_name ?? '?').charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap>{c.monster_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        승률 {c.win_rate.toFixed(1)}% · {c.match_count}판
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">데이터가 없습니다.</Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* ── 장인 랭킹 ── */}
      <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 2, mb: 1 }}>
        장인 랭킹
      </Typography>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '12px !important' }}>
          {overviewFetching ? (
            <Skeleton variant="rectangular" width="100%" height={120} sx={{ borderRadius: 1 }} />
          ) : topSummoners.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>소환사</TableCell>
                    <TableCell align="right">픽</TableCell>
                    <TableCell align="right">승률</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topSummoners.map((s, i) => (
                    <TableRow key={s.wizard_id} hover>
                      <TableCell>
                        <Chip
                          label={i + 1}
                          size="small"
                          sx={{ width: 28, height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          component={Link}
                          href={`/rta/player/${encodeURIComponent(s.wizard_id)}`}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', color: 'inherit', '&:hover': { textDecoration: 'underline' } }}
                        >
                          <Avatar
                            src={getSwexPlayerImageUrl(s.channel_uid ?? s.wizard_id)}
                            sx={{ width: 28, height: 28, flexShrink: 0 }}
                          />
                          <Typography variant="body2" noWrap>{s.wizard_name ?? s.wizard_id}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{fmtInt(s.pick_cnt)}</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={s.win_rate_pct != null && Number(s.win_rate_pct) >= 50 ? 'success.main' : 'error.main'}
                        >
                          {fmt1(s.win_rate_pct)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">
              픽 5회 이상인 소환사 데이터가 없습니다.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
