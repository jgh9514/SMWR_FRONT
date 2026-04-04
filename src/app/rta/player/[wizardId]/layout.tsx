import type { Metadata } from 'next';
import RtaPlayerDetailShell from '@/features/rta/components/RtaPlayerDetailShell';
import { buildPublicMetadata } from '@/shared/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ wizardId: string }>;
}): Promise<Metadata> {
  const { wizardId } = await params;
  return buildPublicMetadata({
    title: `RTA 소환사 ${wizardId}`,
    description: `RTA 소환사 ${wizardId}의 픽·통계·기록을 확인합니다.`,
    path: `/rta/player/${wizardId}`,
    keywords: ['RTA', '실레나', '소환사'],
    noIndex: true,
  });
}

export default async function RtaPlayerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ wizardId: string }>;
}) {
  const { wizardId } = await params;
  return <RtaPlayerDetailShell wizardId={wizardId}>{children}</RtaPlayerDetailShell>;
}
