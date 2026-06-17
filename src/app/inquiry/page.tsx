'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  TextField,
  Pagination,
  CircularProgress,
  Alert,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import { getApiResultMessage, isApiSuccess } from '@/shared/lib/api/result';
import { handleApiError } from '@/shared/lib/error-handler';
import {
  useInquiryList,
  useInquiryDetail,
  useSaveInquiry,
  useAnswerInquiry,
  useDeleteInquiry,
} from '@/hooks/api';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { RichTextDisplay } from '@/shared/ui/editor/RichTextDisplay';
import { isAuthenticated } from '@/shared/utils/auth';
import { validateAndSanitizeInput } from '@/shared/utils/validation';
import { MAX_TITLE_LENGTH, DEFAULT_PAGE_SIZE } from '@/shared/constants/validation';
import type { UserInfo } from '@/features/auth/types/auth';
import CommentSection from '@/components/comment/CommentSection';

const RichTextEditor = dynamic(() => import('@/shared/ui/editor/RichTextEditor'), {
  ssr: false,
  loading: () => <Box sx={{ minHeight: 300 }} />,
});

export default function InquiryPage() {
  const router = useRouter();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const responsive = useResponsive();
  const isMobile = isClient ? responsive.isMobile : false;
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [writeDialogOpen, setWriteDialogOpen] = useState(false);
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const userInfo = useMemo<UserInfo | null>(() => {
    if (!isClient) return null;
    const storedUserInfo = localStorage.getItem('userInfo');
    if (!storedUserInfo) return null;

    try {
      return JSON.parse(storedUserInfo) as UserInfo;
    } catch (error) {
      logger.error('사용자 정보 파싱 실패', error);
      return null;
    }
  }, [isClient]);
  const isAdmin = useMemo(
    () => userInfo?.roles?.some((role) => role.role_id === 'RL0001') || false,
    [userInfo],
  );
  const canUseInquiryApi = isClient && isAuthenticated();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });

  const [answerData, setAnswerData] = useState({
    answer: '',
  });

  // 1대1문의 목록 조회
  const inquiryListQuery = useInquiryList(
    { page, limit, status: statusFilter === 'ALL' ? undefined : statusFilter },
    {
      enabled: canUseInquiryApi,
      refetchOnWindowFocus: false,
    },
  );

  // 1대1문의 상세 조회
  const inquiryDetailQuery = useInquiryDetail(selectedInquiryId || '', {
    enabled: canUseInquiryApi && !!selectedInquiryId && (detailDialogOpen || answerDialogOpen),
  });

  // 1대1문의 작성 Mutation
  const saveInquiryMutation = useSaveInquiry({
    onSuccess: (res) => {
      if (isApiSuccess(res)) {
        showToast.success(getApiResultMessage(res, '문의가 등록되었습니다.'));
        setWriteDialogOpen(false);
        setFormData({ title: '', content: '' });
        inquiryListQuery.refetch();
      } else {
        showToast.error(getApiResultMessage(res, '문의 등록에 실패했습니다.'));
      }
    },
    onError: (error: Error) => {
      logger.error('문의 등록 실패', error);
      showToast.error(handleApiError(error).message || '문의 등록에 실패했습니다.');
    },
  });

  // 1대1문의 답변 Mutation
  const answerInquiryMutation = useAnswerInquiry({
    onSuccess: (res) => {
      if (isApiSuccess(res)) {
        showToast.success(getApiResultMessage(res, '답변이 등록되었습니다.'));
        setAnswerDialogOpen(false);
        setAnswerData({ answer: '' });
        setSelectedInquiryId(null);
        inquiryListQuery.refetch();
        inquiryDetailQuery.refetch();
      } else {
        showToast.error(getApiResultMessage(res, '답변 등록에 실패했습니다.'));
      }
    },
    onError: (error: Error) => {
      logger.error('답변 등록 실패', error);
      showToast.error(handleApiError(error).message || '답변 등록에 실패했습니다.');
    },
  });

  // 1대1문의 삭제 Mutation
  const deleteInquiryMutation = useDeleteInquiry({
    onSuccess: (res) => {
      if (isApiSuccess(res)) {
        showToast.success(getApiResultMessage(res, '문의가 삭제되었습니다.'));
        setDeleteDialogOpen(false);
        setSelectedInquiryId(null);
        inquiryListQuery.refetch();
      } else {
        showToast.error(getApiResultMessage(res, '문의 삭제에 실패했습니다.'));
      }
    },
    onError: (error: Error) => {
      logger.error('문의 삭제 실패', error);
      showToast.error(handleApiError(error).message || '문의 삭제에 실패했습니다.');
    },
  });

  const handleOpenDetail = (inquiryId: string) => {
    setSelectedInquiryId(inquiryId);
    setDetailDialogOpen(true);
  };

  const handleOpenWrite = () => {
    setFormData({ title: '', content: '' });
    setWriteDialogOpen(true);
  };

  const handleOpenAnswer = (inquiryId: string) => {
    setSelectedInquiryId(inquiryId);
    setAnswerData({ answer: '' });
    setAnswerDialogOpen(true);
  };

  const handleOpenDelete = (inquiryId: string) => {
    setSelectedInquiryId(inquiryId);
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    try {
      const sanitizedTitle = validateAndSanitizeInput(formData.title.trim(), MAX_TITLE_LENGTH);
      if (!sanitizedTitle) {
        showToast.error('제목을 입력해주세요.');
        return;
      }

      const sanitizedContent = formData.content.trim();
      if (!sanitizedContent || sanitizedContent === '<p><br></p>') {
        showToast.error('내용을 입력해주세요.');
        return;
      }

      saveInquiryMutation.mutate({
        title: sanitizedTitle,
        content: sanitizedContent, // 이미 sanitize된 상태
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '입력값 검증에 실패했습니다.';
      showToast.error(errorMessage);
    }
  };

  const handleAnswer = () => {
    const sanitizedAnswer = answerData.answer.trim();
    if (!sanitizedAnswer || sanitizedAnswer === '<p><br></p>') {
      showToast.error('답변을 입력해주세요.');
      return;
    }
    if (!selectedInquiryId) return;

    answerInquiryMutation.mutate({
      inquiry_id: selectedInquiryId,
      answer: answerData.answer.trim(), // 이미 sanitize된 상태
    });
  };

  const handleDelete = () => {
    if (!selectedInquiryId) return;
    deleteInquiryMutation.mutate({ inquiry_id: selectedInquiryId });
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const canDelete = (inquiry: { user_id?: string }) => {
    if (isAdmin) return true;
    return inquiry.user_id === userInfo?.user_id;
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2 } }}>
      <Box 
        sx={{ 
          mb: { xs: 2, md: 4 }, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 }, width: { xs: '100%', sm: 'auto' } }}>
          <Button 
            variant="outlined" 
            onClick={() => router.push('/')} 
            startIcon={<ArrowBackIcon />}
            size={isClient && isMobile ? 'small' : 'medium'}
            sx={{ flexShrink: 0 }}
          >
            목록
          </Button>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1.5rem', md: '2.125rem' },
            }}
          >
            1대1 문의
          </Typography>
        </Box>
        <Box 
          sx={{ 
            display: 'flex', 
            gap: { xs: 1, md: 2 }, 
            alignItems: 'center',
            width: { xs: '100%', sm: 'auto' },
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <FormControl 
            size="small" 
            sx={{ 
              minWidth: { xs: '100%', sm: 120 },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            <InputLabel>상태</InputLabel>
            <Select
              value={statusFilter}
              label="상태"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="ALL">전체</MenuItem>
              <MenuItem value="PENDING">답변 대기</MenuItem>
              <MenuItem value="ANSWERED">답변 완료</MenuItem>
            </Select>
          </FormControl>
          <Button 
            variant="contained" 
            onClick={handleOpenWrite} 
            startIcon={<AddIcon />}
            size={isClient && isMobile ? 'small' : 'medium'}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            문의하기
          </Button>
        </Box>
      </Box>

      {inquiryListQuery.isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : inquiryListQuery.error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          문의 목록을 불러오는 중 오류가 발생했습니다.
        </Alert>
      ) : inquiryListQuery.data && inquiryListQuery.data.list && inquiryListQuery.data.list.length > 0 ? (
        <>
          {!isClient ? (
            // 서버 사이드: 데스크톱 레이아웃 (테이블)
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ width: 80 }}>
                      번호
                    </TableCell>
                    <TableCell align="center">제목</TableCell>
                    <TableCell align="center" sx={{ width: 120 }}>
                      작성자
                    </TableCell>
                    <TableCell align="center" sx={{ width: 120 }}>
                      상태
                    </TableCell>
                    <TableCell align="center" sx={{ width: 150 }}>
                      작성일
                    </TableCell>
                    <TableCell align="center" sx={{ width: 120 }}>
                      관리
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inquiryListQuery.data.list.map((inquiry, index) => (
                    <TableRow key={inquiry.inquiry_id} hover>
                      <TableCell align="center">
                        {inquiryListQuery.data.total - (page - 1) * limit - index}
                      </TableCell>
                      <TableCell
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleOpenDetail(inquiry.inquiry_id || '')}
                      >
                        <Typography variant="body2">{inquiry.title}</Typography>
                      </TableCell>
                      <TableCell align="center">{inquiry.user_name || '-'}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={inquiry.status === 'ANSWERED' ? '답변 완료' : '답변 대기'}
                          color={inquiry.status === 'ANSWERED' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">-</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDetail(inquiry.inquiry_id || '')}
                            title="상세보기"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : isMobile ? (
            // 모바일: 카드 형식
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {inquiryListQuery.data.list.map((inquiry) => (
                <Card
                  key={inquiry.inquiry_id}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 2,
                    },
                  }}
                  onClick={() => handleOpenDetail(inquiry.inquiry_id || '')}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 500,
                            fontSize: '0.9375rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            mb: 1,
                          }}
                        >
                          {inquiry.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip
                            label={inquiry.status === 'ANSWERED' ? '답변 완료' : '답변 대기'}
                            color={inquiry.status === 'ANSWERED' ? 'success' : 'warning'}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        </Box>
                      </Box>
                      <Box
                        onClick={(e) => e.stopPropagation()}
                        sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}
                      >
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDetail(inquiry.inquiry_id || '')}
                          title="상세보기"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        {isAdmin && inquiry.status === 'PENDING' && (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleOpenAnswer(inquiry.inquiry_id || '')}
                            title="답변하기"
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        )}
                        {canDelete(inquiry) && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenDelete(inquiry.inquiry_id || '')}
                            title="삭제"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1.5,
                        mt: 1.5,
                        pt: 1.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        작성자: {inquiry.user_name || '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {isClient && inquiry.crt_date
                          ? new Date(inquiry.crt_date).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })
                          : '-'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            // 데스크톱: 테이블 형식
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ width: 80 }}>
                      번호
                    </TableCell>
                    <TableCell align="center">제목</TableCell>
                    <TableCell align="center" sx={{ width: 120 }}>
                      작성자
                    </TableCell>
                    <TableCell align="center" sx={{ width: 120 }}>
                      상태
                    </TableCell>
                    <TableCell align="center" sx={{ width: 150 }}>
                      작성일
                    </TableCell>
                    <TableCell align="center" sx={{ width: 120 }}>
                      관리
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inquiryListQuery.data.list.map((inquiry, index) => (
                    <TableRow key={inquiry.inquiry_id} hover>
                      <TableCell align="center">
                        {inquiryListQuery.data.total - (page - 1) * limit - index}
                      </TableCell>
                      <TableCell
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleOpenDetail(inquiry.inquiry_id || '')}
                      >
                        <Typography variant="body2">{inquiry.title}</Typography>
                      </TableCell>
                      <TableCell align="center">{inquiry.user_name || '-'}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={inquiry.status === 'ANSWERED' ? '답변 완료' : '답변 대기'}
                          color={inquiry.status === 'ANSWERED' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {isClient && inquiry.crt_date
                          ? new Date(inquiry.crt_date).toLocaleDateString('ko-KR')
                          : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDetail(inquiry.inquiry_id || '')}
                            title="상세보기"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          {isAdmin && inquiry.status === 'PENDING' && (
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleOpenAnswer(inquiry.inquiry_id || '')}
                              title="답변하기"
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          )}
                          {canDelete(inquiry) && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDelete(inquiry.inquiry_id || '')}
                              title="삭제"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {inquiryListQuery.data.total > limit && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 3, md: 4 } }}>
              <Pagination
                count={Math.ceil(inquiryListQuery.data.total / limit)}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size={isClient && isMobile ? 'small' : 'medium'}
              />
            </Box>
          )}
        </>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              등록된 문의가 없습니다.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* 상세 보기 다이얼로그 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">문의 상세</Typography>
            <IconButton onClick={() => setDetailDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {inquiryDetailQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : inquiryDetailQuery.data ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                {inquiryDetailQuery.data.title}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ mb: 2, display: 'flex', gap: 2, color: 'text.secondary' }}>
                <Typography variant="body2">작성자: {inquiryDetailQuery.data.user_name || '-'}</Typography>
                <Typography variant="body2">
                  작성일: {isClient && inquiryDetailQuery.data.crt_date
                    ? new Date(inquiryDetailQuery.data.crt_date).toLocaleString('ko-KR')
                    : '-'}
                </Typography>
                <Chip
                  label={inquiryDetailQuery.data.status === 'ANSWERED' ? '답변 완료' : '답변 대기'}
                  color={inquiryDetailQuery.data.status === 'ANSWERED' ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
              <Divider sx={{ my: 2 }} />
              <RichTextDisplay
                content={inquiryDetailQuery.data.content || ''}
                sx={{
                  minHeight: 100,
                  lineHeight: 1.8,
                  mb: 3,
                }}
              />
              {inquiryDetailQuery.data.answer && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      답변
                    </Typography>
                    <RichTextDisplay
                      content={inquiryDetailQuery.data.answer || ''}
                      sx={{
                        lineHeight: 1.8,
                      }}
                    />
                    {inquiryDetailQuery.data.answer_user_name && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        답변자: {inquiryDetailQuery.data.answer_user_name} | 답변일:{' '}
                        {isClient && inquiryDetailQuery.data.answer_date
                          ? new Date(inquiryDetailQuery.data.answer_date).toLocaleString('ko-KR')
                          : '-'}
                      </Typography>
                    )}
                  </Box>
                </>
              )}
              {isAdmin && inquiryDetailQuery.data.status === 'PENDING' && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => {
                      setDetailDialogOpen(false);
                      handleOpenAnswer(inquiryDetailQuery.data?.inquiry_id || '');
                    }}
                  >
                    답변하기
                  </Button>
                </Box>
              )}
              <Divider sx={{ my: 3 }} />
              <CommentSection
                boardType="INQUIRY"
                boardId={selectedInquiryId || ''}
                userInfo={userInfo || undefined}
              />
            </Box>
          ) : (
            <Alert severity="error">문의를 불러올 수 없습니다.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 작성 다이얼로그 */}
      <Dialog open={writeDialogOpen} onClose={() => setWriteDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">문의하기</Typography>
            <IconButton onClick={() => setWriteDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="제목"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
              disabled={saveInquiryMutation.isPending}
            />
            <Box>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="내용을 입력하세요..."
                minHeight={300}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWriteDialogOpen(false)} disabled={saveInquiryMutation.isPending}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saveInquiryMutation.isPending || !formData.title.trim() || !formData.content.trim() || formData.content === '<p><br></p>'}
          >
            {saveInquiryMutation.isPending ? '등록 중...' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 답변 다이얼로그 */}
      <Dialog open={answerDialogOpen} onClose={() => setAnswerDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">답변하기</Typography>
            <IconButton onClick={() => setAnswerDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {inquiryDetailQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : inquiryDetailQuery.data ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                문의 내용
              </Typography>
              <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1, mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  {inquiryDetailQuery.data.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.8,
                  }}
                >
                  {inquiryDetailQuery.data.content}
                </Typography>
              </Box>
              <Box>
                <RichTextEditor
                  value={answerData.answer}
                  onChange={(value) => setAnswerData({ answer: value })}
                  placeholder="답변을 입력하세요..."
                  minHeight={250}
                />
              </Box>
            </Box>
          ) : (
            <Alert severity="error">문의를 불러올 수 없습니다.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnswerDialogOpen(false)} disabled={answerInquiryMutation.isPending}>
            취소
          </Button>
          <Button
            onClick={handleAnswer}
            variant="contained"
            color="success"
            disabled={answerInquiryMutation.isPending || !answerData.answer.trim() || answerData.answer === '<p><br></p>'}
          >
            {answerInquiryMutation.isPending ? '답변 중...' : '답변 등록'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>문의 삭제</DialogTitle>
        <DialogContent>
          <Typography>정말로 이 문의를 삭제하시겠습니까?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteInquiryMutation.isPending}>
            취소
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={deleteInquiryMutation.isPending}
          >
            {deleteInquiryMutation.isPending ? '삭제 중...' : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

