'use client';

import { useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Skeleton } from '@mui/material';
import Link from 'next/link';
import { DEFAULT_PAGE_OFFSET, DEFAULT_PAGE_SIZE } from '@/shared/constants';
import BattleHistoryDetailContent from '@/features/battle-history/components/BattleHistoryDetailContent';
import { useRecordDetail } from '@/features/battle-history/hooks/useRecordDetail';
import { useSeasonList } from '@/features/battle-history/hooks/useSeasonList';
import { getLatestSeasonNo } from '@/features/battle-history/types/battle-history';
import { groupBattlesBySiegeId } from '@/features/battle-history/lib/groupBattles';
import GuildRequiredGate from '@/features/guild/components/GuildRequiredGate';

function DetailSkeleton() {
  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 4, maxWidth: 1200, mx: 'auto' }}>
      <Skeleton variant="rounded" height={48} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={320} />
    </Box>
  );
}

function BattleHistoryDetailInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const wizardId = typeof params.detail === 'string' ? params.detail.trim() : '';
  const urlSeasonNo = searchParams.get('season_no') ?? '';
  const { data: rawSeasonList, isLoading: isSeasonLoading } = useSeasonList();
  const seasonList = Array.isArray(rawSeasonList) ? rawSeasonList : [];
  const latestSeasonNo = getLatestSeasonNo(seasonList);
  const seasonNo = urlSeasonNo || latestSeasonNo;
  const seasonListFetched = rawSeasonList !== undefined;

  const recordParams = useMemo(() => {
    if (!wizardId) return null;
    if (!seasonNo && seasonListFetched && seasonList.length > 0) return null;
    return {
      wizard_id: wizardId,
      paging: DEFAULT_PAGE_SIZE,
      offset: DEFAULT_PAGE_OFFSET,
      ...(seasonNo !== '' && { season_no: seasonNo }),
    };
  }, [wizardId, seasonNo, seasonListFetched, seasonList.length]);

  const {
    data: battles = [],
    isLoading: isBattlesLoading,
    isError,
    error,
    refetch,
  } = useRecordDetail(recordParams);

  const groupedBattles = useMemo(() => groupBattlesBySiegeId(battles), [battles]);
  const backPath = seasonNo ? `/battle-history?season_no=${seasonNo}` : '/battle-history';

  const isAuthError =
    isError &&
    error &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401;
  const isGuildForbiddenError =
    isError &&
    error &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 403;

  if (!wizardId) {
    return (
      <Box sx={{ p: 3, maxWidth: 560, mx: 'auto' }}>
        <Alert severity="error">잘못된 전적 상세 경로입니다.</Alert>
        <Button component={Link} href="/battle-history" sx={{ mt: 2 }}>
          전적 목록으로
        </Button>
      </Box>
    );
  }

  if (isSeasonLoading || isBattlesLoading || (!seasonNo && seasonList.length > 0 && !seasonListFetched)) {
    return <DetailSkeleton />;
  }

  if (isError) {
    return (
      <Box sx={{ p: 3, maxWidth: 560, mx: 'auto' }}>
        <Alert severity={isAuthError ? 'info' : isGuildForbiddenError ? 'warning' : 'error'} sx={{ mb: 2 }}>
          {isAuthError
            ? '로그인이 필요합니다.'
            : isGuildForbiddenError
              ? '길드 가입이 필요합니다.'
              : '전적 데이터를 불러올 수 없습니다.'}
        </Alert>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {isAuthError ? (
            <Button component={Link} href="/login" variant="contained">
              로그인
            </Button>
          ) : (
            <Button variant="outlined" onClick={() => refetch()}>
              다시 시도
            </Button>
          )}
          <Button component={Link} href={backPath}>
            목록으로
          </Button>
        </Box>
      </Box>
    );
  }

  return <BattleHistoryDetailContent groupedBattles={groupedBattles} backPath={backPath} />;
}

export default function BattleHistoryDetailPageClient() {
  return (
    <GuildRequiredGate title="전적 상세는 길드 가입이 필요합니다">
      <BattleHistoryDetailInner />
    </GuildRequiredGate>
  );
}
