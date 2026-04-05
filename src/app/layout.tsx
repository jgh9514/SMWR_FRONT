import type { Metadata, Viewport } from 'next';
import React from 'react';
import './globals.css';
import AppProviders from '@/shared/providers/AppProviders';
import ErrorBoundary from '@/shared/ui/error-boundary/ErrorBoundary';
import { getSiteUrl } from '@/shared/lib/env';
import { getAbsoluteUrl, SITE_NAME_DISPLAY, SITE_TITLE_DEFAULT } from '@/shared/lib/seo';
import { getPwaIconCacheQuery } from '@/shared/lib/pwa-icon-version';

const iconQ = getPwaIconCacheQuery();

export const viewport: Viewport = {
  themeColor: '#16213e',
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_TITLE_DEFAULT,
    template: `%s | ${SITE_NAME_DISPLAY}`,
  },
  description: '점령전, 실레나, 몬스터 정보를 빠르게 탐색하고 분석할 수 있는 서머너즈워 데이터 플랫폼',
  keywords: ['서머너즈워', '점령전', '실레나', 'RTA', '몬스터 검색', '전투 로그'],
  alternates: {
    canonical: '/',
  },
  /** `app/manifest.ts` → `/manifest.webmanifest` */
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE_NAME_DISPLAY,
  },
  /**
   * 파비콘은 `src/app/icon.png` + `apple-icon.png` 파일 규칙으로도 제공됨(운영에서 안정적).
   * 여기서는 OG/공유용 큰 아이콘과 캐시 무효화 쿼리만 유지.
   */
  icons: {
    icon: [
      { url: `/icons/192.png${iconQ}`, sizes: '192x192', type: 'image/png' },
      { url: `/icons/512.png${iconQ}`, sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: `/icons/192.png${iconQ}`, sizes: '192x192', type: 'image/png' },
  },
  openGraph: {
    title: SITE_TITLE_DEFAULT,
    description: '점령전, 실레나, 몬스터 정보를 빠르게 탐색하고 분석할 수 있는 서머너즈워 데이터 플랫폼',
    url: '/',
    siteName: SITE_NAME_DISPLAY,
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: getAbsoluteUrl(`/icons/512.png${iconQ}`),
        alt: SITE_TITLE_DEFAULT,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE_DEFAULT,
    description: '점령전, 실레나, 몬스터 정보를 빠르게 탐색하고 분석할 수 있는 서머너즈워 데이터 플랫폼',
    images: [getAbsoluteUrl(`/icons/512.png${iconQ}`)],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ErrorBoundary>
          <AppProviders>{children}</AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
