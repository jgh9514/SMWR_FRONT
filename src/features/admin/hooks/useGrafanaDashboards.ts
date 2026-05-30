'use client';

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import type { GrafanaEmbedConfigResponse } from '@/features/admin/config/grafanaDashboards';

/** POST /api/v1/admin/grafana/embed-config — Cloud Access Policy 프록시 URL */
export function useGrafanaDashboards() {
  return useApiPostQuery<GrafanaEmbedConfigResponse>('/admin/grafana/embed-config', {}, {
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}
