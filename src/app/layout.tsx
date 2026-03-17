import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import AppProviders from '@/shared/providers/AppProviders';
import ErrorBoundary from '@/shared/ui/error-boundary/ErrorBoundary';
import { getSiteUrl } from '@/shared/lib/env';
import { getAbsoluteUrl } from '@/shared/lib/seo';

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
  openGraph: {
    title: '전투 로그 분석 시스템',
    description: '점령전, 실레나, 몬스터 정보를 빠르게 탐색하고 분석할 수 있는 서머너즈워 데이터 플랫폼',
    url: '/',
    siteName: '전투 로그 분석 시스템',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: getAbsoluteUrl('/images/default-monster.png'),
        alt: '전투 로그 분석 시스템',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '전투 로그 분석 시스템',
    description: '점령전, 실레나, 몬스터 정보를 빠르게 탐색하고 분석할 수 있는 서머너즈워 데이터 플랫폼',
    images: [getAbsoluteUrl('/images/default-monster.png')],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <ErrorBoundary>
          <AppProviders>{children}</AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
