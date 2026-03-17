import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildNoIndexMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('로그인');

export default function LoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
