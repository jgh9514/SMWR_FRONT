'use client';

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
} from '@mui/material';
import { EmptyState, PageBanner, PageHeader } from '@/shared/ui';
import { getRenderableImageUrl } from '@/shared/utils/image';
import type { BattleGroup } from '@/features/battle-history/types/battle-history';

interface BattleHistoryDetailContentProps {
  groupedBattles: BattleGroup[];
}

export default function BattleHistoryDetailContent({
  groupedBattles,
}: BattleHistoryDetailContentProps) {
  return (
    <Box>
      <PageBanner />

      <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 }, px: { xs: 1, md: 3 } }}>
        <PageHeader title="전적 상세" backPath="/battle-history" />
        {groupedBattles.length === 0 ? (
          <EmptyState message="전적 데이터가 없습니다." />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, mt: { xs: 2, md: 3 } }}>
            {groupedBattles.map((group) => (
              <Card key={`${group.dateLabel}-${group.guildsLabel}`} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 2, md: 3 }, '&:last-child': { pb: { xs: 2, md: 3 } } }}>
                  <Box
                    sx={{
                      mb: { xs: 2, md: 3 },
                      pb: { xs: 2, md: 2.5 },
                      borderBottom: '2px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: '1rem', md: '1.25rem' },
                          color: 'text.primary',
                        }}
                      >
                        {group.dateLabel}
                      </Typography>
                      <Chip
                        label={`${group.battles.length}전 ${group.winCount}승 ${group.loseCount}패`}
                        color="primary"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                      {group.guildsLabel}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                        lg: 'repeat(4, 1fr)',
                        xl: 'repeat(5, 1fr)',
                      },
                      gap: { xs: 1.5, md: 2 },
                    }}
                  >
                    {group.battles.map((item, index) => {
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
                          key={`${item.match_id}-${index}`}
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
                              <Box sx={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                                <Chip
                                  label={isWin ? 'WIN' : 'LOSE'}
                                  color={isWin ? 'success' : 'error'}
                                  size="small"
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
                                  {attackMonsters.map((monsterUrl, monsterIndex) => (
                                    <Avatar
                                      key={monsterIndex}
                                      src={getRenderableImageUrl(monsterUrl)}
                                      alt={`공격 몬스터 ${monsterIndex + 1}`}
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

                              <Box sx={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                                <Chip
                                  label={isWin ? 'LOSE' : 'WIN'}
                                  color={isWin ? 'error' : 'success'}
                                  size="small"
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
                                  {defenseMonsters.map((monsterUrl, monsterIndex) => (
                                    <Avatar
                                      key={monsterIndex}
                                      src={getRenderableImageUrl(monsterUrl)}
                                      alt={`방어 몬스터 ${monsterIndex + 1}`}
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
