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
 * RTA 레이팅 색상 계산 (Vue와 동일한 로직)
 * @param rating 레이팅 값 (number, string 또는 undefined)
 * @returns 색상 코드
 */
export const getRatingColor = (rating: number | string | undefined): string => {
  if (rating === undefined || rating === null) return '#999';
  const ratingNum = typeof rating === 'string' ? parseInt(rating, 10) : Math.floor(rating);
  if (isNaN(ratingNum)) return '#999';
  
  if (ratingNum >= 4000) return '#ff3e00';
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
  
  const onesDigit = ratingNum % 10;
  return Math.min(Math.max(onesDigit, 0), 3); // 0~3 범위로 제한
};

/**
 * RTA rating_id 구간별 티어 아이콘 (public/icons, 대시보드 SQL 티어 분기와 동일)
 * ≥5000 G, ≥4000 P, ≥3000 C, ≥2000 F, 그 외 Ch
 */
/**
 * RTA rating_id → 티어 문자열 (예: Ch2, F3, G1). 대시보드 SQL tier_key 규칙과 동일.
 */
export function getRtaTierShortLabel(rating: number | string | undefined): string {
  if (rating === undefined || rating === null) return '—';
  const ratingNum = typeof rating === 'string' ? parseInt(rating, 10) : Math.floor(rating);
  if (isNaN(ratingNum)) return '—';
  const head =
    ratingNum >= 5000
      ? 'G'
      : ratingNum >= 4000
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

export function getRatingStarIconPath(rating: number | string | undefined): string | null {
  if (rating === undefined || rating === null) return null;
  const ratingNum = typeof rating === 'string' ? parseInt(rating, 10) : Math.floor(rating);
  if (isNaN(ratingNum)) return null;
  if (ratingNum >= 5000) return '/icons/guardian_star.png';
  if (ratingNum >= 4000) return '/icons/punisher_star.png';
  if (ratingNum >= 3000) return '/icons/conqueror_star.png';
  if (ratingNum >= 2000) return '/icons/fighter_star.png';
  return '/icons/challenger_star.png';
}

