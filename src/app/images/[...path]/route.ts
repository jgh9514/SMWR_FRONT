/**
 * Next.js API Route: 백엔드 WAS의 정적 이미지 리소스 프록시
 * 백엔드 404·연결 실패 시 `public/` 동일 경로 파일을 제공 (속성 아이콘 등)
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/shared/lib/logger';

export const runtime = 'nodejs';

// 1x1 투명 PNG (백엔드 이미지 없을 때 fallback)
const FALLBACK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const FALLBACK_IMAGES = ['default-monster.png', 'default-unit.png'];

function contentTypeFromFilename(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'ico') return 'image/x-icon';
  return 'application/octet-stream';
}

function isSafePublicRelPath(relPath: string): boolean {
  if (!relPath || relPath.includes('..')) return false;
  const parts = relPath.split('/');
  return !parts.some((p) => p === '..');
}

async function tryServeFromPublic(relPath: string): Promise<NextResponse | null> {
  if (!isSafePublicRelPath(relPath)) return null;
  const normalized = relPath.replace(/^\/+/, '');
  try {
    const absolute = join(process.cwd(), 'public', normalized);
    const buf = await readFile(absolute);
    const ct = contentTypeFromFilename(normalized);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return null;
  }
}

// 백엔드 WAS URL 가져오기 (이미지는 /api/v1이 아닌 루트 경로)
const getBackendURL = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    const url = process.env.NEXT_PUBLIC_API_BASE_URL;
    return url.replace('/api/v1', '').replace(/\/$/, '');
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8080';
  }

  return 'http://smw-app-service:8080';
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  let relPath = '';
  try {
    const { path: pathArray } = await params;
    relPath = pathArray.join('/');

    const backendBaseURL = getBackendURL();
    let backendURL: string;
    if (backendBaseURL.startsWith('http://') || backendBaseURL.startsWith('https://')) {
      const base = backendBaseURL.endsWith('/') ? backendBaseURL.slice(0, -1) : backendBaseURL;
      backendURL = `${base}/${relPath}`;
    } else {
      const base = backendBaseURL.endsWith('/') ? backendBaseURL.slice(0, -1) : backendBaseURL;
      backendURL = `${base}/${relPath}`;
    }

    logger.debug('[이미지 프록시] 요청', {
      path: relPath,
      backendBaseURL,
      backendURL,
      hasEnvVar: !!process.env.NEXT_PUBLIC_API_BASE_URL,
      envVar: process.env.NEXT_PUBLIC_API_BASE_URL,
    });

    const response = await fetch(backendURL, {
      method: 'GET',
      headers: {
        Accept: 'image/*',
      },
    });

    logger.debug('[이미지 프록시] 응답', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
    });

    if (response.ok) {
      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/png';
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    const fromPublic = await tryServeFromPublic(relPath);
    if (fromPublic) return fromPublic;

    const fileName = relPath.split('/').pop() || '';
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
  } catch (error) {
    const fromPublic = relPath ? await tryServeFromPublic(relPath) : null;
    if (fromPublic) return fromPublic;
    logger.error('[이미지 프록시] 요청 실패', error);
    return NextResponse.json(
      {
        error: '이미지를 가져올 수 없습니다.',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
