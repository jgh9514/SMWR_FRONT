'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import {
  Box,
  Card,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import { useRtaRankCutDetail, useRtaSeasonSelect } from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
import { RTA_SELECT_MENU_PROPS } from '@/features/rta/components/RtaSeasonTierSelectRow';
import { blurFocusedMenuItem } from '@/features/rta/rtaMenuModalProps';
import { CUT_TIER_ORDER } from '@/features/rta/utils/rtaRankCutoffChart';
import { formatRtaCutoffScore, isRtaCutoffMissing } from '@/features/rta/utils/rtaCutoffScore';
import { getRtaShortLabelStarIconPath, RTA_LEGEND_STAR_WIDTH_RATIO } from '@/shared/utils';
import type { RtaRankCutDailyRow } from '@/features/rta/types/rta';

const TIER_COLOR: Record<string, string> = {
  P2: '#00897b', P3: '#26a69a',
  G1: '#ef5350', G2: '#e53935', G3: '#b71c1c',
};
function tierAccent(t: string) { return TIER_COLOR[t] ?? '#999'; }

const TIER_STAR_PX = 12;
const TIER_STAR_GAP_PX = 2;
const TIER_STAR_TRIPLE_WIDTH = 3 * TIER_STAR_PX + 2 * TIER_STAR_GAP_PX;

function TierStars({ shortLabel }: { shortLabel: string }) {
  const src = getRtaShortLabelStarIconPath(shortLabel);
  if (shortLabel === 'L1') {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: TIER_STAR_TRIPLE_WIDTH }}>
        <Image src={src} alt="" width={TIER_STAR_PX * RTA_LEGEND_STAR_WIDTH_RATIO} height={TIER_STAR_PX} unoptimized
          style={{ display: 'block', objectFit: 'contain' }} />
      </Box>
    );
  }
  const n = Math.max(1, Math.min(3, parseInt(shortLabel.slice(-1), 10) || 2));
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
      {Array.from({ length: n }).map((_, i) => (
        <Image key={i} src={src} alt="" width={TIER_STAR_PX} height={TIER_STAR_PX} unoptimized
          style={{ display: 'block', width: TIER_STAR_PX, height: TIER_STAR_PX, objectFit: 'contain', flexShrink: 0 }} />
      ))}
    </Box>
  );
}

function TierHeaderCell({ shortLabel }: { shortLabel: string }) {
  return (
    <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1 }, py: { xs: 1, sm: 1.5 }, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
        <TierStars shortLabel={shortLabel} />
        <Typography sx={{ fontSize: { xs: '9px', sm: '10px' }, fontWeight: 800, color: tierAccent(shortLabel), whiteSpace: 'nowrap' }}>
          {shortLabel}
        </Typography>
      </Box>
    </TableCell>
  );
}

function buildDailyRows(rows: RtaRankCutDailyRow[]) {
  const byDay = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const day = row.snappedDay;
    if (!day) continue;
    if (!byDay.has(day)) byDay.set(day, {});
    const rec = byDay.get(day)!;
    const v = Number(row.cutoffScore);
    if (Number.isFinite(v)) rec[row.gradeSlot] = v;
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, scores]) => ({ day, scores }));
}

function formatDay(d: string) {
  const parts = d.split('-');
  if (parts.length < 3) return d;
  return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
}

export default function RtaRankCutoffsPageClient() {
  const { data: seasonsData } = useRtaSeasonsContext();
  const { seasonSelectValue, seasonIdForApi, setSeason, seasonOptions } = useRtaSeasonSelect(seasonsData);

  const { data, isPending, error } = useRtaRankCutDetail(seasonSelectValue, seasonIdForApi);

  const dailyRows = useMemo(() => buildDailyRows(data?.daily ?? []), [data]);

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', md: 1100, lg: 1280, xl: 1536 }, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, md: 4 } }}>
      <PageHeader title="랭크 컷 기록" backPath="/" />

      <Card elevation={0} sx={{ mt: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: { xs: 2, sm: 3 } }}>
        {/* 헤더 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon sx={{ color: 'primary.main', fontSize: 22 }} />
            <Typography sx={{ fontWeight: 600, fontSize: '1rem' }}>일별 랭크 컷</Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="rta-cutoffs-season-label">시즌</InputLabel>
            <Select
              labelId="rta-cutoffs-season-label"
              label="시즌"
              value={seasonSelectValue}
              onChange={(e) => { blurFocusedMenuItem(); setSeason(String(e.target.value)); }}
              MenuProps={RTA_SELECT_MENU_PROPS}
              sx={{
                bgcolor: '#ffffff',
                '&:hover': { bgcolor: '#ffffff' },
                '&.Mui-focused': { bgcolor: '#ffffff' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
              }}
            >
              {seasonOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {isPending && !data ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        ) : error ? (
          <Typography color="error">{error.message || '불러오기에 실패했습니다.'}</Typography>
        ) : dailyRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            데이터가 아직 없습니다.
          </Typography>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: 'divider' }}>
            <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table size="small" sx={{ minWidth: { xs: 0, sm: 480 }, tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                    <TableCell sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 600, py: 1.5, px: { xs: 1, sm: 2 }, width: { xs: '62px', sm: '80px' } }}>날짜</TableCell>
                    {CUT_TIER_ORDER.map((k) => <TierHeaderCell key={k} shortLabel={k} />)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dailyRows.map(({ day, scores }) => (
                    <TableRow key={day} hover sx={{ '&:last-child td': { borderBottom: 0 }, borderColor: 'divider' }}>
                      <TableCell sx={{ py: { xs: 1, sm: 1.25 }, px: { xs: 1, sm: 2 } }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.75rem' }, whiteSpace: 'nowrap' }}>
                          {formatDay(day)}
                        </Typography>
                      </TableCell>
                      {CUT_TIER_ORDER.map((k) => {
                        const sc = scores[k];
                        return (
                          <TableCell key={k} align="center" sx={{ py: { xs: 1, sm: 1.25 }, px: { xs: 0.5, sm: 1 }, whiteSpace: 'nowrap' }}>
                            <Typography component="span" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: tierAccent(k), fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                              {sc != null && !isRtaCutoffMissing(sc) ? formatRtaCutoffScore(sc) : '—'}
                            </Typography>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, lineHeight: 1.5 }}>
          KST 기준 일별 최저 점수 추정값. 리플레이 수집이 적은 날은 &quot;—&quot;로 표시됩니다.
        </Typography>
      </Card>
    </Box>
  );
}
