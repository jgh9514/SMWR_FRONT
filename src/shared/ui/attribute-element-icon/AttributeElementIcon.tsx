'use client';

import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import WaterDropRoundedIcon from '@mui/icons-material/WaterDropRounded';
import AirRoundedIcon from '@mui/icons-material/AirRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import type { AttributeType } from '@/features/siege/types/monster';

const ELEMENT_ICON_COMPONENT: Record<AttributeType, typeof LocalFireDepartmentRoundedIcon> = {
  fire: LocalFireDepartmentRoundedIcon,
  water: WaterDropRoundedIcon,
  wind: AirRoundedIcon,
  light: LightModeRoundedIcon,
  dark: DarkModeRoundedIcon,
};

const ELEMENT_ICON_COLOR: Record<AttributeType, string> = {
  fire: '#ef4444',
  water: '#3b82f6',
  wind: '#22c55e',
  light: '#f59e0b',
  dark: '#8b5cf6',
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
  const IconComponent = ELEMENT_ICON_COMPONENT[attribute];
  return (
    <Box
      component={IconComponent}
      aria-label={titleAccess}
      role={titleAccess ? 'img' : undefined}
      title={titleAccess}
      sx={{
        width: size,
        height: size,
        verticalAlign: 'middle',
        flexShrink: 0,
        display: 'inline-block',
        color: ELEMENT_ICON_COLOR[attribute],
        ...sx,
      }}
    />
  );
}
