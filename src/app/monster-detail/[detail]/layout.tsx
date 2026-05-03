import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MonsterDetailContent from '@/features/siege/components/MonsterDetailContent';
import { getDevilmonImageUrlForSearch, getMonsterInfoData, getMonsterListData } from '@/shared/lib/api/server';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';
import { getRenderableImageUrl } from '@/shared/utils/image';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface LayoutParams {
  params: Promise<{ detail: string }>;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function buildDescription(monsterInfo: NonNullable<Awaited<ReturnType<typeof getMonsterInfoData>>>): string {
  const statSummary = [
    `체력 ${formatNumber(monsterInfo.max_lvl_hp)}`,
    `공격력 ${formatNumber(monsterInfo.max_lvl_attack)}`,
    `방어력 ${formatNumber(monsterInfo.max_lvl_defense)}`,
    `속도 ${formatNumber(monsterInfo.speed)}`,
  ].join(', ');
  const leaderPart = monsterInfo.leader_skill_description ? '리더 스킬과 ' : '';
  return `${monsterInfo.kr_name} ${monsterInfo.monster_elemental} 속성 ${monsterInfo.star}성 몬스터의 ${statSummary}, ${leaderPart}${monsterInfo.skills.length}개 스킬 구성을 확인할 수 있는 서머너즈워 몬스터 상세 페이지입니다.`;
}

export async function generateStaticParams() {
  const monsterList = await getMonsterListData().catch(() => []);
  return monsterList.map((monster) => ({ detail: monster.monster_id }));
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { detail: detailParam } = await params;
  const detail = decodeURIComponent(detailParam ?? '').trim();
  const monsterInfo = await getMonsterInfoData(detail);

  if (!monsterInfo) {
    return buildPublicMetadata({
      title: '몬스터 상세',
      description: '요청한 몬스터 상세 정보를 찾을 수 없습니다.',
      path: `/monster-detail/${detail}`,
      keywords: ['몬스터 상세'],
      noIndex: true,
    });
  }

  return {
    ...buildPublicMetadata({
      title: `${monsterInfo.kr_name} 상세 정보`,
      description: buildDescription(monsterInfo),
      path: `/monster-detail/${detail}`,
      keywords: [monsterInfo.kr_name, monsterInfo.un_name, monsterInfo.monster_elemental, '몬스터 상세', '리더 스킬'],
      image: getRenderableImageUrl(monsterInfo.image_url),
      imageAlt: monsterInfo.kr_name,
    }),
  };
}

export default async function MonsterDetailLayout({ children, params }: LayoutParams & { children: React.ReactNode }) {
  const { detail: detailParam } = await params;
  const detail = decodeURIComponent(detailParam ?? '').trim();

  const [monsterInfo, devilmonImageUrl] = await Promise.all([
    getMonsterInfoData(detail),
    getDevilmonImageUrlForSearch(),
  ]);

  if (!monsterInfo) {
    notFound();
  }

  const pageUrl = getAbsoluteUrl(`/monster-detail/${detail}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${monsterInfo.kr_name} 상세 정보`,
    description: buildDescription(monsterInfo),
    url: pageUrl,
    inLanguage: 'ko-KR',
    mainEntity: {
      '@type': 'Thing',
      name: monsterInfo.kr_name,
      alternateName: monsterInfo.un_name || undefined,
      identifier: monsterInfo.monster_id,
      image: monsterInfo.image_url ? [monsterInfo.image_url] : undefined,
      additionalProperty: [
        { '@type': 'PropertyValue', name: '속성', value: monsterInfo.monster_elemental },
        { '@type': 'PropertyValue', name: '등급', value: monsterInfo.star },
        { '@type': 'PropertyValue', name: '각성', value: monsterInfo.arousal_type },
        { '@type': 'PropertyValue', name: '리더 스킬', value: monsterInfo.leader_skill_description || undefined },
      ].filter((p) => p.value !== undefined && p.value !== ''),
    },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '몬스터 검색', path: '/monster-search' },
    { name: monsterInfo.kr_name, path: `/monster-detail/${detail}` },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <MonsterDetailContent monsterInfo={monsterInfo} devilmonImageUrl={devilmonImageUrl}>
        {children}
      </MonsterDetailContent>
    </>
  );
}
