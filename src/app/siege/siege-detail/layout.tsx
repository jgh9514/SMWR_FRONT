import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildNoIndexMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('점령전 상세');

export default function SiegeDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
