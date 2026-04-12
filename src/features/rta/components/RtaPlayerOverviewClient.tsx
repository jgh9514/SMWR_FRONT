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
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TimelineIcon from '@mui/icons-material/Timeline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MatchItem } from '@/types';
import { useRtaPlayerSummary } from '@/features/rta/hooks/useRtaData';
import { useRtaPlayerSeason } from '@/features/rta/context/RtaPlayerSeasonContext';
import { useRtaPlayerMatchesInfinite } from '@/features/rta/hooks/useRtaPlayerMatchesInfinite';
import { getMatchPerspective } from '@/features/rta/utils/rtaPlayerPerspective';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';
import { getMonsterImageUrl, getSwexPlayerImageUrl } from '@/shared/utils/image';

const HEATMAP_COLORS = {
  none: '#3f3f46',
  low: 'rgb(215, 48, 39)',
  midLow: 'rgb(252, 141, 89)',
  mid: 'rgb(255, 255, 191)',
  midHigh: 'rgb(145, 207, 96)',
  high: 'rgb(26, 152, 80)',
} as const;

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

/** 전투 일자 (로컬) */
function formatMatchDateOnly(iso: string): string {
  const d = parseMatchDate(iso);
  if (d.getTime() === 0) return '—';
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** 전투 시각 (로컬) — 일자 아래 줄용 */
function formatMatchTimeOnly(iso: string): string {
  const d = parseMatchDate(iso);
  if (d.getTime() === 0) return '—';
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** 내 경기 카드: 30일 이내는 상대 시각, 이후는 일자+시각 */
function formatMatchWhenUnderResult(
  iso: string,
): { type: 'relative'; text: string } | { type: 'absolute'; date: string; time: string } {
  const d = parseMatchDate(iso);
  if (d.getTime() === 0) {
    return { type: 'absolute', date: '—', time: '' };
  }
  const diff = Date.now() - d.getTime();
  if (diff < 0) {
    return { type: 'absolute', date: formatMatchDateOnly(iso), time: formatMatchTimeOnly(iso) };
  }
  if (diff >= THIRTY_DAYS_MS) {
    return { type: 'absolute', date: formatMatchDateOnly(iso), time: formatMatchTimeOnly(iso) };
  }
  const minute = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (minute < 1) return { type: 'relative', text: '방금 전' };
  if (minute < 60) return { type: 'relative', text: `${minute}분 전` };
  if (hour < 24) return { type: 'relative', text: `${hour}시간 전` };
  return { type: 'relative', text: `${day}일 전` };
}

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

function winRateHeatColor(wins: number, total: number): string {
  if (total <= 0) return HEATMAP_COLORS.none;
  const r = (wins / total) * 100;
  if (r < 35) return HEATMAP_COLORS.low;
  if (r < 50) return HEATMAP_COLORS.midLow;
  if (r < 51) return HEATMAP_COLORS.mid;
  if (r < 60) return HEATMAP_COLORS.midHigh;
  return HEATMAP_COLORS.high;
}

type ChartMode = 'daily' | 'match';

export default function RtaPlayerOverviewClient({ wizardId }: { wizardId: string }) {
  const theme = useTheme();
  const { seasonCode, seasonId } = useRtaPlayerSeason();
  const { data: summary } = useRtaPlayerSummary(wizardId, undefined, seasonCode, { seasonId });
  const {
    data: infinite,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useRtaPlayerMatchesInfinite(wizardId, true, seasonCode, seasonId);

  const [chartOpen, setChartOpen] = useState(true);
  const [chartMode, setChartMode] = useState<ChartMode>('daily');

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

  const winCount = num(summary?.winCount ?? summary?.win_count);
  const matchCount = num(summary?.matchCount ?? summary?.match_count);
  const lossCount = Math.max(0, matchCount - winCount);
  const summaryScore = num(summary?.score);
  const maxSeasonScoreAgg = num(summary?.maxSeasonScore ?? summary?.max_season_score);
  const maxScoreDisplay =
    maxSeasonScoreAgg > 0 ? maxSeasonScoreAgg : summaryScore > 0 ? summaryScore : 0;

  const heatmapWeeks = useMemo(() => {
    const today = startOfLocalDay(new Date());
    const cells: { key: string; wins: number; total: number; dayNum: number }[] = [];
    for (let i = 41; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      cells.push({ key: ymdLocal(d), wins: 0, total: 0, dayNum: d.getDate() });
    }
    const map = new Map(cells.map((c) => [c.key, c]));
    for (const c of chronological) {
      const k = ymdLocal(startOfLocalDay(parseMatchDate(c.date)));
      const cell = map.get(k);
      if (!cell) continue;
      cell.total += 1;
      if (c.won) cell.wins += 1;
    }
    const rows: (typeof cells)[] = [];
    for (let r = 0; r < 6; r++) {
      rows.push(cells.slice(r * 7, r * 7 + 7));
    }
    return rows;
  }, [chronological]);

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

  const chartData = useMemo(() => {
    if (chartMode === 'match') {
      return chronological.map((c, i) => ({
        x: i + 1,
        label: `${i + 1}`,
        score: c.myScore,
        t: c.date,
      }));
    }
    const byDay = new Map<string, { last: number; date: string }>();
    for (const c of chronological) {
      const k = ymdLocal(startOfLocalDay(parseMatchDate(c.date)));
      const cur = byDay.get(k);
      if (!cur || parseMatchDate(c.date) >= parseMatchDate(cur.date)) {
        byDay.set(k, { last: c.myScore, date: c.date });
      }
    }
    const keys = [...byDay.keys()].sort();
    return keys.map((k, i) => ({
      x: i + 1,
      label: k.slice(5).replace('-', '/'),
      score: byDay.get(k)!.last,
      t: byDay.get(k)!.date,
    }));
  }, [chronological, chartMode]);

  const chartDomain = useMemo(() => {
    const scores = chartData.map((d) => d.score).filter((n) => Number.isFinite(n));
    if (scores.length === 0) return [0, 2000] as [number, number];
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const pad = Math.max(5, (max - min) * 0.12 || 1);
    return [Math.floor(min - pad), Math.ceil(max + pad)] as [number, number];
  }, [chartData]);

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
        gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 360px) 1fr' },
        alignItems: 'start',
      }}
    >
      {/* 왼쪽 열 */}
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
            <EmojiEventsIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>
              시즌 통계
            </Typography>
          </Stack>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                게임
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {winCount}승 - {lossCount}패
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                최고 점수
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {maxScoreDisplay > 0 ? Math.round(maxScoreDisplay).toLocaleString() : '—'}
              </Typography>
            </Stack>
          </Stack>
        </Card>

        <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <TimelineIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700}>
                최근 활동
              </Typography>
              <Tooltip title="날짜별 승률에 따라 색이 달라집니다. (로드된 경기 기준)">
                <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
              </Tooltip>
            </Stack>
          </Stack>
          <Stack direction="row" justifyContent="center" gap={2} flexWrap="wrap" sx={{ mb: 1.5 }}>
            {[
              { c: HEATMAP_COLORS.low, t: '<35%' },
              { c: HEATMAP_COLORS.midLow, t: '35-49%' },
              { c: HEATMAP_COLORS.mid, t: '50%' },
              { c: HEATMAP_COLORS.midHigh, t: '51-59%' },
              { c: HEATMAP_COLORS.high, t: '>60%' },
            ].map((x) => (
              <Stack key={x.t} alignItems="center" gap={0.25}>
                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: x.c }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                  {x.t}
                </Typography>
              </Stack>
            ))}
          </Stack>
          <Box sx={{ maxWidth: 220, mx: 'auto' }}>
            <Stack direction="row" justifyContent="space-around" sx={{ mb: 0.5 }}>
              {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
                <Typography key={d} variant="caption" color="text.secondary" sx={{ width: 28, textAlign: 'center', fontSize: 10 }}>
                  {d}
                </Typography>
              ))}
            </Stack>
            <Stack spacing={0.5}>
              {heatmapWeeks.map((row, ri) => (
                <Stack key={ri} direction="row" spacing={0.5} justifyContent="center">
                  {row.map((cell) => {
                    const rate = cell.total > 0 ? (cell.wins / cell.total) * 100 : null;
                    const bg = winRateHeatColor(cell.wins, cell.total);
                    return (
                      <Tooltip
                        key={cell.key}
                        title={`${cell.key} · ${cell.total ? `${cell.wins}/${cell.total}승` : '경기 없음'}`}
                      >
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: 0.5,
                            bgcolor: bg,
                            fontSize: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: cell.total ? 'common.white' : 'text.disabled',
                            cursor: 'default',
                          }}
                        >
                          {cell.dayNum}
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Stack>
              ))}
            </Stack>
          </Box>
          <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2">
              <Box component="span" fontWeight={700}>
                {loadedTotal}
              </Box>
              <Box component="span" color="text.secondary" sx={{ ml: 0.5 }}>
                games played
              </Box>
            </Typography>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
            <GpsFixedIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>
              자주 사용하는 몬스터
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
        </Card>
      </Stack>

      {/* 오른쪽 열 */}
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
            onClick={() => setChartOpen((v) => !v)}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              점수 추이
            </Typography>
            <IconButton size="small" aria-label="접기">
              <ExpandMoreIcon sx={{ transform: chartOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </IconButton>
          </Stack>
          <Collapse in={chartOpen}>
            <Box sx={{ px: 2, pb: 2 }}>
              <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                <ToggleButtonGroup size="small" value={chartMode} exclusive onChange={handleChartMode}>
                  <ToggleButton value="daily">일별</ToggleButton>
                  <ToggleButton value="match">경기별</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <Box sx={{ width: '100%', height: 220 }}>
                {chartData.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 6 }}>
                    차트 데이터가 없습니다.
                  </Typography>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rtaScoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={accent} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} opacity={0.5} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke={theme.palette.text.disabled} />
                      <YAxis domain={chartDomain} tick={{ fontSize: 10 }} stroke={theme.palette.text.disabled} width={44} />
                      <RechartsTooltip
                        formatter={(value) => {
                          const n = typeof value === 'number' ? value : Number(value);
                          return [
                            Number.isFinite(n) ? Math.round(n).toLocaleString() : '—',
                            '점수',
                          ];
                        }}
                        labelFormatter={(_, payload) => {
                          const p = payload?.[0]?.payload as { t?: string } | undefined;
                          return p?.t ? formatMatchDateTime(p.t) : '';
                        }}
                      />
                      <Area type="monotone" dataKey="score" stroke={accent} strokeWidth={2} fill="url(#rtaScoreGrad)" dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.disabled">
                  로드된 경기 기준
                </Typography>
                <Stack direction="row" gap={2}>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
                    <Typography variant="caption" color="text.secondary">
                      상승 구간
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main' }} />
                    <Typography variant="caption" color="text.secondary">
                      하락 구간
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          </Collapse>
        </Card>

        <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              내 경기
            </Typography>
            <Stack direction="row" alignItems="center" gap={2}>
              <Typography variant="body2" color="text.secondary">
                승률
              </Typography>
              <Typography variant="body2" fontWeight={800} color="success.main">
                {matchCount > 0 ? `${((winCount / matchCount) * 100).toFixed(1)}%` : '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                총
              </Typography>
              <Typography variant="body2" fontWeight={800}>
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
                  <MatchRow key={`${c.match.p1Id}-${c.match.p2Id}-${c.match.date}`} c={c} />
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
                {isFetchingNextPage
                  ? '불러오는 중…'
                  : `더 보기 (${loadedTotal}${totalFromSummary ? ` / ${totalFromSummary}` : ''})`}
              </Button>
            </Box>
          )}
        </Card>
      </Stack>
    </Box>
  );
}

