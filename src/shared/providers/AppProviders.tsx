'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecoilRoot } from 'recoil';
import { usePathname } from 'next/navigation';
import { ThemeProvider as MuiThemeProvider, CssBaseline, Box } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import ApiLoading from '@/shared/ui/loading/ApiLoading';
import FixedHeader from '@/shared/ui/fixed-header/FixedHeader';
import NoticePopup from '@/components/notice/NoticePopup';
import ClientOnlyToaster from './ClientOnlyToaster';

// QueryClient를 컴포넌트 내부에서 생성하여 각 요청마다 새로운 인스턴스 생성
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          // 재시도하지 않을 에러들
          const noRetryErrors = [
            'ERR_NETWORK',
            'ERR_CONNECTION_REFUSED',
            'Network Error',
          ];
          
          // 네트워크 에러는 재시도하지 않음
          if (
            error?.code && noRetryErrors.includes(error.code) ||
            error?.message && noRetryErrors.some(msg => error.message.includes(msg))
          ) {
            return false;
          }
          
          // 429 (Too Many Requests), 401 (Unauthorized), 403 (Forbidden)은 재시도하지 않음
          const status = error?.response?.status;
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
        retry: (failureCount, error: any) => {
          // 재시도하지 않을 에러들
          const noRetryErrors = [
            'ERR_NETWORK',
            'ERR_CONNECTION_REFUSED',
            'Network Error',
          ];
          
          // 네트워크 에러는 재시도하지 않음
          if (
            error?.code && noRetryErrors.includes(error.code) ||
            error?.message && noRetryErrors.some(msg => error.message.includes(msg))
          ) {
            return false;
          }
          
          // 429 (Too Many Requests), 401 (Unauthorized), 403 (Forbidden)은 재시도하지 않음
          const status = error?.response?.status;
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

  // 클라이언트 마운트 상태 관리
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 클라이언트에서만 pathname 기반 계산 (Hydration 오류 방지)
  const { isPublicPath, shouldShowHeader } = useMemo(() => {
    // 서버에서는 기본값 사용
    if (!isMounted) {
      return {
        isPublicPath: false,
        shouldShowHeader: true,
      };
    }

    // 클라이언트에서만 pathname 사용
    const publicPaths = ['/login', '/signup', '/error/401', '/error/403', '/error/404', '/error/500'];
    const isPublic = publicPaths.includes(pathname);
    const showHeader = !isPublic;
    
    return {
      isPublicPath: isPublic,
      shouldShowHeader: showHeader,
    };
  }, [isMounted, pathname]);

  // mainSx는 항상 동일하게 유지 (Hydration 오류 방지)
  // 실제 padding은 FixedHeader의 높이에 따라 클라이언트에서 동적으로 조정
  const mainSx = useMemo(() => {
    return { pt: { xs: 7, md: 8 }, minHeight: '100vh' };
  }, []);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <RecoilRoot>
        <QueryClientProvider client={queryClient}>
          <AuthGuard>
            <ClientOnlyToaster />
            {isMounted && shouldShowHeader && <FixedHeader />}
            <main suppressHydrationWarning>
              <Box sx={mainSx}>
                {children}
              </Box>
            </main>
            {isMounted && (
              <>
                <ApiLoading />
                {!isPublicPath && <NoticePopup />}
              </>
            )}
          </AuthGuard>
        </QueryClientProvider>
      </RecoilRoot>
    </MuiThemeProvider>
  );
}


