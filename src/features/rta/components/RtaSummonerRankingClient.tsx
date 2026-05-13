'use client';

import {
  memo,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';
import { RTA_SELECT_MENU_PROPS } from '@/features/rta/components/RtaSeasonTierSelectRow';
import { blurFocusedMenuItem } from '@/features/rta/rtaMenuModalProps';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import { useRtaSummonerRanking, useRtaSeasonSelect } from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import type { RtaSummonerRankingRow } from '@/features/rta/types/rta';

const PAGE_SIZE = 10;
/** WAS `RtaServiceImpl.RTA_SUMMONER_RANKING_MAX_ROWS` — 국가 칩 비율용 샘플만 별도 요청 */
const SUMMONER_RANKING_MAX = 500;

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
  const losses = Math.max(0, total - wins);
  const pct = total > 0 ? (wins / total) * 100 : 0;
  const winPct = total > 0 ? wins / total : 0;
  const lossPct = total > 0 ? losses / total : 0;
  /** 텍스트를 표시할 최소 비율 (너무 좁으면 생략) */
  const MIN_LABEL_PCT = 0.18;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: '0.72rem',
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: total <= 0 ? 'text.disabled' : pct >= 50 ? 'primary.main' : 'error.light',
          flexShrink: 0,
          minWidth: 40,
        }}
      >
        {total <= 0 ? '0%' : `${pct.toFixed(1)}%`}
      </Typography>
      <Box
        sx={{
          flex: 1,
          height: 26,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'action.hover',
          '@keyframes slideInBar': {
            from: { transform: 'translateX(-100%)' },
            to: { transform: 'translateX(0)' },
          },
        }}
      >
        {total <= 0 ? (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
              0승 · 0패
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              width: '100%',
              height: '100%',
              animation: 'slideInBar 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {wins > 0 && (
              <Box
                sx={{
                  flex: wins,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {winPct >= MIN_LABEL_PCT && (
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', px: 0.5, whiteSpace: 'nowrap' }}>
                    {wins}승
                  </Typography>
                )}
              </Box>
            )}
            {losses > 0 && (
              <Box
                sx={{
                  flex: losses,
                  bgcolor: 'error.dark',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {lossPct >= MIN_LABEL_PCT && (
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', px: 0.5, whiteSpace: 'nowrap' }}>
                    {losses}패
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function buildRow(row: RtaSummonerRankingRow) {
  const wid = row.wizard_id;
  const cuid = row.channel_uid;
  const wname = row.wizard_name;
  return {
    rank: toNum(row.rank_position),
    wizardId: wid != null && String(wid).trim() !== '' ? String(wid) : '',
    channelUid: cuid != null && String(cuid).trim() !== '' ? String(cuid) : undefined,
    name: (typeof wname === 'string' ? wname.trim() : '') || '—',
    country: (typeof row.country === 'string' ? row.country.trim() : '') || '',
    score: toNum(row.score),
    ratingId: row.rating_id != null ? Number(row.rating_id) : undefined,
    winCount: toNum(row.win_count),
    matchCount: toNum(row.match_count),
  };
}

type SummonerRankingRowView = ReturnType<typeof buildRow>;

const RTA_OUTLINED_SELECT_SX = {
  bgcolor: 'background.paper',
  '&:hover': { bgcolor: 'action.hover' },
  '&.Mui-focused': { bgcolor: 'background.paper' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
} as const;

const SummonerRankCard = memo(function SummonerRankCard({
  r,
  profileHref,
  onRowClick,
  onAuxClick,
  onKeyDown,
}: {
  r: SummonerRankingRowView;
  profileHref: string | null;
  onRowClick: (e: ReactMouseEvent<HTMLElement>, href: string) => void;
  onAuxClick: (e: ReactMouseEvent<HTMLElement>, href: string) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLElement>, href: string) => void;
}) {
  const serverLabel = r.country ? r.country.toUpperCase() : '—';
  return (
    <Paper
      elevation={0}
      onClick={profileHref ? (e) => onRowClick(e, profileHref) : undefined}
      onAuxClick={profileHref ? (e) => onAuxClick(e, profileHref) : undefined}
      onKeyDown={profileHref ? (e) => onKeyDown(e, profileHref) : undefined}
      tabIndex={profileHref ? 0 : -1}
      role={profileHref ? 'link' : undefined}
      sx={{
        p: { xs: 1.5, sm: 1.75 },
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: (t) => t.transitions.create(['box-shadow', 'border-color'], { duration: 150 }),
        ...(profileHref
          ? {
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.light', boxShadow: 1 },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }
          : {}),
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              width: 36,
              flexShrink: 0,
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '0.9rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {r.rank}
          </Typography>
          <Box
            component="img"
            src={getSwexPlayerImageUrl(r.channelUid || r.wizardId)}
            alt=""
            loading="lazy"
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          />
          <Stack flex={1} minWidth={0} spacing={0.25}>
            <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0, width: '100%' }}>
              <Typography
                variant="body2"
                fontWeight={800}
                noWrap
                title={r.wizardId ? `${r.name} (${r.wizardId})` : r.name}
                sx={{ flex: 1, minWidth: 0 }}
              >
                {r.name}
              </Typography>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  flexShrink: 0,
                  ml: 'auto',
                }}
              >
                <RtaRatingStarIcons rating={r.ratingId} size={14} />
                <Typography
                  component="span"
                  variant="body2"
                  fontWeight={800}
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {r.score.toLocaleString()}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
              {r.country && r.country !== '—' && /^[a-z]{2}$/i.test(r.country) ? (
                <Box
                  component="img"
                  src={`https://flagcdn.com/w40/${r.country.toLowerCase()}.png`}
                  alt=""
                  sx={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 0.5, flexShrink: 0 }}
                />
              ) : null}
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {serverLabel}
              </Typography>
            </Stack>
          </Stack>
        </Stack>

        <Box sx={{ pl: 0.25 }}>
          <WinRateBar wins={r.winCount} total={r.matchCount} />
        </Box>
      </Stack>
    </Paper>
  );
});

export default function RtaSummonerRankingClient() {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const { data: seasonsData } = useRtaSeasonsContext();
  const { seasonSelectValue, seasonIdForApi, setSeason, seasonOptions } = useRtaSeasonSelect(seasonsData);

  const [offset, setOffset] = useState(0);
  const [allRows, setAllRows] = useState<ReturnType<typeof buildRow>[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);

  /** 시즌·국가 필터가 바뀌면 목록 초기화 */
  useEffect(() => {
    setOffset(0);
    setAllRows([]);
    setHasMore(false);
  }, [seasonSelectValue, countryFilter]);

  const {
    data: pageData,
    isLoading: loadingPage,
    isFetching: fetchingPage,
    error: errPage,
  } = useRtaSummonerRanking(PAGE_SIZE, offset, seasonSelectValue, {
    country: countryFilter ?? undefined,
    seasonId: seasonIdForApi,
  });

  const navigateToProfile = (href: string, openInNewTab = false) => {
    if (openInNewTab && typeof window !== 'undefined') {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    router.push(href);
  };

  const handleRowClick = (e: ReactMouseEvent<HTMLElement>, href: string) => {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey) {
      navigateToProfile(href, true);
      return;
    }
    router.push(href);
  };

  const handleRowAuxClick = (e: ReactMouseEvent<HTMLElement>, href: string) => {
    if (e.button === 1) {
      e.preventDefault();
      navigateToProfile(href, true);
    }
  };

  const handleRowKeyDown = (e: ReactKeyboardEvent<HTMLElement>, href: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigateToProfile(href, e.metaKey || e.ctrlKey);
    }
  };

  /** 첫 로드만 전체 스피너, 더보기는 테이블 상단 프로그레스 */
  const tableInitialLoading = loadingPage && allRows.length === 0;
  const tableLoadingMore = fetchingPage && offset > 0;

  /** 새 데이터 도착 시 누적 */
  useEffect(() => {
    if (!pageData) return;
    const newRows = (pageData.rankings ?? []).map((row: RtaSummonerRankingRow) => buildRow(row));
    const total = toNum(pageData.total);
    if (offset === 0) {
      setAllRows(newRows);
    } else {
      setAllRows((prev) => [...prev, ...newRows]);
    }
    setHasMore(offset + PAGE_SIZE < total);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageData]);

  const total = toNum(pageData?.total);

  /** 국가 칩: 상위 N명 풀 전체 분포(필터 없음) — 페이지 쿼리와 분리 */
  const { data: distSampleData, error: errDistSample } = useRtaSummonerRanking(
    SUMMONER_RANKING_MAX,
    0,
    seasonSelectValue,
    { seasonId: seasonIdForApi },
  );

  const countrySampleLoading = !distSampleData && !errDistSample;

  const handleCountryChipClick = (code: string) => {
    setCountryFilter((prev) => (prev === code ? null : code));
  };

  const countryChips = useMemo(
    () => countrySharesFromRankings(distSampleData?.rankings ?? []),
    [distSampleData?.rankings],
  );

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', md: 1100, lg: 1200, xl: 1280 },
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        py: { xs: 2, md: 4 },
      }}
    >
      <PageHeader title="RTA 소환사 랭킹" backPath="/rta" />

      <Box sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          justifyContent="space-between"
        >
          <FormControl size="small" fullWidth={isNarrow} sx={{ minWidth: { sm: 200 }, maxWidth: { sm: 360 } }}>
            <InputLabel id="rta-season-label">시즌</InputLabel>
            <Select
              labelId="rta-season-label"
              label="시즌"
              value={seasonSelectValue}
              onChange={(e) => {
                blurFocusedMenuItem();
                setSeason(String(e.target.value));
                setCountryFilter(null);
              }}
              sx={RTA_OUTLINED_SELECT_SX}
              MenuProps={RTA_SELECT_MENU_PROPS}
            >
              {seasonOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 0.75 }}>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45, flex: 1, minWidth: 0 }}>
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  국가 비율 (상위 {SUMMONER_RANKING_MAX}명 샘플) · 표는 페이지마다 서버 조회
                </Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                  국가 비율 · 상위 {SUMMONER_RANKING_MAX}명 샘플
                </Box>
              </Typography>
              {countryFilter != null ? (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    setCountryFilter(null);
                  }}
                >
                  국가 필터 해제
                </Button>
              ) : null}
            </Box>
            <Stack
              direction="row"
              flexWrap={{ xs: 'nowrap', sm: 'wrap' }}
              gap={1}
              useFlexGap
              sx={{
                maxWidth: '100%',
                overflowX: { xs: 'auto', sm: 'visible' },
                py: 0.25,
                WebkitOverflowScrolling: 'touch',
                scrollbarGutter: { xs: 'stable', sm: 'auto' },
                '&::-webkit-scrollbar': { height: 4 },
                '&::-webkit-scrollbar-thumb': { borderRadius: 1, bgcolor: 'action.disabled' },
              }}
            >
              {countryChips.length === 0 && countrySampleLoading ? (
                <Typography variant="caption" color="text.disabled">
                  불러오는 중…
                </Typography>
              ) : countryChips.length === 0 && errDistSample ? (
                <Typography variant="caption" color="text.disabled">
                  국가 분포를 불러오지 못했습니다.
                </Typography>
              ) : countryChips.length === 0 ? (
                <Typography variant="caption" color="text.disabled">
                  국가 코드가 없는 데이터입니다.
                </Typography>
              ) : (
                countryChips.map(({ code, pct }) => {
                  const selected = countryFilter === code;
                  return (
                    <Paper
                      key={code}
                      component="button"
                      type="button"
                      variant="outlined"
                      onClick={() => handleCountryChipClick(code)}
                      aria-pressed={selected}
                      sx={{
                        flexShrink: 0,
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        borderColor: selected ? 'primary.main' : 'divider',
                        bgcolor: selected ? 'action.selected' : 'action.hover',
                        cursor: 'pointer',
                        font: 'inherit',
                        color: 'inherit',
                        textAlign: 'left',
                        '&:hover': {
                          borderColor: 'primary.light',
                          bgcolor: 'action.selected',
                        },
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
                  );
                })
              )}
            </Stack>
          </Box>
        </Stack>
      </Box>

      {tableInitialLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : errPage ? (
        <Typography color="error">{errPage.message || '불러오기에 실패했습니다.'}</Typography>
      ) : (
        <>
          <Box sx={{ position: 'relative', mb: 2 }}>
            {tableLoadingMore ? (
              <LinearProgress
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 2,
                  borderRadius: { xs: 2, md: '8px 8px 0 0' },
                }}
              />
            ) : null}
            {isNarrow ? (
              <Box
                aria-busy={tableLoadingMore}
                sx={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  ...(tableLoadingMore ? { opacity: 0.72, transition: 'opacity 0.2s' } : {}),
                }}
              >
                {allRows.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
                    <Typography color="text.secondary">표시할 랭킹 데이터가 없습니다.</Typography>
                  </Paper>
                ) : (
                  allRows.map((r) => {
                    const profileHref =
                      r.wizardId !== '' ? `/rta/player/${encodeURIComponent(r.wizardId)}` : null;
                    return (
                      <SummonerRankCard
                        key={r.wizardId || `${r.rank}-${r.name}`}
                        r={r}
                        profileHref={profileHref}
                        onRowClick={handleRowClick}
                        onAuxClick={handleRowAuxClick}
                        onKeyDown={handleRowKeyDown}
                      />
                    );
                  })
                )}
              </Box>
            ) : (
            <TableContainer
              component={Paper}
              variant="outlined"
              aria-busy={tableLoadingMore}
              sx={{
                borderRadius: 2,
                overflowX: 'auto',
                ...(tableLoadingMore ? { opacity: 0.72, transition: 'opacity 0.2s' } : {}),
              }}
            >
            <Table size="small" sx={{ minWidth: 640, tableLayout: 'fixed', width: '100%' }} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell width="6%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    #
                  </TableCell>
                  <TableCell width="32%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    소환사 명
                  </TableCell>
                  <TableCell width="12%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    서버
                  </TableCell>
                  <TableCell width="14%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    점수
                  </TableCell>
                  <TableCell width="36%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    승률
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                        표시할 랭킹 데이터가 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  allRows.map((r) => {
                    const profileHref =
                      r.wizardId !== '' ? `/rta/player/${encodeURIComponent(r.wizardId)}` : null;
                    const serverLabel = r.country ? r.country.toUpperCase() : '—';
                    return (
                      <TableRow
                        key={r.wizardId || `${r.rank}-${r.name}`}
                        hover
                        onClick={profileHref ? (e) => handleRowClick(e, profileHref) : undefined}
                        onAuxClick={profileHref ? (e) => handleRowAuxClick(e, profileHref) : undefined}
                        onKeyDown={
                          profileHref
                            ? (e) => handleRowKeyDown(e, profileHref)
                            : undefined
                        }
                        tabIndex={profileHref ? 0 : -1}
                        role={profileHref ? 'link' : undefined}
                        sx={
                          profileHref
                            ? {
                                cursor: 'pointer',
                                '&:focus-visible': {
                                  outline: '2px solid',
                                  outlineColor: 'primary.main',
                                  outlineOffset: '-2px',
                                },
                              }
                            : undefined
                        }
                      >
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {r.country && r.country !== '—' && /^[a-z]{2}$/i.test(r.country) ? (
                              <Box
                                component="img"
                                src={`https://flagcdn.com/w40/${r.country.toLowerCase()}.png`}
                                alt=""
                                sx={{ width: 22, height: 15, objectFit: 'cover', borderRadius: 0.5, flexShrink: 0 }}
                              />
                            ) : null}
                            <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {serverLabel}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell
                          sx={{
                            verticalAlign: 'middle',
                            py: 1.25,
                            fontWeight: 800,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <RtaRatingStarIcons rating={r.ratingId} size={13} />
                            {r.score.toLocaleString()}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle', py: 1.25 }}>
                          <WinRateBar wins={r.winCount} total={r.matchCount} />
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

          {(hasMore || tableLoadingMore) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Button
                variant="outlined"
                size={isNarrow ? 'small' : 'medium'}
                onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                disabled={fetchingPage}
                startIcon={tableLoadingMore ? <CircularProgress size={16} thickness={4} /> : undefined}
                fullWidth={isNarrow}
                sx={(t) => ({
                  borderRadius: 2,
                  maxWidth: isNarrow ? 400 : 'none',
                  mx: isNarrow ? 'auto' : 0,
                  px: 5,
                  py: 1,
                  fontWeight: 700,
                  fontSize: isNarrow ? '0.85rem' : '0.9rem',
                  borderColor: `${t.palette.primary.main}80`,
                  '&:hover': { borderColor: t.palette.primary.main },
                })}
              >
                {tableLoadingMore ? '불러오는 중…' : '더보기'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
