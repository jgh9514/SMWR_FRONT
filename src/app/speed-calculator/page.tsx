import type { Metadata } from 'next';
import { buildPublicMetadata } from '@/shared/lib/seo';
import SpeedCalculatorClient from '@/features/speed-calculator/SpeedCalculatorClient';

export const metadata: Metadata = buildPublicMetadata({
  title: '공속 순서 계산기',
  description: '서머너즈워 점령전·아레나 공속 순서를 간편하게 계산해보세요.',
  path: '/speed-calculator',
  keywords: ['공속 계산기', '속도 순서', '점령전 공속', '아레나 공속', '서머너즈워 공속'],
});

export default function SpeedCalculatorPage() {
  return <SpeedCalculatorClient />;
}
