/**
 * Admin 대시보드 통계 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import type { DashboardStatsResponse, OpsOverviewResponse } from '@/features/admin/types/admin';

/**
 * 대시보드 통계 조회
 * 백엔드: POST /api/v1/admin/dashboard/stats
 */
export const useDashboardStats = (options?: Parameters<typeof useApiPostQuery<DashboardStatsResponse>>[2]) => {
  return useApiPostQuery<DashboardStatsResponse>('/admin/dashboard/stats', {}, {
    enabled: true,
    staleTime: 1 * 60 * 1000, // 1분간 캐시 유지
    refetchOnWindowFocus: true,
    ...options,
  });
};

/**
 * 운영 개요 조회
 * 백엔드: POST /api/v1/admin/ops/overview
 */
export const useAdminOpsOverview = (
  body: Record<string, unknown> = {},
  options?: Parameters<typeof useApiPostQuery<OpsOverviewResponse>>[2],
) => {
  return useApiPostQuery<OpsOverviewResponse>('/admin/ops/overview', body, {
    enabled: true,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    ...options,
  });
};

