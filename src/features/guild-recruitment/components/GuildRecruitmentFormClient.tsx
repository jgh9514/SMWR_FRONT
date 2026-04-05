'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { PageBanner, PageHeader } from '@/shared/ui';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import { isAuthenticated } from '@/shared/utils/auth';
import {
  useGuildRecruitmentDetail,
  useSaveGuildRecruitment,
} from '@/features/guild-recruitment/hooks/useGuildRecruitment';

type Props = {
  postId?: string;
};

export default function GuildRecruitmentFormClient({ postId }: Props) {
  const router = useRouter();
  const isEdit = !!postId;

  const [guildName, setGuildName] = useState('');
  const [serverName, setServerName] = useState('');
  const [lastSeasonGrade, setLastSeasonGrade] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  const detailQuery = useGuildRecruitmentDetail(postId, {
    enabled: isEdit,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const d = detailQuery.data;
    if (!d || !isEdit) return;
    setGuildName(d.guild_name ?? '');
    setServerName(d.server_name ?? '');
    setLastSeasonGrade(d.last_season_grade ?? '');
    setContent(d.content ?? '');
  }, [detailQuery.data, isEdit]);

  const saveMutation = useSaveGuildRecruitment({
    onSuccess: (res) => {
      if (res?.result === 'SUCCESS') {
        showToast.success(isEdit ? '수정되었습니다.' : '등록되었습니다.');
        const id = res.post_id ?? postId;
        if (id != null) {
          router.push(`/guild-recruitment/${id}`);
        } else {
          router.push('/guild-recruitment');
        }
      } else {
        showToast.error(res?.message || '저장에 실패했습니다.');
      }
    },
    onError: (err: Error) => {
      logger.error('guild recruitment save', err);
      showToast.error(err.message || '저장에 실패했습니다.');
    },
  });

  const handleSubmit = () => {
    if (!guildName.trim() || !serverName.trim() || !lastSeasonGrade.trim() || !content.trim()) {
      showToast.error('모든 항목을 입력해 주세요.');
      return;
    }
    saveMutation.mutate({
      ...(isEdit && postId ? { post_id: postId } : {}),
      guild_name: guildName.trim(),
      server_name: serverName.trim(),
      last_season_grade: lastSeasonGrade.trim(),
      content: content.trim(),
    });
  };

  if (isEdit && detailQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isEdit && (detailQuery.isError || !detailQuery.data)) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="text.secondary">글을 불러올 수 없습니다.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => router.push('/guild-recruitment')}>
          목록으로
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 2, md: 6 } }}>
      <PageBanner />
      <Container sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, md: 3 }, maxWidth: 720 }}>
        <PageHeader title={isEdit ? '길드원 모집 수정' : '길드원 모집 작성'} backPath="/guild-recruitment" />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="길드명"
            value={guildName}
            onChange={(e) => setGuildName(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="서버"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            required
            fullWidth
            placeholder="예: 글로벌, 아시아, 유럽 등"
          />
          <TextField
            label="전시즌 등급"
            value={lastSeasonGrade}
            onChange={(e) => setLastSeasonGrade(e.target.value)}
            required
            fullWidth
            placeholder="예: 레전드, 히어로 등"
          />
          <TextField
            label="모집 내용"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            fullWidth
            multiline
            minRows={8}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => router.push('/guild-recruitment')}>
              취소
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={saveMutation.isPending}>
              {isEdit ? '수정' : '등록'}
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
