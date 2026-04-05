'use client';

import Image from 'next/image';
import { getRatingStarIconPath, getRatingStars, RATING_ID_LEGEND_RANK_1 } from '@/shared/utils';

export interface RtaRatingStarIconsProps {
  rating: number | string | undefined;
  /** 한 별 아이콘 한 변(px) */
  size?: number;
  gap?: number;
}

function ratingNum(rating: number | string | undefined): number | null {
  if (rating === undefined || rating === null) return null;
  const n = typeof rating === 'string' ? parseInt(rating, 10) : Math.floor(rating);
  return Number.isNaN(n) ? null : n;
}

/**
 * RTA 레이팅(rating_id)에 맞는 티어 별 PNG 1~3개 (getRatingStars·public/icons 규칙 동일).
 * rating_id 5001(레전드 1위)만 전설 단일 배지 — 가운데 정렬.
 */
export default function RtaRatingStarIcons({ rating, size = 14, gap = 2 }: RtaRatingStarIconsProps) {
  const count = getRatingStars(rating);
  const src = getRatingStarIconPath(rating);
  if (!src || count <= 0) return null;

  const n = ratingNum(rating);
  const isLegendRank1 = n === RATING_ID_LEGEND_RANK_1;

  if (isLegendRank1) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 0,
        }}
        aria-hidden
      >
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          unoptimized
          style={{ display: 'block', width: size, height: size, verticalAlign: 'middle' }}
        />
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: `${gap}px` }} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <Image
          key={i}
          src={src}
          alt=""
          width={size}
          height={size}
          unoptimized
          style={{ display: 'block', width: size, height: size }}
        />
      ))}
    </span>
  );
}
