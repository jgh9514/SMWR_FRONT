'use client';

import Link from 'next/link';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { EmptyState, PageHeader } from '@/shared/ui';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import type { UserItem } from '@/features/battle-history/types/battle-history';

interface BattleHistoryListClientProps {
  userList: UserItem[];
  seasonNo?: string;
  emptyMessage?: string;
  children?: React.ReactNode;
}

export default function BattleHistoryListClient({
  userList,
  seasonNo,
  emptyMessage = '전적 데이터가 없습니다.',
  children,
}: BattleHistoryListClientProps) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));

  const detailHref = (wizardId: string) =>
    seasonNo
      ? `/battle-history/detail/${wizardId}?season_no=${seasonNo}`
      : `/battle-history/detail/${wizardId}`;

  return (
    <Box>
      <Container maxWidth="lg" sx={{ px: { xs: 1, md: 2 }, pb: { xs: 3, md: 4 } }}>
        <PageHeader title="전적 목록" />
        {children}

        {userList.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState message={emptyMessage} />
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ mt: 2 }}>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size={mobile ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 48 }} align="center">
                      #
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>소환사</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      승
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      패
                    </TableCell>
                    {!mobile && (
                      <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        전투
                      </TableCell>
                    )}
                    <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      승률
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userList.map((item, index) => {
                    const winRate = Number(item.total_rate) || 0;
                    const wins = Number(item.win_count) || 0;
                    const losses = Number(item.lose_count) || 0;
                    const total = wins + losses;
                    const isHighWinRate = winRate >= 50;

                    return (
                      <TableRow key={`${String(item.wizard_id)}-${index}`} hover>
                        <TableCell align="center" sx={{ color: 'text.secondary' }}>
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                            <Avatar
                              src={getSwexPlayerImageUrl(item.channel_uid ?? item.wizard_id)}
                              alt=""
                              sx={{ width: mobile ? 28 : 32, height: mobile ? 28 : 32, flexShrink: 0 }}
                            />
                            <Link
                              href={detailHref(item.wizard_id)}
                              style={{
                                textDecoration: 'none',
                                color: 'inherit',
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.wizard_name}
                            </Link>
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ color: 'success.main', fontWeight: 600 }}>
                          {wins}
                        </TableCell>
                        <TableCell align="center" sx={{ color: 'error.main', fontWeight: 600 }}>
                          {losses}
                        </TableCell>
                        {!mobile && (
                          <TableCell align="center" sx={{ color: 'text.secondary' }}>
                            {total}
                          </TableCell>
                        )}
                        <TableCell align="center">
                          <Chip
                            label={`${winRate}%`}
                            size="small"
                            color={isHighWinRate ? 'success' : 'default'}
                            variant={isHighWinRate ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 600, minWidth: 56 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 1 }}>
              총 {userList.length.toLocaleString()}명 · 행 클릭(소환사명)으로 상세 이동
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
}
