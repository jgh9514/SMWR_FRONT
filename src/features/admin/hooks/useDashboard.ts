/**
 * Admin 대시보드 통계 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import type { DashboardStatsResponse } from '@/features/admin/types/admin';

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

