import { NextRequest, NextResponse } from 'next/server';

import { DEFAULT_APP_CDN_BASE } from '@/shared/lib/env';

const ALLOWED_PREFIXES = ['/images/', '/monster/', '/siege/'] as const;

function resolveCdnBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_CDN_URL?.trim();
  const base = fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_APP_CDN_BASE;
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

/** html2canvas 등 클라이언트 fetch용 — CDN 이미지를 동일 출처로 프록시 */
export async function GET(request: NextRequest) {
  const rawPath = request.nextUrl.searchParams.get('path');
  if (!rawPath) {
    return NextResponse.json({ error: 'path is required' }, { status: 400 });
  }

  let path: string;
  try {
    path = decodeURIComponent(rawPath);
  } catch {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }

  if (!path.startsWith('/') || path.includes('..')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }

  if (!ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.json({ error: 'path not allowed' }, { status: 400 });
  }

  const upstream = `${resolveCdnBase()}${path}`;

  try {
    const upstreamRes = await fetch(upstream, {
      next: { revalidate: 60 * 60 * 24 * 30 },
    });

    if (!upstreamRes.ok) {
      return new NextResponse(null, { status: upstreamRes.status });
    }

    const contentType = upstreamRes.headers.get('content-type') ?? 'image/png';
    const body = await upstreamRes.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 });
  }
}
