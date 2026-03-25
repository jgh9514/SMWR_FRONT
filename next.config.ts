import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

const withPWA = withPWAInit({
  dest: "public",
  /** 기본: 항상 PWA 활성. 로컬에서만 SW 끄려면 DISABLE_PWA=true */
  disable: process.env.DISABLE_PWA === "true" || process.env.DISABLE_PWA === "1",
  register: true,
  scope: "/",
  sw: "/sw.js",
  reloadOnOnline: true,
  /**
   * 기본 런타임 캐시에 `/api/` GET용 NetworkFirst(apis)가 있어,
   * PWA에서 API 응답이 캐시·오래된 5xx와 섞일 수 있음 → NetworkOnly로 덮어씀.
   */
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: ({ sameOrigin, url }: { sameOrigin?: boolean; url: URL }) =>
          sameOrigin !== false && url.pathname.startsWith("/api/"),
        handler: "NetworkOnly",
        options: {
          cacheName: "apis",
        },
      },
    ],
  },
});

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

export default withPWA(nextConfig);
