'use client';

import React, { useState, useEffect } from 'react';
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

const DISMISS_KEY = 'smwr-pwa-banner-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function AddToHomeScreenBanner() {
  const [open, setOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((window.navigator as { standalone?: boolean }).standalone) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ios;
    setIsIOS(ios);

    // 데스크톱에서는 표시 안 함
    if (!mobile) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (ios) {
      setOpen(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleApp = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setOpen(false);
          localStorage.setItem(DISMISS_KEY, 'app');
        }
      } finally {
        setInstalling(false);
      }
    } else if (isIOS) {
      setOpen(false);
      localStorage.setItem(DISMISS_KEY, 'app');
      // iOS는 수동으로 홈 화면 추가해야 함
    } else {
      setOpen(false);
      localStorage.setItem(DISMISS_KEY, 'app');
    }
  };

  const handleWeb = () => {
    setOpen(false);
    localStorage.setItem(DISMISS_KEY, 'web');
  };

  return (
    <Dialog
      open={open}
      onClose={handleWeb}
      maxWidth="xs"
      fullWidth
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
