'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/shared/ui';
import { confirm, showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import { handleApiError } from '@/shared/lib/error-handler';
import {
  useAdminResetQueryStats,
  useAdminRunningQueries,
  useAdminSlowQueries,
  type RunningQueryItem,
  type SlowQueryItem,
} from '@/features/admin/hooks/useQueryPerf';

type TabKey = 'slow' | 'running';
const SLOW_ORDER_BY_OPTIONS = ['total_ms', 'mean_ms', 'max_ms', 'calls', 'rows'] as const;
const ORDER_DIR_OPTIONS = ['desc', 'asc'] as const;

function formatMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return '-';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(0)}ms`;
}

function isSlowOrderBy(value: string): value is (typeof SLOW_ORDER_BY_OPTIONS)[number] {
  return SLOW_ORDER_BY_OPTIONS.includes(value as (typeof SLOW_ORDER_BY_OPTIONS)[number]);
}

function isOrderDir(value: string): value is (typeof ORDER_DIR_OPTIONS)[number] {
  return ORDER_DIR_OPTIONS.includes(value as (typeof ORDER_DIR_OPTIONS)[number]);
}

export default function AdminQueryPerfPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const initialQueryLike = searchParams.get('query_like') || '';
  const initialMinMeanMs = searchParams.get('min_mean_ms');
  const initialMinCalls = searchParams.get('min_calls');
  const initialOrderBy = searchParams.get('order_by');
  const initialOrderDir = searchParams.get('order_dir');
  const initialMinDurationMs = searchParams.get('min_duration_ms');

  const [tab, setTab] = useState<TabKey>(initialTab === 'running' ? 'running' : 'slow');
  const [queryDialogOpen, setQueryDialogOpen] = useState(false);
  const [queryDialogText, setQueryDialogText] = useState('');

  // slow queries filters
  const [slowLimit, setSlowLimit] = useState(50);
  const [orderBy, setOrderBy] = useState<'total_ms' | 'mean_ms' | 'max_ms' | 'calls' | 'rows'>(
    isSlowOrderBy(initialOrderBy || '') ? initialOrderBy : 'total_ms',
  );
  const [orderDir, setOrderDir] = useState<'desc' | 'asc'>(
    isOrderDir(initialOrderDir || '') ? initialOrderDir : 'desc',
  );
  const [queryLike, setQueryLike] = useState(initialQueryLike);
  const [minMeanMs, setMinMeanMs] = useState<number | ''>(initialMinMeanMs ? Number(initialMinMeanMs) : '');
  const [minCalls, setMinCalls] = useState<number | ''>(initialMinCalls ? Number(initialMinCalls) : '');

  // running queries filters
  const [runningLimit, setRunningLimit] = useState(50);
  const [minDurationMs, setMinDurationMs] = useState<number | ''>(initialMinDurationMs ? Number(initialMinDurationMs) : 500);
  const incident = searchParams.get('incident');
  const incidentMessage = useMemo(() => {
    if (incident === 'db_diagnostics_unavailable') {
      return '운영 상태 카드에서 DB 진단 실패 이슈로 진입했습니다. 슬로우 쿼리와 메트릭 수집 상태를 우선 확인하세요.';
    }
    return null;
  }, [incident]);

  const slowParams = useMemo(() => {
    return {
      limit: slowLimit,
      order_by: orderBy,
      order_dir: orderDir,
      query_like: queryLike.trim() || undefined,
      min_mean_ms: minMeanMs === '' ? undefined : minMeanMs,
      min_calls: minCalls === '' ? undefined : minCalls,
    };
  }, [slowLimit, orderBy, orderDir, queryLike, minMeanMs, minCalls]);

  const runningParams = useMemo(() => {
    return {
      limit: runningLimit,
      min_duration_ms: minDurationMs === '' ? undefined : minDurationMs,
    };
  }, [runningLimit, minDurationMs]);

  const slowQuery = useAdminSlowQueries(slowParams, false);
  const runningQuery = useAdminRunningQueries(runningParams, false);

  const resetMutation = useAdminResetQueryStats({
    onSuccess: () => {
      showToast.success('쿼리 통계를 리셋했습니다.');
      if (tab === 'slow') slowQuery.refetch();
    },
    onError: (error: unknown) => {
      logger.error('쿼리 통계 리셋 실패', error, { context: 'AdminQueryPerfPage' });
      showToast.error('리셋에 실패했습니다.');
    },
  });

  useEffect(() => {
    // 최초 진입 시 slow 탭 자동 조회
    slowQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (incident === 'db_diagnostics_unavailable') {
      setTab('slow');
      if (initialMinMeanMs) {
        setMinMeanMs(Number(initialMinMeanMs));
      }
      if (isSlowOrderBy(initialOrderBy || '')) {
        setOrderBy(initialOrderBy);
      }
      if (isOrderDir(initialOrderDir || '')) {
        setOrderDir(initialOrderDir);
      }
      void slowQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident]);

  const openQueryDialog = (sql: string) => {
    setQueryDialogText(sql || '');
    setQueryDialogOpen(true);
  };

  const copyQuery = async (sql: string) => {
    try {
      await navigator.clipboard.writeText(sql);
      showToast.success('클립보드에 복사했습니다.');
    } catch {
      showToast.error('복사에 실패했습니다.');
    }
  };

  const renderSlowTable = (rows: SlowQueryItem[]) => {
    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="right">평균</TableCell>
              <TableCell align="right">최대</TableCell>
              <TableCell align="right">총합</TableCell>
              <TableCell align="right">호출</TableCell>
              <TableCell align="right">Rows</TableCell>
              <TableCell align="right">I/O(Read)</TableCell>
              <TableCell align="right">I/O(Write)</TableCell>
              <TableCell>Query</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    데이터가 없습니다. (pg_stat_statements가 꺼져있거나, 아직 쿼리 누적이 없을 수 있습니다)
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.query_id} hover>
                  <TableCell align="right">{formatMs(r.mean_ms)}</TableCell>
                  <TableCell align="right">{formatMs(r.max_ms)}</TableCell>
                  <TableCell align="right">{formatMs(r.total_ms)}</TableCell>
                  <TableCell align="right">{(r.calls ?? 0).toLocaleString('ko-KR')}</TableCell>
                  <TableCell align="right">{(r.rows ?? 0).toLocaleString('ko-KR')}</TableCell>
                  <TableCell align="right">{formatMs(r.blk_read_ms ?? 0)}</TableCell>
                  <TableCell align="right">{formatMs(r.blk_write_ms ?? 0)}</TableCell>
                  <TableCell sx={{ maxWidth: 520 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Consolas, ui-monospace, SFMono-Regular, Menlo, Monaco, "Liberation Mono", monospace',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {r.query}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Button size="small" onClick={() => openQueryDialog(r.query)} variant="outlined">
                      보기
                    </Button>
                    <Button
                      size="small"
                      sx={{ ml: 1 }}
                      onClick={() => copyQuery(r.query)}
                      variant="text"
                      startIcon={<ContentCopyIcon fontSize="small" />}
                    >
                      복사
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderRunningTable = (rows: RunningQueryItem[]) => {
    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="right">PID</TableCell>
              <TableCell>사용자</TableCell>
              <TableCell>상태</TableCell>
              <TableCell align="right">지속시간</TableCell>
              <TableCell>대기</TableCell>
              <TableCell>Query</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    실행중인 쿼리가 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={String(r.pid)} hover>
                  <TableCell align="right">{r.pid}</TableCell>
                  <TableCell>{r.usename}</TableCell>
                  <TableCell>{r.state || '-'}</TableCell>
                  <TableCell align="right">{formatMs(r.duration_ms)}</TableCell>
                  <TableCell>
                    {r.wait_event_type ? `${r.wait_event_type}${r.wait_event ? `/${r.wait_event}` : ''}` : '-'}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 520 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Consolas, ui-monospace, SFMono-Regular, Menlo, Monaco, "Liberation Mono", monospace',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {r.query}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Button size="small" onClick={() => openQueryDialog(r.query)} variant="outlined">
                      보기
                    </Button>
                    <Button
                      size="small"
                      sx={{ ml: 1 }}
                      onClick={() => copyQuery(r.query)}
                      variant="text"
                      startIcon={<ContentCopyIcon fontSize="small" />}
                    >
                      복사
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const slowRows = slowQuery.data?.list ?? [];
  const runningRows = runningQuery.data?.list ?? [];
  const slowErrorText = slowQuery.isError ? handleApiError(slowQuery.error).message : null;
  const runningErrorText = runningQuery.isError ? handleApiError(runningQuery.error).message : null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <PageHeader title="쿼리 성능" />
          {incident && <Chip label={`incident: ${incident}`} color="warning" variant="outlined" />}
        </Box>

        {incidentMessage && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {incidentMessage}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="조회"
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    if (tab === 'slow') slowQuery.refetch();
                    else runningQuery.refetch();
                  }}
                >
                  새로고침
                </Button>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<RestartAltIcon />}
                  disabled={resetMutation.isPending}
                  onClick={async () => {
                    const ok = await confirm('pg_stat_statements 누적 통계를 리셋할까요?\n(리셋 후 비교 측정에 유용합니다)');
                    if (!ok) return;
                    resetMutation.mutate({});
                  }}
                >
                  리셋
                </Button>
              </Box>
            }
          />
          <CardContent>
            <Tabs
              value={tab}
              onChange={(_e, v) => {
                const next = v as TabKey;
                setTab(next);
                // 탭 전환 시 즉시 조회
                if (next === 'slow') slowQuery.refetch();
                else runningQuery.refetch();
              }}
              sx={{ mb: 2 }}
            >
              <Tab value="slow" label="슬로우 쿼리(누적)" />
              <Tab value="running" label="실행중 쿼리" />
            </Tabs>

            {tab === 'slow' ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                <TextField
                  label="Query 포함 문자열"
                  value={queryLike}
                  onChange={(e) => setQueryLike(e.target.value)}
                  size="small"
                  placeholder="예: selectGuildSiegeHistory"
                />
                <TextField
                  label="평균 ms >= "
                  value={minMeanMs}
                  onChange={(e) => setMinMeanMs(e.target.value === '' ? '' : Number(e.target.value))}
                  size="small"
                  type="number"
                  inputProps={{ min: 0 }}
                />
                <TextField
                  label="호출 수 >= "
                  value={minCalls}
                  onChange={(e) => setMinCalls(e.target.value === '' ? '' : Number(e.target.value))}
                  size="small"
                  type="number"
                  inputProps={{ min: 0 }}
                />
                <TextField
                  label="Limit"
                  value={slowLimit}
                  onChange={(e) => setSlowLimit(Number(e.target.value) || 50)}
                  size="small"
                  type="number"
                  inputProps={{ min: 1, max: 200 }}
                />

                <FormControl size="small">
                  <InputLabel>정렬 기준</InputLabel>
                  <Select
                    label="정렬 기준"
                    value={orderBy}
                    onChange={(e) => {
                      const value = String(e.target.value);
                      if (isSlowOrderBy(value)) {
                        setOrderBy(value);
                      }
                    }}
                  >
                    <MenuItem value="total_ms">총합</MenuItem>
                    <MenuItem value="mean_ms">평균</MenuItem>
                    <MenuItem value="max_ms">최대</MenuItem>
                    <MenuItem value="calls">호출</MenuItem>
                    <MenuItem value="rows">Rows</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <InputLabel>정렬 방향</InputLabel>
                  <Select
                    label="정렬 방향"
                    value={orderDir}
                    onChange={(e) => {
                      const value = String(e.target.value);
                      if (isOrderDir(value)) {
                        setOrderDir(value);
                      }
                    }}
                  >
                    <MenuItem value="desc">내림차순</MenuItem>
                    <MenuItem value="asc">오름차순</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Button variant="contained" onClick={() => slowQuery.refetch()}>
                    조회
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setQueryLike('');
                      setMinMeanMs('');
                      setMinCalls('');
                      setSlowLimit(50);
                      setOrderBy('total_ms');
                      setOrderDir('desc');
                    }}
                  >
                    초기화
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                <TextField
                  label="지속시간 ms >= "
                  value={minDurationMs}
                  onChange={(e) => setMinDurationMs(e.target.value === '' ? '' : Number(e.target.value))}
                  size="small"
                  type="number"
                  inputProps={{ min: 0 }}
                />
                <TextField
                  label="Limit"
                  value={runningLimit}
                  onChange={(e) => setRunningLimit(Number(e.target.value) || 50)}
                  size="small"
                  type="number"
                  inputProps={{ min: 1, max: 200 }}
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Button variant="contained" onClick={() => runningQuery.refetch()}>
                    조회
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setMinDurationMs(500);
                      setRunningLimit(50);
                    }}
                  >
                    초기화
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title={tab === 'slow' ? `슬로우 쿼리 (총 ${slowRows.length}개)` : `실행중 쿼리 (총 ${runningRows.length}개)`}
            subheader={
              tab === 'slow'
                ? 'pg_stat_statements(누적 통계) 기반'
                : 'pg_stat_activity(현재 실행중) 기반'
            }
          />
          <CardContent>
            {tab === 'slow' && slowQuery.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {slowErrorText || '슬로우 쿼리 조회 실패'}
              </Alert>
            )}
            {tab === 'running' && runningQuery.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {runningErrorText || '실행중 쿼리 조회 실패'}
              </Alert>
            )}

            {tab === 'slow'
              ? renderSlowTable(slowRows)
              : renderRunningTable(runningRows)}
          </CardContent>
        </Card>
      </Container>

      <Dialog open={queryDialogOpen} onClose={() => setQueryDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Query</DialogTitle>
        <DialogContent>
          <Box
            component="pre"
            sx={{
              m: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'Consolas, ui-monospace, SFMono-Regular, Menlo, Monaco, "Liberation Mono", monospace',
              fontSize: 13,
              lineHeight: 1.5,
              bgcolor: 'action.hover',
              p: 2,
              borderRadius: 1,
            }}
          >
            {queryDialogText || '-'}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => copyQuery(queryDialogText)} startIcon={<ContentCopyIcon />}>
            복사
          </Button>
          <Button onClick={() => setQueryDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

