import type { NextConfig } from "next";
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    root: projectRoot,
  },
  // Docker를 위한 standalone 출력 모드 활성화
  output: 'standalone',
  // 이미지 요청을 백엔드로 프록시
  async rewrites() {
    let backendURL: string;
    
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      // 환경 변수가 있으면 /api/v1을 제거하고 루트 URL 사용
      backendURL = process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api/v1', '').replace(/\/$/, '');
    } else if (process.env.NODE_ENV === 'development') {
      // 개발 환경 기본값
      backendURL = 'http://localhost:8080';
    } else {
      // 프로덕션 기본값 (쿠버네티스 클러스터 내부 Service)
      backendURL = 'http://smw-app-service:8080';
    }
    
    return [
      {
        source: '/images/:path*',
        destination: `${backendURL}/images/:path*`,
      },
    ];
  },
};

export default nextConfig;
