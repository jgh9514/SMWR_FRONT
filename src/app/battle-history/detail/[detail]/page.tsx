'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
} from '@mui/material';
import { useRecordDetail } from '@/hooks/api';
import { DEFAULT_PAGE_SIZE, DEFAULT_PAGE_OFFSET } from '@/shared/constants';
import { EmptyState, LoadingState, PageBanner, PageHeader } from '@/shared/ui';
import { useResponsive } from '@/shared/hooks';
import { getMonsterImageUrl } from '@/shared/utils/image';
import { formatSiegeDateLabel } from '@/shared/utils/format';
import type { RecordDetailParams, BattleItem, BattleGroup } from '@/types';

/**
 * 전투 데이터를 점령전 ID별로 그룹화
 */
const groupBattlesBySiegeId = (battles: BattleItem[]): BattleGroup[] => {
  const grouped: { [key: string]: BattleGroup } = {};
  
  battles.forEach((battle) => {
    // match_id를 기준으로 그룹화 (같은 점령전 ID끼리 묶음)
    const siegeId = battle.match_id;
    const dateLabel = formatSiegeDateLabel(siegeId) || siegeId;

    if (!grouped[siegeId]) {
      grouped[siegeId] = {
        dateLabel: dateLabel,
        guildsLabel: '',
        battles: [],
        winCount: 0,
        loseCount: 0,
      };
    }

    grouped[siegeId].battles.push(battle);
    if (battle.win_lose === '1') {
      grouped[siegeId].winCount++;
    } else {
      grouped[siegeId].loseCount++;
    }
  });

  // 각 그룹의 고유한 길드 이름들을 수집하여 라벨 생성
  return Object.values(grouped).map((group) => {
    const uniqueGuilds = new Set<string>();
    
    group.battles.forEach((battle) => {
      if (battle.guild_name) {
        uniqueGuilds.add(battle.guild_name);
      }
      if (battle.opp_guild_name) {
        uniqueGuilds.add(battle.opp_guild_name);
      }
    });
    
    group.guildsLabel = Array.from(uniqueGuilds).join(' vs ');
    
    return group;
  });
};

