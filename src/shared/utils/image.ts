/**
 * 이미지 URL 유틸리티
 * CloudFront CDN을 통해 S3에 저장된 이미지 파일에 접근
 * 이미지 경로 예시: /monster/banner.jpg, /images/Wind_a/Julien_Wind_a_Icon.png
 */

import { getCdnImageUrl } from '@/shared/lib/env';

/**
 * CloudFront CDN을 통한 이미지 URL 생성
 * @param imageUrl - API에서 받은 이미지 경로 (예: /images/Wind_a/Julien_Wind_a_Icon.png, /monster/banner.jpg)
 * @returns CloudFront CDN을 통한 완전한 이미지 URL (예: https://dyjduzi8vf2k4.cloudfront.net/images/Wind_a/Julien_Wind_a_Icon.png)
 */
export const getMonsterImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) {
    // 기본 이미지도 CloudFront CDN 사용
    return getCdnImageUrl('/images/default-monster.png');
  }

  // 이미 전체 URL인 경우 그대로 반환
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // CloudFront CDN URL 사용
  const cdnUrl = getCdnImageUrl(imageUrl);
  
  // 디버깅 로그
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.log('[이미지 URL] 생성:', {
      imageUrl,
      cdnUrl,
      hostname: window.location.hostname,
    });
  }
  
  return cdnUrl;
};

/**
 * 정적 이미지 URL (public 폴더)
 * @param imagePath - public 폴더 기준 경로 (예: /images/icon.png)
 */
export const getStaticImageUrl = (imagePath: string): string => {
  return imagePath;
};

