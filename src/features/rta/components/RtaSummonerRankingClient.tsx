'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Box,
  Card,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
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
import type { TooltipValueType } from 'recharts';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';
import { useRtaDashboard, useRtaSeasons, useRtaSummonerRanking } from '@/features/rta/hooks/useRtaData';
import {
  getRtaTierKeyStarIconPath,
  getRtaTierShortLabel,
  getRatingColor,
  RTA_LEGEND_STAR_WIDTH_RATIO,
} from '@/shared/utils';
import { getMonsterImageUrl, getSwexPlayerImageUrl } from '@/shared/utils/image';
import type { RtaRankCutoffAnchorRow, RtaSummonerRankingRow, RtaTierDailyRow } from '@/features/rta/types/rta';
import { formatRtaCutoffScore, isRtaCutoffMissing } from '@/features/rta/utils/rtaCutoffScore';
import {
  ANCHOR_CHART_LABELS,
  buildCutChartRows,
  computeCutChartYDomain,
  CUT_TIER_ORDER,
  pivotRankCutoffAnchors,
} from '@/features/rta/utils/rtaRankCutoffChart';

const PAGE_SIZE = 50;
/** WAS `RtaServiceImpl.RTA_SUMMONER_RANKING_MAX_ROWS`와 동일 — 노출·분포 샘플 상한 */
const SUMMONER_RANKING_MAX = 500;
const DIST_SAMPLE = SUMMONER_RANKING_MAX;

/** 티어 컷 카드 그리드만: 윗줄 G → 아랫줄 P (2행×3열) */
const CUT_TIER_CARD_GRID_ORDER = ['G1', 'G2', 'G3', 'P1', 'P2', 'P3'] as const;

/** P(플래): 옥색(청록) — 차트·카드 라벨 공통 */
const TIER_COLOR_P = '#00897b';
/** G(골드): 빨강 */
const TIER_COLOR_G = '#e53935';
const TIER_COLOR_L = '#ffc107';

function tierAccent(tierKey: string): string {
  if (tierKey.startsWith('L')) return TIER_COLOR_L;
  if (tierKey.startsWith('G')) return TIER_COLOR_G;
  if (tierKey.startsWith('P')) return TIER_COLOR_P;
  return '#999';
}

function tierStarCount(tierKey: string): number {
  const last = tierKey.slice(-1);
  const n = parseInt(last, 10);
  return Number.isFinite(n) && n >= 1 && n <= 3 ? n : 2;
}

const TIER_STAR_PX = 14;
const TIER_STAR_GAP_PX = 2;
const TIER_STAR_TRIPLE_WIDTH = 3 * TIER_STAR_PX + 2 * TIER_STAR_GAP_PX;

function TierStars({ tierKey }: { tierKey: string }) {
  const src = getRtaTierKeyStarIconPath(tierKey);
  if (tierKey === 'L1') {
    const legendW = TIER_STAR_PX * RTA_LEGEND_STAR_WIDTH_RATIO;
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: TIER_STAR_TRIPLE_WIDTH,
          minWidth: TIER_STAR_TRIPLE_WIDTH,
        }}
      >
        <Image
          src={src}
          alt=""
          width={legendW}
          height={TIER_STAR_PX}
          unoptimized
          style={{
            display: 'block',
            width: legendW,
            height: TIER_STAR_PX,
            maxWidth: '100%',
            objectFit: 'contain',
          }}
        />
      </Box>
    );
  }
  const n = tierStarCount(tierKey);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
      {Array.from({ length: n }).map((_, i) => (
        <Image key={i} src={src} alt="" width={TIER_STAR_PX} height={TIER_STAR_PX} unoptimized style={{ display: 'block' }} />
      ))}
    </Box>
  );
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** MyBatis mapUnderscoreToCamelCase → API JSON 키가 camelCase일 수 있음 */
function pickRow<T>(row: unknown, snake: string, camel: string): T | undefined {
  if (row == null || typeof row !== 'object') return undefined;
  const r = row as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(r, snake)) return r[snake] as T;
  if (Object.prototype.hasOwnProperty.call(r, camel)) return r[camel] as T;
  return undefined;
}

/** 3h vs 3d 대비 점수차. 한쪽이라도 추정 불가(0·과거 1000)면 Δ 없음. */
function cutDelta3hVs3d(score3h: number, score3d: number): number | null {
  if (isRtaCutoffMissing(score3h) || isRtaCutoffMissing(score3d)) return null;
  return score3h - score3d;
}

