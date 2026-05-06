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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useBatchConfig,
  useBatchRun,
  useBatchHistory,
  useSlackTestSend,
  BatchConfigItem,
  BatchRunResponse,
  SlackTestResponse,
} from '@/features/admin/hooks/useBatch';
import { showToast, confirm } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import { PageHeader } from '@/shared/ui';
import { formatDate } from '@/shared/utils/format';

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
  const incident = searchParams.get('incident');
  const historyFilter = searchParams.get('filter');
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
    () => [...batchConfigList].sort((a, b) => a.bat_id.localeCompare(b.bat_id)),
    [batchConfigList],
  );

  // 배치 실행 이력 조회
  const { data: batchHistory = [], refetch: refetchHistory, isLoading: isLoadingHistory } = useBatchHistory({
    limit: 10,
  });
  const filteredBatchHistory = useMemo(() => {
    if (historyFilter !== 'failed') {
      return batchHistory;
    }
    return batchHistory.filter((item) => item.rslt_cd === 'FAIL' || item.rslt_cd === 'RUNNING');
  }, [batchHistory, historyFilter]);
  const batchHistorySummary = useMemo(() => {
    let failCount = 0;
    let runningCount = 0;
    for (const item of batchHistory) {
      if (item.rslt_cd === 'FAIL') failCount += 1;
      if (item.rslt_cd === 'RUNNING') runningCount += 1;
    }
    return { failCount, runningCount };
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/admin')} startIcon={<ArrowBackIcon />}>
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
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>배치 ID</TableCell>
                        <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>배치명</TableCell>
                        <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>Cron</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 90 }} align="center">사용여부</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 70 }} align="center">정렬</TableCell>
                        <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>설명</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 100 }} align="center">실행</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedBatchConfigList.map((config) => (
                        <TableRow key={config.bat_id} hover>
                          <TableCell>{config.bat_id}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                              {config.bat_nm}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                              {formatCronExpression(config.cron_expr)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', display: 'block', mt: 0.5 }}>
                              {config.cron_expr}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={config.use_yn === 'Y' ? '사용' : '중지'}
                              color={config.use_yn === 'Y' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">{config.sort_sn}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                              {config.desc_txt || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<PlayArrowIcon />}
                              onClick={() => handleRowRun(config)}
                              disabled={runMutation.isPending}
                              sx={{ minWidth: 80 }}
                            >
                              실행
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

          {/* 실행 이력 */}
          <Card>
            <CardHeader
              title={`배치 실행 이력 (${filteredBatchHistory.length}건)`}
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
              {historyFilter === 'failed' && (
                <Alert severity="info" sx={{ m: 2 }}>
                  최근 실패 {batchHistorySummary.failCount}건, 실행중 {batchHistorySummary.runningCount}건을 우선 표시합니다.
                </Alert>
              )}
              {isLoadingHistory ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : filteredBatchHistory.length === 0 ? (
                <Alert severity="info" sx={{ m: 2 }}>실행 이력이 없습니다.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, width: 80 }}>실행 ID</TableCell>
                        <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>배치 ID</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 90 }} align="center">상태</TableCell>
                        <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>시작 시간</TableCell>
                        <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>종료 시간</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: 120 }} align="center">결과</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredBatchHistory.map((his, index) => (
                        <TableRow key={his.bat_exe_log_sn || `history-${index}`} hover>
                          <TableCell>{his.bat_exe_log_sn}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word', whiteSpace: 'normal' }}>
                              {his.bat_id}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={his.rslt_cd || '-'}
                              color={
                                his.rslt_cd === 'SUCCESS'
                                  ? 'success'
                                  : his.rslt_cd === 'FAIL'
                                    ? 'error'
                                    : 'warning'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                              {formatDateTime(his.exe_dtm)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                              {formatDateTime(his.end_dtm)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => handleViewResult(his.rslt_txt || '')}
                              disabled={!his.rslt_txt}
                            >
                              결과보기
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
        <Dialog open={streamLogOpen} onClose={handleCloseStreamLogDialog} maxWidth="md" fullWidth>
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

