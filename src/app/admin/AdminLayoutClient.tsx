'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Skeleton, Alert, useMediaQuery, useTheme } from '@mui/material';
import { getAuthTokenFromCookie } from '@/shared/utils/auth';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import AdminHeader from '@/shared/ui/admin-header/AdminHeader';
import AdminSidebar from '@/shared/ui/admin-sidebar/AdminSidebar';
import { ADMIN_DRAWER_WIDTH } from '@/shared/ui/admin-layout/constants';
import type { UserInfo } from '@/features/auth/types/auth';

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isDesktop) {
      setMobileOpen(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    const checkAuthAndRole = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const token = getAuthTokenFromCookie();

        if (!token) {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (!storedUserInfo) {
            router.push('/login');
            return;
          }
        }

        const storedUserInfo = localStorage.getItem('userInfo');

        if (!storedUserInfo) {
          setIsAuthorized(true);
          return;
        }

        let userInfo: UserInfo | null = null;
        try {
          userInfo = JSON.parse(storedUserInfo) as UserInfo;
        } catch (error) {
          logger.error('[AdminLayout] 사용자 정보 파싱 실패', error);
          setIsAuthorized(true);
          return;
        }

        const isAdmin = userInfo?.roles?.some((role) => role.role_id === 'RL0001');

        if (!isAdmin) {
          showToast.error('관리자 권한이 필요합니다.');
          router.push('/');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        logger.error('[AdminLayout] 권한 검증 실패', error);
        const token = getAuthTokenFromCookie();
        if (token) {
          setIsAuthorized(true);
        } else {
          showToast.error('권한을 확인할 수 없습니다.');
          router.push('/login');
        }
      } finally {
        setIsChecking(false);
      }
    };

    void checkAuthAndRole();
  }, [router]);

  if (isChecking) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Skeleton variant="circular" width={48} height={48} />
          <Box sx={{ mt: 2 }}>
            <Alert severity="info">권한을 확인하는 중...</Alert>
          </Box>
        </Box>
      </Box>
    );
  }

  if (!isAuthorized) {
    return null;
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