function latestDayTierCounts(daily: RtaTierDailyRow[] | undefined): Record<string, number> {
  if (!daily?.length) return {};
  let maxD = '';
  for (const r of daily) {
    const d = String(r.bucket_date ?? '').slice(0, 10);
    if (d && d > maxD) maxD = d;
  }
  if (!maxD) return {};
  const out: Record<string, number> = {};
  for (const r of daily) {
    const d = String(r.bucket_date ?? '').slice(0, 10);
    if (d !== maxD) continue;
    const k = r.tier_key;
    if (!k) continue;
    out[k] = (out[k] ?? 0) + toNum(r.player_count);
  }
  return out;
}

function countrySharesFromRankings(rows: RtaSummonerRankingRow[]): { code: string; pct: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const c = (r.country ?? '').trim() || '—';
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const total = rows.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, n]) => ({ code, pct: (100 * n) / total }));
}

function WinRateBar({ wins, total }: { wins: number; total: number }) {
  if (total <= 0) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
        —
      </Typography>
    );
  }
  const losses = Math.max(0, total - wins);
  const pct = (wins / total) * 100;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flexWrap: 'nowrap' }}>
      <Box
        sx={{
          flex: 1,
          minWidth: 72,
          maxWidth: 140,
          height: 10,
          borderRadius: 1,
          overflow: 'hidden',
          display: 'flex',
          bgcolor: 'action.hover',
        }}
      >
        <Box sx={{ flex: wins, bgcolor: 'success.main', minWidth: wins > 0 ? 2 : 0 }} />
        <Box sx={{ flex: losses, bgcolor: 'error.dark', minWidth: losses > 0 ? 2 : 0 }} />
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontSize: '0.75rem',
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: pct >= 50 ? 'success.main' : 'error.light',
          flexShrink: 0,
        }}
      >
        {pct.toFixed(1)}%
      </Typography>
    </Box>
  );
}

/** MyBatis map + JSON에서 스네이크/카멜 혼용 가능 */
function pickMostMonsterSlot(row: RtaSummonerRankingRow, slot: 1 | 2 | 3) {
  const r = row as unknown as Record<string, unknown>;
  const idKeys = [`most_monster_${slot}_id`, `mostMonster${slot}Id`] as const;
  const nameKeys = [`most_monster_${slot}_name`, `mostMonster${slot}Name`] as const;
  const imageKeys = [`most_monster_${slot}_image`, `mostMonster${slot}Image`] as const;
  const pickKeys = [`most_monster_${slot}_pick_count`, `mostMonster${slot}PickCount`] as const;

  let id = '';
  for (const k of idKeys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') {
      id = String(v);
      break;
    }
  }
  let name = '';
  for (const k of nameKeys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') {
      name = String(v);
      break;
    }
  }
  let image = '';
  for (const k of imageKeys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') {
      image = String(v);
      break;
    }
  }
  let pickCount = 0;
  for (const k of pickKeys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') {
      pickCount = toNum(v);
      break;
    }
  }
  return { id, name: name.trim() || '—', image, pickCount };
}

function MostMonstersCell({ row }: { row: RtaSummonerRankingRow }) {
  const slots = [1, 2, 3] as const;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
      {slots.map((slot) => {
        const m = pickMostMonsterSlot(row, slot);
        const title =
          m.id && m.pickCount > 0
            ? `${m.name} · 필드 ${m.pickCount}회`
            : m.id
              ? m.name
              : '';
        if (!m.id) {
          return (
            <Box
              key={slot}
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                —
              </Typography>
            </Box>
          );
        }
        const imgSrc = m.image ? getMonsterImageUrl(m.image) : getMonsterImageUrl('/images/default-monster.png');
        const href = `/rta/monster-stats/${encodeURIComponent(m.id)}`;
        const img = (
          <Box
            component="img"
            src={imgSrc}
            alt=""
            title={title}
            loading="lazy"
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              objectFit: 'cover',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
              display: 'block',
              flexShrink: 0,
            }}
          />
        );
        return (
          <Link
            key={slot}
            href={href}
            prefetch={false}
            title={title}
            style={{ textDecoration: 'none', lineHeight: 0 }}
          >
            {img}
          </Link>
        );
      })}
    </Box>
  );
}

const SEASON_FALLBACK = [{ value: 's36-sl', label: '시즌 36 스페셜 리그' }];

