'use client';

import { useEffect } from 'react';

/**
 * 안드로이드 Chrome PWA 설치(beforeinstallprompt)를 위해 동일 출처에 SW 등록.
 * 네트워크는 그대로 통과(캐시 오프라인 전략 없음).
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        // 비HTTPS·지원 브라우저 아님 등은 무시
      }
    };

    void register();
  }, []);

  return null;
}
