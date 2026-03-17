'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Container,
  Chip,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { getRenderableImageUrl } from '@/shared/utils/image';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import type { MonsterStats } from '@/features/rta/types/rta';

type SortField =
  | 'pick_count'
  | 'pick_rate'
  | 'win_rate'
  | 'first_pick_rate'
  | 'ban_rate'
  | 'monster_name';
type SortOrder = 'asc' | 'desc';

interface RtaMonsterStatsClientProps {
  stats: MonsterStats[];
}

export default function RtaMonsterStatsClient({
  stats,
}: RtaMonsterStatsClientProps) {
  const [sortField, setSortField] = useState<SortField>('pick_count');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const sortedStats = useMemo(() => {
    if (stats.length === 0) return [];

    return [...stats].sort((a, b) => {
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
  }, [sortField, sortOrder, stats]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortOrder('desc');
  };

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PageHeader title="RTA 몬스터별 통계" />

      <Card sx={{ mb: 2, bgcolor: 'background.paper' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              정렬:
            </Typography>
            {(
              [
                'monster_name',
                'pick_count',
                'pick_rate',
                'win_rate',
                'first_pick_rate',
                'ban_rate',
              ] as SortField[]
            ).map((field) => {
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
                      {isSelected &&
                        (sortOrder === 'asc' ? (
                          <ArrowUpwardIcon sx={{ fontSize: '0.875rem' }} />
                        ) : (
                          <ArrowDownwardIcon sx={{ fontSize: '0.875rem' }} />
                        ))}
                    </Box>
                  }
                  onClick={() => handleSort(field)}
                  color={isSelected ? 'primary' : 'default'}
                  variant={isSelected ? 'filled' : 'outlined'}
                  size="small"
                  sx={{
                    height: 28,
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: 2,
                    },
                  }}
                />
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {sortedStats.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              데이터가 없습니다.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sortedStats.map((stat) => {
            const uniqueKey = stat.monster_id || stat.monster_name;
            const href = stat.monster_id ? `/rta/monster-stats/${stat.monster_id}` : undefined;

            return (
              <Card
                key={uniqueKey}
                component={href ? Link : 'div'}
                href={href}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  cursor: href ? 'pointer' : 'default',
                  textDecoration: 'none',
                  '&:hover': href
                    ? {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                        borderColor: 'primary.main',
                      }
                    : undefined,
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
                  <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 }, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flexShrink: 0,
                        p: 1,
                        borderRadius: 2,
                        bgcolor: 'background.default',
                        width: { xs: 90, md: 110 },
                        minWidth: { xs: 90, md: 110 },
                      }}
                    >
                      <Avatar
                        src={getRenderableImageUrl(stat.monster_image)}
                        alt={stat.monster_name}
                        sx={{
                          width: { xs: 70, md: 90 },
                          height: { xs: 70, md: 90 },
                          mb: 1.5,
                          boxShadow: 2,
                          border: '2px solid',
                          borderColor: 'divider',
                        }}
                        variant="rounded"
                      >
                        {stat.monster_name.charAt(0)}
                      </Avatar>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          textAlign: 'center',
                          lineHeight: 1.3,
                          color: 'text.primary',
                          wordBreak: 'keep-all',
                        }}
                      >
                        {stat.monster_name}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: { xs: 1.5, md: 2 },
                      }}
                    >
                      {[
                        { label: '픽률', value: `${stat.pick_count.toLocaleString()} (${formatPercentage(stat.pick_rate)})` },
                        { label: '승률', value: formatPercentage(stat.win_rate) },
                        { label: '선픽율', value: formatPercentage(stat.first_pick_rate) },
                        { label: '벤율', value: formatPercentage(stat.ban_rate) },
                      ].map((item) => (
                        <Box
                          key={item.label}
                          sx={{
                            p: { xs: 1, md: 1.5 },
                            borderRadius: 1.5,
                            bgcolor: 'action.hover',
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: 'action.selected',
                              transform: 'scale(1.02)',
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              mb: 1,
                              fontWeight: 500,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                            }}
                          >
                            {item.label}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              color: 'text.primary',
                              lineHeight: 1.2,
                            }}
                          >
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
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
