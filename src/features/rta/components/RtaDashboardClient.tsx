'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import RtaRankCutoffsSection from '@/features/rta/components/RtaRankCutoffsSection';
import { useRtaDashboard, resolveRtaSeasonIdForApi } from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
import type { RtaTierBucket, RtaTierDailyRow } from '@/features/rta/types/rta';
import { toYmdKst } from '@/features/rta/utils/ymdKst';

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

/** C 컨커: 금색 · P 플래: 옥색(청록) · G 골드: 빨강 */
const TIER_BAR_COLORS: Record<string, string> = {
  Ch: 'rgb(139, 69, 19)',
  F: 'rgb(192, 192, 192)',
  C: '#d4af37',
  P: '#00897b',
  G: '#e53935',
  L: '#ffc107',
};

function tierColor(tierKey: string): string {
  if (tierKey.startsWith('Ch')) return TIER_BAR_COLORS.Ch;
  const head = tierKey[0];
  if (head === 'F' || head === 'C' || head === 'P' || head === 'G' || head === 'L') {
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

function normalizeBucketDate(raw: unknown): string {
  if (raw == null) return '';
  const s = String(raw);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function ymdOnly(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  const s = String(raw);
  return s.length >= 10 ? s.slice(0, 10) : null;
}

function minYmd(...vals: (string | null | undefined)[]): string | null {
  const xs = vals.filter((x): x is string => x != null && /^\d{4}-\d{2}-\d{2}$/.test(x));
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => (a <= b ? a : b));
}

/** 달력 기준 startYmd~endYmd 사이 일수(말일 포함 시 차이). 잘못된 날짜면 0 */
function calendarDaysBetweenStartAndEnd(startYmd: string, endYmd: string): number {
  const a = new Date(startYmd + 'T12:00:00');
  const b = new Date(endYmd + 'T12:00:00');
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

/** 시작일·끝일 포함 일수 */
function inclusiveDayCount(startYmd: string, endYmd: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(endYmd)) return 0;
  if (startYmd > endYmd) return 0;
  return calendarDaysBetweenStartAndEnd(startYmd, endYmd) + 1;
}

function addCalendarDaysYmd(startYmd: string, deltaDays: number): string {
  const d = new Date(startYmd + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return startYmd;
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayYmdLocal(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 특정 일(bucket_date)의 티어별 인원 합산 */
function tierCountsForSingleDay(
  daily: RtaTierDailyRow[] | undefined,
  targetYmd: string,
): Map<string, number> {
  const sums = new Map<string, number>();
  for (const row of daily ?? []) {
    if (normalizeBucketDate(row.bucket_date) !== targetYmd) continue;
    const k = row.tier_key;
    if (!k) continue;
    sums.set(k, (sums.get(k) ?? 0) + toNum(row.player_count));
  }
  return sums;
}

const SEASON_FALLBACK = [{ value: 'S36_SPECIAL', label: '36시즌 스페셜리그' }];

export default function RtaDashboardClient({ embedded = false }: { embedded?: boolean }) {
  const theme = useTheme();
  const isWide = useMediaQuery('(min-width:480px)');
  /** 시즌 첫날=0, 하루씩 증가 */
  const [dayOffset, setDayOffset] = useState(0);
  const lastSeasonForSlider = useRef<string | null>(null);
  const prevMaxDayIndex = useRef<number>(-1);

  const { data: seasonsData } = useRtaSeasonsContext();
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

  const seasonIdForApi = useMemo(
    () => resolveRtaSeasonIdForApi(seasonsData?.seasons, seasonSelectValue),
    [seasonsData?.seasons, seasonSelectValue],
  );

  const { data, isLoading, error } = useRtaDashboard(seasonSelectValue, seasonIdForApi);

  const selectedSeason = useMemo(() => {
    const rows = seasonsData?.seasons;
    if (!rows?.length) return null;
    return rows.find((r) => r.seasonCode === seasonSelectValue) ?? null;
  }, [seasonsData?.seasons, seasonSelectValue]);

  const seasonStartYmd = toYmdKst(selectedSeason?.startAt) ?? ymdOnly(selectedSeason?.startAt);
  /** 서버 기준 시즌 마지막 포함일(집계 가능 마지막 날 = 화면 우측 시즌 종료일) */
  const seasonLastInclusiveYmd = toYmdKst(selectedSeason?.endAt) ?? ymdOnly(selectedSeason?.endAt);

  /**
   * 슬라이더로 선택 가능한 마지막 날: 시즌 끝까지.
   * 단, 오늘이 시즌 시작~종료 사이에 있으면 오늘까지만 넘기지 못하게 캡.
   */
  const selectableEndYmd = useMemo(() => {
    if (!seasonStartYmd || !seasonLastInclusiveYmd) return null;
    const today = todayYmdLocal();
    if (today < seasonStartYmd) {
      return seasonStartYmd;
    }
    if (today > seasonLastInclusiveYmd) {
      return seasonLastInclusiveYmd;
    }
    return today;
  }, [seasonStartYmd, seasonLastInclusiveYmd]);

  const maxDayIndex = useMemo(() => {
    if (!seasonStartYmd || !selectableEndYmd) return 0;
    return Math.max(0, inclusiveDayCount(seasonStartYmd, selectableEndYmd) - 1);
  }, [seasonStartYmd, selectableEndYmd]);

  useEffect(() => {
    const seasonChanged = lastSeasonForSlider.current !== seasonSelectValue;
    if (seasonChanged) {
      lastSeasonForSlider.current = seasonSelectValue;
    }
    const maxGrewFromZero =
      prevMaxDayIndex.current <= 0 && maxDayIndex > 0 && !seasonChanged;
    prevMaxDayIndex.current = maxDayIndex;

    if (seasonChanged) {
      setDayOffset(maxDayIndex);
      return;
    }
    if (maxGrewFromZero) {
      setDayOffset(maxDayIndex);
      return;
    }
    setDayOffset((d) => Math.min(d, maxDayIndex));
  }, [seasonSelectValue, maxDayIndex]);

  const selectedYmd = useMemo(() => {
    if (!seasonStartYmd) return null;
    return addCalendarDaysYmd(seasonStartYmd, dayOffset);
  }, [seasonStartYmd, dayOffset]);

  const rows = useMemo(() => {
    if (!selectedYmd) {
      return TIER_ORDER.map((key) => ({ tier_key: key, player_count: 0 })) as RtaTierBucket[];
    }
    const sums = tierCountsForSingleDay(data?.daily_tiers, selectedYmd);
    return TIER_ORDER.map((key) => ({
      tier_key: key,
      player_count: sums.get(key) ?? 0,
    })) as RtaTierBucket[];
  }, [data?.daily_tiers, selectedYmd]);

  const maxCount = useMemo(() => Math.max(1, ...rows.map((r) => r.player_count)), [rows]);

  const totalPlayers = useMemo(() => rows.reduce((acc, r) => acc + r.player_count, 0), [rows]);

  const sliderValueLabelFormat = useCallback(
    (v: number) => {
      if (!seasonStartYmd) return '—';
      return addCalendarDaysYmd(seasonStartYmd, v);
    },
    [seasonStartYmd],
  );

  const handlePlay = () => {
    setDayOffset((prev) => (prev >= maxDayIndex ? 0 : prev + 1));
  };

  return (
    <Box
      sx={{
        maxWidth: 1100,
        mx: 'auto',
        px: embedded ? 0 : { xs: 2, sm: 3 },
        py: embedded ? 0 : { xs: 2, md: 4 },
      }}
    >
      {embedded ? (
        <Typography variant="h5" component="h2" fontWeight={800} sx={{ mb: 2 }}>
          RTA 티어 분포·랭크 컷
        </Typography>
      ) : (
        <PageHeader title="RTA 대시보드" />
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="rta-dash-season-label">시즌</InputLabel>
          <Select
            labelId="rta-dash-season-label"
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
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        시즌 일별 티어 집계를 불러온 뒤, 슬라이더로 날짜를 고르면 그날의 분포만 표시합니다.{' '}
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
                {seasonStartYmd ?? '—'}
              </Typography>
              <Chip
                size="small"
                label={selectedYmd ?? '—'}
                color="primary"
                variant="filled"
                sx={{ height: 22, fontSize: '0.7rem' }}
              />
              <Typography variant="caption" color="text.secondary">
                {seasonLastInclusiveYmd ?? '—'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={handlePlay}
                title="하루씩 (끝에서 다시 처음)"
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
                value={dayOffset}
                min={0}
                max={Math.max(0, maxDayIndex)}
                onChange={(_, v) => setDayOffset(v as number)}
                valueLabelDisplay="auto"
                valueLabelFormat={sliderValueLabelFormat}
                sx={{
                  flex: 1,
                  color: 'primary.main',
                  '& .MuiSlider-thumb': { width: 14, height: 14 },
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              좌=시즌 시작일 · 우=시즌 종료일 · 슬라이더=해당 일 티어 분포(오늘이 시즌 안이면 오늘 이후로는 이동 불가)
            </Typography>
          </Box>

          {!isWide ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {rows.map((row) => {
                const pct = maxCount > 0 ? (row.player_count / maxCount) * 100 : 0;
                return (
                  <Box key={row.tier_key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          width: 28,
                          fontSize: '10px',
                          fontWeight: 600,
                          color: 'text.secondary',
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
                        color: 'text.secondary',
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
            소환사 (선택한 일자·매치당 2명 집계)
          </Typography>
        </Card>
        {data ? <RtaRankCutoffsSection rankCutoffAnchors={data.rank_cutoff_anchors} /> : null}
        </>
      )}
    </Box>
  );
}
