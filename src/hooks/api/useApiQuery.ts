/**
 * React Query 기반 API Query Hook
 */

import { useQuery, useInfiniteQuery, UseQueryOptions, UseQueryResult, UseInfiniteQueryOptions, UseInfiniteQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api/client';

type QueryKey = readonly unknown[];

interface UseApiQueryOptions<TData, TError = Error> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
}

export function useApiQuery<TData = unknown, TError = Error>(
  options: UseApiQueryOptions<TData, TError>,
): UseQueryResult<TData, TError> {
  return useQuery<TData, TError>({
    ...options,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분 (이전 cacheTime)
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
    queryKey: [url, data],
    queryFn: () => apiClient.post<TData>(url, data),
    enabled: false, // 기본적으로 수동 실행
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
    queryKey: [url, params],
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
  options?: Omit<UseInfiniteQueryOptions<TData, Error, TData, TData, readonly unknown[], TPageParam>, 'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'>,
): UseInfiniteQueryResult<TData, Error> {
  return useInfiniteQuery<TData, Error, TData, readonly unknown[], TPageParam>({
    queryKey: [url, 'infinite'],
    queryFn: ({ pageParam }: { pageParam: TPageParam }) => {
      return apiClient.post<TData>(url, { limit: ITEMS_PER_PAGE, offset: pageParam });
    },
    getNextPageParam: getPageParam,
    initialPageParam: 0 as TPageParam,
    ...options,
  });
}

