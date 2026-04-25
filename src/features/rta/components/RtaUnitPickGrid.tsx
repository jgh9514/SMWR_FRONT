'use client';

import { Box, Avatar, Typography } from '@mui/material';
import { getMonsterImageUrl } from '@/shared/utils/image';

/**
 * RTA 5맵 픽 3×2: P1과 동일한 토폴로지(1맵=왼쪽 2칸)를 쓰고, P2는 그리드 전체를 가로 대칭해 1맵이 **오른쪽** 큰 칸이 되게 한다.
 * (이전 `fp-1`…`fp-5` 방식은 1맵이 항상 왼쪽에 붙어 양쪽이 선픽 형태로 보이는 문제가 있음.)
 */
const P1_GRID_AREAS = `"fp-0 fp-1 fp-3" "fp-0 fp-2 fp-4"`;

function unitIndexToGridAreaP1(unitIndex: number): string {
  if (unitIndex === 0) return 'fp-0';
  if (unitIndex === 1) return 'fp-1';
  if (unitIndex === 2) return 'fp-2';
  if (unitIndex === 3) return 'fp-3';
  if (unitIndex === 4) return 'fp-4';
  return 'fp-4';
}

export default function RtaUnitPickGrid({
  units,
  side: playerSide,
}: {
  units: { image: string; name: string; banned?: boolean; leader?: boolean }[];
  side: 'p1' | 'p2';
}) {
  const isP1 = playerSide === 'p1';
  const mirror = !isP1;

  return (
    <Box
      sx={{
        direction: 'ltr',
        unicodeBidi: 'isolate',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, minmax(40px, 1fr))',
        gap: { xs: 0.25, md: 0.5 },
        width: 'fit-content',
        maxWidth: '100%',
        gridTemplateAreas: P1_GRID_AREAS,
        transform: mirror ? 'scaleX(-1)' : 'none',
      }}
    >
      {units.slice(0, 5).map((unit, unitIndex) => {
        const gridArea = unitIndexToGridAreaP1(unitIndex);
        return (
          <Box
            key={unitIndex}
            sx={{
              p: 0.25,
              minHeight: 0,
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gridArea,
              alignSelf: 'stretch',
              transform: mirror ? 'scaleX(-1)' : 'none',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: { xs: 32, md: 36 },
                height: { xs: 32, md: 36 },
                flexShrink: 0,
              }}
            >
              <Avatar
                src={getMonsterImageUrl(unit.image)}
                alt={unit.name}
                sx={{
                  width: '100%',
                  height: '100%',
                  border: unit.leader ? '2px solid gold' : '2px solid #d4a574',
                  borderRadius: '50%',
                  backgroundColor: 'transparent',
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
                    backgroundImage:
                      'linear-gradient(to bottom right, transparent 48%, #fff 48%, #fff 52%, transparent 52%)',
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
                    zIndex: 2,
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
          </Box>
        );
      })}
      {(!units || units.length === 0) && (
        <Box
          sx={{
            gridColumn: '1 / -1',
            py: 0.5,
            textAlign: isP1 ? 'left' : 'right',
            transform: mirror ? 'scaleX(-1)' : 'none',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
            몬스터 정보가 없습니다
          </Typography>
        </Box>
      )}
    </Box>
  );
}
