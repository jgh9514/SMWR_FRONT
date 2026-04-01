'use client';

import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { AttributeType } from '@/features/siege/types/monster';
import { getRenderableImageUrl } from '@/shared/utils/image';

const ELEMENT_IMAGE_SRC: Record<AttributeType, string> = {
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

/**
 * `public/images/*_Icon.png` — `/images` 라우트가 백엔드 실패 시 public으로 폴백합니다.
 */
export default function AttributeElementIcon({
  attribute,
  size = 22,
  sx,
  titleAccess,
}: AttributeElementIconProps) {
  const src = getRenderableImageUrl(ELEMENT_IMAGE_SRC[attribute]);
  return (
    <Box
      component="img"
      src={src}
      alt={titleAccess ?? ''}
      title={titleAccess}
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        verticalAlign: 'middle',
        flexShrink: 0,
        display: 'inline-block',
        ...sx,
      }}
    />
  );
}
