import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Docker를 위한 standalone 출력 모드 활성화
  output: 'standalone',
  // 이미지 요청을 백엔드로 프록시
  async rewrites() {
    const backendURL = process.env.NEXT_PUBLIC_API_BASE_URL 
      ? process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api/v1', '')
      : process.env.NODE_ENV === 'development'
      ? 'http://localhost:8080'
      : 'http://smw-app-service:8080';
    
    return [
      {
        source: '/images/:path*',
        destination: `${backendURL}/images/:path*`,
      },
    ];
  },
};

export default nextConfig;
