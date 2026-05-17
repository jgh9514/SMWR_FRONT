import type { Metadata } from 'next';
import { buildPublicMetadata } from '@/shared/lib/seo';
import TierListClient from '@/features/tier-list/TierListClient';

export const metadata: Metadata = buildPublicMetadata({
  title: '티어 리스트 메이커',
  description:
    '서머너즈워 몬스터를 드래그 앤 드롭으로 직접 티어표를 만들고 공유해보세요.',
  path: '/tier-list',
  keywords: ['티어 리스트', '서머너즈워 티어표', '몬스터 티어', 'tier list maker'],
});

export default function TierListPage() {
  return <TierListClient />;
}
