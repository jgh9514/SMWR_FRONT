'use client';

import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Autocomplete,
} from '@mui/material';
import { useMonsterList, usePopularAttackDeckCombos, type PopularAttackDeckCombosParams } from '@/hooks/api';
import type { RecommendedItem } from '@/features/siege/types/siegeDetail';
import { useResponsive, useServerPagination } from '@/shared/hooks';
import { getMonsterImageUrl } from '@/shared/utils/image';
import GuildRequiredGate from '@/features/guild/components/GuildRequiredGate';
import DeckDetailPopup from '@/components/popup/DeckDetailPopup';
import { EmptyState, ErrorBoundary } from '@/shared/ui';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';

function AttackDeckComboPageContent() {
  const { isMobile } = useResponsive();
  const pagination = useServerPagination({
    initialPage: 1,
    itemsPerPage: 20,
  });
  const { data: monsterList = [] } = useMonsterList();
  const [selectedDeckItem, setSelectedDeckItem] = useState<RecommendedItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMonster, setSelectedMonster] = useState<MonsterOption | null>(null);
  const [minUsageInput, setMinUsageInput] = useState('');
  const [sort, setSort] = useState<'USAGE_DESC' | 'LATEST_DESC'>('USAGE_DESC');
  const [appliedMonsterId, setAppliedMonsterId] = useState<string | undefined>(undefined);
  const [appliedMinUsage, setAppliedMinUsage] = useState<number | undefined>(undefined);
  const [appliedSort, setAppliedSort] = useState<'USAGE_DESC' | 'LATEST_DESC'>('USAGE_DESC');

  const queryParams = useMemo<PopularAttackDeckCombosParams>(
    () => ({
      paging: pagination.itemsPerPage,
      offset: pagination.currentPage,
      ...(appliedMonsterId ? { monster_id: appliedMonsterId } : {}),
      ...(typeof appliedMinUsage === 'number' ? { min_usage_count: appliedMinUsage } : {}),
      sort: appliedSort,
    }),
    [pagination.currentPage, pagination.itemsPerPage, appliedMonsterId, appliedMinUsage, appliedSort],
  );
  const combosQuery = usePopularAttackDeckCombos(queryParams, true);
  const comboList = combosQuery.data?.comboList ?? [];
  const hasNext = combosQuery.data?.hasNext ?? false;
  const totalCount = combosQuery.data?.totalCount ?? 0;

  const openDetail = (item: RecommendedItem) => {
    setSelectedDeckItem(item);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedDeckItem(null);
  };

  const applyFilters = () => {
    const parsedMinUsage = Number(minUsageInput);
    setAppliedMonsterId(selectedMonster?.monster_id);
    setAppliedMinUsage(Number.isFinite(parsedMinUsage) && parsedMinUsage > 0 ? parsedMinUsage : undefined);
    setAppliedSort(sort);
    pagination.setPage(1);
  };

  const resetFilters = () => {
    setSelectedMonster(null);
    setMinUsageInput('');
    setSort('USAGE_DESC');
    setAppliedMonsterId(undefined);
    setAppliedMinUsage(undefined);
    setAppliedSort('USAGE_DESC');
    pagination.setPage(1);
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, md: 3 } }}>
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '24px', md: '32px' } }}>
          공덱 조합 보기
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          자주 사용되는 공격 조합을 확인하고 상세 스펙/공략을 조회하세요.
        </Typography>
      </Box>

      <Card sx={{ boxShadow: 2, mb: { xs: 2, md: 3 } }}>
        <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1fr) 160px 180px auto auto' },
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <Autocomplete
              options={monsterList}
              value={selectedMonster}
              onChange={(_, value) => setSelectedMonster(value)}
              isOptionEqualToValue={(option, value) => option.monster_id === value.monster_id}
              getOptionLabel={(option) => `${option.kr_name} (${option.monster_id})`}
              renderInput={(params) => <TextField {...params} label="포함 몬스터" size="small" />}
            />
            <TextField
              label="최소 사용 횟수"
              size="small"
              value={minUsageInput}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                setMinUsageInput(digits);
              }}
              inputMode="numeric"
              placeholder="예: 3"
            />
            <FormControl size="small">
              <InputLabel id="popular-deck-sort-label">정렬</InputLabel>
              <Select
                labelId="popular-deck-sort-label"
                value={sort}
                label="정렬"
                onChange={(e) => setSort(e.target.value as 'USAGE_DESC' | 'LATEST_DESC')}
              >
                <MenuItem value="USAGE_DESC">사용순</MenuItem>
                <MenuItem value="LATEST_DESC">최신순</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={applyFilters}>
              조회
            </Button>
            <Button variant="outlined" onClick={resetFilters}>
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {combosQuery.isError ? (
        <Card sx={{ boxShadow: 2 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography color="error.main" sx={{ mb: 1, fontWeight: 600 }}>
              공덱 조합 목록을 불러오지 못했습니다.
            </Typography>
            <Button variant="outlined" onClick={() => combosQuery.refetch()}>
              다시 시도
            </Button>
          </CardContent>
        </Card>
      ) : comboList.length === 0 ? (
        <Card sx={{ boxShadow: 2 }}>
          <CardContent sx={{ p: 4 }}>
            <EmptyState message="등록된 공덱 조합이 없습니다." />
          </CardContent>
        </Card>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
                xl: 'repeat(5, 1fr)',
              },
              gap: { xs: 1.5, md: 2 },
              mb: { xs: 2.5, md: 3 },
            }}
          >
            {comboList.map((item) => {
              const usageCount = Number(item.usage_count ?? 0);
              const detailItem: RecommendedItem = {
                deck_id: item.deck_id != null ? String(item.deck_id) : undefined,
                atk_monster_1: item.atk_monster_1,
                atk_monster_2: item.atk_monster_2,
                atk_monster_3: item.atk_monster_3,
                image_url1: item.image_url1,
                image_url2: item.image_url2,
                image_url3: item.image_url3,
              };

              return (
                <Card
                  key={`${item.deck_id}-${item.atk_monster_1}-${item.atk_monster_2}-${item.atk_monster_3}`}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: 1,
                    borderRadius: 2,
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-3px)',
                    },
                  }}
                  onClick={() => openDetail(detailItem)}
                >
                  <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                      {[item.image_url1, item.image_url2, item.image_url3]
                        .filter(Boolean)
                        .map((url, idx) => (
                          <Avatar
                            key={`${item.deck_id}-${idx}`}
                            src={url ? getMonsterImageUrl(url) : undefined}
                            sx={{
                              width: { xs: 38, md: 52 },
                              height: { xs: 38, md: 52 },
                              ml: idx > 0 ? { xs: -1, md: -1.25 } : 0,
                              border: '2px solid',
                              borderColor: 'primary.main',
                              bgcolor: 'background.paper',
                              '& img': { objectFit: 'contain' },
                            }}
                          />
                        ))}
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', textAlign: 'center', fontSize: { xs: '0.68rem', md: '0.75rem' } }}
                    >
                      {item.m1_kr_name || item.atk_monster_1} · {item.m2_kr_name || item.atk_monster_2} ·{' '}
                      {item.m3_kr_name || item.atk_monster_3}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ mt: 1, textAlign: 'center', fontWeight: 700, color: 'primary.main' }}
                    >
                      사용 {usageCount.toLocaleString('ko-KR')}회
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5 }}>
            <Button
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              onClick={() => pagination.setPage(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1 || combosQuery.isFetching}
            >
              이전
            </Button>
            <Typography sx={{ fontWeight: 600 }}>
              {pagination.currentPage} 페이지 / 총 {totalCount.toLocaleString('ko-KR')} 조합
            </Typography>
            <Button
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              onClick={() => pagination.setPage(pagination.currentPage + 1)}
              disabled={!hasNext || combosQuery.isFetching}
            >
              다음
            </Button>
          </Box>
        </>
      )}

      <DeckDetailPopup
        open={detailOpen}
        onClose={closeDetail}
        selectedItem={selectedDeckItem}
      />
    </Container>
  );
}

export default function PopularAttackDeckCombosPage() {
  return (
    <GuildRequiredGate>
      <ErrorBoundary>
        <AttackDeckComboPageContent />
      </ErrorBoundary>
    </GuildRequiredGate>
  );
}
