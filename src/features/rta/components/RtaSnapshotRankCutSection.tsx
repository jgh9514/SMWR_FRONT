'use client';

import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import type { RtaSnapshotRankCutRow } from '@/features/rta/types/rta';

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

export interface RtaSnapshotRankCutSectionProps {
  rows: RtaSnapshotRankCutRow[] | undefined;
}

/**
 * 배치가 rta_snapshot_rank_cut 에 적재한 최신 스냅샷 (시즌별).
 * 데이터 없으면 렌더하지 않음.
 */
export default function RtaSnapshotRankCutSection({ rows }: RtaSnapshotRankCutSectionProps) {
  const list = rows ?? [];
  if (list.length === 0) return null;

  const snap =
    str(list[0]?.snapshotAt ?? list[0]?.snapshot_at) ||
    (list[0] as { snapshot_at?: string })?.snapshot_at ||
    '';

  return (
    <Card
      elevation={0}
      sx={{
        mt: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <StorageIcon sx={{ color: 'secondary.main', fontSize: 22 }} />
        <Typography sx={{ fontWeight: 600, fontSize: '1rem' }}>랭크 컷 (DB 스냅샷)</Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, lineHeight: 1.5 }}>
        DB에 적재된 랭크 컷 스냅샷 중 최신 시점입니다. 스냅샷 시각:{' '}
        {snap ? new Date(snap).toLocaleString('ko-KR') : '—'}
      </Typography>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 360 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>티어</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>등급명</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                컷 점수
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((r, i) => {
              const tk = str(r.tierKey ?? r.tier_key);
              const gn = str(r.gradeName ?? r.grade_name);
              const cs = num(r.cutoffScore ?? r.cutoff_score);
              return (
                <TableRow key={`${tk}-${i}`}>
                  <TableCell>{tk || '—'}</TableCell>
                  <TableCell>{gn || '—'}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {cs.toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
