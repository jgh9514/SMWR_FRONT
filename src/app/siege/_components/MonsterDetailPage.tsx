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
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, gap: 2 }}>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ textAlign: 'center' }}>
            <Skeleton variant="rounded" width={100} height={100} sx={{ borderRadius: 0 }} />
            <Skeleton variant="text" width={60} sx={{ mx: 'auto', mt: 0.5 }} />
          </Box>
        ))}
      </Box>
      <Skeleton variant="rounded" height={60} sx={{ mb: 3 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" height={70} />
        ))}
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
              borderColor: '#34495e',
              color: '#34495e',
              '&:hover': { borderColor: '#2c3e50', bgcolor: '#f8f9fa' },
            }}
          >
            뒤로가기
          </Button>
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: 600, fontSize: { xs: '20px', md: '28px' }, color: '#2c3e50' }}
          >
            몬스터 상세 정보
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: { xs: 2, md: 3 },
          }}
        >
          {/* 기본 정보 */}
          <Box>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardHeader
                title="기본 정보"
                sx={{
                  bgcolor: '#2c3e50',
                  color: 'white',
                  borderBottom: '1px solid #e0e0e0',
                }}
                titleTypographyProps={{ variant: mobile ? 'subtitle1' : 'h6', fontWeight: 600 }}
              />
              {basic.isLoading && !enemyData ? (
                <BasicInfoSkeleton />
              ) : enemyData ? (
                <CardContent sx={{ '&:last-child': { paddingBottom: '16px' } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, gap: { xs: 1, md: 2 } }}>
                    {[1, 2, 3].map((index) => {
                      const imageUrl = enemyData[`image_url${index}` as keyof EnemyData] as string | undefined;
                      const monsterName = enemyData[`m${index}_kr_name` as keyof EnemyData] as string | undefined;
                      return (
                        <Box key={index} sx={{ textAlign: 'center' }}>
                          {imageUrl && (
                            <Avatar
                              src={getMonsterImageUrl(imageUrl)}
                              sx={{
                                width: { xs: 80, md: 100 },
                                height: { xs: 80, md: 100 },
                                border: '2px solid #34495e',
                                boxShadow: 2,
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
                      sx={{
                        mb: 3,
                        p: 2,
                        bgcolor: '#f5f5f5',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0',
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                      }}
                    >
                      {enemyData?.leader_icon && (
                        <Box
                          component="img"
                          src={getMonsterImageUrl(enemyData.leader_icon)}
                          alt="리더 스킬"
                          sx={{
                            width: { xs: 48, md: 60 },
                            height: { xs: 48, md: 60 },
                            border: '2px solid #34495e',
                            boxShadow: 1,
                            bgcolor: 'white',
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
                            color: '#2c3e50',
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
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    {[
                      { value: enemyData?.total_rate || 0, label: '공성률' },
                      { value: enemyData?.total_count || 0, label: '총 게임' },
                      { value: enemyData?.win_count || 0, label: '승리' },
                      { value: enemyData?.lose_count || 0, label: '패배' },
                    ].map((item) => (
                      <Box key={item.label}>
                        <Box
                          sx={{
                            textAlign: 'center',
                            p: 2,
                            bgcolor: '#f8f9fa',
                            borderRadius: 1,
                            border: '1px solid #e0e0e0',
                          }}
                        >
                          <Typography
                            variant={mobile ? 'h6' : 'h5'}
                            sx={{ fontWeight: 700, mb: 0.5, color: '#2c3e50' }}
                          >
                            {item.value}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                            {item.label}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              ) : (
                <BasicInfoSkeleton />
              )}
            </Card>
          </Box>

          {/* 추천 공덱 */}
          <Box>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span>추천 공덱</span>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setAddPopupOpen(true)}
                      sx={{
                        bgcolor: '#34495e',
                        color: 'white',
                        '&:hover': { bgcolor: '#2c3e50' },
                      }}
                    >
                      추가
                    </Button>
                  </Box>
                }
                sx={{
                  bgcolor: '#34495e',
                  color: 'white',
                  borderBottom: '1px solid #e0e0e0',
                }}
                titleTypographyProps={{ variant: mobile ? 'subtitle1' : 'h6', fontWeight: 600 }}
              />
              {recommended.isLoading && !recommended.data ? (
                <RecommendedSkeleton />
              ) : (
                <CardContent>
                  {recommendedList.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                        추천 공덱이 없습니다
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {recommendedList.map((item: RecommendedItem, idx: number) => (
                          <Card
                            key={idx}
                            variant="outlined"
                            sx={{
                              border: '1px solid #e0e0e0',
                              '&:hover': { boxShadow: 2, borderColor: '#34495e' },
                              transition: 'all 0.2s',
                            }}
                          >
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
                                            border: '2px solid #34495e',
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
                                    borderColor: '#34495e',
                                    color: '#34495e',
                                    '&:hover': { borderColor: '#2c3e50', bgcolor: '#f8f9fa' },
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
                            sx={{
                              '& .MuiPaginationItem-root': {
                                color: '#34495e',
                                '&.Mui-selected': { bgcolor: '#34495e', color: 'white', '&:hover': { bgcolor: '#2c3e50' } },
                                '&:hover': { bgcolor: '#f8f9fa' },
                              },
                            }}
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

          {/* 공성률 정보 */}
          <Box>
            <Card sx={{ boxShadow: 2 }}>
              <CardHeader
                title="공성률 정보"
                sx={{
                  bgcolor: '#34495e',
                  color: 'white',
                  borderBottom: '1px solid #e0e0e0',
                }}
                titleTypographyProps={{ variant: mobile ? 'subtitle1' : 'h6', fontWeight: 600 }}
              />
              {history.isLoading && !history.data ? (
                <HistorySkeleton />
              ) : (
                <CardContent>
                  {historyList.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
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
                          <Card
                            key={idx}
                            variant="outlined"
                            sx={{
                              border: '1px solid #e0e0e0',
                              '&:hover': { boxShadow: 2, borderColor: '#34495e' },
                              transition: 'all 0.2s',
                            }}
                          >
                            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { paddingBottom: '12px' } }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 1.5,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                                    flex: 1,
                                    minWidth: 0,
                                  }}
                                >
                                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, minWidth: { xs: 'auto', md: 180 } }}>
                                    {[1, 2, 3].map((i) => {
                                      const imageUrl = item[`image_url${i}` as keyof HistoryItem] as string | undefined;
                                      if (i === 3 && !imageUrl) return null;
                                      return (
                                        <Avatar
                                          key={i}
                                          src={imageUrl ? getMonsterImageUrl(imageUrl) : undefined}
                                          sx={{
                                            width: { xs: 44, md: 56 },
                                            height: { xs: 44, md: 56 },
                                            border: '2px solid #34495e',
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
                                  <Box sx={{ flex: 1, minWidth: 0, maxWidth: { xs: '100%', md: 300 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                      <Chip
                                        label={`${item.total_rate || 0}%`}
                                        sx={{
                                          bgcolor: item.total_rate && item.total_rate >= 50 ? '#34495e' : '#95a5a6',
                                          color: 'white',
                                          fontWeight: 500,
                                          height: 24,
                                        }}
                                        size="small"
                                      />
                                      <Typography variant="caption" sx={{ color: '#7f8c8d', fontSize: '0.75rem' }}>
                                        {item.win_count || 0}승 {item.lose_count || 0}패
                                      </Typography>
                                    </Box>
                                    <LinearProgress
                                      variant="determinate"
                                      value={item.total_rate || 0}
                                      sx={{
                                        height: 6,
                                        borderRadius: 1,
                                        bgcolor: '#e0e0e0',
                                        '& .MuiLinearProgress-bar': {
                                          bgcolor: item.total_rate && item.total_rate >= 50 ? '#34495e' : '#95a5a6',
                                        },
                                      }}
                                    />
                                  </Box>
                                </Box>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    flexShrink: 0,
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
                            sx={{
                              '& .MuiPaginationItem-root': {
                                color: '#34495e',
                                '&.Mui-selected': { bgcolor: '#34495e', color: 'white', '&:hover': { bgcolor: '#2c3e50' } },
                                '&:hover': { bgcolor: '#f8f9fa' },
                              },
                            }}
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
