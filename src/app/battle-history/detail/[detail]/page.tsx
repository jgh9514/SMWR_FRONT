import { Suspense } from 'react';
import BattleHistoryDetailPageClient from '@/features/battle-history/components/BattleHistoryDetailPageClient';

export default function BattleHistoryDetailPage() {
  return (
    <Suspense fallback={null}>
      <BattleHistoryDetailPageClient />
    </Suspense>
  );
}
