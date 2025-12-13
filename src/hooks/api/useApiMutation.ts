/**
 * React Query 기반 API Mutation Hook
 */

import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api/client';

interface UseApiMutationOptions<TData, TVariables, TError = Error>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
}

export function useApiMutation<TData = unknown, TVariables = unknown, TError = Error>(
  options: UseApiMutationOptions<TData, TVariables, TError>,
): UseMutationResult<TData, TError, TVariables> {
  return useMutation<TData, TError, TVariables>(options);
}

/**
 * POST 요청용 Mutation Hook
 */
export function useApiPostMutation<TData = unknown, TVariables = unknown>(
  url: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>,
): UseMutationResult<TData, Error, TVariables> {
  return useApiMutation<TData, TVariables, Error>({
    mutationFn: (variables: TVariables) => apiClient.post<TData>(url, variables),
    ...options,
  });
}

/**
 * PUT 요청용 Mutation Hook
 */
export function useApiPutMutation<TData = unknown, TVariables = unknown>(
  url: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>,
): UseMutationResult<TData, Error, TVariables> {
  return useApiMutation<TData, TVariables, Error>({
    mutationFn: (variables: TVariables) => apiClient.put<TData>(url, variables),
    ...options,
  });
}

/**
 * DELETE 요청용 Mutation Hook
 */
export function useApiDeleteMutation<TData = unknown, TVariables = unknown>(
  url: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>,
): UseMutationResult<TData, Error, TVariables> {
  return useApiMutation<TData, TVariables, Error>({
    mutationFn: (variables: TVariables) => apiClient.delete<TData>(url, variables),
    ...options,
  });
}

