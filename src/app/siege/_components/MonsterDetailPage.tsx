'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Typography,
  Avatar,
  LinearProgress,
  Pagination,
  Chip,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Skeleton,
  Tooltip,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import {
  useMonsterDetailBasic,
  useMonsterDetailRecommended,
  useMonsterDetailHistory,
  useDeckVoteMutation,
} from '@/hooks/api';
import { showToast } from '@/shared/lib/notification';
import AddDeckPopup from '@/components/popup/AddDeckPopup';
import DeckDetailPopup from '@/components/popup/DeckDetailPopup';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { getMonsterImageUrl } from '@/shared/utils/image';
import type { MonsterDetailParams, HistoryItem, RecommendedItem, EnemyData } from '@/types';
import { useSiegeGuildViewParams } from '@/shared/hooks/useSiegeGuildViewParams';

/** 이력 API의 deck_id(또는 camelCase) — 있으면 등록 공덱 투표로 병합 */
function getHistoryRowDeckId(item: HistoryItem): string | null {
  const rec = item as HistoryItem & { deckId?: unknown };
  const raw = item.deck_id ?? rec.deckId;
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === '' || s === '0') return null;
  return s;
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

function siegeDetailCardHeaderSx(t: Theme) {
  return {
    background: `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${alpha(t.palette.primary.main, 0.85)} 100%)`,
    color: t.palette.primary.contrastText,
    borderBottom: '1px solid',
    borderColor: t.palette.divider,
    '& .MuiCardHeader-title': {
      color: t.palette.primary.contrastText,
    },
  };
}

function siegeDetailMutedPanelSx(t: Theme) {
  return {
    bgcolor: alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.1 : 0.06),
    borderRadius: 1,
    border: '1px solid',
    borderColor: t.palette.divider,
  };
}

