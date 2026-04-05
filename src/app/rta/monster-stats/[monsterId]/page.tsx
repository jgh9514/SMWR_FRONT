import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RtaMonsterDetailContent from '@/features/rta/components/RtaMonsterDetailContent';
import { getRtaMonsterDetailData, getRtaMonsterStatsData } from '@/shared/lib/api/server';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';
import { getRenderableImageUrl } from '@/shared/utils/image';

/** 목록·상세 동일: RTA 통계 API는 POST + 실시간 반영 우선 */
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface RtaMonsterDetailPageProps {
  params: Promise<{ monsterId: string }>;
}

function buildRtaMonsterDescription(data: Awaited<ReturnType<typeof getRtaMonsterDetailData>> extends infer T
  ? NonNullable<T>
  : never): string {
  const recentMatchCount = data.recent_matches.length;
  const strongAgainstCount = data.strong_against.length;
  const comboCount = data.good_combos.length + data.good_triple_combos.length;

  return `${data.monster_name}의 픽 ${data.pick_count}회 기준 픽률 ${data.pick_rate}%, 승률 ${data.win_rate}%, 선픽율 ${data.first_pick_rate}%, 벤율 ${data.ban_rate}%와 최근 경기 ${recentMatchCount}건, 상성 우위 ${strongAgainstCount}건, 추천 조합 ${comboCount}건을 확인할 수 있습니다.`;
}

export async function generateStaticParams() {
  const data = await getRtaMonsterStatsData(100, 0).catch(() => ({ stats: [] }));
  return (data.stats ?? [])
    .filter((monster) => !!monster.monster_id)
    .map((monster) => ({ monsterId: String(monster.monster_id) }));
}

export async function generateMetadata({
  params,
}: RtaMonsterDetailPageProps): Promise<Metadata> {
  const { monsterId } = await params;
  const data = await getRtaMonsterDetailData(Number(monsterId));

  if (!data) {
    return buildPublicMetadata({
      title: 'RTA 몬스터 상세',
      description: '요청한 RTA 몬스터 상세 데이터를 찾을 수 없습니다.',
      path: `/rta/monster-stats/${monsterId}`,
      keywords: ['RTA 몬스터 상세'],
      noIndex: true,
    });
  }

  return buildPublicMetadata({
    title: `${data.monster_name} RTA 상세`,
    description: buildRtaMonsterDescription(data),
    path: `/rta/monster-stats/${monsterId}`,
    keywords: [
      data.monster_name,
      data.monster_elemental,
      'RTA 몬스터 상세',
      '픽률',
      '승률',
      '벤율',
    ],
    image: getRenderableImageUrl(data.monster_image),
    imageAlt: data.monster_name,
  });
}

export default async function MonsterDetailPage({
  params,
}: RtaMonsterDetailPageProps) {
  const { monsterId } = await params;
  const data = await getRtaMonsterDetailData(Number(monsterId));

  if (!data) {
    notFound();
  }

  const pageUrl = getAbsoluteUrl(`/rta/monster-stats/${monsterId}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${data.monster_name} RTA 상세`,
    description: buildRtaMonsterDescription(data),
    url: pageUrl,
    inLanguage: 'ko-KR',
    mainEntity: {
      '@type': 'Thing',
      name: data.monster_name,
      identifier: String(data.monster_id),
      image: data.monster_image ? [data.monster_image] : undefined,
      additionalProperty: [
        { '@type': 'PropertyValue', name: '속성', value: data.monster_elemental },
        { '@type': 'PropertyValue', name: '픽 횟수', value: data.pick_count },
        { '@type': 'PropertyValue', name: '픽률', value: `${data.pick_rate}%` },
        { '@type': 'PropertyValue', name: '승률', value: `${data.win_rate}%` },
        { '@type': 'PropertyValue', name: '선픽율', value: `${data.first_pick_rate}%` },
        { '@type': 'PropertyValue', name: '벤율', value: `${data.ban_rate}%` },
      ],
    },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: 'RTA 분석', path: '/rta' },
    { name: 'RTA 몬스터 통계', path: '/rta/monster-stats' },
    { name: data.monster_name, path: `/rta/monster-stats/${monsterId}` },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <RtaMonsterDetailContent data={data} />
    </>
  );
}

