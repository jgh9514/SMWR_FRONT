import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@/shared/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('전적 상세');

export default function BattleHistoryDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
