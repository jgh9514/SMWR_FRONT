'use client';

import { useState, useEffect } from 'react';
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

interface NoticePopupProps {
  open: boolean;
  onClose: () => void;
  notice: Notice;
  onView: (noticeId: string) => void;
}

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
  const [formattedDate, setFormattedDate] = useState<string>('-');
  const [isMounted, setIsMounted] = useState(false);

  const saveViewMutation = useSavePopupNoticeView({
    onSuccess: () => {
      onView(notice.notice_id || '');
    },
    onError: (error: Error) => {
      logger.error('팝업 공지사항 조회 기록 저장 실패', error);
    },
  });

  // 클라이언트에서만 날짜 포맷팅
  useEffect(() => {
    setIsMounted(true);
    if (notice.crt_date) {
      try {
        const date = new Date(notice.crt_date);
        setFormattedDate(date.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }));
      } catch (error) {
        setFormattedDate('-');
      }
    }
  }, [notice.crt_date]);

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
                {isMounted ? formattedDate : '-'}
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

export default function NoticePopup() {
  const [isMounted, setIsMounted] = useState(false);
  const [popupNotices, setPopupNotices] = useState<Notice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewedNoticeIds, setViewedNoticeIds] = useState<Set<string>>(new Set());
  const [hiddenNotices, setHiddenNotices] = useState<Record<string, number>>({});
  const [hiddenNoticesReady, setHiddenNoticesReady] = useState(false);
  const [hasFreshCache, setHasFreshCache] = useState(false);

  const POPUP_NOTICE_CACHE_KEY = 'popupNoticeCache:v1';
  const POPUP_NOTICE_CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

  const readPopupCache = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(POPUP_NOTICE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { ts?: number; list?: Notice[] };
      if (!parsed || typeof parsed.ts !== 'number' || !Array.isArray(parsed.list)) return null;
      if (Date.now() - parsed.ts > POPUP_NOTICE_CACHE_TTL_MS) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  };

  // 클라이언트 마운트 확인 (서버와 클라이언트 렌더링 일치를 위해 초기값 false 유지)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMounted(true);
    }
  }, []);

  // 숨긴 공지사항 로드 (먼저 준비되어야 캐시 표시 시 깜빡임이 없음)
  useEffect(() => {
    if (!isMounted) return;
    if (typeof window === 'undefined') return;
    setHiddenNotices(getHiddenNotices());
    setHiddenNoticesReady(true);
  }, [isMounted]);

  // 캐시가 있으면 라우팅 이동 시 재조회하지 않도록 사용
  useEffect(() => {
    if (!isMounted) return;
    const cached = readPopupCache();
    if (cached && cached.list.length > 0) {
      setHasFreshCache(true);
    }
  }, [isMounted]);

  const popupNoticeListQuery = usePopupNoticeList({
    enabled: isMounted && !hasFreshCache, // 캐시가 있으면 API 호출하지 않음
    refetchOnWindowFocus: false,
  });

  // 에러 처리
  useEffect(() => {
    if (popupNoticeListQuery.isError && popupNoticeListQuery.error) {
      logger.error('팝업 공지사항 조회 실패', popupNoticeListQuery.error);
    }
  }, [popupNoticeListQuery.isError, popupNoticeListQuery.error]);

  // 클라이언트 마운트 후 숨긴 공지사항 로드
  // (위 effect에서 hiddenNoticesReady까지 함께 처리)

  const applyNotices = (notices: Notice[]) => {
    const filteredNotices = notices.filter((notice) => {
      if (!notice.notice_id) return false;
      const noticeIdStr = String(notice.notice_id);
      const hiddenTimestamp = hiddenNotices[noticeIdStr];
      if (hiddenTimestamp) {
        const now = Date.now();
        if (now - hiddenTimestamp < 86400000) {
          return false;
        }
      }
      return true;
    });

    if (filteredNotices.length > 0) {
      setPopupNotices(filteredNotices);
      setCurrentIndex(0);
      setViewedNoticeIds(new Set());
    } else {
      setPopupNotices([]);
      setCurrentIndex(0);
    }
  };

  // 캐시에서 먼저 표시 (숨긴 공지사항 제외)
  useEffect(() => {
    if (!isMounted || !hiddenNoticesReady) return;
    const cached = readPopupCache();
    if (!cached || !Array.isArray(cached.list)) return;
    applyNotices(cached.list);
  }, [isMounted, hiddenNoticesReady, hiddenNotices]);

  // 데이터가 로드되면 popupNotices 업데이트 (숨긴 공지사항 제외) - 클라이언트에서만
  useEffect(() => {
    if (!isMounted || !hiddenNoticesReady) return;
    
    if (popupNoticeListQuery.data && !popupNoticeListQuery.isLoading && !popupNoticeListQuery.isError) {
      const data = popupNoticeListQuery.data;
      
      let notices: Notice[] = [];
      
      // data.list가 있는 경우
      if (data && data.list && Array.isArray(data.list)) {
        notices = data.list;
      } 
      // data가 직접 배열인 경우
      else if (Array.isArray(data)) {
        notices = data;
      } else {
        // no-op
      }

      // 로컬 캐시 저장 (라우팅 이동 시 재조회 방지)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(POPUP_NOTICE_CACHE_KEY, JSON.stringify({ ts: Date.now(), list: notices }));
          setHasFreshCache(true);
        } catch (e) {
          // no-op
        }
      }

      applyNotices(notices);
    }
  }, [isMounted, hiddenNoticesReady, popupNoticeListQuery.data, popupNoticeListQuery.isLoading, popupNoticeListQuery.isError, hiddenNotices]);

  const handleView = (noticeId: string) => {
    setViewedNoticeIds((prev) => {
      const newSet = new Set([...prev, noticeId]);
      // 다음 팝업으로 이동
      const nextIndex = currentIndex + 1;
      if (nextIndex < popupNotices.length) {
        setCurrentIndex(nextIndex);
      } else {
        // 모든 팝업을 본 경우
        setPopupNotices([]);
        setCurrentIndex(0);
      }
      return newSet;
    });
  };

  const handleClose = () => {
    // 현재 팝업을 본 것으로 처리
    if (popupNotices[currentIndex]?.notice_id) {
      handleView(popupNotices[currentIndex].notice_id);
    }
  };

  const handleHideForDay = (noticeId: string) => {
    const noticeIdStr = String(noticeId);
    hideNoticeForDay(noticeIdStr);
    setHiddenNotices((prev) => ({
      ...prev,
      [noticeIdStr]: Date.now(),
    }));
    handleClose();
  };

  // 서버 사이드에서는 아무것도 렌더링하지 않음
  if (!isMounted) {
    return null;
  }

  // 현재 표시할 팝업 (아직 보지 않은 것 중 첫 번째)
  const currentNotice = popupNotices.length > 0 && currentIndex < popupNotices.length
    ? popupNotices[currentIndex]
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

