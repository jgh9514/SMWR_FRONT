import { NextResponse } from 'next/server';

/**
 * Next.js Proxy: 모든 요청을 통과시킴 (인증 체크 비활성화)
 */
export function proxy() {
  // 모든 요청을 통과시킴 (로그인 필수 아님)
  return NextResponse.next();
}

/**
 * Proxy가 실행될 경로 설정
 */
export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청 경로에 매칭:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public 폴더의 파일들
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
  ],
};

