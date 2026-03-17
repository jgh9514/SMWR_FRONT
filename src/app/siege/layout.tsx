import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildPublicMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildPublicMetadata({
  title: '점령전 덱 검색',
  description:
    '점령전 방어 덱 조합별 승률과 전투 기록을 빠르게 탐색하고, 자주 등장하는 조합과 추천 공략 흐름을 확인할 수 있습니다.',
  path: '/siege',
  keywords: ['점령전 덱 검색', '방어 덱', '공략 덱', '승률 분석'],
});

export default function SiegeLayout({
  children,
  detail,
}: {
  children: ReactNode;
  detail: ReactNode;
}) {
  return (
    <>
      {children}
      {detail}
    </>
  );
}

