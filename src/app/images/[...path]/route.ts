/**
 * Next.js API Route: 백엔드 WAS의 정적 이미지 리소스 프록시
 * 쿠버네티스 환경에서는 클러스터 내부 Service 이름을 사용
 * 백엔드에 없을 때 fallback 이미지 반환 (default-monster.png 등)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/shared/lib/logger';

// 1x1 투명 PNG (백엔드 이미지 없을 때 fallback)
const FALLBACK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const FALLBACK_IMAGES = ['default-monster.png', 'default-unit.png'];

// 백엔드 WAS URL 가져오기 (이미지는 /api/v1이 아닌 루트 경로)
const getBackendURL = () => {
  // 환경 변수가 있으면 우선 사용
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    // /api/v1을 제거하고 루트로
    const url = process.env.NEXT_PUBLIC_API_BASE_URL;
    return url.replace('/api/v1', '').replace(/\/$/, '');
  }

  // 개발 환경 기본값
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8080';
  }

  // 프로덕션 기본값 (쿠버네티스 클러스터 내부 Service)
  return 'http://smw-app-service:8080';
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const backendBaseURL = getBackendURL();
    const path = pathArray.join('/');
    
    // 백엔드 URL 구성
    let backendURL: string;
    if (backendBaseURL.startsWith('http://') || backendBaseURL.startsWith('https://')) {
      const base = backendBaseURL.endsWith('/') 
        ? backendBaseURL.slice(0, -1) 
        : backendBaseURL;
      backendURL = `${base}/${path}`;
    } else {
      const base = backendBaseURL.endsWith('/') 
        ? backendBaseURL.slice(0, -1) 
        : backendBaseURL;
      backendURL = `${base}/${path}`;
    }

    logger.debug('[이미지 프록시] 요청', {
      path,
      backendBaseURL,
      backendURL,
      hasEnvVar: !!process.env.NEXT_PUBLIC_API_BASE_URL,
      envVar: process.env.NEXT_PUBLIC_API_BASE_URL,
    });

    // 백엔드로 요청 전달
    const response = await fetch(backendURL, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
      },
    });

    logger.debug('[이미지 프록시] 응답', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
    });

    if (!response.ok) {
      // fallback 이미지인 경우 빈 placeholder 반환 (404 방지)
      const fileName = path.split('/').pop() || '';
      if (FALLBACK_IMAGES.includes(fileName)) {
        return new NextResponse(FALLBACK_PNG, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
      logger.error('[이미지 프록시] 백엔드 응답 실패', null, {
        status: response.status,
        statusText: response.statusText,
        backendURL,
      });
      return new NextResponse('Image not found', { status: response.status });
    }

    // 이미지 데이터 가져오기
    const imageBuffer = await response.arrayBuffer();
    
    // Content-Type 전달
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // 응답 반환
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    logger.error('[이미지 프록시] 요청 실패', error);
    return NextResponse.json(
      { 
        error: '이미지를 가져올 수 없습니다.',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
