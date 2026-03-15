/**
 * Axios 인스턴스 설정
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_TIMEOUT_MS } from '@/shared/constants';
import { showApiError } from './error-handler';
import { isForceLoggedOut } from '@/shared/utils/auth';
import { logger } from '@/shared/lib/logger';
import { apiClient } from '@/shared/lib/api/client';

let reauthInFlight: Promise<void> | null = null;

async function tryReauthOnce() {
  if (typeof window === 'undefined') return;
  if (reauthInFlight) return reauthInFlight;
  reauthInFlight = (async () => {
    try {
      // login-check는 쿠키(HttpOnly 포함) 기반으로 서버가 최종 판단
      const res: any = await apiClient.post('/auth/login-check', {});
      if (res && res.result === 'SUCCESS' && res.userInfo) {
        localStorage.setItem('userInfo', JSON.stringify(res.userInfo));
        localStorage.setItem('isLoggedIn', 'true');
        return;
      }
      // 실패면 표시용 정보만 정리
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userInfo');
    } catch {
      // login-check 자체도 실패하면 표시용 정보만 정리
      try {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userInfo');
      } catch {
        // no-op
      }
    } finally {
      reauthInFlight = null;
    }
  })();
  return reauthInFlight;
}

// 환경별 API 서버 설정
const getBaseURL = () => {
  // 환경 변수가 있으면 우선 사용
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    logger.debug('[Axios] 환경 변수 사용', { baseURL: process.env.NEXT_PUBLIC_API_BASE_URL });
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  // 개발 환경 기본값
  if (process.env.NODE_ENV === 'development') {
    logger.debug('[Axios] 환경 변수 없음, 기본값 사용', { baseURL: 'http://localhost:8080/api/v1' });
    return 'http://localhost:8080/api/v1';
  }

  // 브라우저 환경에서는 Next.js API Route를 통해 프록시
  // (쿠버네티스 클러스터 내부 Service는 브라우저에서 직접 접근 불가)
  if (typeof window !== 'undefined') {
    // 프로덕션 환경: Next.js API Route를 통해 프록시 (쿠키 전달 보장)
    return '/api/v1';
  }

  // 서버 사이드 기본값
  return '/api/v1';
};

const BASE_URL = getBaseURL();

// Admin API (배치 등) - smwr-admin 8081
const getAdminBaseURL = () => {
  if (process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL) {
    const url = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL;
    return url.endsWith('/api/v1') ? url : url.endsWith('/') ? `${url}api/v1` : `${url}/api/v1`;
  }
  if (process.env.NODE_ENV === 'development') return 'http://localhost:8081/api/v1';
  return '/api/v1';
};

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
    // 개발 환경에서만 제한적인 로그 (민감 정보 제외)
    logger.debug('🚀 API 호출', {
      method: config.method?.toUpperCase(),
      url: config.url,
      // baseURL과 data는 민감 정보일 수 있으므로 제외
    });

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

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    // 에러 처리
    if (error.response) {
      const status = error.response.status;
      const method = (error.config?.method || 'UNKNOWN').toUpperCase();
      const url = error.config?.url;
      const data = error.response?.data;

      // 리다이렉트로 에러가 사라져 원인 추적이 어려워지는 문제 방지:
      // - 401/403/5xx도 페이지 이동하지 않고, 토스트 + 콘솔 로그로 남긴다.
      logger.error('[Axios] API error response', error, { status, method, url, data });

      if (status === 401) {
        // 사용자가 명시적으로 로그아웃한 경우(강제 플래그)에는 토스트만 띄우고 종료
        if (!isForceLoggedOut() && typeof window !== 'undefined') {
          // 401이 한 번 났다고 바로 "로그인 풀림" 처리하면(특히 HttpOnly 쿠키 환경)
          // localStorage 기반 로그인표시가 깨져서 체감상 강제 로그아웃이 됨.
          // => 서버에 login-check로 재확인 후에만 정리.
          const urlStr = String(url || '');
          if (!urlStr.includes('/auth/login-check')) {
            await tryReauthOnce();
          }
        }
        showApiError(error);
        return Promise.reject(error);
      } else if (status === 403) {
        showApiError(error);
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
        showApiError(error);
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
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && !(window as any).__networkErrorLogged) {
          logger.warn('백엔드 서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인하세요.');
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

export const adminAxiosInstance: AxiosInstance = axios.create({
  baseURL: getAdminBaseURL(),
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
});

adminAxiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find((c) => {
        const t = c.trim();
        return t.startsWith('SMW-Authorization=') || t.startsWith('SMW_AUTHORIZATION=');
      });
      if (tokenCookie && config.headers) {
        const token = tokenCookie.split('=').slice(1).join('=').trim();
        if (token) {
          config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (e: AxiosError) => Promise.reject(e)
);
adminAxiosInstance.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401 && !isForceLoggedOut() && typeof window !== 'undefined') {
        const urlStr = String(error.config?.url || '');
        if (!urlStr.includes('/auth/login-check')) await tryReauthOnce();
      }
      // 4xx는 mutation onError에서 상세 메시지 표시 → 중복 토스트 방지
      if (status >= 500 || status === 401 || status === 403) {
        showApiError(error);
      }
    }
    return Promise.reject(error);
  }
);

