import type { Metadata } from 'next';
import MonsterDetailShell from '@/features/siege/components/MonsterDetailShell';
import { getMonsterListData } from '@/shared/lib/api/server';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const dynamicParams = true;

interface LayoutParams {
  params: Promise<{ detail: string }>;
}

export async function generateStaticParams() {
  const monsterList = await getMonsterListData().catch(() => []);
  return monsterList.map((monster) => ({ detail: monster.monster_id }));
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { detail: detailParam } = await params;
  const detail = decodeURIComponent(detailParam ?? '').trim();
  const name = detail ? `몬스터 ${detail}` : '몬스터 상세';

  return buildPublicMetadata({
    title: `${name} · 상세 정보`,
    description: `${name}의 스탯·스킬·RTA 상성 정보를 확인합니다.`,
    path: detail ? `/monster-detail/${detail}` : '/monster-detail',
    keywords: ['몬스터 상세', detail].filter(Boolean),
  });
}

export default async function MonsterDetailLayout({ children, params }: LayoutParams & { children: React.ReactNode }) {
  const { detail: detailParam } = await params;
  const detail = decodeURIComponent(detailParam ?? '').trim();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '몬스터 검색', path: '/monster-search' },
    { name: detail ? `몬스터 ${detail}` : '몬스터 상세', path: `/monster-detail/${detail}` },
  ]);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: detail ? `몬스터 ${detail} 상세` : '몬스터 상세',
    url: getAbsoluteUrl(`/monster-detail/${detail}`),
    inLanguage: 'ko-KR',
  };

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <MonsterDetailShell detail={detail}>{children}</MonsterDetailShell>
    </>
  );
}
