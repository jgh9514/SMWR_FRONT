'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Avatar,
  LinearProgress,
  Chip,
  IconButton,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Skeleton,
  Tooltip,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StarIcon from '@mui/icons-material/Star';
import BattleHistoryMonsterCell from '@/features/battle-history/components/BattleHistoryMonsterCell';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import {
  useMonsterDetailBasic,
  useMonsterDetailRecommended,
  useMonsterDetailHistory,
  useMonsterDetailRecentBattles,
  useDeckVoteMutation,
} from '@/hooks/api';
import { showToast } from '@/shared/lib/notification';
import AddDeckPopup from '@/components/popup/AddDeckPopup';
import DeckDetailPopup from '@/components/popup/DeckDetailPopup';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { getMonsterImageUrl } from '@/shared/utils/image';
import type { MonsterDetailParams, HistoryItem, RecommendedItem, EnemyData, RecentBattleItem } from '@/types';
import { useSiegeApiContextParams } from '@/shared/hooks/useSiegeApiContextParams';
import { resolveDeckId, resolveMonsterImageUrl } from '@/features/siege/utils/deckRecord';

/** 상단 총 경기 수와 맞추기 — 한 번에 불러올 최대 건수(초과 시 prev/next) */
const RECENT_BATTLES_MAX = 200;
const RECENT_BATTLES_FALLBACK = 50;
const RECENT_BATTLES_MOBILE_PAGE_SIZE = 20;
const RECENT_BATTLES_PAGE_SIZE = 5;

/** 이력 API deck_id — MyBatis camelCase·lowerCase 키 대응 */
function getHistoryRowDeckId(item: HistoryItem): string | null {
  return resolveDeckId(item as Record<string, unknown>);
}

function BasicInfoSkeleton() {
  return (
    <CardContent sx={{ '&:last-child': { paddingBottom: '16px' } }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'stretch' },
          gap: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexShrink: 0 }}>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ textAlign: 'center' }}>
              <Skeleton variant="rounded" width={100} height={100} sx={{ borderRadius: 0 }} />
              <Skeleton variant="text" width={60} sx={{ mx: 'auto', mt: 0.5 }} />
            </Box>
          ))}
        </Box>
        <Skeleton variant="rounded" height={60} sx={{ flex: 1, minWidth: 0 }} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, minmax(72px, 1fr))' },
            gap: 2,
            flexShrink: 0,
            width: { md: 'auto' },
            minWidth: { md: 280 },
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={70} />
          ))}
        </Box>
      </Box>
    </CardContent>
  );
}

function RecommendedSkeleton() {
  return (
    <CardContent>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} variant="rounded" height={70} sx={{ mb: 2 }} />
      ))}
    </CardContent>
  );
}

function HistorySkeleton() {
  return (
    <CardContent>
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1.5 }} />
      ))}
    </CardContent>
  );
}

function sectionCardSx(t: Theme) {
  return {
    borderRadius: 2,
    border: '1px solid',
    borderColor: alpha(t.palette.divider, 0.6),
    boxShadow: t.palette.mode === 'dark'
      ? '0 2px 12px rgba(0,0,0,0.3)'
      : '0 2px 12px rgba(15,23,42,0.06)',
    overflow: 'hidden',
  };
}

function sectionHeaderSx(t: Theme) {
  return {
    px: 2.5,
    py: 1.5,
    borderBottom: `1px solid ${alpha(t.palette.divider, 0.5)}`,
    background: t.palette.mode === 'dark'
      ? alpha(t.palette.background.default, 0.6)
      : alpha(t.palette.grey[50], 0.8),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };
}

function statBoxSx(t: Theme, highlight?: boolean) {
  return {
    textAlign: 'center' as const,
    px: 1.5,
    py: 1.25,
    borderRadius: 1.5,
    border: '1px solid',
    borderColor: highlight ? alpha(t.palette.primary.main, 0.3) : alpha(t.palette.divider, 0.6),
    bgcolor: highlight
      ? alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.15 : 0.06)
      : alpha(t.palette.background.default, t.palette.mode === 'dark' ? 0.4 : 0.5),
  };
}

function listRowSx(t: Theme) {
  return {
    borderRadius: 1.5,
    border: '1px solid',
    borderColor: alpha(t.palette.divider, 0.5),
    transition: 'border-color 0.18s, box-shadow 0.18s',
    '&:hover': {
      borderColor: alpha(t.palette.primary.main, 0.4),
      boxShadow: `0 2px 10px ${alpha(t.palette.primary.main, 0.08)}`,
    },
  };
}

