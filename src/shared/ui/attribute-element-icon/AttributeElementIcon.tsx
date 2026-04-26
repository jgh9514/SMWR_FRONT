'use client';

import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { AttributeType } from '@/features/siege/types/monster';

/**
 * 레포 `public/images` 5개 아이콘만 사용. {@code getCdnImageUrl} 을 쓰지 않는다.
 * (CDN·로컬 자산 이중화 시 버전이 어긋나는 문제 방지, 배포한 Next 정적과 항상 동일)
 */
const ELEMENT_IMAGE_PATH: Record<AttributeType, string> = {
  fire: '/images/Fire_Icon.png',
  water: '/images/Water_Icon.png',
  wind: '/images/Wind_Icon.png',
  light: '/images/Light_Icon.png',
  dark: '/images/Dark_Icon.png',
};

export type AttributeElementIconProps = {
  attribute: AttributeType;
  /** 아이콘 크기(px) */
  size?: number;
  sx?: SxProps<Theme>;
  /** 접근성 라벨 */
  titleAccess?: string;
};

export default function AttributeElementIcon({
  attribute,
  size = 22,
  sx,
  titleAccess,
}: AttributeElementIconProps) {
  const src = ELEMENT_IMAGE_PATH[attribute];
  return (
    <Box
      component="img"
      src={src}
      alt={titleAccess ?? attribute}
      title={titleAccess}
      width={size}
      height={size}
      sx={{
        width: size,
        height: size,
        verticalAlign: 'middle',
        flexShrink: 0,
        display: 'inline-block',
        objectFit: 'contain',
        ...sx,
      }}
    />
  );
}
