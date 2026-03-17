import type { Metadata } from 'next';
import BattleHistoryDetailContent from '@/features/battle-history/components/BattleHistoryDetailContent';
import { groupBattlesBySiegeId } from '@/features/battle-history/lib/groupBattles';
import { DEFAULT_PAGE_OFFSET, DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { getBattleHistoryDetailData } from '@/shared/lib/api/server';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const revalidate = 600;

interface BattleHistoryDetailPageProps {
  params: Promise<{ detail: string }>;
}

function buildBattleHistoryDescription(
  wizardName: string,
  battleCount: number,
  winCount: number,
): string {
  if (battleCount === 0) {
    return `${wizardName}의 점령전 전투 로그와 승패 기록을 묶어서 확인할 수 있습니다.`;
  }

  const lossCount = Math.max(battleCount - winCount, 0);
  return `${wizardName}의 점령전 전투 로그 ${battleCount}건, 승리 ${winCount}건, 패배 ${lossCount}건을 기준으로 상대 길드와 사용 덱, 승패 흐름을 상세하게 확인할 수 있습니다.`;
}

export async function generateMetadata({
  params,
}: BattleHistoryDetailPageProps): Promise<Metadata> {
  const { detail } = await params;
  const battles = await getBattleHistoryDetailData({
    paging: DEFAULT_PAGE_SIZE,
    offset: DEFAULT_PAGE_OFFSET,
    wizard_id: detail,
  }).catch(() => []);
  const firstBattle = battles[0];
  const wizardName = firstBattle?.wizard_name?.trim() || detail;
  const battleCount = battles.length;
  const winCount = battles.filter((battle) => battle.win_lose === 'WIN').length;
  const description = buildBattleHistoryDescription(wizardName, battleCount, winCount);

  return buildPublicMetadata({
    title: `${wizardName} 전적 상세`,
    description,
    path: `/battle-history/detail/${detail}`,
    keywords: [wizardName, '전적 상세', '점령전 로그', '승패 기록'],
    noIndex: battleCount === 0,
  });
}

export default async function BattleHistoryDetailPage({
  params,
}: BattleHistoryDetailPageProps) {
  const { detail } = await params;
  const battles = await getBattleHistoryDetailData({
    paging: DEFAULT_PAGE_SIZE,
    offset: DEFAULT_PAGE_OFFSET,
    wizard_id: detail,
  });
  const groupedBattles = groupBattlesBySiegeId(battles);
  const firstBattle = battles[0];
  const wizardName = firstBattle?.wizard_name?.trim() || detail;
  const winCount = battles.filter((battle) => battle.win_lose === 'WIN').length;
  const pageUrl = getAbsoluteUrl(`/battle-history/detail/${detail}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${wizardName} 전적 상세`,
    description: buildBattleHistoryDescription(wizardName, battles.length, winCount),
    url: pageUrl,
    inLanguage: 'ko-KR',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: battles.length,
      itemListElement: groupedBattles.slice(0, 10).map((group, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${group.dateLabel} ${group.guildsLabel}`,
      })),
    },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '전적 조회', path: '/battle-history' },
    { name: `${wizardName} 전적 상세`, path: `/battle-history/detail/${detail}` },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <BattleHistoryDetailContent groupedBattles={groupedBattles} />
    </>
  );
}
