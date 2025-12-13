'use client';

import { useState, useCallback } from 'react';
import { handleApiError } from '@/shared/lib/error-handler';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseAsyncReturn<T> extends UseAsyncState<T> {
  execute: (...args: any[]) => Promise<T | undefined>;
  reset: () => void;
}

/**
 * 비동기 작업을 관리하는 훅
 * @param asyncFunction - 실행할 비동기 함수
 * @param immediate - 즉시 실행 여부
 */
export function useAsync<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  immediate: boolean = false,
): UseAsyncReturn<T> {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const data = await asyncFunction(...args);
        setState({ data, loading: false, error: null });
        return data;
      } catch (error) {
        const apiError = handleApiError(error);
        const errorObj = new Error(apiError.message);
        setState({ data: null, loading: false, error: errorObj });
        return undefined;
      }
    },
    [asyncFunction],
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  if (immediate) {
    execute();
  }

  return {
    ...state,
    execute,
    reset,
  };
}

