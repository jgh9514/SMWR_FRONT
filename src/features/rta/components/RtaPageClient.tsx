'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Avatar,
  Pagination,
  Collapse,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  useMediaQuery,
  useTheme,
  Chip,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useRtaListPage, resolveRtaSeasonIdForApi } from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { getMonsterImageUrl, getSwexPlayerImageUrl } from '@/shared/utils/image';
import { processRawMatchToMatchItem } from '@/features/rta/utils/processRtaMatchItem';
import type { MatchItem, RtaData, RawMatchItem } from '@/types';
import {
  RTA_TIER_KEY_FILTER_ITEMS,
  DEFAULT_RTA_LIST_TIER_KEY,
  type RtaTierKey,
} from '@/features/rta/types/rta';

const SEASON_FALLBACK = [{ value: 'S36_SPECIAL', label: '36시즌 스페셜리그' }];

/** /rta 매치 목록: 최신순 기준 앞쪽(최근) 페이지만 최대 N페이지까지 노출 */
const MAX_RTA_LIST_PAGES = 10;

/** 승자 열 — 에메랄드 계열 그라데이션 */
function rtaSideBgWin(theme: Theme) {
  const d = theme.palette.mode === 'dark';
  return d
    ? `linear-gradient(160deg, ${alpha('#34d399', 0.28)} 0%, ${alpha('#059669', 0.42)} 55%, ${alpha('#064e3b', 0.55)} 100%)`
    : `linear-gradient(160deg, ${alpha('#ecfdf5', 1)} 0%, ${alpha('#6ee7b7', 0.35)} 50%, ${alpha('#a7f3d0', 0.55)} 100%)`;
}

/** 패자 열 — 슬레이트 + 은은한 로즈 */
function rtaSideBgLose(theme: Theme) {
  const d = theme.palette.mode === 'dark';
  return d
    ? `linear-gradient(160deg, ${alpha('#475569', 0.4)} 0%, ${alpha('#7f1d1d', 0.22)} 100%)`
    : `linear-gradient(160deg, ${alpha('#f8fafc', 1)} 0%, ${alpha('#fecdd3', 0.42)} 70%, ${alpha('#fda4af', 0.28)} 100%)`;
}

const RTA_BADGE_WIN = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
const RTA_BADGE_LOSE = 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)';

