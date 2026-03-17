'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { usePopupNoticeList, useSavePopupNoticeView } from '@/hooks/api';
import { Notice } from '@/features/community/types/community';
import { logger } from '@/shared/lib/logger';

const POPUP_NOTICE_CACHE_KEY = 'popupNoticeCache:v1';
const POPUP_NOTICE_CACHE_TTL_MS = 60 * 60 * 1000;

function NoticePopupItem({ 
  open,
  notice, 
  onView, 
  onClose,
  onHideForDay,
}: { 
  open: boolean;
  notice: Notice; 
  onView: (noticeId: string) => void; 
  onClose: () => void;
  onHideForDay: (noticeId: string) => void;
}) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const formattedDate = useMemo(() => {
    if (!isClient || !notice.crt_date) {
      return '-';
    }

    try {
      return new Date(notice.crt_date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '-';
    }
  }, [isClient, notice.crt_date]);

  const saveViewMutation = useSavePopupNoticeView({
    onSuccess: () => {
      onView(notice.notice_id || '');
    },
    onError: (error: Error) => {
      logger.error('팝업 공지사항 조회 기록 저장 실패', error);
    },
  });

  const handleClose = () => {
    if (notice.notice_id) {
      saveViewMutation.mutate({ notice_id: notice.notice_id });
    }
    onClose();
  };

  const handleHideForDay = () => {
    if (notice.notice_id) {
      onHideForDay(notice.notice_id);
    }
    handleClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 24,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              {notice.is_important && (
                <Chip 
                  label="중요" 
                  color="error" 
                  size="small" 
                  sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }}
                />
              )}
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 700,
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                }}
              >
                {notice.title}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                작성자: {notice.user_name || '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                {formattedDate}
              </Typography>
            </Box>
          </Box>
          <IconButton 
            onClick={handleClose} 
            size="small"
            sx={{ 
              flexShrink: 0,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Typography
          variant="body1"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.8,
            color: 'text.primary',
            fontSize: { xs: '0.9375rem', sm: '1rem' },
            minHeight: 100,
          }}
        >
          {notice.content}
        </Typography>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button 
          onClick={handleHideForDay} 
          variant="outlined"
          color="inherit"
          sx={{ 
            minWidth: 100,
            textTransform: 'none',
            fontSize: '0.875rem',
          }}
        >
          하루동안 안보기
        </Button>
        <Button 
          onClick={handleClose} 
          variant="contained"
          sx={{ 
            minWidth: 100,
            textTransform: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// localStorage에서 하루동안 숨긴 공지사항 목록 가져오기
const getHiddenNotices = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  try {
    const hidden = localStorage.getItem('popupNoticeHidden');
    if (!hidden) return {};
    const parsed = JSON.parse(hidden);
    const now = Date.now();
    // 24시간(86400000ms)이 지난 항목 제거
    const filtered: Record<string, number> = {};
    Object.entries(parsed).forEach(([noticeId, timestamp]) => {
      if (typeof timestamp === 'number' && now - timestamp < 86400000) {
        filtered[noticeId] = timestamp;
      }
    });
    // 필터링된 결과 저장
    if (Object.keys(filtered).length !== Object.keys(parsed).length) {
      localStorage.setItem('popupNoticeHidden', JSON.stringify(filtered));
    }
    return filtered;
  } catch (error) {
    logger.error('숨긴 공지사항 목록 파싱 실패', error);
    return {};
  }
};

// 공지사항을 하루동안 숨기기
const hideNoticeForDay = (noticeId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const hidden = getHiddenNotices();
    hidden[noticeId] = Date.now();
    localStorage.setItem('popupNoticeHidden', JSON.stringify(hidden));
  } catch (error) {
    logger.error('공지사항 숨기기 실패', error);
  }
};

const readPopupCache = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(POPUP_NOTICE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: number; list?: Notice[] };
    if (!parsed || typeof parsed.ts !== 'number' || !Array.isArray(parsed.list)) return null;
    if (Date.now() - parsed.ts > POPUP_NOTICE_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

export default function NoticePopup() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hiddenVersion, setHiddenVersion] = useState(0);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const hiddenNotices = useMemo(
    () => {
      void hiddenVersion;
      return isClient ? getHiddenNotices() : {};
    },
    [hiddenVersion, isClient],
  );
  const cachedPopup = useMemo(
    () => (isClient ? readPopupCache() : null),
    [isClient],
  );

  const popupNoticeListQuery = usePopupNoticeList({
    enabled: isClient && !(cachedPopup?.list?.length), // 캐시가 있으면 API 호출하지 않음
    refetchOnWindowFocus: false,
  });

  // 에러 처리
  useEffect(() => {
    if (popupNoticeListQuery.isError && popupNoticeListQuery.error) {
      logger.error('팝업 공지사항 조회 실패', popupNoticeListQuery.error);
    }
  }, [popupNoticeListQuery.isError, popupNoticeListQuery.error]);
  const sourceNotices = useMemo(() => {
    if (popupNoticeListQuery.data?.list && Array.isArray(popupNoticeListQuery.data.list)) {
      return popupNoticeListQuery.data.list;
    }
    if (cachedPopup?.list && Array.isArray(cachedPopup.list)) {
      return cachedPopup.list;
    }
    return [];
  }, [cachedPopup, popupNoticeListQuery.data]);

  const activeNotices = useMemo(() => {
    return sourceNotices.filter((notice) => {
      if (!notice.notice_id) return false;
      const noticeIdStr = String(notice.notice_id);
      const hiddenTimestamp = hiddenNotices[noticeIdStr];
      if (!hiddenTimestamp) {
        return true;
      }
      return false;
    });
  }, [hiddenNotices, sourceNotices]);

  useEffect(() => {
    if (!isClient || !popupNoticeListQuery.data?.list || popupNoticeListQuery.isLoading || popupNoticeListQuery.isError) {
      return;
    }

    try {
      localStorage.setItem(
        POPUP_NOTICE_CACHE_KEY,
        JSON.stringify({ ts: Date.now(), list: popupNoticeListQuery.data.list }),
      );
    } catch {
      // no-op
    }
  }, [isClient, popupNoticeListQuery.data, popupNoticeListQuery.isError, popupNoticeListQuery.isLoading]);

  const handleView = (noticeId: string) => {
    void noticeId;
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex < activeNotices.length ? nextIndex : 0);
  };

  const handleClose = () => {
    // 현재 팝업을 본 것으로 처리
    if (activeNotices[safeCurrentIndex]?.notice_id) {
      handleView(activeNotices[safeCurrentIndex].notice_id);
    }
  };

  const handleHideForDay = (noticeId: string) => {
    const noticeIdStr = String(noticeId);
    hideNoticeForDay(noticeIdStr);
    setHiddenVersion((prev) => prev + 1);
    handleClose();
  };

  // 서버 사이드에서는 아무것도 렌더링하지 않음
  if (!isClient) {
    return null;
  }

  // 현재 표시할 팝업 (아직 보지 않은 것 중 첫 번째)
  const safeCurrentIndex = currentIndex < activeNotices.length ? currentIndex : 0;
  const currentNotice = activeNotices.length > 0
    ? activeNotices[safeCurrentIndex]
    : null;

  if (!currentNotice) {
    return null;
  }

  return (
    <NoticePopupItem 
      open={true}
      notice={currentNotice} 
      onView={handleView} 
      onClose={handleClose}
      onHideForDay={handleHideForDay}
    />
  );
}

