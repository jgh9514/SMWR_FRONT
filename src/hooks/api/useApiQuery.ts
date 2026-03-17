/**
 * React Query 기반 API Query Hook
 */

import {
  useQuery,
  useInfiniteQuery,
  useSuspenseQuery,
  UseQueryOptions,
  UseQueryResult,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api/client';

type QueryKey = readonly unknown[];

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const helper = (v: unknown): unknown => {
    if (v === null || v === undefined) return v;
    if (typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(helper);
    // plain object: sort keys
    const out: Record<string, unknown> = {};
    const record = v as Record<string, unknown>;
    Object.keys(record)
      .sort()
      .forEach((k) => {
        out[k] = helper(record[k]);
      });
    return out;
  };
  return JSON.stringify(helper(value));
}

function keyPart(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'object') {
    try {
      return stableStringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

interface UseApiQueryOptions<TData, TError = Error> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
}

export function useApiQuery<TData = unknown, TError = Error>(
  options: UseApiQueryOptions<TData, TError>,
): UseQueryResult<TData, TError> {
  const defaultStaleTime = 5 * 60 * 1000; // 5분
  const defaultGcTime = 10 * 60 * 1000; // 10분
  return useQuery<TData, TError>({
    ...options,
    staleTime: options.staleTime ?? defaultStaleTime,
    gcTime: options.gcTime ?? defaultGcTime,
  });
}

/**
 * POST 요청용 Query Hook
 */
export function useApiPostQuery<TData = unknown>(
  url: string,
  data?: unknown,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>,
): UseQueryResult<TData, Error> {
  return useApiQuery<TData, Error>({
    queryKey: [url, keyPart(data)],
    queryFn: () => apiClient.post<TData>(url, data),
    enabled: false, // 기본적으로 수동 실행
    ...options,
  });
}

/**
 * POST 요청용 Suspense Query Hook
 * - 선언적인 UI(Suspense fallback)로 로딩을 처리할 때 사용
 */
export function useApiPostSuspenseQuery<TData = unknown>(
  url: string,
  data?: unknown,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useSuspenseQuery<TData, Error>({
    queryKey: [url, keyPart(data)],
    queryFn: () => apiClient.post<TData>(url, data),
    ...options,
  });
}

/**
 * GET 요청용 Suspense Query Hook
 */
export function useApiGetSuspenseQuery<TData = unknown>(
  url: string,
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useSuspenseQuery<TData, Error>({
    queryKey: [url, keyPart(params)],
    queryFn: () => apiClient.get<TData>(url, params),
    ...options,
  });
}

/**
 * GET 요청용 Query Hook
 */
export function useApiGetQuery<TData = unknown>(
  url: string,
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>,
): UseQueryResult<TData, Error> {
  return useApiQuery<TData, Error>({
    queryKey: [url, keyPart(params)],
    queryFn: () => apiClient.get<TData>(url, params),
    ...options,
  });
}

const ITEMS_PER_PAGE = 20;

/**
 * POST 요청용 Infinite Query Hook (무한 스크롤)
 */
export function useApiPostInfiniteQuery<TData = unknown, TPageParam = number>(
  url: string,
  getPageParam: (lastPage: TData, allPages: TData[]) => TPageParam | undefined,
  options?: Omit<UseInfiniteQueryOptions<TData, Error, TData, readonly unknown[], TPageParam>, 'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'>,
): UseInfiniteQueryResult<TData, Error> {
  return useInfiniteQuery<TData, Error, TData, readonly unknown[], TPageParam>({
    queryKey: [url, 'infinite'],
    queryFn: ({ pageParam }) => {
      return apiClient.post<TData>(url, { limit: ITEMS_PER_PAGE, offset: pageParam as TPageParam });
    },
    getNextPageParam: getPageParam,
    initialPageParam: 0 as TPageParam,
    ...options,
  });
}

