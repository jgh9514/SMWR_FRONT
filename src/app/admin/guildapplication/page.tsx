'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useRouter } from 'next/navigation';
import { useGuildApplicationList, useProcessGuildApplication } from '@/hooks/api';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';

export default function GuildApplicationManagementPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 길드 신청 목록 조회 (관리자용 - 모든 신청 조회)
  const guildApplicationListQuery = useGuildApplicationList({
    enabled: true,
  });

  // 길드 신청 승인/반려 Mutation
  const processApplicationMutation = useProcessGuildApplication({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('처리되었습니다.');
        guildApplicationListQuery.refetch();
        setDetailDialogOpen(false);
        setSelectedApplication(null);
      } else {
        throw new Error(res.message || '처리에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('길드 신청 처리 실패', error);
      showToast.error(error.message || '처리에 실패했습니다.');
    },
  });

  const handleProcessApplication = (applicationId: string, status: 'APPROVED' | 'REJECTED') => {
    processApplicationMutation.mutate({
      application_id: applicationId,
      status,
    });
  };

  const handleViewDetail = (application: any) => {
    setSelectedApplication(application);
    setDetailDialogOpen(true);
  };

  const getStatusLabel = (status?: string) => {
    if (status === 'APPROVED') return '승인';
    if (status === 'REJECTED') return '반려';
    if (status === 'PENDING') return '대기';
    return '알 수 없음';
  };

  const getStatusColor = (status?: string) => {
    if (status === 'APPROVED') return 'success';
    if (status === 'REJECTED') return 'error';
    if (status === 'PENDING') return 'warning';
    return 'default';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button variant="outlined" onClick={() => router.push('/admin')} startIcon={<ArrowBackIcon />}>
          관리자 메인
        </Button>
      </Box>

      <Card>
        <CardHeader
          title="길드 신청 관리"
          subheader="길드 생성 신청 목록을 조회하고 승인/반려할 수 있습니다."
        />
        <CardContent>
          {guildApplicationListQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : guildApplicationListQuery.data && guildApplicationListQuery.data.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>길드명</TableCell>
                    <TableCell>신청자</TableCell>
                    <TableCell>신청일</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell align="right">작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {guildApplicationListQuery.data.map((app: any) => (
                    <TableRow key={app.application_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {app.guild_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {app.user_name || app.user_id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {app.user_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {isMounted && app.crt_date ? new Date(app.crt_date).toLocaleDateString('ko-KR') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(app.status)}
                          color={getStatusColor(app.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleViewDetail(app)}
                            title="상세보기"
                          >
                            <VisibilityIcon />
                          </IconButton>
                          {app.status === 'PENDING' && (
                            <>
                              <IconButton
                                color="success"
                                size="small"
                                onClick={() => handleProcessApplication(app.application_id, 'APPROVED')}
                                disabled={processApplicationMutation.isPending}
                                title="승인"
                              >
                                <CheckCircleIcon />
                              </IconButton>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleProcessApplication(app.application_id, 'REJECTED')}
                                disabled={processApplicationMutation.isPending}
                                title="반려"
                              >
                                <CancelIcon />
                              </IconButton>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                신청 내역이 없습니다.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 상세보기 다이얼로그 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>길드 신청 상세</DialogTitle>
        <DialogContent>
          {selectedApplication && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  길드명
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedApplication.guild_name || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  신청자
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedApplication.user_name || selectedApplication.user_id}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedApplication.user_id}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  신청일
                </Typography>
                <Typography variant="body1">
                  {selectedApplication.crt_date
                    ? isMounted && new Date(selectedApplication.crt_date).toLocaleString('ko-KR')
                    : '-'
                    : '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  상태
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={getStatusLabel(selectedApplication.status)}
                    color={getStatusColor(selectedApplication.status) as any}
                    size="small"
                  />
                </Box>
              </Box>
              {selectedApplication.json_file_url && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    JSON 파일
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      href={selectedApplication.json_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      JSON 파일 다운로드
                    </Button>
                  </Box>
                </Box>
              )}
              {selectedApplication.image_file_url && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    이미지 파일
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <img
                      src={selectedApplication.image_file_url}
                      alt="길드 이미지"
                      style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px' }}
                    />
                  </Box>
                </Box>
              )}
              {selectedApplication.status === 'PENDING' && (
                <Alert severity="info">이 신청을 승인하거나 반려할 수 있습니다.</Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedApplication?.status === 'PENDING' && (
            <>
              <Button
                onClick={() =>
                  handleProcessApplication(selectedApplication.application_id, 'REJECTED')
                }
                color="error"
                disabled={processApplicationMutation.isPending}
              >
                반려
              </Button>
              <Button
                onClick={() =>
                  handleProcessApplication(selectedApplication.application_id, 'APPROVED')
                }
                variant="contained"
                color="success"
                disabled={processApplicationMutation.isPending}
              >
                승인
              </Button>
            </>
          )}
          <Button onClick={() => setDetailDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

