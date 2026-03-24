'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const SLIDE_DURATION_MS = 400;

export default function SiegeDetailSlotLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasContent = pathname?.startsWith('/siege/siege-detail/') ?? false;

  // 상세 패널 열릴 때 배경(body) 스크롤 막기 → y축 스크롤 중복 방지
  useEffect(() => {
    if (!hasContent) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [hasContent]);

  const close = () => {
    router.back();
  };

  if (!hasContent) return null;

  return (
    <>
      {/* 백드롭: 배경 어둡게 + 클릭 시 닫기 */}
      <Box
        role="presentation"
        onClick={close}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1199,
          bgcolor: 'rgba(0,0,0,0.5)',
          animation: 'siegeDetailBackdropIn 0.25s ease-out forwards',
          '@keyframes siegeDetailBackdropIn': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
        }}
      />
      {/* 슬라이드 패널: 우측에서 좌측으로 진입 */}
      <Box
        role="dialog"
        aria-modal="true"
        aria-label="상세"
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          maxWidth: '100vw',
          zIndex: 1200,
          bgcolor: 'background.paper',
          overflow: 'auto',
          boxShadow: 24,
          animation: `siegeDetailSlideIn ${SLIDE_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
          '@keyframes siegeDetailSlideIn': {
            from: { transform: 'translateX(100%)' },
            to: { transform: 'translateX(0)' },
          },
        }}
      >
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            상세
          </Typography>
          <IconButton onClick={close} aria-label="닫기">
            <CloseIcon />
          </IconButton>
        </Box>
        {children}
      </Box>
    </>
  );
}

