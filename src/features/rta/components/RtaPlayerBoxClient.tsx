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
import { useRtaPlayerOwnedBox } from '@/features/rta/hooks/useRtaData';
import type { RtaPlayerOwnedBoxRow } from '@/features/rta/types/rta';
import { parseMonsterElemental } from '@/shared/utils/monsterElemental';

function n(v: unknown): number {
  if (v == null || v === '') return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function rowFromApi(r: RtaPlayerOwnedBoxRow & Record<string, unknown>): RtaPlayerOwnedBoxRow {
  return {
    unit_master_id: n(r.unit_master_id),
    copy_count: n(r.copy_count),
    monster_name: r.monster_name != null ? String(r.monster_name) : null,
    monster_image: r.monster_image != null ? String(r.monster_image) : null,
    monster_elemental: r.monster_elemental != null ? String(r.monster_elemental) : null,
  };
}

export default function RtaPlayerBoxClient() {
  const params = useParams<{ wizardId: string }>();
  const wizardId = String(params?.wizardId ?? '').trim();

  const { data, isLoading, error, isFetching } = useRtaPlayerOwnedBox(wizardId, {
    enabled: Boolean(wizardId),
  });

  const rows = (data?.rows ?? []).map((r) => rowFromApi(r as RtaPlayerOwnedBoxRow & Record<string, unknown>));

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
        SWEX 최신 임포트 기준 보유 복제 스냅입니다. 배치(
        <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          rta_agg_summoner_owned_box_snap
        </Box>
        )·원천(
        <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          user_monster_owned_agg
        </Box>
        ).
      </Typography>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          보유 행이 없습니다. SWEX 연동·보유 집계 배치 후 랭킹 Job(보유 박스 스냅)을 실행해 주세요.
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {isFetching ? (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', minHeight: 20 }}>
              <CircularProgress size={16} />
            </Box>
          ) : null}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxWidth: '100%' }}>
          <Table size="small" sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow>
                <TableCell>몬스터</TableCell>
                <TableCell align="right">보유 수</TableCell>
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
                      {row.copy_count}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        </Stack>
      )}
    </Stack>
  );
}
