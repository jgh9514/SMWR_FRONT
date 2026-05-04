'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardActionArea,
  Chip,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useMonsterInfoContext } from '@/features/siege/context/MonsterInfoContext';
import { useRtaMonsterTopSummonersData, useRtaSeasonSelect, useRtaSeasons } from '@/features/rta/hooks/useRtaData';
import RtaSeasonTierSelectRow from '@/features/rta/components/RtaSeasonTierSelectRow';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import type { RtaMonsterTopSummonerRow } from '@/features/rta/types/rta';

function fmt1(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return `${Number(v).toFixed(1)}%`;
}
function fmtInt(v: number | null | undefined): string {
  if (v == null) return '—';
  return Number(v).toLocaleString('ko-KR');
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

function SummonerCard({ summoner, rank }: { summoner: RtaMonsterTopSummonerRow; rank: number }) {
  const avatarSrc = getSwexPlayerImageUrl(summoner.channel_uid ?? summoner.wizard_id);
  const winRate = summoner.win_rate_pct != null ? Number(summoner.win_rate_pct) : null;
  const isTop3 = rank <= 3;

  return (
    <Card
      variant="outlined"
      sx={(t) => ({
        borderRadius: 2,
        transition: 'box-shadow 0.15s, border-color 0.15s',
        borderColor: isTop3 ? (t.palette.mode === 'dark' ? 'primary.dark' : 'primary.light') : 'divider',
        '&:hover': { boxShadow: 3, borderColor: 'primary.main' },
      })}
    >
      <CardActionArea
        component={Link}
        href={`/rta/player/${encodeURIComponent(summoner.wizard_id)}`}
        sx={{ p: { xs: 1.5, sm: 2 }, height: '100%' }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          {/* 순위 배지 */}
          <Box sx={{ flexShrink: 0, width: 32, textAlign: 'center' }}>
            {rank <= 3 ? (
              <EmojiEventsIcon sx={{ fontSize: 28, color: MEDAL_COLORS[rank - 1] }} />
            ) : (
              <Chip
                label={rank}
                size="small"
                sx={{ width: 28, height: 22, fontSize: '0.72rem', fontWeight: 800, borderRadius: 1 }}
              />
            )}
          </Box>

          {/* 아바타 */}
          <Avatar
            src={avatarSrc}
            alt={summoner.wizard_name ?? summoner.wizard_id}
            variant="rounded"
            sx={{
              width: 56,
              height: 56,
              flexShrink: 0,
              border: '2px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          />

          {/* 정보 */}
          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              noWrap
              sx={{ lineHeight: 1.2 }}
            >
              {summoner.wizard_name ?? summoner.wizard_id}
            </Typography>

            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
              <Stack direction="row" alignItems="baseline" gap={0.5}>
                <Typography variant="caption" color="text.secondary">픽</Typography>
                <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmtInt(summoner.pick_cnt)}
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="baseline" gap={0.5}>
                <Typography variant="caption" color="text.secondary">승률</Typography>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color={winRate != null ? (winRate >= 50 ? 'success.main' : 'error.main') : 'text.primary'}
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmt1(summoner.win_rate_pct)}
                </Typography>
              </Stack>
            </Stack>
          </Stack>

          {isTop3 ? (
            <WorkspacePremiumIcon sx={{ fontSize: 18, color: 'warning.main', flexShrink: 0 }} />
          ) : null}
        </Stack>
      </CardActionArea>
    </Card>
  );
}

export default function MonsterDetailPlayersClient() {
  const { monsterInfo } = useMonsterInfoContext();

  const rtaMonsterNumericId = useMemo(() => {
    const n = Number.parseInt(String(monsterInfo.monster_id), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [monsterInfo.monster_id]);

  const { data: seasonsData } = useRtaSeasons();
  const { seasonSelectValue, setSeason, seasonOptions, seasonIdForApi } = useRtaSeasonSelect(seasonsData);

  const { data: topSummonersResp, isFetching } = useRtaMonsterTopSummonersData(rtaMonsterNumericId, {
    seasonId: seasonIdForApi ?? null,
    enabled: rtaMonsterNumericId != null && rtaMonsterNumericId > 0,
  });

  const topSummoners = topSummonersResp?.data ?? [];

  return (
    <Box>
      <RtaSeasonTierSelectRow
        seasonSelectValue={seasonSelectValue}
        setSeason={setSeason}
        seasonOptions={seasonOptions}
        tierSelection="CH_ALL"
        setTierSelection={() => {}}
        gradeRules={[]}
        tierRulesLoading={false}
        seasonLabelId="monster-players-season"
        hideTierSelect
      />

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={800}>
          장인 랭킹
        </Typography>
        <Typography variant="caption" color="text.secondary">
          픽 5회 이상 · 픽 횟수 순
        </Typography>
      </Stack>

      {isFetching && !topSummonersResp ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 1.5 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={88} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      ) : topSummoners.length > 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 1.5 }}>
          {topSummoners.map((s, i) => (
            <SummonerCard key={s.wizard_id} summoner={s} rank={i + 1} />
          ))}
        </Box>
      ) : topSummonersResp ? (
        <Alert severity="info">픽 5회 이상인 소환사 데이터가 없습니다.</Alert>
      ) : (
        <LinearProgress sx={{ my: 2 }} />
      )}
    </Box>
  );
}
