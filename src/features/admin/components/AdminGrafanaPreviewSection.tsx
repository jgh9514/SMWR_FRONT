'use client';

import { Box, Button, Card, CardContent, CardHeader, CircularProgress, Stack, Typography } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useRouter } from 'next/navigation';
import AdminGrafanaEmbed from '@/features/admin/components/AdminGrafanaEmbed';
import { useGrafanaDashboards } from '@/features/admin/hooks/useGrafanaDashboards';

/** 관리자 메인 대시보드 하단 Grafana 미리보기 */
export default function AdminGrafanaPreviewSection() {
  const router = useRouter();
  const { data, isLoading } = useGrafanaDashboards();
  const dashboards = data?.dashboards ?? [];
  const primary = dashboards[0];

  if (isLoading) {
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} aria-label="Grafana 설정 확인 중" />
        </CardContent>
      </Card>
    );
  }

  if (!primary || !data?.enabled) {
    return null;
  }

  return (
    <Card sx={{ mb: 4 }}>
      <CardHeader
        avatar={<InsightsIcon color="primary" aria-hidden />}
        title="Grafana Cloud"
        subheader="실시간 메트릭 · 트레이스 (OpenTelemetry)"
        action={
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => router.push('/admin/monitoring')}>
              전체 화면
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<OpenInNewIcon />}
              component="a"
              href={primary.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Grafana
            </Button>
          </Stack>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {dashboards.length > 1 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            + {dashboards.length - 1}개 대시보드 — 전체 화면에서 전환
          </Typography>
        )}
        <AdminGrafanaEmbed dashboard={primary} minHeight={420} compact />
      </CardContent>
    </Card>
  );
}
