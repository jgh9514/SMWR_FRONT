'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * 클라이언트에서만 렌더링되는 Toaster 컴포넌트
 * SSR hydration 오류 방지
 */
export default function ClientOnlyToaster() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 서버와 클라이언트에서 동일한 구조 유지 (하이드레이션 오류 방지)
  return (
    <div suppressHydrationWarning>
      {isMounted && (
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#0064FF',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#dc004e',
                secondary: '#fff',
              },
            },
          }}
        />
      )}
    </div>
  );
}

