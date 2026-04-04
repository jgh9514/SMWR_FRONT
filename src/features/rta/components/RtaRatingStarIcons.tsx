'use client';

import Image from 'next/image';
import { getRatingStarIconPath, getRatingStars } from '@/shared/utils';

export interface RtaRatingStarIconsProps {
  rating: number | string | undefined;
  /** 한 별 아이콘 한 변(px) */
  size?: number;
  gap?: number;
}

/**
 * RTA 레이팅(rating_id)에 맞는 티어 별 PNG를 1~3개 표시 (getRatingStars 규칙 동일)
 */
export default function RtaRatingStarIcons({ rating, size = 14, gap = 2 }: RtaRatingStarIconsProps) {
  const count = getRatingStars(rating);
  const src = getRatingStarIconPath(rating);
  if (!src || count <= 0) return null;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: `${gap}px` }} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <Image key={i} src={src} alt="" width={size} height={size} unoptimized style={{ display: 'block' }} />
      ))}
    </span>
  );
}
