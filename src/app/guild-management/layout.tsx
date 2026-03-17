import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildNoIndexMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('길드 관리');

export default function GuildManagementLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
