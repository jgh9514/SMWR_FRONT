'use client';

import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { getMonsterImageUrl } from '@/shared/utils/image';

interface PageBannerProps {
  imagePath?: string;
  alt?: string;
  height?: { xs?: number; md?: number };
}

/**
 * 페이지 배너 이미지 컴포넌트
 * WAS 서버의 배너 이미지를 표시합니다.
 */
export default function PageBanner({
  imagePath = '/images/banner.jpg',
  alt = 'banner',
  height = { xs: 120, md: 200 },
}: PageBannerProps) {
  const [imageError, setImageError] = useState(false);
  // 서버와 클라이언트에서 동일한 초기 렌더링 보장 (hydration mismatch 방지)
  const [bannerImageUrl, setBannerImageUrl] = useState<string>(imagePath);
  
  // 클라이언트에서만 URL 변환 (hydration mismatch 방지)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBannerImageUrl(getMonsterImageUrl(imagePath));
    }
  }, [imagePath]);

  return (
    <Box
      sx={{
        mb: 2,
        width: '100%',
        height: height,
        bgcolor: 'primary.main',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {!imageError ? (
        <Box
          component="img"
          src={bannerImageUrl}
          alt={alt}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={() => {
            setImageError(true);
          }}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            bgcolor: 'primary.dark',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      )}
    </Box>
  );
}

