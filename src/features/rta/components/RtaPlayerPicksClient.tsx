'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Box,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AttributeElementIcon from '@/shared/ui/attribute-element-icon/AttributeElementIcon';
import { useRtaPlayerMonsterUsage } from '@/features/rta/hooks/useRtaData';
import { useRtaPlayerSeason } from '@/features/rta/context/RtaPlayerSeasonContext';
import type { RtaPlayerMonsterUsageRow } from '@/features/rta/types/rta';
import { parseMonsterElemental } from '@/shared/utils/monsterElemental';

function n(v: unknown): number {
  if (v == null || v === '') return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pct(v: unknown): string {
  if (v == null || v === '') return '—';
  const x = Number(v);
  if (!Number.isFinite(x)) return '—';
  return `${x.toFixed(1)}%`;
}

function rowFromApi(r: RtaPlayerMonsterUsageRow & Record<string, unknown>): RtaPlayerMonsterUsageRow {
  return {
    unit_master_id: n(r.unit_master_id),
    pick_cnt: n(r.pick_cnt),
    ban_cnt: n(r.ban_cnt),
    win_cnt: n(r.win_cnt),
    lose_cnt: n(r.lose_cnt),
    first_pick_cnt: n(r.first_pick_cnt),
    owned_copy_count: r.owned_copy_count == null ? null : n(r.owned_copy_count),
    monster_name: r.monster_name != null ? String(r.monster_name) : null,
    monster_image: r.monster_image != null ? String(r.monster_image) : null,
    monster_elemental: r.monster_elemental != null ? String(r.monster_elemental) : null,
    pick_rate_pct: r.pick_rate_pct == null ? null : n(r.pick_rate_pct),
    ban_rate_pct: r.ban_rate_pct == null ? null : n(r.ban_rate_pct),
    win_rate_pct: r.win_rate_pct == null ? null : n(r.win_rate_pct),
    first_pick_rate_pct: r.first_pick_rate_pct == null ? null : n(r.first_pick_rate_pct),
  };
}

export default function RtaPlayerPicksClient() {
  const params = useParams<{ wizardId: string }>();
  const wizardId = String(params?.wizardId ?? '').trim();
  const { seasonCode, seasonId } = useRtaPlayerSeason();

  const { data, isLoading, error, isFetching } = useRtaPlayerMonsterUsage(wizardId, seasonCode, {
    seasonId,
    enabled: Boolean(wizardId),
  });

  const rows = (data?.rows ?? []).map((r) => rowFromApi(r as RtaPlayerMonsterUsageRow & Record<string, unknown>));
  const fight = data?.fight;

  if (!wizardId) {
    return (
      <Typography variant="body2" color="text.secondary">
        위자드 ID가 없습니다.
      </Typography>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={36} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error">
        {error.message || '불러오기에 실패했습니다.'}
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        수집된 RTA 리플레이 기준 시즌 스냅입니다. 배치(
        <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          rta_agg_summoner_monster_snap
        </Box>
        )로 갱신됩니다.
      </Typography>

      {fight ? (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary">
              경기 <strong>{n(fight.match_cnt as unknown)}</strong> · 비밴 픽 {n(fight.non_ban_pick_cnt as unknown)} · 밴{' '}
              {n(fight.ban_event_cnt as unknown)}
            </Typography>
            {isFetching ? <CircularProgress size={14} /> : null}
          </Stack>
        </Paper>
      ) : (
        <Typography variant="body2" color="warning.main">
          이 시즌·소환사에 대한 전투 스냅이 없습니다. 배치(랭킹/검색 스냅 Job)로{' '}
          <code style={{ fontSize: '0.85em' }}>rta_agg_summoner_season_fight_snap</code> 적재 후 다시 확인해 주세요.
        </Typography>
      )}

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          몬스터 스냅 행이 없습니다. 해당 시즌에 티어가 잡힌 경기 픽이 없거나, 아직 스냅 배치가 돌지 않았을 수 있습니다.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxWidth: '100%' }}>
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>몬스터</TableCell>
                <TableCell align="right">픽</TableCell>
                <TableCell align="right">픽률</TableCell>
                <TableCell align="right">밴</TableCell>
                <TableCell align="right">밴률</TableCell>
                <TableCell align="right">승률</TableCell>
                <TableCell align="right">선픽률</TableCell>
                <TableCell align="right">보유</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const el = parseMonsterElemental(row.monster_elemental);
                const name = row.monster_name?.trim() || `ID ${row.unit_master_id}`;
                const href = `/monster-detail/${encodeURIComponent(String(row.unit_master_id))}`;
                return (
                  <TableRow key={row.unit_master_id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                        {row.monster_image ? (
                          <Box
                            component="img"
                            src={row.monster_image}
                            alt=""
                            sx={{ width: 32, height: 32, borderRadius: 0.5, objectFit: 'cover', flexShrink: 0 }}
                          />
                        ) : null}
                        {el ? <AttributeElementIcon attribute={el} size={16} /> : null}
                        <Link
                          href={href}
                          prefetch={false}
                          style={{ fontWeight: 600, textDecoration: 'none', color: 'inherit' }}
                        >
                          {name}
                        </Link>
                        <Typography component="span" variant="caption" color="text.secondary" noWrap>
                          #{row.unit_master_id}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.pick_cnt}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {pct(row.pick_rate_pct)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.ban_cnt}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {pct(row.ban_rate_pct)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {pct(row.win_rate_pct)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {pct(row.first_pick_rate_pct)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.owned_copy_count == null ? '—' : row.owned_copy_count}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
