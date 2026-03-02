'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, Skeleton, Alert } from '@mui/material';
import { getAuthTokenFromCookie } from '@/shared/utils/auth';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
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
        // 1. 쿠키에 토큰이 있는지 확인 (백엔드 JWT 인증 사용)
        // 백엔드 쿠키 이름: SMW-Authorization (Constant.LOGIN_TOKEN_NAME)
        // 주의: HttpOnly 쿠키는 document.cookie에서 읽을 수 없으므로,
        // 실제로는 API 호출 시 쿠키가 자동으로 전달되어 백엔드에서 검증됨
        const token = getAuthTokenFromCookie();
        
        // 쿠키가 없어도 일단 접근 허용 (백엔드에서 최종 검증)
        // HttpOnly 쿠키는 document.cookie에서 읽을 수 없지만, API 호출 시 자동으로 전달됨
        // 실제 인증은 백엔드 AuthInterceptor에서 처리되므로, 여기서는 일단 접근 허용
        if (!token) {
          // localStorage에 userInfo가 있으면 쿠키가 HttpOnly일 가능성이 높으므로 접근 허용
          const storedUserInfo = localStorage.getItem('userInfo');
          if (!storedUserInfo) {
            // 쿠키도 없고 userInfo도 없으면 로그인 페이지로 리다이렉트
            const returnUrl = encodeURIComponent(pathname);
            router.push(`/login?returnUrl=${returnUrl}`);
            return;
          }
        }

        // 2. 사용자 정보 가져오기 (localStorage에서)
        // 쿠키가 있으면 백엔드 인증은 통과하므로, localStorage가 없어도 접근 허용
        // 권한 체크는 userInfo가 있을 때만 수행
        const storedUserInfo = localStorage.getItem('userInfo');
        
        if (!storedUserInfo) {
          // localStorage에 userInfo가 없으면 일단 접근 허용
          // 실제 권한 체크는 백엔드에서 처리되므로, API 호출 시 403이 발생하면 처리됨
          setIsAuthorized(true);
          return;
        }

        let userInfo;
        try {
          userInfo = JSON.parse(storedUserInfo);
        } catch (error) {
          logger.error('[AdminLayout] 사용자 정보 파싱 실패', error);
          // 파싱 실패해도 쿠키가 있으면 접근 허용
          setIsAuthorized(true);
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
        logger.error('[AdminLayout] 권한 검증 실패', error);
        // 에러 발생 시 쿠키가 있으면 일단 접근 허용 (백엔드에서 최종 검증)
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
          <Skeleton variant="circular" width={48} height={48} />
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
          pt: { xs: 9, md: 10 },
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
          px: 3,
          pb: 3,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: '1400px', mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

