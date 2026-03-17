import type { Metadata } from 'next';
import MonsterSearchClient from '@/features/siege/components/MonsterSearchClient';
import { getMonsterListData } from '@/shared/lib/api/server';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const revalidate = 86400;

export const metadata: Metadata = buildPublicMetadata({
  title: '몬스터 검색',
  description:
    '서머너즈워 몬스터를 속성, 이름, 진화 정보 기준으로 빠르게 찾고 상세 스탯과 스킬 정보를 이어서 확인할 수 있습니다.',
  path: '/monster-search',
  keywords: ['몬스터 검색', '서머너즈워 몬스터', '속성별 몬스터', '몬스터 도감'],
});

export default async function MonsterSearchPage() {
  const monsterList = await getMonsterListData().catch(() => []);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '몬스터 검색',
    url: getAbsoluteUrl('/monster-search'),
    inLanguage: 'ko-KR',
    description:
      '서머너즈워 몬스터를 속성, 이름, 진화 정보 기준으로 빠르게 찾고 상세 스탯과 스킬 정보를 이어서 확인할 수 있습니다.',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: monsterList.length,
    },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '몬스터 검색', path: '/monster-search' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <MonsterSearchClient monsterList={monsterList} />
    </>
  );
}
