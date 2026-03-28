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
   *
   * 같은 이유로 기본 `pages`(HTML) NetworkFirst도 덮음: 설치형 PWA만 오래된 HTML을
   * 캐시에서 주면 배포 후 예전 `/_next/static/` 청크 URL을 물어 JS 로드/동작 오류가 날 수 있음.
   * 문서 탐색(navigate)만 네트워크로 고정하고, 정적 청크는 기존 규칙으로 캐시.
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
      {
        urlPattern: ({
          request,
          url,
          sameOrigin,
        }: {
          request: Request;
          url: URL;
          sameOrigin?: boolean;
        }) =>
          request.mode === "navigate" &&
          sameOrigin !== false &&
          !url.pathname.startsWith("/api/"),
        handler: "NetworkOnly",
        method: "GET",
        options: {
          cacheName: "pages",
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
  async headers() {
    return [
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
      {
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
    ];
  },
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
