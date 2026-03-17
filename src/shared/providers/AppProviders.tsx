'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecoilRoot } from 'recoil';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeProvider as MuiThemeProvider, CssBaseline, Box } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import FixedHeader from '@/shared/ui/fixed-header/FixedHeader';
import NoticePopup from '@/components/notice/NoticePopup';
import ClientOnlyToaster from './ClientOnlyToaster';
import { isAuthenticated, isForceLoggedOut } from '@/shared/utils/auth';
import type { AuthCheckResponse } from '@/features/auth/types/auth';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const getRetryErrorMeta = (error: unknown) => {
  if (!isRecord(error)) {
    return { code: undefined, message: undefined, status: undefined };
  }

  const code = typeof error.code === 'string' ? error.code : undefined;
  const message = typeof error.message === 'string' ? error.message : undefined;
  const response = isRecord(error.response) ? error.response : undefined;
  const status = typeof response?.status === 'number' ? response.status : undefined;

  return { code, message, status };
};

// QueryClient를 컴포넌트 내부에서 생성하여 각 요청마다 새로운 인스턴스 생성
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: (failureCount, error: unknown) => {
          // 재시도하지 않을 에러들
          const noRetryErrors = [
            'ERR_NETWORK',
            'ERR_CONNECTION_REFUSED',
            'Network Error',
          ];
          const { code, message, status } = getRetryErrorMeta(error);

          // 네트워크 에러는 재시도하지 않음
          if (
            (code && noRetryErrors.includes(code)) ||
            (message && noRetryErrors.some(msg => message.includes(msg)))
          ) {
            return false;
          }

          // 429 (Too Many Requests), 401 (Unauthorized), 403 (Forbidden)은 재시도하지 않음
          if (status === 429 || status === 401 || status === 403) {
            return false;
          }

          // 다른 에러는 1번만 재시도
          return failureCount < 1;
        },
        staleTime: 5 * 60 * 1000, // 5분
        gcTime: 10 * 60 * 1000, // 10분
        // React Query v5에서는 onError가 제거되었습니다.
        // 에러 처리는 각 useQuery/useMutation에서 개별적으로 처리하거나,
        // axios interceptor에서 처리합니다.
      },
      mutations: {
        retry: (failureCount, error: unknown) => {
          // 재시도하지 않을 에러들
          const noRetryErrors = [
            'ERR_NETWORK',
            'ERR_CONNECTION_REFUSED',
            'Network Error',
          ];
          const { code, message, status } = getRetryErrorMeta(error);

          // 네트워크 에러는 재시도하지 않음
          if (
            (code && noRetryErrors.includes(code)) ||
            (message && noRetryErrors.some(msg => message.includes(msg)))
          ) {
            return false;
          }

          // 429 (Too Many Requests), 401 (Unauthorized), 403 (Forbidden)은 재시도하지 않음
          if (status === 429 || status === 401 || status === 403) {
            return false;
          }

          return failureCount < 1;
        },
        // React Query v5에서는 onError가 제거되었습니다.
        // 에러 처리는 각 useQuery/useMutation에서 개별적으로 처리하거나,
        // axios interceptor에서 처리합니다.
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // 서버: 항상 새로운 QueryClient 생성
    return makeQueryClient();
  } else {
    // 브라우저: 재사용하되, 없으면 생성
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

// MUI theme은 컴포넌트 외부에서 생성 (한 번만 생성)
const muiTheme = createTheme({
  palette: {
    primary: {
      main: '#0064FF',
    },
    secondary: {
      main: '#4E5968',
    },
    background: {
      default: '#f2f4f6',
      paper: '#ffffff',
    },
    text: {
      primary: '#191F28',
      secondary: '#4E5968',
    },
  },
  typography: {
    fontFamily: [
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
        },
      },
    },
  },
});

interface AppProvidersProps {
  children: React.ReactNode;
}

// 인증 체크 컴포넌트 (인증 체크 비활성화됨)
function AuthGuard({ children }: { children: React.ReactNode }) {
  // 인증 체크 비활성화 - 모든 페이지 접근 허용
  return <>{children}</>;
}