function MatchRow({
  c,
}: {
  c: {
    match: MatchItem;
    p: NonNullable<ReturnType<typeof getMatchPerspective>>;
    won: boolean;
  };
}) {
  const { match, p, won } = c;
  const oppHref = `/rta/player/${encodeURIComponent(p.oppId)}`;
  const when = formatMatchWhenUnderResult(match.date);

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: won ? 'success.main' : 'error.main',
        bgcolor: won ? 'success.main' : 'error.main',
        opacity: 1,
        background: (t) =>
          won
            ? `linear-gradient(${t.palette.success.main}12, ${t.palette.success.main}08)`
            : `linear-gradient(${t.palette.error.main}12, ${t.palette.error.main}08)`,
        borderWidth: 1,
      }}
    >
      <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ p: 2, gap: 2 }}>
        <Stack
          sx={{
            minWidth: { lg: 100 },
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: { lg: 1 },
            borderColor: 'divider',
            pr: { lg: 2 },
          }}
        >
          <Typography fontWeight={900} color={won ? 'success.main' : 'error.main'}>
            {won ? '승리' : '패배'}
          </Typography>
          {when.type === 'relative' ? (
            <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ lineHeight: 1.35 }}>
              {when.text}
            </Typography>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ lineHeight: 1.35 }}>
                {when.date}
              </Typography>
              {when.time ? (
                <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ lineHeight: 1.35, fontSize: 11 }}>
                  {when.time}
                </Typography>
              ) : null}
            </>
          )}
        </Stack>

        <Stack flex={1} spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Avatar src={getSwexPlayerImageUrl(p.myChannelUid ?? p.myId)} sx={{ width: 32, height: 32 }} />
              <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 120 }}>
                {p.myName}
              </Typography>
              <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                {p.myRating > 0 ? (
                  <RtaRatingStarIcons rating={p.myRating} size={16} gap={1} />
                ) : (
                  <Typography variant="caption" color="text.disabled">
                    —
                  </Typography>
                )}
                <Typography variant="body2" fontWeight={700} color="text.primary" component="span">
                  {Math.round(p.myScore).toLocaleString()}
                </Typography>
              </Stack>
            </Stack>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography
                component={Link}
                href={oppHref}
                variant="body2"
                fontWeight={600}
                color="text.primary"
                sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {p.oppName}
              </Typography>
              <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                {p.oppRating > 0 ? (
                  <RtaRatingStarIcons rating={p.oppRating} size={16} gap={1} />
                ) : (
                  <Typography variant="caption" color="text.disabled">
                    —
                  </Typography>
                )}
                <Typography variant="body2" fontWeight={700} color="text.primary" component="span">
                  {Math.round(p.oppScore).toLocaleString()}
                </Typography>
              </Stack>
              <Avatar component={Link} href={oppHref} src={getSwexPlayerImageUrl(p.oppChannelUid ?? p.oppId)} sx={{ width: 32, height: 32 }} />
            </Stack>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            gap={{ xs: 0.5, md: 1 }}
            flexWrap="wrap"
            justifyContent="center"
            sx={{ width: '100%' }}
          >
            <UnitPickGrid units={p.myUnits} side="p1" />
            <Typography
              variant="h6"
              sx={{
                alignSelf: 'center',
                fontSize: { xs: '0.875rem', md: '1rem' },
                fontWeight: 700,
                color: 'primary.main',
                px: { xs: 0.5, md: 1 },
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              VS
            </Typography>
            <UnitPickGrid units={p.oppUnits} side="p2" />
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}

/** /rta 매치 목록과 동일: 픽 순서(인덱스)에 맞춘 3×2 그리드 — P1 왼쪽·P2 오른쪽 레이아웃 */
function UnitPickGrid({
  units,
  side,
}: {
  units: { image: string; name: string; banned?: boolean; leader?: boolean }[];
  side: 'p1' | 'p2';
}) {
  const isP1 = side === 'p1';
  const gridTemplateAreas = isP1
    ? `"fp-0 fp-1 fp-3" "fp-0 fp-2 fp-4"`
    : `"fp-1 fp-3 fp-5" "fp-2 fp-4 fp-5"`;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: { xs: 0.25, md: 0.5 },
        width: 'fit-content',
        maxWidth: '100%',
        ...(isP1 ? {} : { ml: { sm: 'auto' } }),
        gridTemplateAreas,
      }}
    >
      {units.slice(0, 5).map((unit, unitIndex) => {
        let gridArea = '';
        if (isP1) {
          if (unitIndex === 0) gridArea = 'fp-0';
          else if (unitIndex === 1) gridArea = 'fp-1';
          else if (unitIndex === 2) gridArea = 'fp-2';
          else if (unitIndex === 3) gridArea = 'fp-3';
          else if (unitIndex === 4) gridArea = 'fp-4';
        } else {
          if (unitIndex === 0) gridArea = 'fp-1';
          else if (unitIndex === 1) gridArea = 'fp-2';
          else if (unitIndex === 2) gridArea = 'fp-3';
          else if (unitIndex === 3) gridArea = 'fp-4';
          else if (unitIndex === 4) gridArea = 'fp-5';
        }
        const alignSelf = isP1
          ? unitIndex === 0
            ? 'center'
            : 'stretch'
          : units && unitIndex === units.length - 1
            ? 'center'
            : 'stretch';

        return (
          <Box
            key={unitIndex}
            sx={{
              position: 'relative',
              p: 0.25,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gridArea,
              alignSelf,
            }}
          >
            <Avatar
              src={getMonsterImageUrl(unit.image)}
              alt={unit.name}
              sx={{
                width: { xs: 32, md: 36 },
                height: { xs: 32, md: 36 },
                border: unit.leader ? '2px solid gold' : '2px solid #d4a574',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                position: 'relative',
              }}
            />
            {unit.banned && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: '50%',
                  backgroundImage:
                    'linear-gradient(to bottom right, transparent 48%, #fff 48%, #fff 52%, transparent 52%)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            )}
            {unit.leader && (
              <Box
                sx={{
                  position: 'absolute',
                  left: -2,
                  bottom: -2,
                  width: { xs: 12, md: 14 },
                  height: { xs: 12, md: 14 },
                  backgroundColor: '#d32f2f',
                  clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 2px 1px rgba(255, 255, 255, 0.8)',
                }}
              >
                <Typography
                  sx={{
                    color: '#fff',
                    fontSize: { xs: '7px', md: '9px' },
                    fontWeight: 'bold',
                    lineHeight: 1,
                    textShadow: '0 0 1px rgba(255, 255, 255, 0.8)',
                  }}
                >
                  L
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
      {(!units || units.length === 0) && (
        <Box sx={{ gridColumn: '1 / -1', py: 0.5, textAlign: isP1 ? 'left' : 'right' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
            몬스터 정보가 없습니다
          </Typography>
        </Box>
      )}
    </Box>
  );
}
