import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildNoIndexMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('문의');

export default function InquiryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