export default function AppProviders({ children }: AppProvidersProps) {
  // QueryClient를 컴포넌트 내부에서 가져옴
  const [queryClient] = useState(() => getQueryClient());
  const pathname = usePathname();
  const router = useRouter();
  const authBootstrappedRef = useRef(false);
  const [authBootstrapped, setAuthBootstrapped] = useState(false);

  // 로그아웃/로그인 등 인증 상태 변경 시, 화면(서버 컴포넌트/캐시/쿼리)을 강제로 갱신
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAuthChanged = () => {
      // 로그인 상태에 의존하는 React Query 캐시 제거 (즉시 재조회 유도)
      try {
        queryClient.clear();
      } catch {
        // no-op
      }

      // 로그아웃 강제 플래그가 켜진 경우(클라이언트 auth 정리 직후)는
      // Next router 리다이렉트 경합을 피하기 위해 브라우저 레벨로 메인으로 강제 이동
      if (isForceLoggedOut()) {
        if (window.location.pathname !== '/') {
          window.location.assign('/');
          return;
        }
        // 이미 메인이라면 새로고침만
        window.location.reload();
        return;
      }

      // 일반적인 인증 변경(로그인 등)에서는 soft refresh
      const authed = isAuthenticated();
      if (!authed && pathname !== '/') {
        router.replace('/');
        // replace 직후 refresh가 이전 라우트에 걸리는 케이스 방지
        setTimeout(() => router.refresh(), 0);
        return;
      }

      router.refresh();
    };

    window.addEventListener('smwr:auth-changed', handleAuthChanged);
    return () => window.removeEventListener('smwr:auth-changed', handleAuthChanged);
  }, [pathname, queryClient, router]);

  // pathname 기반 계산
  const { isPublicPath, shouldShowHeader, isAdminPath } = useMemo(() => {
    const publicPaths = ['/login', '/signup', '/error/401', '/error/403', '/error/404', '/error/500'];
    const currentPath = pathname || '';
    const isPublic = publicPaths.includes(currentPath);
    const isAdmin = currentPath.startsWith('/admin');
    // admin 경로는 별도 헤더/사이드바를 사용하므로 일반 헤더 숨김
    const showHeader = !isPublic && !isAdmin;
    
    return {
      isPublicPath: isPublic,
      shouldShowHeader: showHeader,
      isAdminPath: isAdmin,
    };
  }, [pathname]);

  const isHomePath = useMemo(() => {
    return (pathname || '') === '/';
  }, [pathname]);

  const isProtectedPath = useMemo(() => {
    const currentPath = pathname || '';
    // 로그인 필수 경로들 (필요 시 확장)
    const protectedPrefixes = ['/siege', '/recent-siege', '/guild-management', '/settings', '/log-upload', '/account-summary'];
    return protectedPrefixes.some((prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`));
  }, [pathname]);

  const isGuildRequiredPath = useMemo(() => {
    const currentPath = pathname || '';
    const guildRequiredPrefixes = ['/siege', '/recent-siege', '/guild-management'];
    return guildRequiredPrefixes.some((prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`));
  }, [pathname]);

  // mainSx는 public path와 admin path에 따라 다르게 설정
  const mainSx = useMemo(() => {
    const publicPaths = ['/login', '/signup', '/error/401', '/error/403', '/error/404', '/error/500'];
    const currentPath = pathname || '';
    const isPublic = publicPaths.includes(currentPath);
    const isAdmin = currentPath.startsWith('/admin');
    return isPublic || isAdmin
      ? { pt: 0, minHeight: '100vh' }
      : { pt: { xs: 7, md: 8 }, minHeight: '100vh' };
  }, [pathname]);

  // 로그인 검증(bootstrap)이 끝날 때까지는 화면을 아예 렌더하지 않음
  // - public/admin 페이지는 즉시 렌더
  // - 그 외 페이지는 토큰이 있으면 /auth/login-check로 "서버 검증"이 끝난 뒤에만 렌더
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (authBootstrappedRef.current) return;

    // public/admin은 인증 확인을 기다릴 필요가 없음
    if (isPublicPath || isAdminPath) {
      authBootstrappedRef.current = true;
      setAuthBootstrapped(true);
      return;
    }

    const bootstrap = async () => {
      const BOOTSTRAP_TIMEOUT_MS = 3000;
      try {
        const authed = isAuthenticated();
        if (!authed) {
          authBootstrappedRef.current = true;
          setAuthBootstrapped(true);
          return;
        }

        // 토큰이 있으면 무조건 서버에서 검증/유저정보 확보 후 렌더
        const { apiClient } = await import('@/shared/lib/api/client');
        const response = await Promise.race([
          apiClient.post<AuthCheckResponse>('/auth/login-check', {}),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('bootstrap timeout')), BOOTSTRAP_TIMEOUT_MS)),
        ]);
        if (response.result === 'SUCCESS' && response.userInfo) {
          localStorage.setItem('userInfo', JSON.stringify(response.userInfo));
          localStorage.setItem('isLoggedIn', 'true');
        } else {
          // 서버 검증이 실패하면, 최소한 클라이언트 표시 정보는 비움 (쿠키 삭제는 로그아웃 플로우에서 처리)
          localStorage.removeItem('userInfo');
          localStorage.removeItem('isLoggedIn');
        }
      } catch {
        // 검증 실패/타임아웃이어도 화면은 렌더(미로그인으로 동작하도록 클라이언트 표시 정보는 비움)
        try {
          localStorage.removeItem('userInfo');
          localStorage.removeItem('isLoggedIn');
        } catch {
          // no-op
        }
      } finally {
        authBootstrappedRef.current = true;
        setAuthBootstrapped(true);
      }
    };

    bootstrap();
  }, [isPublicPath, isAdminPath]);

  // 보호 경로는 로그인 검증 이후에만 접근 허용
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!authBootstrapped) return;
    if (isPublicPath || isAdminPath) return;

    if (isProtectedPath && !isAuthenticated()) {
      router.replace('/login');
      // replace 직후 refresh 경합 방지
      setTimeout(() => router.refresh(), 0);
      return;
    }

    // 길드 필수 경로: 로그인은 되었지만 길드가 없으면 settings로 유도
    if (isGuildRequiredPath && isAuthenticated()) {
      try {
        const raw = localStorage.getItem('userInfo');
        const parsed = raw ? JSON.parse(raw) : null;
        const hasGuild = !!(parsed && parsed.guild_id);
        if (!hasGuild) {
          router.replace('/settings');
          setTimeout(() => router.refresh(), 0);
        }
      } catch {
        // userInfo 파싱 실패 시에도 settings로 유도
        router.replace('/settings');
        setTimeout(() => router.refresh(), 0);
      }
    }
  }, [authBootstrapped, isAdminPath, isGuildRequiredPath, isProtectedPath, isPublicPath, router]);

  // 인증 bootstrap 전에는 "아예" 화면을 그리지 않음(헤더/페이지/list 호출 방지)
  if (!authBootstrapped && !isPublicPath && !isAdminPath) {
    return (
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {/* 로그인 검증 완료 전에는 화면을 아예 렌더하지 않는다 (깜빡임/동시 호출 방지) */}
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }} />
      </MuiThemeProvider>
    );
  }

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <RecoilRoot>
        <QueryClientProvider client={queryClient}>
          <AuthGuard>
            <ClientOnlyToaster />
            {shouldShowHeader && <FixedHeader />}
            <main suppressHydrationWarning>
              <Box sx={mainSx}>
                {children}
              </Box>
            </main>
            <>
              {/* 공지 팝업은 메인 화면에서만 동작 */}
              {!isPublicPath && !isAdminPath && isHomePath && <NoticePopup />}
            </>
          </AuthGuard>
        </QueryClientProvider>
      </RecoilRoot>
    </MuiThemeProvider>
  );
}


