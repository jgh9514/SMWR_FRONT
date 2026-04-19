import type { SearchData, SearchDataValue } from '@/shared/types/util';

/**
 * 값이 null, undefined 또는 빈 문자열인지 확인하는 함수
 */
export const isEmpty = (value: unknown): boolean => {
  if (typeof value === "undefined" || value == undefined || value == null || value === "") return true;
  return false;
}

/**
 * 값이 유효한지 확인하는 함수
 */
export const hasValue = (value: unknown): boolean => {
  if (isEmpty(value)) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return false;
  return true;
}

/**
 * 값이 없을 경우 기본값을 반환하는 함수
 */
export const nvl = <T>(value: unknown, defaultValue: T): T => {
  return hasValue(value) ? (value as T) : defaultValue;
}

/**
 * 검색 데이터 추출
 */
export const searchDataExtraction = (schDatas: SearchData): Record<string, unknown> => {
  const extractedData: Record<string, unknown> = {};

  for (const key in schDatas) {
    const value = schDatas[key];
    if (!value && value !== 0) continue;

    if (typeof value === 'object' && value !== null && 'value' in value) {
      const searchDataValue = value as SearchDataValue;
      extractedData[key] = searchDataValue.value !== undefined 
        ? searchDataValue.value 
        : value;
    } else {
      extractedData[key] = value;
    }
  }

  return extractedData;
};

/**
 * RTA 레이팅 색상 (rating_id 구간)
 * 1000번대 Ch, 2000 F, 3000 C, 3500 P, 4000 G, 5000 L
 */
export const getRatingColor = (rating: number | string | undefined): string => {
  if (rating === undefined || rating === null) return '#999';
  const ratingNum = typeof rating === 'string' ? parseInt(rating, 10) : Math.floor(rating);
  if (isNaN(ratingNum)) return '#999';

  if (ratingNum >= 5000) return '#ffc107';
  if (ratingNum >= 4000) return '#9b59b6';
  if (ratingNum >= 3500) return '#e53935';
  if (ratingNum >= 3000) return '#00baad';
  if (ratingNum >= 2000) return '#ffc300';
  return '#999';
};

/**
 * RTA 레이팅 별 개수 계산 (Vue와 동일한 로직)
 * onesDigit를 사용하고 최대 3개까지만 표시
 * @param rating 레이팅 값 (number, string 또는 undefined)
 * @returns 별 개수 (0~3)
 */
export const getRatingStars = (rating: number | string | undefined): number => {
  if (rating === undefined || rating === null) return 0;
  const ratingNum = typeof rating === 'string' ? parseInt(rating, 10) : Math.floor(rating);
  if (isNaN(ratingNum)) return 0;

  /** 레전드 1위 전용 배지(rating_id 5001) — 별 3개가 아니라 단일 아이콘 1개만 */
  if (ratingNum === 5001) return 1;

  const onesDigit = ratingNum % 10;
  return Math.min(Math.max(onesDigit, 0), 3); // 0~3 범위로 제한
};

/**
 * RTA rating_id → 티어 문자열 (Ch / F / C / P / G / L). 집계·대시보드 SQL 의 슬롯 문자열 규칙과 동일.
 */
export function getRtaTierShortLabel(rating: number | string | undefined): string {
  if (rating === undefined || rating === null) return '—';
  const ratingNum = typeof rating === 'string' ? parseInt(rating, 10) : Math.floor(rating);
  if (isNaN(ratingNum)) return '—';
  const head =
    ratingNum >= 5000
      ? 'L'
      : ratingNum >= 4000
        ? 'G'
        : ratingNum >= 3500
          ? 'P'
          : ratingNum >= 3000
            ? 'C'
            : ratingNum >= 2000
              ? 'F'
              : 'Ch';
  const mod = ratingNum % 10;
  const sub = [1, 2, 3].includes(mod) ? String(mod) : '2';
  return `${head}${sub}`;
}

/** RTA 레전드 랭킹 1위 전용 rating_id (legend_star.png 단일 배지) */
export const RATING_ID_LEGEND_RANK_1 = 5001;

/** legend_star.png는 일반 티어 별(정사각) 대비 가로가 약 2배(동일 높이 기준) */
export const RTA_LEGEND_STAR_WIDTH_RATIO = 2;

export function getRatingStarIconPath(rating: number | string | undefined): string | null {
  if (rating === undefined || rating === null) return null;
  const ratingNum = typeof rating === 'string' ? parseInt(rating, 10) : Math.floor(rating);
  if (isNaN(ratingNum)) return null;
  if (ratingNum === RATING_ID_LEGEND_RANK_1) return '/icons/legend_star.png';
  if (ratingNum >= 4000) return '/icons/guardian_star.png';
  if (ratingNum >= 3500) return '/icons/punisher_star.png';
  if (ratingNum >= 3000) return '/icons/conqueror_star.png';
  if (ratingNum >= 2000) return '/icons/fighter_star.png';
  return '/icons/challenger_star.png';
}

/** getRtaTierShortLabel 결과 문자열(Ch1, F2 …) → public/icons 별 PNG (L1만 전설 1위 배지, L2·L3는 가디언 별) */
export function getRtaShortLabelStarIconPath(shortLabel: string): string {
  if (shortLabel.startsWith('Ch')) return '/icons/challenger_star.png';
  if (shortLabel.startsWith('F')) return '/icons/fighter_star.png';
  if (shortLabel.startsWith('C')) return '/icons/conqueror_star.png';
  if (shortLabel.startsWith('P')) return '/icons/punisher_star.png';
  if (shortLabel.startsWith('G')) return '/icons/guardian_star.png';
  if (shortLabel === 'L1') return '/icons/legend_star.png';
  if (shortLabel.startsWith('L')) return '/icons/guardian_star.png';
  return '/icons/challenger_star.png';
}

