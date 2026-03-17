'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { apiClient } from '@/shared/lib/api/client';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import {
  useNoticeList,
  useSaveNotice,
  useDeleteNotice,
} from '@/hooks/api';
import type { Notice, NoticeListResponse } from '@/features/community/types/community';
import type { UserInfo } from '@/features/auth/types/auth';
import { validateAndSanitizeInput } from '@/shared/utils/validation';
import { DEFAULT_PAGE_SIZE, MAX_TITLE_LENGTH } from '@/shared/constants/validation';
import NoticeAdminControls from './NoticeAdminControls';

const RichTextEditor = dynamic(() => import('@/shared/ui/editor/RichTextEditor'), {
  ssr: false,
  loading: () => <Box sx={{ minHeight: 300 }} />,
});

interface NoticeBoardClientProps {
  initialData: NoticeListResponse;
}

const getStoredUserInfo = (): UserInfo | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedUserInfo = localStorage.getItem('userInfo');
  if (!storedUserInfo) {
    return null;
  }

  try {
    return JSON.parse(storedUserInfo) as UserInfo;
  } catch (error) {
    logger.error('사용자 정보 파싱 실패', error);
    return null;
  }
};

export default function NoticeBoardClient({
  initialData,
}: NoticeBoardClientProps) {
  const router = useRouter();
  const [page, setPage] = useState(initialData.page || 1);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditPrefilling, setIsEditPrefilling] = useState(false);
  const [userInfo] = useState<UserInfo | null>(() => getStoredUserInfo());
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_important: false,
    is_popup: false,
  });

  const limit = initialData.limit || DEFAULT_PAGE_SIZE;
  const isAdmin = useMemo(() => {
    return userInfo?.roles?.some((role) => role.role_id === 'RL0001') ?? false;
  }, [userInfo]);

  const noticeListQuery = useNoticeList(
    { page, limit },
    {
      refetchOnWindowFocus: false,
      initialData: page === (initialData.page || 1) ? initialData : undefined,
    },
  );

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
    router.push(`/notice/${noticeId}`);
  };

  const handleOpenEdit = async (notice?: Notice) => {
    if (!notice?.notice_id) {
      setSelectedNoticeId(null);
      setFormData({ title: '', content: '', is_important: false, is_popup: false });
      setEditDialogOpen(true);
      return;
    }

    setSelectedNoticeId(notice.notice_id);
    setEditDialogOpen(true);
    setIsEditPrefilling(true);

    try {
      const detail = await apiClient.post<Notice>('/community/notice/detail', {
        notice_id: notice.notice_id,
      });

      setFormData({
        title: detail.title || '',
        content: detail.content || '',
        is_important: detail.is_important || false,
        is_popup: detail.is_popup || false,
      });
    } catch (error) {
      logger.error('공지사항 상세 조회 실패', error);
      showToast.error('공지사항 상세를 불러오지 못했습니다.');
      setEditDialogOpen(false);
    } finally {
      setIsEditPrefilling(false);
    }
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
        content: sanitizedContent,
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

  const noticeList = noticeListQuery.data?.list ?? [];
  const totalCount = noticeListQuery.data?.total ?? 0;

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
        <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            최신 공지와 운영 소식을 빠르게 확인할 수 있습니다.
          </Typography>
        </Box>
        <NoticeAdminControls
          isAdmin={isAdmin}
          mode="toolbar"
          onCreate={() => {
            void handleOpenEdit();
          }}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
        />
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
      ) : noticeList.length > 0 ? (
        <>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
            {noticeList.map((notice) => (
              <Card
                key={notice.notice_id}
                variant="outlined"
                sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 } }}
                onClick={() => handleOpenDetail(notice.notice_id || '')}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                      {notice.is_important && <Chip label="중요" color="error" size="small" sx={{ flexShrink: 0 }} />}
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: notice.is_important ? 600 : 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {notice.title}
                      </Typography>
                    </Box>
                    <Box onClick={(event) => event.stopPropagation()}>
                      <NoticeAdminControls
                        isAdmin={isAdmin}
                        mode="row"
                        notice={notice}
                        onEdit={handleOpenEdit}
                        onDelete={handleOpenDelete}
                      />
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
                    <Typography variant="caption" color="text.secondary">
                      작성자: {notice.user_name || '-'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      조회수: {notice.view_count || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notice.crt_date ? new Date(notice.crt_date).toLocaleDateString('ko-KR') : '-'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
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
                  {noticeList.map((notice, index) => (
                    <TableRow
                      key={notice.notice_id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleOpenDetail(notice.notice_id || '')}
                    >
                      <TableCell align="center">
                        {totalCount - (page - 1) * limit - index}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {notice.is_important && <Chip label="중요" color="error" size="small" />}
                          <Typography variant="body2" sx={{ fontWeight: notice.is_important ? 600 : 400 }}>
                            {notice.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">{notice.user_name || '-'}</TableCell>
                      <TableCell align="center">{notice.view_count || 0}</TableCell>
                      <TableCell align="center">
                        {notice.crt_date ? new Date(notice.crt_date).toLocaleDateString('ko-KR') : '-'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="center" onClick={(event) => event.stopPropagation()}>
                          <NoticeAdminControls
                            isAdmin={isAdmin}
                            mode="row"
                            notice={notice}
                            onEdit={handleOpenEdit}
                            onDelete={handleOpenDelete}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {totalCount > limit && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 3, md: 4 } }}>
              <Pagination
                count={Math.ceil(totalCount / limit)}
                page={page}
                onChange={(_event, value) => setPage(value)}
                color="primary"
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
              onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              fullWidth
              required
              disabled={saveNoticeMutation.isPending || isEditPrefilling}
            />
            {isEditPrefilling ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="내용을 입력하세요..."
                minHeight={300}
              />
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  type="checkbox"
                  id="is_important"
                  checked={formData.is_important}
                  onChange={(event) => setFormData({ ...formData, is_important: event.target.checked })}
                  disabled={saveNoticeMutation.isPending || isEditPrefilling}
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
                  onChange={(event) => setFormData({ ...formData, is_popup: event.target.checked })}
                  disabled={saveNoticeMutation.isPending || isEditPrefilling}
                />
                <label htmlFor="is_popup">
                  <Typography variant="body2">팝업으로 표시</Typography>
                </label>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saveNoticeMutation.isPending || isEditPrefilling}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={
              isEditPrefilling ||
              saveNoticeMutation.isPending ||
              !formData.title.trim() ||
              !formData.content.trim() ||
              formData.content === '<p><br></p>'
            }
          >
            {saveNoticeMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogActions>
      </Dialog>

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
