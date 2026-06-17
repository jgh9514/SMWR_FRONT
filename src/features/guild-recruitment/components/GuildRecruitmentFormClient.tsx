'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  FormLabel,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import { PageBanner, PageHeader } from '@/shared/ui';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import { getApiResultMessage, isApiSuccess } from '@/shared/lib/api/result';
import { isAuthenticated } from '@/shared/utils/auth';
import {
  useGuildRecruitmentDetail,
  useSaveGuildRecruitment,
  uploadGuildRecruitmentImage,
} from '@/features/guild-recruitment/hooks/useGuildRecruitment';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(
  () => import('@/shared/ui/editor/RichTextEditor'),
  { ssr: false, loading: () => <Box sx={{ height: 300, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={24} /></Box> },
);

type Props = {
  postId?: string;
};

export default function GuildRecruitmentFormClient({ postId }: Props) {
  const router = useRouter();
  const isEdit = !!postId;
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [guildName, setGuildName] = useState('');
  const [serverName, setServerName] = useState('');
  const [lastSeasonGrade, setLastSeasonGrade] = useState('');
  const [content, setContent] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

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
    queueMicrotask(() => {
      setGuildName(d.guild_name ?? '');
      setServerName(d.server_name ?? '');
      setLastSeasonGrade(d.last_season_grade ?? '');
      setContent(d.content ?? '');
      if (d.thumbnail_url) {
        setThumbnailUrl(d.thumbnail_url);
        setThumbnailPreview(d.thumbnail_url);
      }
    });
  }, [detailQuery.data, isEdit]);

  const saveMutation = useSaveGuildRecruitment({
    onSuccess: (res) => {
      if (isApiSuccess(res)) {
        showToast.success(getApiResultMessage(res, isEdit ? '수정되었습니다.' : '등록되었습니다.'));
        const saveRes = res as { post_id?: string | number };
        const id = saveRes.post_id ?? postId;
        if (id != null) {
          router.push(`/guild-recruitment/${id}`);
        } else {
          router.push('/guild-recruitment');
        }
      } else {
        showToast.error(getApiResultMessage(res, '저장에 실패했습니다.'));
      }
    },
    onError: (err: Error) => {
      logger.error('guild recruitment save', err);
      showToast.error(err.message || '저장에 실패했습니다.');
    },
  });

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showToast.error('JPG, PNG, WEBP, GIF 형식만 업로드 가능합니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast.error('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setThumbnailPreview(localPreview);
    setThumbnailUploading(true);

    try {
      const url = await uploadGuildRecruitmentImage(file);
      setThumbnailUrl(url);
      URL.revokeObjectURL(localPreview);
      setThumbnailPreview(url);
    } catch (err) {
      logger.error('thumbnail upload', err);
      showToast.error('썸네일 업로드에 실패했습니다.');
      setThumbnailPreview('');
      setThumbnailUrl('');
    } finally {
      setThumbnailUploading(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    }
  };

  const handleRemoveThumbnail = () => {
    setThumbnailUrl('');
    setThumbnailPreview('');
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (!guildName.trim() || !serverName.trim() || !lastSeasonGrade.trim()) {
      showToast.error('길드명, 서버, 전시즌 등급을 입력해 주세요.');
      return;
    }
    if (!content || content.trim() === '' || content === '<p></p>') {
      showToast.error('모집 내용을 입력해 주세요.');
      return;
    }
    saveMutation.mutate({
      ...(isEdit && postId ? { post_id: postId } : {}),
      guild_name: guildName.trim(),
      server_name: serverName.trim(),
      last_season_grade: lastSeasonGrade.trim(),
      thumbnail_url: thumbnailUrl || undefined,
      content,
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
      <Container sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, md: 3 }, maxWidth: 800 }}>
        <PageHeader title={isEdit ? '길드원 모집 수정' : '길드원 모집 작성'} backPath="/guild-recruitment" />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* 기본 정보 */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
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
              placeholder="예: 글로벌, 아시아, 유럽"
            />
            <TextField
              label="전시즌 등급"
              value={lastSeasonGrade}
              onChange={(e) => setLastSeasonGrade(e.target.value)}
              required
              fullWidth
              placeholder="예: 레전드, 히어로"
            />
          </Box>

          {/* 썸네일 업로드 */}
          <Box>
            <FormLabel sx={{ display: 'block', mb: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
              썸네일 이미지 (선택)
            </FormLabel>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              {thumbnailPreview ? (
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Box
                    component="img"
                    src={thumbnailPreview}
                    alt="썸네일 미리보기"
                    sx={{
                      width: 160,
                      height: 100,
                      objectFit: 'cover',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'block',
                    }}
                  />
                  {thumbnailUploading && (
                    <Box sx={{
                      position: 'absolute', inset: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      bgcolor: 'rgba(0,0,0,0.4)', borderRadius: 1,
                    }}>
                      <CircularProgress size={24} sx={{ color: 'white' }} />
                    </Box>
                  )}
                  {!thumbnailUploading && (
                    <IconButton
                      size="small"
                      onClick={handleRemoveThumbnail}
                      sx={{
                        position: 'absolute', top: -10, right: -10,
                        bgcolor: 'error.main', color: 'white',
                        width: 22, height: 22,
                        '&:hover': { bgcolor: 'error.dark' },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                </Box>
              ) : (
                <Box
                  onClick={() => thumbnailInputRef.current?.click()}
                  sx={{
                    width: 160, height: 100,
                    border: '2px dashed', borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 0.5, cursor: 'pointer',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    transition: 'all 0.2s',
                  }}
                >
                  <AddPhotoAlternateIcon sx={{ color: 'text.disabled', fontSize: 28 }} />
                  <Typography variant="caption" color="text.disabled">
                    이미지 선택
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddPhotoAlternateIcon />}
                  onClick={() => thumbnailInputRef.current?.click()}
                  disabled={thumbnailUploading}
                >
                  {thumbnailPreview ? '변경' : '업로드'}
                </Button>
                <Typography variant="caption" color="text.disabled">
                  JPG, PNG, WEBP, GIF · 최대 5MB
                </Typography>
              </Box>
            </Box>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleThumbnailChange}
            />
          </Box>

          {/* 본문 에디터 */}
          <Box>
            <FormLabel sx={{ display: 'block', mb: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
              모집 내용 <span style={{ color: 'red' }}>*</span>
            </FormLabel>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="길드 소개, 모집 조건, 지원 방법 등을 자유롭게 작성하세요."
              minHeight={320}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => router.push('/guild-recruitment')}>
              취소
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={saveMutation.isPending || thumbnailUploading}
            >
              {isEdit ? '수정' : '등록'}
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