const siegeDetailListCardSx = {
  border: '1px solid',
  borderColor: 'divider',
  transition: 'all 0.2s',
  '&:hover': {
    boxShadow: 2,
    borderColor: 'primary.light',
  },
} as const;

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
  const siegeGuildViewParams = useSiegeGuildViewParams();
  const [historyPage, setHistoryPage] = useState(1);
  const [recommendedPage, setRecommendedPage] = useState(1);
  const historyLimit = DEFAULT_PAGE_SIZE;
  const recommendedLimit = 5;

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
      ...siegeGuildViewParams,
    };
  }, [schData, matchId, siegeGuildViewParams]);

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
  const recommendedList = recommended.data?.recommendedList || [];
  const recommendedTotalCount = recommended.data?.recommendedTotalCount || 0;
  const historyList = history.data?.historyList || [];
  const historyTotalCount = history.data?.historyTotalCount || 0;

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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={goBack}
            startIcon={<ArrowBackIcon />}
            size={mobile ? 'small' : 'medium'}
            sx={{
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            }}
          >
            뒤로가기
          </Button>
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: 600, fontSize: { xs: '20px', md: '28px' }, color: 'text.primary' }}
          >
            몬스터 상세 정보
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            /* PC: 기본정보 전폭 → 추천공덱 | 공성률 1:1 */
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: { xs: 2, md: 3 },
          }}
        >
          {/* 기본 정보 — md+ 한 줄 전폭 */}
          <Box sx={{ gridColumn: { md: '1 / -1' }, minWidth: 0 }}>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardHeader
                title="기본 정보"
                sx={siegeDetailCardHeaderSx}
                titleTypographyProps={{ variant: mobile ? 'subtitle1' : 'h6', fontWeight: 600 }}
              />
              {basic.isLoading && !enemyData ? (
                <BasicInfoSkeleton />
              ) : enemyData ? (
                <CardContent sx={{ '&:last-child': { paddingBottom: '16px' } }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', md: 'row' },
                      alignItems: { md: 'stretch' },
                      gap: { xs: 2, md: 3 },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: { xs: 1, md: 2 },
                        flexShrink: 0,
                      }}
                    >
                      {[1, 2, 3].map((index) => {
                        const imageUrl = enemyData[`image_url${index}` as keyof EnemyData] as string | undefined;
                        const monsterName = enemyData[`m${index}_kr_name` as keyof EnemyData] as string | undefined;
                        return (
                          <Box key={index} sx={{ textAlign: 'center' }}>
                            {imageUrl && (
                              <Avatar
                                src={getMonsterImageUrl(imageUrl)}
                                sx={{
                                  width: { xs: 80, md: 96 },
                                  height: { xs: 80, md: 96 },
                                  border: '2px solid',
                                  borderColor: 'primary.main',
                                  boxShadow: 2,
                                  bgcolor: 'background.paper',
                                  '& img': { objectFit: 'contain' },
                                }}
                              />
                            )}
                            {monsterName && (
                              <Typography
                                variant="caption"
                                sx={{
                                  mt: 0.5,
                                  display: 'block',
                                  fontSize: { xs: '11px', md: '12px' },
                                  color: 'text.primary',
                                  fontWeight: 500,
                                }}
                              >
                                {monsterName}
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                    {enemyData?.leader_skill_description && (
                      <Box
                        sx={(t) => ({
                          p: 2,
                          display: 'flex',
                          gap: 2,
                          alignItems: 'center',
                          flex: 1,
                          minWidth: 0,
                          ...siegeDetailMutedPanelSx(t),
                        })}
                      >
                        {enemyData?.leader_icon && (
                          <Box
                            component="img"
                            src={getMonsterImageUrl(enemyData.leader_icon)}
                            alt="리더 스킬"
                            sx={{
                              width: { xs: 48, md: 56 },
                              height: { xs: 48, md: 56 },
                              border: '2px solid',
                              borderColor: 'primary.main',
                              boxShadow: 1,
                              bgcolor: 'background.paper',
                              borderRadius: 0,
                              objectFit: 'contain',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              display: 'block',
                              mb: 1,
                              color: 'text.secondary',
                              fontSize: { xs: '12px', md: '14px' },
                            }}
                          >
                            리더 스킬
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: { xs: '12px', md: '14px' }, color: 'text.primary', lineHeight: 1.6 }}
                          >
                            {enemyData.leader_skill_description}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, minmax(72px, 1fr))' },
                        gap: 2,
                        flexShrink: 0,
                        width: { xs: '100%', md: 'auto' },
                        minWidth: { md: 280 },
                      }}
                    >
                      {[
                        { value: enemyData?.total_rate || 0, label: '공성률' },
                        { value: enemyData?.total_count || 0, label: '총 게임' },
                        { value: enemyData?.win_count || 0, label: '승리' },
                        { value: enemyData?.lose_count || 0, label: '패배' },
                      ].map((item) => (
                        <Box key={item.label}>
                          <Box
                            sx={(t) => ({
                              textAlign: 'center',
                              p: { xs: 2, md: 1.5 },
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              ...siegeDetailMutedPanelSx(t),
                            })}
                          >
                            <Typography
                              variant={mobile ? 'h6' : 'h5'}
                              sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}
                            >
                              {item.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.label}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              ) : (
                <BasicInfoSkeleton />
              )}
            </Card>
          </Box>

          {/* 추천 공덱 — md+ 좌 50% */}
          <Box sx={{ minWidth: 0 }}>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span>추천 공덱</span>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setAddPopupOpen(true)}
                      sx={(t) => ({
                        bgcolor: alpha(t.palette.common.white, 0.18),
                        color: t.palette.primary.contrastText,
                        '&:hover': { bgcolor: alpha(t.palette.common.white, 0.28) },
                      })}
                    >
                      추가
                    </Button>
                  </Box>
                }
                sx={siegeDetailCardHeaderSx}
                titleTypographyProps={{ variant: mobile ? 'subtitle1' : 'h6', fontWeight: 600 }}
              />
              {recommended.isLoading && !recommended.data ? (
                <RecommendedSkeleton />
              ) : (
                <CardContent>
                  {recommendedList.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        추천 공덱이 없습니다
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {recommendedList.map((item: RecommendedItem, idx: number) => (
                          <Card key={idx} variant="outlined" sx={siegeDetailListCardSx}>
                            <CardContent sx={{ py: 1.5, '&:last-child': { paddingBottom: '12px' } }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                  {[1, 2, 3].map((i) => {
                                    const imageUrl = item[`image_url${i}` as keyof RecommendedItem] as string | undefined;
                                    return (
                                      imageUrl && (
                                        <Avatar
                                          key={i}
                                          src={getMonsterImageUrl(imageUrl)}
                                          sx={{
                                            width: { xs: 34, sm: 38, md: 50 },
                                            height: { xs: 34, sm: 38, md: 50 },
                                            border: '2px solid',
                                            borderColor: 'primary.main',
                                            borderWidth: { xs: 1.5, md: 2 },
                                            boxShadow: 1,
                                            flexShrink: 0,
                                            bgcolor: 'background.paper',
                                            '& img': { objectFit: 'contain' },
                                          }}
                                        />
                                      )
                                    );
                                  })}
                                </Box>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    setSelectedDeckItem(item);
                                    setDeckDetailPopupOpen(true);
                                  }}
                                  sx={{
                                    borderColor: 'divider',
                                    color: 'text.primary',
                                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                                  }}
                                >
                                  상세보기
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                      {recommendedTotalCount > recommendedLimit && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                          <Pagination
                            count={Math.ceil(recommendedTotalCount / recommendedLimit)}
                            page={recommendedPage}
                            onChange={(_, page) => setRecommendedPage(page)}
                            color="primary"
                            size={mobile ? 'small' : 'medium'}
                          />
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          </Box>

          {/* 공성률 정보 — md+ 우 50% */}
          <Box sx={{ minWidth: 0 }}>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardHeader
                title="공성률 정보"
                sx={siegeDetailCardHeaderSx}
                titleTypographyProps={{ variant: mobile ? 'subtitle1' : 'h6', fontWeight: 600 }}
              />
              {history.isLoading && !history.data ? (
                <HistorySkeleton />
              ) : (
                <CardContent>
                  {historyList.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        공격 이력이 없습니다
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      {history.isFetching && (
                        <Box sx={{ position: 'relative', mb: 1 }}>
                          <LinearProgress
                            sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 1 }}
                          />
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {historyList.map((item: HistoryItem, idx: number) => (
                          <Card key={idx} variant="outlined" sx={siegeDetailListCardSx}>
                            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { paddingBottom: '12px' } }}>
                              <Box
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: 'auto minmax(0, 1fr) auto',
                                  },
                                  gap: { xs: 1.25, sm: 2 },
                                  alignItems: 'center',
                                }}
                              >
                                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                                  {[1, 2, 3].map((i) => {
                                    const imageUrl = item[`image_url${i}` as keyof HistoryItem] as string | undefined;
                                    if (i === 3 && !imageUrl) return null;
                                    return (
                                      <Avatar
                                        key={i}
                                        src={imageUrl ? getMonsterImageUrl(imageUrl) : undefined}
                                        sx={{
                                          width: { xs: 44, md: 52 },
                                          height: { xs: 44, md: 52 },
                                          border: '2px solid',
                                          borderColor: 'primary.main',
                                          boxShadow: 1,
                                          ml: i > 1 ? -0.5 : 0,
                                          flexShrink: 0,
                                          bgcolor: 'background.paper',
                                          '& img': { objectFit: 'contain' },
                                        }}
                                      />
                                    );
                                  })}
                                </Box>
                                <Box sx={{ minWidth: 0, width: '100%' }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, gap: 1 }}>
                                    <Chip
                                      label={`${item.total_rate || 0}%`}
                                      size="small"
                                      sx={(t) => ({
                                        fontWeight: 600,
                                        height: 24,
                                        bgcolor:
                                          item.total_rate && item.total_rate >= 50
                                            ? t.palette.primary.main
                                            : alpha(t.palette.text.secondary, 0.25),
                                        color:
                                          item.total_rate && item.total_rate >= 50
                                            ? t.palette.primary.contrastText
                                            : t.palette.text.primary,
                                      })}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', flexShrink: 0 }}>
                                      {item.win_count || 0}승 {item.lose_count || 0}패
                                    </Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={item.total_rate || 0}
                                    color={item.total_rate && item.total_rate >= 50 ? 'primary' : 'inherit'}
                                    sx={(t) => ({
                                      height: 6,
                                      borderRadius: 1,
                                      bgcolor: alpha(t.palette.divider, 0.8),
                                      ...(!(item.total_rate && item.total_rate >= 50) && {
                                        '& .MuiLinearProgress-bar': {
                                          bgcolor: t.palette.text.disabled,
                                        },
                                      }),
                                    })}
                                  />
                                </Box>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    flexShrink: 0,
                                    justifyContent: { xs: 'center', sm: 'flex-end' },
                                  }}
                                >
                                  {(() => {
                                    const canVote =
                                      Boolean(schData.dm1 && schData.dm2 && schData.dm3) &&
                                      Boolean(
                                        item.atk_monster_1 &&
                                          item.atk_monster_2 &&
                                          item.atk_monster_3,
                                      );
                                    const myV = String(item.my_vote ?? '')
                                      .trim()
                                      .toUpperCase();
                                    const upN = Number(item.recommend_count ?? 0);
                                    const downN = Number(item.not_recommend_count ?? 0);
                                    const busy = deckVoteMutation.isPending;
                                    const buttons = (
                                      <>
                                        <Button
                                          size="small"
                                          variant={myV === 'UP' ? 'contained' : 'outlined'}
                                          color="primary"
                                          startIcon={<ThumbUpIcon sx={{ fontSize: 18 }} />}
                                          onClick={() =>
                                            sendHistoryVote(item, myV === 'UP' ? 'CLEAR' : 'UP')
                                          }
                                          disabled={busy || !canVote}
                                          sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.8rem' }}
                                        >
                                          {upN}
                                        </Button>
                                        <Button
                                          size="small"
                                          variant={myV === 'DOWN' ? 'contained' : 'outlined'}
                                          color="error"
                                          startIcon={<ThumbDownIcon sx={{ fontSize: 18 }} />}
                                          onClick={() =>
                                            sendHistoryVote(item, myV === 'DOWN' ? 'CLEAR' : 'DOWN')
                                          }
                                          disabled={busy || !canVote}
                                          sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.8rem' }}
                                        >
                                          {downN}
                                        </Button>
                                      </>
                                    );
                                    if (!canVote) {
                                      return (
                                        <Tooltip
                                          title="전투 이력에서 공격 덱(3마리) 정보를 찾을 수 없을 때는 투표할 수 없습니다."
                                          arrow
                                          placement="top"
                                        >
                                          <Box
                                            component="span"
                                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                                          >
                                            {buttons}
                                          </Box>
                                        </Tooltip>
                                      );
                                    }
                                    return buttons;
                                  })()}
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                      {historyTotalCount > historyLimit && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                          <Pagination
                            count={Math.ceil(historyTotalCount / historyLimit)}
                            page={historyPage}
                            onChange={(_, page) => setHistoryPage(page)}
                            color="primary"
                            size={mobile ? 'small' : 'medium'}
                          />
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          </Box>
        </Box>

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
        />
      </Container>
    </Box>
  );
}
