'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  Slider,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import RtaRankCutoffsSection from '@/features/rta/components/RtaRankCutoffsSection';
import RtaTierOfficialRulesSection from '@/features/rta/components/RtaTierOfficialRulesSection';
import { useRtaDashboard } from '@/features/rta/hooks/useRtaData';
import type { RtaTierBucket, RtaTierDailyRow } from '@/features/rta/types/rta';

const TIER_ORDER = [
  'Ch1',
  'Ch2',
  'Ch3',
  'F1',
  'F2',
  'F3',
  'C1',
  'C2',
  'C3',
  'P1',
  'P2',
  'P3',
  'G1',
  'G2',
  'G3',
] as const;

const TIER_BAR_COLORS: Record<string, string> = {
  Ch: 'rgb(139, 69, 19)',
  F: 'rgb(192, 192, 192)',
  C: 'rgb(255, 215, 0)',
  P: 'rgb(7, 186, 173)',
  G: 'rgb(155, 89, 182)',
};

function tierColor(tierKey: string): string {
  if (tierKey.startsWith('Ch')) return TIER_BAR_COLORS.Ch;
  const head = tierKey[0];
  if (head === 'F' || head === 'C' || head === 'P' || head === 'G') {
    return TIER_BAR_COLORS[head];
  }
  return 'rgba(128,128,128,0.6)';
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

function formatDateLabel(raw: unknown): string {
  if (raw == null || raw === '') return '—';
  const s = String(raw);
  if (s.length >= 10) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
  return s;
}

function normalizeBucketDate(raw: unknown): string {
  if (raw == null) return '';
  const s = String(raw);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** 데이터 최신일(max) 기준 최근 daysBack일 구간만 포함 (YYYY-MM-DD 문자열 비교) */
function getCutoffDateStr(maxDateStr: string | undefined, daysBack: number): string | null {
  if (!maxDateStr || daysBack <= 0) return null;
  const base = new Date(maxDateStr.slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() - daysBack);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function aggregateDailyTiers(
  daily: RtaTierDailyRow[] | undefined,
  maxDateStr: string | undefined,
  daysBack: number,
): Map<string, number> {
  const sums = new Map<string, number>();
  const cutoff = getCutoffDateStr(maxDateStr, daysBack);
  for (const row of daily ?? []) {
    const bd = normalizeBucketDate(row.bucket_date);
    if (cutoff && bd < cutoff) continue;
    const k = row.tier_key;
    if (!k) continue;
    sums.set(k, (sums.get(k) ?? 0) + toNum(row.player_count));
  }
  return sums;
}

export default function RtaDashboardClient() {
  const theme = useTheme();
  const isWide = useMediaQuery('(min-width:480px)');
  const [daysBack, setDaysBack] = useState(0);

  const { data, isLoading, error } = useRtaDashboard();

  const rows = useMemo(() => {
    const maxDate = data?.date_range?.max_date;
    const maxStr = typeof maxDate === 'string' ? maxDate : undefined;
    const sums = aggregateDailyTiers(data?.daily_tiers, maxStr, daysBack);
    return TIER_ORDER.map((key) => ({
      tier_key: key,
      player_count: sums.get(key) ?? 0,
    })) as RtaTierBucket[];
  }, [data?.daily_tiers, data?.date_range?.max_date, daysBack]);

  const maxCount = useMemo(() => Math.max(1, ...rows.map((r) => r.player_count)), [rows]);

  const totalPlayers = useMemo(() => rows.reduce((acc, r) => acc + r.player_count, 0), [rows]);

  const minDate = data?.date_range?.min_date;
  const maxDate = data?.date_range?.max_date;

  const labelStart = useMemo(() => {
    if (daysBack > 0) {
      const c = getCutoffDateStr(typeof maxDate === 'string' ? maxDate : undefined, daysBack);
      return c ?? minDate;
    }
    return minDate;
  }, [daysBack, maxDate, minDate]);

  const handlePlay = () => {
    setDaysBack((prev) => (prev >= 90 ? 0 : Math.min(90, (prev || 30) + 15)));
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, md: 4 } }}>
      <PageHeader title="RTA 대시보드" />

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        수집된 실레나 리플레이 전체를 한 번 불러온 뒤, 슬라이더는 이 기기에서만 합산합니다.{' '}
        <Link href="/rta" style={{ color: theme.palette.primary.main }}>
          매치 목록
        </Link>
        {' · '}
        <Link href="/rta/monster-stats" style={{ color: theme.palette.primary.main }}>
          몬스터 통계
        </Link>
      </Typography>

      {isLoading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" sx={{ py: 4 }}>
          {error.message || '불러오기에 실패했습니다.'}
        </Typography>
      ) : (
        <>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            p: { xs: 2, sm: 3 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <TrendingUpIcon sx={{ color: 'primary.main', fontSize: 22 }} />
            <Typography component="span" sx={{ fontWeight: 600, fontSize: '1rem' }}>
              소환사 티어별 분포
            </Typography>
          </Box>

          <Box sx={{ mb: 2, px: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {formatDateLabel(labelStart)}
              </Typography>
              <Chip
                size="small"
                label={daysBack === 0 ? '전체' : '필터'}
                color={daysBack === 0 ? 'default' : 'primary'}
                variant={daysBack === 0 ? 'outlined' : 'filled'}
                sx={{ height: 22, fontSize: '0.7rem' }}
              />
              <Typography variant="caption" color="text.secondary">
                {formatDateLabel(maxDate)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={handlePlay}
                title="기간 프리셋"
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: 'action.hover',
                  '&:hover': { bgcolor: 'action.selected' },
                }}
              >
                <PlayArrowIcon sx={{ fontSize: 18, ml: 0.25 }} />
              </IconButton>
              <Slider
                size="small"
                value={daysBack}
                min={0}
                max={90}
                onChange={(_, v) => setDaysBack(v as number)}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => (v === 0 ? '전체' : `최근 ${v}일`)}
                sx={{
                  flex: 1,
                  color: 'primary.main',
                  '& .MuiSlider-thumb': { width: 14, height: 14 },
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              0 = 전체 기간 · 1~90 = 데이터 최신일 기준 최근 N일만 합산 (추가 요청 없음)
            </Typography>
          </Box>

          {!isWide ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {rows.map((row) => {
                const pct = maxCount > 0 ? (row.player_count / maxCount) * 100 : 0;
                const isP1 = row.tier_key === 'P1';
                return (
                  <Box key={row.tier_key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          width: 28,
                          fontSize: '10px',
                          fontWeight: 600,
                          color: isP1 ? '#07baad' : 'text.secondary',
                        }}
                      >
                        {row.tier_key}
                      </Typography>
                      <Box
                        sx={{
                          flex: 1,
                          height: 20,
                          borderRadius: 0.5,
                          bgcolor: 'action.hover',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${pct}%`,
                            borderRadius: 0.5,
                            bgcolor: tierColor(row.tier_key),
                            transition: 'width 0.35s ease',
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '10px' }}
                      >
                        {formatCompact(row.player_count)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 0.75,
                height: 180,
                px: 0.5,
              }}
            >
              {rows.map((row) => {
                const pct = maxCount > 0 ? row.player_count / maxCount : 0;
                const barH = Math.max(4, pct * 160);
                const isP1 = row.tier_key === 'P1';
                return (
                  <Box
                    key={row.tier_key}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      maxWidth: 48,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 0.5,
                      height: '100%',
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: '11px', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}
                    >
                      {formatCompact(row.player_count)}
                    </Typography>
                    <Box
                      title={`${row.tier_key}: ${row.player_count.toLocaleString()}`}
                      sx={{
                        width: '100%',
                        height: barH,
                        borderRadius: '4px 4px 0 0',
                        bgcolor: tierColor(row.tier_key),
                        transition: 'height 0.35s ease',
                        cursor: 'default',
                        '&:hover': { opacity: 0.88 },
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: isP1 ? '#07baad' : 'text.secondary',
                      }}
                    >
                      {row.tier_key}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}

          <Typography align="center" sx={{ mt: 2, color: 'text.secondary', fontSize: '0.9rem' }}>
            <Typography component="span" fontWeight={700} color="text.primary">
              {totalPlayers.toLocaleString()}
            </Typography>{' '}
            소환사 (매치당 2명 집계)
          </Typography>
        </Card>
        {data ? <RtaRankCutoffsSection rankCutoffAnchors={data.rank_cutoff_anchors} /> : null}
        <RtaTierOfficialRulesSection />
        </>
      )}
    </Box>
  );
}
