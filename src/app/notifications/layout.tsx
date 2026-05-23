import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildNoIndexMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('알림');

export default function NotificationsLayout({ children }: { children: ReactNode }) {
  return children;
}
