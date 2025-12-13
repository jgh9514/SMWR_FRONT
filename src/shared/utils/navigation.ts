/**
 * 네비게이션 유틸리티
 */

/**
 * 안전한 페이지 이동
 * @param path - 이동할 경로
 * @param router - Next.js router (선택)
 */
export function navigateTo(path: string, router?: { push: (path: string) => void }): void {
  if (router) {
    router.push(path);
  } else if (typeof window !== 'undefined') {
    window.location.href = path;
  }
}

/**
 * 새 창에서 열기
 * @param path - 열 경로
 */
export function openInNewTab(path: string): void {
  if (typeof window !== 'undefined') {
    window.open(path, '_blank', 'noopener,noreferrer');
  }
}

/**
 * 뒤로가기
 */
export function goBack(): void {
  if (typeof window !== 'undefined') {
    window.history.back();
  }
}