export default function RtaSummonerRankingClient() {
  const theme = useTheme();
  const [page, setPage] = useState(1);
  const { data: seasonsData } = useRtaSeasons();
  const seasonOptions = useMemo(() => {
    const rows = seasonsData?.seasons;
    if (!rows?.length) return SEASON_FALLBACK;
    return rows.map((r) => ({ value: r.seasonCode, label: r.seasonName }));
  }, [seasonsData]);

  const resolvedDefaultSeason = useMemo(() => {
    const def = seasonsData?.defaultSeasonCode;
    const rows = seasonsData?.seasons;
    if (def && rows?.some((r) => r.seasonCode === def)) return def;
    return rows?.[0]?.seasonCode ?? SEASON_FALLBACK[0].value;
  }, [seasonsData]);

  const [season, setSeason] = useState<string | null>(null);
  useEffect(() => {
    if (seasonOptions.length === 0) return;
    setSeason((prev) => {
      if (prev !== null && seasonOptions.some((o) => o.value === prev)) return prev;
      return resolvedDefaultSeason;
    });
  }, [seasonOptions, resolvedDefaultSeason]);

  const seasonSelectValue = season ?? resolvedDefaultSeason;
  const offset = (page - 1) * PAGE_SIZE;
  const isFirstPage = page === 1;

  /** 1페이지: 상위 500건 한 번만 요청해 테이블(50)·국가 분포에 공유 — 예전 50+500 이중 호출 제거 */
  const { data: pageData, isLoading: loadingPage, error: errPage } = useRtaSummonerRanking(
    isFirstPage ? DIST_SAMPLE : PAGE_SIZE,
    isFirstPage ? 0 : offset,
    seasonSelectValue,
  );
  const { data: distOnlyData, isError: distSampleError } = useRtaSummonerRanking(DIST_SAMPLE, 0, seasonSelectValue, {
    enabled: !isFirstPage,
  });
  const { data: dashData, isLoading: dashLoading } = useRtaDashboard(seasonSelectValue);

  const total = toNum(pageData?.total);
  const rankings = isFirstPage
    ? (pageData?.rankings ?? []).slice(0, PAGE_SIZE)
    : (pageData?.rankings ?? []);
  const rankingsForCountry = isFirstPage ? (pageData?.rankings ?? []) : (distOnlyData?.rankings ?? []);
  const countrySampleLoading = isFirstPage
    ? loadingPage && !pageData
    : !isFirstPage && !distOnlyData && !distSampleError;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const anchorRows = dashData?.rank_cutoff_anchors;
  const dailyTiers = dashData?.daily_tiers;
  const maxDate = dashData?.date_range?.max_date;

  const { byAnchor, cutCards, chartRows, updatedLabel } = useMemo(() => {
    const byAnchor = pivotRankCutoffAnchors(anchorRows);
    const latest = byAnchor.get('3h') ?? {};
    const prev = byAnchor.get('3d') ?? {};
    const tierCounts = latestDayTierCounts(dailyTiers);

    const cutCards = CUT_TIER_ORDER.map((tk) => {
      const score = toNum(latest[tk]);
      const before = toNum(prev[tk]);
      const delta = cutDelta3hVs3d(score, before);
      return {
        tierKey: tk,
        score,
        delta,
        summoners: tierCounts[tk] ?? 0,
      };
    });

    const chartRows = buildCutChartRows(byAnchor);

    const updatedLabel =
      typeof maxDate === 'string' && maxDate.length >= 10
        ? `${maxDate.slice(0, 10)} 기준 티어 분포 · 컷은 앵커 스냅샷`
        : '데이터 수집 범위 내';

    return { byAnchor, cutCards, chartRows, updatedLabel };
  }, [anchorRows, dailyTiers, maxDate]);

  const cutChartYDomain = useMemo(() => computeCutChartYDomain(chartRows), [chartRows]);

  const countryChips = useMemo(
    () => countrySharesFromRankings(rankingsForCountry),
    [rankingsForCountry],
  );

  const hasCutData = CUT_TIER_ORDER.some((tk) => !isRtaCutoffMissing(byAnchor.get('3h')?.[tk]));

  const rows = useMemo(() => {
    return rankings.map((row: RtaSummonerRankingRow) => {
      const rankRaw = pickRow<unknown>(row, 'rank_position', 'rankPosition');
      const wid = pickRow<string | number>(row, 'wizard_id', 'wizardId');
      const cuid = pickRow<string | number>(row, 'channel_uid', 'channelUid');
      const wname = pickRow<string>(row, 'wizard_name', 'wizardName');
      const rid = pickRow<unknown>(row, 'rating_id', 'ratingId');
      const winc = pickRow<unknown>(row, 'win_count', 'winCount');
      const mcnt = pickRow<unknown>(row, 'match_count', 'matchCount');

      return {
        rank: toNum(rankRaw),
        wizardId: wid != null && String(wid).trim() !== '' ? String(wid) : '',
        channelUid:
          cuid != null && String(cuid).trim() !== '' ? String(cuid) : undefined,
        name: (typeof wname === 'string' ? wname.trim() : '') || '—',
        country: (typeof row.country === 'string' ? row.country.trim() : '') || '',
        score: toNum(row.score),
        rating: rid != null && rid !== '' ? toNum(rid) : null,
        winCount: toNum(winc),
        matchCount: toNum(mcnt),
        mostRow: row,
      };
    });
  }, [rankings]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <PageHeader title="RTA 소환사 랭킹" backPath="/rta" />

      <Box sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="rta-season-label">시즌</InputLabel>
            <Select
              labelId="rta-season-label"
              label="시즌"
              value={seasonSelectValue}
              onChange={(e) => setSeason(String(e.target.value))}
            >
              {seasonOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              국가 비율 (상위 {DIST_SAMPLE}명 샘플)
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
              {countryChips.length === 0 && countrySampleLoading ? (
                <Typography variant="caption" color="text.disabled">
                  불러오는 중…
                </Typography>
              ) : countryChips.length === 0 && !isFirstPage && distSampleError ? (
                <Typography variant="caption" color="text.disabled">
                  국가 분포를 불러오지 못했습니다.
                </Typography>
              ) : countryChips.length === 0 ? (
                <Typography variant="caption" color="text.disabled">
                  국가 코드가 없는 데이터입니다.
                </Typography>
              ) : (
                countryChips.map(({ code, pct }) => (
                  <Paper
                    key={code}
                    variant="outlined"
                    sx={{
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                    }}
                  >
                    {code !== '—' && code.length === 2 ? (
                      <Box
                        component="img"
                        src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
                        alt=""
                        sx={{ width: 18, height: 12, objectFit: 'cover', borderRadius: 0.25 }}
                      />
                    ) : (
                      <Box sx={{ width: 18, height: 12, borderRadius: 0.25, bgcolor: 'action.selected' }} />
                    )}
                    <Typography variant="caption" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {code} {pct.toFixed(0)}%
                    </Typography>
                  </Paper>
                ))
              )}
            </Stack>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 2, opacity: 0.75 }}>
          <AccessTimeIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption" color="text.secondary">
            {updatedLabel}
          </Typography>
        </Stack>
      </Box>

      {dashLoading && !dashData ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Card
          elevation={0}
          sx={{
            mb: 3,
            p: { xs: 2, sm: 2.5 },
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TrendingUpIcon sx={{ color: 'primary.main', fontSize: 22 }} />
            <Typography fontWeight={700}>티어 컷 라인</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              P1 ~ G3 · 점수는 티어 내 최저점 추정
            </Typography>
          </Box>

          {!hasCutData ? (
            <Typography variant="body2" color="text.secondary">
              리플레이·점수가 쌓이면 P1~G3 구간 컷과 추이가 표시됩니다.
            </Typography>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                gap: 2.5,
                alignItems: 'stretch',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gridTemplateRows: 'repeat(2, auto)',
                  gap: 1.25,
                }}
              >
                {CUT_TIER_CARD_GRID_ORDER.map((tk) => {
                  const c = cutCards.find((x) => x.tierKey === tk);
                  if (!c) return null;
                  return (
                  <Paper
                    key={c.tierKey}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <TierStars tierKey={c.tierKey} />
                        <Typography
                          sx={{ fontSize: '0.8rem', fontWeight: 900, color: tierAccent(c.tierKey) }}
                        >
                          {c.tierKey}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '1.15rem',
                        fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums',
                        color: tierAccent(c.tierKey),
                      }}
                    >
                      {formatRtaCutoffScore(c.score)}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 1,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        3일 전 대비(3h−3d)
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={800}
                        sx={{
                          fontVariantNumeric: 'tabular-nums',
                          color:
                            c.delta == null ? 'text.disabled' : c.delta >= 0 ? 'success.light' : 'error.light',
                        }}
                      >
                        {c.delta == null ? '—' : `${c.delta >= 0 ? '+' : ''}${Math.round(c.delta)}`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="caption" color="text.secondary">
                        소환사 수
                      </Typography>
                      <Typography variant="caption" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {c.summoners > 0 ? c.summoners.toLocaleString() : '—'}
                      </Typography>
                    </Box>
                  </Paper>
                  );
                })}
              </Box>

              <Box sx={{ minHeight: 260 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  앵커별 컷 추이 (7d → 3h, 과거 → 현재)
                </Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartRows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis
                      dataKey="anchor"
                      tick={{ fontSize: 11 }}
                      stroke={theme.palette.text.secondary}
                      tickFormatter={(v) =>
                        typeof v === 'string' ? ANCHOR_CHART_LABELS[v] ?? String(v) : String(v)
                      }
                    />
                    <YAxis
                      domain={cutChartYDomain ?? ['auto', 'auto']}
                      tick={{ fontSize: 11 }}
                      stroke={theme.palette.text.secondary}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                    />
                    <Tooltip
                      formatter={(value: TooltipValueType | undefined) => {
                        if (value == null) return '—';
                        if (Array.isArray(value)) {
                          return value
                            .map((v) => (v === '' ? '—' : Math.round(Number(v)).toLocaleString()))
                            .join(', ');
                        }
                        if (value === '') return '—';
                        return Math.round(Number(value)).toLocaleString();
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {CUT_TIER_ORDER.map((tk) => (
                      <Line
                        key={tk}
                        type="monotone"
                        dataKey={tk}
                        name={tk}
                        stroke={tierAccent(tk)}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          )}
        </Card>
      )}

      {loadingPage && !pageData ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : errPage ? (
        <Typography color="error">{errPage.message || '불러오기에 실패했습니다.'}</Typography>
      ) : (
        <>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ borderRadius: 2, mb: 2, overflowX: 'auto' }}
          >
            <Table size="small" sx={{ minWidth: 720, tableLayout: 'fixed', width: '100%' }} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell width="7%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    순위
                  </TableCell>
                  <TableCell width="26%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    소환사명
                  </TableCell>
                  <TableCell width="8%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    지역
                  </TableCell>
                  <TableCell width="18%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    티어
                  </TableCell>
                  <TableCell width="20%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    승률
                  </TableCell>
                  <TableCell width="21%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    모스트 몬스터
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                        표시할 랭킹 데이터가 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const profileHref =
                      r.wizardId !== '' ? `/rta/player/${encodeURIComponent(r.wizardId)}` : null;
                    const tierLabel = r.rating != null ? getRtaTierShortLabel(r.rating) : '—';
                    return (
                      <TableRow key={r.wizardId || `${r.rank}-${r.name}`} hover>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontVariantNumeric: 'tabular-nums',
                            verticalAlign: 'middle',
                            py: 1.25,
                          }}
                        >
                          {r.rank}
                        </TableCell>
                        <TableCell
                          sx={{
                            verticalAlign: 'middle',
                            overflow: 'hidden',
                            py: 1.25,
                          }}
                          title={r.wizardId ? `${r.name} (${r.wizardId})` : r.name}
                        >
                          {profileHref ? (
                            <Link
                              href={profileHref}
                              prefetch={false}
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                                <Box
                                  component="img"
                                  src={getSwexPlayerImageUrl(r.channelUid || r.wizardId)}
                                  alt=""
                                  loading="lazy"
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'action.hover',
                                  }}
                                />
                                <Typography variant="body2" fontWeight={700} noWrap sx={{ minWidth: 0 }}>
                                  {r.name}
                                </Typography>
                              </Box>
                            </Link>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                              <Box
                                component="img"
                                src={getSwexPlayerImageUrl(r.channelUid || r.wizardId)}
                                alt=""
                                loading="lazy"
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  flexShrink: 0,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  bgcolor: 'action.hover',
                                }}
                              />
                              <Typography variant="body2" fontWeight={700} noWrap>
                                {r.name}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle', py: 1.25 }}>
                          {r.country ? (
                            <Box
                              component="img"
                              src={`https://flagcdn.com/w40/${r.country.toLowerCase()}.png`}
                              alt={r.country}
                              sx={{ width: 24, height: 16, objectFit: 'cover', borderRadius: 0.5 }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle', py: 1.25 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                              <Typography
                                component="span"
                                sx={{
                                  fontWeight: 900,
                                  fontSize: '0.8rem',
                                  color: r.rating != null ? getRatingColor(r.rating) : 'text.secondary',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {tierLabel}
                              </Typography>
                              {r.rating != null ? <RtaRatingStarIcons rating={r.rating} size={13} gap={1} /> : null}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.25 }}>
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'text.primary' }}
                              >
                                {r.score.toLocaleString()}
                              </Typography>
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: '0.65rem' }}
                              >
                                점
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle', py: 1.25 }}>
                          <WinRateBar wins={r.winCount} total={r.matchCount} />
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle', py: 1.25 }}>
                          <MostMonstersCell row={r.mostRow} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {total > PAGE_SIZE ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                size="small"
                showFirstButton
                showLastButton
              />
            </Box>
          ) : null}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            총 {total.toLocaleString()}명 · 페이지당 {PAGE_SIZE}명
          </Typography>
        </>
      )}
    </Container>
  );
}
