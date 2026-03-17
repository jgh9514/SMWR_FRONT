import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildNoIndexMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('최근 점령전');

export default function RecentSiegeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
