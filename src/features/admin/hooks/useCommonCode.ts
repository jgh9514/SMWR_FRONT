/**
 * 공통 코드 조회 Hook
 */

import { useQueries } from '@tanstack/react-query';
import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import type { CodeGroups } from '@/shared/types/util';

interface CodeItem {
  cd: string;
  cd_nm: string;
  up_cd?: string;
}

interface CodeResponse {
  [key: string]: CodeItem[];
}

/**
 * 공통 코드 조회 (단일 코드 그룹)
 */
export const useCommonCode = (
  cdGrpNo: string,
  options?: Omit<Parameters<typeof useApiPostQuery<CodeResponse>>[2], 'enabled'>,
) => {
  return useApiPostQuery<CodeResponse>(
    '/comm/comm-cd',
    { cd_grp_no: cdGrpNo },
    {
      enabled: !!cdGrpNo,
      ...options,
    },
  );
};

/**
 * 공통 코드 조회 (여러 코드 그룹)
 * 여러 코드 그룹을 병렬로 조회
 */
export const useCommonCodes = (
  codeGroups: CodeGroups,
  options?: Omit<Parameters<typeof useApiPostQuery<CodeResponse>>[2], 'enabled'> & { enabled?: boolean },
) => {
  const codeGroupKeys = Object.keys(codeGroups);
  
  const queries = useQueries({
    queries: codeGroupKeys.map((cdGrpNo) => ({
      queryKey: ['commonCode', cdGrpNo],
      queryFn: async () => {
        const { apiClient } = await import('@/shared/lib/api/client');
        const response = await apiClient.post<CodeResponse>('/comm/comm-cd', { cd_grp_no: cdGrpNo });
        return response;
      },
      enabled: !!cdGrpNo && (options?.enabled !== false),
      ...(options ? Object.fromEntries(Object.entries(options).filter(([key]) => key !== 'enabled')) : {}),
    })),
  });

  // 모든 쿼리가 완료되면 결과를 합침
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.error)?.error;
  
  const data: CodeGroups = { ...codeGroups };
  queries.forEach((query, index) => {
    if (query.data) {
      const cdGrpNo = codeGroupKeys[index];
      const dataArray = query.data[cdGrpNo] || [];
      data[cdGrpNo] = {
        cd: dataArray.map((item: CodeItem) => item.cd),
        cd_nm: dataArray.map((item: CodeItem) => item.cd_nm),
        up_cd: dataArray.map((item: CodeItem) => item.up_cd || ''),
      };
    }
  });

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: () => {
      queries.forEach((q) => q.refetch());
    },
  };
};

/**
 * 공통 코드 계층 구조 조회
 */
export const useCommonCodeHierarchy = (
  cdGrpNo: string,
  options?: Omit<Parameters<typeof useApiPostQuery<CodeResponse>>[2], 'enabled'>,
) => {
  const query = useApiPostQuery<CodeResponse>(
    '/comm/comm-cd',
    { cd_grp_no: cdGrpNo },
    {
      enabled: !!cdGrpNo,
      ...options,
    },
  );

  const data = query.data?.[cdGrpNo] || [];
  
  return {
    ...query,
    data: {
      keys: data.map((item: CodeItem) => [item.up_cd || '', item.cd] as [string, string]),
      values: data.map((item: CodeItem) => item.cd_nm),
      tags: data.map((item: CodeItem) => item.cd),
    },
  };
};
