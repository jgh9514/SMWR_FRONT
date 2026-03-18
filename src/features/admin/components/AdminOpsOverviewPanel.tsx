'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LaunchIcon from '@mui/icons-material/Launch';
import type { IncidentDetail, OpsOverviewResponse } from '@/features/admin/types/admin';

interface AdminOpsOverviewPanelProps {
  data?: OpsOverviewResponse;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRefresh: () => void;
}

function getStatusColor(status?: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'critical') return 'error';
  if (status === 'warning') return 'warning';
  if (status === 'ok') return 'success';
  return 'default';
}

function getBadgeSx(color?: string) {
  if (color === 'red') {
    return { bgcolor: 'error.main', color: 'common.white' };
  }
  if (color === 'orange') {
    return { bgcolor: 'warning.main', color: 'common.white' };
  }
  if (color === 'purple') {
    return { bgcolor: 'secondary.main', color: 'common.white' };
  }
  return { bgcolor: 'warning.light', color: 'warning.contrastText' };
}

function IncidentCard({ detail }: { detail: IncidentDetail }) {
  const router = useRouter();

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {detail.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {detail.message}
            </Typography>
          </Box>
          <Chip label={detail.shortLabel} size="small" sx={getBadgeSx(detail.badgeColor)} />
        </Box>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip label={detail.priority.toUpperCase()} size="small" color={detail.priority === 'p1' ? 'error' : 'warning'} />
          <Chip label={`담당: ${detail.owner}`} size="small" variant="outlined" />
          <Chip label={`SLA ${detail.slaMinutes}분`} size="small" variant="outlined" />
          <Chip label={`갱신 ${detail.autoRefreshSeconds}초`} size="small" variant="outlined" />
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Playbook: {detail.playbook}
        </Typography>

        <Box sx={{ mt: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="contained"
            endIcon={<LaunchIcon />}
            onClick={() => router.push(detail.deepLink || '/admin')}
          >
            상세 이동
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function AdminOpsOverviewPanel({
  data,
  isLoading,
  isError,
  errorMessage,
  onRefresh,
}: AdminOpsOverviewPanelProps) {
  const incidentDetails = data?.health?.incidentDetails ?? [];
  const summaryMessage = data?.health?.summaryMessage ?? '운영 상태 정보를 불러오지 못했습니다.';
  const overallStatus = data?.health?.status ?? 'unknown';
  const reasons = useMemo(() => data?.health?.reasons ?? [], [data]);
  const actions = useMemo(() => data?.health?.recommendedActions ?? [], [data]);
  const primaryIncidentType = data?.health?.primaryIncidentType ?? 'stable';

  return (
    <Card sx={{ mb: 4 }}>
      <CardHeader
        title="운영 상태"
        subheader="배치, DB, API 로그, 런타임 상태를 종합한 운영 개요"
        action={
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={onRefresh}>
            새로고침
          </Button>
        }
      />
      <CardContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <Alert severity="error">
            운영 개요를 불러올 수 없습니다. {errorMessage ?? '알 수 없는 오류'}
          </Alert>
        ) : (
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={overallStatus.toUpperCase()} color={getStatusColor(overallStatus)} />
              <Chip label={primaryIncidentType} variant="outlined" />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {summaryMessage}
              </Typography>
            </Box>

            {reasons.length > 0 && (
              <Alert severity={overallStatus === 'critical' ? 'error' : overallStatus === 'warning' ? 'warning' : 'info'}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  감지 사유
                </Typography>
                {reasons.map((reason) => (
                  <Typography key={reason} variant="body2">
                    - {reason}
                  </Typography>
                ))}
              </Alert>
            )}

            {actions.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  권장 조치
                </Typography>
                <Stack spacing={0.75}>
                  {actions.map((action) => (
                    <Typography key={action} variant="body2" color="text.secondary">
                      - {action}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Incident Actions
              </Typography>
              {incidentDetails.length === 0 ? (
                <Alert severity="success">현재 즉시 대응이 필요한 운영 이슈가 없습니다.</Alert>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
                    gap: 2,
                  }}
                >
                  {incidentDetails.map((detail) => (
                    <IncidentCard key={detail.incidentType} detail={detail} />
                  ))}
                </Box>
              )}
            </Box>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
