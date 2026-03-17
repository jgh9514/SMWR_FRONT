import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildNoIndexMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('길드 신청');

export default function GuildApplicationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
