'use client';

import { Box } from '@mui/material';
import type { SiegeBaseLayout, SiegeBaseZone } from '@/features/siege/map/lib/siegeBaseLayout';
import {
  siegeDeckSlotCount,
  siegeMarkerBarWidth,
  SIEGE_MARKER_BADGE_SIZE,
} from '@/features/siege/map/lib/siegeDeckSlots';
import SiegeMapDeckGauge from '@/features/siege/map/components/SiegeMapDeckGauge';
import SiegeMapTower from '@/features/siege/map/components/SiegeMapTower';
import SiegeMapZoneShape from '@/features/siege/map/components/SiegeMapZoneShape';

type SiegeMapBaseMarkerProps = {
  layout: SiegeBaseLayout;
  zone: SiegeBaseZone;
  slotNo: number;
  displayWidth: number;
  displayHeight: number;
  baseStatus: number;
  color: string;
  empty: boolean;
  isHq: boolean;
  imageUrl: string | null;
};

/**
 * 거점 마커 — 본진: 이미지만. 일반: 타워(아이콘 px) + 하단 막대(슬롯 수에 맞는 너비)
 */
export default function SiegeMapBaseMarker({
  layout,
  zone,
  slotNo,
  displayWidth,
  displayHeight,
  baseStatus,
  color,
  empty,
  isHq,
  imageUrl,
}: SiegeMapBaseMarkerProps) {
  const barWidth = siegeMarkerBarWidth(layout.ringKind, displayWidth);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        lineHeight: 0,
      }}
    >
      <SiegeMapTower
        zone={zone}
        isHq={isHq}
        displayWidth={displayWidth}
        displayHeight={displayHeight}
        color={color}
        empty={empty}
        imageUrl={imageUrl}
      />
      {!isHq && (
        <Box
          sx={{
            width: barWidth,
            height: SIEGE_MARKER_BADGE_SIZE,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            mt: 0.35,
            borderRadius: 0.75,
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.35)',
            opacity: empty ? 0.35 : 1,
          }}
        >
          <Box
            sx={{
              flexShrink: 0,
              width: SIEGE_MARKER_BADGE_SIZE,
              height: SIEGE_MARKER_BADGE_SIZE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid rgba(0, 0, 0, 0.45)',
            }}
          >
            <SiegeMapZoneShape
              zone={zone}
              color={color}
              slotNo={slotNo}
              empty={empty}
            />
          </Box>
          <SiegeMapDeckGauge
            slotCount={siegeDeckSlotCount(layout.ringKind)}
            baseStatus={baseStatus}
            fillColor={color}
            empty={empty}
            embedded
          />
        </Box>
      )}
    </Box>
  );
}
