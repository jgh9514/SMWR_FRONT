'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useBatchConfig,
  useBatchRun,
  useBatchHistory,
  useSlackTestSend,
  BatchConfigItem,
  BatchRunResponse,
  SlackTestResponse,
  BatchHistoryItem,
} from '@/features/admin/hooks/useBatch';
import { showToast, confirm } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import { PageHeader } from '@/shared/ui';
import { formatDate } from '@/shared/utils/format';

type BatchResultCode = 'SUCCESS' | 'FAIL' | 'RUNNING' | string;
type StatusFilter = 'all' | 'success' | 'failed' | 'running';

function getResultChipColor(code?: BatchResultCode): 'success' | 'error' | 'warning' | 'default' {
  if (code === 'SUCCESS') return 'success';
  if (code === 'FAIL') return 'error';
  if (code === 'RUNNING') return 'warning';
  return 'default';
}

function getHistoryRowSx(code?: BatchResultCode) {
  const color = getResultChipColor(code);
  if (color === 'default') return undefined;
  return {
    borderLeft: '4px solid',
    borderLeftColor: `${color}.main`,
    bgcolor: (t: { palette: Record<'success' | 'error' | 'warning', { main: string }> }) =>
      alpha(t.palette[color].main, 0.06),
  };
}

function formatDuration(start?: string, end?: string, isClient = true): string {
  if (!start || !end || !isClient) return '-';
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return '-';
  const sec = Math.round((endMs - startMs) / 1000);
  if (sec < 60) return `${sec}초`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min < 60) return rem > 0 ? `${min}분 ${rem}초` : `${min}분`;
  const hour = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin > 0 ? `${hour}시간 ${remMin}분` : `${hour}시간`;
}

/**
 * 배치 SSE URL. EventSource는 크로스 오리진(예: :3000 페이지 → :8080 API)에서
 * 표준 API로 HttpOnly 쿠키를 보내지 않습니다. Axios(withCredentials)와 달리 인증이 빠집니다.
 * 페이지와 동일 출처의 `/api/v1`(Next 프록시)으로 붙여 쿠키가 전달되게 합니다.
 */
