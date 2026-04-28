'use client';

import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { AttributeType } from '@/features/siege/types/monster';

/**
 * 레포 `public/icons/elements` 5개 아이콘만 사용. {@code getCdnImageUrl} 미사용.
 * `/images/*` 는 next.config 에서 WAS→CDN 프록시 대상이라, 정적 자산은 이 경로로 분리한다.
 */
const ELEMENT_IMAGE_PATH: Record<AttributeType, string> = {
  fire: '/icons/elements/Fire_Icon.png',
  water: '/icons/elements/Water_Icon.png',
  wind: '/icons/elements/Wind_Icon.png',
  light: '/icons/elements/Light_Icon.png',
  dark: '/icons/elements/Dark_Icon.png',
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
