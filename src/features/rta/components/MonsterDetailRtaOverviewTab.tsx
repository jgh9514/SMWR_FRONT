'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
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
import {
  useRtaRatingGradeRules,
  useRtaSeasonSelect,
  useRtaSeasons,
  useRtaMonsterOverview,
  useRtaMonsterRecentMatches,
  buildMonsterStatsTierBody,
} from '@/features/rta/hooks/useRtaData';
import RtaSeasonTierSelectRow from '@/features/rta/components/RtaSeasonTierSelectRow';
import RtaMatchListCard from '@/features/rta/components/RtaMatchListCard';
import { processRawMatchToMatchItem } from '@/features/rta/utils/processRtaMatchItem';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import { getRtaTierShortLabel } from '@/shared/utils/util';
import type { RtaMonsterPickSlotRow } from '@/features/rta/types/rta';
import type { RawMatchItem } from '@/types';

function fmt1(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return `${Number(v).toFixed(1)}%`;
}

function fmtInt(v: number | null | undefined): string {
  if (v == null) return '—';
  return Number(v).toLocaleString('ko-KR');
}

function toNum(v: unknown): number {
  if (v == null || v === '') return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

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

const FIRST_PICK_COLS: readonly (readonly number[])[] = [[1], [2, 3], [4, 5]];
const SECOND_PICK_COLS: readonly (readonly number[])[] = [[1, 2], [3, 4], [5]];
const TEAM_PICK_SLOT_LABEL: Record<number, string> = { 1: '1번', 2: '2번', 3: '3번', 4: '4번', 5: '5번' };

function PickSlotBox({
  slotNo,
  pickSharePct,
  winRatePct,
  pickCnt,
  color,
}: {
  slotNo: number;
  pickSharePct: number;
  winRatePct: number | null;
  pickCnt: number;
  color: string;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const fill = Math.min(100, Math.max(0, pickSharePct));
  const wr = winRatePct;
  const wrColor =
    wr == null ? 'text.disabled' : wr >= 55 ? 'error.main' : wr >= 50 ? 'success.main' : 'text.secondary';
  const hasData = pickCnt > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.62rem',
          fontWeight: 700,
          color: hasData ? alpha(color, isDark ? 0.9 : 0.75) : 'text.disabled',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {TEAM_PICK_SLOT_LABEL[slotNo] ?? '—'}
      </Typography>

      <Box
        sx={{
          position: 'relative',
          width: { xs: 46, sm: 58, md: 64 },
          height: { xs: 46, sm: 58, md: 64 },
          borderRadius: 1.5,
          overflow: 'hidden',
          border: '2px solid',
          borderColor: hasData ? alpha(color, isDark ? 0.45 : 0.3) : alpha(theme.palette.divider, 0.6),
          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${fill}%`,
            background: `linear-gradient(180deg, ${alpha(color, isDark ? 0.55 : 0.45)}, ${alpha(color, isDark ? 0.35 : 0.25)})`,
            transition: 'height 0.45s cubic-bezier(.4,0,.2,1)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            gap: 0.3,
            pointerEvents: 'none',
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: { xs: '0.55rem', sm: '0.6rem' },
              lineHeight: 1,
              color: 'text.secondary',
              textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)',
            }}
          >
            {hasData ? `${fmtInt(pickCnt)}픽` : ''}
          </Typography>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: { xs: '0.68rem', sm: '0.78rem' },
              lineHeight: 1,
              color: hasData ? 'text.primary' : 'text.disabled',
              textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)',
            }}
          >
            {hasData ? `${fill.toFixed(1)}%` : '—'}
          </Typography>
        </Box>
      </Box>

      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.68rem',
          lineHeight: 1,
          color: wrColor,
        }}
      >
        {wr == null ? '—' : `${wr.toFixed(1)}%`}
      </Typography>
    </Box>
  );
}

function PickSnakeGrid({
  slots,
  isFirstPick,
  color,
}: {
  slots: RtaMonsterPickSlotRow[];
  isFirstPick: boolean;
  color: string;
}) {
  const colPattern = isFirstPick ? FIRST_PICK_COLS : SECOND_PICK_COLS;
  const slotMap = new Map(slots.map((s) => [s.pick_slot_no, s]));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: { xs: 0.75, sm: 1, md: 1.5 },
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {colPattern.map((colSlots, colIdx) => (
        <Stack
          key={colIdx}
          direction="column"
          gap={{ xs: 0.75, sm: 1 }}
          sx={{ alignItems: 'center', justifyContent: 'center' }}
        >
          {colSlots.map((slotNo) => {
            const row = slotMap.get(slotNo);
            return (
              <PickSlotBox
                key={slotNo}
                slotNo={slotNo}
                pickSharePct={row ? toNum(row.pick_share_pct) : 0}
                winRatePct={row?.win_rate_pct != null ? toNum(row.win_rate_pct) : null}
                pickCnt={row ? toNum(row.pick_cnt) : 0}
                color={color}
              />
            );
          })}
        </Stack>
      ))}
    </Box>
  );
}

interface MonsterDetailRtaOverviewTabProps {
  monsterId?: number | null;
}

export default function MonsterDetailRtaOverviewTab({ monsterId }: MonsterDetailRtaOverviewTabProps) {
  const { data: seasonsData } = useRtaSeasons();
  const { seasonSelectValue, setSeason, seasonOptions, seasonIdForApi } = useRtaSeasonSelect(seasonsData);
  const { data: gradeRules = [], isLoading: tierRulesLoading } = useRtaRatingGradeRules();
  const [tierSelection, setTierSelection] = useState('CH_ALL');

  const { selectedRatingId, selectedRatingIds } = useMemo(() => {
    if (!tierSelection || tierSelection === 'CH_ALL') return { selectedRatingId: null, selectedRatingIds: null };
    const body = buildMonsterStatsTierBody(tierSelection, gradeRules);
    if (body.ratingIds && body.ratingIds.length > 0) return { selectedRatingId: null, selectedRatingIds: body.ratingIds };
    return { selectedRatingId: body.ratingId ?? null, selectedRatingIds: null };
  }, [tierSelection, gradeRules]);

  const valid = monsterId != null && monsterId > 0;

  const { data: overviewData, isFetching: overviewFetching } = useRtaMonsterOverview(monsterId, {
    seasonId: seasonIdForApi ?? null,
    ratingId: selectedRatingId,
    ratingIds: selectedRatingIds,
    enabled: valid,
  });

  const [visibleMatchCount, setVisibleMatchCount] = useState(10);
  useEffect(() => { setVisibleMatchCount(10); }, [seasonIdForApi, monsterId]);
  const { data: recentMatchesData, isFetching: recentFetching } = useRtaMonsterRecentMatches(monsterId, {
    seasonId: seasonIdForApi ?? null,
    enabled: valid,
    limit: 20,
  });

  const stats = overviewData?.overview_stats ?? null;
  const dailyTrend = overviewData?.daily_trend ?? [];
  const dailyTrendPerRating = overviewData?.daily_trend_per_rating ?? [];
  const pickSlots = overviewData?.pick_slots ?? [];
  const topSummoners = overviewData?.top_summoners ?? [];
  const rankedSummoners = topSummoners.filter((s) => s.above_threshold);
  const otherSummoners = topSummoners.filter((s) => !s.above_threshold);

  const usePerRatingChart = dailyTrendPerRating.length > 0;

  const { chartData, perRatingKeys } = useMemo(() => {
    if (!usePerRatingChart) {
      return {
        chartData: dailyTrend.map((r) => ({
          day: r.snap_date?.slice(5) ?? '',
          픽률: r.pick_rate_pct != null ? Number(r.pick_rate_pct) : null,
          승률: r.win_rate_pct != null ? Number(r.win_rate_pct) : null,
          밴률: r.ban_rate_pct != null ? Number(r.ban_rate_pct) : null,
        })),
        perRatingKeys: [] as string[],
      };
    }

    // 등급별 라인: rating_id 추출 → 라벨 생성
    const ratingIds = [...new Set(dailyTrendPerRating.map((r) => r.rating_id))].sort((a, b) => b - a);
    const keys = ratingIds.map((rid) => getRtaTierShortLabel(rid));

    // snap_date 기준으로 피벗
    const byDate = new Map<string, Record<string, string | number | null>>();
    for (const r of dailyTrendPerRating) {
      const day = r.snap_date?.slice(5) ?? '';
      if (!byDate.has(day)) byDate.set(day, { day });
      const label = getRtaTierShortLabel(r.rating_id);
      const row = byDate.get(day)!;
      row[`${label} 픽률`] = r.pick_rate_pct != null ? Number(r.pick_rate_pct) : null;
      row[`${label} 승률`] = r.win_rate_pct != null ? Number(r.win_rate_pct) : null;
    }

    const perRatingLineKeys = keys.flatMap((k) => [`${k} 픽률`, `${k} 승률`]);
    return {
      chartData: [...byDate.values()].sort((a, b) => String(a.day).localeCompare(String(b.day))),
      perRatingKeys: perRatingLineKeys,
    };
  }, [dailyTrend, dailyTrendPerRating, usePerRatingChart]);

  const firstPickSlots = useMemo(() => pickSlots.filter((s) => s.team_side === 1), [pickSlots]);
  const secondPickSlots = useMemo(() => pickSlots.filter((s) => s.team_side === 2), [pickSlots]);

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

      {/* 상단 요약 지표 */}
      <Paper
        variant="outlined"
        sx={(t) => ({
          mb: 2,
          p: { xs: 2, sm: 3 },
          background: t.palette.action.hover,
        })}
      >
        {overviewFetching ? (
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" width={80} height={56} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        ) : stats ? (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: { xs: 2, sm: 4 },
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
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            집계 데이터가 없습니다. (배치 실행 후 표시됩니다)
          </Typography>
        )}
      </Paper>

      {/* 7일 추이 차트 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          최근 7일 지표 추이 (%)
        </Typography>
        {overviewFetching ? (
          <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: 1 }} />
        ) : chartData.length > 0 ? (
          <Box sx={{ width: '100%', height: usePerRatingChart ? 300 : 260 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v, name) => [`${v ?? '—'}%`, name]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {usePerRatingChart ? (
                  perRatingKeys.map((key, i) => {
                    const isPick = key.endsWith('픽률');
                    const tierColors = ['#1976d2', '#7b1fa2', '#2e7d32', '#e65100', '#c62828', '#00695c'];
                    const tierIdx = Math.floor(i / 2) % tierColors.length;
                    return (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={tierColors[tierIdx]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        strokeDasharray={isPick ? undefined : '4 2'}
                      />
                    );
                  })
                ) : (
                  <>
                    <Line type="monotone" dataKey="픽률" stroke="#1976d2" strokeWidth={2} dot connectNulls />
                    <Line type="monotone" dataKey="승률" stroke="#2e7d32" strokeWidth={2} dot connectNulls />
                    <Line
                      type="monotone"
                      dataKey="밴률"
                      stroke="#c62828"
                      strokeWidth={2}
                      dot
                      connectNulls
                      strokeDasharray="4 2"
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Alert severity="info" variant="outlined" sx={{ py: 1 }}>
            일별 집계 데이터가 없습니다. 배치가 실행되면 표시됩니다.
          </Alert>
        )}
      </Paper>

      {/* 픽 순서별 통계 */}
      <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 2, mb: 1 }}>
        픽 순서별 통계
      </Typography>
      {overviewFetching ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ pb: '12px !important' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                선픽 팀
              </Typography>
              {firstPickSlots.length > 0 ? (
                <PickSnakeGrid slots={firstPickSlots} isFirstPick={true} color="#1976d2" />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  데이터 없음
                </Typography>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent sx={{ pb: '12px !important' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                후픽 팀
              </Typography>
              {secondPickSlots.length > 0 ? (
                <PickSnakeGrid slots={secondPickSlots} isFirstPick={false} color="#7b1fa2" />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  데이터 없음
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* 장인 랭킹 + 최근 전투 (2열) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 3,
          mt: 2,
          alignItems: 'start',
        }}
      >
        {/* 장인 랭킹 */}
        <Box>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
            장인 랭킹
          </Typography>
          {overviewFetching ? (
            <Stack spacing={1}>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: 1.5 }} />
              ))}
            </Stack>
          ) : topSummoners.length > 0 ? (
            <Stack spacing={1.5}>
              {/* 3500점 이상 */}
              {rankedSummoners.length > 0 && (
                <Stack spacing={0.75}>
                  {rankedSummoners.map((s, i) => {
                    const wr = s.win_rate_pct != null ? Number(s.win_rate_pct) : null;
                    const isTop3 = i < 3;
                    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                    const rankColor = isTop3 ? rankColors[i] : undefined;
                    const wrGood = wr != null && wr >= 50;

                    return (
                      <Box
                        key={s.wizard_id}
                        component={Link}
                        href={`/rta/player/${encodeURIComponent(s.wizard_id)}`}
                        sx={(t) => ({
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          px: 1.5,
                          py: 1,
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: isTop3
                            ? alpha(rankColor!, t.palette.mode === 'dark' ? 0.35 : 0.4)
                            : 'divider',
                          bgcolor: isTop3
                            ? alpha(rankColor!, t.palette.mode === 'dark' ? 0.07 : 0.05)
                            : t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                          textDecoration: 'none',
                          color: 'inherit',
                          transition: 'background-color 0.15s, border-color 0.15s',
                          '&:hover': {
                            bgcolor: t.palette.action.hover,
                            borderColor: t.palette.action.focus,
                          },
                        })}
                      >
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            bgcolor: isTop3 ? alpha(rankColor!, 0.15) : 'action.hover',
                            border: '1.5px solid',
                            borderColor: isTop3 ? alpha(rankColor!, 0.5) : 'divider',
                          }}
                        >
                          <Typography
                            sx={{ fontSize: '0.72rem', fontWeight: 800, color: isTop3 ? rankColor : 'text.disabled', lineHeight: 1 }}
                          >
                            {i + 1}
                          </Typography>
                        </Box>

                        <Avatar
                          src={getSwexPlayerImageUrl(s.channel_uid ?? s.wizard_id)}
                          sx={{ width: 34, height: 34, flexShrink: 0, border: '1.5px solid', borderColor: 'divider' }}
                        />

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ lineHeight: 1.3, mb: 0.3 }}>
                            {s.wizard_name ?? s.wizard_id}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, wr ?? 0)}
                            sx={(t) => ({
                              height: 4,
                              borderRadius: 2,
                              bgcolor: t.palette.action.hover,
                              '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: wrGood ? 'success.main' : 'error.main' },
                            })}
                          />
                        </Box>

                        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 800, color: wrGood ? 'success.main' : 'error.main', lineHeight: 1.2 }}>
                            {fmt1(wr)}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                            {fmtInt(s.pick_cnt)}픽
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}

              {/* 3500점 미만 별도 */}
              {otherSummoners.length > 0 && (
                <Box>
                  <Stack spacing={0.75}>
                    {otherSummoners.map((s) => {
                      const wr = s.win_rate_pct != null ? Number(s.win_rate_pct) : null;
                      const wrGood = wr != null && wr >= 50;

                      return (
                        <Box
                          key={s.wizard_id}
                          component={Link}
                          href={`/rta/player/${encodeURIComponent(s.wizard_id)}`}
                          sx={(t) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            px: 1.5,
                            py: 1,
                            borderRadius: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                            opacity: 0.75,
                            textDecoration: 'none',
                            color: 'inherit',
                            transition: 'background-color 0.15s',
                            '&:hover': { bgcolor: t.palette.action.hover },
                          })}
                        >
                          <Avatar
                            src={getSwexPlayerImageUrl(s.channel_uid ?? s.wizard_id)}
                            sx={{ width: 28, height: 28, flexShrink: 0, border: '1px solid', borderColor: 'divider' }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={500} noWrap sx={{ lineHeight: 1.3 }}>
                              {s.wizard_name ?? s.wizard_id}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: wrGood ? 'success.main' : 'error.main', lineHeight: 1.2 }}>
                              {fmt1(wr)}
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                              {fmtInt(s.pick_cnt)}픽
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Stack>
          ) : (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  픽 5회 이상인 소환사 데이터가 없습니다.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* 최근 전투 */}
        <Box>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
            최근 전투
          </Typography>
          {recentFetching ? (
            <Stack spacing={1}>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 1.5 }} />
              ))}
            </Stack>
          ) : (recentMatchesData?.matches?.length ?? 0) > 0 ? (
            <>
              <Stack spacing={1}>
                {(recentMatchesData!.matches as unknown as RawMatchItem[])
                  .slice(0, visibleMatchCount)
                  .map((raw, idx) => {
                    const match = processRawMatchToMatchItem(raw);
                    return (
                      <RtaMatchListCard key={raw.rid != null ? String(raw.rid) : idx} match={match} />
                    );
                  })}
              </Stack>
              {visibleMatchCount < (recentMatchesData!.matches?.length ?? 0) && (
                <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setVisibleMatchCount((c) => c + 10)}
                    sx={{ borderRadius: 2, px: 4, fontWeight: 700 }}
                  >
                    더보기
                  </Button>
                </Box>
              )}
            </>
          ) : (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  최근 전투 데이터가 없습니다.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  );
}
