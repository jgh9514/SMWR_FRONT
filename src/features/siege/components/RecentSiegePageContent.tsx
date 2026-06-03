'use client';

import { useState, useMemo, useEffect, useRef, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Container,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Skeleton,
} from '@mui/material';
import { searchDataExtraction } from '@/shared/utils';
import { PAGINATION_OPTIONS, DEFAULT_PAGE_OFFSET } from '@/shared/constants';
import { PageHeader } from '@/shared/ui';
import RecentSiegeMatchCard from '@/features/siege/components/RecentSiegeMatchCard';
import { useResponsive } from '@/shared/hooks';
import { isAuthenticated } from '@/shared/utils/auth';
import { logger } from '@/shared/lib/logger';
import type { SiegeItem } from '@/features/siege/types/recent-siege';
import { useGuildSiegeHistory } from '@/features/siege/hooks/useRecentSiege';
import { useSiegeGuildViewParams } from '@/shared/hooks/useSiegeGuildViewParams';
import type { UserInfo } from '@/features/auth/types/auth';

export default function RecentSiegePageContent() {
  const router = useRouter();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const authSnapshot = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') {
        return () => {};
      }

      const handleChange = () => onStoreChange();
      window.addEventListener('smwr:auth-changed', handleChange);
      window.addEventListener('storage', handleChange);
      return () => {
        window.removeEventListener('smwr:auth-changed', handleChange);
        window.removeEventListener('storage', handleChange);
      };
    },
    () => {
      if (typeof window === 'undefined') {
        return '0::';
      }
      return `${isAuthenticated() ? '1' : '0'}::${localStorage.getItem('userInfo') ?? ''}`;
    },
    () => '0::',
  );
  const responsive = useResponsive();
  const isMobile = isClient ? responsive.isMobile : false;
  const [schData, setSchData] = useState({ paging: 5, offset: DEFAULT_PAGE_OFFSET });
  const prevAuthRef = useRef<boolean | null>(null);
  const siegeGuildViewParams = useSiegeGuildViewParams();
  const [authFlag, userInfoJson] = authSnapshot.split('::', 2);
  const isAuthed = authFlag === '1';
  const userInfo = useMemo<UserInfo | null>(() => {
    if (!userInfoJson) {
      return null;
    }

    try {
      return JSON.parse(userInfoJson) as UserInfo;
    } catch (error) {
      logger.error('사용자 정보 파싱 실패', error);
      return null;
    }
  }, [userInfoJson]);

  const searchParams = useMemo(() => {
    const page = schData.offset;
    const pageSize = schData.paging;
    // count 없이 다음 페이지 존재 여부를 판단하기 위해 1개 더 요청
    const limit = pageSize + 1;
    const offset = (page - 1) * pageSize;

    // offset만 전달 — page와 limit을 함께 보내면 SQL이 (page-1)*limit 으로 재계산해 페이지가 어긋남
    return {
      ...searchDataExtraction(schData),
      ...siegeGuildViewParams,
      limit,
      offset,
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

  useEffect(() => {
    if (!isClient) {
      return;
    }

    if (prevAuthRef.current === null) {
      prevAuthRef.current = isAuthed;
      return;
    }

    if (prevAuthRef.current === true && isAuthed === false) {
      prevAuthRef.current = isAuthed;
      router.replace('/');
      setTimeout(() => router.refresh(), 0);
      return;
    }

    if (prevAuthRef.current === false && isAuthed === true) {
      prevAuthRef.current = isAuthed;
      refetchSiege();
      return;
    }

    prevAuthRef.current = isAuthed;
  }, [isAuthed, isClient, refetchSiege, router]);
  
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
  const myGuildId = userInfo?.guild_id ? String(userInfo.guild_id) : null;

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
    
    return pageItems;
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
              <RecentSiegeMatchCard
                key={item.match_id}
                item={item}
                myGuildId={myGuildId}
                onSelect={showMatchDetail}
              />
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

