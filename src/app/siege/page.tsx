'use client';

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Avatar,
  Chip,
  Autocomplete,
  TextField,
  IconButton,
  Collapse,
  Fab,
  Checkbox,
  Divider,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Skeleton,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StarIcon from '@mui/icons-material/Star';
import { useEnemyTeamListSuspense, useMonsterList, type MonsterOption } from '@/hooks/api';
import { searchDataExtraction, getRatingColor, getRatingStars } from '@/shared/utils';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import { DEFAULT_ITEMS_PER_PAGE, AVATAR_SIZE_XS, AVATAR_SIZE_MD, PAGINATION_OPTIONS } from '@/shared/constants';
import { EmptyState, ErrorBoundary } from '@/shared/ui';
import { useResponsive, useServerPagination } from '@/shared/hooks';
import { getMonsterImageUrl } from '@/shared/utils/image';
import type { MonsterItem, SiegeSearchParams } from '@/types';
import type { GuildInfo } from '@/features/siege/types/siege';

const LEADER_INDEX = 0;
const MAX_MONSTERS = 3;
const SIEGE_SEARCH_STATE_KEY = 'smwr:siege-search-state:v1';

// 프로그레스바 컴포넌트 (부드러운 애니메이션)
const AnimatedProgressBar = ({ percentage, isHighRate }: { percentage: number; isHighRate: boolean }) => {
  const [displayPercentage, setDisplayPercentage] = useState(0);

  useEffect(() => {
    // 값이 변경될 때 부드럽게 애니메이션
    const timer = setTimeout(() => {
      setDisplayPercentage(percentage);
    }, 50); // 약간의 지연으로 애니메이션 트리거

    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <Box sx={{ mb: 0.5 }}>
      <Box
        sx={{
          position: 'relative',
          height: 8,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'grey.300',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${displayPercentage}%`,
            height: '100%',
            bgcolor: isHighRate ? 'primary.main' : 'warning.main',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'width',
          }}
        />
      </Box>
    </Box>
  );
};

function SiegeResultsSkeleton({ mobile }: { mobile: boolean }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(5, 1fr)',
        },
        gap: { xs: 1.5, md: 2 },
        mb: { xs: 3, md: 4 },
      }}
    >
      {Array.from({ length: mobile ? 6 : 10 }).map((_, idx) => (
        <Card key={idx} sx={{ boxShadow: 1, borderRadius: 2, overflow: 'hidden' }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <Skeleton variant="circular" width={mobile ? 38 : 56} height={mobile ? 38 : 56} />
              <Skeleton variant="circular" width={mobile ? 38 : 56} height={mobile ? 38 : 56} sx={{ ml: -1.25 }} />
              <Skeleton variant="circular" width={mobile ? 38 : 56} height={mobile ? 38 : 56} sx={{ ml: -1.25 }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Skeleton variant="text" width={36} />
              <Skeleton variant="text" width={64} />
            </Box>
            <Skeleton variant="rounded" height={8} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

function SiegeResultsSection({
  params,
  itemsPerPage,
  currentPage,
  isMobile,
  onItemClick,
  onPrev,
  onNext,
  onHasNextPageChange,
}: {
  params: SiegeSearchParams & { paging: number; offset: number };
  itemsPerPage: number;
  currentPage: number;
  isMobile: boolean;
  onItemClick: (item: MonsterItem) => void;
  onPrev: () => void;
  onNext: () => void;
  onHasNextPageChange: (hasNext: boolean) => void;
}) {
  const { data: enemyTeamList = [] } = useEnemyTeamListSuspense(params);
  const list = Array.isArray(enemyTeamList) ? enemyTeamList : [];
  const hasNextPage = list.length >= itemsPerPage;

  // 부모 쪽 버튼 disabled 계산을 위해 상태만 전달 (페이지 이동은 버튼 클릭에서만)
  useEffect(() => {
    onHasNextPageChange(hasNextPage);
  }, [hasNextPage, onHasNextPageChange]);

  if (list.length === 0) {
    return (
      <Card sx={{ boxShadow: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <EmptyState message="검색 결과가 없습니다" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
            lg: 'repeat(5, 1fr)',
          },
          gap: { xs: 1.5, md: 2 },
          mb: { xs: 3, md: 4 },
        }}
      >
        {list.map((item) => {
          const winCount = item.win_count || 0;
          const loseCount = item.lose_count || 0;
          const total = winCount + loseCount;
          const winRate = total > 0 ? Math.round((winCount / total) * 100) : 0;
          const winPercentage = total > 0 ? (winCount / total) * 100 : 0;

          return (
            <Card
              key={item.key}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 1,
                borderRadius: 2,
                overflow: 'hidden',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={() => onItemClick(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onItemClick(item);
                }
              }}
              aria-label={`${item.key} 방어덱 상세 보기`}
            >
              <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                {/* 몬스터 이미지 */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    mb: 1,
                    flexWrap: 'nowrap',
                  }}
                >
                  {[item.image_url1, item.image_url2, item.image_url3]
                    .filter(Boolean)
                    .map((url, idx) => (
                      <Avatar
                        key={idx}
                        src={getMonsterImageUrl(url)}
                        sx={{
                          width: { xs: 38, sm: 44, md: 56 },
                          height: { xs: 38, sm: 44, md: 56 },
                          ml: idx > 0 ? { xs: -1.25, md: -1 } : 0,
                          border: '2px solid',
                          borderColor: 'primary.main',
                          borderWidth: { xs: 1.5, md: 2 },
                          boxShadow: 1,
                          flexShrink: 0,
                          bgcolor: 'background.paper',
                          '& img': {
                            objectFit: 'contain',
                          },
                        }}
                        alt={`몬스터 ${idx + 1}`}
                      />
                    ))}
                </Box>

                {/* 승률과 승/패 */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, gap: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: winRate >= 50 ? 'success.main' : 'text.secondary',
                      fontSize: { xs: '0.7rem', md: '0.75rem' },
                    }}
                  >
                    {total > 0 ? `${winRate}%` : '100%'}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: { xs: '0.65rem', md: '0.75rem' },
                      display: total > 0 ? 'block' : 'none',
                    }}
                  >
                    {winCount}승 {loseCount}패
                  </Typography>
                </Box>

                {/* 승/패 프로그레스바 */}
                {total > 0 && <AnimatedProgressBar percentage={winPercentage} isHighRate={winRate >= 50} />}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* 페이지네이션: total-count 없이 prev/next */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: { xs: 1, md: 1.5 },
          flexWrap: 'wrap',
          mb: { xs: 8, md: 0 },
        }}
      >
        <Button variant="outlined" size={isMobile ? 'small' : 'medium'} onClick={onPrev} disabled={currentPage <= 1}>
          이전
        </Button>
        <Typography sx={{ fontWeight: 600 }}>{currentPage} 페이지</Typography>
        <Button
          variant="outlined"
          size={isMobile ? 'small' : 'medium'}
          onClick={onNext}
          disabled={!hasNextPage}
        >
          다음
        </Button>
      </Box>
    </>
  );
}

function SiegeContent() {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();
  const matchIdFromQuery = searchParams?.get('match_id');
  const [selectedMonsterList, setSelectedMonsterList] = useState<MonsterOption[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false); // 모바일 검색 조건 펼침/접기
  const [availableGuilds, setAvailableGuilds] = useState<GuildInfo[]>([]);
  const [selectedGuilds, setSelectedGuilds] = useState<string[]>([]);
  const [deckStarFilter, setDeckStarFilter] = useState<'ALL' | 'FOUR_STAR' | 'FIVE_STAR'>('ALL');

  // 몬스터 목록 조회 (React Query 사용)
  const { data: monsterList = [] } = useMonsterList();


  // 선택된 몬스터 ID 배열
  const selectMonster = useMemo(() => {
    return selectedMonsterList.map((m) => m.monster_id);
  }, [selectedMonsterList]);

  // sessionStorage에서 길드 정보 가져오기 (원본 Vue 코드와 동일)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // match_id가 없으면 길드 선택 초기화
    if (!matchIdFromQuery) {
      setAvailableGuilds([]);
      setSelectedGuilds([]);
      return;
    }

    try {
      const guildsData = sessionStorage.getItem(`siege_guilds_${matchIdFromQuery}`);
      if (guildsData) {
        const guilds: GuildInfo[] = JSON.parse(guildsData);

        if (guilds && Array.isArray(guilds)) {
          const filtered = guilds.filter(
            (guild) => guild.guild_name && guild.guild_name.toUpperCase() !== 'EVE.RE',
          );
          setAvailableGuilds(filtered);
        }
      } else {
        // sessionStorage에 데이터가 없으면 초기화
        setAvailableGuilds([]);
        setSelectedGuilds([]);
      }
    } catch (error) {
      logger.error('길드 목록 조회 실패', error);
      setAvailableGuilds([]);
      setSelectedGuilds([]);
    }
  }, [matchIdFromQuery]);

  // 선택된 길드 ID 배열
  const selectedGuildIds = useMemo(() => {
    return selectedGuilds
      .map((guildName) => {
        const guild = availableGuilds.find((g) => g.guild_name === guildName);
        return guild?.guild_id ? String(guild.guild_id) : null;
      })
      .filter((id): id is string => id !== null);
  }, [selectedGuilds, availableGuilds]);

  // 백엔드가 기대하는 형식으로 변환
  // XML에서 monster_id1, monster_id2, monster_id3를 기대함
  const apiSearchParams = useMemo(() => {
    const params: Record<string, string | number | boolean | string[] | undefined> = {};

    // match_id가 있으면 해당 점령전만 조회
    if (matchIdFromQuery) {
      params.match_id = matchIdFromQuery;
    }

    // 선택된 길드 ID가 있으면 필터링 (원본 Vue 코드와 동일)
    if (selectedGuildIds.length > 0) {
      params.guild_ids = selectedGuildIds;
    }

    // 리더 몬스터 (첫 번째) - monster_id1
    if (selectMonster.length > 0) {
      params.monster_id1 = selectMonster[0];
    }

    // 두 번째, 세 번째 몬스터 처리
    if (selectMonster.length === 2) {
      // 몬스터 1개만 더 선택된 경우 - monster_id2만 사용
      params.monster_id2 = selectMonster[1];
    } else if (selectMonster.length === 3) {
      // 몬스터 2개가 더 선택된 경우 - 정렬해서 monster_id2, monster_id3에 할당
      // XML 로직: LEAST와 GREATEST로 정렬하므로 순서대로 할당
      const [id2, id3] = selectMonster.slice(1).sort();
      params.monster_id2 = id2;
      params.monster_id3 = id3;
    }

    // 방덱 성급 필터: 백엔드 쿼리에서 처리(페이징 정확)
    if (deckStarFilter && deckStarFilter !== 'ALL') {
      params.deck_star_filter = deckStarFilter;
    }

    return searchDataExtraction(params);
  }, [selectMonster, matchIdFromQuery, selectedGuildIds, deckStarFilter]);

  const [shouldSearch, setShouldSearch] = useState(true); // 처음 접속 시 자동 조회
  const isInitialMount = useRef(true); // 처음 마운트 여부 추적
  const scrollPositionRef = useRef<number>(0); // 스크롤 위치 저장
  const [restoredMonsterIds, setRestoredMonsterIds] = useState<string[] | null>(null);
  const didRestoreRef = useRef(false);
  const restoringRef = useRef(false);

  // 서버 사이드 페이지네이션 자동 관리 (기본 10개)
  const pagination = useServerPagination({
    initialPage: 1,
    itemsPerPage: 10,
  });

  const persistSearchState = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload = {
        match_id: matchIdFromQuery || null,
        monster_ids: selectedMonsterList.map((m) => m.monster_id),
        selected_guilds: selectedGuilds,
        deck_star_filter: deckStarFilter,
        page: pagination.currentPage,
        itemsPerPage: pagination.itemsPerPage,
      };
      sessionStorage.setItem(SIEGE_SEARCH_STATE_KEY, JSON.stringify(payload));
    } catch {
      // no-op
    }
  }, [
    matchIdFromQuery,
    pagination.currentPage,
    pagination.itemsPerPage,
    deckStarFilter,
    selectedGuilds,
    selectedMonsterList,
  ]);

  // 서버 사이드 페이지네이션 파라미터 추가
  const searchParamsWithPagination = useMemo(() => {
    const params = {
      ...apiSearchParams,
      ...pagination.paginationParams,
    } as SiegeSearchParams & { paging: number; offset: number };

    return params;
  }, [apiSearchParams, pagination.paginationParams, matchIdFromQuery]);

  // 처음 접근 시 자동 조회 (한 번만 실행)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // 처음 접속 시 무조건 조회 API 호출
      setShouldSearch(true);
    }
  }, []);

  // 상세 화면 갔다가 뒤로왔을 때 검색 조건을 유지하기 위해 sessionStorage에 저장/복구
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(SIEGE_SEARCH_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        match_id?: string | null;
        monster_ids?: string[];
        selected_guilds?: string[];
        deck_star_filter?: 'ALL' | 'FOUR_STAR' | 'FIVE_STAR';
        page?: number;
        itemsPerPage?: number;
      };

      // match_id가 다르면 길드 선택은 무의미할 수 있어 몬스터만 복구
      const sameMatch = (parsed.match_id || null) === (matchIdFromQuery || null);
      const monsterIds = Array.isArray(parsed.monster_ids) ? parsed.monster_ids : [];
      const selectedGuilds = sameMatch && Array.isArray(parsed.selected_guilds) ? parsed.selected_guilds : [];
      const deckStarFilter =
        parsed.deck_star_filter === 'FOUR_STAR' || parsed.deck_star_filter === 'FIVE_STAR' || parsed.deck_star_filter === 'ALL'
          ? parsed.deck_star_filter
          : 'ALL';
      const page = typeof parsed.page === 'number' && parsed.page >= 1 ? parsed.page : 1;
      const itemsPerPage = typeof parsed.itemsPerPage === 'number' && parsed.itemsPerPage >= 1 ? parsed.itemsPerPage : 10;

      restoringRef.current = true;
      didRestoreRef.current = true;
      setRestoredMonsterIds(monsterIds);
      setSelectedGuilds(selectedGuilds);
      setDeckStarFilter(deckStarFilter);
      pagination.setItemsPerPage(itemsPerPage);
      pagination.setPage(page);
      // 복구 후 바로 검색 실행되도록
      setShouldSearch(true);
    } catch {
      // no-op
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchIdFromQuery]);

  // monsterList가 로드된 뒤 restoredMonsterIds를 MonsterOption[]으로 복원
  useEffect(() => {
    if (!restoredMonsterIds || restoredMonsterIds.length === 0) return;
    if (!monsterList || monsterList.length === 0) return;

    const byId = new Map(monsterList.map((m) => [m.monster_id, m]));
    const restored = restoredMonsterIds.map((id) => byId.get(id)).filter(Boolean) as MonsterOption[];
    if (restored.length > 0) {
      setSelectedMonsterList(restored);
    }
    // 1회 복구 후 해제
    setRestoredMonsterIds(null);
    restoringRef.current = false;
  }, [restoredMonsterIds, monsterList]);

  // 검색 조건 저장 (선택 몬스터/길드/페이지)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 복구 과정 중에는 저장하지 않음(초기 값으로 덮어쓰는 것 방지)
    if (restoringRef.current) return;
    try {
      const payload = {
        match_id: matchIdFromQuery || null,
        monster_ids: selectedMonsterList.map((m) => m.monster_id),
        selected_guilds: selectedGuilds,
        deck_star_filter: deckStarFilter,
        page: pagination.currentPage,
        itemsPerPage: pagination.itemsPerPage,
      };
      sessionStorage.setItem(SIEGE_SEARCH_STATE_KEY, JSON.stringify(payload));
    } catch {
      // no-op
    }
  }, [matchIdFromQuery, selectedMonsterList, selectedGuilds, deckStarFilter, pagination.currentPage, pagination.itemsPerPage]);

  // 몬스터가 선택되어 있고 shouldSearch가 true일 때만 검색 실행
  // 또는 처음 접근 시에는 몬스터 없이도 조회 가능하도록 조건 완화
  const isSearchEnabled = shouldSearch;

  const [hasNextPage, setHasNextPage] = useState(false);

  const handleMonsterChange = useCallback(
    (newValue: MonsterOption[]) => {
      if (newValue.length > MAX_MONSTERS) {
        showToast.error(`최대 ${MAX_MONSTERS}마리까지 선택할 수 있습니다.`);
        return;
      }
      setSelectedMonsterList(newValue);
      setShouldSearch(false); // 몬스터 선택 시 자동 검색 방지
      pagination.reset();
    },
    [pagination],
  );

  const handleRemoveMonster = useCallback(
    (monsterId: string) => {
      setSelectedMonsterList((prev) => prev.filter((m) => m.monster_id !== monsterId));
      setShouldSearch(false); // 몬스터 제거 시 자동 검색 방지
      pagination.reset();
    },
    [],
  );

  const handleReset = useCallback(() => {
    setSelectedMonsterList([]);
    setDeckStarFilter('ALL');
    setShouldSearch(false);
    pagination.reset();
  }, []);

  // 길드 선택 토글 (원본 Vue 코드와 동일)
  const toggleGuildSelection = useCallback(
    (guildName: string) => {
      setSelectedGuilds((prev) => {
        const index = prev.indexOf(guildName);
        if (index > -1) {
          return prev.filter((name) => name !== guildName);
        } else {
          return [...prev, guildName];
        }
      });
    },
    [],
  );

  // 길드 선택 변경 시 검색 실행 (원본 Vue 코드와 동일)
  const prevSelectedGuildIdsRef = useRef<string[]>([]);
  useEffect(() => {
    if (matchIdFromQuery && availableGuilds.length > 0) {
      // 길드 선택이 실제로 변경되었을 때만 검색 실행
      const hasChanged = JSON.stringify(prevSelectedGuildIdsRef.current) !== JSON.stringify(selectedGuildIds);
      if (hasChanged) {
        prevSelectedGuildIdsRef.current = selectedGuildIds;
        setShouldSearch(false);
        setTimeout(() => {
          setShouldSearch(true);
        }, 0);
      }
    }
  }, [selectedGuildIds, matchIdFromQuery, availableGuilds.length]);

  const handleSearch = useCallback(() => {
    // 검색 버튼 클릭 시 재조회
    setShouldSearch(false); // 먼저 false로 설정
    setTimeout(() => {
      setShouldSearch(true); // 그 다음 true로 설정하여 재조회 트리거
    }, 0);
    pagination.reset();
  }, [pagination]);

  const handleMonsterClick = useCallback((item: MonsterItem) => {
    // 상세 이동 직전에 동기 저장(뒤로가기로 복귀 시 상태 유지)
    persistSearchState();
    router.push(`/siege/siege-detail/${item.key}`);
  }, [persistSearchState, router]);

  const handlePageChange = useCallback(
    (_: unknown, page: number) => {
      // 현재 스크롤 위치 저장
      scrollPositionRef.current = window.scrollY;
      pagination.setPage(page);
    },
    [pagination],
  );

  // Suspense 패턴에서는 데이터 로딩 완료 타이밍을 직접 잡기 어렵기 때문에,
  // 페이지 변경 시 스크롤 복원은 "다음 프레임"에 수행합니다.
  useEffect(() => {
    if (scrollPositionRef.current > 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
        scrollPositionRef.current = 0;
      });
    }
  }, [pagination.currentPage]);

  const handleImageError = useCallback((event: React.SyntheticEvent<HTMLElement, Event>, imageUrl: string) => {
    // Avatar의 경우 img 태그를 찾아서 대체
    const img = (event.currentTarget as HTMLElement).querySelector('img');
    if (img) {
      img.src = getMonsterImageUrl('/images/default-monster.png');
    }
  }, []);

  // 검색 조건 컴포넌트 (재사용)
  const SearchConditionCard = () => (
    <Box sx={{ mb: { xs: 2, md: 3 } }}>
      <Typography variant={isMobile ? 'subtitle2' : 'h6'} sx={{ mb: { xs: 1.5, md: 2 }, fontWeight: 600 }}>
        몬스터 선택 (리더 1마리 + 나머지 2마리)
      </Typography>

      {/* 선택된 몬스터 슬롯 */}
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 1.5, md: 2 },
          mb: { xs: 2, md: 3 },
          justifyContent: 'center',
        }}
        role="list"
        aria-label="선택된 몬스터 슬롯"
      >
        {Array.from({ length: MAX_MONSTERS }).map((_, index) => (
          <Box
            key={index}
            sx={{
              width: { xs: 70, md: 100 },
              height: { xs: 70, md: 100 },
              border: { xs: '3px solid #6d5424', md: '4px solid #6d5424' },
              borderRadius: 1,
              backgroundColor: '#574424',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
            role="listitem"
            aria-label={index === LEADER_INDEX ? '리더 슬롯' : `몬스터 슬롯 ${index + 1}`}
          >
            {selectedMonsterList[index] ? (
              <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                <Avatar
                  src={getMonsterImageUrl(selectedMonsterList[index].image_url)}
                  alt={selectedMonsterList[index].kr_name}
                  sx={{
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer',
                    borderRadius: 0,
                  }}
                  onClick={() => handleRemoveMonster(selectedMonsterList[index].monster_id)}
                  onError={(e) => handleImageError(e, selectedMonsterList[index].image_url)}
                />
                {index === LEADER_INDEX && (
                  <Chip
                    label={isMobile ? 'L' : 'Leader'}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: { xs: -6, md: -8 },
                      right: { xs: -6, md: -8 },
                      fontSize: { xs: '9px', md: '10px' },
                      height: { xs: 18, md: 20 },
                      minWidth: { xs: 18, md: 'auto' },
                      bgcolor: 'primary.main',
                      color: 'white',
                    }}
                  />
                )}
              </Box>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                {index === LEADER_INDEX ? (
                  <Typography
                    sx={{
                      fontSize: { xs: 10, md: 14 },
                      fontWeight: 700,
                      color: 'white',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    }}
                  >
                    {isMobile ? 'L' : 'Leader'}
                  </Typography>
                ) : (
                  <Typography
                    sx={{
                      fontSize: { xs: 10, md: 14 },
                      color: 'text.secondary',
                    }}
                  >
                    {index + 1}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* 몬스터 검색 */}
      <Box sx={{ mb: { xs: 1.5, md: 2 } }}>
        <Autocomplete
          multiple
          options={monsterList}
          getOptionLabel={(option) =>
            `${option.monster_id}|${option.kr_name} ${option.un_name} ${option.modified_kr_name || ''}`.trim()
          }
          isOptionEqualToValue={(option, value) => option.monster_id === value.monster_id}
          filterOptions={(options, { inputValue }) => {
            if (!inputValue) return options.slice(0, 100);
            const searchTerm = inputValue.toLowerCase();
            return options.filter((option) => {
              const krName = option.kr_name?.toLowerCase() || '';
              const unName = option.un_name?.toLowerCase() || '';
              const modifiedName = option.modified_kr_name?.toLowerCase() || '';
              return krName.includes(searchTerm) || unName.includes(searchTerm) || modifiedName.includes(searchTerm);
            }).slice(0, 200);
          }}
          ListboxProps={{
            style: { maxHeight: isMobile ? 300 : 400, overflow: 'auto' },
          }}
          value={selectedMonsterList}
          onChange={(_, newValue) => {
            handleMonsterChange(newValue);
          }}
          sx={{
            '& .MuiAutocomplete-inputRoot': {
              justifyContent: 'center',
            },
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="몬스터 검색 및 선택"
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              aria-label="몬스터 검색 입력"
            />
          )}
          renderOption={(props, option) => {
            const { key, ...otherProps } = props;
            return (
              <Box
                component="li"
                key={key}
                {...otherProps}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 1,
                }}
              >
                <Avatar
                  src={getMonsterImageUrl(option.image_url)}
                  alt={option.kr_name}
                  sx={{ width: 40, height: 40, flexShrink: 0 }}
                  onError={(e) => handleImageError(e, option.image_url)}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                    {option.kr_name} {option.un_name}
                  </Typography>
                  {option.modified_kr_name && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {option.modified_kr_name}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option.monster_id}
                label={option.kr_name}
                avatar={
                  <Avatar
                    src={getMonsterImageUrl(option.image_url)}
                    alt={option.kr_name}
                    sx={{ borderRadius: 0 }}
                  />
                }
                onDelete={() => handleRemoveMonster(option.monster_id)}
                color={index === LEADER_INDEX ? 'primary' : 'default'}
                size={isMobile ? 'small' : 'medium'}
              />
            ))
          }
        />
      </Box>

      {/* 방덱 구분 (4성/5성) */}
      <Box sx={{ mb: { xs: 1.5, md: 2 } }}>
        <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
          <InputLabel id="deck-star-filter-label">방덱 구분</InputLabel>
          <Select
            labelId="deck-star-filter-label"
            value={deckStarFilter}
            label="방덱 구분"
            onChange={(e) => {
              const next = e.target.value as 'ALL' | 'FOUR_STAR' | 'FIVE_STAR';
              setDeckStarFilter(next);
              pagination.reset();
              setShouldSearch(false);
              setTimeout(() => setShouldSearch(true), 0);
            }}
          >
            <MenuItem value="ALL">전체</MenuItem>
            <MenuItem value="FOUR_STAR">4성 방덱 (3마리 모두 4★ 이하)</MenuItem>
            <MenuItem value="FIVE_STAR">5성 방덱 (그 외)</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* 버튼 */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleReset}
          fullWidth
          size={isMobile ? 'small' : 'medium'}
          aria-label="초기화"
        >
          초기화
        </Button>
        <Button
          variant="contained"
          onClick={handleSearch}
          fullWidth
          size={isMobile ? 'small' : 'medium'}
          disabled={selectedMonsterList.length === 0}
          aria-label="검색 실행"
        >
          검색
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: isSearchExpanded ? 40 : 2, md: 6 } }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, md: 3 } }}>
        {/* PC: 좌우 분할 레이아웃 */}
        <Box sx={{ display: { xs: 'block', md: 'flex' }, gap: { md: 4 }, alignItems: 'flex-start' }}>
          {/* PC: 좌측 사이드바 (검색 조건) */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              width: { md: 400 },
              flexShrink: 0,
              position: { md: 'sticky' },
              top: { md: 80 }, // 헤더 높이(64px) + 여유 공간(16px)
              alignSelf: { md: 'flex-start' },
              maxHeight: { md: 'calc(100vh - 80px)' }, // 헤더 높이 + 여유 공간
              overflowY: { md: 'auto' },
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
                '&:hover': {
                  background: 'rgba(0,0,0,0.3)',
                },
              },
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* 몬스터 선택 검색 조건 */}
              <Card sx={{ boxShadow: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <SearchConditionCard />
                </CardContent>
              </Card>

              {/* 길드 선택 섹션 */}
              {availableGuilds.length > 0 && (
                <Card sx={{ boxShadow: 2 }}>
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, rgb(25, 118, 210) 0%, rgba(25, 118, 210, 0.85) 100%)',
                      color: 'white',
                      px: 3,
                      py: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      상대 길드 선택
                    </Typography>
                  </Box>
                  <Divider />
                  <CardContent sx={{ p: 0 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                      }}
                    >
                      {availableGuilds.map((guild) => {
                        const isSelected = selectedGuilds.includes(guild.guild_name);
                        return (
                          <Box
                            key={guild.guild_name}
                            onClick={() => toggleGuildSelection(guild.guild_name)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              p: 2,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              borderRight: '1px solid',
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              background: isSelected
                                ? 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)'
                                : 'white',
                              borderLeft: isSelected ? '4px solid' : 'none',
                              borderLeftColor: isSelected ? 'primary.main' : 'transparent',
                              '&:hover': {
                                backgroundColor: isSelected ? '#e3f2fd' : '#f5f7fa',
                              },
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleGuildSelection(guild.guild_name)}
                              color="primary"
                              size="small"
                              sx={{ mr: 1.5 }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 700, mb: 0.75, fontSize: '0.875rem' }}
                                noWrap
                              >
                                {guild.guild_name}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
                                {Array.from({ length: getRatingStars(guild.rating) }).map((_, i) => (
                                  <StarIcon
                                    key={i}
                                    sx={{
                                      fontSize: 14,
                                      color: getRatingColor(guild.rating),
                                    }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Box>

          {/* 메인 콘텐츠 영역 */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                mb: { xs: 3, md: 4 },
                fontSize: { xs: '24px', md: '32px' },
                color: 'text.primary',
              }}
            >
              길드 공성전 방어덱 분석
            </Typography>

            {/* 모바일: 길드 선택 섹션 */}
            {availableGuilds.length > 0 && (
              <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
                <Card sx={{ boxShadow: 2 }}>
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, rgb(25, 118, 210) 0%, rgba(25, 118, 210, 0.85) 100%)',
                      color: 'white',
                      px: 3,
                      py: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      상대 길드 선택
                    </Typography>
                  </Box>
                  <Divider />
                  <CardContent sx={{ p: 0 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                      }}
                    >
                      {availableGuilds.map((guild) => {
                        const isSelected = selectedGuilds.includes(guild.guild_name);
                        return (
                          <Box
                            key={guild.guild_name}
                            onClick={() => toggleGuildSelection(guild.guild_name)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              p: 1.5,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              borderRight: '1px solid',
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              background: isSelected
                                ? 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)'
                                : 'white',
                              borderLeft: isSelected ? '4px solid' : 'none',
                              borderLeftColor: isSelected ? 'primary.main' : 'transparent',
                              '&:hover': {
                                backgroundColor: isSelected ? '#e3f2fd' : '#f5f7fa',
                              },
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleGuildSelection(guild.guild_name)}
                              color="primary"
                              size="small"
                              sx={{ mr: 1.5 }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.875rem' }}
                                noWrap
                              >
                                {guild.guild_name}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
                                {Array.from({ length: getRatingStars(guild.rating) }).map((_, i) => (
                                  <StarIcon
                                    key={i}
                                    sx={{
                                      fontSize: 12,
                                      color: getRatingColor(guild.rating),
                                    }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}


        {/* 모바일: 하단 fixed 검색 조건 */}
        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            bgcolor: 'background.paper',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {/* 토글 헤더 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1,
              bgcolor: '#000000',
              cursor: 'pointer',
            }}
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsSearchExpanded(!isSearchExpanded);
              }
            }}
            aria-label={isSearchExpanded ? '검색 조건 접기' : '검색 조건 펼치기'}
          >
            {/* 왼쪽: 선택한 몬스터 미리보기 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  mr: 1,
                  flexShrink: 0,
                }}
              >
                검색
              </Typography>
              {selectedMonsterList.length > 0 ? (
                <Box sx={{ display: 'flex', gap: -0.5, alignItems: 'center' }}>
                  {selectedMonsterList.slice(0, 3).map((monster, idx) => (
                    <Avatar
                      key={monster.monster_id}
                      src={getMonsterImageUrl(monster.image_url)}
                      alt={monster.kr_name}
                      sx={{
                        width: 32,
                        height: 32,
                        border: '1px solid',
                        borderColor: 'white',
                        ml: idx > 0 ? -0.5 : 0,
                      }}
                      onError={(e) => handleImageError(e, monster.image_url)}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  몬스터를 선택하세요
                </Typography>
              )}
            </Box>

            {/* 우측: 화살표 버튼 */}
            <IconButton
              sx={{ color: 'white', flexShrink: 0 }}
              aria-label={isSearchExpanded ? '접기' : '펼치기'}
            >
              {isSearchExpanded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          </Box>

          {/* 검색 조건 (Collapse 애니메이션) */}
          <Collapse in={isSearchExpanded} timeout="auto" unmountOnExit>
            <Card sx={{ borderRadius: 0 }}>
              <CardContent>
                <SearchConditionCard />
              </CardContent>
            </Card>
          </Collapse>
        </Box>

            {!shouldSearch ? (
              <Card sx={{ boxShadow: 2 }}>
                <CardContent sx={{ p: 4 }}>
                  <EmptyState
                    message={shouldSearch ? '검색 결과가 없습니다' : '몬스터를 선택하여 검색하세요'}
                  />
                </CardContent>
              </Card>
            ) : (
              <ErrorBoundary>
                <Suspense fallback={<SiegeResultsSkeleton mobile={isMobile} />}>
                  <SiegeResultsSection
                    params={searchParamsWithPagination}
                    itemsPerPage={pagination.itemsPerPage}
                    currentPage={pagination.currentPage}
                    isMobile={isMobile}
                    onItemClick={handleMonsterClick}
                    onPrev={() => handlePageChange(null, pagination.currentPage - 1)}
                    onNext={() => handlePageChange(null, pagination.currentPage + 1)}
                    onHasNextPageChange={setHasNextPage}
                  />
                </Suspense>
              </ErrorBoundary>
            )}

            {/* 페이지당 항목 수 선택만 항상 표시 (결과 영역에서 prev/next 렌더) */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', md: 'center' },
                gap: { xs: 2, md: 3 },
                mt: { xs: 4, md: 5 },
                mb: { xs: isSearchExpanded ? 16 : 8, md: 0 },
                py: { xs: 2, md: 3 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', md: 'auto' } }}>
                <FormControl
                  size={isMobile ? 'small' : 'medium'}
                  sx={{
                    minWidth: { xs: 120, md: 140 },
                    width: { xs: '100%', md: 'auto' },
                  }}
                  fullWidth={isMobile}
                >
                  <InputLabel id="items-per-page-label">보기</InputLabel>
                  <Select
                    labelId="items-per-page-label"
                    id="items-per-page-select"
                    value={pagination.itemsPerPage}
                    label="보기"
                    onChange={(e) => {
                      const newItemsPerPage = Number(e.target.value);
                      pagination.setItemsPerPage(newItemsPerPage);
                      setShouldSearch(false);
                      setTimeout(() => {
                        setShouldSearch(true);
                      }, 0);
                    }}
                  >
                    {PAGINATION_OPTIONS.map((option) => (
                      <MenuItem key={option.cd} value={option.cd}>
                        {option.cd_nm}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default function SiegePage() {
  return (
    <Suspense fallback={
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>로딩 중...</Typography>
      </Container>
    }>
      <SiegeContent />
    </Suspense>
  );
}
