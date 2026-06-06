'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecoilRoot } from 'recoil';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeProvider as MuiThemeProvider, CssBaseline, Box } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import ClientOnlyToaster from './ClientOnlyToaster';
import { RtaSearchStoreProvider } from '@/features/rta/context/RtaSearchStoreContext';
import { RtaSeasonsProvider } from '@/features/rta/context/RtaSeasonsContext';
import { isAuthenticated, isForceLoggedOut } from '@/shared/utils/auth';
import type { AuthCheckResponse } from '@/features/auth/types/auth';

const FixedHeader = dynamic(() => import('@/shared/ui/fixed-header/FixedHeader'), {
  ssr: false,
  loading: () => null,
});

const NoticePopup = dynamic(() => import('@/components/notice/NoticePopup'), {
  ssr: false,
  loading: () => null,
});

const AddToHomeScreenBanner = dynamic(() => import('@/components/pwa/AddToHomeScreenBanner'), {
  ssr: false,
  loading: () => null,
});

const SiteFooter = dynamic(() => import('@/shared/ui/site-footer/SiteFooter'), {
  ssr: false,
  loading: () => null,
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const QUERY_RETRY_NO_STATUS = new Set([429, 401, 403]);
const QUERY_RETRY_NO_CODES = ['ERR_NETWORK', 'ERR_CONNECTION_REFUSED', 'Network Error'];

function shouldRetry(failureCount: number, error: unknown): boolean {
  const { code, message, status } = getRetryErrorMeta(error);
  if ((code && QUERY_RETRY_NO_CODES.includes(code)) ||
      (message && QUERY_RETRY_NO_CODES.some((c) => message.includes(c)))) return false;
  if (status != null && QUERY_RETRY_NO_STATUS.has(status)) return false;
  return failureCount < 1;
}

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
        retry: shouldRetry,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
      mutations: {
        retry: shouldRetry,
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
    mode: 'dark',
    primary: {
      main: '#38bdf8',
      light: '#7dd3fc',
      dark: '#0ea5e9',
      contrastText: '#0f172a',
    },
    secondary: {
      main: '#94a3b8',
      light: '#cbd5e1',
      dark: '#64748b',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    error: {
      main: '#f43f5e',
      light: '#fb7185',
      dark: '#e11d48',
    },
    warning: {
      main: '#f59e0b',
    },
    info: {
      main: '#06b6d4',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
    divider: 'rgba(148, 163, 184, 0.12)',
  },
  typography: {
    fontFamily: [
      '"Pretendard Variable"',
      'Pretendard',
      'Inter',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'sans-serif',
    ].join(','),
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.015em' },
    h4: { fontWeight: 700, letterSpacing: '-0.015em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
          backgroundColor: '#0f172a',
          color: '#f1f5f9',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(30, 41, 59, 0.55)',
          border: '1px solid rgba(148, 163, 184, 0.12)',
          backdropFilter: 'blur(16px)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: 'rgba(148, 163, 184, 0.2)',
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
    // 로그인 필수 경로 (공개 SEO 페이지·목록은 제외)
    const protectedPrefixes = [
      '/siege',
      '/recent-siege',
      '/guild-management',
      '/settings',
      '/log-upload',
      '/account-summary',
      '/inquiry',
    ];
    if (protectedPrefixes.some((prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`))) {
      return true;
    }
    if (currentPath === '/notice/write') {
      return true;
    }
    if (/^\/notice\/[^/]+\/edit$/.test(currentPath)) {
      return true;
    }
    return false;
  }, [pathname]);

  const isGuildRequiredPath = useMemo(() => {
    const currentPath = pathname || '';
    const guildRequiredPrefixes = ['/recent-siege', '/siege/map', '/guild-management'];
    return guildRequiredPrefixes.some((prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`));
  }, [pathname]);

  /** 메인 영역 + 푸터를 세로 flex로 묶어 푸터를 화면 하단에 붙임 */
  const shellSx = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    ...(isPublicPath || isAdminPath ? {} : { pt: { xs: 7, md: 8 } }),
  }), [isPublicPath, isAdminPath]);

  const shouldShowFooter = !isAdminPath && !isPublicPath;

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
      const BOOTSTRAP_TIMEOUT_MS = 10000;
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
        // 일시적인 네트워크 지연/서버 부하로 login-check 가 늦어질 수 있다.
        // 이 경우 클라이언트 로그인 표시 정보를 지우면 "로그인이 풀린 것처럼" 보이므로 유지한다.
      } finally {
        authBootstrappedRef.current = true;
        setAuthBootstrapped(true);
      }
    };

    bootstrap();
  }, [isPublicPath, isAdminPath]);

  // 자동 로그인: 탭을 오래 켜 둔 경우(API 호출 없음)에도 주기적으로 세션 갱신
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isPublicPath || isAdminPath) return;

    const SESSION_KEEPALIVE_MS = 60 * 60 * 1000; // 1시간

    const tick = async () => {
      if (isForceLoggedOut()) return;
      if (localStorage.getItem('remember_login') !== 'true') return;
      if (!isAuthenticated()) return;

      try {
        const { apiClient } = await import('@/shared/lib/api/client');
        const response = await apiClient.post<AuthCheckResponse>('/auth/login-check', {});
        if (response.result === 'SUCCESS' && response.userInfo) {
          localStorage.setItem('userInfo', JSON.stringify(response.userInfo));
          localStorage.setItem('isLoggedIn', 'true');
        }
      } catch {
        // 네트워크 일시 오류 시 기존 세션 유지
      }
    };

    const id = window.setInterval(tick, SESSION_KEEPALIVE_MS);
    return () => window.clearInterval(id);
  }, [isAdminPath, isPublicPath]);

  // 보호 경로는 로그인 검증 이후에만 접근 허용
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!authBootstrapped) return;
    if (isPublicPath || isAdminPath) return;

    if (isProtectedPath && !isAuthenticated()) {
      router.replace('/login');
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
  }, [authBootstrapped, isAdminPath, isGuildRequiredPath, isProtectedPath, isPublicPath, pathname, router]);

  // 인증 bootstrap 전에는 "아예" 화면을 그리지 않음(헤더/페이지/list 호출 방지)
  if (!authBootstrapped && !isPublicPath && !isAdminPath) {
    return (
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {/* 인증 대기 중에도 PWA 팝업은 마운트 (이전에는 여기서 빠져 useEffect 미실행) */}
        <AddToHomeScreenBanner />
        {/* 로그인 검증 완료 전에는 화면을 아예 렌더하지 않는다 (깜빡임/동시 호출 방지) */}
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }} />
      </MuiThemeProvider>
    );
  }

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <RecoilRoot>
        <RtaSearchStoreProvider>
        <QueryClientProvider client={queryClient}>
          <RtaSeasonsProvider>
            <AuthGuard>
              <ClientOnlyToaster />
              {shouldShowHeader && <FixedHeader />}
              <Box sx={shellSx}>
                <Box component="main" sx={{ flex: 1, width: '100%' }} suppressHydrationWarning>
                  {children}
                </Box>
                {shouldShowFooter && <SiteFooter />}
              </Box>
              <>
                {/* 공지 팝업은 메인 화면에서만 동작 */}
                {!isPublicPath && !isAdminPath && isHomePath && <NoticePopup />}
                {/* PWA 앱으로 보기 배너 (하단 고정) */}
                <AddToHomeScreenBanner />
              </>
            </AuthGuard>
          </RtaSeasonsProvider>
        </QueryClientProvider>
        </RtaSearchStoreProvider>
      </RecoilRoot>
    </MuiThemeProvider>
  );
}


