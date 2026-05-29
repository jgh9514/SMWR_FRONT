/** WAS Grafana Cloud 프록시 임베드 (glsa 토큰은 서버만 보유) */

export interface GrafanaDashboardItem {
  id: string;
  title: string;
  description: string;
  /** same-origin iframe src — /api/v1/admin/grafana/proxy/... */
  embedUrl: string;
  /** Grafana Cloud 원본 (새 탭) */
  externalUrl: string;
}

export interface GrafanaEmbedConfigResponse {
  enabled: boolean;
  message: string;
  dashboards: GrafanaDashboardItem[];
}