export default function BattleHistoryDetailPage() {
  const params = useParams();
  const wizardId = params?.detail as string;
  const [isMounted, setIsMounted] = useState(false);
  const responsive = useResponsive();
  const isMobile = isMounted ? responsive.isMobile : false;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 검색 파라미터 준비
  const searchParams = useMemo<RecordDetailParams | null>(() => {
    if (!wizardId) return null;
    return {
      paging: DEFAULT_PAGE_SIZE,
      offset: DEFAULT_PAGE_OFFSET,
      wizard_id: wizardId,
    } as RecordDetailParams;
  }, [wizardId]);

  // 전적 상세 조회
  const { data: battles = [], isLoading, isError } = useRecordDetail(searchParams);

  // 점령전 ID별로 그룹화
  const groupedBattles = useMemo<BattleGroup[]>(() => {
    if (!battles || battles.length === 0) return [];
    return groupBattlesBySiegeId(battles);
  }, [battles]);

  // 로딩 상태
  if (isLoading) {
    return (
      <Box>
        <PageBanner />
        <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 }, px: { xs: 1, md: 3 } }}>
          <PageHeader title="전적 상세" backPath="/battle-history" />
          <LoadingState message="전적 데이터를 불러오는 중..." />
        </Container>
      </Box>
    );
  }

  // 에러 상태
  if (isError) {
    return (
      <Box>
        <PageBanner />
        <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 }, px: { xs: 1, md: 3 } }}>
          <PageHeader title="전적 상세" backPath="/battle-history" />
          <EmptyState message="전적 데이터를 불러올 수 없습니다." />
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <PageBanner />

      <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 }, px: { xs: 1, md: 3 } }}>
        <PageHeader title="전적 상세" backPath="/battle-history" />
        {groupedBattles.length === 0 ? (
          <EmptyState message="전적 데이터가 없습니다." />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, mt: { xs: 2, md: 3 } }}>
            {groupedBattles.map((group, groupIndex) => (
              <Card key={groupIndex} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 2, md: 3 }, '&:last-child': { pb: { xs: 2, md: 3 } } }}>
                  {/* 그룹 헤더 */}
                  <Box
                    sx={{
                      mb: { xs: 2, md: 3 },
                      pb: { xs: 2, md: 2.5 },
                      borderBottom: '2px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'nowrap', gap: 1 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 700, 
                          fontSize: { xs: '1rem', md: '1.25rem' }, 
                          color: 'text.primary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {group.dateLabel}
                      </Typography>
                      <Chip
                        label={`${group.battles.length}전 ${group.winCount}승 ${group.loseCount}패`}
                        color="primary"
                        size={isMobile ? 'small' : 'medium'}
                        sx={{ fontWeight: 600, flexShrink: 0 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                      {group.guildsLabel}
                    </Typography>
                  </Box>

                  {/* 전투 로그 그리드 */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr', // 모바일: 1열
                        sm: 'repeat(2, 1fr)', // 태블릿: 2열
                        md: 'repeat(3, 1fr)', // 중간: 3열
                        lg: 'repeat(4, 1fr)', // 큰 화면: 4열
                        xl: 'repeat(5, 1fr)', // PC: 5열
                      },
                      gap: { xs: 1.5, md: 2 },
                    }}
                  >
                    {group.battles.map((item, idx) => {
                      const isWin = item.win_lose === '1';
                      const attackMonsters = [
                        item.attack_monster_1,
                        item.attack_monster_2,
                        item.attack_monster_3,
                      ].filter(Boolean);
                      const defenseMonsters = [
                        item.defense_monster_1,
                        item.defense_monster_2,
                        item.defense_monster_3,
                      ].filter(Boolean);

                      return (
                        <Card
                          key={idx}
                          sx={{
                            boxShadow: 1,
                            borderRadius: 2,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: `1px solid ${isWin ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
                            '&:hover': {
                              boxShadow: 4,
                              transform: 'translateY(-2px)',
                              borderColor: isWin ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)',
                            },
                          }}
                        >
                          <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: { xs: 1, md: 1.5 },
                              }}
                            >
                              {/* 왼쪽 (공격) */}
                              <Box sx={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                                <Chip
                                  label={isWin ? 'WIN' : 'LOSE'}
                                  color={isWin ? 'success' : 'error'}
                                  size={isMobile ? 'small' : 'medium'}
                                  sx={{ mb: 1, fontWeight: 600 }}
                                />
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  sx={{
                                    mb: 0.5,
                                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {item.guild_name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    mb: 1,
                                    display: 'block',
                                    fontSize: { xs: '0.65rem', md: '0.75rem' },
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {item.wizard_name}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 0.25, md: 0.5 } }}>
                                  {attackMonsters.map((monsterUrl, monsterIdx) => (
                                    <Avatar
                                      key={monsterIdx}
                                      src={getMonsterImageUrl(monsterUrl)}
                                      alt={`공격 몬스터 ${monsterIdx + 1}`}
                                      sx={{
                                        width: { xs: 32, md: 40 },
                                        height: { xs: 32, md: 40 },
                                        border: '2px solid',
                                        borderColor: isWin ? 'success.main' : 'error.main',
                                        boxShadow: 1,
                                      }}
                                    />
                                  ))}
                                </Box>
                              </Box>

                              {/* VS */}
                              <Typography
                                variant="h6"
                                sx={{
                                  mx: { xs: 0.5, md: 1 },
                                  color: 'text.secondary',
                                  fontSize: { xs: '0.875rem', md: '1rem' },
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                VS
                              </Typography>

                              {/* 오른쪽 (방어) */}
                              <Box sx={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                                <Chip
                                  label={isWin ? 'LOSE' : 'WIN'}
                                  color={isWin ? 'error' : 'success'}
                                  size={isMobile ? 'small' : 'medium'}
                                  sx={{ mb: 1, fontWeight: 600 }}
                                />
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  sx={{
                                    mb: 0.5,
                                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {item.opp_guild_name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    mb: 1,
                                    display: 'block',
                                    fontSize: { xs: '0.65rem', md: '0.75rem' },
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {item.opp_wizard_name}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 0.25, md: 0.5 } }}>
                                  {defenseMonsters.map((monsterUrl, monsterIdx) => (
                                    <Avatar
                                      key={monsterIdx}
                                      src={getMonsterImageUrl(monsterUrl)}
                                      alt={`방어 몬스터 ${monsterIdx + 1}`}
                                      sx={{
                                        width: { xs: 32, md: 40 },
                                        height: { xs: 32, md: 40 },
                                        border: '2px solid',
                                        borderColor: isWin ? 'error.main' : 'success.main',
                                        boxShadow: 1,
                                      }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
