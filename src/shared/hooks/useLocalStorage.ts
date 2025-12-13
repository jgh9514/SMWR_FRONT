'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';

/**
 * localStorage를 사용하는 훅
 * @param key - localStorage 키
 * @param initialValue - 초기값
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.error(`Error reading localStorage key "${key}"`, error, { key });
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
    } catch (error) {
      logger.error(`Error setting localStorage key "${key}"`, error, { key });
    }
    },
    [key, storedValue],
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      logger.error(`Error removing localStorage key "${key}"`, error, { key });
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}

