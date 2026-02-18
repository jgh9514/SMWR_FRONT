'use client';

import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import {
  useNoticeList,
  useNoticeDetail,
  useSaveNotice,
  useDeleteNotice,
  useIncreaseNoticeView,
} from '@/hooks/api';
import type { Notice } from '@/features/community/types/community';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { RichTextDisplay } from '@/shared/ui/editor/RichTextDisplay';
import { validateAndSanitizeInput } from '@/shared/utils/validation';
import { MAX_TITLE_LENGTH, DEFAULT_PAGE_SIZE } from '@/shared/constants/validation';
import type { UserInfo } from '@/features/auth/types/auth';
import CommentSection from '@/components/comment/CommentSection';

const RichTextEditor = dynamic(() => import('@/shared/ui/editor/RichTextEditor'), {
  ssr: false,
  loading: () => <Box sx={{ minHeight: 300 }} />,
});

export default function NoticePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const responsive = useResponsive();
  const isMobile = isMounted ? responsive.isMobile : false;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [limit] = useState(DEFAULT_PAGE_SIZE);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_important: false,
    is_popup: false,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        try {
          const parsed = JSON.parse(storedUserInfo);
          setUserInfo(parsed);
          setIsAdmin(parsed.roles?.some((role: { role_id: string }) => role.role_id === 'RL0001') || false);
        } catch (error) {
          logger.error('사용자 정보 파싱 실패', error);
        }
      }
    }
  }, []);

  // 공지사항 목록 조회
  const noticeListQuery = useNoticeList(
    { page, limit },
    {
      refetchOnWindowFocus: false,
    },
  );

  // 조회수 증가 Mutation
  const increaseViewMutation = useIncreaseNoticeView();

  // 공지사항 상세 조회
  const noticeDetailQuery = useNoticeDetail(selectedNoticeId || '', {
    enabled: !!selectedNoticeId && detailDialogOpen,
    onSuccess: (data: Notice) => {
      if (data && selectedNoticeId) {
        // 조회수 증가
        increaseViewMutation.mutate({ notice_id: selectedNoticeId });
      }
    },
  });

  // 공지사항 저장 Mutation
  const saveNoticeMutation = useSaveNotice({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success(selectedNoticeId ? '공지사항이 수정되었습니다.' : '공지사항이 등록되었습니다.');
        setEditDialogOpen(false);
        setFormData({ title: '', content: '', is_important: false, is_popup: false });
        setSelectedNoticeId(null);
        noticeListQuery.refetch();
      } else {
        throw new Error(res.message || '공지사항 저장에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('공지사항 저장 실패', error);
      showToast.error(error.message || '공지사항 저장에 실패했습니다.');
    },
  });

  // 공지사항 삭제 Mutation
  const deleteNoticeMutation = useDeleteNotice({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('공지사항이 삭제되었습니다.');
        setDeleteDialogOpen(false);
        setSelectedNoticeId(null);
        noticeListQuery.refetch();
      } else {
        throw new Error(res.message || '공지사항 삭제에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('공지사항 삭제 실패', error);
      showToast.error(error.message || '공지사항 삭제에 실패했습니다.');
    },
  });

  const handleOpenDetail = (noticeId: string) => {
    setSelectedNoticeId(noticeId);
    setDetailDialogOpen(true);
  };

  const handleOpenEdit = (notice?: { notice_id?: string; title?: string; content?: string; is_important?: boolean; is_popup?: boolean }) => {
    if (notice) {
      setSelectedNoticeId(notice.notice_id || null);
      setFormData({
        title: notice.title || '',
        content: notice.content || '',
        is_important: notice.is_important || false,
        is_popup: notice.is_popup || false,
      });
    } else {
      setSelectedNoticeId(null);
      setFormData({ title: '', content: '', is_important: false, is_popup: false });
    }
    setEditDialogOpen(true);
  };

  const handleOpenDelete = (noticeId: string) => {
    setSelectedNoticeId(noticeId);
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

      saveNoticeMutation.mutate({
        notice_id: selectedNoticeId || undefined,
        title: sanitizedTitle,
        content: sanitizedContent, // 이미 sanitize된 상태
        is_important: formData.is_important,
        is_popup: formData.is_popup,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '입력값 검증에 실패했습니다.';
      showToast.error(errorMessage);
    }
  };

  const handleDelete = () => {
    if (!selectedNoticeId) return;
    deleteNoticeMutation.mutate({ notice_id: selectedNoticeId });
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
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
            size={isMobile ? 'small' : 'medium'}
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
            공지사항
          </Typography>
        </Box>
        {isAdmin && (
          <Button 
            variant="contained" 
            onClick={() => handleOpenEdit()} 
            startIcon={<AddIcon />}
            size={isMobile ? 'small' : 'medium'}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            공지사항 작성
          </Button>
        )}
      </Box>

      {noticeListQuery.isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : noticeListQuery.error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          공지사항을 불러오는 중 오류가 발생했습니다.
          {noticeListQuery.error instanceof Error && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {noticeListQuery.error.message}
            </Typography>
          )}
        </Alert>
      ) : noticeListQuery.data && noticeListQuery.data.list && noticeListQuery.data.list.length > 0 ? (
        <>
          {isMobile ? (
            // 모바일: 카드 형식
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {noticeListQuery.data.list.map((notice, index) => (
                <Card
                  key={notice.notice_id}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 2,
                    },
                  }}
                  onClick={() => handleOpenDetail(notice.notice_id || '')}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                        {notice.is_important && (
                          <Chip label="중요" color="error" size="small" sx={{ flexShrink: 0 }} />
                        )}
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: notice.is_important ? 600 : 500,
                            fontSize: '0.9375rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {notice.title}
                        </Typography>
                      </Box>
                      {isAdmin && (
                        <Box
                          onClick={(e) => e.stopPropagation()}
                          sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}
                        >
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenEdit(notice)}
                            title="수정"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenDelete(notice.notice_id || '')}
                            title="삭제"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
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
                        작성자: {notice.user_name || '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        조회수: {notice.view_count || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {isMounted && notice.crt_date
                          ? new Date(notice.crt_date).toLocaleDateString('ko-KR', {
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
                      조회수
                    </TableCell>
                    <TableCell align="center" sx={{ width: 150 }}>
                      작성일
                    </TableCell>
                    {isAdmin && (
                      <TableCell align="center" sx={{ width: 120 }}>
                        관리
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {noticeListQuery.data.list.map((notice, index) => (
                    <TableRow
                      key={notice.notice_id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleOpenDetail(notice.notice_id || '')}
                    >
                      <TableCell align="center">
                        {noticeListQuery.data.total - (page - 1) * limit - index}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {notice.is_important && (
                            <Chip label="중요" color="error" size="small" />
                          )}
                          <Typography variant="body2" sx={{ fontWeight: notice.is_important ? 600 : 400 }}>
                            {notice.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">{notice.user_name || '-'}</TableCell>
                      <TableCell align="center">{notice.view_count || 0}</TableCell>
                      <TableCell align="center">
                        {isMounted && notice.crt_date
                          ? new Date(notice.crt_date).toLocaleDateString('ko-KR')
                          : '-'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenEdit(notice)}
                              title="수정"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDelete(notice.notice_id || '')}
                              title="삭제"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {noticeListQuery.data.total > limit && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 3, md: 4 } }}>
              <Pagination
                count={Math.ceil(noticeListQuery.data.total / limit)}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size={isMobile ? 'small' : 'medium'}
              />
            </Box>
          )}
        </>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              등록된 공지사항이 없습니다.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* 상세 보기 다이얼로그 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">공지사항 상세</Typography>
            <IconButton onClick={() => setDetailDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {noticeDetailQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : noticeDetailQuery.data ? (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                {noticeDetailQuery.data.is_important && (
                  <Chip label="중요" color="error" size="small" />
                )}
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {noticeDetailQuery.data.title}
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ mb: 2, display: 'flex', gap: 2, color: 'text.secondary' }}>
                <Typography variant="body2">작성자: {noticeDetailQuery.data.user_name || '-'}</Typography>
                <Typography variant="body2">
                  작성일: {isMounted && noticeDetailQuery.data.crt_date
                    ? new Date(noticeDetailQuery.data.crt_date).toLocaleString('ko-KR')
                    : '-'}
                </Typography>
                <Typography variant="body2">조회수: {noticeDetailQuery.data.view_count || 0}</Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <RichTextDisplay
                content={noticeDetailQuery.data.content || ''}
                sx={{
                  minHeight: 200,
                  lineHeight: 1.8,
                }}
              />
              <Divider sx={{ my: 3 }} />
              <CommentSection
                boardType="NOTICE"
                boardId={selectedNoticeId || ''}
                userInfo={userInfo || undefined}
              />
            </Box>
          ) : (
            <Alert severity="error">공지사항을 불러올 수 없습니다.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 작성/수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{selectedNoticeId ? '공지사항 수정' : '공지사항 작성'}</Typography>
            <IconButton onClick={() => setEditDialogOpen(false)} size="small">
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
              disabled={saveNoticeMutation.isPending}
            />
            <Box>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="내용을 입력하세요..."
                minHeight={300}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  type="checkbox"
                  id="is_important"
                  checked={formData.is_important}
                  onChange={(e) => setFormData({ ...formData, is_important: e.target.checked })}
                  disabled={saveNoticeMutation.isPending}
                />
                <label htmlFor="is_important">
                  <Typography variant="body2">중요 공지로 설정</Typography>
                </label>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  type="checkbox"
                  id="is_popup"
                  checked={formData.is_popup}
                  onChange={(e) => setFormData({ ...formData, is_popup: e.target.checked })}
                  disabled={saveNoticeMutation.isPending}
                />
                <label htmlFor="is_popup">
                  <Typography variant="body2">팝업으로 표시</Typography>
                </label>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saveNoticeMutation.isPending}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saveNoticeMutation.isPending || !formData.title.trim() || !formData.content.trim() || formData.content === '<p><br></p>'}
          >
            {saveNoticeMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>공지사항 삭제</DialogTitle>
        <DialogContent>
          <Typography>정말로 이 공지사항을 삭제하시겠습니까?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteNoticeMutation.isPending}>
            취소
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={deleteNoticeMutation.isPending}
          >
            {deleteNoticeMutation.isPending ? '삭제 중...' : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

