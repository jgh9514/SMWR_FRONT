'use client';

import { useState } from 'react';
import { Box } from '@mui/material';
import Image from 'next/image';
import { getRenderableImageUrl } from '@/shared/utils/image';

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
  const bannerImageUrl = getRenderableImageUrl(imagePath);

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
        <Image
          src={bannerImageUrl}
          alt={alt}
          fill
          sizes="100vw"
          style={{ objectFit: 'cover' }}
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

