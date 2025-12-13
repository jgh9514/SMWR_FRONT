'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Avatar,
  Container,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { getMonsterImageUrl } from '@/shared/utils/image';
import type { MonsterStats, RtaMonsterStatsResponse } from '@/features/rta/types/rta';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import { useRtaMonsterStats } from '@/features/rta/hooks/useRtaData';

type SortField = 'pick_count' | 'pick_rate' | 'win_rate' | 'first_pick_rate' | 'ban_rate' | 'monster_name';
type SortOrder = 'asc' | 'desc';

const TOP_MONSTERS_LIMIT = 100;

export default function RtaMonsterStatsPage() {
  const router = useRouter();
  const theme = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const isMobileQuery = useMediaQuery(theme.breakpoints.down('md'));
  const isMobile = isMounted ? isMobileQuery : false;
  const [sortField, setSortField] = useState<SortField>('pick_count');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 클라이언트 마운트 확인
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 상위 100개 몬스터만 조회
  const { data, isLoading, error } = useRtaMonsterStats(TOP_MONSTERS_LIMIT, 0);

  // 데이터 가져오기
  const allStats = useMemo(() => {
    if (!data || !data.stats) return [];
    return data.stats;
  }, [data]);

  // 정렬된 데이터
  const sortedStats = useMemo(() => {
    if (!allStats || allStats.length === 0) return [];

    // 정렬
    const sorted = [...allStats].sort((a: MonsterStats, b: MonsterStats) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'monster_name':
          aValue = a.monster_name;
          bValue = b.monster_name;
          break;
        case 'pick_count':
          aValue = a.pick_count;
          bValue = b.pick_count;
          break;
        case 'pick_rate':
          aValue = a.pick_rate;
          bValue = b.pick_rate;
          break;
        case 'win_rate':
          aValue = a.win_rate;
          bValue = b.win_rate;
          break;
        case 'first_pick_rate':
          aValue = a.first_pick_rate;
          bValue = b.first_pick_rate;
          break;
        case 'ban_rate':
          aValue = a.ban_rate;
          bValue = b.ban_rate;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const numA = Number(aValue);
      const numB = Number(bValue);

      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

    return sorted;
  }, [allStats, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <PageHeader title="RTA 몬스터별 통계" />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <PageHeader title="RTA 몬스터별 통계" />
        <Card>
          <CardContent>
            <Typography color="error">데이터를 불러오는 중 오류가 발생했습니다.</Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PageHeader title="RTA 몬스터별 통계" />

      {/* 정렬 헤더 */}
      <Card sx={{ mb: 2, bgcolor: 'background.paper' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 500 }}>
              정렬:
            </Typography>
            {(['monster_name', 'pick_count', 'pick_rate', 'win_rate', 'first_pick_rate', 'ban_rate'] as SortField[]).map((field) => {
              const labels: Record<SortField, string> = {
                monster_name: '몬스터',
                pick_count: '픽횟수',
                pick_rate: '픽률',
                win_rate: '승률',
                first_pick_rate: '선픽율',
                ban_rate: '벤율',
              };
              const isSelected = sortField === field;
              return (
                <Chip
                  key={field}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span>{labels[field]}</span>
                      {isSelected && (
                        isMobile ? (
                          sortOrder === 'asc' ? '↑' : '↓'
                        ) : (
                          sortOrder === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: '0.875rem' }} /> : <ArrowDownwardIcon sx={{ fontSize: '0.875rem' }} />
                        )
                      )}
                    </Box>
                  }
                  onClick={() => handleSort(field)}
                  color={isSelected ? 'primary' : 'default'}
                  variant={isSelected ? 'filled' : 'outlined'}
                  size="small"
                  sx={{ 
                    fontSize: isMobile ? '0.65rem' : '0.7rem', 
                    height: 28,
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: 2,
                    }
                  }}
                />
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* 통계 리스트 */}
      {sortedStats.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">데이터가 없습니다.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sortedStats.map((stat: MonsterStats, index: number) => {
            // 고유한 key 생성: monster_id 우선, 없으면 이름+인덱스 fallback
            const uniqueKey = stat.monster_id;
            
            const handleCardClick = () => {
              if (stat.monster_id && stat.monster_elemental) {
                router.push(`/rta/monster-stats/${stat.monster_id}`);
              }
            };

            return (
              <Card 
                key={uniqueKey}
                onClick={handleCardClick}
                sx={{ 
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': { 
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    borderColor: 'primary.main',
                  }
                }}
              >
                <CardContent sx={{ p: isMobile ? 2 : 2.5, '&:last-child': { pb: isMobile ? 2 : 2.5 } }}>
                  <Box sx={{ display: 'flex', gap: isMobile ? 2 : 3, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                    {/* 좌측: 몬스터 이미지와 이름 */}
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        flexShrink: 0,
                        p: 1,
                        borderRadius: 2,
                        bgcolor: 'background.default',
                        width: isMobile ? 90 : 110,
                        minWidth: isMobile ? 90 : 110
                      }}
                    >
                      <Avatar
                        key={`${uniqueKey}-avatar-${stat.monster_image || ''}`}
                        src={stat.monster_image ? getMonsterImageUrl(stat.monster_image) : undefined}
                        alt={stat.monster_name}
                        sx={{ 
                          width: isMobile ? 70 : 90, 
                          height: isMobile ? 70 : 90, 
                          mb: 1.5,
                          boxShadow: 2,
                          border: '2px solid',
                          borderColor: 'divider'
                        }}
                        variant="rounded"
                        imgProps={{
                          onError: (e) => {
                            // 이미지 로드 실패 시 기본 이미지로 대체
                            const target = e.target as HTMLImageElement;
                            if (target.src !== '/images/default-monster.png') {
                              target.src = '/images/default-monster.png';
                            }
                          }
                        }}
                      >
                        {(!stat.monster_image || stat.monster_image === '') && stat.monster_name.charAt(0)}
                      </Avatar>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600, 
                          textAlign: 'center',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          lineHeight: 1.3,
                          color: 'text.primary',
                          wordBreak: 'keep-all'
                        }}
                      >
                        {stat.monster_name}
                      </Typography>
                    </Box>

                    {/* 우측: 통계 정보 2x2 그리드 */}
                    <Box sx={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? 1.5 : 2 }}>
                      {/* 픽률 */}
                      <Box 
                        sx={{ 
                          p: isMobile ? 1 : 1.5,
                          borderRadius: 1.5,
                          bgcolor: 'action.hover',
                          border: '1px solid',
                          borderColor: 'divider',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-start',
                          '&:hover': {
                            bgcolor: 'action.selected',
                            transform: 'scale(1.02)',
                          }
                        }}
                      >
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ 
                            fontSize: isMobile ? '0.65rem' : '0.7rem', 
                            display: 'block', 
                            mb: 1,
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}
                        >
                          픽률
                        </Typography>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 700, 
                            fontSize: isMobile ? '1.1rem' : '1.4rem',
                            color: 'text.primary',
                            lineHeight: 1.2
                          }}
                        >
                          {stat.pick_count.toLocaleString()}
                          <Typography 
                            component="span" 
                            sx={{ 
                              fontSize: isMobile ? '0.75rem' : '0.875rem',
                              fontWeight: 500,
                              color: 'text.secondary',
                              ml: 0.5
                            }}
                          >
                            ({formatPercentage(stat.pick_rate)})
                          </Typography>
                        </Typography>
                      </Box>

                      {/* 승률 */}
                      <Box 
                        sx={{ 
                          p: isMobile ? 1 : 1.5,
                          borderRadius: 1.5,
                          bgcolor: 'action.hover',
                          border: '1px solid',
                          borderColor: 'divider',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-start',
                          '&:hover': {
                            bgcolor: 'action.selected',
                            transform: 'scale(1.02)',
                          }
                        }}
                      >
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ 
                            fontSize: isMobile ? '0.65rem' : '0.7rem', 
                            display: 'block', 
                            mb: 1,
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}
                        >
                          승률
                        </Typography>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 700, 
                            fontSize: isMobile ? '1.1rem' : '1.4rem',
                            color: 'text.primary',
                            lineHeight: 1.2
                          }}
                        >
                          {formatPercentage(stat.win_rate)}
                        </Typography>
                      </Box>

                      {/* 선픽율 */}
                      <Box 
                        sx={{ 
                          p: isMobile ? 1 : 1.5,
                          borderRadius: 1.5,
                          bgcolor: 'action.hover',
                          border: '1px solid',
                          borderColor: 'divider',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-start',
                          '&:hover': {
                            bgcolor: 'action.selected',
                            transform: 'scale(1.02)',
                          }
                        }}
                      >
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ 
                            fontSize: isMobile ? '0.65rem' : '0.7rem', 
                            display: 'block', 
                            mb: 1,
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}
                        >
                          선픽율
                        </Typography>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 700, 
                            fontSize: isMobile ? '1.1rem' : '1.4rem',
                            color: 'text.primary',
                            lineHeight: 1.2
                          }}
                        >
                          {formatPercentage(stat.first_pick_rate)}
                        </Typography>
                      </Box>

                      {/* 벤율 */}
                      <Box 
                        sx={{ 
                          p: isMobile ? 1 : 1.5,
                          borderRadius: 1.5,
                          bgcolor: 'action.hover',
                          border: '1px solid',
                          borderColor: 'divider',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-start',
                          '&:hover': {
                            bgcolor: 'action.selected',
                            transform: 'scale(1.02)',
                          }
                        }}
                      >
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ 
                            fontSize: isMobile ? '0.65rem' : '0.7rem', 
                            display: 'block', 
                            mb: 1,
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}
                        >
                          벤율
                        </Typography>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 700, 
                            fontSize: isMobile ? '1.1rem' : '1.4rem',
                            color: 'text.primary',
                            lineHeight: 1.2
                          }}
                        >
                          {formatPercentage(stat.ban_rate)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
          
        </Box>
      )}
    </Container>
  );
}

