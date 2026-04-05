'use client';

import GuildRequiredGate from '@/features/guild/components/GuildRequiredGate';
import RecentSiegePageContent from '@/features/siege/components/RecentSiegePageContent';

export default function RecentSiegePage() {
  return (
    <GuildRequiredGate title="최근 점령전은 길드 가입이 필요합니다">
      <RecentSiegePageContent />
    </GuildRequiredGate>
  );
}
