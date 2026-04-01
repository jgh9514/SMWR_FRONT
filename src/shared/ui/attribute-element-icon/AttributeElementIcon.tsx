'use client';

import type { SxProps, Theme } from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AirIcon from '@mui/icons-material/Air';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import type { AttributeType } from '@/features/siege/types/monster';

const COLORS: Record<AttributeType, string> = {
  fire: '#ef5350',
  water: '#42a5f5',
  wind: '#66bb6a',
  light: '#ffb300',
  dark: '#ab47bc',
};

const ICONS = {
  fire: LocalFireDepartmentIcon,
  water: WaterDropIcon,
  wind: AirIcon,
  light: WbSunnyIcon,
  dark: DarkModeIcon,
} as const;

export type AttributeElementIconProps = {
  attribute: AttributeType;
  /** 아이콘 크기(px) */
  size?: number;
  sx?: SxProps<Theme>;
  /** 접근성 라벨(없으면 스크린리더에서 숨김) */
  titleAccess?: string;
};

/**
 * `/images/Fire_Icon.png` 등은 `app/images` 프록시 때문에 백엔드에 없으면 깨짐 → MUI 아이콘으로 고정 표시.
 */
export default function AttributeElementIcon({
  attribute,
  size = 22,
  sx,
  titleAccess,
}: AttributeElementIconProps) {
  const Icon = ICONS[attribute];
  return (
    <Icon
      titleAccess={titleAccess}
      sx={{
        fontSize: size,
        color: COLORS[attribute],
        verticalAlign: 'middle',
        flexShrink: 0,
        ...sx,
      }}
    />
  );
}
