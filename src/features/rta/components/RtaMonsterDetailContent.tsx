'use client';

import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Container,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import { getRenderableImageUrl } from '@/shared/utils/image';
import type { CounterMatchupRow, MonsterDetail } from '@/features/rta/types/rta';

interface RtaMonsterDetailContentProps {
  data: MonsterDetail;
}

export default function RtaMonsterDetailContent({
  data,
}: RtaMonsterDetailContentProps) {
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;
  const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const recentMatches = data.recent_matches || [];
  const counterRows: CounterMatchupRow[] = data.counter_matchups ?? [];

  const comboLabel = (r: CounterMatchupRow) =>
    String(r.opponentLabel ?? r.opponent_label ?? r.opponentComboKey ?? r.opponent_combo_key ?? '—');
  const winRate = (r: CounterMatchupRow) => {
    const v = r.winRate ?? r.win_rate;
    return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
  };
  const totalGames = (r: CounterMatchupRow) => {
    const w = Number(r.winCnt ?? r.win_cnt ?? 0);
    const l = Number(r.loseCnt ?? r.lose_cnt ?? 0);
    return w + l;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PageHeader title={data.monster_name} backPath="/rta/monster-stats" />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
            <Avatar
              src={getRenderableImageUrl(data.monster_image)}
              alt={data.monster_name}
              sx={{
                width: { xs: 100, md: 150 },
                height: { xs: 100, md: 150 },
                boxShadow: 2,
                border: '2px solid',
                borderColor: 'divider',
              }}
              variant="rounded"
            >
              {data.monster_name.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
                {data.monster_name}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    픽횟수
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {data.pick_count.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    픽률
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatPercentage(data.pick_rate)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    승률
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: data.win_rate >= 50 ? 'success.main' : 'error.main' }}
                  >
                    {formatPercentage(data.win_rate)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    벤율
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatPercentage(data.ban_rate)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 3,
        }}
      >
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                강한 상대
              </Typography>
              {data.strong_against?.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>몬스터</TableCell>
                        <TableCell align="right">승률</TableCell>
                        <TableCell align="right">경기 수</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.strong_against.slice(0, 10).map((opponent, index) => (
                        <TableRow key={`${opponent.monster_id}-${index}`}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                src={getRenderableImageUrl(opponent.monster_image)}
                                alt={opponent.monster_name}
                                sx={{ width: 32, height: 32 }}
                                variant="rounded"
                              >
                                {opponent.monster_name.charAt(0)}
                              </Avatar>
                              <Typography variant="body2">{opponent.monster_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: opponent.win_rate >= 50 ? 'success.main' : 'error.main' }}
                            >
                              {formatPercentage(opponent.win_rate)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {opponent.match_count}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  데이터가 없습니다.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                좋은 콤비
              </Typography>
              {data.good_combos?.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>몬스터</TableCell>
                        <TableCell align="right">승률</TableCell>
                        <TableCell align="right">경기 수</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.good_combos.slice(0, 10).map((combo, index) => (
                        <TableRow key={`${combo.monster_id}-${index}`}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                src={getRenderableImageUrl(combo.monster_image)}
                                alt={combo.monster_name}
                                sx={{ width: 32, height: 32 }}
                                variant="rounded"
                              >
                                {combo.monster_name.charAt(0)}
                              </Avatar>
                              <Typography variant="body2">{combo.monster_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: combo.win_rate >= 50 ? 'success.main' : 'error.main' }}
                            >
                              {formatPercentage(combo.win_rate)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {combo.match_count}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  데이터가 없습니다.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                카운터 매치업
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                상대 팀 조합 대비 승·패 집계입니다. 카운터 집계 배치가 돌아간 뒤에 채워집니다.
              </Typography>
              {counterRows.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>상대 조합</TableCell>
                        <TableCell align="right">승률</TableCell>
                        <TableCell align="right">승 / 패</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {counterRows.slice(0, 20).map((r, index) => (
                        <TableRow key={`${comboLabel(r)}-${index}`}>
                          <TableCell>
                            <Typography variant="body2">{comboLabel(r)}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color:
                                  (winRate(r) ?? 0) >= 50 ? 'success.main' : 'error.main',
                              }}
                            >
                              {winRate(r) != null ? formatPercentage(winRate(r)!) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {r.winCnt ?? r.win_cnt ?? 0} / {r.loseCnt ?? r.lose_cnt ?? 0}
                              {totalGames(r) > 0 ? ` (${totalGames(r)})` : ''}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  데이터가 없습니다.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                좋은 3체인 콤비
              </Typography>
              {data.good_triple_combos?.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>몬스터 1</TableCell>
                        <TableCell>몬스터 2</TableCell>
                        <TableCell align="right">승률</TableCell>
                        <TableCell align="right">경기 수</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.good_triple_combos.slice(0, 10).map((combo, index) => (
                        <TableRow key={`${combo.monster1_id}-${combo.monster2_id}-${index}`}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                src={getRenderableImageUrl(combo.monster1_image)}
                                alt={combo.monster1_name}
                                sx={{ width: 32, height: 32 }}
                                variant="rounded"
                              >
                                {combo.monster1_name.charAt(0)}
                              </Avatar>
                              <Typography variant="body2">{combo.monster1_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                src={getRenderableImageUrl(combo.monster2_image)}
                                alt={combo.monster2_name}
                                sx={{ width: 32, height: 32 }}
                                variant="rounded"
                              >
                                {combo.monster2_name.charAt(0)}
                              </Avatar>
                              <Typography variant="body2">{combo.monster2_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: combo.win_rate >= 50 ? 'success.main' : 'error.main' }}
                            >
                              {formatPercentage(combo.win_rate)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {combo.match_count}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  데이터가 없습니다.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                최근 경기
              </Typography>
              {recentMatches.length ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {recentMatches.slice(0, 10).map((match) => {
                    const myTeam = Array.isArray(match.my_team) ? match.my_team : [];
                    const opponentTeam = Array.isArray(match.opponent_team) ? match.opponent_team : [];

                    return (
                      <Box
                        key={match.match_id}
                        sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: match.win_lose === 'WIN' ? 'success.light' : 'error.light',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {dateFormatter.format(new Date(match.match_date))}
                          </Typography>
                          <Chip
                            label={match.win_lose === 'WIN' ? '승리' : '패배'}
                            color={match.win_lose === 'WIN' ? 'success' : 'error'}
                            size="small"
                          />
                        </Box>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                            gap: 2,
                          }}
                        >
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                              내 팀
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {myTeam.length ? (
                                myTeam.map((monster, index) => (
                                  <Avatar
                                    key={monster.monster_id || index}
                                    src={getRenderableImageUrl(monster.monster_image)}
                                    alt={monster.monster_name || ''}
                                    sx={{ width: 32, height: 32 }}
                                    variant="rounded"
                                  >
                                    {monster.monster_name?.charAt(0) || '?'}
                                  </Avatar>
                                ))
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  데이터 없음
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                              상대 팀
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {opponentTeam.length ? (
                                opponentTeam.map((monster, index) => (
                                  <Avatar
                                    key={monster.monster_id || index}
                                    src={getRenderableImageUrl(monster.monster_image)}
                                    alt={monster.monster_name || ''}
                                    sx={{ width: 32, height: 32 }}
                                    variant="rounded"
                                  >
                                    {monster.monster_name?.charAt(0) || '?'}
                                  </Avatar>
                                ))
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  데이터 없음
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  데이터가 없습니다.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
}
