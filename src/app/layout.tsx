import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import AppProviders from '@/shared/providers/AppProviders';
import ErrorBoundary from '@/shared/ui/error-boundary/ErrorBoundary';

export const metadata: Metadata = {
  title: '전투 로그 분석 시스템',
  description: '점령전과 실레나 전투 데이터를 분석하고 관리하는 시스템',
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
