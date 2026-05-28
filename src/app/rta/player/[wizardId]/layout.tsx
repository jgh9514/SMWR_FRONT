import type { Metadata } from 'next';
import RtaPlayerDetailShell from '@/features/rta/components/RtaPlayerDetailShell';
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

export default async function RtaPlayerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ wizardId: string }>;
}) {
  const { wizardId } = await params;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: 'RTA 분석', path: '/rta' },
    { name: '소환사 랭킹', path: '/rta/summoner-ranking' },
    { name: `소환사 ${wizardId}`, path: `/rta/player/${wizardId}` },
  ]);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `소환사 ${wizardId} · RTA`,
    url: getAbsoluteUrl(`/rta/player/${wizardId}`),
    inLanguage: 'ko-KR',
    description: sanitizeMetaDescription(`소환사 ${wizardId}의 RTA 픽·통계·기록을 제공합니다.`),
  };

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <RtaPlayerDetailShell wizardId={wizardId}>
        {children}
      </RtaPlayerDetailShell>
    </>
  );
}
