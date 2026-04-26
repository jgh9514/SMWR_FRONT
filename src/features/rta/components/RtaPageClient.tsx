'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Avatar,
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
import {
  useRtaListPage,
  useRtaRatingGradeRules,
  useRtaSeasonSelect,
  buildMonsterStatsTierBody,
} from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';
import RtaTierFilterMenu from '@/features/rta/components/RtaTierFilterMenu';
import { RTA_SELECT_MENU_PROPS } from '@/features/rta/components/RtaSeasonTierSelectRow';
import { blurFocusedMenuItem } from '@/features/rta/rtaMenuModalProps';
import RtaUnitPickGrid from '@/features/rta/components/RtaUnitPickGrid';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import { processRawMatchToMatchItem } from '@/features/rta/utils/processRtaMatchItem';
import type { MatchItem, RawMatchItem } from '@/types';

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
  const [offset, setOffset] = useState(0);
  const [allMatches, setAllMatches] = useState<MatchItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [tierSelection, setTierSelection] = useState('');

  const { data: seasonsData } = useRtaSeasonsContext();
  const { seasonSelectValue, seasonIdForApi, setSeason, seasonOptions } = useRtaSeasonSelect(seasonsData);

  const { data: gradeRules = [] } = useRtaRatingGradeRules();

  const tierApi = useMemo(() => {
    const b = buildMonsterStatsTierBody(tierSelection, gradeRules);
    if ('ratingId' in b && b.ratingId != null && b.ratingId > 0) {
      return { ratingId: b.ratingId, ratingIds: null as number[] | null };
    }
    if ('ratingIds' in b && b.ratingIds != null && b.ratingIds.length > 0) {
      return { ratingId: null as number | null, ratingIds: b.ratingIds };
    }
    return { ratingId: null as number | null, ratingIds: null as number[] | null };
  }, [tierSelection, gradeRules]);

  /** 시즌·티어 필터가 바뀌면 목록 초기화 */
  useEffect(() => {
    setOffset(0);
    setAllMatches([]);
    setHasMore(false);
    setExpandedMatches({});
  }, [seasonSelectValue, tierSelection]);

  const {
    data: pageResponse,
    isLoading: isLoadingPage,
    isFetching,
    error: pageError,
    refetch: refetchPage,
  } = useRtaListPage({
    limit: DEFAULT_PAGE_SIZE,
    offset,
    seasonCode: seasonSelectValue,
    seasonId: seasonIdForApi,
    ratingId: tierApi.ratingId,
    ratingIds: tierApi.ratingIds,
  });

  /** 새 데이터 도착 시 누적 */
  useEffect(() => {
    if (!pageResponse) return;
    const rawMatches = pageResponse.matches ?? [];
    const newMatches = Array.isArray(rawMatches)
      ? rawMatches.map((m: RawMatchItem) => processRawMatchToMatchItem(m))
      : [];
    if (offset === 0) {
      setAllMatches(newMatches);
    } else {
      setAllMatches((prev) => [...prev, ...newMatches]);
    }
    setHasMore(Boolean(pageResponse.stats?.hasMore));
  // offset이 바뀌어야만 재실행 — pageResponse 의존성은 offset 변경 후 도착하는 응답이 처리됨
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageResponse]);

  const isLoadingMore = isFetching && offset > 0;
  const isInitialLoading = isLoadingPage && offset === 0;

  /** 기본 펼침: 명시적으로 false일 때만 접힘 */
  const toggleMatch = useCallback((index: number) => {
    setExpandedMatches((prev) => {
      const open = prev[index] !== false;
      return { ...prev, [index]: !open };
    });
  }, []);

  const loadMore = () => {
    setOffset((prev) => prev + DEFAULT_PAGE_SIZE);
  };

  const pageBg = (t: Theme) =>
    t.palette.mode === 'dark'
      ? `linear-gradient(180deg, ${alpha('#0f172a', 1)} 0%, ${alpha('#1e293b', 1)} 40%, ${alpha('#0f172a', 1)} 100%)`
      : `linear-gradient(180deg, ${alpha('#f0fdfa', 1)} 0%, ${alpha('#ecfeff', 0.9)} 35%, ${alpha('#f8fafc', 1)} 100%)`;

  const hasNoData = allMatches.length === 0;

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
                    onChange={(e) => { blurFocusedMenuItem(); setSeason(String(e.target.value)); }}
                    MenuProps={RTA_SELECT_MENU_PROPS}
                    sx={{ borderRadius: 2 }}
                  >
                    {seasonOptions.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <RtaTierFilterMenu value={tierSelection} onChange={setTierSelection} rules={gradeRules} />
              </Box>
            </Box>
          </Box>

          <CardContent sx={{ p: { xs: 2, md: 2.5 }, pt: { xs: 2, md: 2.5 } }}>
            {isInitialLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress size={48} thickness={4} sx={{ color: 'primary.main' }} />
                  <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 500 }}>매치 데이터를 불러오는 중…</Typography>
                </Box>
              </Box>
            )}
            {!isInitialLoading && pageError && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color="error" sx={{ mb: 2, fontWeight: 600 }}>
                  {pageError.message || '데이터를 불러오는데 실패했습니다.'}
                </Typography>
                <Button variant="contained" onClick={() => refetchPage()} sx={{ borderRadius: 2, px: 3 }}>
                  다시 시도
                </Button>
              </Box>
            )}
            {!isInitialLoading && !pageError && hasNoData && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                  표시할 매치가 없습니다
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
            {!isInitialLoading && !pageError && !hasNoData && allMatches.map((match: MatchItem, index: number) => {
              const isExpanded = expandedMatches[index] !== false;
              const p1Wins = match.winnerPosition === '1';
              const expLeftUnits = p1Wins ? (match.p1Units ?? []) : (match.p2Units ?? []);
              const expLeftSide: 'p1' | 'p2' = p1Wins ? 'p1' : 'p2';
              const expRightUnits = p1Wins ? (match.p2Units ?? []) : (match.p1Units ?? []);
              const expRightSide: 'p1' | 'p2' = p1Wins ? 'p2' : 'p1';
              const expLeftFirstPick =
                (expLeftSide === 'p1' ? match.p1FirstPick : match.p2FirstPick) === '1';
              const expRightFirstPick =
                (expRightSide === 'p1' ? match.p1FirstPick : match.p2FirstPick) === '1';
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
                      flexDirection: 'row',
                      alignItems: 'stretch',
                      minHeight: 64,
                    }}
                  >
                    <Box
                      sx={(theme) => ({
                        flex: 1,
                        background: p1Wins ? rtaSideBgWin(theme) : rtaSideBgLose(theme),
                        px: { xs: 1.5, md: 2 },
                        py: { xs: 1.5, md: 2 },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 0.5,
                        minWidth: 0,
                        overflow: 'hidden',
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
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, gap: { xs: 0.5, md: 1.25 }, width: '100%', overflow: 'hidden' }}>
                        <Avatar
                          src={getSwexPlayerImageUrl(match.p1ChannelUid || match.p1Id)}
                          sx={{
                            width: { xs: 40, md: 52 },
                            height: { xs: 40, md: 52 },
                            flexShrink: 0,
                            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                          }}
                        />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                            {match.p1Country && (
                              <Box
                                component="img"
                                src={`https://flagcdn.com/w40/${match.p1Country.toLowerCase()}.png`}
                                alt={match.p1Country}
                                sx={{ width: { xs: 14, md: 18 }, height: { xs: 10, md: 13 }, flexShrink: 0 }}
                              />
                            )}
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{ fontSize: { xs: '0.75rem', md: '0.9rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {match.p1Name || 'Player'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <RtaRatingStarIcons rating={match.p1Rating} size={rtaStarSize} />
                            {match.p1Score > 0 && (
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, fontWeight: 600 }}>
                                {match.p1Score}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    <Box
                      sx={(theme) => ({
                        flexShrink: 0,
                        width: { xs: 56, sm: 72, md: 92 },
                        py: 0,
                        px: { xs: 0.25, md: 0.5 },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.75,
                        borderLeft: `1px solid ${alpha(theme.palette.divider, 0.18)}`,
                        borderRight: `1px solid ${alpha(theme.palette.divider, 0.18)}`,
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
                                <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.75rem' }, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  {`${year}-${month}-${day}`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.55rem', sm: '0.6rem', md: '0.7rem' }, textAlign: 'center' }}>
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
                        px: { xs: 1.5, md: 2 },
                        py: { xs: 1.5, md: 2 },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 0.5,
                        minWidth: 0,
                        overflow: 'hidden',
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
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row-reverse' }, alignItems: { md: 'center' }, gap: { xs: 0.5, md: 1.25 }, width: '100%', overflow: 'hidden' }}>
                        <Avatar
                          src={getSwexPlayerImageUrl(match.p2ChannelUid || match.p2Id)}
                          sx={{
                            width: { xs: 40, md: 52 },
                            height: { xs: 40, md: 52 },
                            flexShrink: 0,
                            alignSelf: { xs: 'flex-end', md: 'auto' },
                            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                          }}
                        />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, alignItems: 'flex-end' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{ fontSize: { xs: '0.75rem', md: '0.9rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}
                            >
                              {match.p2Name || 'Opponent'}
                            </Typography>
                            {match.p2Country && (
                              <Box
                                component="img"
                                src={`https://flagcdn.com/w40/${match.p2Country.toLowerCase()}.png`}
                                alt={match.p2Country}
                                sx={{ width: { xs: 14, md: 18 }, height: { xs: 10, md: 13 }, flexShrink: 0 }}
                              />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {match.p2Score > 0 && (
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, fontWeight: 600 }}>
                                {match.p2Score}
                              </Typography>
                            )}
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
                                  background: RTA_BADGE_WIN,
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
                                  WIN
                                </Typography>
                              </Box>
                            </Box>
                            <RtaUnitPickGrid
                              units={expLeftUnits}
                              isFirstPickInDraft={expLeftFirstPick}
                              rowAlign="start"
                            />
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
                                  background: RTA_BADGE_LOSE,
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
                                  LOSE
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ width: 'fit-content', ml: 'auto' }}>
                              <RtaUnitPickGrid
                                units={expRightUnits}
                                isFirstPickInDraft={expRightFirstPick}
                                rowAlign="end"
                              />
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    </Collapse>
                </Card>
              );
            })}
          </Box>

          {(hasMore || isLoadingMore) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 1 }}>
              <Button
                variant="outlined"
                onClick={loadMore}
                disabled={isFetching}
                startIcon={isLoadingMore ? <CircularProgress size={16} thickness={4} /> : undefined}
                sx={(theme) => ({
                  borderRadius: 2,
                  px: 5,
                  py: 1,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  borderColor: alpha(theme.palette.primary.main, 0.5),
                  '&:hover': { borderColor: theme.palette.primary.main },
                })}
              >
                {isLoadingMore ? '불러오는 중…' : '더보기'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
      </Container>
    </Box>
  );
}
