'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Skeleton,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { searchDataExtraction, getRatingColor, getRatingStars } from '@/shared/utils';
import { formatSiegeDateLabel } from '@/shared/utils/format';
import { PAGINATION_OPTIONS, DEFAULT_PAGE_OFFSET } from '@/shared/constants';
import { PageBanner, PageHeader } from '@/shared/ui';
import { useResponsive } from '@/shared/hooks';
import { isAuthenticated } from '@/shared/utils/auth';
import { logger } from '@/shared/lib/logger';
import type { SiegeItem } from '@/features/siege/types/recent-siege';
import { useGuildSiegeHistory } from '@/features/siege/hooks/useRecentSiege';
import { useSiegeGuildViewParams } from '@/shared/hooks/useSiegeGuildViewParams';

export default function RecentSiegePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const responsive = useResponsive();
  const isMobile = isMounted ? responsive.isMobile : false;
  const [schData, setSchData] = useState({ paging: 5, offset: DEFAULT_PAGE_OFFSET });
  const [userInfo, setUserInfo] = useState<any>(null);
  const prevAuthRef = useRef<boolean | null>(null);
  const siegeGuildViewParams = useSiegeGuildViewParams();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const searchParams = useMemo(() => {
    const page = schData.offset;
    const pageSize = schData.paging;
    // count 없이 다음 페이지 존재 여부를 판단하기 위해 1개 더 요청
    const limit = pageSize + 1;
    const offset = (page - 1) * pageSize;

    return {
      ...searchDataExtraction(schData),
      ...siegeGuildViewParams,
      limit,
      offset,
      page,
    };
  }, [schData, siegeGuildViewParams]);

  // 점령전 이력 조회 (원본 Vue 코드와 동일한 API 사용)
  const {
    data: siegeListRaw = [],
    isLoading: isLoadingSiege,
    isError: isSiegeError,
    error: siegeError,
    refetch: refetchSiege,
  } = useGuildSiegeHistory(searchParams, true);

  // 로그인/로그아웃에 따라 화면 내용이 달라지므로 userInfo를 주기적으로 동기화
  const syncAuthState = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!isMounted) return;

    const authed = isAuthenticated();
    const stored = localStorage.getItem('userInfo');

    // 최초 1회 초기화
    if (prevAuthRef.current === null) {
      prevAuthRef.current = authed;
    }

    // 로그아웃 감지: 로그인 상태였다가 로그아웃되면 메인으로 이동 후 갱신
    if (prevAuthRef.current === true && authed === false) {
      prevAuthRef.current = authed;
      setUserInfo(null);
      router.replace('/');
      // 메인 화면에서 로그인 여부에 따라 데이터가 달라지므로 강제 갱신
      setTimeout(() => router.refresh(), 0);
      return;
    }

    // 로그인 감지: 비로그인 상태였다가 로그인되면 데이터 재조회
    if (prevAuthRef.current === false && authed === true) {
      prevAuthRef.current = authed;
      if (stored) {
        try {
          setUserInfo(JSON.parse(stored));
        } catch (error) {
          logger.error('사용자 정보 파싱 실패', error);
          setUserInfo(null);
        }
      } else {
        setUserInfo(null);
      }
      // 로그인 직후 통계/표시가 달라질 수 있으므로 재조회
      refetchSiege();
      return;
    }

    // 같은 인증 상태 내에서도 userInfo가 변경될 수 있으니 동기화
    if (stored) {
      try {
        setUserInfo(JSON.parse(stored));
      } catch (error) {
        logger.error('사용자 정보 파싱 실패', error);
        setUserInfo(null);
      }
    } else {
      setUserInfo(null);
    }
  }, [isMounted, refetchSiege, router]);

  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    syncAuthState();

    const handleAuthChanged = () => syncAuthState();
    window.addEventListener('smwr:auth-changed', handleAuthChanged);

    return () => {
      window.removeEventListener('smwr:auth-changed', handleAuthChanged);
    };
  }, [isMounted, syncAuthState]);
  
  // 401 인증 에러 확인
  const isAuthError = useMemo(() => {
    if (siegeError && 'response' in siegeError) {
      const axiosError = siegeError as { response?: { status?: number } };
      return axiosError.response?.status === 401;
    }
    return false;
  }, [siegeError]);

  // 403 길드 미가입/권한 에러 확인
  const isGuildForbiddenError = useMemo(() => {
    if (siegeError && 'response' in siegeError) {
      const axiosError = siegeError as { response?: { status?: number } };
      return axiosError.response?.status === 403;
    }
    return false;
  }, [siegeError]);
  
  // 자기 길드 ID 확인 (통계 표시용)
  const myGuildId = useMemo(() => {
    const guildId = userInfo?.guild_id ? String(userInfo.guild_id) : null;
    return guildId;
  }, [userInfo?.guild_id]);

  const pageSize = schData.paging;
  const hasNextPage = useMemo(() => {
    return Array.isArray(siegeListRaw) && siegeListRaw.length > pageSize;
  }, [siegeListRaw, pageSize]);

  // 모든 데이터 표시하되, 통계는 자기 길드 것만
  const siegeList = useMemo(() => {
    if (!siegeListRaw || siegeListRaw.length === 0) return [];

    // limit+1로 받아온 데이터를 pageSize로 자름
    const pageItems = siegeListRaw.slice(0, pageSize);
    
    if (!myGuildId) {
      // 길드 ID가 없으면 통계 없이 모든 데이터 표시
      return pageItems.map((item) => ({
        ...item,
        // 통계 정보 제거
        attack_rate_1st: undefined,
        attack_win_count_1st: undefined,
        total_attack_count_1st: undefined,
        defense_rate_1st: undefined,
        defense_win_count_1st: undefined,
        total_defense_count_1st: undefined,
        monster_usage_rate_1st: undefined,
        unique_monster_deck_count_1st: undefined,
        available_attack_count_1st: undefined,
        attack_rate_2nd: undefined,
        attack_win_count_2nd: undefined,
        total_attack_count_2nd: undefined,
        defense_rate_2nd: undefined,
        defense_win_count_2nd: undefined,
        total_defense_count_2nd: undefined,
        monster_usage_rate_2nd: undefined,
        unique_monster_deck_count_2nd: undefined,
        available_attack_count_2nd: undefined,
        attack_rate_3rd: undefined,
        attack_win_count_3rd: undefined,
        total_attack_count_3rd: undefined,
        defense_rate_3rd: undefined,
        defense_win_count_3rd: undefined,
        total_defense_count_3rd: undefined,
        monster_usage_rate_3rd: undefined,
        unique_monster_deck_count_3rd: undefined,
        available_attack_count_3rd: undefined,
      }));
    }
    
    return pageItems.map((item) => {
      // 자기 길드가 몇 등인지 확인
      const id1st = item.guild_id_1st != null ? String(item.guild_id_1st) : '';
      const id2nd = item.guild_id_2nd != null ? String(item.guild_id_2nd) : '';
      const id3rd = item.guild_id_3rd != null ? String(item.guild_id_3rd) : '';
      
      const myGuildRank = 
        id1st === myGuildId ? '1st' :
        id2nd === myGuildId ? '2nd' :
        id3rd === myGuildId ? '3rd' : null;
      
      // 원본 데이터 그대로 반환 (필터링하지 않음)
      // UI에서 자기 길드 통계만 표시하도록 처리
      return item;
    });
  }, [siegeListRaw, myGuildId, pageSize]);


  // 페이지 변경
  const changePage = (page: number) => {
    setSchData((prev) => ({ ...prev, offset: page }));
  };

  // 페이지 크기 변경
  const viewCountChange = (value: number) => {
    setSchData((prev) => ({ ...prev, paging: value, offset: DEFAULT_PAGE_OFFSET }));
  };

  // 매치 상세 보기 (원본 Vue 코드와 동일한 로직)
  const showMatchDetail = (item: SiegeItem) => {
    try {
      // 길드 정보를 sessionStorage에 저장 (길드 ID 포함)
      const guilds = [
        { guild_id: item.guild_id_1st || '', guild_name: item.guild_1st || '', rating: item.rating_1st || 0 },
        { guild_id: item.guild_id_2nd || '', guild_name: item.guild_2nd || '', rating: item.rating_2nd || 0 },
        { guild_id: item.guild_id_3rd || '', guild_name: item.guild_3rd || '', rating: item.rating_3rd || 0 },
      ].filter((guild) => guild.guild_name); // 빈 값 제거

      // sessionStorage에 길드 정보 저장
      if (typeof window !== 'undefined' && item.match_id) {
        sessionStorage.setItem(`siege_guilds_${item.match_id}`, JSON.stringify(guilds));
      }

      // siege 페이지로 이동 (match_id를 query parameter로 전달)
      if (item.match_id) {
        router.push(`/siege?match_id=${item.match_id}`);
      } else {
        router.push('/siege');
      }
    } catch (error) {
      logger.error('showMatchDetail error', error);
      router.push('/siege');
    }
  };

  if (isLoadingSiege) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Box sx={{ width: 'min(720px, 92vw)' }}>
          <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={120} />
        </Box>
      </Box>
    );
  }

  const hasNoData = siegeList.length === 0 || isSiegeError;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 2, md: 6 } }}>
      <PageBanner />

      {hasNoData && (
        <Container sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, md: 3 } }}>
          <PageHeader title="최근 점령전" />
          <Box sx={{ textAlign: 'center', py: { xs: 6, md: 8 } }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
              {isAuthError
                ? '로그인이 필요합니다'
                : isGuildForbiddenError
                ? '길드 가입이 필요합니다'
                : isSiegeError
                ? '점령전 데이터를 불러올 수 없습니다'
                : '점령전 데이터가 없습니다'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontSize: { xs: '0.875rem', md: '1rem' } }}>
              {isAuthError
                ? '점령전 데이터를 보려면 로그인이 필요합니다. 로그인 후 다시 시도해주세요.'
                : isGuildForbiddenError
                ? '점령전 데이터를 보려면 길드 가입이 필요합니다.'
                : isSiegeError
                ? '서버에서 데이터를 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
                : '현재 등록된 점령전 이력이 없습니다.'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              {isAuthError ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => router.push('/login')}
                  size={isMobile ? 'medium' : 'large'}
                >
                  로그인하기
                </Button>
              ) : isGuildForbiddenError ? (
                <Button variant="outlined" color="primary" onClick={() => router.push('/')} size={isMobile ? 'medium' : 'large'}>
                  메인으로
                </Button>
              ) : (
                <Button variant="outlined" color="primary" onClick={() => refetchSiege()} size={isMobile ? 'medium' : 'large'}>
                  새로고침
                </Button>
              )}
            </Box>
          </Box>
        </Container>
      )}

      {siegeList.length > 0 && (
        <Container sx={{ py: { xs: 3, md: 4 }, px: { xs: 1, md: 3 } }}>
          <PageHeader title="최근 점령전" />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, mt: { xs: 2, md: 3 } }}>
            {siegeList.map((item) => (
              <Card
                key={item.match_id}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: 2,
                  borderRadius: 2,
                  overflow: 'visible',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-4px)',
                  },
                }}
                onClick={() => showMatchDetail(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    showMatchDetail(item);
                  }
                }}
                aria-label={`${formatSiegeDateLabel(item.match_id) || item.match_id} 점령전 상세 보기`}
              >
                <CardHeader
                  sx={{
                    px: { xs: 2.5, md: 3 },
                    py: { xs: 2, md: 2.5 },
                    bgcolor: 'primary.main',
                    color: 'white',
                    '& .MuiCardHeader-title': {
                      color: 'white',
                    },
                  }}
                  title={
                    <Typography
                      align="center"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: '1rem', md: '1.25rem' },
                      }}
                    >
                      {formatSiegeDateLabel(item.match_id) || item.match_id}
                    </Typography>
                  }
                />
                <CardContent sx={{ px: { xs: 1.5, md: 2.5 }, py: { xs: 1.5, md: 2 }, overflow: 'visible' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: { xs: 0.75, md: 1.5 },
                      flexWrap: 'nowrap',
                    }}
                  >
                    {/* 자기 길드가 몇 등인지 확인 */}
                    {(() => {
                      const id1st = item.guild_id_1st != null ? String(item.guild_id_1st) : '';
                      const id2nd = item.guild_id_2nd != null ? String(item.guild_id_2nd) : '';
                      const id3rd = item.guild_id_3rd != null ? String(item.guild_id_3rd) : '';
                      
                      // 타입 변환하여 비교
                      const myGuildIdStr = myGuildId ? String(myGuildId) : '';
                      
                      const myGuildRank = 
                        myGuildIdStr && id1st === myGuildIdStr ? '1st' :
                        myGuildIdStr && id2nd === myGuildIdStr ? '2nd' :
                        myGuildIdStr && id3rd === myGuildIdStr ? '3rd' : null;
                      
                      // 1등 길드 */}
                      const renderGuildBox = (rank: '1st' | '2nd' | '3rd', isMyGuild: boolean) => {
                        const is1st = rank === '1st';
                        const is2nd = rank === '2nd';
                        const is3rd = rank === '3rd';
                        
                        const guildName = is1st ? item.guild_1st : is2nd ? item.guild_2nd : item.guild_3rd;
                        const rating = is1st ? item.rating_1st : is2nd ? item.rating_2nd : item.rating_3rd;
                        
                        // 통계 데이터 가져오기
                        const attackWinCount = is1st ? item.attack_win_count_1st : is2nd ? item.attack_win_count_2nd : item.attack_win_count_3rd;
                        const totalAttackCount = is1st ? item.total_attack_count_1st : is2nd ? item.total_attack_count_2nd : item.total_attack_count_3rd;
                        const attackRate = is1st ? item.attack_rate_1st : is2nd ? item.attack_rate_2nd : item.attack_rate_3rd;
                        const defenseWinCount = is1st ? item.defense_win_count_1st : is2nd ? item.defense_win_count_2nd : item.defense_win_count_3rd;
                        const totalDefenseCount = is1st ? item.total_defense_count_1st : is2nd ? item.total_defense_count_2nd : item.total_defense_count_3rd;
                        const defenseRate = is1st ? item.defense_rate_1st : is2nd ? item.defense_rate_2nd : item.defense_rate_3rd;
                        const monsterCount = is1st ? item.unique_monster_deck_count_1st : is2nd ? item.unique_monster_deck_count_2nd : item.unique_monster_deck_count_3rd;
                        
                        // 통계는 자기 길드 것만 표시 (통계 데이터가 있는 경우에만)
                        const hasStats = (attackWinCount != null && attackWinCount !== undefined) || 
                                        (defenseWinCount != null && defenseWinCount !== undefined) || 
                                        (monsterCount != null && monsterCount !== undefined);
                        const showStats = isMyGuild && hasStats;
                        
                        return (
                          <Box
                            key={rank}
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              p: { xs: 1.5, md: 2 },
                              borderRadius: 2,
                              background: is1st 
                                ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'
                                : is2nd
                                ? 'linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%)'
                                : 'linear-gradient(135deg, #cd7f32 0%, #daa520 100%)',
                              textAlign: 'center',
                              minHeight: { xs: 90, md: 110 },
                              position: 'relative',
                              boxShadow: is1st
                                ? '0 2px 8px rgba(255, 215, 0, 0.3)'
                                : is2nd
                                ? '0 2px 8px rgba(192, 192, 192, 0.3)'
                                : '0 2px 8px rgba(205, 127, 50, 0.3)',
                              transition: 'all 0.2s ease',
                              border: isMyGuild ? '2px solid #1976d2' : 'none',
                              '&:hover': {
                                transform: 'scale(1.02)',
                                boxShadow: is1st
                                  ? '0 4px 12px rgba(255, 215, 0, 0.4)'
                                  : is2nd
                                  ? '0 4px 12px rgba(192, 192, 192, 0.4)'
                                  : '0 4px 12px rgba(205, 127, 50, 0.4)',
                              },
                            }}
                          >
                            {/* 메달 아이콘 - 좌측 위 */}
                            <Box
                              sx={{
                                position: 'absolute',
                                top: { xs: -8, md: -12 },
                                left: { xs: -8, md: -12 },
                                fontSize: { xs: '20px', md: '28px' },
                                background: 'white',
                                borderRadius: '50%',
                                width: { xs: 32, md: 40 },
                                height: { xs: 32, md: 40 },
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                                zIndex: 1,
                              }}
                            >
                              {is1st ? '🥇' : is2nd ? '🥈' : '🥉'}
                            </Box>
                            {/* 별 아이콘 - 길드명 위 */}
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: 0.25,
                                mb: { xs: 0.5, md: 0.75 },
                                mt: { xs: 0.25, md: 0 },
                              }}
                            >
                              {Array.from({ length: getRatingStars(rating) }).map((_, i) => (
                                <StarIcon
                                  key={i}
                                  sx={{
                                    fontSize: { xs: 11, md: 14 },
                                    color: getRatingColor(rating),
                                  }}
                                />
                              ))}
                            </Box>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: { xs: '0.8rem', md: '1rem' },
                                lineHeight: 1.2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                wordBreak: 'break-word',
                                color: 'rgba(0, 0, 0, 0.85)',
                                mb: { xs: 0.25, md: 0.5 },
                              }}
                            >
                              {guildName || '-'}
                            </Typography>
                            {/* 통계 정보 - 자기 길드 것만 표시 */}
                            {showStats && (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.25, md: 0.4 }, mt: { xs: 0.5, md: 0.75 }, alignItems: 'flex-start' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, md: 0.5 }, width: '100%' }}>
                                  <Box sx={{ fontSize: { xs: '0.8rem', md: '0.9rem' }, lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>⚔️</Box>
                                  <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' }, color: 'rgba(0, 0, 0, 0.8)', fontWeight: 500, lineHeight: 1.2, flex: 1 }}>
                                    <Box component="span" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.9)' }}>
                                      {attackWinCount ?? 0}/{totalAttackCount ?? 0}
                                    </Box> ({attackRate?.toFixed(1) || '0.0'}%)
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, md: 0.5 }, width: '100%' }}>
                                  <Box sx={{ fontSize: { xs: '0.8rem', md: '0.9rem' }, lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>🛡️</Box>
                                  <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' }, color: 'rgba(0, 0, 0, 0.8)', fontWeight: 500, lineHeight: 1.2, flex: 1 }}>
                                    <Box component="span" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.9)' }}>
                                      {defenseWinCount ?? 0}/{totalDefenseCount ?? 0}
                                    </Box> ({defenseRate?.toFixed(1) || '0.0'}%)
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, md: 0.5 }, width: '100%' }}>
                                  <Box sx={{ fontSize: { xs: '0.8rem', md: '0.9rem' }, lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>👾</Box>
                                  <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' }, color: 'rgba(0, 0, 0, 0.8)', fontWeight: 500, lineHeight: 1.2, flex: 1 }}>
                                    <Box component="span" sx={{ fontWeight: 600, color: 'rgba(0, 0, 0, 0.9)' }}>
                                      {monsterCount ?? 0}
                                    </Box>마리
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        );
                      };
                      
                      return (
                        <>
                          {renderGuildBox('1st', myGuildRank === '1st')}
                          {renderGuildBox('2nd', myGuildRank === '2nd')}
                          {renderGuildBox('3rd', myGuildRank === '3rd')}
                        </>
                      );
                    })()}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* 페이지네이션 */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: { xs: 3, sm: 2 },
              mt: { xs: 4, md: 5 },
              mb: { xs: 3, md: 2 },
              py: { xs: 2, md: 3 },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, flex: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={() => changePage(Math.max(1, schData.offset - 1))}
                disabled={schData.offset <= 1}
                size={isMobile ? 'small' : 'medium'}
              >
                이전
              </Button>
              <Typography sx={{ fontWeight: 600 }}>{schData.offset} 페이지</Typography>
              <Button
                variant="outlined"
                onClick={() => changePage(schData.offset + 1)}
                disabled={!hasNextPage}
                size={isMobile ? 'small' : 'medium'}
              >
                다음
              </Button>
            </Box>
            <FormControl
              size="small"
              sx={{
                minWidth: { xs: '100%', sm: 150 },
                maxWidth: { xs: '100%', sm: 150 },
              }}
            >
              <InputLabel>보기</InputLabel>
              <Select
                value={schData.paging}
                label="보기"
                onChange={(e) => viewCountChange(Number(e.target.value))}
              >
                {PAGINATION_OPTIONS.map((item) => (
                  <MenuItem key={item.cd} value={item.cd}>
                    {item.cd_nm}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Container>
      )}
    </Box>
  );
}

