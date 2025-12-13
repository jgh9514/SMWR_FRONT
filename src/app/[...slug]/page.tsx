'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function CatchAllPage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 메인 페이지는 제외
    if (pathname !== '/') {
      router.replace('/error/404');
    }
  }, [router, pathname]);

  return null;
}

