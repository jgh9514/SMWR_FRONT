'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Checkbox, Container, FormControlLabel, FormGroup, TextField, Typography } from '@mui/material';
import { useSaveNotice } from '@/hooks/api';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
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
  const [userInfo] = useState<UserInfo | null>(() => getStoredUserInfo());
  const [title, setTitle] = useState(initialNotice?.title ?? '');
  const [isImportant, setIsImportant] = useState(initialNotice?.is_important ?? false);
  const [isPopup, setIsPopup] = useState(initialNotice?.is_popup ?? false);

  const isAdmin = useMemo(
    () => userInfo?.roles?.some((role) => role.role_id === 'RL0001') ?? false,
    [userInfo],
  );

  const saveNoticeMutation = useSaveNotice({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success(mode === 'edit' ? '공지사항이 수정되었습니다.' : '공지사항이 등록되었습니다.');
        router.push('/notice');
        router.refresh();
      } else {
        showToast.error(res?.message || '공지사항 저장에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('공지사항 저장 실패', error);
      showToast.error(error.message || '공지사항 저장에 실패했습니다.');
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
      <Container maxWidth="md" sx={{ py: 4 }}>
        <PageHeader title="공지사항" backPath="/notice" />
        <Typography color="text.secondary">관리자만 글을 작성할 수 있습니다.</Typography>
      </Container>
    );
  }

  const pageTitle = mode === 'edit' ? '공지사항 수정' : '공지사항 작성';
  const initialHtml = initialNotice?.content ?? '';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2 } }}>
      <PageHeader title={pageTitle} backPath="/notice" />
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField label="제목" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth required disabled={saveNoticeMutation.isPending} />
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            내용
          </Typography>
          <NaverSmartEditor key={`${mode}-${noticeId ?? 'new'}`} ref={editorRef} initialHtml={initialHtml} minHeight={420} />
        </Box>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox checked={isImportant} onChange={(e) => setIsImportant(e.target.checked)} disabled={saveNoticeMutation.isPending} />
            }
            label="중요 공지로 설정"
          />
          <FormControlLabel
            control={<Checkbox checked={isPopup} onChange={(e) => setIsPopup(e.target.checked)} disabled={saveNoticeMutation.isPending} />}
            label="팝업으로 표시"
          />
        </FormGroup>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={() => router.push('/notice')} disabled={saveNoticeMutation.isPending}>
            취소
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saveNoticeMutation.isPending}>
            {saveNoticeMutation.isPending ? '저장 중…' : '저장'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
