import type { Metadata } from 'next';
import AdminLayoutClient from './AdminLayoutClient';
import { buildNoIndexMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('관리자');

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
