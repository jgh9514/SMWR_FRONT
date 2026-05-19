'use client';

import { useCallback, useState } from 'react';
import { Box } from '@mui/material';
import FortIcon from '@mui/icons-material/Fort';
import ShieldIcon from '@mui/icons-material/Shield';
import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory';
import type { SiegeBaseZone } from '@/features/siege/map/lib/siegeBaseLayout';
import { getCdnImageUrl } from '@/shared/lib/env';

/** PNG 거점 스프라이트 — 형태 따라지는 은은한 그림자 */
const TOWER_DROP_SHADOW = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.42))';
const TOWER_DROP_SHADOW_EMPTY = 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.28))';

type SiegeMapTowerProps = {
  zone: SiegeBaseZone;
  isHq: boolean;
  displayWidth: number;
  displayHeight: number;
  color: string;
  empty?: boolean;
  /** 마스터 이미지 경로(S3 상대). 없거나 로드 실패 시 MUI 아이콘 폴백 */
  imageUrl?: string | null;
};

function ZoneIcon({
  zone,
  isHq,
  color,
  width,
  height,
}: {
  zone: SiegeBaseZone;
  isHq: boolean;
  color: string;
  width: number;
  height: number;
}) {
  const iconSize = Math.max(width, height);
  if (isHq) {
    return <FortIcon sx={{ fontSize: iconSize, color }} />;
  }
  if (zone === 'shield') {
    return <ShieldIcon sx={{ fontSize: iconSize * 0.85, color }} />;
  }
  if (zone === 'square') {
    return (
      <Box
        sx={{
          width: width * 0.55,
          height: height * 0.55,
          bgcolor: color,
          borderRadius: 0.5,
        }}
      />
    );
  }
  return <ChangeHistoryIcon sx={{ fontSize: iconSize * 0.85, color }} />;
}

export default function SiegeMapTower({
  zone,
  isHq,
  displayWidth,
  displayHeight,
  color,
  empty,
  imageUrl,
}: SiegeMapTowerProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const displayColor = empty ? 'rgba(255,255,255,0.25)' : color;
  const cdnSrc = imageUrl && !imgFailed ? getCdnImageUrl(imageUrl) : null;

  const handleImgError = useCallback(() => {
    setImgFailed(true);
  }, []);

  const imageFilter = empty
    ? `grayscale(0.85) ${TOWER_DROP_SHADOW_EMPTY}`
    : TOWER_DROP_SHADOW;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}>
      {cdnSrc ? (
        <Box
          component="img"
          src={cdnSrc}
          alt=""
          draggable={false}
          onError={handleImgError}
          sx={{
            width: displayWidth,
            height: displayHeight,
            objectFit: 'contain',
            opacity: empty ? 0.45 : 1,
            filter: imageFilter,
            display: 'block',
            border: 'none',
            outline: 'none',
          }}
        />
      ) : (
        <Box sx={{ filter: empty ? TOWER_DROP_SHADOW_EMPTY : TOWER_DROP_SHADOW, lineHeight: 0 }}>
          <ZoneIcon
            zone={zone}
            isHq={isHq}
            color={displayColor}
            width={displayWidth}
            height={displayHeight}
          />
        </Box>
      )}
    </Box>
  );
}
