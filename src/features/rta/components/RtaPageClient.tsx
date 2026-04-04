'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Avatar,
  Pagination,
  Collapse,
  Button,
  Container,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useRtaStats, useRtaMatchCount, useRtaMatchList } from '@/features/rta/hooks/useRtaData';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { getMonsterImageUrl, getSwexPlayerImageUrl } from '@/shared/utils/image';
import type { MatchItem, RtaData, RawMatchItem } from '@/types';

export default function RtaPageClient() {
  const theme = useTheme();
  const rtaStarSize = useMediaQuery(theme.breakpoints.up('md')) ? 12 : 10;
  const [expandedMatches, setExpandedMatches] = useState<{ [key: number]: boolean }>({});
  const [currentPage, setCurrentPage] = useState(1);

  const { data: statsResponse } = useRtaStats();
  const { data: countResponse } = useRtaMatchCount();
  const {
    data: matchesResponse,
    isLoading: isLoadingMatches,
    error: matchesError,
    refetch: refetchMatches,
  } = useRtaMatchList({
    limit: DEFAULT_PAGE_SIZE,
    offset: (currentPage - 1) * DEFAULT_PAGE_SIZE,
  });

  const processMatchData = (match: RawMatchItem): MatchItem => {
    const createUnits = (
      unitNames?: string[],
      unitImages?: string[],
      bannedUnit?: number,
      leaderUnit?: number
    ) => {
      if (!Array.isArray(unitNames) || !Array.isArray(unitImages) || unitNames.length === 0) {
        return [];
      }

      return unitNames.map((name, i) => ({
        name: name || `Unit ${i + 1}`,
        image: unitImages[i] || getMonsterImageUrl('/images/default-unit.png'),
        banned: bannedUnit === i + 1,
        leader: leaderUnit === i + 1,
      }));
    };

    return {
      p1Name:
        match.p1_name ||
        match.p1Name ||
        match.p1_player_name ||
        match.p1PlayerName ||
        'Player',
      p2Name:
        match.p2_name ||
        match.p2Name ||
        match.p2_player_name ||
        match.p2PlayerName ||
        'Opponent',
      date:
        match.date_add ||
        match.dateAdd ||
        match.date ||
        match.created_at ||
        match.updated_at ||
        (typeof window !== 'undefined' ? new Date().toISOString() : ''),
      p1Units: createUnits(
        match.p1_unit_names,
        match.p1_unit_images,
        match.p1_banned_unit,
        match.p1_leader_unit
      ),
      p2Units: createUnits(
        match.p2_unit_names,
        match.p2_unit_images,
        match.p2_banned_unit,
        match.p2_leader_unit
      ),
      p1Id: match.p1_wizard_id || '',
      p2Id: match.p2_wizard_id || '',
      p1ChannelUid:
        match.p1_channel_uid != null && match.p1_channel_uid !== ''
          ? String(match.p1_channel_uid)
          : undefined,
      p2ChannelUid:
        match.p2_channel_uid != null && match.p2_channel_uid !== ''
          ? String(match.p2_channel_uid)
          : undefined,
      winnerPosition: (match.winner_position || '1') as '1' | '2',
      p1Country: match.p1_country,
      p2Country: match.p2_country,
      p1Score: Number(match.p1_score || match.p1Score || 0),
      p2Score: Number(match.p2_score || match.p2Score || 0),
      p1Rating: Number(match.p1_rating || match.p1Rating || 0),
      p2Rating: Number(match.p2_rating || match.p2Rating || 0),
      p1FirstPick: match.p1_first_pick || '0',
      p2FirstPick: match.p2_first_pick || '0',
    };
  };

  const rtaData = useMemo<RtaData | null>(() => {
    if (!statsResponse || !countResponse || !matchesResponse) return null;

    const totalMatches = countResponse.count || 0;
    const rawMatches = matchesResponse.matches || matchesResponse || [];
    const processedMatches = Array.isArray(rawMatches)
      ? rawMatches.map(processMatchData)
      : [];

    return {
      stats: statsResponse,
      totalMatches,
      matches: processedMatches,
      totalPages: Math.ceil(totalMatches / DEFAULT_PAGE_SIZE),
    };
  }, [statsResponse, countResponse, matchesResponse]);

  const paginatedMatches = rtaData?.matches || [];

  /** 페이지 바뀌면 접기 상태 초기화(기본은 전부 펼침) */
  useEffect(() => {
    setExpandedMatches({});
  }, [currentPage]);

  /** 기본 펼침: 명시적으로 false일 때만 접힘 */
  const toggleMatch = useCallback((index: number) => {
    setExpandedMatches((prev) => {
      const open = prev[index] !== false;
      return { ...prev, [index]: !open };
    });
  }, []);

  const changePage = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoadingMatches) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={64} />
          <Typography sx={{ mt: 2 }}>데이터를 불러오는 중...</Typography>
        </Box>
      </Box>
    );
  }

  if (matchesError) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="error" sx={{ mb: 2 }}>
              {matchesError.message || '데이터를 불러오는데 실패했습니다.'}
            </Typography>
            <Button variant="contained" onClick={() => refetchMatches()} sx={{ mt: 2 }}>
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const hasNoData = !rtaData || paginatedMatches.length === 0;

  if (hasNoData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">데이터가 없습니다</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Card>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
            RTA 매치 목록
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {paginatedMatches.map((match: MatchItem, index: number) => {
              const isExpanded = expandedMatches[index] !== false;
              return (
                <Card
                  key={`${match.p1Id}-${match.p2Id}-${match.date}-${index}`}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => toggleMatch(index)}
                >
                  <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: { xs: 1, md: 2 },
                        mb: isExpanded ? 2 : 0,
                        flexWrap: { xs: 'nowrap', sm: 'nowrap' },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 0.5,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <Box sx={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar
                            src={getSwexPlayerImageUrl(match.p1ChannelUid || match.p1Id)}
                            sx={{ width: { xs: 40, md: 50 }, height: { xs: 40, md: 50 } }}
                          />
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            flexWrap: 'wrap',
                            justifyContent: 'flex-start',
                          }}
                        >
                          {match.p1Country && (
                            <Box
                              component="img"
                              src={`https://flagcdn.com/w40/${match.p1Country.toLowerCase()}.png`}
                              alt={match.p1Country}
                              sx={{ width: { xs: 16, md: 20 }, height: { xs: 12, md: 15 }, flexShrink: 0 }}
                            />
                          )}
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                              fontSize: { xs: '0.75rem', md: '0.875rem' },
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {match.p1Name || 'Player'}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            flexWrap: 'wrap',
                            justifyContent: 'flex-start',
                          }}
                        >
                          <RtaRatingStarIcons rating={match.p1Rating} size={rtaStarSize} />
                          <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                            {match.p1Score}
                          </Typography>
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 0.5,
                          flexShrink: 0,
                          minWidth: { xs: 60, md: 80 },
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                          {(() => {
                            if (!match.date) return null;
                            try {
                              const date = new Date(match.date);
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              const hours = String(date.getHours()).padStart(2, '0');
                              const minutes = String(date.getMinutes()).padStart(2, '0');
                              return (
                                <>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' }, textAlign: 'center', lineHeight: 1 }}
                                  >
                                    {`${year}-${month}-${day}`}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' }, textAlign: 'center', lineHeight: 1 }}
                                  >
                                    {`${hours}:${minutes}`}
                                  </Typography>
                                </>
                              );
                            } catch {
                              return (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' }, textAlign: 'center' }}
                                >
                                  {match.date}
                                </Typography>
                              );
                            }
                          })()}
                        </Box>
                        <ExpandMoreIcon
                          sx={{
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s',
                            color: '#999',
                            fontSize: { xs: 20, md: 24 },
                          }}
                        />
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: 0.5,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <Box sx={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar
                            src={getSwexPlayerImageUrl(match.p2ChannelUid || match.p2Id)}
                            sx={{ width: { xs: 40, md: 50 }, height: { xs: 40, md: 50 } }}
                          />
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            flexWrap: 'wrap',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                              fontSize: { xs: '0.75rem', md: '0.875rem' },
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {match.p2Name || 'Opponent'}
                          </Typography>
                          {match.p2Country && (
                            <Box
                              component="img"
                              src={`https://flagcdn.com/w40/${match.p2Country.toLowerCase()}.png`}
                              alt={match.p2Country}
                              sx={{ width: { xs: 16, md: 20 }, height: { xs: 12, md: 15 }, flexShrink: 0 }}
                            />
                          )}
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            flexWrap: 'wrap',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                            {match.p2Score}
                          </Typography>
                          <RtaRatingStarIcons rating={match.p2Rating} size={rtaStarSize} />
                        </Box>
                      </Box>
                    </Box>

                    <Collapse in={isExpanded}>
                      <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: { xs: 0.5, md: 1 },
                            flexDirection: 'row',
                          }}
                        >
                          <Box>
                            <Box
                              sx={{
                                mb: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              <Box
                                sx={{
                                  width: '100%',
                                  backgroundColor: match.winnerPosition === '1' ? '#4caf50' : '#f44336',
                                  clipPath: 'polygon(0% 0%, 80% 0%, 100% 100%, 0% 100%)',
                                  px: { xs: 1, md: 1.5 },
                                  py: { xs: 0.25, md: 0.3 },
                                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                                }}
                              >
                                <Typography
                                  sx={{
                                    color: '#fff',
                                    fontSize: { xs: '0.65rem', md: '0.7rem' },
                                    fontWeight: 'bold',
                                    lineHeight: 1,
                                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                                    textAlign: 'left',
                                  }}
                                >
                                  {match.winnerPosition === '1' ? 'WIN' : 'LOSE'}
                                </Typography>
                              </Box>
                            </Box>
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gridTemplateRows: 'repeat(2, 1fr)',
                                gap: { xs: 0.25, md: 0.5 },
                                width: 'fit-content',
                                gridTemplateAreas: `"fp-0 fp-1 fp-3" "fp-0 fp-2 fp-4"`,
                              }}
                            >
                              {match.p1Units?.map((unit, unitIndex) => {
                                let gridArea = '';
                                if (unitIndex === 0) gridArea = 'fp-0';
                                else if (unitIndex === 1) gridArea = 'fp-1';
                                else if (unitIndex === 2) gridArea = 'fp-2';
                                else if (unitIndex === 3) gridArea = 'fp-3';
                                else if (unitIndex === 4) gridArea = 'fp-4';

                                return (
                                  <Box
                                    key={unitIndex}
                                    sx={{
                                      position: 'relative',
                                      p: 0.25,
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      gridArea,
                                      alignSelf: unitIndex === 0 ? 'center' : 'stretch',
                                    }}
                                  >
                                    <Avatar
                                      src={getMonsterImageUrl(unit.image)}
                                      alt={unit.name}
                                      sx={{
                                        width: { xs: 32, md: 36 },
                                        height: { xs: 32, md: 36 },
                                        border: unit.leader ? '2px solid gold' : '2px solid #d4a574',
                                        borderRadius: '50%',
                                        backgroundColor: 'transparent',
                                        position: 'relative',
                                      }}
                                    />
                                    {unit.banned && (
                                      <Box
                                        sx={{
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          right: 0,
                                          bottom: 0,
                                          borderRadius: '50%',
                                          backgroundImage: 'linear-gradient(to bottom right, transparent 48%, #fff 48%, #fff 52%, transparent 52%)',
                                          pointerEvents: 'none',
                                          zIndex: 1,
                                        }}
                                      />
                                    )}
                                    {unit.leader && (
                                      <Box
                                        sx={{
                                          position: 'absolute',
                                          left: -2,
                                          bottom: -2,
                                          width: { xs: 12, md: 14 },
                                          height: { xs: 12, md: 14 },
                                          backgroundColor: '#d32f2f',
                                          clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxShadow: '0 0 2px 1px rgba(255, 255, 255, 0.8)',
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            color: '#fff',
                                            fontSize: { xs: '7px', md: '9px' },
                                            fontWeight: 'bold',
                                            lineHeight: 1,
                                            textShadow: '0 0 1px rgba(255, 255, 255, 0.8)',
                                          }}
                                        >
                                          L
                                        </Typography>
                                      </Box>
                                    )}
                                  </Box>
                                );
                              })}
                              {(!match.p1Units || match.p1Units.length === 0) && (
                                <Box sx={{ gridColumn: '1 / -1', textAlign: 'left', py: 1 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                                    몬스터 정보가 없습니다
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>

                          <Typography
                            variant="h6"
                            sx={{
                              alignSelf: 'center',
                              fontSize: { xs: '0.875rem', md: '1rem' },
                              fontWeight: 700,
                              color: 'primary.main',
                              px: { xs: 0.5, md: 1 },
                            }}
                          >
                            VS
                          </Typography>

                          <Box>
                            <Box
                              sx={{
                                mb: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: 0.5,
                              }}
                            >
                              <Box
                                sx={{
                                  width: '100%',
                                  backgroundColor: match.winnerPosition === '2' ? '#4caf50' : '#f44336',
                                  clipPath: 'polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)',
                                  px: { xs: 1, md: 1.5 },
                                  py: { xs: 0.25, md: 0.3 },
                                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                                }}
                              >
                                <Typography
                                  sx={{
                                    color: '#fff',
                                    fontSize: { xs: '0.65rem', md: '0.7rem' },
                                    fontWeight: 'bold',
                                    lineHeight: 1,
                                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                                    textAlign: 'right',
                                  }}
                                >
                                  {match.winnerPosition === '2' ? 'WIN' : 'LOSE'}
                                </Typography>
                              </Box>
                            </Box>
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gridTemplateRows: 'repeat(2, 1fr)',
                                gap: { xs: 0.25, md: 0.5 },
                                width: 'fit-content',
                                ml: 'auto',
                                gridTemplateAreas: `"fp-1 fp-3 fp-5" "fp-2 fp-4 fp-5"`,
                              }}
                            >
                              {match.p2Units?.map((unit, unitIndex) => {
                                const units = match.p2Units;
                                let gridArea = '';
                                if (unitIndex === 0) gridArea = 'fp-1';
                                else if (unitIndex === 1) gridArea = 'fp-2';
                                else if (unitIndex === 2) gridArea = 'fp-3';
                                else if (unitIndex === 3) gridArea = 'fp-4';
                                else if (unitIndex === 4) gridArea = 'fp-5';

                                return (
                                  <Box
                                    key={unitIndex}
                                    sx={{
                                      position: 'relative',
                                      p: 0.25,
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      gridArea,
                                      alignSelf: units && unitIndex === units.length - 1 ? 'center' : 'stretch',
                                    }}
                                  >
                                    <Avatar
                                      src={getMonsterImageUrl(unit.image)}
                                      alt={unit.name}
                                      sx={{
                                        width: { xs: 32, md: 36 },
                                        height: { xs: 32, md: 36 },
                                        border: unit.leader ? '2px solid gold' : '2px solid #d4a574',
                                        borderRadius: '50%',
                                        backgroundColor: 'transparent',
                                        position: 'relative',
                                      }}
                                    />
                                    {unit.banned && (
                                      <Box
                                        sx={{
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          right: 0,
                                          bottom: 0,
                                          borderRadius: '50%',
                                          backgroundImage: 'linear-gradient(to bottom right, transparent 48%, #fff 48%, #fff 52%, transparent 52%)',
                                          pointerEvents: 'none',
                                          zIndex: 1,
                                        }}
                                      />
                                    )}
                                    {unit.leader && (
                                      <Box
                                        sx={{
                                          position: 'absolute',
                                          left: -2,
                                          bottom: -2,
                                          width: { xs: 12, md: 14 },
                                          height: { xs: 12, md: 14 },
                                          backgroundColor: '#d32f2f',
                                          clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxShadow: '0 0 2px 1px rgba(255, 255, 255, 0.8)',
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            color: '#fff',
                                            fontSize: { xs: '7px', md: '9px' },
                                            fontWeight: 'bold',
                                            lineHeight: 1,
                                            textShadow: '0 0 1px rgba(255, 255, 255, 0.8)',
                                          }}
                                        >
                                          L
                                        </Typography>
                                      </Box>
                                    )}
                                  </Box>
                                );
                              })}
                              {(!match.p2Units || match.p2Units.length === 0) && (
                                <Box sx={{ gridColumn: '1 / -1', textAlign: 'right', py: 1 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                                    몬스터 정보가 없습니다
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {rtaData.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={rtaData.totalPages}
                page={currentPage}
                onChange={(_, page) => changePage(page)}
                color="primary"
                size="small"
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontSize: { xs: '0.875rem', md: '1rem' },
                  },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