function getBatchLogStreamUrl(streamId: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/api/v1/batch/logs/stream/${encodeURIComponent(streamId)}`;
}

export default function BatchManagementPage() {
  const router = useRouter();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const searchParams = useSearchParams();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<string>('');
  const [streamLogOpen, setStreamLogOpen] = useState(false);
  const [streamLogText, setStreamLogText] = useState('');
  const [streamLogStatus, setStreamLogStatus] = useState<
    'idle' | 'connecting' | 'running' | 'success' | 'fail' | 'error'
  >('idle');
  const [slackTestMessage, setSlackTestMessage] = useState('');
  const streamEsRef = useRef<EventSource | null>(null);
  const streamRunStartedRef = useRef(false);
  const streamLogPreRef = useRef<HTMLPreElement | null>(null);
  const runConfirmOpenRef = useRef(false);
  const historySectionRef = useRef<HTMLDivElement | null>(null);
  const incident = searchParams.get('incident');
  const historyFilter = searchParams.get('filter');
  const batIdFromUrl = searchParams.get('bat_id');
  const [selectedBatId, setSelectedBatId] = useState<string | null>(batIdFromUrl);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    historyFilter === 'failed' ? 'failed' : 'all',
  );

  useEffect(() => {
    setSelectedBatId(batIdFromUrl);
  }, [batIdFromUrl]);

  useEffect(() => {
    if (historyFilter === 'failed') {
      setStatusFilter('failed');
    }
  }, [historyFilter]);
  const incidentMessage = useMemo(() => {
    if (incident === 'batch_diagnostics_failed') {
      return '운영 상태 카드에서 배치 진단 실패 이슈로 진입했습니다. 최근 배치 설정과 실행 이력을 우선 확인하세요.';
    }
    return null;
  }, [incident]);

  const closeStreamLog = useCallback(() => {
    if (streamEsRef.current) {
      streamEsRef.current.close();
      streamEsRef.current = null;
    }
    streamRunStartedRef.current = false;
  }, []);

  useEffect(() => {
    if (streamLogPreRef.current && streamLogOpen) {
      streamLogPreRef.current.scrollTop = streamLogPreRef.current.scrollHeight;
    }
  }, [streamLogText, streamLogOpen]);

  // 배치 설정 목록 조회
  const { data: batchConfigList = [], refetch: refetchConfig, isLoading: isLoadingConfig } = useBatchConfig({});
  const sortedBatchConfigList = useMemo(
    () => [...batchConfigList].sort((a, b) => String(a.bat_id).localeCompare(String(b.bat_id))),
    [batchConfigList],
  );

  const batchNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const config of batchConfigList) {
      map.set(String(config.bat_id), config.bat_nm);
    }
    return map;
  }, [batchConfigList]);

  const historyQueryParams = useMemo(() => {
    const params: { limit: number; bat_id?: string } = {
      limit: selectedBatId ? 50 : 30,
    };
    if (selectedBatId) {
      params.bat_id = selectedBatId;
    }
    return params;
  }, [selectedBatId]);

  const { data: batchHistory = [], refetch: refetchHistory, isLoading: isLoadingHistory } = useBatchHistory(historyQueryParams);

  const { data: recentHistoryOverview = [] } = useBatchHistory({ limit: 200 });

  const latestRunByBatId = useMemo(() => {
    const map = new Map<string, BatchHistoryItem>();
    for (const item of recentHistoryOverview) {
      const batId = String(item.bat_id);
      if (!map.has(batId)) {
        map.set(batId, item);
      }
    }
    return map;
  }, [recentHistoryOverview]);

  const filteredBatchHistory = useMemo(() => {
    let rows = batchHistory;
    if (statusFilter === 'failed') {
      rows = rows.filter((item) => item.rslt_cd === 'FAIL' || item.rslt_cd === 'RUNNING');
    } else if (statusFilter === 'success') {
      rows = rows.filter((item) => item.rslt_cd === 'SUCCESS');
    } else if (statusFilter === 'running') {
      rows = rows.filter((item) => item.rslt_cd === 'RUNNING');
    }
    return rows;
  }, [batchHistory, statusFilter]);

  const batchHistorySummary = useMemo(() => {
    let successCount = 0;
    let failCount = 0;
    let runningCount = 0;
    for (const item of batchHistory) {
      if (item.rslt_cd === 'SUCCESS') successCount += 1;
      if (item.rslt_cd === 'FAIL') failCount += 1;
      if (item.rslt_cd === 'RUNNING') runningCount += 1;
    }
    return { successCount, failCount, runningCount };
  }, [batchHistory]);

  // 날짜 포맷팅 함수
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    if (!isClient) return dateStr;
    try {
      return formatDate(dateStr, 'YYYY-MM-DD HH:mm:ss');
    } catch {
      return dateStr;
    }
  };

  // Cron 표현식을 사람이 읽기 쉬운 형식으로 변환
  const formatCronExpression = (cronExpr: string): string => {
    if (!cronExpr) return '-';
    
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length < 6) return cronExpr; // 유효하지 않은 형식
    
    const [, minute, hour, day, month, dayOfWeek] = parts;
    
    // 요일 매핑 (Spring Cron: 0=일요일, 1=월요일, ..., 6=토요일, ?=무시)
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    
    // 매일 (모든 필드가 * 또는 ?)
    if (day === '*' && dayOfWeek === '?' && month === '*') {
      if (hour === '*' && minute === '*') {
        return '매분';
      }
      if (hour === '*' && minute !== '*') {
        return `매시간 ${minute.padStart(2, '0')}분`;
      }
      if (hour !== '*' && minute !== '*') {
        return `매일 ${hour.padStart(2, '0')}시 ${minute.padStart(2, '0')}분`;
      }
      if (hour !== '*' && minute === '*') {
        return `매일 ${hour.padStart(2, '0')}시`;
      }
    }
    
    // 매주 특정 요일
    if (day === '?' && dayOfWeek !== '*' && dayOfWeek !== '?' && month === '*') {
      const days = dayOfWeek.split(',').map(d => {
        const dayNum = parseInt(d.trim());
        if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
          return dayNames[dayNum];
        }
        return '';
      }).filter(Boolean);
      
      if (days.length > 0) {
        const timeStr = hour !== '*' && minute !== '*' 
          ? ` ${hour.padStart(2, '0')}시 ${minute.padStart(2, '0')}분`
          : hour !== '*' ? ` ${hour.padStart(2, '0')}시` : '';
        return `매주 ${days.join(', ')}요일${timeStr}`;
      }
    }
    
    // 매월 특정 일
    if (day !== '*' && day !== '?' && dayOfWeek === '?' && month === '*') {
      const timeStr = hour !== '*' && minute !== '*' 
        ? ` ${hour.padStart(2, '0')}시 ${minute.padStart(2, '0')}분`
        : hour !== '*' ? ` ${hour.padStart(2, '0')}시` : '';
      return `매월 ${day}일${timeStr}`;
    }
    
    // 복잡한 표현식은 원본 반환
    return cronExpr;
  };

  // 배치 수동 실행 Mutation (행 단위 실행) — WAS는 Quartz 트리거만 하고 즉시 응답; 실제 결과는 이력에 쌓임
  const slackTestMutation = useSlackTestSend({
    onSuccess: (res: SlackTestResponse) => {
      if (res.result === 'SUCCESS') {
        showToast.success(res.message ?? 'Slack으로 전송했습니다.');
      } else {
        showToast.error(res.message ?? 'Slack 전송에 실패했습니다.');
      }
    },
    onError: () => {
      showToast.error('Slack 테스트 요청에 실패했습니다.');
    },
  });

  const runMutation = useBatchRun({
    onSuccess: (response: BatchRunResponse) => {
      if (response.result === 'SUCCESS') {
        showToast.success(
          response.message ??
            '배치가 백그라운드에서 시작되었습니다. 잠시 후 실행 이력을 새로고침해 결과를 확인하세요.',
        );
        void refetchHistory();
        window.setTimeout(() => void refetchHistory(), 4000);
        window.setTimeout(() => void refetchHistory(), 15000);
      } else {
        showToast.error(response.message || '배치 실행에 실패했습니다.');
      }
    },
    onError: (error: unknown) => {
      logger.error('배치 실행 실패', error, { context: 'BatchManagementPage' });
      showToast.error('배치 실행에 실패했습니다.');
    },
  });

  const handleRefresh = useCallback(() => {
    refetchConfig();
    refetchHistory();
  }, [refetchConfig, refetchHistory]);

  const handleRowRun = useCallback(
    async (config: BatchConfigItem) => {
      if (runConfirmOpenRef.current) return;
      runConfirmOpenRef.current = true;
      const res = await confirm('해당 배치를 실행하시겠습니까?', `배치ID: ${config.bat_id}\n배치명: ${config.bat_nm}`);
      runConfirmOpenRef.current = false;
      if (!res) return;

      const streamId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setStreamLogOpen(true);
      setStreamLogText('');
      setStreamLogStatus('connecting');

      const url = getBatchLogStreamUrl(streamId);
      if (!url) {
        showToast.error('API 주소를 확인할 수 없습니다.');
        setStreamLogOpen(false);
        setStreamLogStatus('idle');
        return;
      }
      const es = new EventSource(url);
      streamEsRef.current = es;
      streamRunStartedRef.current = false;

      es.addEventListener('log', (ev: MessageEvent) => {
        const msg = typeof ev.data === 'string' ? ev.data : '';
        setStreamLogText((prev) => (prev ? `${prev}\n` : '') + msg);
      });

      es.addEventListener('done', (ev: MessageEvent) => {
        try {
          const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
          const st = data?.status as string | undefined;
          setStreamLogStatus(st === 'SUCCESS' ? 'success' : 'fail');
        } catch {
          setStreamLogStatus('fail');
        }
        es.close();
        streamEsRef.current = null;
        void refetchHistory();
        window.setTimeout(() => void refetchHistory(), 4000);
        window.setTimeout(() => void refetchHistory(), 15000);
      });

      es.onopen = () => {
        if (streamRunStartedRef.current) return;
        streamRunStartedRef.current = true;
        setStreamLogStatus('running');
        runMutation.mutate(
          { job_key: config.bat_id, stream_id: streamId },
          {
            onError: () => {
              setStreamLogStatus('error');
              closeStreamLog();
              showToast.error('배치 실행 요청에 실패했습니다.');
            },
          },
        );
      };

      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) {
          streamEsRef.current = null;
          if (!streamRunStartedRef.current) {
            setStreamLogStatus('error');
            showToast.error('실시간 로그 연결에 실패했습니다.');
          }
        }
      };
    },
    [runMutation, refetchHistory, closeStreamLog],
  );

  const handleCloseStreamLogDialog = useCallback(() => {
    closeStreamLog();
    setStreamLogOpen(false);
    setStreamLogText('');
    setStreamLogStatus('idle');
  }, [closeStreamLog]);

  const handleViewResult = useCallback((resultText: string) => {
    setSelectedResult(resultText || '결과가 없습니다.');
    setResultDialogOpen(true);
  }, []);

  const handleCloseResultDialog = useCallback(() => {
    setResultDialogOpen(false);
    setSelectedResult('');
  }, []);

  const updateBatchFilterInUrl = useCallback(
    (batId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (batId) {
        params.set('bat_id', batId);
      } else {
        params.delete('bat_id');
      }
      const qs = params.toString();
      router.replace(qs ? `/admin/batch?${qs}` : '/admin/batch', { scroll: false });
    },
    [router, searchParams],
  );

  const handleSelectBatchHistory = useCallback(
    (batId: string) => {
      setSelectedBatId(batId);
      updateBatchFilterInUrl(batId);
      window.requestAnimationFrame(() => {
        historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [updateBatchFilterInUrl],
  );

  const handleClearBatchFilter = useCallback(() => {
    setSelectedBatId(null);
    updateBatchFilterInUrl(null);
  }, [updateBatchFilterInUrl]);

  const selectedBatchName = selectedBatId ? batchNameMap.get(selectedBatId) : undefined;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={() => router.push('/admin')} startIcon={<ArrowBackIcon />} size={mobile ? 'small' : 'medium'}>
            목록
          </Button>
          <PageHeader title="배치 관리" />
          {incident && <Chip label={`incident: ${incident}`} color="warning" variant="outlined" />}
          {historyFilter === 'failed' && <Chip label="실패/실행중 우선 보기" color="error" variant="outlined" />}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {incidentMessage && <Alert severity="warning">{incidentMessage}</Alert>}

          <Card variant="outlined">
            <CardHeader title="Slack 테스트 발송" subheader="배치 실패 알림과 동일 설정 (smw.rta.batch)" />
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  WAS에 설정된 <code>slack-token</code>·<code>slack-channel-id</code>로{' '}
                  <code>chat.postMessage</code> 를 호출합니다. 운영에서는 보통{' '}
                  <code>SMW_BATCH_SLACK_TOKEN</code> / <code>SMW_BATCH_SLACK_CHANNEL_ID</code> 로 주입합니다.
                  메시지를 비우면 기본 테스트 문구가 전송됩니다.
                </Typography>
                <TextField
                  label="메시지 (선택)"
                  placeholder="비우면 [SMW 관리자] Slack 연동 테스트 …"
                  value={slackTestMessage}
                  onChange={(e) => setSlackTestMessage(e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  size="small"
                />
                <Box>
                  <Button
                    variant="contained"
                    color="secondary"
                    disabled={slackTestMutation.isPending}
                    onClick={() => {
                      const m = slackTestMessage.trim();
                      slackTestMutation.mutate(m ? { message: m } : {});
                    }}
                  >
                    {slackTestMutation.isPending ? '전송 중…' : '샘플 메시지 보내기'}
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* 배치 설정 */}
          <Card>
            <CardHeader
              title="배치 설정 목록"
              action={
                <Tooltip title="새로고침">
                  <Box component="span" sx={{ display: 'inline-flex' }}>
                    <IconButton onClick={handleRefresh} disabled={isLoadingConfig} size="small">
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                </Tooltip>
              }
            />
            <CardContent sx={{ p: 0, '&:last-child': { pb: 2 } }}>
              {isLoadingConfig ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : sortedBatchConfigList.length === 0 ? (
                <Alert severity="info" sx={{ m: 2 }}>배치 설정이 없습니다.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600, overflowX: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {[
                          { label: '배치 ID', sx: { minWidth: 100 }, hide: false },
                          { label: '배치명', sx: { minWidth: 120 }, hide: false },
                          { label: 'Cron', sx: { minWidth: 150 }, hide: mobile },
                          { label: '사용여부', sx: { width: 90 }, align: 'center' as const, hide: false },
                          { label: '최근 실행', sx: { minWidth: 140 }, hide: false },
                          { label: '정렬', sx: { width: 70 }, align: 'center' as const, hide: mobile },
                          { label: '설명', sx: { minWidth: 150 }, hide: mobile },
                          { label: '작업', sx: { minWidth: mobile ? 100 : 140 }, align: 'center' as const, hide: false },
                        ]
                          .filter(({ hide }) => !hide)
                          .map(({ label, sx, align }) => (
                          <TableCell
                            key={label}
                            align={align}
                            sx={{
                              ...sx,
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              letterSpacing: '0.04em',
                              color: 'text.secondary',
                              bgcolor: 'action.hover',
                              borderBottom: '2px solid',
                              borderColor: 'divider',
                            }}
                          >
                            {label}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedBatchConfigList.map((config) => {
                        const latestRun = latestRunByBatId.get(String(config.bat_id));
                        const isSelected = selectedBatId === String(config.bat_id);
                        return (
                        <TableRow
                          key={config.bat_id}
                          hover
                          selected={isSelected}
                          sx={{
                            ...(isSelected
                              ? { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) }
                              : undefined),
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                              {config.bat_id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'normal', fontWeight: 600 }}>
                              {config.bat_nm}
                            </Typography>
                          </TableCell>
                          {!mobile && (
                            <TableCell>
                              <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                {formatCronExpression(config.cron_expr)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', display: 'block', mt: 0.5 }}>
                                {config.cron_expr}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell align="center">
                            <Chip
                              label={config.use_yn === 'Y' ? '사용' : '중지'}
                              color={config.use_yn === 'Y' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {latestRun ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                                <Chip
                                  label={latestRun.rslt_cd || '-'}
                                  color={getResultChipColor(latestRun.rslt_cd)}
                                  size="small"
                                  sx={{ fontWeight: 700 }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                  {formatDateTime(latestRun.exe_dtm)}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                이력 없음
                              </Typography>
                            )}
                          </TableCell>
                          {!mobile && <TableCell align="center">{config.sort_sn}</TableCell>}
                          {!mobile && (
                            <TableCell>
                              <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                {config.desc_txt || '-'}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                              <Tooltip title="실행 이력 보기">
                                <Button
                                  variant={isSelected ? 'contained' : 'outlined'}
                                  size="small"
                                  startIcon={mobile ? undefined : <HistoryIcon />}
                                  onClick={() => handleSelectBatchHistory(String(config.bat_id))}
                                >
                                  {mobile ? '이력' : '이력'}
                                </Button>
                              </Tooltip>
                              <Tooltip title="수동 실행">
                                <Button
                                  variant="outlined"
                                  color="primary"
                                  size="small"
                                  startIcon={mobile ? undefined : <PlayArrowIcon />}
                                  onClick={() => handleRowRun(config)}
                                  disabled={runMutation.isPending}
                                  sx={{ minWidth: mobile ? 56 : 72 }}
                                >
                                  실행
                                </Button>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* 실행 이력 */}
          <Card ref={historySectionRef} sx={{ scrollMarginTop: 96 }}>
            <CardHeader
              title={
                selectedBatId
                  ? `실행 이력 — ${selectedBatchName ?? selectedBatId}`
                  : `배치 실행 이력 (${filteredBatchHistory.length}건)`
              }
              subheader={
                selectedBatId
                  ? `배치 ID: ${selectedBatId} · 최근 ${historyQueryParams.limit}건`
                  : '전체 배치 최근 실행 이력 · 배치 설정 목록에서 [이력]을 누르면 해당 배치만 조회합니다.'
              }
              action={
                <Tooltip title="새로고침">
                  <Box component="span" sx={{ display: 'inline-flex' }}>
                    <IconButton onClick={() => refetchHistory()} disabled={isLoadingHistory} size="small">
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                </Tooltip>
              }
            />
            <CardContent sx={{ p: 0, '&:last-child': { pb: 2 } }}>
              <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 } }}>
                    <InputLabel id="batch-history-filter-label">배치 필터</InputLabel>
                    <Select
                      labelId="batch-history-filter-label"
                      label="배치 필터"
                      value={selectedBatId ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                          handleSelectBatchHistory(String(value));
                        } else {
                          handleClearBatchFilter();
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em>전체 배치</em>
                      </MenuItem>
                      {sortedBatchConfigList.map((config) => (
                        <MenuItem key={config.bat_id} value={String(config.bat_id)}>
                          {config.bat_nm} ({config.bat_id})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedBatId && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<FilterAltOffIcon />}
                      onClick={handleClearBatchFilter}
                    >
                      필터 해제
                    </Button>
                  )}
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {([
                    ['all', '전체', batchHistory.length],
                    ['success', '성공', batchHistorySummary.successCount],
                    ['failed', '실패', batchHistorySummary.failCount],
                    ['running', '실행중', batchHistorySummary.runningCount],
                  ] as const).map(([key, label, count]) => (
                    <Chip
                      key={key}
                      label={`${label} ${count}`}
                      clickable
                      color={statusFilter === key ? 'primary' : 'default'}
                      variant={statusFilter === key ? 'filled' : 'outlined'}
                      onClick={() => setStatusFilter(key)}
                    />
                  ))}
                </Box>
              </Box>

              {historyFilter === 'failed' && (
                <Alert severity="info" sx={{ mx: 2, mb: 1 }}>
                  incident 진입: 실패/실행중 {batchHistorySummary.failCount + batchHistorySummary.runningCount}건 기준으로 필터가 적용되어 있습니다.
                </Alert>
              )}
              {isLoadingHistory ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : filteredBatchHistory.length === 0 ? (
                <Alert severity="info" sx={{ m: 2 }}>
                  {selectedBatId ? '선택한 배치의 실행 이력이 없습니다.' : '실행 이력이 없습니다.'}
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600, overflowX: 'auto', mx: 2, mb: 2 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {[
                          { label: '실행 ID', sx: { width: 80 }, hide: mobile },
                          { label: '배치', sx: { minWidth: 160 }, hide: !!selectedBatId },
                          { label: '상태', sx: { width: 100 }, align: 'center' as const, hide: false },
                          { label: '시작', sx: { minWidth: 150 }, hide: false },
                          { label: '종료', sx: { minWidth: 150 }, hide: mobile },
                          { label: '소요', sx: { width: 90 }, align: 'center' as const, hide: false },
                          { label: '결과', sx: { width: 120 }, align: 'center' as const, hide: false },
                        ]
                          .filter(({ hide }) => !hide)
                          .map(({ label, sx, align }) => (
                          <TableCell
                            key={label}
                            align={align}
                            sx={{
                              ...sx,
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              letterSpacing: '0.04em',
                              color: 'text.secondary',
                              bgcolor: 'action.hover',
                              borderBottom: '2px solid',
                              borderColor: 'divider',
                            }}
                          >
                            {label}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredBatchHistory.map((his, index) => (
                        <TableRow
                          key={his.bat_exe_log_sn || `history-${index}`}
                          hover
                          sx={getHistoryRowSx(his.rslt_cd)}
                        >
                          {!mobile && <TableCell>{his.bat_exe_log_sn}</TableCell>}
                          {!selectedBatId && (
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {batchNameMap.get(String(his.bat_id)) ?? his.bat_id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                {his.bat_id}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell align="center">
                            <Chip
                              label={his.rslt_cd || '-'}
                              color={getResultChipColor(his.rslt_cd)}
                              size="small"
                              sx={{ fontWeight: 700, minWidth: 72 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                              {formatDateTime(his.exe_dtm)}
                            </Typography>
                          </TableCell>
                          {!mobile && (
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                {formatDateTime(his.end_dtm)}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                              {formatDuration(his.exe_dtm, his.end_dtm, isClient)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={mobile ? undefined : <VisibilityIcon />}
                              onClick={() => handleViewResult(his.rslt_txt || '')}
                              disabled={!his.rslt_txt}
                            >
                              {mobile ? '결과' : '결과보기'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* 수동 실행 실시간 로그 (SSE) */}
        <Dialog open={streamLogOpen} onClose={handleCloseStreamLogDialog} maxWidth="md" fullWidth fullScreen={mobile}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6">배치 실행 로그 (실시간)</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {streamLogStatus === 'connecting' && <Chip size="small" label="연결 중" color="default" />}
                {streamLogStatus === 'running' && <Chip size="small" label="실행 중" color="warning" />}
                {streamLogStatus === 'success' && <Chip size="small" label="완료" color="success" />}
                {(streamLogStatus === 'fail' || streamLogStatus === 'error') && (
                  <Chip size="small" label={streamLogStatus === 'error' ? '오류' : '실패'} color="error" />
                )}
                <IconButton onClick={handleCloseStreamLogDialog} size="small" aria-label="닫기">
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box
              ref={streamLogPreRef}
              component="pre"
              sx={{
                p: 2,
                m: 0,
                bgcolor: 'background.default',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                maxHeight: 420,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
              }}
            >
              {streamLogText || (streamLogStatus === 'connecting' ? 'SSE 연결 대기 중…' : '로그가 없습니다.')}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseStreamLogDialog} variant="contained">
              닫기
            </Button>
          </DialogActions>
        </Dialog>

        {/* 결과 보기 팝업 */}
        <Dialog
          open={resultDialogOpen}
          onClose={handleCloseResultDialog}
          maxWidth="md"
          fullWidth
          fullScreen={mobile}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">배치 실행 결과</Typography>
              <IconButton onClick={handleCloseResultDialog} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{
                p: 2,
                bgcolor: 'background.default',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  m: 0,
                }}
              >
                {selectedResult}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseResultDialog} variant="contained">
              닫기
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

