'use client';

import { useCallback, useState } from 'react';
import { Box } from '@mui/material';
import { SIEGE_MAP_BACKGROUND_PATH } from '@/features/siege/map/lib/siegeMapConfig';
import { getCdnImageUrl } from '@/shared/lib/env';

/**
 * 점령전 맵 배경 (S3/CDN — 몬스터 이미지와 동일한 URL 규칙)
 */
export default function SiegeMapBackground() {
  const [failed, setFailed] = useState(false);
  const bgUrl = getCdnImageUrl(SIEGE_MAP_BACKGROUND_PATH);

  const handleError = useCallback(() => {
    setFailed(true);
  }, []);

  if (failed) {
    return (
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: '#0d1b2a',
        }}
      />
    );
  }

  return (
    <Box
      component="img"
      src={bgUrl}
      alt=""
      onError={handleError}
      draggable={false}
      sx={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'fill',
        objectPosition: 'center',
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'block',
      }}
    />
  );
}
