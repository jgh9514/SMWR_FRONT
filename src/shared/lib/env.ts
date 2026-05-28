/**
 * 환경 변수 유틸리티
 * Next.js 빌드 시점 환경 변수와 런타임 환경 변수를 모두 지원
 */

declare global {
  interface Window {
    env?: {
      APP_CDN_URL?: string;
    };
  }
}

/** CloudFront 기본 (NEXT_PUBLIC_APP_CDN_URL 미설정 시 /cdn-image·/siege 에셋용) */
export const DEFAULT_APP_CDN_BASE = 'https://dyjduzi8vf2k4.cloudfront.net';

/**
 * CloudFront CDN URL 가져오기
 * 1. 빌드 시점: process.env.APP_CDN_URL (NEXT_PUBLIC_ 접두사 필요)
 * 2. 런타임: window.env.APP_CDN_URL (쿠버네티스 환경 변수 주입)
 * 
 * @returns CloudFront CDN URL (예: https://dyjduzi8vf2k4.cloudfront.net)
 */
export const getCdnUrl = (): string => {
  // 런타임 환경 변수 (쿠버네티스에서 주입)
  if (typeof window !== 'undefined' && window.env?.APP_CDN_URL) {
    return window.env.APP_CDN_URL;
  }

  // 빌드 시점 환경 변수 (Next.js에서 NEXT_PUBLIC_ 접두사 필요)
  if (process.env.NEXT_PUBLIC_APP_CDN_URL) {
    return process.env.NEXT_PUBLIC_APP_CDN_URL;
  }

  // 기본값 (개발 환경)
  if (process.env.NODE_ENV === 'development') {
    return '';
  }

  // 프로덕션 환경에서도 환경 변수가 없으면 빈 문자열 반환 (상대 경로 사용)
  return '';
};

/**
 * 서비스 기본 URL
 */
export const getSiteUrl = (): string => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    return siteUrl.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  return 'https://localhost:3000';
};

/**
 * 이미지 URL 생성 (CloudFront CDN 사용)
 * @param imagePath - 이미지 경로 (예: /monster/banner.jpg, /images/default-monster.png)
 * @returns 완전한 이미지 URL (예: https://dyjduzi8vf2k4.cloudfront.net/monster/banner.jpg)
 */
export const getCdnImageUrl = (imagePath: string): string => {
  if (!imagePath) {
    return '';
  }

  // 이미 전체 URL인 경우 그대로 반환
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  const cdnUrl = getCdnUrl();

  // CDN URL이 없으면: /images·/monster 는 public 상대 경로, /siege 는 Next 라우트(/siege/map)와 충돌 → CDN 직접
  if (!cdnUrl) {
    if (cleanPath.startsWith('/siege/')) {
      const base = DEFAULT_APP_CDN_BASE.endsWith('/')
        ? DEFAULT_APP_CDN_BASE.slice(0, -1)
        : DEFAULT_APP_CDN_BASE;
      return `${base}${cleanPath}`;
    }
    return cleanPath;
  }

  const cleanCdnUrl = cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;

  return `${cleanCdnUrl}${cleanPath}`;
};

