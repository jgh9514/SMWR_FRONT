/**
 * Next.js API Route: 백엔드 WAS로 프록시
 * 쿠버네티스 환경에서는 클러스터 내부 Service 이름을 사용
 */

import { NextRequest, NextResponse } from 'next/server';

// 백엔드 WAS URL 가져오기
const getBackendURL = () => {
  // 환경 변수가 있으면 우선 사용 (쿠버네티스 클러스터 내부 Service 이름)
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  // 개발 환경 기본값
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8080/api/v1';
  }

  // 프로덕션 기본값 (쿠버네티스 클러스터 내부 Service)
  return 'http://smw-app-service:8080/api/v1';
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'PATCH');
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const backendBaseURL = getBackendURL();
    const path = pathSegments.join('/');
    const url = new URL(request.url);
    
    // 쿼리 파라미터 포함
    const queryString = url.search;
    
    // 백엔드 URL 구성
    // backendBaseURL이 절대 URL인지 확인
    let backendURL: string;
    if (backendBaseURL.startsWith('http://') || backendBaseURL.startsWith('https://')) {
      // 절대 URL: 끝에 슬래시가 있으면 제거하고 path 추가
      const base = backendBaseURL.endsWith('/') 
        ? backendBaseURL.slice(0, -1) 
        : backendBaseURL;
      backendURL = `${base}/${path}${queryString}`;
    } else {
      // 상대 경로: Next.js 서버 내부에서 사용하는 경우 (일반적으로 발생하지 않음)
      const base = backendBaseURL.endsWith('/') 
        ? backendBaseURL.slice(0, -1) 
        : backendBaseURL;
      backendURL = `${base}/${path}${queryString}`;
    }

    // 디버깅 로그
    console.log('[프록시] 요청 정보:', {
      method,
      originalURL: request.url,
      backendBaseURL,
      path,
      backendURL,
      hasEnvVar: !!process.env.NEXT_PUBLIC_API_BASE_URL,
      envVar: process.env.NEXT_PUBLIC_API_BASE_URL,
    });

    // 요청 헤더 준비
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Authorization 헤더 전달
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // 쿠키 전달
    const cookie = request.headers.get('cookie');
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    // 모든 요청 헤더 전달 (X-Forwarded-For 등)
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      headers['X-Forwarded-For'] = forwardedFor;
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      headers['X-Real-IP'] = realIP;
    }

    // 디버깅: 인증 정보 확인
    console.log('[프록시] 인증 정보:', {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : null,
      hasCookie: !!cookie,
      cookieNames: cookie ? cookie.split(';').map(c => c.split('=')[0].trim()) : [],
    });

    // 요청 본문 가져오기
    let body: string | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        body = await request.text();
      } catch (error) {
        // 본문이 없는 경우 무시
      }
    }

    // 백엔드로 요청 전달
    const response = await fetch(backendURL, {
      method,
      headers,
      body: body || undefined,
      // 쿠키를 포함하여 전달
      credentials: 'include',
    });

    console.log('[프록시] 응답 정보:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
      headers: {
        'content-type': response.headers.get('content-type'),
        'set-cookie': response.headers.get('set-cookie'),
      },
    });

    // 응답 본문 가져오기
    const responseText = await response.text();
    
    // 응답 헤더 준비
    const responseHeaders = new Headers();
    
    // Content-Type 전달
    const contentType = response.headers.get('content-type');
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    }

    // Set-Cookie 헤더 전달 (인증 쿠키 등)
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      responseHeaders.set('Set-Cookie', setCookie);
    }

    // 응답 반환
    return new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[프록시] 요청 실패:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      backendURL: (() => {
        try {
          const backendBaseURL = getBackendURL();
          const path = pathSegments.join('/');
          const url = new URL(request.url);
          const queryString = url.search;
          if (backendBaseURL.startsWith('http://') || backendBaseURL.startsWith('https://')) {
            const base = backendBaseURL.endsWith('/') 
              ? backendBaseURL.slice(0, -1) 
              : backendBaseURL;
            return `${base}/${path}${queryString}`;
          }
          return 'unknown';
        } catch {
          return 'unknown';
        }
      })(),
    });
    return NextResponse.json(
      { 
        error: '백엔드 서버에 연결할 수 없습니다.',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
