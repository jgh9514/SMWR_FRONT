'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { useSaveNotice } from '@/hooks/api';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import { getApiResultMessage, isApiSuccess } from '@/shared/lib/api/result';
import { handleApiError } from '@/shared/lib/error-handler';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import type { UserInfo } from '@/features/auth/types/auth';
import type { Notice } from '@/features/community/types/community';
import { validateAndSanitizeInput } from '@/shared/utils/validation';
import { MAX_TITLE_LENGTH } from '@/shared/constants/validation';
import NaverSmartEditor, { type NaverSmartEditorHandle } from '@/shared/ui/editor/NaverSmartEditor';

const getStoredUserInfo = (): UserInfo | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('userInfo');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
};

function isEmptySe2Html(html: string): boolean {
  const t = html.replace(/\s|&nbsp;/g, '').trim();
  if (!t) return true;
  const stripped = t.replace(/<br\s*\/?>/gi, '').replace(/<p>\s*<\/p>/gi, '');
  return stripped.length === 0;
}

interface NoticeFormClientProps {
  mode: 'create' | 'edit';
  noticeId?: string;
  initialNotice?: Notice | null;
}

export default function NoticeFormClient({ mode, noticeId, initialNotice }: NoticeFormClientProps) {
  const router = useRouter();
  const editorRef = useRef<NaverSmartEditorHandle>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [userInfo] = useState<UserInfo | null>(() => getStoredUserInfo());

  useEffect(() => {
    queueMicrotask(() => setEditorReady(false));
  }, [mode, noticeId]);
  const [title, setTitle] = useState(initialNotice?.title ?? '');
  const [isImportant, setIsImportant] = useState(initialNotice?.is_important ?? false);
  const [isPopup, setIsPopup] = useState(initialNotice?.is_popup ?? false);

  const isAdmin = useMemo(
    () => userInfo?.roles?.some((role) => role.role_id === 'RL0001') ?? false,
    [userInfo],
  );

  const saveNoticeMutation = useSaveNotice({
    onSuccess: (res) => {
      if (isApiSuccess(res)) {
        showToast.success(
          getApiResultMessage(
            res,
            mode === 'edit' ? '공지사항이 수정되었습니다.' : '공지사항이 등록되었습니다.',
          ),
        );
        router.push('/notice');
        router.refresh();
      } else {
        showToast.error(getApiResultMessage(res, '공지사항 저장에 실패했습니다.'));
      }
    },
    onError: (error: Error) => {
      logger.error('공지사항 저장 실패', error);
      showToast.error(handleApiError(error).message || '공지사항 저장에 실패했습니다.');
    },
  });

  const handleSubmit = () => {
    if (!isAdmin) {
      showToast.error('권한이 없습니다.');
      return;
    }
    try {
      const sanitizedTitle = validateAndSanitizeInput(title.trim(), MAX_TITLE_LENGTH);
      if (!sanitizedTitle) {
        showToast.error('제목을 입력해주세요.');
        return;
      }
      const rawHtml = editorRef.current?.getHtml() ?? '';
      if (isEmptySe2Html(rawHtml)) {
        showToast.error('내용을 입력해주세요.');
        return;
      }
      saveNoticeMutation.mutate({
        notice_id: mode === 'edit' ? noticeId : undefined,
        title: sanitizedTitle,
        content: rawHtml,
        is_important: isImportant,
        is_popup: isPopup,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '입력값 검증에 실패했습니다.';
      showToast.error(msg);
    }
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
        <PageHeader title="공지사항" backPath="/notice" />
        <Alert severity="info" sx={{ mt: 2 }}>
          관리자만 공지를 작성·수정할 수 있습니다. 필요한 경우 운영 계정으로 로그인한 뒤 다시 시도해 주세요.
        </Alert>
      </Container>
    );
  }

  const pageTitle = mode === 'edit' ? '공지사항 수정' : '공지사항 작성';
  const initialHtml = initialNotice?.content ?? '';

  const saveDisabled = saveNoticeMutation.isPending || !editorReady;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2 } }}>
      <PageHeader title={pageTitle} backPath="/notice" />
      <Paper
        elevation={0}
        sx={{
          mt: 2,
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={3}>
          <TextField
            label="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            disabled={saveNoticeMutation.isPending}
            inputProps={{ maxLength: MAX_TITLE_LENGTH, 'aria-label': '공지 제목' }}
            helperText={
              <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                <span>목록과 상세 화면에 표시되는 제목입니다.</span>
                <span>{title.length} / {MAX_TITLE_LENGTH}</span>
              </Box>
            }
            FormHelperTextProps={{ component: 'div' }}
          />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              본문
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              서식·이미지 등은 에디터 도구를 사용해 주세요. 에디터가 열릴 때까지 저장 버튼은 비활성화됩니다.
            </Typography>
            <NaverSmartEditor
              key={`${mode}-${noticeId ?? 'new'}`}
              ref={editorRef}
              initialHtml={initialHtml}
              minHeight={440}
              onReadyChange={setEditorReady}
            />
          </Box>

          <Divider />

          <FormGroup sx={{ gap: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox checked={isImportant} onChange={(e) => setIsImportant(e.target.checked)} disabled={saveNoticeMutation.isPending} />
              }
              label="중요 공지로 설정 (목록에서 강조)"
            />
            <FormControlLabel
              control={<Checkbox checked={isPopup} onChange={(e) => setIsPopup(e.target.checked)} disabled={saveNoticeMutation.isPending} />}
              label="접속 시 팝업으로 표시"
            />
          </FormGroup>

          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} justifyContent="flex-end" sx={{ pt: 1 }}>
            <Button variant="outlined" size="large" onClick={() => router.push('/notice')} disabled={saveNoticeMutation.isPending} fullWidth sx={{ sm: { width: 'auto' } }}>
              목록으로
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={saveDisabled}
              startIcon={saveNoticeMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
              fullWidth
              sx={{ sm: { minWidth: 140, width: 'auto' } }}
            >
              {saveNoticeMutation.isPending ? '저장 중…' : '저장'}
            </Button>
          </Stack>
          {!editorReady && !saveNoticeMutation.isPending && (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: { xs: 'center', sm: 'right' } }}>
              에디터 로딩이 끝나면 저장할 수 있습니다.
            </Typography>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
