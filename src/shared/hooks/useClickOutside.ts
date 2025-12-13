'use client';

import { useEffect, useRef, RefObject } from 'react';

/**
 * 클릭 외부 감지 훅
 * @param handler - 외부 클릭 시 실행할 함수
 * @returns ref - DOM 요소에 연결할 ref
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [handler]);

  return ref as React.RefObject<T>;
}

