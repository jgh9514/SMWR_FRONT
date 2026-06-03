'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Alert, Box, Button } from '@mui/material';
import Link from 'next/link';
import { alpha, type Theme } from '@mui/material/styles';
import { DEFAULT_PAGE_OFFSET } from '@/shared/constants';
import BattleHistoryDetailContent from '@/features/battle-history/components/BattleHistoryDetailContent';
import { useRecordDetail } from '@/features/battle-history/hooks/useRecordDetail';
import { useSeasonList } from '@/features/battle-history/hooks/useSeasonList';
import {
  BATTLE_RECORD_DETAIL_PAGE_SIZE,
  getLatestSeasonNo,
  type BattleItem,
} from '@/features/battle-history/types/battle-history';
import GuildRequiredGate from '@/features/guild/components/GuildRequiredGate';

function pageBg(t: Theme) {
  return t.palette.mode === 'dark'
    ? `linear-gradient(180deg, ${alpha('#0f172a', 1)} 0%, ${alpha('#1e293b', 1)} 40%, ${alpha('#0f172a', 1)} 100%)`
    : `linear-gradient(180deg, ${alpha('#f0fdfa', 1)} 0%, ${alpha('#ecfeff', 0.9)} 35%, ${alpha('#f8fafc', 1)} 100%)`;
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

  const [page, setPage] = useState(DEFAULT_PAGE_OFFSET);
  const [allBattles, setAllBattles] = useState<BattleItem[]>([]);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setPage(DEFAULT_PAGE_OFFSET);
    setAllBattles([]);
    setHasMore(false);
  }, [wizardId, seasonNo]);

  const recordParams = useMemo(() => {
    if (!wizardId) return null;
    if (!seasonNo && seasonListFetched && seasonList.length > 0) return null;
    return {
      wizard_id: wizardId,
      paging: BATTLE_RECORD_DETAIL_PAGE_SIZE,
      offset: page,
      ...(seasonNo !== '' && { season_no: seasonNo }),
    };
  }, [wizardId, seasonNo, seasonListFetched, seasonList.length, page]);

  const {
    data: battles = [],
    isLoading: isBattlesLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useRecordDetail(recordParams);

  useEffect(() => {
    if (!recordParams || isBattlesLoading) return;
    const batch = Array.isArray(battles) ? battles : [];
    if (page === DEFAULT_PAGE_OFFSET) {
      setAllBattles(batch);
    } else {
      setAllBattles((prev) => {
        const seen = new Set(prev.map((b) => `${b.match_id}-${b.log_id ?? ''}`));
        const merged = [...prev];
        for (const item of batch) {
          const key = `${item.match_id}-${item.log_id ?? ''}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(item);
          }
        }
        return merged;
      });
    }
    setHasMore(batch.length >= BATTLE_RECORD_DETAIL_PAGE_SIZE);
  }, [battles, page, recordParams, isBattlesLoading]);

  const backPath = seasonNo ? `/battle-history?season_no=${seasonNo}` : '/battle-history';
  const isLoadingMore = isFetching && page > DEFAULT_PAGE_OFFSET;
  const isInitialLoading =
    isSeasonLoading ||
    (isBattlesLoading && page === DEFAULT_PAGE_OFFSET) ||
    (!seasonNo && seasonList.length > 0 && !seasonListFetched);

  const wizardName = allBattles[0]?.wizard_name ?? '';

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

  const forbiddenMessage =
    isGuildForbiddenError &&
    error &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
      ? (error as { response: { data: { message: string } } }).response.data.message
      : '길드 가입이 필요합니다.';

  if (!wizardId) {
    return (
      <Box sx={(theme) => ({ minHeight: '100%', background: pageBg(theme), p: 3 })}>
        <Box sx={{ maxWidth: 560, mx: 'auto' }}>
          <Alert severity="error">잘못된 전적 상세 경로입니다.</Alert>
          <Button component={Link} href="/battle-history" sx={{ mt: 2 }}>
            전적 목록으로
          </Button>
        </Box>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={(theme) => ({ minHeight: '100%', background: pageBg(theme), p: 3 })}>
        <Box sx={{ maxWidth: 560, mx: 'auto' }}>
          <Alert severity={isAuthError ? 'info' : isGuildForbiddenError ? 'warning' : 'error'} sx={{ mb: 2 }}>
          {isAuthError
            ? '로그인이 필요합니다.'
            : isGuildForbiddenError
              ? forbiddenMessage
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
      </Box>
    );
  }

  return (
    <BattleHistoryDetailContent
      battles={allBattles}
      wizardName={wizardName}
      seasonNo={seasonNo || undefined}
      backPath={backPath}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      isInitialLoading={isInitialLoading}
      onLoadMore={() => setPage((prev) => prev + 1)}
    />
  );
}

export default function BattleHistoryDetailPageClient() {
  return (
    <GuildRequiredGate title="전적 상세는 길드 가입이 필요합니다">
      <BattleHistoryDetailInner />
    </GuildRequiredGate>
  );
}
