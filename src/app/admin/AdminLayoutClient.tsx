'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { getAuthTokenFromCookie } from '@/shared/utils/auth';
import { logger } from '@/shared/lib/logger';
import AdminHeader from '@/shared/ui/admin-header/AdminHeader';
import AdminSidebar from '@/shared/ui/admin-sidebar/AdminSidebar';
import AdminAccessGate, { type AdminGateStatus } from '@/shared/ui/admin-layout/AdminAccessGate';
import { ADMIN_DRAWER_WIDTH } from '@/shared/ui/admin-layout/constants';
import type { UserInfo } from '@/features/auth/types/auth';

const ADMIN_ROLE_ID = 'RL0001';

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [gateStatus, setGateStatus] = useState<AdminGateStatus>('checking');

  const goHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const goLogin = useCallback(() => {
    router.push('/login');
  }, [router]);

  useEffect(() => {
    if (isDesktop) {
      setMobileOpen(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    const checkAuthAndRole = () => {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const token = getAuthTokenFromCookie();
        const storedUserInfo = localStorage.getItem('userInfo');

        if (!token && !storedUserInfo) {
          setGateStatus('login_required');
          return;
        }

        if (!storedUserInfo) {
          setGateStatus('authorized');
          return;
        }

        let userInfo: UserInfo | null = null;
        try {
          userInfo = JSON.parse(storedUserInfo) as UserInfo;
        } catch (error) {
          logger.error('[AdminLayout] 사용자 정보 파싱 실패', error);
          setGateStatus('authorized');
          return;
        }

        const isAdmin = userInfo?.roles?.some((role) => role.role_id === ADMIN_ROLE_ID);

        if (!isAdmin) {
          setGateStatus('denied');
          return;
        }

        setGateStatus('authorized');
      } catch (error) {
        logger.error('[AdminLayout] 권한 검증 실패', error);
        const token = getAuthTokenFromCookie();
        setGateStatus(token ? 'authorized' : 'login_required');
      }
    };

    checkAuthAndRole();
  }, []);

  if (gateStatus !== 'authorized') {
    return (
      <AdminAccessGate
        status={gateStatus}
        onGoHome={goHome}
        onGoLogin={goLogin}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AdminHeader onMenuToggle={() => setMobileOpen((prev) => !prev)} />
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${ADMIN_DRAWER_WIDTH}px)` },
          pt: { xs: 8, md: 10 },
          bgcolor: 'background.default',
          minHeight: '100vh',
          px: { xs: 1.5, sm: 2, md: 3 },
          pb: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: '1400px', mx: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
}
