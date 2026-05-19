'use client';

import { Box } from '@mui/material';

type SiegeMapDeckGaugeProps = {
  slotCount: number;
  baseStatus: number;
  fillColor: string;
  empty?: boolean;
  /** 모양 배지와 한 줄로 붙일 때 — 외곽 테두리 없음 */
  embedded?: boolean;
};

const SEGMENT_DIVIDER = '1px solid rgba(0, 0, 0, 0.55)';

/**
 * 바형 분할 게이지. embedded 시 부모 막대 안에서 flex 로 나머지 너비 채움.
 */
export default function SiegeMapDeckGauge({
  slotCount,
  baseStatus,
  fillColor,
  empty = false,
  embedded = false,
}: SiegeMapDeckGaugeProps) {
  const count = Math.max(1, Math.min(slotCount, 8));
  const filled = !empty && baseStatus === 1;

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        height: embedded ? '100%' : 7,
        display: 'flex',
        alignItems: 'stretch',
        ...(embedded
          ? {
              border: 'none',
              borderRadius: 0,
              boxShadow: 'none',
              bgcolor: 'rgba(0, 0, 0, 0.55)',
            }
          : {
              borderRadius: 1,
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              bgcolor: 'rgba(0, 0, 0, 0.55)',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.4)',
            }),
        opacity: empty ? 0.35 : 1,
      }}
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <Box
          key={i}
          sx={{
            flex: 1,
            minWidth: 0,
            bgcolor: filled ? fillColor : 'rgba(255, 255, 255, 0.06)',
            borderRight: i < count - 1 ? SEGMENT_DIVIDER : 'none',
            transition: 'background-color 0.15s ease',
          }}
        />
      ))}
    </Box>
  );
}
