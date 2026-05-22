'use client';

import { Box, Typography } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory';
import type { SiegeBaseZone } from '@/features/siege/map/lib/siegeBaseLayout';

import { SIEGE_MARKER_BADGE_SIZE } from '@/features/siege/map/lib/siegeDeckSlots';

/** 하단 배지 한 변 길이(px) — 게이지 막대 높이와 맞춤 */
export const SIEGE_ZONE_BADGE_SIZE = SIEGE_MARKER_BADGE_SIZE;

type SiegeMapZoneShapeProps = {
  zone: SiegeBaseZone;
  color: string;
  /** 성채 내 슬롯 번호 (0=본진, 1~12) */
  slotNo: number;
  size?: number;
  empty?: boolean;
};

const numberSx = {
  position: 'relative' as const,
  zIndex: 1,
  fontSize: '0.55rem',
  fontWeight: 800,
  lineHeight: 1,
  color: '#fff',
  fontVariantNumeric: 'tabular-nums' as const,
  textShadow: '0 1px 2px rgba(0,0,0,0.85)',
  userSelect: 'none' as const,
};

/** 거점 하단 — 성채 구역 실루엣 안에 슬롯 번호(slot_no) */
export default function SiegeMapZoneShape({
  zone,
  color,
  slotNo,
  size = SIEGE_ZONE_BADGE_SIZE,
  empty = false,
}: SiegeMapZoneShapeProps) {
  const fill = empty ? 'rgba(255,255,255,0.35)' : color;

  if (zone === 'shield') {
    return (
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <ShieldIcon
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            color: fill,
          }}
        />
        <Typography component="span" sx={numberSx}>
          {slotNo}
        </Typography>
      </Box>
    );
  }

  if (zone === 'square') {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          bgcolor: fill,
          borderRadius: 0.35,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography component="span" sx={{ ...numberSx, textShadow: '0 1px 1px rgba(0,0,0,0.6)' }}>
          {slotNo}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <ChangeHistoryIcon
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          color: fill,
        }}
      />
      <Typography component="span" sx={{ ...numberSx, mt: 0.15 }}>
        {slotNo}
      </Typography>
    </Box>
  );
}
