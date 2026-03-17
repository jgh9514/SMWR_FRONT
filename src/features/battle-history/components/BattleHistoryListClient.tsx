'use client';

import Link from 'next/link';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Chip,
} from '@mui/material';
import { EmptyState, PageBanner, PageHeader } from '@/shared/ui';
import type { UserItem } from '@/features/battle-history/types/battle-history';

interface BattleHistoryListClientProps {
  userList: UserItem[];
}

export default function BattleHistoryListClient({
  userList,
}: BattleHistoryListClientProps) {
  return (
    <Box>
      <PageBanner />

      <Container sx={{ px: { xs: 1, md: 2 } }}>
        <PageHeader title="전적 목록" />

        {userList.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState message="전적 데이터가 없습니다." />
            </CardContent>
          </Card>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
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
                  component={Link}
                  href={`/battle-history/detail/${item.wizard_id}`}
                  sx={{
                    cursor: 'pointer',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
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
                      <Box sx={{ width: '1px', bgcolor: 'divider' }} />
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
