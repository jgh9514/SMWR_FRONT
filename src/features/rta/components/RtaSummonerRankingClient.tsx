'use client';

import { useMemo, useState } from 'react';
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
import { useRtaDashboard, useRtaSummonerRanking } from '@/features/rta/hooks/useRtaData';
import { getRtaTierShortLabel, getRatingColor } from '@/shared/utils';
import { getMonsterImageUrl, getSwexPlayerImageUrl } from '@/shared/utils/image';
import type { RtaRankCutoffAnchorRow, RtaSummonerRankingRow, RtaTierDailyRow } from '@/features/rta/types/rta';

const PAGE_SIZE = 50;
const DIST_SAMPLE = 500;

/** 컷 카드·차트 표시 순서 (낮은 티어 → 높은 티어) */
const CUT_TIER_ORDER = ['G3', 'G2', 'G1', 'P3', 'P2', 'P1'] as const;

const ANCHOR_CHART_KEYS = ['3h', '6h', '12h', '3d', '7d'] as const;

const TIER_COLOR_P = 'rgb(7, 186, 173)';
const TIER_COLOR_G = 'rgb(155, 89, 182)';

function tierAccent(tierKey: string): string {
  return tierKey.startsWith('P') ? TIER_COLOR_P : TIER_COLOR_G;
}

function tierStarCount(tierKey: string): number {
  const last = tierKey.slice(-1);
  const n = parseInt(last, 10);
  return Number.isFinite(n) && n >= 1 && n <= 3 ? n : 2;
}

function tierStarIconSrc(tierKey: string): string {
  if (tierKey.startsWith('Ch')) return '/icons/challenger_star.png';
  if (tierKey.startsWith('F')) return '/icons/fighter_star.png';
  if (tierKey.startsWith('C')) return '/icons/conqueror_star.png';
  if (tierKey.startsWith('P')) return '/icons/punisher_star.png';
  if (tierKey.startsWith('G')) return '/icons/guardian_star.png';
  return '/icons/challenger_star.png';
}

