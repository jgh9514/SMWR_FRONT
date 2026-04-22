'use client';

import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { AttributeType } from '@/features/siege/types/monster';

const ELEMENT_ICON_SRC: Record<AttributeType, string> = {
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
  return (
    <Box
      component="img"
      src={ELEMENT_ICON_SRC[attribute]}
      alt={titleAccess ?? attribute}
      title={titleAccess}
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
