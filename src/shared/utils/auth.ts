/**
 * 인증 관련 유틸리티 함수
 * 역할: 쿠키에서 인증 토큰을 가져오는 것
 * 구현: 내부적으로 쿠키 파싱 로직을 숨김
 */

const FORCE_LOGOUT_KEY = 'forceLoggedOut';
const AUTH_CHANGED_EVENT = 'smwr:auth-changed';

function deleteCookie(name: string) {
  if (typeof window === 'undefined') return;
  // 가능한 한 넓게 제거 시도 (path=/)
  document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export function isForceLoggedOut(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(FORCE_LOGOUT_KEY) === 'true';
}

export function clearForceLoggedOut() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(FORCE_LOGOUT_KEY);
}

/**
 * 클라이언트 측 인증 상태를 정리합니다.
 * - localStorage 로그인 관련 키 제거
 * - 토큰 쿠키 제거 시도 (HttpOnly가 아니어야 가능)
 * - 쿠키 제거가 실패해도 UI가 로그인으로 보이지 않도록 forceLoggedOut 플래그 설정
 */
export function clearClientAuth() {
  if (typeof window === 'undefined') return;

  // 로그인 상태 관련 localStorage 정리
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('remember_login');
  localStorage.removeItem('saved_user_id');
  localStorage.removeItem('saved_user_pw');

  // 토큰 쿠키 제거 (백엔드/환경에 따라 이름이 다를 수 있어 모두 시도)
  deleteCookie('SMW-Authorization');
  deleteCookie('SMW_AUTHORIZATION');
  deleteCookie('smw-authorization');
  deleteCookie('smw_authorization');

  // 쿠키가 즉시 반영되지 않거나 제거가 실패하는 경우를 대비
  localStorage.setItem(FORCE_LOGOUT_KEY, 'true');

  // 다른 컴포넌트(헤더 등)에 즉시 반영되도록 이벤트 발사
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

/**
 * 쿠키에서 인증 토큰을 가져옵니다.
 * @returns 인증 토큰 문자열 또는 null (토큰이 없는 경우)
 */
export function getAuthTokenFromCookie(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // 백엔드에서 사용하는 쿠키 이름: SMW-Authorization (Constant.LOGIN_TOKEN_NAME)
  // document.cookie는 HttpOnly가 아닌 쿠키만 읽을 수 있음
  const cookies = document.cookie.split(';');
  
  // 정확한 쿠키 이름으로 먼저 찾기 (대소문자 구분)
  let tokenCookie = cookies.find((c) => {
    const trimmed = c.trim();
    return trimmed.startsWith('SMW-Authorization=');
  });
  
  // 없으면 대소문자 구분 없이 찾기
  if (!tokenCookie) {
    tokenCookie = cookies.find((c) => {
      const trimmed = c.trim();
      const lower = trimmed.toLowerCase();
      return (
        lower.startsWith('smw-authorization=') ||
        lower.startsWith('smw_authorization=')
      );
    });
  }

  if (tokenCookie) {
    // = 이후 모든 값을 가져오기 (값에 =가 포함될 수 있음)
    const token = tokenCookie.split('=').slice(1).join('=').trim();
    return token || null;
  }

  return null;
}

/**
 * 로그인 상태인지 확인합니다.
 * @returns 로그인 토큰이 있으면 true, 없으면 false
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  // 사용자가 명시적으로 로그아웃한 경우: 쿠키가 남아 있어도 로그인으로 취급하지 않음
  if (isForceLoggedOut()) return false;

  const token = getAuthTokenFromCookie();
  if (token) return true;
  // 로컬 저장소 fallback (일부 환경에서 쿠키가 바로 반영되지 않을 수 있음)
  const storedUser = localStorage.getItem('userInfo');
  const storedLoggedIn = localStorage.getItem('isLoggedIn');
  return !!storedUser || storedLoggedIn === 'true';
}

/**
 * 로그인/회원가입·에러 전용 등 인증 없이 머물러도 되는 경로
 */
export function isAuthFlowPublicPath(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/signup') return true;
  if (pathname.startsWith('/error/')) return true;
  return false;
}

/**
 * 세션이 없을 때 로그인 화면으로 이동합니다.
 * - 이미 로그인/회원가입/에러 페이지면 이동하지 않습니다.
 */
export function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const pathname = window.location.pathname;
  if (isAuthFlowPublicPath(pathname)) return;
  window.location.assign('/login');
}

