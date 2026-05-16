import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

/** 로고·파비콘·PWA 아이콘 캐시 무효화 (서버/클라이언트 동일). 아이콘만 갈아끼울 땐 NEXT_PUBLIC_APP_ICON_VERSION 올리면 됨. */
const iconCacheVersion =
  process.env.NEXT_PUBLIC_APP_ICON_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.npm_package_version ||
  '1';

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
      /**
       * Next.js 이미지 최적화 엔드포인트 — WebP 변환 결과를 SW에 30일 캐시.
       */
      {
        urlPattern: ({ sameOrigin, url }: { sameOrigin?: boolean; url: URL }) =>
          sameOrigin !== false && url.pathname.startsWith('/_next/image'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-image-optimized',
          expiration: {
            maxEntries: 2000,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      /**
       * CloudFront 몬스터 이미지 — 신규 몬스터가 몇 달에 한 번 추가되므로 30일 CacheFirst.
       * 첫 로드 후 모든 컴포넌트(Avatar, Image 등)에서 SW 캐시 즉시 반환(1ms).
       */
      {
        urlPattern: ({ url }: { url: URL }) =>
          url.hostname === 'dyjduzi8vf2k4.cloudfront.net',
        handler: 'CacheFirst',
        options: {
          cacheName: 'cdn-monster-images',
          expiration: {
            maxEntries: 3000,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      /**
       * 기본 규칙의 `*.png` StaleWhileRevalidate(최대 30일) 때문에 배포 후에도 로고/아이콘이 안 바뀌는 현상 방지.
       */
      {
        urlPattern: ({ sameOrigin, url }: { sameOrigin?: boolean; url: URL }) =>
          sameOrigin !== false && url.pathname.startsWith("/icons/"),
        handler: "NetworkOnly",
        options: {
          cacheName: "icons-network-only",
        },
      },
      {
        urlPattern: ({ sameOrigin, url }: { sameOrigin?: boolean; url: URL }) =>
          sameOrigin !== false && url.pathname === "/favicon.ico",
        handler: "NetworkOnly",
        options: {
          cacheName: "favicon-network-only",
        },
      },
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
  env: {
    NEXT_PUBLIC_ICON_CACHE_VERSION: iconCacheVersion,
  },
  /* config options here */
  reactCompiler: true,
  turbopack: {
    root: projectRoot,
  },
  // Docker를 위한 standalone 출력 모드 활성화
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'dyjduzi8vf2k4.cloudfront.net' },
    ],
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30일 캐시
  },
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
      {
        source: '/favicon.ico',
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
      /**
       * 브라우저 axios baseURL이 `/api/v1`일 때 동일 호스트로 요청이 들어오므로,
       * Next가 받지 않고 Spring WAS로 넘겨야 한다. (없으면 /api/v1/** → 404)
       * 앞단 Nginx/Ingress가 이미 /api를 WAS로만 보내면 이 rewrite는 타지 않음.
       */
      {
        source: '/api/v1/:path*',
        destination: `${backendURL}/api/v1/:path*`,
      },
      {
        source: '/images/:path*',
        destination: `${backendURL}/images/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);
