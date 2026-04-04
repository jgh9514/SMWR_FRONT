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
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { RtaRankCutoffDailyRow } from '@/features/rta/types/rta';

const ICON_PUNISHER_STAR = '/icons/punisher_star.png';
const ICON_GUARDIAN_STAR = '/icons/guardian_star.png';

const CUT_KEYS = ['P2', 'P3', 'G1', 'G2', 'G3'] as const;

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
  return tierKey.startsWith('P') ? ICON_PUNISHER_STAR : ICON_GUARDIAN_STAR;
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDate(raw: unknown): string {
  if (raw == null) return '';
  const s = String(raw);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** 날짜별 → 티어 → 점수 */
function pivotByDate(rows: RtaRankCutoffDailyRow[]): Map<string, Record<string, number>> {
  const byDate = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const d = normalizeDate(row.bucket_date);
    if (!d) continue;
    const k = row.tier_key;
    if (!(CUT_KEYS as readonly string[]).includes(k)) continue;
    if (!byDate.has(d)) byDate.set(d, {});
    const rec = byDate.get(d)!;
    rec[k] = toNum(row.cutoff_score);
  }
  return byDate;
}

function formatRelativeFromDate(dateStr: string): string {
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays <= 0) return '오늘';
  if (diffDays === 1) return '1일 전';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return `${Math.floor(diffDays / 30)}개월 전`;
}

function formatDateTimeLine(dateStr: string): string {
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TierStars({ tierKey }: { tierKey: string }) {
  const n = tierStarCount(tierKey);
  const src = tierStarIconSrc(tierKey);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
      {Array.from({ length: n }).map((_, i) => (
        <Image key={i} src={src} alt="" width={12} height={12} unoptimized style={{ display: 'block' }} />
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
  rankCutoffDaily: RtaRankCutoffDailyRow[] | undefined;
}

export default function RtaRankCutoffsSection({ rankCutoffDaily }: RtaRankCutoffsSectionProps) {
  const { latest, tableRows, lastUpdatedLabel } = useMemo(() => {
    const rows = rankCutoffDaily ?? [];
    const byDate = pivotByDate(rows);
    const dates = [...byDate.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

    const latestDate = dates[0];
    const latest: Record<string, number> = {};
    if (latestDate) {
      const rec = byDate.get(latestDate) ?? {};
      for (const k of CUT_KEYS) {
        latest[k] = rec[k] ?? 0;
      }
    }

    const tableRows: {
      bucketDate: string;
      rel: string;
      line2: string;
      scores: Record<string, number>;
      deltas: Record<string, number | null>;
    }[] = [];

    for (let i = 0; i < dates.length; i++) {
      const bucketDate = dates[i];
      const cur = byDate.get(bucketDate) ?? {};
      const older = i + 1 < dates.length ? byDate.get(dates[i + 1]) ?? {} : null;
      const deltas: Record<string, number | null> = {};
      for (const k of CUT_KEYS) {
        const c = cur[k];
        const o = older ? older[k] : undefined;
        if (o === undefined || c === undefined) {
          deltas[k] = null;
        } else {
          deltas[k] = c - o;
        }
      }
      tableRows.push({
        bucketDate,
        rel: formatRelativeFromDate(bucketDate),
        line2: formatDateTimeLine(bucketDate),
        scores: { ...cur },
        deltas,
      });
    }

    const lastUpdatedLabel = latestDate ? formatRelativeFromDate(latestDate) : '';

    return { latest, tableRows, lastUpdatedLabel };
  }, [rankCutoffDaily]);

  const hasAny = CUT_KEYS.some((k) => (latest[k] ?? 0) > 0) || tableRows.length > 0;

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
          P2·P3·G1~G3 구간에 해당하는 리플레이·점수 데이터가 쌓이면 최저점 기준 추정 컷을 표시합니다.
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
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 1.5, mb: 2 }}>
        {CUT_KEYS.map((k) => (
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
              {latest[k] ? Math.round(latest[k]).toLocaleString() : '—'}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mb: 2, opacity: 0.65 }}>
        <AccessTimeIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption">{lastUpdatedLabel || '—'} 갱신 기준</Typography>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: 'divider' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <TableCell sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 600, py: 1.5 }}>Time</TableCell>
                {CUT_KEYS.map((k) => (
                  <TierHeaderCell key={k} tierKey={k} />
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row) => (
                <TableRow
                  key={row.bucketDate}
                  hover
                  sx={{ '&:last-child td': { borderBottom: 0 }, borderColor: 'divider' }}
                >
                  <TableCell sx={{ py: 1.25, verticalAlign: 'top' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                      {row.rel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', opacity: 0.85 }}>
                      {row.line2}
                    </Typography>
                  </TableCell>
                  {CUT_KEYS.map((k) => {
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
                            {sc != null && sc > 0 ? Math.round(sc).toLocaleString() : '—'}
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
        일자·티어별 해당 리플레이 중 <strong>최저 점수</strong>로 추정한 값입니다. 공식 컷과 다를 수 있습니다.
      </Typography>
    </Card>
  );
}
