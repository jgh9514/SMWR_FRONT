'use client';

import { useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Avatar,
  Box,
  Button,
  Card,
  Collapse,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TimelineIcon from '@mui/icons-material/Timeline';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import GroupsIcon from '@mui/icons-material/Groups';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getRtaTierShortLabel } from '@/shared/utils/util';
import type { MatchItem } from '@/types';
import { useRtaDashboardRankCutoff, useRtaPlayerSummary } from '@/features/rta/hooks/useRtaData';
import { isRtaCutoffMissing } from '@/features/rta/utils/rtaCutoffScore';
import { useRtaPlayerSeason } from '@/features/rta/context/RtaPlayerSeasonContext';
import { useRtaPlayerMatchesInfinite } from '@/features/rta/hooks/useRtaPlayerMatchesInfinite';
import { getMatchPerspective } from '@/features/rta/utils/rtaPlayerPerspective';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';
import RtaUnitPickGrid from '@/features/rta/components/RtaUnitPickGrid';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import { RtaMatchCard, formatMatchWhen } from '@/features/rta/components/RtaMatchCard';

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseMatchDate(iso: string): Date {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** yyyy-MM-dd 구간 양 끝 포함, 로컬 자정 기준 일자 나열 */
function iterateLocalDaysInclusive(startYmd: string, endYmd: string): string[] {
  const out: string[] = [];
  const [sy, sm, sd] = startYmd.split('-').map(Number);
  const [ey, em, ed] = endYmd.split('-').map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  while (cur.getTime() <= end.getTime()) {
    out.push(ymdLocal(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
/** Recharts ResponsiveContainer: % 높이만 쓰면 그리드·첫 측정에서 width/height -1 → 픽셀 지정 */
const RTA_OVERVIEW_CHART_30D_PX = 180;
const RTA_OVERVIEW_CHART_SCORE_PX = 200;

/** 차트 툴팁 등 한 줄 일시 */
function formatMatchDateTime(iso: string): string {
  const d = parseMatchDate(iso);
  if (d.getTime() === 0) return '—';
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

type ChartMode = 'daily' | 'match';

export default function RtaPlayerOverviewClient({ wizardId }: { wizardId: string }) {
  const theme = useTheme();
  const picksHref = `/rta/player/${encodeURIComponent(wizardId)}/picks`;
  const opponentsHref = `/rta/player/${encodeURIComponent(wizardId)}/opponents`;
  const { seasonCode, seasonId } = useRtaPlayerSeason();
  const { data: rankCutData } = useRtaDashboardRankCutoff(seasonCode, seasonId);
  const { data: summary } = useRtaPlayerSummary(wizardId, undefined, seasonCode, { seasonId });
  const {
    data: infinite,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useRtaPlayerMatchesInfinite(wizardId, true, seasonCode, seasonId);

  /** ‘전체 점수 추이’ 접힘 (기본 접어 두고 30일 라인이 먼저 보이게) */
  const [chartOpen, setChartOpen] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>('daily');
  /** 30일·‘N일 전’ 기준 시각(마운트 시 1회) — render 순수성 */
  const [asOfTime] = useState(() => Date.now());

  const allMatches = useMemo(() => {
    const pages = infinite?.pages ?? [];
    return pages.flat();
  }, [infinite?.pages]);

  const perspectives = useMemo(() => {
    const list: Array<{
      match: MatchItem;
      p: NonNullable<ReturnType<typeof getMatchPerspective>>;
    }> = [];
    for (const m of allMatches) {
      const p = getMatchPerspective(m, wizardId);
      if (p) list.push({ match: m, p });
    }
    return list;
  }, [allMatches, wizardId]);

  const chronological = useMemo(() => {
    return [...perspectives]
      .sort((a, b) => parseMatchDate(a.match.date).getTime() - parseMatchDate(b.match.date).getTime())
      .map((x) => ({
        date: x.match.date,
        myScore: x.p.myScore,
        won: x.p.won,
        match: x.match,
        p: x.p,
      }));
  }, [perspectives]);

  const winCount = num(summary?.win_count);
  const matchCount = num(summary?.match_count);
  const lossCount = Math.max(0, matchCount - winCount);
  const summaryScore = num(summary?.score);
  const maxSeasonScoreAgg = num(summary?.max_season_score);
  const maxScoreDisplay =
    maxSeasonScoreAgg > 0 ? maxSeasonScoreAgg : summaryScore > 0 ? summaryScore : 0;

  const topMonsters = useMemo(() => {
    const acc = new Map<string, { name: string; image: string; wins: number; games: number }>();
    for (const c of chronological) {
      for (const u of c.p.myUnits) {
        if (u.banned) continue;
        const key = u.name;
        if (!acc.has(key)) acc.set(key, { name: u.name, image: u.image, wins: 0, games: 0 });
        const g = acc.get(key)!;
        g.games += 1;
        if (c.won) g.wins += 1;
      }
    }
    return [...acc.values()]
      .filter((x) => x.games > 0)
      .sort((a, b) => b.games - a.games)
      .slice(0, 5);
  }, [chronological]);

  const LAST_N_GAMES = 20;
  /** 직전 N경기 구간에서 상대별 대전 수(판수) 상위만 표시 */
  const LAST20_TOP_OPPONENTS = 5;
  const last20VsOpponents = useMemo(() => {
    if (chronological.length === 0) {
      return {
        sampleSize: 0,
        rows: [] as { oppId: string; oppName: string; wins: number; losses: number; channelUid?: string }[],
      };
    }
    const slice = chronological.slice(-LAST_N_GAMES);
    const sampleSize = slice.length;
    const byKey = new Map<
      string,
      { oppId: string; oppName: string; wins: number; losses: number; channelUid?: string }
    >();
    for (const c of slice) {
      const oid = String(c.p.oppId ?? '').trim();
      const key = oid || String(c.p.oppName ?? '').trim();
      if (!key) continue;
      if (!byKey.has(key)) {
        byKey.set(key, {
          oppId: oid || key,
          oppName: String(c.p.oppName ?? key).trim() || key,
          wins: 0,
          losses: 0,
          channelUid: c.p.oppChannelUid,
        });
      } else {
        const g = byKey.get(key)!;
        if (c.p.oppChannelUid) g.channelUid = c.p.oppChannelUid;
      }
      const g = byKey.get(key)!;
      if (c.won) g.wins += 1;
      else g.losses += 1;
    }
    const rows = [...byKey.values()]
      .sort((a, b) => {
        const ta = a.wins + a.losses;
        const tb = b.wins + b.losses;
        if (tb !== ta) return tb - ta;
        return a.oppName.localeCompare(b.oppName, 'ko');
      })
      .slice(0, LAST20_TOP_OPPONENTS);
    return { sampleSize, rows };
  }, [chronological]);

  const chartData = useMemo(() => {
    if (chartMode === 'match') {
      return chronological.map((c, i) => ({
        x: i + 1,
        label: `${i + 1}`,
        score: c.myScore,
        t: c.date,
      }));
    }
    const endOfDayScore = new Map<string, number>();
    const endOfDayLastIso = new Map<string, string>();
    for (const c of chronological) {
      const k = ymdLocal(startOfLocalDay(parseMatchDate(c.date)));
      const cur = endOfDayLastIso.get(k);
      const curTime = cur ? parseMatchDate(cur).getTime() : -1;
      const t = parseMatchDate(c.date).getTime();
      if (!cur || t >= curTime) {
        endOfDayScore.set(k, c.myScore);
        endOfDayLastIso.set(k, c.date);
      }
    }
    const sortedDays = [...endOfDayScore.keys()].sort();
    if (sortedDays.length === 0) return [];
    const firstDay = sortedDays[0]!;
    const lastDay = sortedDays[sortedDays.length - 1]!;
    const allDays = iterateLocalDaysInclusive(firstDay, lastDay);
    let carryScore = endOfDayScore.get(firstDay)!;
    return allDays.map((k, i) => {
      if (endOfDayScore.has(k)) {
        carryScore = endOfDayScore.get(k)!;
      }
      const iso = endOfDayLastIso.get(k);
      /** 경기 없는 날: 툴팁용 로컬 정오 근처(타존 깨짐 방지 위해 Z 미부착) */
      const tIso = iso ?? `${k}T12:00:00`;
      return {
        x: i + 1,
        label: k.slice(5).replace('-', '/'),
        score: carryScore,
        t: tIso,
      };
    });
  }, [chronological, chartMode]);

  const chartDomain = useMemo(() => {
    const scores = chartData.map((d) => d.score).filter((n) => Number.isFinite(n));
    if (scores.length === 0) return [0, 2000] as [number, number];
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const pad = Math.max(5, (max - min) * 0.12 || 1);
    return [Math.floor(min - pad), Math.ceil(max + pad)] as [number, number];
  }, [chartData]);

  const ratingId = summary?.rating_id != null && summary.rating_id !== undefined ? Number(summary.rating_id) : null;
  const shortTier = getRtaTierShortLabel(ratingId ?? undefined);
  const winRateDisplay =
    summary?.win_rate_pct != null && Number.isFinite(Number(summary.win_rate_pct))
      ? Number(summary.win_rate_pct)
      : matchCount > 0
        ? (winCount / matchCount) * 100
        : null;

  /**
   * 랭크컷 구간: POST /rta/dashboard/rank-cutoff → `snapshot_rank_cut` = WAS `getRtaSnapshotRankCutLatest` = 테이블 `rta_snapshot_rank_cut` 최신 스냅(등급별 최저).
   * 왼쪽=현재 티어 하한, 오른쪽=바로 윗 티어 하한(배열에서 i+1). `ratingId`로 재정렬하지 않음 — API가 tier_sort·rating_id 순과 동일.
   */
  const tierBand = useMemo(() => {
    const rid = ratingId;
    if (rid == null || !Number.isFinite(rid) || rid <= 0) return { type: 'scoreOnly' as const };
    const raw = rankCutData?.snapshot_rank_cut ?? [];
    const rows = raw
      .map((r) => {
        const rec = r as { ratingId?: number; rating_id?: number; cutoffScore?: number; cutoff_score?: number };
        const id = rec.ratingId ?? rec.rating_id;
        const c = rec.cutoffScore ?? rec.cutoff_score;
        return { ratingId: Number(id), cutoff: Number(c) };
      })
      .filter((x) => Number.isFinite(x.ratingId) && Number.isFinite(x.cutoff))
      .filter((x) => !isRtaCutoffMissing(x.cutoff));
    if (rows.length < 1) return { type: 'scoreOnly' as const };
    const i = rows.findIndex((r) => r.ratingId === rid);
    if (i < 0) return { type: 'scoreOnly' as const };
    if (i >= rows.length - 1) return { type: 'highest' as const };
    const min = rows[i]!.cutoff;
    const max = rows[i + 1]!.cutoff;
    if (isRtaCutoffMissing(max) || min >= max) {
      if (min > 0) return { type: 'highest' as const };
      return { type: 'scoreOnly' as const };
    }
    const currentTierRatingId = rows[i]!.ratingId;
    const nextRatingId = rows[i + 1]!.ratingId;
    return { type: 'range' as const, min, max, currentTierRatingId, nextRatingId };
  }, [rankCutData?.snapshot_rank_cut, ratingId]);

  const tierBarPct = useMemo(() => {
    if (tierBand.type !== 'range' || !Number.isFinite(summaryScore)) return 0;
    const { min, max } = tierBand;
    if (max <= min) return 50;
    const t = (summaryScore - min) / (max - min);
    return Math.min(100, Math.max(0, t * 100));
  }, [summaryScore, tierBand]);

  const last30dSeries = useMemo(() => {
    const t30 = asOfTime - THIRTY_DAYS_MS;
    return chronological
      .filter((c) => parseMatchDate(c.date).getTime() >= t30)
      .map((c, idx) => {
        const t = parseMatchDate(c.date).getTime();
        const daysAgo = Math.max(0, Math.floor((asOfTime - t) / 86400000));
        return { idx, score: c.myScore, t: c.date, daysAgo };
      });
  }, [asOfTime, chronological]);

  const chart30dDomain = useMemo((): [number, number] => {
    const s = last30dSeries.map((d) => d.score).filter((n) => Number.isFinite(n));
    if (s.length === 0) return [0, 2000] as [number, number];
    const mn = Math.min(...s);
    const mx = Math.max(...s);
    const pad = Math.max(3, (mx - mn) * 0.1 || 1);
    return [Math.floor(mn - pad), Math.ceil(mx + pad)] as [number, number];
  }, [last30dSeries]);

  const lpChange30d = useMemo(() => {
    const t30 = asOfTime - THIRTY_DAYS_MS;
    let lastBefore: number | null = null;
    for (const c of chronological) {
      if (parseMatchDate(c.date).getTime() < t30) {
        lastBefore = c.myScore;
      }
    }
    const last = chronological.length > 0 ? chronological[chronological.length - 1]!.myScore : null;
    if (last == null) return { delta: null as number | null, hasBoth: false };
    if (lastBefore != null) return { delta: last - lastBefore, hasBoth: true };
    const firstIn = chronological.find((c) => parseMatchDate(c.date).getTime() >= t30);
    if (firstIn) return { delta: last - firstIn.myScore, hasBoth: true };
    return { delta: 0, hasBoth: true };
  }, [asOfTime, chronological]);

  const chart30dTicks = useMemo(() => {
    const n = last30dSeries.length;
    if (n === 0) return [];
    if (n === 1) return [0];
    if (n === 2) return [0, 1];
    return [0, Math.floor((n - 1) / 2), n - 1];
  }, [last30dSeries.length]);

  const loadedTotal = allMatches.length;
  const totalFromSummary = matchCount;

  const handleChartMode = useCallback((_e: unknown, v: ChartMode | null) => {
    if (v) setChartMode(v);
  }, []);

  const accent = theme.palette.mode === 'dark' ? '#c8aa6e' : theme.palette.primary.main;

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', md: 'minmax(300px, 420px) 1fr' },
        alignItems: 'start',
      }}
    >
      {/* 왼쪽 열 */}
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ p: 2, borderRadius: 2, overflow: 'hidden' }}>
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            gap={2}
            sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
          >
            <Box flex={1} minWidth={0}>
              <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap" sx={{ mb: 0.5 }}>
                <Typography variant="h6" fontWeight={800} sx={{ color: 'primary.main', lineHeight: 1.2 }}>
                  {shortTier}
                </Typography>
                {ratingId != null && ratingId > 0 && <RtaRatingStarIcons rating={ratingId} size={16} gap={0.5} />}
              </Stack>
              <Typography variant="body2" fontWeight={800}>
                {summaryScore > 0 ? `${Math.round(summaryScore).toLocaleString()} LP` : '—'}
              </Typography>
            </Box>
            <Stack alignItems="flex-end" spacing={0.25}>
              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                {winCount}승 {lossCount}패
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div" sx={{ textAlign: 'right', lineHeight: 1.3 }}>
                승률{' '}
                <Box component="span" fontWeight={800} color={winRateDisplay != null && winRateDisplay >= 50 ? 'success.main' : 'error.main'}>
                  {winRateDisplay != null ? `${winRateDisplay.toFixed(1)}%` : '—'}
                </Box>
              </Typography>
            </Stack>
          </Stack>

          <Box sx={{ mt: 2 }}>
            {tierBand.type === 'range' ? (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  {tierBand.currentTierRatingId > 0 && (
                    <RtaRatingStarIcons rating={tierBand.currentTierRatingId} size={14} gap={0.5} />
                  )}
                  {tierBand.nextRatingId > 0 && (
                    <RtaRatingStarIcons rating={tierBand.nextRatingId} size={14} gap={0.5} />
                  )}
                </Stack>
                <Box
                  sx={{
                    position: 'relative',
                    height: 8,
                    borderRadius: 1,
                    background: `linear-gradient(90deg, ${theme.palette.info.dark}22 0%, ${theme.palette.success.main}33 50%, ${theme.palette.warning.main}55 100%)`,
                    overflow: 'visible',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      right: 0,
                      height: 1,
                      transform: 'translateY(-50%)',
                      borderTop: `1px dashed ${theme.palette.divider}`,
                      opacity: 0.6,
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: `clamp(0px, ${tierBarPct}%, calc(100% - 10px))`,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      transform: 'translate(-50%, -50%)',
                      bgcolor: 'background.paper',
                      border: `2px solid ${theme.palette.warning.main}`,
                      boxShadow: 1,
                    }}
                    title="현재 LP"
                  />
                </Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                  <Typography variant="body2" fontWeight={800} color="text.primary" component="span">
                    {Math.round(tierBand.min).toLocaleString()} LP
                  </Typography>
                  <Typography variant="body2" fontWeight={800} color="text.primary" component="span" textAlign="right">
                    {Math.round(tierBand.max).toLocaleString()} LP
                  </Typography>
                </Stack>
              </>
            ) : (
              <Typography variant="body2" fontWeight={800} textAlign="center" sx={{ py: 0.5 }}>
                {summaryScore > 0 ? `${Math.round(summaryScore).toLocaleString()} LP` : '—'}
              </Typography>
            )}
          </Box>

          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={1}
              sx={{ mb: 1 }}
            >
              <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>
                <EmojiEventsIcon color="action" fontSize="small" />
                <Typography variant="subtitle2" fontWeight={700} component="span">
                  최근 30일
                </Typography>
                {lpChange30d.delta != null && lpChange30d.hasBoth ? (
                  <Typography
                    component="span"
                    variant="body2"
                    fontWeight={800}
                    sx={{ color: lpChange30d.delta > 0 ? 'success.main' : lpChange30d.delta < 0 ? 'error.main' : 'text.secondary' }}
                  >
                    {lpChange30d.delta > 0 ? '+' : ''}
                    {Math.round(lpChange30d.delta).toLocaleString()} LP
                  </Typography>
                ) : (
                  <Typography component="span" variant="body2" color="text.disabled">
                    —
                  </Typography>
                )}
              </Stack>
              <Stack direction="row" alignItems="baseline" gap={0.5} flexShrink={0}>
                <Typography variant="caption" color="text.secondary" component="span">
                  최고점수:
                </Typography>
                <Typography variant="body2" fontWeight={800} color="text.primary" component="span">
                  {maxScoreDisplay > 0 ? `${Math.round(maxScoreDisplay).toLocaleString()} LP` : '—'}
                </Typography>
              </Stack>
            </Stack>
            <Box
              sx={{
                width: '100%',
                minWidth: 0,
                height: RTA_OVERVIEW_CHART_30D_PX,
                mx: 'auto',
              }}
            >
              {last30dSeries.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  최근 30일 내 로드된 경기가 없습니다.
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={RTA_OVERVIEW_CHART_30D_PX}>
                  <LineChart data={last30dSeries} margin={{ top: 6, right: 4, left: 0, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} opacity={0.4} />
                    <XAxis
                      dataKey="idx"
                      type="number"
                      domain={[0, last30dSeries.length - 1]}
                      ticks={chart30dTicks}
                      tick={{ fontSize: 10 }}
                      stroke={theme.palette.text.disabled}
                      allowDecimals={false}
                      tickFormatter={(v) => {
                        const i = typeof v === 'number' ? v : parseInt(String(v), 10);
                        const p = last30dSeries[Math.min(Math.max(0, i), last30dSeries.length - 1)];
                        return p ? `${p.daysAgo}일 전` : '';
                      }}
                    />
                    <YAxis
                      domain={chart30dDomain}
                      width={40}
                      tick={{ fontSize: 10 }}
                      stroke={theme.palette.text.disabled}
                      tickFormatter={(v) => (Number.isFinite(v) ? String(Math.round(v)) : '')}
                    />
                    <RechartsTooltip
                      formatter={(v) => {
                        const n = typeof v === 'number' ? v : Number(v);
                        return [Number.isFinite(n) ? `${Math.round(n).toLocaleString()} LP` : '—', '점수'];
                      }}
                      labelFormatter={(_l, p) => {
                        const d = p?.[0]?.payload as { t?: string } | undefined;
                        return d?.t ? formatMatchDateTime(d.t) : '';
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={accent}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Box>

          <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ cursor: 'pointer', py: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => setChartOpen((v) => !v)}
            >
              <Stack direction="row" alignItems="center" gap={0.75}>
                <TimelineIcon color="action" fontSize="small" />
                <Typography variant="subtitle2" fontWeight={700}>
                  전체 점수 추이
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  (로드된 전체 {chartMode === 'daily' ? '일별' : '경기별'})
                </Typography>
              </Stack>
              <IconButton size="small" aria-label="접기">
                <ExpandMoreIcon sx={{ transform: chartOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </IconButton>
            </Stack>
            <Collapse in={chartOpen}>
              <Box sx={{ pt: 1.5 }}>
                <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                  <ToggleButtonGroup size="small" value={chartMode} exclusive onChange={handleChartMode}>
                    <ToggleButton value="daily">일별</ToggleButton>
                    <ToggleButton value="match">경기별</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                <Box sx={{ width: '100%', minWidth: 0, height: RTA_OVERVIEW_CHART_SCORE_PX }}>
                  {chartData.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 5 }}>
                      차트 데이터가 없습니다.
                    </Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={RTA_OVERVIEW_CHART_SCORE_PX}>
                      <AreaChart data={chartData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rtaScoreGrad2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={accent} stopOpacity={0.22} />
                            <stop offset="100%" stopColor={accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} opacity={0.5} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke={theme.palette.text.disabled} />
                        <YAxis domain={chartDomain} tick={{ fontSize: 10 }} stroke={theme.palette.text.disabled} width={44} />
                        <RechartsTooltip
                          formatter={(value) => {
                            const n = typeof value === 'number' ? value : Number(value);
                            return [Number.isFinite(n) ? Math.round(n).toLocaleString() : '—', '점수'];
                          }}
                          labelFormatter={(_l, payload) => {
                            const p = payload?.[0]?.payload as { t?: string } | undefined;
                            return p?.t ? formatMatchDateTime(p.t) : '';
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke={accent}
                          strokeWidth={2}
                          fill="url(#rtaScoreGrad2)"
                          dot={{ r: 2.5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Box>
            </Collapse>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
            <GpsFixedIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>
              사용 몬스터
            </Typography>
          </Stack>
          <Stack spacing={1}>
            {topMonsters.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                로드된 경기가 없습니다.
              </Typography>
            ) : (
              topMonsters.map((m) => {
                const pct = Math.round((m.wins / m.games) * 100);
                return (
                  <Stack
                    key={m.name}
                    direction="row"
                    alignItems="center"
                    gap={1.5}
                    sx={{ py: 0.5, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <Box sx={{ position: 'relative', width: 32, height: 32, borderRadius: 1, overflow: 'hidden', flexShrink: 0 }}>
                      <Image src={m.image} alt="" fill sizes="32px" style={{ objectFit: 'cover' }} unoptimized />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {m.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <Box component="span" color="success.main">
                          {pct}%
                        </Box>
                        {' · '}
                        {m.games}경기
                      </Typography>
                    </Box>
                  </Stack>
                );
              })
            )}
          </Stack>
          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
            <Button component={Link} href={picksHref} variant="outlined" size="small">
              더보기
            </Button>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
            <GroupsIcon color="primary" fontSize="small" />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} component="div">
                라이벌
              </Typography>
              <Typography variant="caption" color="text.secondary">
                최근 {LAST_N_GAMES}판 상대
              </Typography>
            </Box>
          </Stack>
          <Stack spacing={1}>
            {last20VsOpponents.sampleSize === 0 ? (
              <Typography variant="body2" color="text.secondary">
                로드된 경기가 없습니다.
              </Typography>
            ) : last20VsOpponents.rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                상대 정보가 없는 경기만 있습니다.
              </Typography>
            ) : (
              last20VsOpponents.rows.map((r) => {
                const href = `/rta/player/${encodeURIComponent(r.oppId)}`;
                return (
                  <Stack
                    key={`${r.oppId}-${r.oppName}`}
                    direction="row"
                    alignItems="center"
                    gap={1.25}
                    sx={{ py: 0.5, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <Avatar
                      component={Link}
                      href={href}
                      src={getSwexPlayerImageUrl(r.channelUid ?? r.oppId)}
                      sx={{ width: 32, height: 32, flexShrink: 0 }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        component={Link}
                        href={href}
                        variant="body2"
                        fontWeight={600}
                        noWrap
                        color="text.primary"
                        sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {r.oppName}
                      </Typography>
                      <Typography variant="caption" component="div" color="text.secondary">
                        <Box component="span" fontWeight={700} color="success.main">
                          {r.wins}승
                        </Box>
                        <Box component="span" sx={{ mx: 0.5 }} color="text.disabled">
                          |
                        </Box>
                        <Box component="span" fontWeight={700} color="error.main">
                          {r.losses}패
                        </Box>
                      </Typography>
                    </Box>
                  </Stack>
                );
              })
            )}
          </Stack>
          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
            <Button component={Link} href={opponentsHref} variant="outlined" size="small">
              더보기
            </Button>
          </Box>
        </Card>
      </Stack>

      {/* 오른쪽 열 */}
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 2, width: '100%', minWidth: 0, gap: 1 }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ flexShrink: 0 }}>
              내 경기
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              flexWrap="nowrap"
              gap={{ xs: 0.75, sm: 2 }}
              sx={{ flexShrink: 0, minWidth: 0 }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                승률
              </Typography>
              <Typography variant="body2" fontWeight={800} color="success.main" sx={{ whiteSpace: 'nowrap' }}>
                {matchCount > 0 ? `${((winCount / matchCount) * 100).toFixed(1)}%` : '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                총
              </Typography>
              <Typography variant="body2" fontWeight={800} sx={{ whiteSpace: 'nowrap' }}>
                {totalFromSummary || loadedTotal}
              </Typography>
            </Stack>
          </Stack>

          {isLoading ? (
            <Typography color="text.secondary">경기를 불러오는 중…</Typography>
          ) : (
            <Stack spacing={1.5}>
              {[...chronological]
                .sort((a, b) => parseMatchDate(b.date).getTime() - parseMatchDate(a.date).getTime())
                .map((c) => (
                  <RtaMatchCard key={`${c.match.p1Id}-${c.match.p2Id}-${c.match.date}`} match={c.match} wizardId={wizardId} />
                ))}
            </Stack>
          )}

          {hasNextPage && (
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
              <Button
                variant="outlined"
                size="small"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? '불러오는 중…' : '더보기'}
              </Button>
            </Box>
          )}
        </Card>
      </Stack>
    </Box>
  );
}


