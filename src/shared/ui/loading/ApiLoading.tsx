'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, Box, CircularProgress, Typography } from '@mui/material';

let setLoadingState: ((loading: boolean) => void) | null = null;
let showTimer: number | null = null;
let hideTimer: number | null = null;
let lastShownAt = 0;
let currentLoading = false;

// 짧은 요청(200ms 이하)에는 로딩바를 띄우지 않아 깜빡임/체감 저하를 줄임
const SHOW_DELAY_MS = 250;
// 한 번 뜨면 최소 유지시간을 둬서 깜빡임 방지
const MIN_VISIBLE_MS = 300;

export const setApiLoading = (loading: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  currentLoading = loading;

  // 예약된 타이머 정리
  if (showTimer != null) {
    window.clearTimeout(showTimer);
    showTimer = null;
  }
  if (hideTimer != null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }

  if (!setLoadingState) return;

  if (loading) {
    // 지연 후에도 여전히 로딩 중이면 표시
    showTimer = window.setTimeout(() => {
      showTimer = null;
      if (!setLoadingState) return;
      if (!currentLoading) return;
      lastShownAt = Date.now();
      setLoadingState(true);
    }, SHOW_DELAY_MS);
    return;
  }

  // 숨길 때는 최소 표시 시간 보장
  const elapsed = Date.now() - lastShownAt;
  const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
  hideTimer = window.setTimeout(() => {
    hideTimer = null;
    if (!setLoadingState) return;
    setLoadingState(false);
  }, remaining);
};

export default function ApiLoading() {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // 클라이언트에서만 마운트
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    setLoadingState = setLoading;
    return () => {
      setLoadingState = null;
      // 언마운트 시 타이머 정리
      if (showTimer != null) {
        window.clearTimeout(showTimer);
        showTimer = null;
      }
      if (hideTimer != null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
    };
  }, [isMounted]);

  // 서버에서는 렌더링하지 않음
  if (!isMounted) {
    return null;
  }

  return (
    <Dialog
      open={loading}
      maxWidth="xs"
      PaperProps={{
        sx: {
          backgroundColor: 'transparent',
          boxShadow: 'none',
          overflow: 'visible',
        },
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          // blur는 일부 환경에서 GPU 부하/지연 체감을 유발할 수 있어 제거
        },
      }}
    >
      <DialogContent sx={{ p: 0, overflow: 'visible' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            py: 4,
            px: 3,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress
              size={56}
              thickness={4}
              sx={{
                color: 'primary.main',
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                },
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': {
                      opacity: 1,
                      transform: 'scale(1)',
                    },
                    '50%': {
                      opacity: 0.7,
                      transform: 'scale(0.9)',
                    },
                  },
                }}
              />
            </Box>
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 500,
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            처리 중...
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

