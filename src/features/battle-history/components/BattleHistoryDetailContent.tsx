'use client';

import { useMemo } from 'react';
import {
  Box,
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
import { EmptyState, PageBanner, PageHeader } from '@/shared/ui';
import BattleHistoryMonsterCell from '@/features/battle-history/components/BattleHistoryMonsterCell';
import type { BattleGroup, BattleItem } from '@/features/battle-history/types/battle-history';

interface BattleHistoryDetailContentProps {
  groupedBattles: BattleGroup[];
  backPath?: string;
}

type DetailRow = BattleItem & {
  dateLabel: string;
};

export default function BattleHistoryDetailContent({
  groupedBattles,
  backPath = '/battle-history',
}: BattleHistoryDetailContentProps) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));

  const rows = useMemo<DetailRow[]>(
    () =>
      groupedBattles.flatMap((group) =>
        group.battles.map((battle) => ({
          ...battle,
          dateLabel: group.dateLabel,
        })),
      ),
    [groupedBattles],
  );

  const summary = useMemo(() => {
    let win = 0;
    let lose = 0;
    rows.forEach((r) => {
      if (r.win_lose === '1') win += 1;
      else lose += 1;
    });
    return { win, lose, total: rows.length };
  }, [rows]);

  return (
    <Box>
      <PageBanner />

      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 }, px: { xs: 1, md: 2 } }}>
        <PageHeader title="전적 상세" backPath={backPath} />

        {rows.length === 0 ? (
          <EmptyState message="전적 데이터가 없습니다." />
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              총 {summary.total}전 ·{' '}
              <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>
                {summary.win}승
              </Box>{' '}
              ·{' '}
              <Box component="span" sx={{ color: 'error.main', fontWeight: 600 }}>
                {summary.lose}패
              </Box>
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small" sx={{ minWidth: mobile ? 640 : 960 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap', width: 72 }}>
                      결과
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>일자</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>우리</TableCell>
                    {!mobile && (
                      <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        공격 덱
                      </TableCell>
                    )}
                    <TableCell align="center" sx={{ fontWeight: 700, width: 40, px: 0.5 }}>
                      VS
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>상대</TableCell>
                    {!mobile && (
                      <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        방어 덱
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((item, index) => {
                    const isWin = item.win_lose === '1';
                    const attackUrls = [item.attack_monster_1, item.attack_monster_2, item.attack_monster_3];
                    const defenseUrls = [item.defense_monster_1, item.defense_monster_2, item.defense_monster_3];

                    return (
                      <TableRow
                        key={`${item.match_id}-${item.log_id ?? index}`}
                        hover
                        sx={{
                          bgcolor: isWin ? 'rgba(76, 175, 80, 0.04)' : 'rgba(244, 67, 54, 0.04)',
                        }}
                      >
                        <TableCell align="center">
                          <Chip
                            label={isWin ? '승' : '패'}
                            size="small"
                            color={isWin ? 'success' : 'error'}
                            sx={{ fontWeight: 700, minWidth: 40 }}
                          />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', typography: 'body2' }}>{item.dateLabel}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {item.guild_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {item.wizard_name}
                          </Typography>
                          {mobile && (
                            <Box sx={{ mt: 0.75 }}>
                              <BattleHistoryMonsterCell
                                urls={attackUrls}
                                borderColor={isWin ? 'success.main' : 'error.main'}
                                size={32}
                              />
                            </Box>
                          )}
                        </TableCell>
                        {!mobile && (
                          <TableCell align="center">
                            <BattleHistoryMonsterCell
                              urls={attackUrls}
                              borderColor={isWin ? 'success.main' : 'error.main'}
                            />
                          </TableCell>
                        )}
                        <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                          VS
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {item.opp_guild_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {item.opp_wizard_name}
                          </Typography>
                          {mobile && (
                            <Box sx={{ mt: 0.75 }}>
                              <BattleHistoryMonsterCell
                                urls={defenseUrls}
                                borderColor={isWin ? 'error.main' : 'success.main'}
                                size={32}
                              />
                            </Box>
                          )}
                        </TableCell>
                        {!mobile && (
                          <TableCell align="center">
                            <BattleHistoryMonsterCell
                              urls={defenseUrls}
                              borderColor={isWin ? 'error.main' : 'success.main'}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Container>
    </Box>
  );
}
