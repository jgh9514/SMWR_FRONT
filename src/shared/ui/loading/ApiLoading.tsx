'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, Box, CircularProgress, Typography } from '@mui/material';

let loadingCount = 0;
let setLoadingState: ((loading: boolean) => void) | null = null;

export const setApiLoading = (loading: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }
  if (setLoadingState) {
    setLoadingState(loading);
  }
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
          backdropFilter: 'blur(4px)',
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

