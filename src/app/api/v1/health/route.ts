/**
 * API Route 헬스체크 엔드포인트
 * 프록시가 제대로 동작하는지 확인
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'API Route is working',
    timestamp: new Date().toISOString(),
    backendURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'not configured',
  });
}
