import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import AppProviders from '@/shared/providers/AppProviders';
import ErrorBoundary from '@/shared/ui/error-boundary/ErrorBoundary';
import { getSiteUrl } from '@/shared/lib/env';
import { getAbsoluteUrl } from '@/shared/lib/seo';
import { getPwaIconCacheQuery } from '@/shared/lib/pwa-icon-version';

const iconQ = getPwaIconCacheQuery();

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: '전투 로그 분석 시스템',
    template: '%s | 전투 로그 분석 시스템',
  },
  description: '점령전, 실레나, 몬스터 정보를 빠르게 탐색하고 분석할 수 있는 서머너즈워 데이터 플랫폼',
  keywords: ['서머너즈워', '점령전', '실레나', 'RTA', '몬스터 검색', '전투 로그'],
  alternates: {
    canonical: '/',
  },
  /** `app/manifest.ts` → `/manifest.webmanifest` */
  manifest: '/manifest.webmanifest',
  themeColor: '#16213e',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SMWR',
  },
  icons: {
    icon: [
      { url: `/icons/192.png${iconQ}`, sizes: '192x192', type: 'image/png' },
      { url: `/icons/512.png${iconQ}`, sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: `/icons/192.png${iconQ}`, sizes: '192x192', type: 'image/png' },
  },
  openGraph: {
    title: '전투 로그 분석 시스템',
    description: '점령전, 실레나, 몬스터 정보를 빠르게 탐색하고 분석할 수 있는 서머너즈워 데이터 플랫폼',
    url: '/',
    siteName: '전투 로그 분석 시스템',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: getAbsoluteUrl(`/icons/512.png${iconQ}`),
        alt: '전투 로그 분석 시스템',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '전투 로그 분석 시스템',
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
