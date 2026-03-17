import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildNoIndexMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('설정');

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
