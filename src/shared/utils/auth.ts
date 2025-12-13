/**
 * 인증 관련 유틸리티 함수
 * 역할: 쿠키에서 인증 토큰을 가져오는 것
 * 구현: 내부적으로 쿠키 파싱 로직을 숨김
 */

/**
 * 쿠키에서 인증 토큰을 가져옵니다.
 * @returns 인증 토큰 문자열 또는 null (토큰이 없는 경우)
 */
export function getAuthTokenFromCookie(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // 쿠키 이름을 대소문자 구분 없이 폭넓게 탐색
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find((c) => {
    const trimmed = c.trim();
    const lower = trimmed.toLowerCase();
    return (
      lower.startsWith('smw-authorization=') ||
      lower.startsWith('smw_authorization=') ||
      lower.startsWith('authorization=')
    );
  });

  if (tokenCookie) {
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
  const token = getAuthTokenFromCookie();
  if (token) return true;
  // 로컬 저장소 fallback (일부 환경에서 쿠키가 바로 반영되지 않을 수 있음)
  const storedUser = localStorage.getItem('userInfo');
  const storedLoggedIn = localStorage.getItem('isLoggedIn');
  return !!storedUser || storedLoggedIn === 'true';
}

