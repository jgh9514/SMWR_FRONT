/**
 * DDL Comparison Hooks
 */

import { useApiGetQuery } from '@/hooks/api';
import type { DbTablesResponse, EntityTablesResponse, DdlComparisonResult } from '@/types';

/**
 * DB 테이블 정보 조회
 */
export const useDbTables = (schema: string = 'public', enabled = true) => {
  return useApiGetQuery<DbTablesResponse>(
    `/admin/ddl/db-tables?schema=${schema}`,
    {
      enabled,
      staleTime: 5 * 60 * 1000, // 5분
    }
  );
};

/**
 * Entity 테이블 정보 조회
 */
export const useEntityTables = (enabled = true) => {
  return useApiGetQuery<EntityTablesResponse>(
    '/admin/ddl/entity-tables',
    {
      enabled,
      staleTime: 5 * 60 * 1000, // 5분
    }
  );
};

/**
 * DB와 Entity 비교
 */
export const useDdlComparison = (schema: string = 'public', enabled = true) => {
  return useApiGetQuery<DdlComparisonResult>(
    `/admin/ddl/compare?schema=${schema}`,
    {
      enabled,
      staleTime: 60 * 1000, // 1분
    }
  );
};

