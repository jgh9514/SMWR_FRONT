'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, Skeleton, Alert } from '@mui/material';
import { getAuthTokenFromCookie } from '@/shared/utils/auth';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import AdminHeader from '@/shared/ui/admin-header/AdminHeader';
import AdminSidebar from '@/shared/ui/admin-sidebar/AdminSidebar';
import type { UserInfo } from '@/features/auth/types/auth';

const DRAWER_WIDTH = 280;

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

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
            const returnUrl = encodeURIComponent(pathname);
            router.push(`/login?returnUrl=${returnUrl}`);
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
  }, [router, pathname]);

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
      <AdminHeader />
      <AdminSidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          pt: { xs: 9, md: 10 },
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
          px: 3,
          pb: 3,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: '1400px', mx: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
}
