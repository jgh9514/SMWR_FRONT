/**
 * 이미지 URL 유틸리티
 * WAS 서버의 static 리소스에 있는 이미지 파일에 접근
 * SpringBoot static 경로: /images/Wind_a/Julien_Wind_a_Icon.png
 */

/**
 * WAS 서버의 이미지 URL 생성
 * @param imageUrl - API에서 받은 이미지 경로 (예: /images/Wind_a/Julien_Wind_a_Icon.png)
 * @returns WAS 서버의 완전한 이미지 URL
 */
export const getMonsterImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) {
    return '/images/default-monster.png'; // 기본 이미지
  }

  // 이미 전체 URL인 경우
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // WAS 서버 URL 결정 (static 리소스는 /api/v1이 아닌 루트 경로)
  const getWASBaseURL = () => {
    // 브라우저 환경에서는 Next.js 프록시를 통해 접근
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // 로컬 환경에서는 직접 백엔드 호출
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8080';
      }
      // dev 환경 (jgh9514.com)
      if (hostname.includes('jgh9514.com')) {
        return `https://${hostname}`;
      }
      // 쿠버네티스 환경: Next.js 프록시를 통해 접근 (상대 경로)
      return '';
    }

    // 서버 사이드: 환경 변수가 있으면 사용 (쿠버네티스 클러스터 내부 Service)
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      // /api/v1을 제거하고 루트로
      return process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api/v1', '');
    }

    // 서버 사이드 기본값 - Next.js 프록시 사용
    return '';
  };

  const wasBaseURL = getWASBaseURL();
  // imageUrl이 이미 /images/로 시작하면 그대로 사용
  const cleanImageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  const finalUrl = `${wasBaseURL}${cleanImageUrl}`;
  
  // 디버깅 로그
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.log('[이미지 URL] 생성:', {
      imageUrl,
      wasBaseURL,
      cleanImageUrl,
      finalUrl,
      hostname: window.location.hostname,
    });
  }
  
  return finalUrl;
};

/**
 * 정적 이미지 URL (public 폴더)
 * @param imagePath - public 폴더 기준 경로 (예: /images/icon.png)
 */
export const getStaticImageUrl = (imagePath: string): string => {
  return imagePath;
};