export default function MonsterDetailPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const mobileQuery = useMediaQuery(theme.breakpoints.down('md'));
  const mobile = isClient ? mobileQuery : false;
  const detailParam = useMemo(() => {
    const rawDetail = params?.detail;
    const fromParams = Array.isArray(rawDetail) ? rawDetail[0] : rawDetail;
    if (typeof fromParams === 'string' && fromParams.trim()) {
      return fromParams.trim();
    }
    // 병렬 라우트 새로고침 등에서 params.detail 이 비는 경우 URL에서 복구
    const m = pathname?.match(/\/siege\/siege-detail\/([^/?#]+)/);
    if (m?.[1]) {
      try {
        return decodeURIComponent(m[1]);
      } catch {
        return m[1];
      }
    }
    return undefined;
  }, [params, pathname]);
  const parsedDetail = useMemo(() => {
    if (!detailParam) {
      return {
        schData: {} as Pick<MonsterDetailParams, 'dm1' | 'dm2' | 'dm3'>,
        matchId: null as string | null,
      };
    }
    // match_id에 '_'가 여러 번 있을 수 있어 첫 '_'만 키/매치 분리 (이전: split('_')는 매치 id가 잘림)
    const usIdx = detailParam.indexOf('_');
    const monsterKey = usIdx >= 0 ? detailParam.slice(0, usIdx) : detailParam;
    const matchIdRaw = usIdx >= 0 ? detailParam.slice(usIdx + 1) : '';
    const matchIdPart = matchIdRaw.length > 0 ? matchIdRaw : null;
    const [dm1, dm2, dm3] = monsterKey.split('-');
    return {
      schData: { dm1, dm2, dm3 },
      matchId: matchIdPart,
    };
  }, [detailParam]);
  const schData = parsedDetail.schData;
  const matchId = parsedDetail.matchId;
  const siegeApiContextParams = useSiegeApiContextParams();
  const [historyPage, setHistoryPage] = useState(1);
  const [recommendedPage, setRecommendedPage] = useState(1);
  const [recentPage, setRecentPage] = useState(1);
  const historyLimit = DEFAULT_PAGE_SIZE;
  const recommendedLimit = 5;

  // 상세 대상(방덱) 또는 조회 범위가 바뀌면 페이지를 1로 초기화한다.
  // 이전 상세에서 눌렀던 페이지 번호가 유지되면 "개수가 모자라 보이는" 현상이 생긴다.
  useEffect(() => {
    setHistoryPage(1);
    setRecommendedPage(1);
    setRecentPage(1);
  }, [detailParam, siegeApiContextParams]);

  const baseParams = useMemo<MonsterDetailParams | null>(() => {
    const dm1 = schData.dm1?.trim();
    const dm2 = schData.dm2?.trim();
    const dm3 = schData.dm3?.trim();
    // WAS 상세 SQL은 dm1~dm3·dm*_list가 모두 필요함. 하나라도 없으면 IN () 오류 방지
    if (!dm1 || !dm2 || !dm3) return null;
    return {
      dm1,
      dm2,
      dm3,
      ...(matchId && { match_id: matchId }),
      ...siegeApiContextParams,
    };
  }, [schData, matchId, siegeApiContextParams]);

  const recommendedParams = useMemo<MonsterDetailParams | null>(() => {
    if (!baseParams) return null;
    return {
      ...baseParams,
      recommendedLimit,
      recommendedOffset: recommendedPage,
    };
  }, [baseParams, recommendedLimit, recommendedPage]);

  const historyParams = useMemo<MonsterDetailParams | null>(() => {
    if (!baseParams) return null;
    return {
      ...baseParams,
      historyLimit,
      historyOffset: historyPage,
    };
  }, [baseParams, historyLimit, historyPage]);

  const basic = useMonsterDetailBasic(baseParams);
  const recommended = useMonsterDetailRecommended(recommendedParams);
  const history = useMonsterDetailHistory(historyParams);

  const enemyData =
    basic.data?.enemyData && Array.isArray(basic.data.enemyData) && basic.data.enemyData.length > 0
      ? (basic.data.enemyData[0] as EnemyData)
      : null;

  const historyTotalCount = typeof history.data?.historyTotalCount === 'number'
    ? history.data.historyTotalCount
    : 0;
  const fallbackTotalGames = typeof enemyData?.total_count === 'number' ? enemyData.total_count : 0;
  const recentNeedsPagination = fallbackTotalGames > RECENT_BATTLES_PAGE_SIZE;
  const recentPageSize = useMemo(() => {
    return RECENT_BATTLES_PAGE_SIZE;
  }, []);

  const recentParams = useMemo<MonsterDetailParams | null>(() => {
    if (!baseParams) return null;
    return {
      ...baseParams,
      recentLimit: recentNeedsPagination ? recentPageSize : recentPageSize,
      recentOffset: recentPage,
    };
  }, [baseParams, recentPageSize, recentPage, recentNeedsPagination]);

  const recentBattles = useMonsterDetailRecentBattles(recentParams, {
    enabled: !!recentParams && basic.isFetched,
  });
  const recentBattleTotalCount = typeof recentBattles.data?.recentBattleTotalCount === 'number'
    ? recentBattles.data.recentBattleTotalCount
    : 0;
  const summaryTotalGames = fallbackTotalGames;
  const recentDisplayTotalGames = fallbackTotalGames;
  const recentNeedsPaginationDisplay = recentDisplayTotalGames > RECENT_BATTLES_PAGE_SIZE;
  const recommendedList = recommended.data?.recommendedList || [];
  const recommendedHasNext = recommended.data?.recommendedHasNext ?? false;
  const historyList = history.data?.historyList || [];
  const historyHasNext = history.data?.historyHasNext ?? false;
  const recentBattleList = recentBattles.data?.recentBattleList || [];
  const recentBattleHasNext = recentBattles.data?.recentBattleHasNext ?? false;

  const [addPopupOpen, setAddPopupOpen] = useState(false);
  const [deckDetailPopupOpen, setDeckDetailPopupOpen] = useState(false);
  const [selectedDeckItem, setSelectedDeckItem] = useState<RecommendedItem | null>(null);

  const handleAddPopupClose = () => {
    setAddPopupOpen(false);
    recommended.refetch();
  };

  const handleDeckDetailPopupClose = () => {
    setDeckDetailPopupOpen(false);
    setSelectedDeckItem(null);
    void recommended.refetch();
    void history.refetch();
  };

  const deckVoteMutation = useDeckVoteMutation({
    onSuccess: () => {
      showToast.success('투표가 반영되었습니다.');
      void history.refetch();
      void recommended.refetch();
    },
    onError: () => {
      showToast.error('투표 처리에 실패했습니다.');
    },
  });

  const sendHistoryVote = (item: HistoryItem, vote: 'UP' | 'DOWN' | 'CLEAR') => {
    if (!schData.dm1 || !schData.dm2 || !schData.dm3) return;
    const a1 = item.atk_monster_1;
    const a2 = item.atk_monster_2;
    const a3 = item.atk_monster_3;
    if (!a1 || !a2 || !a3) {
      showToast.error('이 공격 조합 정보가 없어 투표할 수 없습니다.');
      return;
    }
    const did = getHistoryRowDeckId(item);
    deckVoteMutation.mutate({
      ...(did ? { deck_id: did } : {}),
      def_monster_1: schData.dm1,
      def_monster_2: schData.dm2,
      def_monster_3: schData.dm3,
      atk_monster_1: String(a1),
      atk_monster_2: String(a2),
      atk_monster_3: String(a3),
      vote,
    });
  };

  const goBack = () => {
    try {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
        return;
      }
    } catch {
      // no-op
    }
    router.push(matchId ? `/siege?match_id=${matchId}` : '/siege');
  };

  if (!detailParam) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!baseParams) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              상세 주소 형식이 올바르지 않습니다
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              방덱 상세는{' '}
              <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
                몬스터ID-몬스터ID-몬스터ID
              </Typography>
              형식(필요 시 뒤에 <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>_match_id</Typography>)이어야 합니다.
            </Typography>
            <Button variant="outlined" onClick={goBack} startIcon={<ArrowBackIcon />}>
              뒤로가기
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (basic.isError) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="error" sx={{ mb: 1 }}>
              데이터를 불러오는 중 오류가 발생했습니다
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {basic.error instanceof Error ? basic.error.message : '알 수 없는 오류가 발생했습니다.'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="outlined" onClick={() => basic.refetch()} color="primary">
                다시 시도
              </Button>
              <Button variant="outlined" onClick={goBack} startIcon={<ArrowBackIcon />}>
                뒤로가기
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (baseParams && !basic.isLoading && !enemyData) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              데이터를 찾을 수 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              요청하신 몬스터 정보가 존재하지 않거나 조회할 수 없습니다.
            </Typography>
            <Button variant="outlined" onClick={goBack} startIcon={<ArrowBackIcon />}>
              뒤로가기
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 2, md: 3 }, pb: { xs: 4, md: 5 } }}>
      <Container maxWidth="xl" disableGutters sx={{ px: { xs: 1.5, sm: 2, md: 3, xl: 4 }, maxWidth: '100%' }}>
        {/* 페이지 헤더 */}
        <Box sx={{ mb: { xs: 2.5, md: 3.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={goBack}
            size="small"
            sx={(t) => ({
              border: `1px solid ${alpha(t.palette.divider, 0.6)}`,
              borderRadius: 1.5,
              p: 0.75,
              '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
            })}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box>
            <Typography variant={mobile ? 'h6' : 'h5'} component="h1" fontWeight={700}>
              방어덱 상세
            </Typography>
            {enemyData && (
              <Typography variant="caption" color="text.secondary">
                {[enemyData.m1_kr_name, enemyData.m2_kr_name, enemyData.m3_kr_name].filter(Boolean).join(' · ')}
              </Typography>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
            },
            gap: { xs: 2, md: 2.5 },
          }}
        >
          {/* ── 기본 정보 ── */}
          <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}>
            <Card sx={(t) => sectionCardSx(t)}>
              <Box sx={(t) => sectionHeaderSx(t)}>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">기본 정보</Typography>
              </Box>
              {basic.isLoading && !enemyData ? (
                <BasicInfoSkeleton />
              ) : enemyData ? (
                <CardContent sx={{ p: { xs: 2.5, md: 3 }, '&:last-child': { pb: { xs: 2.5, md: 3 } } }}>
                  {/* 상단: 몬스터 이미지 + 통계 */}
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2.5, sm: 3 }, alignItems: { sm: 'center' }, mb: enemyData.leader_skill_description ? { xs: 2, md: 2.5 } : 0 }}>
                    {/* 몬스터 이미지 */}
                    <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: { xs: 3, md: 4 }, flexShrink: 0 }}>
                      {[1, 2, 3].map((index) => {
                        const imageUrl = enemyData[`image_url${index}` as keyof EnemyData] as string | undefined;
                        const monsterName = enemyData[`m${index}_kr_name` as keyof EnemyData] as string | undefined;
                        return (
                          <Box key={index} sx={{ textAlign: 'center' }}>
                            <Avatar
                              src={imageUrl ? getMonsterImageUrl(imageUrl) : undefined}
                              sx={(t) => ({
                                width: { xs: 80, md: 100 },
                                height: { xs: 80, md: 100 },
                                border: `2px solid ${alpha(t.palette.primary.main, 0.45)}`,
                                boxShadow: `0 6px 20px ${alpha(t.palette.primary.main, 0.18)}`,
                                bgcolor: alpha(t.palette.background.default, 0.5),
                                '& img': { objectFit: 'contain' },
                              })}
                            />
                            {monsterName && (
                              <Typography variant="caption" display="block" mt={1} fontWeight={600} color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                                {monsterName}
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                    </Box>

                    {/* 통계 — 오른쪽 또는 아래 */}
                    <Box sx={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: { xs: 1.5, md: 2 } }}>
                      {[
                        { value: `${enemyData.total_rate ?? 0}%`, label: '공성률', highlight: true },
                        { value: summaryTotalGames, label: '총 게임', highlight: false },
                        { value: enemyData.win_count ?? 0, label: '승리', highlight: false },
                        { value: enemyData.lose_count ?? 0, label: '패배', highlight: false },
                      ].map((s) => (
                        <Box key={s.label} sx={(t) => ({ ...statBoxSx(t, s.highlight), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, py: { xs: 1.5, md: 2 } })}>
                          <Typography variant="h6" fontWeight={800} color={s.highlight ? 'primary.main' : 'text.primary'} lineHeight={1}>
                            {s.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {s.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  {/* 하단: 리더 스킬 */}
                  {enemyData.leader_skill_description && (
                    <Box
                      sx={(t) => ({
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        p: { xs: 1.5, md: 2 },
                        borderRadius: 1.5,
                        border: `1px solid ${alpha(t.palette.divider, 0.5)}`,
                        bgcolor: alpha(t.palette.background.default, t.palette.mode === 'dark' ? 0.4 : 0.5),
                      })}
                    >
                      {enemyData.leader_icon && (
                        <Box
                          component="img"
                          src={getMonsterImageUrl(enemyData.leader_icon)}
                          alt="리더 스킬"
                          sx={(t) => ({
                            width: { xs: 44, md: 52 },
                            height: { xs: 44, md: 52 },
                            border: `1.5px solid ${alpha(t.palette.primary.main, 0.35)}`,
                            borderRadius: 0.75,
                            objectFit: 'contain',
                            flexShrink: 0,
                          })}
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5} sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          리더 스킬
                        </Typography>
                        <Typography variant="body2" color="text.primary" sx={{ fontSize: { xs: '0.82rem', md: '0.9rem' }, lineHeight: 1.6 }}>
                          {enemyData.leader_skill_description}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              ) : (
                <BasicInfoSkeleton />
              )}
            </Card>
          </Box>

          {/* ── 추천 공덱 ── */}
          <Box sx={{ minWidth: 0 }}>
            <Card sx={(t) => ({ ...sectionCardSx(t), height: '100%' })}>
              <Box sx={(t) => sectionHeaderSx(t)}>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">추천 공덱</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setAddPopupOpen(true)}
                  sx={{ fontSize: '0.75rem', px: 1.5, py: 0.4, minWidth: 0 }}
                >
                  + 추가
                </Button>
              </Box>
              {recommended.isLoading && !recommended.data ? (
                <RecommendedSkeleton />
              ) : (
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
                  {recommendedList.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                      <Typography variant="body2" color="text.disabled">추천 공덱이 없습니다</Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        {recommendedList.map((item: RecommendedItem, idx: number) => (
                          <Box
                            key={idx}
                            onClick={() => { setSelectedDeckItem(item); setDeckDetailPopupOpen(true); }}
                            sx={(t) => ({
                              ...listRowSx(t),
                              px: 1.5,
                              py: 1.25,
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                              cursor: 'pointer',
                            })}
                          >
                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexShrink: 0 }}>
                              {[1, 2, 3].map((i) => {
                                const imageUrl = resolveMonsterImageUrl(item as Record<string, unknown>, i as 1 | 2 | 3);
                                return imageUrl ? (
                                  <Avatar
                                    key={i}
                                    src={getMonsterImageUrl(imageUrl)}
                                    sx={(t) => ({
                                      width: { xs: 36, md: 44 },
                                      height: { xs: 36, md: 44 },
                                      border: `1.5px solid ${alpha(t.palette.primary.main, 0.4)}`,
                                      bgcolor: 'background.paper',
                                      '& img': { objectFit: 'contain' },
                                    })}
                                  />
                                ) : null;
                              })}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0, ml: 'auto' }}>
                              {item.win_rate != null && (
                                <Chip
                                  label={`${item.win_rate}%`}
                                  size="small"
                                  sx={(t) => ({
                                    height: 22,
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    bgcolor: (item.win_rate ?? 0) >= 50
                                      ? alpha(t.palette.primary.main, 0.12)
                                      : alpha(t.palette.text.secondary, 0.1),
                                    color: (item.win_rate ?? 0) >= 50 ? 'primary.main' : 'text.secondary',
                                    border: `1px solid ${(item.win_rate ?? 0) >= 50 ? alpha(t.palette.primary.main, 0.3) : 'transparent'}`,
                                  })}
                                />
                              )}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                <ThumbUpIcon sx={{ fontSize: 11, color: 'primary.main', opacity: 0.8 }} />
                                <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'primary.main', fontWeight: 600 }}>
                                  {item.recommend_count ?? 0}
                                </Typography>
                                <ThumbDownIcon sx={{ fontSize: 11, color: 'error.main', opacity: 0.8, ml: 0.5 }} />
                                <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'error.main', fontWeight: 600 }}>
                                  {item.not_recommend_count ?? 0}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                      {recommendedList.length > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mt: 2 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setRecommendedPage((p) => Math.max(1, p - 1))}
                            disabled={recommendedPage <= 1 || recommended.isFetching}
                          >
                            이전
                          </Button>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {recommendedPage}페이지
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setRecommendedPage((p) => p + 1)}
                            disabled={!recommendedHasNext || recommended.isFetching}
                          >
                            다음
                          </Button>
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          </Box>

          {/* ── 공성률 정보 ── */}
          <Box sx={{ minWidth: 0 }}>
            <Card sx={(t) => ({ ...sectionCardSx(t), height: '100%' })}>
              <Box sx={(t) => sectionHeaderSx(t)}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary">공성률 정보</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: '0.68rem' }}>
                    공격 덱별 승률
                    {summaryTotalGames > 0 ? ` · 총 ${summaryTotalGames}경기` : ''}
                    {historyTotalCount > 0 ? ` / ${historyTotalCount}조합` : ''}
                  </Typography>
                </Box>
                {history.isFetching && <CircularProgress size={14} sx={{ opacity: 0.5 }} />}
              </Box>
              {history.isLoading && !history.data ? (
                <HistorySkeleton />
              ) : (
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
                  {historyList.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                      <Typography variant="body2" color="text.disabled">공격 이력이 없습니다</Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        {historyList.map((item: HistoryItem, idx: number) => {
                          const rate = item.total_rate ?? 0;
                          const totalGames = item.total_count ?? ((item.win_count ?? 0) + (item.lose_count ?? 0));
                          const isHigh = rate >= 50;
                          const canVote = Boolean(schData.dm1 && schData.dm2 && schData.dm3) &&
                            Boolean(item.atk_monster_1 && item.atk_monster_2 && item.atk_monster_3);
                          const myV = String(item.my_vote ?? '').trim().toUpperCase();
                          const upN = Number(item.recommend_count ?? 0);
                          const downN = Number(item.not_recommend_count ?? 0);
                          const busy = deckVoteMutation.isPending;
                          const historyDeckId = getHistoryRowDeckId(item);
                          const handleHistoryRowClick = historyDeckId ? () => {
                            const deckItem: RecommendedItem = {
                              deck_id: historyDeckId,
                              def_monster_1: schData.dm1,
                              def_monster_2: schData.dm2,
                              def_monster_3: schData.dm3,
                              atk_monster_1: item.atk_monster_1 ? String(item.atk_monster_1) : undefined,
                              atk_monster_2: item.atk_monster_2 ? String(item.atk_monster_2) : undefined,
                              atk_monster_3: item.atk_monster_3 ? String(item.atk_monster_3) : undefined,
                              image_url1: item.image_url1,
                              image_url2: item.image_url2,
                              image_url3: item.image_url3,
                            };
                            setSelectedDeckItem(deckItem);
                            setDeckDetailPopupOpen(true);
                          } : undefined;
                          return (
                            <Box
                              key={idx}
                              onClick={handleHistoryRowClick}
                              sx={(t) => ({
                                ...listRowSx(t),
                                px: 1.5,
                                py: 1.25,
                                cursor: historyDeckId ? 'pointer' : 'default',
                              })}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  flexDirection: { xs: 'column', lg: 'row' },
                                  alignItems: { xs: 'stretch', lg: 'center' },
                                  gap: { xs: 1, lg: 1.5 },
                                }}
                              >
                                {/* 몬스터 아이콘 (별은 아바타 좌상단 배지 — 가로 공간 절약) */}
                                <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0, alignSelf: { xs: 'flex-start', lg: 'center' } }}>
                                  {historyDeckId && (
                                    <StarIcon
                                      sx={(t) => ({
                                        position: 'absolute',
                                        top: -6,
                                        left: -6,
                                        fontSize: 15,
                                        color: 'warning.main',
                                        zIndex: 1,
                                        filter: `drop-shadow(0 1px 2px ${alpha(t.palette.common.black, 0.35)})`,
                                      })}
                                    />
                                  )}
                                  <Box sx={{ display: 'flex' }}>
                                  {[1, 2, 3].map((i) => {
                                    const url = item[`image_url${i}` as keyof HistoryItem] as string | undefined;
                                    if (i === 3 && !url) return null;
                                    return (
                                      <Avatar
                                        key={i}
                                        src={url ? getMonsterImageUrl(url) : undefined}
                                        sx={(t) => ({
                                          width: { xs: 38, md: 46 },
                                          height: { xs: 38, md: 46 },
                                          border: `1.5px solid ${alpha(t.palette.primary.main, 0.35)}`,
                                          ml: i > 1 ? -1 : 0,
                                          bgcolor: 'background.paper',
                                          '& img': { objectFit: 'contain' },
                                        })}
                                      />
                                    );
                                  })}
                                  </Box>
                                </Box>

                                {/* 승률 바 */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                    flexDirection: { xs: 'row', sm: 'row' },
                                    alignItems: { xs: 'center', sm: 'center' },
                                      justifyContent: 'space-between',
                                    gap: { xs: 0.5, sm: 0.5 },
                                      mb: 0.5,
                                    }}
                                  >
                                    <Typography variant="caption" fontWeight={700} color={isHigh ? 'primary.main' : 'text.secondary'} sx={{ fontSize: '0.78rem', flexShrink: 0 }}>
                                      {rate}%
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.disabled"
                                      sx={{
                                        fontSize: '0.68rem',
                                        lineHeight: 1.25,
                                        wordBreak: 'keep-all',
                                        whiteSpace: 'nowrap',
                                        textAlign: 'right',
                                      }}
                                    >
                                      {mobile
                                        ? `${totalGames}G · ${item.win_count ?? 0}W ${item.lose_count ?? 0}L`
                                        : `${totalGames}경기 · ${item.win_count ?? 0}승 ${item.lose_count ?? 0}패`}
                                    </Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={rate}
                                    sx={(t) => ({
                                      height: 5,
                                      borderRadius: 99,
                                      bgcolor: alpha(t.palette.divider, 0.5),
                                      '& .MuiLinearProgress-bar': {
                                        borderRadius: 99,
                                        bgcolor: isHigh ? t.palette.primary.main : alpha(t.palette.text.secondary, 0.4),
                                      },
                                    })}
                                  />
                                </Box>

                                {/* 투표 버튼 */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, alignSelf: { xs: 'flex-end', lg: 'center' } }}>
                                  {(() => {
                                    const voteButtons = (
                                      <>
                                        <Button
                                          size="small"
                                          variant={myV === 'UP' ? 'contained' : 'outlined'}
                                          color="primary"
                                          startIcon={<ThumbUpIcon sx={{ fontSize: 14 }} />}
                                          onClick={() => sendHistoryVote(item, myV === 'UP' ? 'CLEAR' : 'UP')}
                                          disabled={busy || !canVote}
                                          sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: '0.72rem' }}
                                        >
                                          {upN}
                                        </Button>
                                        <Button
                                          size="small"
                                          variant={myV === 'DOWN' ? 'contained' : 'outlined'}
                                          color="error"
                                          startIcon={<ThumbDownIcon sx={{ fontSize: 14 }} />}
                                          onClick={() => sendHistoryVote(item, myV === 'DOWN' ? 'CLEAR' : 'DOWN')}
                                          disabled={busy || !canVote}
                                          sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: '0.72rem' }}
                                        >
                                          {downN}
                                        </Button>
                                      </>
                                    );
                                    return canVote ? voteButtons : (
                                      <Tooltip title="공격 덱 정보가 없어 투표할 수 없습니다." arrow placement="top">
                                        <Box component="span" sx={{ display: 'inline-flex', gap: 0.5 }}>{voteButtons}</Box>
                                      </Tooltip>
                                    );
                                  })()}
                                </Box>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                      {historyList.length > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mt: 2 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                            disabled={historyPage <= 1 || history.isFetching}
                          >
                            이전
                          </Button>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {historyPage}페이지
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setHistoryPage((p) => p + 1)}
                            disabled={!historyHasNext || history.isFetching}
                          >
                            다음
                          </Button>
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          </Box>

          {/* ── 최근 전적 ── */}
          <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}>
            <Card sx={(t) => sectionCardSx(t)}>
              <Box sx={(t) => sectionHeaderSx(t)}>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  최근 전적
                  {recentDisplayTotalGames > 0 ? ` · ${recentDisplayTotalGames}경기` : ''}
                </Typography>
                {recentBattles.isFetching && <CircularProgress size={14} sx={{ opacity: 0.5 }} />}
              </Box>
              {recentBattles.isLoading && !recentBattles.data ? (
                <HistorySkeleton />
              ) : (
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
                  {recentBattleList.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        전적이 없습니다
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      {recentBattles.isFetching && (
                        <Box sx={{ position: 'relative', mb: 1 }}>
                          <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 1 }} />
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {recentBattleList.map((item: RecentBattleItem, idx: number) => {
                          const isWin = String(item.win_lose) === '1';
                          const tsNum = typeof item.log_timestamp === 'number'
                            ? item.log_timestamp * 1000
                            : item.log_timestamp
                              ? new Date(item.log_timestamp as string).getTime()
                              : null;
                          const dateStr = tsNum && !Number.isNaN(tsNum)
                            ? new Date(tsNum).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
                            : null;
                          const timeStr = tsNum && !Number.isNaN(tsNum)
                            ? new Date(tsNum).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                            : null;
                          const atkUrls = [item.atk_image_url1, item.atk_image_url2, item.atk_image_url3];
                          const defUrlsFromRow = [item.def_image_url1, item.def_image_url2, item.def_image_url3];
                          const defUrls = defUrlsFromRow.some(Boolean)
                            ? defUrlsFromRow
                            : [enemyData?.image_url1, enemyData?.image_url2, enemyData?.image_url3];
                          const rowKey = item.log_id
                            ? `${item.log_id}-${item.log_timestamp ?? idx}`
                            : `${item.log_timestamp ?? 'row'}-${idx}`;
                          const atkGuild = item.atk_guild_name || '—';
                          const atkWizard = item.wizard_name || '—';
                          const defGuild = item.opp_guild_name || '—';
                          const defWizard = item.opp_wizard_name || '—';
                          return (
                            <Box
                              key={rowKey}
                              sx={(t) => ({
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                alignItems: 'stretch',
                                borderRadius: 2,
                                overflow: 'hidden',
                                border: '1px solid',
                                borderColor: alpha(t.palette.divider, 0.5),
                              })}
                            >
                              {mobile ? (
                                <Box
                                  sx={(t) => ({
                                    width: '100%',
                                    px: 1.25,
                                    py: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.9,
                                    background: isWin
                                      ? t.palette.mode === 'dark'
                                        ? `linear-gradient(135deg, ${alpha('#064e3b', 0.55)} 0%, ${alpha('#065f46', 0.35)} 100%)`
                                        : `linear-gradient(135deg, ${alpha('#ecfdf5', 1)} 0%, ${alpha('#bbf7d0', 0.65)} 100%)`
                                      : t.palette.mode === 'dark'
                                        ? `linear-gradient(135deg, ${alpha('#7f1d1d', 0.3)} 0%, ${alpha('#334155', 0.45)} 100%)`
                                        : `linear-gradient(135deg, ${alpha('#fff1f2', 1)} 0%, ${alpha('#fecdd3', 0.6)} 100%)`,
                                  })}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75 }}>
                                    <Chip
                                      size="small"
                                      label={isWin ? '공격승' : '공격패'}
                                      sx={{
                                        height: 20,
                                        fontSize: '0.64rem',
                                        fontWeight: 800,
                                        color: '#fff',
                                        flexShrink: 0,
                                        background: isWin
                                          ? 'linear-gradient(135deg, #10b981, #059669)'
                                          : 'linear-gradient(135deg, #f87171, #dc2626)',
                                        '& .MuiChip-label': { px: 0.75 },
                                      }}
                                    />
                                    {(dateStr || timeStr) && (
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem', lineHeight: 1, textAlign: 'right', flexShrink: 0 }}>
                                        {[dateStr, timeStr].filter(Boolean).join(' ')}
                                      </Typography>
                                    )}
                                  </Box>

                                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'start', gap: 0.75 }}>
                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography
                                        variant="caption"
                                        sx={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                      >
                                        {atkGuild}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: 'block', fontSize: '0.66rem', mb: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                      >
                                        {atkWizard}
                                      </Typography>
                                      <BattleHistoryMonsterCell
                                        urls={atkUrls}
                                        borderColor={isWin ? 'success.main' : 'error.main'}
                                        size={28}
                                        justifyContent="flex-start"
                                      />
                                    </Box>

                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontSize: '0.64rem', fontWeight: 700, lineHeight: 1, mt: 1.4 }}
                                    >
                                      VS
                                    </Typography>

                                    <Box sx={{ minWidth: 0, textAlign: 'right' }}>
                                      <Typography
                                        variant="caption"
                                        sx={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                      >
                                        {defGuild}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: 'block', fontSize: '0.66rem', mb: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                      >
                                        {defWizard}
                                      </Typography>
                                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <BattleHistoryMonsterCell
                                          urls={defUrls}
                                          borderColor={!isWin ? 'success.main' : 'error.main'}
                                          size={28}
                                          justifyContent="flex-end"
                                        />
                                      </Box>
                                    </Box>
                                  </Box>
                                </Box>
                              ) : (
                                <>
                                  {/* 공격측 (항상 왼쪽) */}
                                  <Box
                                    sx={(t) => ({
                                      flex: 1,
                                      background: isWin
                                        ? t.palette.mode === 'dark'
                                          ? `linear-gradient(135deg, ${alpha('#059669', 0.35)} 0%, ${alpha('#064e3b', 0.5)} 100%)`
                                          : `linear-gradient(135deg, ${alpha('#ecfdf5', 1)} 0%, ${alpha('#a7f3d0', 0.6)} 100%)`
                                        : t.palette.mode === 'dark'
                                          ? `linear-gradient(135deg, ${alpha('#475569', 0.35)} 0%, ${alpha('#7f1d1d', 0.2)} 100%)`
                                          : `linear-gradient(135deg, ${alpha('#f8fafc', 1)} 0%, ${alpha('#fecdd3', 0.5)} 100%)`,
                                      px: { xs: 1.25, md: 1.5 },
                                      py: 1.25,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 0.75,
                                      minWidth: 0,
                                      overflow: 'hidden',
                                    })}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                                      <Chip
                                        size="small"
                                        label={isWin ? '성공' : '실패'}
                                        sx={{
                                          height: 20,
                                          fontSize: '0.65rem',
                                          fontWeight: 800,
                                          color: '#fff',
                                          flexShrink: 0,
                                          background: isWin
                                            ? 'linear-gradient(135deg, #10b981, #059669)'
                                            : 'linear-gradient(135deg, #f87171, #dc2626)',
                                          '& .MuiChip-label': { px: 0.75 },
                                        }}
                                      />
                                      <Typography
                                        variant="caption"
                                        fontWeight={700}
                                        sx={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                      >
                                        {atkGuild}
                                      </Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                                      {atkWizard}
                                    </Typography>
                                    <BattleHistoryMonsterCell
                                      urls={atkUrls}
                                      borderColor={isWin ? 'success.main' : 'error.main'}
                                      size={34}
                                      justifyContent="flex-start"
                                    />
                                  </Box>

                                  {/* 가운데: VS + 날짜 */}
                                  <Box
                                    sx={(t) => ({
                                      flexShrink: 0,
                                      width: { xs: '100%', sm: 60 },
                                      minHeight: { xs: 40, sm: 'auto' },
                                      display: 'flex',
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: { xs: 1, sm: 0.5 },
                                      py: { xs: 0.75, sm: 0 },
                                      borderTop: { xs: `1px solid ${alpha(t.palette.divider, 0.25)}`, sm: 'none' },
                                      borderBottom: { xs: `1px solid ${alpha(t.palette.divider, 0.25)}`, sm: 'none' },
                                      borderLeft: { xs: 'none', sm: `1px solid ${alpha(t.palette.divider, 0.25)}` },
                                      borderRight: { xs: 'none', sm: `1px solid ${alpha(t.palette.divider, 0.25)}` },
                                      bgcolor: alpha(t.palette.background.paper, 0.3),
                                    })}
                                  >
                                    <Typography variant="overline" sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em', color: 'text.secondary', lineHeight: 1 }}>
                                      VS
                                    </Typography>
                                    {dateStr && (
                                      <>
                                        <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                                          {dateStr}
                                        </Typography>
                                        {timeStr && (
                                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem', textAlign: 'center', lineHeight: 1 }}>
                                            {timeStr}
                                          </Typography>
                                        )}
                                      </>
                                    )}
                                  </Box>

                                  {/* 방어측 (항상 오른쪽) */}
                                  <Box
                                    sx={(t) => ({
                                      flex: 1,
                                      background: !isWin
                                        ? t.palette.mode === 'dark'
                                          ? `linear-gradient(135deg, ${alpha('#064e3b', 0.5)} 0%, ${alpha('#059669', 0.35)} 100%)`
                                          : `linear-gradient(135deg, ${alpha('#a7f3d0', 0.6)} 0%, ${alpha('#ecfdf5', 1)} 100%)`
                                        : t.palette.mode === 'dark'
                                          ? `linear-gradient(135deg, ${alpha('#7f1d1d', 0.2)} 0%, ${alpha('#475569', 0.35)} 100%)`
                                          : `linear-gradient(135deg, ${alpha('#fecdd3', 0.5)} 0%, ${alpha('#f8fafc', 1)} 100%)`,
                                      px: { xs: 1.25, md: 1.5 },
                                      py: 1.25,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'flex-end',
                                      gap: 0.75,
                                      minWidth: 0,
                                      overflow: 'hidden',
                                    })}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, justifyContent: 'flex-end' }}>
                                      <Typography
                                        variant="caption"
                                        fontWeight={700}
                                        sx={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                      >
                                        {defGuild}
                                      </Typography>
                                      <Chip
                                        size="small"
                                        label={!isWin ? '방어 성공' : '방어 실패'}
                                        sx={{
                                          height: 20,
                                          fontSize: '0.65rem',
                                          fontWeight: 800,
                                          color: '#fff',
                                          flexShrink: 0,
                                          background: !isWin
                                            ? 'linear-gradient(135deg, #10b981, #059669)'
                                            : 'linear-gradient(135deg, #f87171, #dc2626)',
                                          '& .MuiChip-label': { px: 0.75 },
                                        }}
                                      />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                                      {defWizard}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                      <BattleHistoryMonsterCell
                                        urls={defUrls}
                                        borderColor={!isWin ? 'success.main' : 'error.main'}
                                        size={34}
                                        justifyContent="flex-end"
                                      />
                                    </Box>
                                  </Box>
                                </>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                      {recentNeedsPaginationDisplay && recentBattleList.length > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mt: 3 }}>
                          <Button
                            variant="outlined"
                            size={mobile ? 'small' : 'medium'}
                            onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                            disabled={recentPage <= 1 || recentBattles.isFetching}
                          >
                            이전
                          </Button>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {recentPage}페이지
                          </Typography>
                          <Button
                            variant="outlined"
                            size={mobile ? 'small' : 'medium'}
                            onClick={() => setRecentPage((p) => p + 1)}
                            disabled={!recentBattleHasNext || recentBattles.isFetching}
                          >
                            다음
                          </Button>
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          </Box>
        </Box>
        {/* /grid */}

        <AddDeckPopup
          open={addPopupOpen}
          onClose={handleAddPopupClose}
          onSave={handleAddPopupClose}
          type="empty"
          defenseMonster={
            schData.dm1 ? { dm1: schData.dm1, dm2: schData.dm2 ?? '', dm3: schData.dm3 ?? '' } : undefined
          }
        />
        <DeckDetailPopup
          open={deckDetailPopupOpen}
          onClose={handleDeckDetailPopupClose}
          onDeleted={handleDeckDetailPopupClose}
          selectedItem={selectedDeckItem}
          defenseMonsters={
            schData.dm1 && schData.dm2 && schData.dm3
              ? { dm1: schData.dm1, dm2: schData.dm2, dm3: schData.dm3 }
              : undefined
          }
        />
      </Container>
    </Box>
  );
}
