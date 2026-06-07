'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Link,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { PageHeader } from '@/shared/ui';
import AdminGrafanaEmbed from '@/features/admin/components/AdminGrafanaEmbed';
import { useGrafanaDashboards } from '@/features/admin/hooks/useGrafanaDashboards';

export default function AdminMonitoringPage() {
  const { data, isLoading, isError } = useGrafanaDashboards();
  const dashboards = data?.dashboards ?? [];
  const [tabIndex, setTabIndex] = useState(0);

  const active = useMemo(() => dashboards[tabIndex] ?? dashboards[0], [dashboards, tabIndex]);

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        title="Grafana 모니터링"
        backPath="/admin"
        actions={
          active ? (
            <Link
              href={active.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}
            >
              Grafana에서 열기
              <OpenInNewIcon sx={{ fontSize: 16 }} />
            </Link>
          ) : undefined
        }
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress aria-label="Grafana 설정 불러오는 중" />
        </Box>
      ) : isError ? (
        <Alert severity="error">Grafana 설정을 불러오지 못했습니다.</Alert>
      ) : !data?.enabled ? (
        <Alert severity="info">
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Grafana Cloud가 비활성화되었습니다
          </Typography>
          <Typography variant="body2" component="div" sx={{ mb: 1 }}>
            WAS에 Grafana Service Account 토큰(glsa)과 스택 URL을 설정하세요. 프론트에는 토큰을 두지 않습니다.
          </Typography>
          {data?.message ? (
            <Typography variant="body2" color="text.secondary">
              {data.message}
            </Typography>
          ) : null}
          <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5, mt: 1 }}>
            <Typography component="li" variant="body2">
              <code>SMW_GRAFANA_CLOUD_ENABLED=true</code>
            </Typography>
            <Typography component="li" variant="body2">
              <code>SMW_GRAFANA_CLOUD_BASE_URL</code> — 예: https://&lt;stack&gt;.grafana.net
            </Typography>
            <Typography component="li" variant="body2">
              <code>SMW_GRAFANA_CLOUD_ACCESS_TOKEN</code> — Service Account glsa_… (Secret, otel CAP 토큰 아님)
            </Typography>
            <Typography component="li" variant="body2">
              <code>SMW_GRAFANA_DASHBOARD_WAS_UID</code> / <code>SMW_GRAFANA_DASHBOARD_BATCH_UID</code> (선택, 없으면 search API)
            </Typography>
          </Stack>
        </Alert>
      ) : dashboards.length === 0 ? (
        <Alert severity="warning">
          {data?.message || '표시할 Grafana 대시보드가 없습니다. uid 설정 또는 search API 권한을 확인하세요.'}
        </Alert>
      ) : (
        <Stack spacing={2}>
          {dashboards.length > 1 && (
            <Tabs
              value={tabIndex}
              onChange={(_, v: number) => setTabIndex(v)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {dashboards.map((d) => (
                <Tab key={d.id} label={d.title} />
              ))}
            </Tabs>
          )}
          {active && <AdminGrafanaEmbed dashboard={active} minHeight="calc(100vh - 220px)" />}
        </Stack>
      )}
    </Box>
  );
}
