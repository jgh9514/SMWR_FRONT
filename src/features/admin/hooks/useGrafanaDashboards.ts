'use client';

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import type { GrafanaEmbedConfigResponse } from '@/features/admin/config/grafanaDashboards';

/** POST /api/v1/admin/grafana/embed-config — Cloud Access Policy 프록시 URL */
export function useGrafanaDashboards() {
  return useApiPostQuery<GrafanaEmbedConfigResponse>('/admin/grafana/embed-config', {}, {
    staleTime: 60_000,
  });
}
