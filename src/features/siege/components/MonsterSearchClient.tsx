'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Card,
  CardContent,
  Container,
  Tabs,
  Tab,
  Avatar,
  Typography,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '@/shared/ui';
import { getRenderableImageUrl } from '@/shared/utils/image';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';
import type { AttributeType } from '@/features/siege/types/monster';

const attributeIcons: Record<AttributeType, string> = {
  fire: '/images/Fire_Icon.png',
  water: '/images/Water_Icon.png',
  wind: '/images/Wind_Icon.png',
  light: '/images/Light_Icon.png',
  dark: '/images/Dark_Icon.png',
};

const attributeLabels: Record<AttributeType, string> = {
  fire: '불',
  water: '물',
  wind: '바람',
  light: '빛',
  dark: '어둠',
};

const attributes: AttributeType[] = ['fire', 'water', 'wind', 'light', 'dark'];

const getMonsterAttribute = (monsterElemental: string | undefined): AttributeType | null => {
  if (!monsterElemental) return null;

  const elemental = monsterElemental.toLowerCase();
  if (elemental === 'fire' || elemental === '불') return 'fire';
  if (elemental === 'water' || elemental === '물') return 'water';
  if (elemental === 'wind' || elemental === '바람') return 'wind';
  if (elemental === 'light' || elemental === '빛') return 'light';
  if (elemental === 'dark' || elemental === '어둠') return 'dark';

  return null;
};

interface MonsterSearchClientProps {
  monsterList: MonsterOption[];
}

export default function MonsterSearchClient({ monsterList }: MonsterSearchClientProps) {
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeType>('fire');
  const [searchKeyword, setSearchKeyword] = useState('');

  const filteredMonsters = useMemo(() => {
    const keyword = searchKeyword.toLowerCase().trim();

    return monsterList
      .filter((monster) => getMonsterAttribute(monster.monster_elemental) === selectedAttribute)
      .filter((monster) => {
        if (!keyword) return true;
        return (
          monster.kr_name.toLowerCase().includes(keyword) ||
          monster.un_name.toLowerCase().includes(keyword) ||
          monster.monster_id.toLowerCase().includes(keyword)
        );
      });
  }, [monsterList, searchKeyword, selectedAttribute]);

  const handleAttributeChange = (_event: React.SyntheticEvent, newValue: AttributeType) => {
    setSelectedAttribute(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="lg">
        <PageHeader title="몬스터 목록" />

        <Card>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                placeholder="몬스터 이름으로 검색..."
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs
                value={selectedAttribute}
                onChange={handleAttributeChange}
                variant="fullWidth"
                aria-label="몬스터 속성 탭"
                sx={{
                  minHeight: { xs: 48, sm: 56 },
                  '& .MuiTab-root': {
                    minHeight: { xs: 48, sm: 56 },
                    minWidth: 0,
                    padding: { xs: '8px 4px', sm: '12px 8px' },
                  },
                }}
              >
                {attributes.map((attribute) => (
                  <Tab
                    key={attribute}
                    icon={
                      <Box
                        component="img"
                        src={getRenderableImageUrl(attributeIcons[attribute])}
                        alt={attributeLabels[attribute]}
                        sx={{
                          width: { xs: 24, sm: 28 },
                          height: { xs: 24, sm: 28 },
                        }}
                      />
                    }
                    aria-label={attributeLabels[attribute]}
                    value={attribute}
                  />
                ))}
              </Tabs>
            </Box>

            {filteredMonsters.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body2" color="text.secondary">
                  {searchKeyword ? '검색 결과가 없습니다.' : '몬스터가 없습니다.'}
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  총 {filteredMonsters.length}개의 몬스터
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: { xs: 1, sm: 1.5 },
                  }}
                >
                  {filteredMonsters.map((monster) => {
                    const monsterAttribute = getMonsterAttribute(monster.monster_elemental);
                    const attributeIcon = monsterAttribute ? attributeIcons[monsterAttribute] : null;

                    return (
                      <Card
                        key={monster.monster_id}
                        component={Link}
                        href={`/monster-detail/${monster.monster_id}`}
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          textDecoration: 'none',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 4,
                          },
                        }}
                      >
                        <CardContent sx={{ textAlign: 'center', p: { xs: 1, sm: 1.5 } }}>
                          <Box sx={{ position: 'relative', display: 'inline-block', mb: 0.5 }}>
                            <Avatar
                              src={getRenderableImageUrl(monster.image_url)}
                              alt={monster.kr_name}
                              sx={{
                                width: { xs: 50, sm: 60 },
                                height: { xs: 50, sm: 60 },
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            />
                            {attributeIcon && monsterAttribute && (
                              <Box
                                component="img"
                                src={getRenderableImageUrl(attributeIcon)}
                                alt={attributeLabels[monsterAttribute]}
                                sx={{
                                  position: 'absolute',
                                  bottom: -2,
                                  right: -2,
                                  width: { xs: 16, sm: 18 },
                                  height: { xs: 16, sm: 18 },
                                  border: '1.5px solid',
                                  borderColor: 'background.paper',
                                  borderRadius: '50%',
                                  bgcolor: 'background.paper',
                                }}
                              />
                            )}
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              fontSize: { xs: '11px', sm: '12px' },
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                              color: 'text.primary',
                            }}
                            title={monster.kr_name}
                          >
                            {monster.kr_name}
                          </Typography>
                          {monster.modified_kr_name && monster.modified_kr_name !== monster.kr_name && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                mt: 0.25,
                                fontSize: { xs: '9px', sm: '10px' },
                              }}
                            >
                              {monster.modified_kr_name}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
