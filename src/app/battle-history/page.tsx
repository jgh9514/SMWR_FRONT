'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Chip,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useRecordList } from '@/hooks/api';
import { searchDataExtraction } from '@/shared/utils/util';
import { DEFAULT_PAGE_SIZE, DEFAULT_PAGE_OFFSET } from '@/shared/constants';
import { EmptyState, LoadingState, PageBanner, PageHeader } from '@/shared/ui';
import { useResponsive } from '@/shared/hooks';
import type { UserItem } from '@/types';

export default function BattleHistoryPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const responsive = useResponsive();
  const isMobile = isMounted ? responsive.isMobile : false;
  const schData = useMemo(() => ({ paging: DEFAULT_PAGE_SIZE, offset: DEFAULT_PAGE_OFFSET }), []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 검색 파라미터 준비
  const searchParams = useMemo(() => {
    return searchDataExtraction(schData);
  }, [schData]);

  // 전적 목록 조회
  const { data: userList = [], isLoading, isError } = useRecordList(searchParams);

  // 상세 페이지 이동
  const goDetail = (user: UserItem) => {
    router.push(`/battle-history/detail/${user.wizard_id}`);
  };

  return (
    <Box>
      <PageBanner />

      <Container sx={{ px: { xs: 1, md: 2 } }}>
        <PageHeader title="전적 목록" />
        {/* 로딩 상태 */}
        {isLoading && <LoadingState message="전적 데이터를 불러오는 중..." />}

        {/* 에러 상태 */}
        {isError && (
          <Card>
            <CardContent>
              <EmptyState message="전적 데이터를 불러올 수 없습니다." />
            </CardContent>
          </Card>
        )}

        {/* 빈 상태 */}
        {!isLoading && !isError && userList.length === 0 && (
          <Card>
            <CardContent>
              <EmptyState message="전적 데이터가 없습니다." />
            </CardContent>
          </Card>
        )}

        {/* 데이터 목록 */}
        {!isLoading && !isError && userList.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr', // 모바일: 1열
                sm: 'repeat(2, 1fr)', // 태블릿: 2열
                md: 'repeat(3, 1fr)', // PC: 3열
              },
              gap: { xs: 1.5, md: 2 },
              py: { xs: 2, md: 3 },
            }}
          >
            {userList.map((item) => {
              const winRate = item.total_rate || 0;
              const isHighWinRate = winRate >= 50;

              return (
                <Card
                  key={item.wizard_id}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => goDetail(item)}
                >
                  <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
                    {/* 유저명 */}
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        mb: 1.5,
                        fontSize: { xs: '1rem', md: '1.125rem' },
                        color: 'primary.main',
                        textDecoration: 'underline',
                      }}
                    >
                      {item.wizard_name}
                    </Typography>

                    {/* 승률 */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                          승률
                        </Typography>
                        <Chip
                          label={`${winRate}%`}
                          size="small"
                          color={isHighWinRate ? 'success' : 'default'}
                          sx={{
                            fontWeight: 600,
                            fontSize: { xs: '0.75rem', md: '0.875rem' },
                          }}
                        />
                      </Box>
                    </Box>

                    {/* 승/패 통계 */}
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        justifyContent: 'space-between',
                        pt: 1.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color: 'success.main',
                            fontSize: { xs: '1rem', md: '1.125rem' },
                          }}
                        >
                          {item.win_count || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                          승리
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: '1px',
                          bgcolor: 'divider',
                        }}
                      />
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color: 'error.main',
                            fontSize: { xs: '1rem', md: '1.125rem' },
                          }}
                        >
                          {item.lose_count || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                          패배
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>
    </Box>
  );
}
