'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, CircularProgress, Alert } from '@mui/material';
import { isAuthenticated } from '@/shared/utils/auth';
import { showToast } from '@/shared/lib/notification';
import AdminHeader from '@/shared/ui/admin-header/AdminHeader';
import AdminSidebar from '@/shared/ui/admin-sidebar/AdminSidebar';

const DRAWER_WIDTH = 280;

/**
 * Admin Layout
 * 모든 admin 경로에 접근할 때 로그인 여부와 관리자 권한을 먼저 검증합니다.
 */
export default function AdminLayout({
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
      // 클라이언트에서만 실행
      if (typeof window === 'undefined') {
        return;
      }

      try {
        // 1. 로그인 여부 체크
        if (!isAuthenticated()) {
          // 로그인 페이지로 리다이렉트 (현재 경로를 returnUrl로 전달)
          const returnUrl = encodeURIComponent(pathname);
          router.push(`/login?returnUrl=${returnUrl}`);
          return;
        }

        // 2. 사용자 정보 가져오기
        const storedUserInfo = localStorage.getItem('userInfo');
        if (!storedUserInfo) {
          showToast.error('로그인이 필요합니다.');
          const returnUrl = encodeURIComponent(pathname);
          router.push(`/login?returnUrl=${returnUrl}`);
          return;
        }

        let userInfo;
        try {
          userInfo = JSON.parse(storedUserInfo);
        } catch (error) {
          console.error('사용자 정보 파싱 실패', error);
          showToast.error('사용자 정보를 불러올 수 없습니다.');
          router.push('/login');
          return;
        }

        // 3. 관리자 권한 체크 (RL0001이 관리자 역할 ID)
        const isAdmin = userInfo?.roles?.some(
          (role: any) => role.role_id === 'RL0001'
        );

        if (!isAdmin) {
          showToast.error('관리자 권한이 필요합니다.');
          router.push('/');
          return;
        }

        // 모든 검증 통과
        setIsAuthorized(true);
      } catch (error) {
        console.error('권한 검증 실패', error);
        showToast.error('권한을 확인할 수 없습니다.');
        router.push('/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthAndRole();
  }, [router, pathname]);

  // 검증 중일 때 로딩 표시
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
          <CircularProgress size={48} />
          <Box sx={{ mt: 2 }}>
            <Alert severity="info">권한을 확인하는 중...</Alert>
          </Box>
        </Box>
      </Box>
    );
  }

  // 권한이 없으면 아무것도 렌더링하지 않음 (리다이렉트 중)
  if (!isAuthorized) {
    return null;
  }

  // 권한이 있으면 children 렌더링
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AdminHeader />
      <AdminSidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          pt: 8,
          ml: `${DRAWER_WIDTH}px`,
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
          px: 3,
          py: 3,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

