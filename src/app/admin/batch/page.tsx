'use client';

import { useCallback, useState, useEffect } from 'react';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { useRouter } from 'next/navigation';
import { useBatchConfig, useBatchRun, useBatchHistory, BatchConfigItem, BatchRunResponse } from '@/features/admin/hooks/useBatch';
import { showToast, confirm } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import { PageBanner, PageHeader } from '@/shared/ui';
import { formatDate } from '@/shared/utils/format';

export default function BatchManagementPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 배치 설정 목록 조회
  const { data: batchConfigList = [], refetch: refetchConfig, isLoading: isLoadingConfig } = useBatchConfig({});

  // 배치 실행 이력 조회
  const { data: batchHistory = [], refetch: refetchHistory, isLoading: isLoadingHistory } = useBatchHistory({});

  // 날짜 포맷팅 함수
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    if (!isMounted) return dateStr;
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
    
    const [second, minute, hour, day, month, dayOfWeek] = parts;
    
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

  // 배치 수동 실행 Mutation (행 단위 실행)
  const runMutation = useBatchRun({
    onSuccess: (response: BatchRunResponse) => {
      if (response.result === 'SUCCESS') {
        showToast.success('배치가 완료되었습니다.');
        refetchHistory(); // 이력 새로고침
      } else {
        showToast.error(response.message || '배치 실행에 실패했습니다.');
      }
    },
    onError: (error: unknown) => {
      logger.error('배치 실행 실패', error, { context: 'BatchManagementPage' });
      const err = error as { response?: { data?: { message?: string; result?: string } }; message?: string };
      const data = err.response?.data;
      const msg =
        (typeof data?.message === 'string' && data.message) ||
        err.message ||
        '배치 실행에 실패했습니다.';
      showToast.error(msg);
    },
  });

  const handleRefresh = useCallback(() => {
    refetchConfig();
    refetchHistory();
  }, [refetchConfig, refetchHistory]);

  const handleRowRun = useCallback(
    async (config: BatchConfigItem) => {
      const res = await confirm('해당 배치를 실행하시겠습니까?', `배치ID: ${config.bat_id}\n배치명: ${config.bat_nm}`);
      if (!res) return;

      // bat_id를 문자열로 명시 (API/DB 타입 일치)
      runMutation.mutate({
        job_key: String(config.bat_id ?? ''),
      });
    },
    [runMutation],
  );

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
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 배치 설정 */}
          <Card>
            <CardHeader
              title="배치 설정 목록"
              action={
                <Tooltip title="새로고침">
                  <IconButton onClick={handleRefresh} disabled={isLoadingConfig} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              }
            />
            <CardContent sx={{ p: 0, '&:last-child': { pb: 2 } }}>
              {isLoadingConfig ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : batchConfigList.length === 0 ? (
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
                      {batchConfigList.map((config) => (
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
              title="배치 실행 이력"
              action={
                <Tooltip title="새로고침">
                  <IconButton onClick={() => refetchHistory()} disabled={isLoadingHistory} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              }
            />
            <CardContent sx={{ p: 0, '&:last-child': { pb: 2 } }}>
              {isLoadingHistory ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : batchHistory.length === 0 ? (
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
                      {batchHistory.map((his, index) => (
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