function TierStars({ tierKey }: { tierKey: string }) {
  const n = tierStarCount(tierKey);
  const src = tierStarIconSrc(tierKey);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
      {Array.from({ length: n }).map((_, i) => (
        <Image key={i} src={src} alt="" width={14} height={14} unoptimized style={{ display: 'block' }} />
      ))}
    </Box>
  );
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pivotAnchors(rows: RtaRankCutoffAnchorRow[] | undefined): Map<string, Record<string, number>> {
  const byAnchor = new Map<string, Record<string, number>>();
  for (const row of rows ?? []) {
    const ak = String(row.anchor_key ?? '').trim();
    if (!ak) continue;
    const tk = row.tier_key;
    if (!(CUT_TIER_ORDER as readonly string[]).includes(tk)) continue;
    if (!byAnchor.has(ak)) byAnchor.set(ak, {});
    const rec = byAnchor.get(ak)!;
    rec[tk] = toNum(row.cutoff_score);
  }
  return byAnchor;
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

function buildCutChartRows(byAnchor: Map<string, Record<string, number>>) {
  return ANCHOR_CHART_KEYS.map((ak) => {
    const rec = byAnchor.get(ak) ?? {};
    const row: Record<string, string | number | null> = { anchor: ak };
    for (const tk of CUT_TIER_ORDER) {
      const v = rec[tk];
      row[tk] = v != null && v > 0 ? v : null;
    }
    return row;
  });
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

const SEASON_OPTIONS = [{ value: 's36', label: '시즌 36 (SL)' }];

export default function RtaSummonerRankingClient() {
  const theme = useTheme();
  const [page, setPage] = useState(1);
  const [season, setSeason] = useState(SEASON_OPTIONS[0].value);
  const offset = (page - 1) * PAGE_SIZE;

  const { data, isLoading, error } = useRtaSummonerRanking(PAGE_SIZE, offset);
  const { data: distData } = useRtaSummonerRanking(DIST_SAMPLE, 0);
  const { data: dashData, isLoading: dashLoading } = useRtaDashboard();

  const total = toNum(data?.total);
  const rankings = data?.rankings ?? [];
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const anchorRows = dashData?.rank_cutoff_anchors;
  const dailyTiers = dashData?.daily_tiers;
  const maxDate = dashData?.date_range?.max_date;

  const { byAnchor, cutCards, chartRows, updatedLabel } = useMemo(() => {
    const byAnchor = pivotAnchors(anchorRows);
    const latest = byAnchor.get('3h') ?? {};
    const prev = byAnchor.get('3d') ?? {};
    const tierCounts = latestDayTierCounts(dailyTiers);

    const cutCards = CUT_TIER_ORDER.map((tk) => {
      const score = latest[tk];
      const before = prev[tk];
      let delta: number | null = null;
      if (score > 0 && before > 0) {
        delta = score - before;
      }
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

  const countryChips = useMemo(
    () => countrySharesFromRankings(distData?.rankings ?? []),
    [distData?.rankings],
  );

  const hasCutData = CUT_TIER_ORDER.some((tk) => (byAnchor.get('3h')?.[tk] ?? 0) > 0);

  const rows = useMemo(() => {
    return rankings.map((row: RtaSummonerRankingRow) => ({
      rank: toNum(row.rank_position),
      wizardId: row.wizard_id != null ? String(row.wizard_id) : '',
      channelUid:
        row.channel_uid != null && String(row.channel_uid).trim() !== ''
          ? String(row.channel_uid)
          : undefined,
      name: row.wizard_name?.trim() || '—',
      country: row.country?.trim() || '',
      score: toNum(row.score),
      rating: row.rating_id != null ? toNum(row.rating_id) : null,
      winCount: toNum(row.win_count),
      matchCount: toNum(row.match_count),
      mostRow: row,
    }));
  }, [rankings]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <PageHeader title="RTA 소환사 랭킹" backPath="/rta" />

      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640, lineHeight: 1.6 }}>
          이번 시즌 상위권 소환사들의 <strong>모스트 몬스터</strong>와 티어 컷 추이를 확인해 보세요. 시즌 선택은 추후 DB
          연동 예정입니다.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mt: 2.5 }}
        >
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="rta-season-label">시즌</InputLabel>
            <Select
              labelId="rta-season-label"
              label="시즌"
              value={season}
              onChange={(e) => setSeason(String(e.target.value))}
            >
              {SEASON_OPTIONS.map((o) => (
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
              {countryChips.length === 0 && !distData ? (
                <Typography variant="caption" color="text.disabled">
                  불러오는 중…
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
              G3 ~ P1 · 점수는 티어 내 최저점 추정
            </Typography>
          </Box>

          {!hasCutData ? (
            <Typography variant="body2" color="text.secondary">
              리플레이·점수가 쌓이면 G3~P1 구간 컷과 추이가 표시됩니다.
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
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                  gap: 1.25,
                }}
              >
                {cutCards.map((c) => (
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
                      {c.score > 0 ? Math.round(c.score).toLocaleString() : '—'}
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
                ))}
              </Box>

              <Box sx={{ minHeight: 260 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  앵커별 컷 추이 (3h → 7d)
                </Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartRows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="anchor" tick={{ fontSize: 11 }} stroke={theme.palette.text.secondary} />
                    <YAxis
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

      <Card
        elevation={0}
        sx={{
          mb: 2,
          p: { xs: 2, md: 2.5 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          집계 방식
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720, lineHeight: 1.6, fontSize: '0.8rem' }}>
          수집된 <strong>실레나 리플레이</strong>만을 대상으로, 소환사마다 <strong>가장 최근 경기</strong> 점수로 순위를 매깁니다.
          모스트 몬스터는 벤 제외 필드 출전 기준입니다.
        </Typography>
      </Card>

      {isLoading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error.message || '불러오기에 실패했습니다.'}</Typography>
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
