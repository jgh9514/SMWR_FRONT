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
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
} from '@mui/material';
import { getRtaTierShortLabel } from '@/shared/utils/util';
import type { MatchItem } from '@/types';
import { useRtaDashboardRankCutoff, useRtaPlayerSummary, useRtaPlayerMonsterUsage, useRtaPlayerOpponentRecords } from '@/features/rta/hooks/useRtaData';
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
type TrendViewMode = 'chart' | 'table';

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

  const { data: monsterUsageData } = useRtaPlayerMonsterUsage(wizardId, seasonCode, {
    seasonId,
    enabled: Boolean(wizardId),
  });

  const { data: opponentData } = useRtaPlayerOpponentRecords(wizardId, seasonCode, {
    seasonId,
    limit: 5,
    offset: 0,
    enabled: Boolean(wizardId),
  });

  /** '전체 점수 추이' 접힘 (기본 접어 두고 30일 라인이 먼저 보이게) */
  const [chartOpen, setChartOpen] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>('daily');
  const [trendViewMode, setTrendViewMode] = useState<TrendViewMode>('chart');
  /** 30일·'N일 전' 기준 시각(마운트 시 1회) — render 순수성 */
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
    const rows = monsterUsageData?.rows ?? [];
    return rows
      .filter((r) => (r.actual_pick_cnt ?? (r.pick_cnt + r.ban_cnt)) > 0)
      .slice(0, 5)
      .map((r) => ({
        unitMasterId: r.unit_master_id,
        name: r.monster_name ?? String(r.unit_master_id),
        image: r.monster_image ?? '',
        games: r.actual_pick_cnt ?? (r.pick_cnt + r.ban_cnt),
        winRatePct: r.win_rate_pct,
      }));
  }, [monsterUsageData?.rows]);

  const topOpponents = useMemo(() => {
    const rows = opponentData?.rows ?? [];
    return rows.slice(0, 5).map((r) => ({
      oppId: r.opponent_wizard_id,
      oppName: r.opponent_wizard_name?.trim() || `소환사 ${r.opponent_wizard_id}`,
      wins: r.win_cnt,
      losses: r.lose_cnt,
      channelUid: r.opponent_channel_uid ?? undefined,
    }));
  }, [opponentData?.rows]);

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

  const tierBand = useMemo(() => {
    const rid = ratingId;
    if (rid == null || !Number.isFinite(rid) || rid <= 0) return { type: 'scoreOnly' as const };
    const anchors = rankCutData?.rank_cutoff_anchors;
    const snapshots = rankCutData?.snapshot_rank_cut;

    let rows: { ratingId: number; cutoff: number; tierSort: number }[] | undefined;

    if (anchors && anchors.length > 0) {
      // rank_cutoff_anchors: 6개 시점×전 티어가 혼재 → 'now'(anchorSort=0)을 우선, 없으면 가장 최신(최솟값) 사용
      const mapped = anchors.map((r) => ({
        ratingId: Number(r.ratingId),
        cutoff: Number(r.cutoffScore),
        anchorSort: r.anchorSort ?? 999,
        tierSort: r.tierSort ?? 0,
      }));
      const minAnchorSort = Math.min(...mapped.map((x) => x.anchorSort));
      rows = mapped
        .filter((x) => x.anchorSort === minAnchorSort)
        .filter((x) => Number.isFinite(x.ratingId) && x.ratingId > 0 && Number.isFinite(x.cutoff))
        .sort((a, b) => a.tierSort - b.tierSort);
    }
    if ((!rows || rows.length === 0) && snapshots && snapshots.length > 0) {
      rows = snapshots
        .map((r) => ({ ratingId: Number(r.ratingId), cutoff: Number(r.cutoffScore), tierSort: 0 }))
        .filter((x) => Number.isFinite(x.ratingId) && x.ratingId > 0 && Number.isFinite(x.cutoff));
    }
    if (!rows || rows.length === 0) return { type: 'scoreOnly' as const };

    const i = rows.findIndex((r) => r.ratingId === rid);
    if (i < 0) return { type: 'scoreOnly' as const };

    let nextRow = rows[i + 1];
    let nextRatingId = nextRow?.ratingId ?? 0;

    // 다음 티어가 없으면 (G3) 백엔드에서 내려준 랭킹 1위 점수를 max로 사용
    if (!nextRow) {
      const top1Score = rankCutData?.top1Score;
      const rank1Score = top1Score != null && top1Score > 0 ? top1Score : 0;
      if (rank1Score <= 0) return { type: 'highest' as const };
      nextRow = { ratingId: 5001, cutoff: rank1Score, tierSort: 999 };
      nextRatingId = 5001;
    }

    const min = rows[i]!.cutoff;
    const max = nextRow.cutoff;
    if (isRtaCutoffMissing(max) || min >= max) {
      if (min > 0) return { type: 'highest' as const };
      return { type: 'scoreOnly' as const };
    }
    return { type: 'range' as const, min, max, currentTierRatingId: rows[i]!.ratingId, nextRatingId };
  }, [rankCutData?.rank_cutoff_anchors, rankCutData?.snapshot_rank_cut, rankCutData?.top1Score, ratingId]);

  const tierBarPct = useMemo(() => {
    if (tierBand.type !== 'range' || !Number.isFinite(summaryScore)) return 0;
    const { min, max } = tierBand;
    if (max <= min) return 50;
    const t = (summaryScore - min) / (max - min);
    return Math.min(100, Math.max(0, t * 100));
  }, [summaryScore, tierBand]);

  const last30dSeries = useMemo(() => {
    const t30 = asOfTime - THIRTY_DAYS_MS;
    // 일별 마지막 점수만 집계 (당일 최신 경기 기준)
    const byDay = new Map<string, { score: number; t: string; daysAgo: number }>();
    for (const c of chronological) {
      const ms = parseMatchDate(c.date).getTime();
      if (ms < t30) continue;
      const key = ymdLocal(startOfLocalDay(parseMatchDate(c.date)));
      const daysAgo = Math.max(0, Math.floor((asOfTime - ms) / 86400000));
      const prev = byDay.get(key);
      if (!prev || ms > parseMatchDate(prev.t).getTime()) {
        byDay.set(key, { score: c.myScore, t: c.date, daysAgo });
      }
    }
    return [...byDay.values()]
      .sort((a, b) => parseMatchDate(a.t).getTime() - parseMatchDate(b.t).getTime())
      .map((d, idx) => ({ idx, ...d }));
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

  const handleTrendViewMode = useCallback((_e: unknown, v: TrendViewMode | null) => {
    if (v) setTrendViewMode(v);
  }, []);

  /** 일별 테이블 데이터: 날짜별 마지막 점수·승패·경기수·전일 대비 변화 */
  const dailyTableRows = useMemo(() => {
    const byDay = new Map<string, { score: number; wins: number; losses: number; games: number }>();
    for (const c of chronological) {
      const k = ymdLocal(startOfLocalDay(parseMatchDate(c.date)));
      const prev = byDay.get(k) ?? { score: 0, wins: 0, losses: 0, games: 0 };
      byDay.set(k, {
        score: c.myScore,
        wins: prev.wins + (c.won ? 1 : 0),
        losses: prev.losses + (c.won ? 0 : 1),
        games: prev.games + 1,
      });
    }
    const sorted = [...byDay.entries()].sort(([a], [b]) => b.localeCompare(a));
    return sorted.map(([day, data], i, arr) => {
      const olderEntry = arr[i + 1];
      const delta = olderEntry != null ? data.score - olderEntry[1].score : null;
      return { day, ...data, delta };
    });
  }, [chronological]);

  const accent = theme.palette.mode === 'dark' ? '#c8aa6e' : theme.palette.primary.main;

  /** Recharts 기본 툴팁(흰 배경) + 다크 테마 글자색 상속 시 일자(label) 대비 부족 방지 */
  const chartTooltipProps = useMemo(
    () => ({
      contentStyle: {
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: typeof theme.shape.borderRadius === 'number' ? theme.shape.borderRadius : 8,
        boxShadow: theme.shadows[4],
      },
      labelStyle: {
        color: theme.palette.text.primary,
        fontWeight: 600,
        marginBottom: 4,
      },
      itemStyle: {
        color: theme.palette.text.secondary,
      },
    }),
    [theme],
  );

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
              {(() => {
                const rid = tierBand.currentTierRatingId;
                const accentColor =
                  rid >= 3500 && rid < 4000 ? '#3cd3cf' :
                  rid >= 4000 && rid < 5000 ? '#ef4444' :
                  theme.palette.primary.main;
                return (
                  <>
                    {/* 현재 LP — 바 위 */}
                    <Box sx={{ position: 'relative', mb: 0.5 }}>
                      <Typography
                        sx={{
                          position: 'absolute',
                          left: `${tierBarPct}%`,
                          transform: `translateX(${tierBarPct < 5 ? '0%' : tierBarPct > 95 ? '-100%' : '-50%'})`,
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: accentColor,
                          whiteSpace: 'nowrap',
                          lineHeight: 1,
                        }}
                      >
                        {summaryScore > 0 ? `${Math.round(summaryScore).toLocaleString()} LP` : '—'}
                      </Typography>
                      <Box sx={{ height: 16 }} />
                    </Box>
                    {/* 프로그레스바 */}
                    <Box sx={{ position: 'relative', height: 8, borderRadius: 5, bgcolor: 'action.hover', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: `${tierBarPct}%`,
                          bgcolor: accentColor,
                          borderRadius: 5,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </Box>
                    {/* 현티어 최소 / 다음티어 최소컷 */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                      <Stack direction="row" alignItems="center" gap={0.4}>
                        {tierBand.currentTierRatingId > 0 && (
                          <RtaRatingStarIcons rating={tierBand.currentTierRatingId} size={11} gap={0.4} />
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                          {Math.round(tierBand.min).toLocaleString()} LP
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" gap={0.4}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                          {Math.round(tierBand.max).toLocaleString()} LP
                        </Typography>
                        {tierBand.nextRatingId > 0 && (
                          <RtaRatingStarIcons rating={tierBand.nextRatingId} size={11} gap={0.4} />
                        )}
                      </Stack>
                    </Stack>
                  </>
                );
              })()}
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
                      {...chartTooltipProps}
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
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, gap: 1, flexWrap: 'wrap' }}>
                  <ToggleButtonGroup size="small" value={trendViewMode} exclusive onChange={handleTrendViewMode}>
                    <ToggleButton value="chart">차트</ToggleButton>
                    <ToggleButton value="table">테이블</ToggleButton>
                  </ToggleButtonGroup>
                  {trendViewMode === 'chart' && (
                    <ToggleButtonGroup size="small" value={chartMode} exclusive onChange={handleChartMode}>
                      <ToggleButton value="daily">일별</ToggleButton>
                      <ToggleButton value="match">경기별</ToggleButton>
                    </ToggleButtonGroup>
                  )}
                </Stack>

                {trendViewMode === 'chart' ? (
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
                            {...chartTooltipProps}
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
                ) : (
                  <TableContainer sx={{ maxHeight: 280, overflowY: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          {['날짜', '점수', '변화', '경기', '승', '패'].map((h, i) => (
                            <TableCell
                              key={h}
                              align={i === 0 ? 'left' : 'right'}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                letterSpacing: '0.04em',
                                color: 'text.secondary',
                                bgcolor: 'action.hover',
                                borderBottom: '2px solid',
                                borderColor: 'divider',
                                py: 1,
                                px: { xs: 0.75, sm: 1.5 },
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dailyTableRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              데이터가 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          dailyTableRows.map((row) => {
                            const deltaColor = row.delta == null ? 'text.secondary' : row.delta > 0 ? 'success.main' : row.delta < 0 ? 'error.main' : 'text.secondary';
                            const deltaText = row.delta == null ? '—' : (row.delta > 0 ? '+' : '') + Math.round(row.delta).toLocaleString();
                            const parts = row.day.split('-');
                            const dateLabel = parts.length === 3 ? `${parts[0]!.slice(2)}.${parts[1]}.${parts[2]}` : row.day;
                            return (
                              <TableRow key={row.day} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                <TableCell sx={{ py: 0.75, px: { xs: 0.75, sm: 1.5 }, fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                  {dateLabel}
                                </TableCell>
                                <TableCell align="right" sx={{ py: 0.75, px: { xs: 0.75, sm: 1.5 }, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                  {Math.round(row.score).toLocaleString()}
                                </TableCell>
                                <TableCell align="right" sx={{ py: 0.75, px: { xs: 0.75, sm: 1.5 }, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.8rem', color: deltaColor, whiteSpace: 'nowrap' }}>
                                  {deltaText}
                                </TableCell>
                                <TableCell align="right" sx={{ py: 0.75, px: { xs: 0.75, sm: 1.5 }, fontSize: '0.75rem' }}>
                                  {row.games}
                                </TableCell>
                                <TableCell align="right" sx={{ py: 0.75, px: { xs: 0.75, sm: 1.5 }, fontSize: '0.75rem', color: 'success.main', fontWeight: 600 }}>
                                  {row.wins}
                                </TableCell>
                                <TableCell align="right" sx={{ py: 0.75, px: { xs: 0.75, sm: 1.5 }, fontSize: '0.75rem', color: 'error.main', fontWeight: 600 }}>
                                  {row.losses}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
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
                const pct = m.winRatePct != null ? Math.round(m.winRatePct) : null;
                return (
                  <Stack
                    key={m.name}
                    component={Link}
                    href={`/monster-detail/${m.unitMasterId}`}
                    direction="row"
                    alignItems="center"
                    gap={1.5}
                    sx={{ py: 0.5, borderRadius: 1, textDecoration: 'none', color: 'inherit', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
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
                          {pct != null ? `${pct}%` : '—'}
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
          <Box
            component={Link}
            href={picksHref}
            sx={{
              mt: 1.5,
              display: 'flex',
              justifyContent: 'center',
              py: 0.75,
              borderRadius: 1,
              textDecoration: 'none',
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            더보기
          </Box>
        </Card>

        <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
            <GroupsIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700} component="div">
              라이벌
            </Typography>
          </Stack>
          <Stack spacing={1}>
            {topOpponents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                집계된 상대 전적이 없습니다.
              </Typography>
            ) : (
              topOpponents.map((r) => {
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
          <Box
            component={Link}
            href={opponentsHref}
            sx={{
              mt: 1.5,
              display: 'flex',
              justifyContent: 'center',
              py: 0.75,
              borderRadius: 1,
              textDecoration: 'none',
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            더보기
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
            <Stack spacing={1.5}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 2 }} />
              ))}
            </Stack>
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


