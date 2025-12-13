'use client';

import { useEffect, useState } from 'react';

/**
 * 클라이언트 전용 컴포넌트 래퍼
 * 서버 사이드 렌더링을 완전히 차단
 */
export default function ClientOnlyComponents() {
  const [isMounted, setIsMounted] = useState(false);
  const [ApiLoading, setApiLoading] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    // 클라이언트에서만 실행되도록 보장
    if (typeof window === 'undefined') {
      return;
    }

    // 클라이언트에서만 동적으로 import
    import('@/shared/ui/loading/ApiLoading').then((ApiLoadingModule) => {
      setApiLoading(() => ApiLoadingModule.default);
      setIsMounted(true);
    });
  }, []);

  // 서버에서는 항상 null 반환
  if (typeof window === 'undefined') {
    return null;
  }

  if (!isMounted || !ApiLoading) {
    return null;
  }

  return <ApiLoading />;
}

