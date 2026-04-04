import type { Metadata } from 'next';
import RtaSummonerRankingClient from '@/features/rta/components/RtaSummonerRankingClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = buildPublicMetadata({
  title: 'RTA 소환사 랭킹',
  description:
    '수집된 실레나 리플레이 기준으로 소환사별 최신 RTA 점수 순위를 확인합니다. (공식 랭킹과 다를 수 있음)',
  path: '/rta/summoner-ranking',
  keywords: ['RTA', '소환사 랭킹', '실레나', 'RTA 점수', '레이팅'],
});

export default function RtaSummonerRankingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'RTA 소환사 랭킹',
    url: getAbsoluteUrl('/rta/summoner-ranking'),
    inLanguage: 'ko-KR',
    description:
      '수집된 실레나 리플레이 기준으로 소환사별 최신 RTA 점수 순위를 제공합니다.',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: 'RTA 분석', path: '/rta' },
    { name: 'RTA 소환사 랭킹', path: '/rta/summoner-ranking' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <RtaSummonerRankingClient />
    </>
  );
}
