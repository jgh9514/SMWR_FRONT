import type { Metadata } from 'next';
import RtaPlayerDetailShell from '@/features/rta/components/RtaPlayerDetailShell';
import type { RtaPlayerSummary } from '@/features/rta/types/rta';
import { getRtaPlayerSummaryData } from '@/shared/lib/api/server';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl, sanitizeMetaDescription } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ wizardId: string }>;
}): Promise<Metadata> {
  const { wizardId } = await params;
  const name = `소환사 ${wizardId}`;

  return buildPublicMetadata({
    title: `${name} · RTA 소환사`,
    description: sanitizeMetaDescription(`${name}의 RTA 픽·통계·기록을 확인합니다.`),
    path: `/rta/player/${wizardId}`,
    keywords: ['RTA', '실레나', '소환사', wizardId],
    noIndex: true,
  });
}

function displayNameFromSummary(summary: RtaPlayerSummary | null, wizardId: string): string {
  if (summary?.found) {
    const n = summary.wizard_name?.trim();
    if (n) return n;
  }
  return `소환사 ${wizardId}`;
}

export default async function RtaPlayerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ wizardId: string }>;
}) {
  const { wizardId } = await params;
  const summary = await getRtaPlayerSummaryData(wizardId);
  const name = displayNameFromSummary(summary, wizardId);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${name} · RTA`,
    url: getAbsoluteUrl(`/rta/player/${wizardId}`),
    inLanguage: 'ko-KR',
    description: sanitizeMetaDescription(
      summary?.found
        ? `${name}의 RTA 점수·순위·승률(수집 리플레이 기준) 및 픽·기록을 제공합니다.`
        : `${name}의 RTA 픽·통계·기록을 제공합니다.`,
    ),
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: 'RTA 분석', path: '/rta' },
    { name: '소환사 랭킹', path: '/rta/summoner-ranking' },
    { name: name, path: `/rta/player/${wizardId}` },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <RtaPlayerDetailShell wizardId={wizardId} initialSummary={summary}>
        {children}
      </RtaPlayerDetailShell>
    </>
  );
}