export default function RtaPageClient() {
  const theme = useTheme();
  const rtaStarSize = useMediaQuery(theme.breakpoints.up('md')) ? 12 : 10;
  const [expandedMatches, setExpandedMatches] = useState<{ [key: number]: boolean }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [tierKey, setTierKey] = useState<'' | RtaTierKey>(DEFAULT_RTA_LIST_TIER_KEY);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [seasonSelectValue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tierKey]);

  const {
    data: pageResponse,
    isLoading: isLoadingPage,
    error: pageError,
    refetch: refetchPage,
  } = useRtaListPage({
    limit: DEFAULT_PAGE_SIZE,
    offset: (currentPage - 1) * DEFAULT_PAGE_SIZE,
    seasonCode: seasonSelectValue,
    seasonId: seasonIdForApi,
    tierKey: tierKey === '' ? undefined : tierKey,
  });

  const rtaData = useMemo<RtaData | null>(() => {
    if (!pageResponse) return null;
    const statsResponse = pageResponse.stats;
    if (!statsResponse) return null;

    const hasMore = Boolean(statsResponse.hasMore ?? statsResponse.has_more);
    const rawMatches = pageResponse.matches ?? [];
    const processedMatches = Array.isArray(rawMatches)
      ? rawMatches.map((m: RawMatchItem) => processRawMatchToMatchItem(m))
      : [];

    /** 전체 COUNT 없음 — 다음 페이지가 있으면 최소 currentPage+1페이지까지 존재로 간주(최대 10) */
    const totalPages = Math.min(
      MAX_RTA_LIST_PAGES,
      hasMore ? Math.max(currentPage + 1, 1) : Math.max(currentPage, 1),
    );
    return {
      stats: statsResponse,
      matches: processedMatches,
      totalPages,
    };
  }, [pageResponse, currentPage]);

  const paginatedMatches = rtaData?.matches || [];

  /** 총 페이지가 줄었을 때(시즌 변경·상한 적용) 현재 페이지 보정 */
  useEffect(() => {
    const tp = rtaData?.totalPages ?? 0;
    if (tp >= 1 && currentPage > tp) {
      setCurrentPage(tp);
    }
  }, [rtaData?.totalPages, currentPage]);

  /** 페이지 바뀌면 접기 상태 초기화(기본은 전부 펼침) */
  useEffect(() => {
    setExpandedMatches({});
  }, [currentPage]);

  /** 기본 펼침: 명시적으로 false일 때만 접힘 */
  const toggleMatch = useCallback((index: number) => {
    setExpandedMatches((prev) => {
      const open = prev[index] !== false;
      return { ...prev, [index]: !open };
    });
  }, []);

  const changePage = (page: number) => {
    setCurrentPage(page);
  };

  const pageBg = (t: Theme) =>
    t.palette.mode === 'dark'
      ? `linear-gradient(180deg, ${alpha('#0f172a', 1)} 0%, ${alpha('#1e293b', 1)} 40%, ${alpha('#0f172a', 1)} 100%)`
      : `linear-gradient(180deg, ${alpha('#f0fdfa', 1)} 0%, ${alpha('#ecfeff', 0.9)} 35%, ${alpha('#f8fafc', 1)} 100%)`;

  if (isLoadingPage) {
    return (
      <Box
        sx={(theme) => ({
          minHeight: '50vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: pageBg(theme),
        })}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={56} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 500 }}>매치 데이터를 불러오는 중…</Typography>
        </Box>
      </Box>
    );
  }

  if (pageError) {
    return (
      <Box
        sx={(theme) => ({
          minHeight: '50vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: pageBg(theme),
          px: 2,
        })}
      >
        <Card
          elevation={0}
          sx={(theme) => ({
            maxWidth: 420,
            borderRadius: 3,
            border: '1px solid',
            borderColor: alpha(theme.palette.error.main, 0.25),
            background: alpha(theme.palette.background.paper, 0.85),
            backdropFilter: 'blur(12px)',
          })}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="error" sx={{ mb: 2, fontWeight: 600 }}>
              {pageError.message || '데이터를 불러오는데 실패했습니다.'}
            </Typography>
            <Button variant="contained" onClick={() => refetchPage()} sx={{ mt: 1, borderRadius: 2, px: 3 }}>
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const hasNoData = !rtaData || paginatedMatches.length === 0;

  if (hasNoData) {
    return (
      <Box
        sx={(theme) => ({
          minHeight: '50vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: pageBg(theme),
          px: 2,
        })}
      >
        <Card
          elevation={0}
          sx={(theme) => ({
            borderRadius: 3,
            border: '1px solid',
            borderColor: alpha(theme.palette.divider, 0.2),
            background: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(10px)',
          })}
        >
          <CardContent sx={{ textAlign: 'center', py: 5, px: 4 }}>
            <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
              표시할 매치가 없습니다
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={(theme) => ({
        minHeight: '100%',
        background: pageBg(theme),
        pb: { xs: 3, md: 5 },
      })}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Card
          elevation={0}
          sx={(theme) => ({
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: alpha(theme.palette.divider, 0.12),
            background:
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.background.paper, 0.55)
                : alpha('#ffffff', 0.72),
            backdropFilter: 'blur(16px)',
            boxShadow: theme.palette.mode === 'dark' ? '0 24px 80px rgba(0,0,0,0.35)' : '0 20px 60px rgba(15,23,42,0.08)',
          })}
        >
          <Box
            sx={(theme) => ({
              px: { xs: 2, md: 3 },
              pt: { xs: 2.5, md: 3 },
              pb: 2,
              borderBottom: '1px solid',
              borderColor: alpha(theme.palette.divider, 0.15),
              background:
                theme.palette.mode === 'dark'
                  ? `linear-gradient(135deg, ${alpha('#10b981', 0.12)} 0%, transparent 55%)`
                  : `linear-gradient(135deg, ${alpha('#ccfbf1', 0.9)} 0%, ${alpha('#ffffff', 0)} 50%)`,
            })}
          >
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
                mb: 2,
              }}
            >
              <Box>
                <Typography
                  variant="overline"
                  sx={{ letterSpacing: '0.2em', color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}
                >
                  REAL-TIME ARENA
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  RTA 매치
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="rta-list-season-label">시즌</InputLabel>
                  <Select
                    labelId="rta-list-season-label"
                    label="시즌"
                    value={seasonSelectValue}
                    onChange={(e) => setSeason(String(e.target.value))}
                    sx={{ borderRadius: 2 }}
                  >
                    {seasonOptions.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="rta-list-tier-label">티어</InputLabel>
                  <Select
                    labelId="rta-list-tier-label"
                    label="티어"
                    value={tierKey}
                    onChange={(e) => setTierKey(e.target.value as '' | RtaTierKey)}
                    sx={{ borderRadius: 2 }}
                    MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
                    renderValue={(selected: '' | RtaTierKey) => {
                      if (selected === '' || selected == null) {
                        return (
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            전체
                          </Typography>
                        );
                      }
                      const pr = RTA_TIER_KEY_FILTER_ITEMS.find((x) => x.value === selected)?.previewRating;
                      if (pr == null) return null;
                      return (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', py: 0.25 }}>
                          <RtaRatingStarIcons rating={pr} size={20} gap={2} />
                        </Box>
                      );
                    }}
                  >
                    {RTA_TIER_KEY_FILTER_ITEMS.map((o) => (
                      <MenuItem
                        key={o.value || 'all'}
                        value={o.value}
                        sx={{ minHeight: 44, justifyContent: 'center' }}
                        aria-label={o.value === '' ? '티어 전체' : `티어 ${o.value}`}
                      >
                        {o.value === '' ? (
                          <Typography variant="body2" color="text.secondary">
                            전체
                          </Typography>
                        ) : o.previewRating != null ? (
                          <Box
                            component="span"
                            aria-hidden
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '100%',
                              py: 0.5,
                            }}
                          >
                            <RtaRatingStarIcons rating={o.previewRating} size={22} gap={2} />
                          </Box>
                        ) : null}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Box>

          <CardContent sx={{ p: { xs: 2, md: 2.5 }, pt: { xs: 2, md: 2.5 } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
            {paginatedMatches.map((match: MatchItem, index: number) => {
              const isExpanded = expandedMatches[index] !== false;
              const p1Wins = match.winnerPosition === '1';
              return (
                <Card
                  key={`${match.p1Id}-${match.p2Id}-${match.date}-${index}`}
                  elevation={0}
                  sx={(theme) => ({
                    cursor: 'pointer',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: alpha(theme.palette.divider, 0.14),
                    boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.25)' : '0 12px 40px rgba(15,23,42,0.07)',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow:
                        theme.palette.mode === 'dark' ? '0 12px 48px rgba(0,0,0,0.35)' : '0 16px 48px rgba(15,23,42,0.1)',
                    },
                  })}
                  onClick={() => toggleMatch(index)}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: 'stretch',
                      minHeight: { sm: 120 },
                    }}
                  >
                    <Box
                      sx={(theme) => ({
                        flex: 1,
                        background: p1Wins ? rtaSideBgWin(theme) : rtaSideBgLose(theme),
                        px: { xs: 2, md: 2.5 },
                        py: { xs: 2, md: 2.25 },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 0.75,
                        minWidth: 0,
                        position: 'relative',
                      })}
                    >
                      <Chip
                        size="small"
                        label={p1Wins ? 'WIN' : 'LOSE'}
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          color: '#fff',
                          background: p1Wins ? RTA_BADGE_WIN : RTA_BADGE_LOSE,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          '& .MuiChip-label': { px: 1 },
                        }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, width: '100%' }}>
                        <Avatar
                          src={getSwexPlayerImageUrl(match.p1ChannelUid || match.p1Id)}
                          sx={{
                            width: { xs: 44, md: 52 },
                            height: { xs: 44, md: 52 },
                            boxShadow: p1Wins ? `0 0 0 3px ${alpha('#10b981', 0.65)}` : '0 2px 12px rgba(0,0,0,0.12)',
                          }}
                        />
                        <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.65 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              flexWrap: 'wrap',
                              justifyContent: 'flex-start',
                            }}
                          >
                            {match.p1Country && (
                              <Box
                                component="img"
                                src={`https://flagcdn.com/w40/${match.p1Country.toLowerCase()}.png`}
                                alt={match.p1Country}
                                sx={{ width: { xs: 16, md: 20 }, height: { xs: 12, md: 15 }, flexShrink: 0 }}
                              />
                            )}
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{
                                fontSize: { xs: '0.8rem', md: '0.9rem' },
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {match.p1Name || 'Player'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            <RtaRatingStarIcons rating={match.p1Rating} size={rtaStarSize} />
                            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, fontWeight: 600 }}>
                              {match.p1Score}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    <Box
                      sx={(theme) => ({
                        flexShrink: 0,
                        width: { xs: '100%', sm: 92 },
                        py: { xs: 1.25, sm: 0 },
                        px: { xs: 2, sm: 0.5 },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.75,
                        borderTop: { xs: `1px solid ${alpha(theme.palette.divider, 0.2)}`, sm: 'none' },
                        borderLeft: { sm: `1px solid ${alpha(theme.palette.divider, 0.18)}` },
                        borderRight: { sm: `1px solid ${alpha(theme.palette.divider, 0.18)}` },
                        background: alpha(theme.palette.background.paper, 0.25),
                      })}
                    >
                      <Typography
                        variant="overline"
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          letterSpacing: '0.18em',
                          color: 'text.secondary',
                          lineHeight: 1,
                        }}
                      >
                        VS
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                        {(() => {
                          if (!match.date) return null;
                          try {
                            const date = new Date(match.date);
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            return (
                              <>
                                <Typography variant="caption" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' }, fontWeight: 600, textAlign: 'center' }}>
                                  {`${year}-${month}-${day}`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', md: '0.7rem' }, textAlign: 'center' }}>
                                  {`${hours}:${minutes}`}
                                </Typography>
                              </>
                            );
                          } catch {
                            return (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textAlign: 'center' }}>
                                {match.date}
                              </Typography>
                            );
                          }
                        })()}
                      </Box>
                      <ExpandMoreIcon
                        sx={(theme) => ({
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s',
                          color: theme.palette.text.secondary,
                          fontSize: { xs: 22, md: 26 },
                        })}
                      />
                    </Box>

                    <Box
                      sx={(theme) => ({
                        flex: 1,
                        background: !p1Wins ? rtaSideBgWin(theme) : rtaSideBgLose(theme),
                        px: { xs: 2, md: 2.5 },
                        py: { xs: 2, md: 2.25 },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 0.75,
                        minWidth: 0,
                      })}
                    >
                      <Chip
                        size="small"
                        label={!p1Wins ? 'WIN' : 'LOSE'}
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          color: '#fff',
                          background: !p1Wins ? RTA_BADGE_WIN : RTA_BADGE_LOSE,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          '& .MuiChip-label': { px: 1 },
                        }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, width: '100%', flexDirection: 'row-reverse' }}>
                        <Avatar
                          src={getSwexPlayerImageUrl(match.p2ChannelUid || match.p2Id)}
                          sx={{
                            width: { xs: 44, md: 52 },
                            height: { xs: 44, md: 52 },
                            boxShadow: !p1Wins ? `0 0 0 3px ${alpha('#10b981', 0.65)}` : '0 2px 12px rgba(0,0,0,0.12)',
                          }}
                        />
                        <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.65, alignItems: 'flex-end' }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              flexWrap: 'wrap',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{
                                fontSize: { xs: '0.8rem', md: '0.9rem' },
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                textAlign: 'right',
                              }}
                            >
                              {match.p2Name || 'Opponent'}
                            </Typography>
                            {match.p2Country && (
                              <Box
                                component="img"
                                src={`https://flagcdn.com/w40/${match.p2Country.toLowerCase()}.png`}
                                alt={match.p2Country}
                                sx={{ width: { xs: 16, md: 20 }, height: { xs: 12, md: 15 }, flexShrink: 0 }}
                              />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, fontWeight: 600 }}>
                              {match.p2Score}
                            </Typography>
                            <RtaRatingStarIcons rating={match.p2Rating} size={rtaStarSize} />
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                    <Collapse in={isExpanded}>
                      <Box
                        sx={(theme) => ({
                          mt: 0,
                          pt: 2,
                          pb: 1.5,
                          px: { xs: 1.5, sm: 2 },
                          borderTop: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                          background:
                            theme.palette.mode === 'dark'
                              ? alpha(theme.palette.background.default, 0.35)
                              : alpha(theme.palette.grey[50], 0.85),
                        })}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: { xs: 0.5, md: 1 },
                            flexDirection: 'row',
                          }}
                        >
                          <Box>
                            <Box
                              sx={{
                                mb: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              <Box
                                sx={{
                                  width: '100%',
                                  background: match.winnerPosition === '1' ? RTA_BADGE_WIN : RTA_BADGE_LOSE,
                                  clipPath: 'polygon(0% 0%, 80% 0%, 100% 100%, 0% 100%)',
                                  px: { xs: 1, md: 1.5 },
                                  py: { xs: 0.35, md: 0.45 },
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
                                }}
                              >
                                <Typography
                                  sx={{
                                    color: '#fff',
                                    fontSize: { xs: '0.65rem', md: '0.72rem' },
                                    fontWeight: 800,
                                    letterSpacing: '0.08em',
                                    lineHeight: 1,
                                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
                                    textAlign: 'left',
                                  }}
                                >
                                  {match.winnerPosition === '1' ? 'WIN' : 'LOSE'}
                                </Typography>
                              </Box>
                            </Box>
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gridTemplateRows: 'repeat(2, 1fr)',
                                gap: { xs: 0.25, md: 0.5 },
                                width: 'fit-content',
                                gridTemplateAreas: `"fp-0 fp-1 fp-3" "fp-0 fp-2 fp-4"`,
                              }}
                            >
                              {match.p1Units?.map((unit, unitIndex) => {
                                let gridArea = '';
                                if (unitIndex === 0) gridArea = 'fp-0';
                                else if (unitIndex === 1) gridArea = 'fp-1';
                                else if (unitIndex === 2) gridArea = 'fp-2';
                                else if (unitIndex === 3) gridArea = 'fp-3';
                                else if (unitIndex === 4) gridArea = 'fp-4';

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
                                      alignSelf: unitIndex === 0 ? 'center' : 'stretch',
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
                                          backgroundImage: 'linear-gradient(to bottom right, transparent 48%, #fff 48%, #fff 52%, transparent 52%)',
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
                              {(!match.p1Units || match.p1Units.length === 0) && (
                                <Box sx={{ gridColumn: '1 / -1', textAlign: 'left', py: 1 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                                    몬스터 정보가 없습니다
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>

                          <Typography
                            variant="overline"
                            sx={{
                              alignSelf: 'center',
                              fontSize: { xs: '0.7rem', md: '0.75rem' },
                              fontWeight: 800,
                              letterSpacing: '0.2em',
                              color: 'text.secondary',
                              px: { xs: 0.5, md: 1 },
                            }}
                          >
                            VS
                          </Typography>

                          <Box>
                            <Box
                              sx={{
                                mb: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: 0.5,
                              }}
                            >
                              <Box
                                sx={{
                                  width: '100%',
                                  background: match.winnerPosition === '2' ? RTA_BADGE_WIN : RTA_BADGE_LOSE,
                                  clipPath: 'polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)',
                                  px: { xs: 1, md: 1.5 },
                                  py: { xs: 0.35, md: 0.45 },
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
                                }}
                              >
                                <Typography
                                  sx={{
                                    color: '#fff',
                                    fontSize: { xs: '0.65rem', md: '0.72rem' },
                                    fontWeight: 800,
                                    letterSpacing: '0.08em',
                                    lineHeight: 1,
                                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
                                    textAlign: 'right',
                                  }}
                                >
                                  {match.winnerPosition === '2' ? 'WIN' : 'LOSE'}
                                </Typography>
                              </Box>
                            </Box>
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gridTemplateRows: 'repeat(2, 1fr)',
                                gap: { xs: 0.25, md: 0.5 },
                                width: 'fit-content',
                                ml: 'auto',
                                gridTemplateAreas: `"fp-1 fp-3 fp-5" "fp-2 fp-4 fp-5"`,
                              }}
                            >
                              {match.p2Units?.map((unit, unitIndex) => {
                                const units = match.p2Units;
                                let gridArea = '';
                                if (unitIndex === 0) gridArea = 'fp-1';
                                else if (unitIndex === 1) gridArea = 'fp-2';
                                else if (unitIndex === 2) gridArea = 'fp-3';
                                else if (unitIndex === 3) gridArea = 'fp-4';
                                else if (unitIndex === 4) gridArea = 'fp-5';

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
                                      alignSelf: units && unitIndex === units.length - 1 ? 'center' : 'stretch',
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
                                          backgroundImage: 'linear-gradient(to bottom right, transparent 48%, #fff 48%, #fff 52%, transparent 52%)',
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
                              {(!match.p2Units || match.p2Units.length === 0) && (
                                <Box sx={{ gridColumn: '1 / -1', textAlign: 'right', py: 1 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                                    몬스터 정보가 없습니다
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    </Collapse>
                </Card>
              );
            })}
          </Box>

          {rtaData.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 1 }}>
              <Pagination
                count={rtaData.totalPages}
                page={currentPage}
                onChange={(_, page) => changePage(page)}
                color="primary"
                size="medium"
                sx={(theme) => ({
                  '& .MuiPaginationItem-root': {
                    fontSize: { xs: '0.875rem', md: '0.95rem' },
                    borderRadius: 2,
                  },
                  '& .Mui-selected': {
                    fontWeight: 700,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.95)} 0%, ${alpha(theme.palette.primary.dark, 0.85)} 100%)`,
                    color: theme.palette.primary.contrastText,
                  },
                })}
              />
            </Box>
          )}
        </CardContent>
      </Card>
      </Container>
    </Box>
  );
}
