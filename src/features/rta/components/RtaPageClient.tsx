'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  CardContent,
  CircularProgress,
  Typography,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import {
  useRtaListPage,
  useRtaRatingGradeRules,
  useRtaSeasonSelect,
  buildMonsterStatsTierBody,
} from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
import RtaTierFilterMenu from '@/features/rta/components/RtaTierFilterMenu';
import { RTA_SELECT_MENU_PROPS } from '@/features/rta/components/RtaSeasonTierSelectRow';
import { blurFocusedMenuItem } from '@/features/rta/rtaMenuModalProps';
import RtaMatchListCard from '@/features/rta/components/RtaMatchListCard';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { processRawMatchToMatchItem } from '@/features/rta/utils/processRtaMatchItem';
import type { MatchItem, RawMatchItem } from '@/types';

export default function RtaPageClient() {
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
              return (
                <RtaMatchListCard
                  key={`${match.p1Id}-${match.p2Id}-${match.date}-${index}`}
                  match={match}
                />
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
