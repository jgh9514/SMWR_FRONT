'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Box,
  Card,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
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
import { getRtaTierKeyStarIconPath, RTA_LEGEND_STAR_WIDTH_RATIO } from '@/shared/utils';
import type { RtaRankCutoffAnchorRow } from '@/features/rta/types/rta';
import { formatRtaCutoffScore, isRtaCutoffMissing } from '@/features/rta/utils/rtaCutoffScore';
import {
  ANCHOR_CHART_LABELS,
  buildCutChartRows,
  computeCutChartYDomain,
  CUT_TIER_ORDER,
  pivotRankCutoffAnchors,
} from '@/features/rta/utils/rtaRankCutoffChart';

/** 상단 카드만: 윗줄 G → 아랫줄 P (2행×3열) */
const CUT_KEYS_CARD_GRID = ['G1', 'G2', 'G3', 'P1', 'P2', 'P3'] as const;

/** 표시 순서·라벨 (서버 anchor_key 와 동일) */
const ANCHOR_ROWS: { key: string; label: string }[] = [
  { key: '3h', label: '3시간 전' },
  { key: '6h', label: '6시간 전' },
  { key: '12h', label: '12시간 전' },
  { key: '3d', label: '3일 전' },
  { key: '7d', label: '7일 전' },
];

const TIER_COLOR_P = '#00897b';
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

const TIER_STAR_PX = 12;
/** gap 0.25 ≈ 2px — 별 3개 행과 동일한 총너비 */
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

