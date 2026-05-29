'use client';

import { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import InsightsIcon from '@mui/icons-material/Insights';
import type { GrafanaDashboardItem } from '@/features/admin/config/grafanaDashboards';

interface AdminGrafanaEmbedProps {
  dashboard: GrafanaDashboardItem;
  /** 기본 72vh — 관리자 메인 미리보기는 420 등으로 낮춤 */
  minHeight?: number | string;
  compact?: boolean;
}

export default function AdminGrafanaEmbed({
  dashboard,
  minHeight = '72vh',
  compact = false,
}: AdminGrafanaEmbedProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    setIframeKey((k) => k + 1);
  }, []);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setLoadError(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setLoadError(true);
  }, []);

  return (
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      {!compact && (
        <CardHeader
          avatar={<InsightsIcon color="primary" aria-hidden />}
          title={dashboard.title}
          subheader={dashboard.description}
          action={
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
              >
                새로고침
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<OpenInNewIcon />}
                component="a"
                href={dashboard.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Grafana에서 열기
              </Button>
            </Stack>
          }
        />
      )}
      <CardContent sx={{ p: compact ? 0 : undefined, pt: compact ? 0 : undefined, '&:last-child': { pb: compact ? 0 : undefined } }}>
        {loadError && (
          <Alert severity="warning" sx={{ mb: compact ? 0 : 2, borderRadius: compact ? 0 : undefined }}>
            대시보드를 불러오지 못했습니다. 관리자 로그인·WAS Grafana Cloud 설정(base-url·glsa 토큰)을 확인해 주세요.{' '}
            <Link href={dashboard.externalUrl} target="_blank" rel="noopener noreferrer">
              새 탭에서 열기
            </Link>
          </Alert>
        )}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            minHeight,
            bgcolor: 'background.default',
            borderRadius: compact ? 0 : 1,
            overflow: 'hidden',
            border: compact ? 0 : 1,
            borderColor: 'divider',
          }}
        >
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                bgcolor: 'background.default',
                zIndex: 1,
              }}
            >
              <CircularProgress size={32} aria-label="Grafana 대시보드 불러오는 중" />
              <Typography variant="body2" color="text.secondary">
                Grafana Cloud 대시보드를 불러오는 중…
              </Typography>
            </Box>
          )}
          <Box
            component="iframe"
            key={iframeKey}
            src={dashboard.embedUrl}
            title={`Grafana — ${dashboard.title}`}
            onLoad={handleLoad}
            onError={handleError}
            sx={{
              display: 'block',
              width: '100%',
              minHeight,
              border: 0,
              bgcolor: '#111',
            }}
            allow="fullscreen"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Box>
      </CardContent>
    </Card>
  );
}
