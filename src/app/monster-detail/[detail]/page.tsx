'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useMonsterDetail } from '@/hooks/api';
import { showToast } from '@/shared/lib/notification';
import AddDeckPopup from '@/components/popup/AddDeckPopup';
import DeckDetailPopup from '@/components/popup/DeckDetailPopup';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { getMonsterImageUrl } from '@/shared/utils/image';
import type { MonsterDetailParams, HistoryItem, RecommendedItem, EnemyData } from '@/types';

export default function MonsterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const theme = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const mobileQuery = useMediaQuery(theme.breakpoints.down('md'));
  const mobile = isMounted ? mobileQuery : false; // 서버에서는 항상 false

  // 클라이언트 마운트 확인
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [schData, setSchData] = useState<any>({});
  const [matchId, setMatchId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [recommendedPage, setRecommendedPage] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);
  const historyLimit = DEFAULT_PAGE_SIZE;
  const recommendedLimit = 5;

  // 검색 파라미터 준비
  const searchParams = useMemo<MonsterDetailParams | null>(() => {
    // dm1, dm2, dm3 중 하나라도 있으면 API 호출 가능
    const hasMonsterData = schData.dm1 || schData.dm2 || schData.dm3;
    if (!hasMonsterData) return null;
    
    return {
      ...schData,
      ...(matchId && { match_id: matchId }),
      historyLimit,
      // 백엔드 XML에서 (historyOffset - 1) * historyLimit으로 계산하므로 페이지 번호를 그대로 전달
      historyOffset: historyPage,
      recommendedLimit,
      // 백엔드 XML에서 (recommendedOffset - 1) * recommendedLimit으로 계산하므로 페이지 번호를 그대로 전달
      recommendedOffset: recommendedPage,
    };
  }, [schData, matchId, historyPage, recommendedPage, historyLimit, recommendedLimit]);

  // 몬스터 상세 조회
  const {
    data: detailData,
    isLoading: isLoadingDetail,
    isFetching: isFetchingDetail,
    isError: isErrorDetail,
    error: errorDetail,
    refetch: refetchDetail,
  } = useMonsterDetail(searchParams);

  // 디버깅: API 응답 결과 출력
  useEffect(() => {
    if (detailData) {
      console.log('=== 몬스터 상세 조회 결과 ===');
      console.log('전체 응답:', detailData);
      console.log('enemyData:', detailData.enemyData);
      console.log('historyList:', detailData.historyList);
      console.log('historyTotalCount:', detailData.historyTotalCount);
      console.log('recommendedList:', detailData.recommendedList);
      console.log('recommendedTotalCount:', detailData.recommendedTotalCount);
    }
  }, [detailData]);

  // 디버깅: 요청 파라미터 출력
  useEffect(() => {
    if (searchParams) {
      console.log('=== 몬스터 상세 조회 요청 파라미터 ===');
      console.log('searchParams:', searchParams);
    }
  }, [searchParams]);

  // enemyData는 배열이므로 첫 번째 요소 사용
  const enemyData = (detailData?.enemyData && Array.isArray(detailData.enemyData) && detailData.enemyData.length > 0)
    ? detailData.enemyData[0]
    : null;
  const historyList = detailData?.historyList || [];
  const historyTotalCount = detailData?.historyTotalCount || 0;
  const recommendedList = detailData?.recommendedList || [];
  const recommendedTotalCount = detailData?.recommendedTotalCount || 0;

  const [addPopupOpen, setAddPopupOpen] = useState(false);
  const [deckDetailPopupOpen, setDeckDetailPopupOpen] = useState(false);
  const [selectedDeckItem, setSelectedDeckItem] = useState<RecommendedItem | null>(null);

  const handleAddPopupClose = () => {
    setAddPopupOpen(false);
    refetchDetail();
  };

  const handleDeckDetailPopupClose = () => {
    setDeckDetailPopupOpen(false);
    setSelectedDeckItem(null);
    refetchDetail();
  };

  const goBack = () => {
    router.push('/siege');
  };

  useEffect(() => {
    const detailParam = params?.detail as string;
    if (!detailParam) {
      setIsInitialized(true);
      return;
    }

    if (detailParam.includes('_')) {
      const parts = detailParam.split('_');
      const monsterKey = parts[0];
      const matchIdPart = parts[1];

      const dm = monsterKey.split('-');
      setSchData({
        dm1: dm[0],
        dm2: dm[1],
        dm3: dm[2],
      });
      setMatchId(matchIdPart);
    } else {
      const dm = detailParam.split('-');
      setSchData({
        dm1: dm[0],
        dm2: dm[1],
        dm3: dm[2],
      });
    }
    setIsInitialized(true);
  }, [params]);

  // 초기화 전이거나 초기 로딩 중 (데이터가 없을 때만 전체 로딩 표시)
  if (!isInitialized || (isLoadingDetail && !detailData)) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // 에러 발생
  if (isErrorDetail) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="error" sx={{ mb: 1 }}>
              데이터를 불러오는 중 오류가 발생했습니다
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {errorDetail instanceof Error ? errorDetail.message : '알 수 없는 오류가 발생했습니다.'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="outlined" onClick={() => refetchDetail()} color="primary">
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

  // 데이터 없음 (로딩 완료 후 데이터가 없는 경우)
  if (!enemyData && !isLoadingDetail && !isFetchingDetail) {
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

  // enemyData가 없으면 렌더링하지 않음 (타입 가드)
  if (!enemyData) {
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        {/* 헤더 */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={goBack}
            startIcon={<ArrowBackIcon />}
            size={mobile ? 'small' : 'medium'}
            sx={{
              borderColor: '#34495e',
              color: '#34495e',
              '&:hover': {
                borderColor: '#2c3e50',
                bgcolor: '#f8f9fa',
              },
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
              <CardContent
                sx={{
                  '&:last-child': {
                    paddingBottom: '16px',
                  },
                }}
              >
                {/* 몬스터 이미지 */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, gap: { xs: 1, md: 2 } }}>
                  {[1, 2, 3].map((index) => {
                    const imageUrl = enemyData?.[`image_url${index}` as keyof EnemyData] as string | undefined;
                    const monsterName = enemyData?.[`m${index}_kr_name` as keyof EnemyData] as string | undefined;
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

                {/* 리더 스킬 */}
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
                    {/* 좌측: 리더 아이콘 */}
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
                    {/* 우측: 리더 스킬 제목 + 설명 */}
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

                {/* 공성률 정보 */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 2,
                  }}
                >
                  <Box>
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
                        {enemyData?.total_rate || 0}%
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                        공성률
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
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
                        {enemyData?.total_count || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                        총 게임
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
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
                        {enemyData?.win_count || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                        승리
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
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
                        {enemyData?.lose_count || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                        패배
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
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
                            '&:hover': {
                              boxShadow: 2,
                              borderColor: '#34495e',
                            },
                            transition: 'all 0.2s',
                          }}
                        >
                          <CardContent
                            sx={{
                              py: 1.5,
                              '&:last-child': {
                                paddingBottom: '12px',
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                {[1, 2, 3].map((i) => {
                                  const imageUrl = item[`image_url${i}` as keyof RecommendedItem] as
                                    | string
                                    | undefined;
                                  return (
                                    imageUrl && (
                                      <Avatar
                                        key={i}
                                        src={getMonsterImageUrl(imageUrl)}
                                        sx={{
                                          width: { xs: 40, md: 50 },
                                          height: { xs: 40, md: 50 },
                                          border: '2px solid #34495e',
                                          boxShadow: 1,
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
                                  '&:hover': {
                                    borderColor: '#2c3e50',
                                    bgcolor: '#f8f9fa',
                                  },
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
                              '&.Mui-selected': {
                                bgcolor: '#34495e',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: '#2c3e50',
                                },
                              },
                              '&:hover': {
                                bgcolor: '#f8f9fa',
                              },
                            },
                          }}
                          size={mobile ? 'small' : 'medium'}
                        />
                      </Box>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* 공성률 정보 (공격 이력) */}
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
              <CardContent>
                {isFetchingDetail && !historyList.length ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : historyList.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                      공격 이력이 없습니다
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {isFetchingDetail && (
                      <Box sx={{ position: 'relative', mb: 1 }}>
                        <LinearProgress
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 2,
                            zIndex: 1,
                          }}
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
                            '&:hover': {
                              boxShadow: 2,
                              borderColor: '#34495e',
                            },
                            transition: 'all 0.2s',
                          }}
                        >
                          <CardContent
                            sx={{
                              py: 1.5,
                              px: 2,
                              '&:last-child': {
                                paddingBottom: '12px',
                              },
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                              }}
                            >
                              {/* 좌측: 몬스터 이미지 - 영역 확대 */}
                              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, minWidth: { xs: 'auto', md: 180 } }}>
                                {[1, 2, 3].map((i) => {
                                  const imageUrl = item[`image_url${i}` as keyof HistoryItem] as string | undefined;
                                  return (
                                    imageUrl && (
                                      <Avatar
                                        key={i}
                                        src={getMonsterImageUrl(imageUrl)}
                                        sx={{
                                          width: { xs: 44, md: 56 },
                                          height: { xs: 44, md: 56 },
                                          border: '2px solid #34495e',
                                          boxShadow: 1,
                                          ml: i > 1 ? -0.5 : 0,
                                        }}
                                      />
                                    )
                                  );
                                })}
                              </Box>
                              {/* 우측: 승률 정보 - 영역 축소 */}
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
                              '&.Mui-selected': {
                                bgcolor: '#34495e',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: '#2c3e50',
                                },
                              },
                              '&:hover': {
                                bgcolor: '#f8f9fa',
                              },
                            },
                          }}
                          size={mobile ? 'small' : 'medium'}
                        />
                      </Box>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>

        <AddDeckPopup
          open={addPopupOpen}
          onClose={handleAddPopupClose}
          onSave={handleAddPopupClose}
          type="empty"
          defenseMonster={schData.dm1 ? { dm1: schData.dm1, dm2: schData.dm2, dm3: schData.dm3 } : undefined}
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
