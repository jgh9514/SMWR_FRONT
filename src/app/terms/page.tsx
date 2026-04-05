import type { Metadata } from 'next';
import TermsPageClient from './TermsPageClient';
import { buildPublicMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildPublicMetadata({
  title: '이용약관',
  description: '서비스 이용 조건 및 책임의 한계 등 이용약관입니다.',
  path: '/terms',
  keywords: ['이용약관', '서비스'],
});

export default function TermsPage() {
  return <TermsPageClient />;
}
