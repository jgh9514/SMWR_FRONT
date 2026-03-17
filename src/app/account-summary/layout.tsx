import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildNoIndexMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('계정 요약');

export default function AccountSummaryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
