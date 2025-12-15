/**
 * Next.js API Route: 백엔드 WAS의 정적 이미지 리소스 프록시
 * 쿠버네티스 환경에서는 클러스터 내부 Service 이름을 사용
 */

import { NextRequest, NextResponse } from 'next/server';

// 백엔드 WAS URL 가져오기 (이미지는 /api/v1이 아닌 루트 경로)
const getBackendURL = () => {
  // 환경 변수가 있으면 우선 사용 (쿠버네티스 클러스터 내부 Service 이름)
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    // /api/v1을 제거하고 루트로
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api/v1', '');
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

    // 백엔드로 요청 전달
    const response = await fetch(backendURL, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
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
    console.error('이미지 프록시 요청 실패:', error);
    return NextResponse.json(
      { error: '이미지를 가져올 수 없습니다.' },
      { status: 502 }
    );
  }
}
