'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { useRouter } from 'next/navigation';
import { useMonsterList } from '@/features/siege/hooks/useSiegeList';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';
import { getMonsterImageUrl } from '@/shared/utils/image';
import type { AttributeType } from '@/features/siege/types/monster';

// 속성 아이콘 경로 매핑 (CloudFront CDN URL로 변환됨)
const attributeIcons: Record<AttributeType, string> = {
  fire: '/images/Fire_Icon.png',
  water: '/images/Water_Icon.png',
  wind: '/images/Wind_Icon.png',
  light: '/images/Light_Icon.png',
  dark: '/images/Dark_Icon.png',
};

// 속성 라벨 매핑 (접근성용)
const attributeLabels: Record<AttributeType, string> = {
  fire: '불',
  water: '물',
  wind: '바람',
  light: '빛',
  dark: '어둠',
};

// 속성 목록
const attributes: AttributeType[] = ['fire', 'water', 'wind', 'light', 'dark'];

// 이미지 경로에서 속성 추출 (예: /images/Fire/Phoenix_Fire_Icon.png)
const getMonsterAttribute = (imageUrl: string): AttributeType | null => {
  if (!imageUrl) return null;
  
  const url = imageUrl.toLowerCase();
  // 이미지 경로에서 속성 추출
  if (url.includes('/fire/') || url.includes('_fire_') || url.includes('fire_icon')) return 'fire';
  if (url.includes('/water/') || url.includes('_water_') || url.includes('water_icon')) return 'water';
  if (url.includes('/wind/') || url.includes('_wind_') || url.includes('wind_icon')) return 'wind';
  if (url.includes('/light/') || url.includes('_light_') || url.includes('light_icon')) return 'light';
  if (url.includes('/dark/') || url.includes('_dark_') || url.includes('dark_icon')) return 'dark';
  
  return null; // 속성을 알 수 없는 경우
};

export default function MonsterSearchPage() {
  const router = useRouter();
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeType>('fire');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  
  // 클라이언트에서만 마운트 확인 (hydration mismatch 방지)
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // 몬스터 목록 조회
  const { data: monsterList = [], isLoading } = useMonsterList();
  
  // 속성 아이콘 URL (클라이언트에서만 변환)
  const attributeIconUrls = useMemo(() => {
    if (!isMounted) {
      // 서버 사이드에서는 원본 경로 사용
      return attributeIcons;
    }
    // 클라이언트에서는 변환된 URL 사용
    return Object.keys(attributeIcons).reduce((acc, key) => {
      acc[key as AttributeType] = getMonsterImageUrl(attributeIcons[key as AttributeType]);
      return acc;
    }, {} as Record<AttributeType, string>);
  }, [isMounted]);

  // 속성별 필터링 및 검색어 필터링
  const filteredMonsters = useMemo(() => {
    let filtered = monsterList;

    // 속성 필터링 (이미지 경로에서 속성 추출)
    filtered = filtered.filter((monster) => {
      const attribute = getMonsterAttribute(monster.image_url);
      return attribute === selectedAttribute;
    });

    // 검색어 필터링
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(
        (monster) =>
          monster.kr_name.toLowerCase().includes(keyword) ||
          monster.un_name.toLowerCase().includes(keyword) ||
          monster.monster_id.toLowerCase().includes(keyword)
      );
    }

    return filtered;
  }, [monsterList, selectedAttribute, searchKeyword]);

  const handleAttributeChange = (_event: React.SyntheticEvent, newValue: AttributeType) => {
    setSelectedAttribute(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="lg">
        <PageHeader title="몬스터 목록" />

        <Card>
          <CardContent>
            {/* 검색 바 */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                placeholder="몬스터 이름으로 검색..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* 속성별 탭 */}
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
                {attributes.map((attr) => (
                  <Tab
                    key={attr}
                    icon={
                      <Box
                        component="img"
                        src={attributeIconUrls[attr]}
                        alt={attributeLabels[attr]}
                        sx={{ 
                          width: { xs: 24, sm: 28 }, 
                          height: { xs: 24, sm: 28 },
                        }}
                      />
                    }
                    aria-label={attributeLabels[attr]}
                    value={attr}
                  />
                ))}
              </Tabs>
            </Box>

            {/* 몬스터 리스트 */}
            {isLoading ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body2" color="text.secondary">
                  로딩 중...
                </Typography>
              </Box>
            ) : filteredMonsters.length === 0 ? (
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
                    const monsterAttribute = getMonsterAttribute(monster.image_url);
                    const attributeIcon = monsterAttribute ? attributeIcons[monsterAttribute] : null;

                    return (
                      <Card
                        key={monster.monster_id}
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 4,
                          },
                        }}
                        onClick={() => router.push(`/monster-detail/${monster.monster_id}`)}
                      >
                        <CardContent sx={{ textAlign: 'center', p: { xs: 1, sm: 1.5 } }}>
                          <Box sx={{ position: 'relative', display: 'inline-block', mb: 0.5 }}>
                            <Avatar
                              src={getMonsterImageUrl(monster.image_url)}
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
                                src={getMonsterImageUrl(attributeIcon)}
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
