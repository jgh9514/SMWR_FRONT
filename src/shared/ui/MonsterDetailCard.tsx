'use client';

import { Card, CardContent, CardHeader, Box, Typography } from '@mui/material';
import type { Monster } from '@/features/siege/types/siege';

interface MonsterDetailCardProps {
  monster: Monster;
  monsterIndex: number;
}

const statLabels: { [key: string]: string } = {
  hp: 'HP',
  atk: '공격력',
  def: '방어력',
  spd: '속도',
  cr: '치명타율',
  cd: '치명타피해',
  res: '저항',
  acc: '정확도',
};

export default function MonsterDetailCard({ monster, monsterIndex }: MonsterDetailCardProps) {
  void monsterIndex;
  return (
    <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
      <CardHeader
        title={monster.name}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontSize: 16,
          fontWeight: 600,
        }}
      />
      <CardContent>
        {/* 룬 정보 */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#333' }}>
              룬 세트
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {monster.runeSet}
            </Typography>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#333' }}>
              룬 2번
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {monster.rune2}
            </Typography>
          </Box>
        </Box>

        {/* 스탯 정보 */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#333' }}>
            스탯
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            {Object.entries(statLabels).map(([key, label]) => {
              const stat = monster.stats[key as keyof typeof monster.stats];
              if (!stat) return null;
              const isPercent = ['cr', 'cd', 'res', 'acc'].includes(key);
              return (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {label}:
                  </Typography>
                  <Box>
                    <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                      {stat.base}
                    </Typography>
                    {stat.plus !== undefined && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="primary"
                        sx={{ ml: 0.5, fontWeight: 600 }}
                      >
                        +{stat.plus}
                        {isPercent ? '%' : ''}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

