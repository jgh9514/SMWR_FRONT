'use client';

import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
  CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useState, useMemo } from 'react';
import { PageBanner, PageHeader } from '@/shared/ui';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import {
  useGuildRecruitmentDetail,
  useDeleteGuildRecruitment,
} from '@/features/guild-recruitment/hooks/useGuildRecruitment';
import type { UserInfo } from '@/features/auth/types/auth';

function getStoredUserInfo(): UserInfo | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('userInfo');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch (e) {
    logger.error('userInfo parse', e);
    return null;
  }
}

function formatPostedAt(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR');
}

type Props = { postId: string };

export default function GuildRecruitmentDetailClient({ postId }: Props) {
  const router = useRouter();
  const [userInfo] = useState<UserInfo | null>(() => getStoredUserInfo());
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, isError } = useGuildRecruitmentDetail(postId, {
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useDeleteGuildRecruitment({
    onSuccess: (res) => {
      if (res?.result === 'SUCCESS') {
        showToast.success('삭제되었습니다.');
        router.push('/guild-recruitment');
      } else {
        showToast.error(res?.message || '삭제에 실패했습니다.');
      }
    },
    onError: (err: Error) => {
      logger.error('guild recruitment delete', err);
      showToast.error(err.message || '삭제에 실패했습니다.');
    },
  });

  const isOwner = useMemo(() => {
    if (!data?.user_id || !userInfo?.user_id) return false;
    return String(data.user_id) === String(userInfo.user_id);
  }, [data?.user_id, userInfo?.user_id]);

  const isAdmin = useMemo(
    () => userInfo?.roles?.some((r) => r.role_id === 'RL0001') ?? false,
    [userInfo?.roles],
  );

  const canEdit = isOwner || isAdmin;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="text.secondary">글을 찾을 수 없습니다.</Typography>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => router.push('/guild-recruitment')}>
          목록으로
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 2, md: 6 } }}>
      <PageBanner />
      <Container sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, md: 3 } }}>
        <PageHeader
          title={data.guild_name}
          backPath="/guild-recruitment"
          actions={
            canEdit ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => router.push(`/guild-recruitment/${postId}/edit`)}
                >
                  수정
                </Button>
                <Button
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => setDeleteOpen(true)}
                >
                  삭제
                </Button>
              </Box>
            ) : null
          }
        />
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            서버: <strong>{data.server_name}</strong>
            {' · '}
            전시즌 등급: <strong>{data.last_season_grade}</strong>
            {' · '}
            {formatPostedAt(data.crt_date)}
            {data.user_name ? ` · ${data.user_name}` : ''}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, whiteSpace: 'pre-wrap' }}>
          <Typography component="div" variant="body1">
            {data.content || ''}
          </Typography>
        </Paper>
      </Container>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>삭제 확인</DialogTitle>
        <DialogContent>이 글을 삭제할까요?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>취소</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate({ post_id: data.post_id })}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
