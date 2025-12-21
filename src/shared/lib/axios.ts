/**
 * Axios 인스턴스 설정
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { setApiLoading } from '@/shared/ui/loading/ApiLoading';
import { API_TIMEOUT_MS } from '@/shared/constants';
import { showApiError } from './error-handler';

// 환경별 API 서버 설정
const getBaseURL = () => {
  // 브라우저 환경에서는 항상 Next.js API Route를 통해 프록시
  // (쿠버네티스 클러스터 내부 Service는 브라우저에서 직접 접근 불가)
  if (typeof window !== 'undefined') {
    // 개발 환경 체크
    const hostname = window.location.hostname;
    
    // 디버깅 로그
    if (process.env.NODE_ENV === 'development') {
      console.log('[Axios] 브라우저 환경:', {
        hostname,
        href: window.location.href,
      });
    }
    
    // 로컬 환경에서는 직접 백엔드 호출
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8080/api/v1';
    }
    // 프로덕션 환경: Next.js API Route를 통해 프록시 (쿠키 전달 보장)
    // jgh9514.com에서도 프록시를 통해 호출하여 쿠키가 제대로 전달되도록 함
    const baseURL = '/api/v1';
    if (process.env.NODE_ENV === 'development') {
      console.log('[Axios] 프로덕션 환경 감지, Next.js API Route 사용:', baseURL);
    }
    return baseURL;
  }

  // 서버 사이드: 환경 변수가 있으면 사용 (쿠버네티스 클러스터 내부 Service)
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    console.log('[Axios] 서버 사이드 - 환경 변수 사용:', process.env.NEXT_PUBLIC_API_BASE_URL);
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  // 서버 사이드 기본값
  console.log('[Axios] 서버 사이드 - 기본값 사용: /api/v1');
  return '/api/v1';
};

const BASE_URL = getBaseURL();

let loadingCount = 0;

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    // CSRF 보호를 위한 헤더 (백엔드에서 검증 필요)
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // FormData인 경우 Content-Type 헤더 제거 (axios가 자동으로 multipart/form-data 설정)
    if (config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers['Content-Type'];
      }
    }

    // 프로덕션 환경에서는 민감한 로그 제거
    if (process.env.NODE_ENV === 'development') {
      // 개발 환경에서만 제한적인 로그 (민감 정보 제외)
      console.log('🚀 API 호출:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        // baseURL과 data는 민감 정보일 수 있으므로 제외
      });
    }

    // 토큰 가져오기
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split(';');
      // 백엔드에서 설정하는 쿠키 이름: SMW-Authorization (하이픈)
      const tokenCookie = cookies.find((c) => {
        const trimmed = c.trim();
        return trimmed.startsWith('SMW-Authorization=') || trimmed.startsWith('SMW_AUTHORIZATION=');
      });
      if (tokenCookie) {
        const token = tokenCookie.split('=').slice(1).join('=').trim(); // = 이후 모든 값 가져오기
        if (config.headers && token) {
          // Bearer 접두사가 이미 있는지 확인
          const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          config.headers.Authorization = bearerToken;
        }
      }
    }

    // Loading 표시
    loadingCount++;
    setApiLoading(true);

    return config;
  },
  (error: AxiosError) => {
    loadingCount--;
    if (loadingCount === 0) {
      setApiLoading(false);
    }
    return Promise.reject(error);
  },
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    loadingCount--;
    if (loadingCount === 0) {
      setApiLoading(false);
    }
    return response;
  },
  (error: AxiosError) => {
    loadingCount--;
    if (loadingCount === 0) {
      setApiLoading(false);
    }

    // 에러 처리
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        // 401 에러 시 로그인 페이지로 리다이렉트
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          // 로그인 페이지가 아닌 경우에만 리다이렉트
          // (로그인 페이지에서도 인증 실패 시 리다이렉트하지 않음)
          if (!currentPath.startsWith('/login') && !currentPath.startsWith('/signup')) {
            // 로컬 스토리지 정리
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userInfo');
            // 현재 경로를 쿼리 파라미터로 저장하여 로그인 후 돌아올 수 있도록 함
            const returnUrl = encodeURIComponent(currentPath + window.location.search);
            // 로그인 페이지로 리다이렉트
            window.location.href = `/login${returnUrl !== '/' ? `?returnUrl=${returnUrl}` : ''}`;
          }
        }
        return Promise.reject(error);
      } else if (status === 403) {
        if (typeof window !== 'undefined') {
          // 에러 페이지에서는 리다이렉트하지 않음
          const currentPath = window.location.pathname;
          if (!currentPath.startsWith('/error/')) {
            window.location.href = '/error/403';
          }
        }
        return Promise.reject(error);
      } else if (status === 404) {
        // API 404 에러는 리다이렉트하지 않고 에러만 반환
        // (데이터가 없을 때 정상적인 응답일 수 있음)
        // React Query나 컴포넌트에서 에러를 처리하도록 함
        return Promise.reject(error);
      } else if (status === 429) {
        // 429 Too Many Requests - Rate Limiting 에러는 조용히 처리 (브라우저에 표시하지 않음)
        // 사용자에게 알리지 않고 조용히 실패 처리
        return Promise.reject(error);
      } else if (status >= 500) {
        if (typeof window !== 'undefined') {
          // 에러 페이지에서는 리다이렉트하지 않음
          const currentPath = window.location.pathname;
          if (!currentPath.startsWith('/error/')) {
            window.location.href = '/error/500';
          }
        }
        return Promise.reject(error);
      } else {
        // 4xx 에러는 토스트로 표시
        showApiError(error);
      }
    } else {
      // 네트워크 에러 등 (ERR_CONNECTION_REFUSED 등)
      // 백엔드 서버가 실행되지 않은 경우 조용히 처리 (토스트 표시하지 않음)
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.code === 'ERR_CONNECTION_REFUSED') {
        // 개발 환경에서만 첫 번째 네트워크 에러만 경고 출력 (중복 방지)
        if (process.env.NODE_ENV === 'development' && !(window as any).__networkErrorLogged) {
          console.warn('백엔드 서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인하세요.');
          (window as any).__networkErrorLogged = true;
        }
        return Promise.reject(error);
      }
      showApiError(error);
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;

