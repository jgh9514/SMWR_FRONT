'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
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
  Paper,
  Button,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getMonsterImageUrl } from '@/shared/utils/image';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import { useRtaMonsterDetail } from '@/features/rta/hooks/useRtaData';
import type { MonsterDetail } from '@/features/rta/types/rta';

export default function MonsterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const monsterId = params?.monsterId as string;
  const monsterIdNum = monsterId && !isNaN(parseInt(monsterId)) ? parseInt(monsterId) : null;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: rawData, isLoading, error } = useRtaMonsterDetail(monsterIdNum);

  // JSON 문자열을 파싱하여 데이터 변환
  const data = rawData ? {
    ...rawData,
    recent_matches: rawData.recent_matches?.map((match: any) => ({
      ...match,
      my_team: typeof match.my_team === 'string' ? JSON.parse(match.my_team) : match.my_team,
      opponent_team: typeof match.opponent_team === 'string' ? JSON.parse(match.opponent_team) : match.opponent_team,
    })) || [],
  } as MonsterDetail : null;

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    if (!isMounted) {
      // 서버 사이드 렌더링에서는 기본 형식만 반환
      return dateString;
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <PageHeader title="몬스터 상세 정보" />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <PageHeader title="몬스터 상세 정보" />
        <Card>
          <CardContent>
            <Typography color="error">데이터를 불러오는 중 오류가 발생했습니다.</Typography>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/rta/monster-stats')}
              sx={{ mt: 2 }}
            >
              목록으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // 최근 경기 데이터 안전하게 처리
  const recentMatches = data.recent_matches || [];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/rta/monster-stats')}
          variant="outlined"
        >
          목록으로
        </Button>
        <PageHeader title={data.monster_name} />
      </Box>

      {/* 기본 정보 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
            <Avatar
              src={data.monster_image ? getMonsterImageUrl(data.monster_image) : undefined}
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
              {(!data.monster_image || data.monster_image === '') && data.monster_name.charAt(0)}
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
                  <Typography variant="h6" sx={{ fontWeight: 600, color: data.win_rate >= 50 ? 'success.main' : 'error.main' }}>
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
        {/* 강한 상대 */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                강한 상대
              </Typography>
              {data.strong_against && data.strong_against.length > 0 ? (
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
                        <TableRow key={`${opponent.monster_id}-${opponent.monster_elemental}-${index}`}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                src={opponent.monster_image ? getMonsterImageUrl(opponent.monster_image) : undefined}
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

        {/* 좋은 콤비 */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                좋은 콤비
              </Typography>
              {data.good_combos && data.good_combos.length > 0 ? (
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
                        <TableRow key={`${combo.monster_id}-${combo.monster_elemental}-${index}`}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                src={combo.monster_image ? getMonsterImageUrl(combo.monster_image) : undefined}
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

        {/* 좋은 3체인 콤비 */}
        <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                좋은 3체인 콤비
              </Typography>
              {data.good_triple_combos && data.good_triple_combos.length > 0 ? (
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
                        <TableRow key={`${combo.monster1_id}-${combo.monster1_elemental}-${combo.monster2_id}-${combo.monster2_elemental}-${index}`}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                src={combo.monster1_image ? getMonsterImageUrl(combo.monster1_image) : undefined}
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
                                src={combo.monster2_image ? getMonsterImageUrl(combo.monster2_image) : undefined}
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

        {/* 최근 경기 */}
        <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                최근 경기
              </Typography>
              {recentMatches && recentMatches.length > 0 ? (
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
                            {formatDate(match.match_date)}
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
                              {myTeam.length > 0 ? (
                                myTeam.map((monster: any, idx: number) => (
                                  <Avatar
                                    key={monster.monster_id || idx}
                                    src={monster.monster_image ? getMonsterImageUrl(monster.monster_image) : undefined}
                                    alt={monster.monster_name || ''}
                                    sx={{ width: 32, height: 32 }}
                                    variant="rounded"
                                    title={monster.monster_name || ''}
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
                              {opponentTeam.length > 0 ? (
                                opponentTeam.map((monster: any, idx: number) => (
                                  <Avatar
                                    key={monster.monster_id || idx}
                                    src={monster.monster_image ? getMonsterImageUrl(monster.monster_image) : undefined}
                                    alt={monster.monster_name || ''}
                                    sx={{ width: 32, height: 32 }}
                                    variant="rounded"
                                    title={monster.monster_name || ''}
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

