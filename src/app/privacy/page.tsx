import type { Metadata } from 'next';
import PrivacyPageClient from './PrivacyPageClient';
import { buildPublicMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildPublicMetadata({
  title: '개인정보 처리방침',
  description:
    '수집 항목, 처리 목적, 보유 기간, 제3자 제공, 위탁, 정보주체 권리, 쿠키, 안전성 조치, 문의 등 개인정보 처리방침입니다.',
  path: '/privacy',
  keywords: ['개인정보', '개인정보 보호법', '쿠키', '처리방침', 'SKYARENA'],
});

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
