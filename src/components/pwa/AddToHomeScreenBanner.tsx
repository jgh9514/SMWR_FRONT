'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import LanguageIcon from '@mui/icons-material/Language';
import { useResponsive } from '@/shared/hooks/useResponsive';

/** 이번 브라우저 세션(탭 닫으면 초기화) — "웹으로 보기" 등 */
const SESSION_DISMISS_KEY = 'smwr-pwa-banner-dismissed-v2';
/** 크롬 등에서 앱 설치까지 완료한 경우만 영구 저장 — 브라우저 껐다 켜도 안 띄움 */
const INSTALLED_KEY = 'smwr-pwa-installed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function AddToHomeScreenBanner() {
  const { isMobile } = useResponsive();
  const [open, setOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    /** 데스크톱·넓은 창에서는 홈 화면 추가 UX가 어색해 모바일 뷰포트에서만 노출 */
    if (!isMobile) {
      setOpen(false);
      return;
    }
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((window.navigator as { standalone?: boolean }).standalone) return;
    try {
      if (sessionStorage.getItem(SESSION_DISMISS_KEY)) return;
      if (localStorage.getItem(INSTALLED_KEY)) return;
    } catch {
      // 스토리지 비허용 시 팝업 시도
    }

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    /** iOS: Safari 등에서 "홈 화면에 추가"로 설치 가능한 환경만 (별도 beforeinstallprompt 없음) */
    if (ios) {
      setOpen(true);
      return;
    }

    /** Chromium 계열: PWA 설치 조건을 만족해 beforeinstallprompt 가 실제로 올 때만 표시 */
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isMobile]);

  const handleApp = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setOpen(false);
          try {
            localStorage.setItem(INSTALLED_KEY, '1');
          } catch {
            // no-op
          }
        }
      } finally {
        setInstalling(false);
      }
    } else if (isIOS) {
      setOpen(false);
      try {
        sessionStorage.setItem(SESSION_DISMISS_KEY, 'app');
      } catch {
        // no-op
      }
      toast('Safari 하단 공유(□↑) → "홈 화면에 추가"로 설치할 수 있어요.', { duration: 6000 });
    } else {
      setOpen(false);
      try {
        sessionStorage.setItem(SESSION_DISMISS_KEY, 'app');
      } catch {
        // no-op
      }
      toast('브라우저 메뉴(⋮)에서 "홈 화면에 추가" 또는 "앱 설치"를 선택해 주세요.', { duration: 6000 });
    }
  };

  const handleWeb = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, 'web');
    } catch {
      // no-op
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleWeb}
      maxWidth="xs"
      fullWidth
      /** 공지 등 다른 Dialog 위에 올림 */
      sx={{ zIndex: 2000 }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
        <Typography variant="h6" fontWeight={600}>
          어떻게 보시겠어요?
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          앱으로 설치하면 홈 화면에서 더 편하게 이용할 수 있습니다.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ flexDirection: 'column', gap: 1, px: 2, pb: 2 }}>
        <Button
          variant="contained"
          fullWidth
          size="large"
          startIcon={<GetAppIcon />}
          onClick={handleApp}
          disabled={installing}
          sx={{ py: 1.5 }}
        >
          {installing ? '설치 중...' : '앱으로 보기'}
        </Button>
        <Button
          variant="outlined"
          fullWidth
          size="large"
          startIcon={<LanguageIcon />}
          onClick={handleWeb}
          sx={{ py: 1.5 }}
        >
          웹으로 보기
        </Button>
      </DialogActions>
    </Dialog>
  );
}