function TierHeaderCell({ tierKey }: { tierKey: string }) {
  return (
    <TableCell align="center" sx={{ px: 1, py: 1.5, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
        <TierStars tierKey={tierKey} />
        <Typography sx={{ fontSize: '10px', fontWeight: 800, color: tierAccent(tierKey) }}>{tierKey}</Typography>
      </Box>
    </TableCell>
  );
}

export interface RtaRankCutoffsSectionProps {
  rankCutoffAnchors: RtaRankCutoffAnchorRow[] | undefined;
  /** `/rta/rank-cutoffs` 전용: 앵커별 컷 추이 라인 차트 표시 */
  showTrendChart?: boolean;
}

export default function RtaRankCutoffsSection({
  rankCutoffAnchors,
  showTrendChart = false,
}: RtaRankCutoffsSectionProps) {
  const theme = useTheme();

  const { latest, tableRows, summaryLabel, chartRows, cutChartYDomain, hasCutChartData } = useMemo(() => {
    const rows = rankCutoffAnchors ?? [];
    const byAnchor = pivotRankCutoffAnchors(rows);

    const firstKey = ANCHOR_ROWS[0]?.key;
    const latest: Record<string, number> = {};
    if (firstKey) {
      const rec = byAnchor.get(firstKey) ?? {};
      for (const k of CUT_TIER_ORDER) {
        latest[k] = rec[k] ?? 0;
      }
    }

    const tableRows: {
      anchorKey: string;
      label: string;
      scores: Record<string, number>;
      deltas: Record<string, number | null>;
    }[] = [];

    for (let i = 0; i < ANCHOR_ROWS.length; i++) {
      const { key, label } = ANCHOR_ROWS[i];
      const cur = byAnchor.get(key) ?? {};
      const next = i + 1 < ANCHOR_ROWS.length ? byAnchor.get(ANCHOR_ROWS[i + 1].key) ?? {} : null;
      const deltas: Record<string, number | null> = {};
      for (const k of CUT_TIER_ORDER) {
        const c = cur[k];
        const o = next ? next[k] : undefined;
        if (o === undefined || c === undefined) {
          deltas[k] = null;
        } else if (isRtaCutoffMissing(c) || isRtaCutoffMissing(o)) {
          deltas[k] = null;
        } else {
          deltas[k] = c - o;
        }
      }
      tableRows.push({
        anchorKey: key,
        label,
        scores: { ...cur },
        deltas,
      });
    }

    const summaryLabel = ANCHOR_ROWS[0]?.label ?? '—';

    const chartRows = buildCutChartRows(byAnchor);
    const cutChartYDomain = computeCutChartYDomain(chartRows);
    const hasCutChartData = CUT_TIER_ORDER.some((tk) =>
      chartRows.some((r) => {
        const v = r[tk];
        return typeof v === 'number' && Number.isFinite(v) && !isRtaCutoffMissing(v);
      }),
    );

    return { latest, tableRows, summaryLabel, chartRows, cutChartYDomain, hasCutChartData };
  }, [rankCutoffAnchors]);

  const hasAny =
    CUT_TIER_ORDER.some((k) => !isRtaCutoffMissing(latest[k])) || (rankCutoffAnchors?.length ?? 0) > 0;

  if (!hasAny) {
    return (
      <Card
        elevation={0}
        sx={{
          mt: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          p: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TrendingUpIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography sx={{ fontWeight: 600 }}>랭크 컷</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          P1~G3 구간 리플레이·점수가 쌓이면 최저점 기준 추정 컷을 표시합니다.
        </Typography>
      </Card>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{
        mt: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography sx={{ fontWeight: 600, fontSize: '1rem' }}>랭크 컷</Typography>
        </Box>
        {!showTrendChart ? (
          <Box
            component={Link}
            href="/rta/rank-cutoffs"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '0.75rem',
              color: 'text.secondary',
              textDecoration: 'none',
              '&:hover': { color: 'text.primary' },
            }}
          >
            기록 보기
            <ArrowForwardIcon sx={{ fontSize: 14 }} />
          </Box>
        ) : null}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, lineHeight: 1.5 }}>
        각 행은 서버 시각 기준 해당 시점이 속한 <strong>날짜</strong>에서, 그 시각 <strong>이전</strong>까지 수집된 리플레이만으로 티어별 최저점을 봅니다.
      </Typography>

      {showTrendChart && hasCutChartData ? (
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            앵커별 컷 추이 (7일 전 → 3시간 전, 과거 → 현재)
          </Typography>
          <Box sx={{ width: '100%', minHeight: 260 }}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartRows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis
                  dataKey="anchor"
                  tick={{ fontSize: 11 }}
                  stroke={theme.palette.text.secondary}
                  tickFormatter={(v) =>
                    typeof v === 'string' && v in ANCHOR_CHART_LABELS ? ANCHOR_CHART_LABELS[v] : String(v)
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
                        .map((x) => (x === '' ? '—' : Math.round(Number(x)).toLocaleString()))
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
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(2, auto)',
          gap: 1.5,
          mb: 2,
        }}
      >
        {CUT_KEYS_CARD_GRID.map((k) => (
          <Paper
            key={k}
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TierStars tierKey={k} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: tierAccent(k) }}>{k}</Typography>
            </Box>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: tierAccent(k) }}>
              {formatRtaCutoffScore(latest[k])}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mb: 2, opacity: 0.65 }}>
        <AccessTimeIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption">상단 카드: {summaryLabel} 스냅샷</Typography>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: 'divider' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <TableCell sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 600, py: 1.5 }}>기준</TableCell>
                {CUT_TIER_ORDER.map((k) => (
                  <TierHeaderCell key={k} tierKey={k} />
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row) => (
                <TableRow
                  key={row.anchorKey}
                  hover
                  sx={{ '&:last-child td': { borderBottom: 0 }, borderColor: 'divider' }}
                >
                  <TableCell sx={{ py: 1.25, verticalAlign: 'top' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                      {row.label}
                    </Typography>
                  </TableCell>
                  {CUT_TIER_ORDER.map((k) => {
                    const sc = row.scores[k];
                    const d = row.deltas[k];
                    return (
                      <TableCell key={k} align="center" sx={{ py: 1.25 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontVariantNumeric: 'tabular-nums',
                              color: tierAccent(k),
                              fontSize: '0.85rem',
                            }}
                          >
                            {formatRtaCutoffScore(sc)}
                          </Typography>
                          {d != null && (
                            <Typography
                              sx={{
                                fontSize: '0.65rem',
                                fontVariantNumeric: 'tabular-nums',
                                color: d >= 0 ? 'success.light' : 'error.light',
                              }}
                            >
                              {d >= 0 ? '+' : ''}
                              {Math.round(d)}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, lineHeight: 1.5 }}>
        티어별 <strong>최저 점수</strong>로 추정한 값입니다. 공식 최소 승점·랭킹과는 별개이며, 리플레이로 최저점을 잡지 못하면 &quot;—&quot;로 둡니다(과거 임시값 1000도 동일).
      </Typography>
    </Card>
  );
}
