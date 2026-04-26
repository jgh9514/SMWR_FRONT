'use client';

import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { AttributeType } from '@/features/siege/types/monster';
import { getCdnImageUrl } from '@/shared/lib/env';

/**
 * DB·게임 기준 정적 경로만 상수로 둔다. URL( CDN )은 {@link getCdnImageUrl}이 런타임·클라이언트에서 읽는다.
 * 모듈 로드 시점에 getCdnImageUrl을 부르면 `window.env.APP_CDN_URL` 주입 전 값으로 고정되어 운영에서 깨질 수 있음.
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
  const src = getCdnImageUrl(ELEMENT_IMAGE_PATH[attribute]);
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
