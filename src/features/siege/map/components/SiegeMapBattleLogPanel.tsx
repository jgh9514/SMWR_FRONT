'use client';

import { Fragment, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useSiegeBattleReplay, useSiegeMatchBattleLogs } from '@/features/siege/map/hooks/useSiegeCollector';

type SiegeMapBattleLogPanelProps = {
  matchId: string;
  baseNumber?: number | null;
};

function winLoseLabel(winLose: string | null | undefined): { label: string; color: 'success' | 'error' | 'default' } {
  if (winLose === '1') {
    return { label: '승', color: 'success' };
  }
  if (winLose === '2') {
    return { label: '패', color: 'error' };
  }
  return { label: winLose ?? '—', color: 'default' };
}

function ReplayDetail({ rid }: { rid: number }) {
  const replayQuery = useSiegeBattleReplay(rid);
  const replay = replayQuery.data;

  if (replayQuery.isLoading) {
    return <CircularProgress size={20} sx={{ my: 1 }} />;
  }
  if (!replay?.payload) {
    return (
      <Typography variant="caption" color="text.secondary">
        리플레이 상세 없음
      </Typography>
    );
  }
  const info = replay.payload.replay_info as Record<string, unknown> | undefined;
  const battleInfo = info?.battle_info as Record<string, unknown> | undefined;
  const unitList = battleInfo?.unit_list as unknown[] | undefined;

  return (
    <Box sx={{ py: 1, px: 1, bgcolor: 'action.hover', borderRadius: 1, mt: 0.5 }}>
      {replay.battleDesc && (
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          메모: {replay.battleDesc}
        </Typography>
      )}
      {battleInfo?.wizard_name != null && (
        <Typography variant="caption" color="text.secondary">
          공격: {String(battleInfo.wizard_name)}
        </Typography>
      )}
      {Array.isArray(unitList) && unitList.length > 0 && (
        <Typography variant="caption" display="block" color="text.secondary">
          유닛 {unitList.length}체
        </Typography>
      )}
    </Box>
  );
}

export default function SiegeMapBattleLogPanel({ matchId, baseNumber }: SiegeMapBattleLogPanelProps) {
  const [open, setOpen] = useState(true);
  const [expandedRid, setExpandedRid] = useState<number | null>(null);

  const logsQuery = useSiegeMatchBattleLogs(
    matchId,
    { baseNumber: baseNumber ?? undefined, paging: 50 },
    Boolean(matchId),
  );
  const data = logsQuery.data;

  const title = useMemo(() => {
    if (baseNumber != null && baseNumber > 0) {
      return `거점 ${baseNumber} 전투 로그`;
    }
    return '매치 전투 로그';
  }, [baseNumber]);

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Stack
        direction="row"
        alignItems="center"
        sx={{ px: 1.5, py: 1, cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          {title}
          {data != null && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {data.totalCount}건
            </Typography>
          )}
        </Typography>
        <IconButton size="small" aria-label={open ? '접기' : '펼치기'} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Stack>
      <Collapse in={open}>
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          {logsQuery.isLoading && (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={28} />
            </Box>
          )}
          {logsQuery.isError && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              전투 로그를 불러오지 못했습니다. 수집기 DDL·적재를 확인하세요.
            </Alert>
          )}
          {data && data.list.length === 0 && !logsQuery.isLoading && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              전투 로그가 없습니다.
            </Alert>
          )}
          {data && data.list.length > 0 && (
            <Table size="small" sx={{ '& td, & th': { py: 0.75, fontSize: '0.8rem' } }}>
              <TableHead>
                <TableRow>
                  <TableCell>시각</TableCell>
                  <TableCell>거점</TableCell>
                  <TableCell>공격</TableCell>
                  <TableCell>방어</TableCell>
                  <TableCell>결과</TableCell>
                  <TableCell>메모</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.list.map((row) => {
                  const wl = winLoseLabel(row.winLose);
                  const rid = row.replayRidRef;
                  const hasReplay = rid != null && rid > 0;
                  const rowKey = `${row.logTimestamp}-${row.wizardId}-${row.oppWizardId}`;
                  return (
                    <Fragment key={rowKey}>
                      <TableRow hover>
                        <TableCell>{row.logTimestamp}</TableCell>
                        <TableCell>{row.baseNumber ?? '—'}</TableCell>
                        <TableCell>{row.wizardName ?? row.wizardId ?? '—'}</TableCell>
                        <TableCell>{row.oppWizardName ?? row.oppWizardId ?? '—'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={wl.label} color={wl.color} variant="outlined" />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 160 }} title={row.battleDesc ?? undefined}>
                          <Typography noWrap variant="inherit">
                            {row.battleDesc?.trim() || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {hasReplay && (
                            <Chip
                              size="small"
                              label={expandedRid === rid ? '닫기' : '리플레이'}
                              clickable
                              onClick={() => setExpandedRid((cur) => (cur === rid ? null : rid!))}
                            />
                          )}
                          {row.fromCollector && (
                            <Chip size="small" label="수집" sx={{ ml: 0.5 }} variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                      {hasReplay && expandedRid === rid && (
                        <TableRow>
                          <TableCell colSpan={7} sx={{ border: 0, pt: 0 }}>
                            <ReplayDetail rid={rid} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
