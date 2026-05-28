import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildNoIndexMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('점령전 로그 업로드');

export default function LogUploadLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
