'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Typography,
} from '@mui/material';
import CommentSection from '@/components/comment/CommentSection';
import { useIncreaseNoticeView } from '@/hooks/api';
import { logger } from '@/shared/lib/logger';
import { RichTextDisplay } from '@/shared/ui/editor/RichTextDisplay';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import type { UserInfo } from '@/features/auth/types/auth';
import type { Notice } from '@/features/community/types/community';

interface NoticeDetailClientProps {
  notice: Notice;
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

export default function NoticeDetailClient({ notice }: NoticeDetailClientProps) {
  const [userInfo] = useState<UserInfo | null>(() => getStoredUserInfo());
  const { mutate: increaseNoticeView } = useIncreaseNoticeView({
    onError: (error: Error) => {
      logger.warn('공지사항 조회수 증가 실패', {
        error: {
          name: error.name,
          message: error.message,
        },
      });
    },
  });

  useEffect(() => {
    if (!notice.notice_id) {
      return;
    }
    increaseNoticeView({ notice_id: notice.notice_id });
  }, [increaseNoticeView, notice.notice_id]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <PageHeader title="공지사항" backPath="/notice" />

      <Card sx={{ mt: 2 }}>
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>
          {/* 배지 */}
          {(notice.is_important || notice.is_popup) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
              {notice.is_important && <Chip label="중요" color="error" size="small" />}
              {notice.is_popup && <Chip label="팝업" color="warning" size="small" />}
            </Box>
          )}

          {/* 제목 */}
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 1.5, wordBreak: 'break-word' }}>
            {notice.title || '공지사항'}
          </Typography>

          {/* 메타 정보 */}
          <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary', flexWrap: 'wrap', mb: 2 }}>
            <Typography variant="body2">작성자: {notice.user_name || '-'}</Typography>
            <Typography variant="body2">
              작성일: {notice.crt_date ? new Date(notice.crt_date).toLocaleString('ko-KR') : '-'}
            </Typography>
            <Typography variant="body2">조회수: {notice.view_count || 0}</Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* 본문 */}
          {notice.content ? (
            <RichTextDisplay content={notice.content} sx={{ lineHeight: 1.8 }} />
          ) : (
            <Alert severity="info">표시할 공지사항 내용이 없습니다.</Alert>
          )}

          {/* 댓글 */}
          {notice.notice_id && (
            <>
              <Divider sx={{ mt: 4, mb: 3 }} />
              <CommentSection
                boardType="NOTICE"
                boardId={notice.notice_id}
                userInfo={userInfo || undefined}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
