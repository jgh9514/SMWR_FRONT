'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';

export type AdminGateStatus = 'checking' | 'authorized' | 'denied' | 'login_required';

interface AdminAccessGateProps {
  status: Exclude<AdminGateStatus, 'authorized'>;
  onGoHome: () => void;
  onGoLogin: () => void;
}

function GateShell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
        py: 4,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ px: { xs: 3, sm: 4 }, py: 4 }}>{children}</CardContent>
      </Card>
    </Box>
  );
}

function IconCircle({
  children,
  bgcolor,
}: {
  children: React.ReactNode;
  bgcolor: string;
}) {
  return (
    <Box
      sx={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor,
      }}
    >
      {children}
    </Box>
  );
}

export default function AdminAccessGate({ status, onGoHome, onGoLogin }: AdminAccessGateProps) {
  if (status === 'checking') {
    return (
      <GateShell>
        <Stack alignItems="center" spacing={2.5}>
          <IconCircle bgcolor="action.hover">
            <CircularProgress size={28} aria-label="관리자 권한 확인 중" />
          </IconCircle>
          <Stack spacing={0.5} alignItems="center" textAlign="center">
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <AdminPanelSettingsOutlinedIcon fontSize="small" color="primary" aria-hidden />
              <Typography variant="h6" fontWeight={700}>
                관리자 페이지
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              권한을 확인하는 중입니다…
            </Typography>
          </Stack>
        </Stack>
      </GateShell>
    );
  }

  if (status === 'login_required') {
    return (
      <GateShell>
        <Stack alignItems="center" spacing={2.5}>
          <IconCircle bgcolor="primary.main">
            <LoginOutlinedIcon sx={{ fontSize: 28, color: 'primary.contrastText' }} aria-hidden />
          </IconCircle>
          <Stack spacing={0.75} alignItems="center" textAlign="center">
            <Typography variant="h6" fontWeight={700}>
              로그인이 필요합니다
            </Typography>
            <Typography variant="body2" color="text.secondary">
              관리자 기능은 로그인 후 이용할 수 있습니다.
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width="100%">
            <Button
              variant="contained"
              fullWidth
              startIcon={<LoginOutlinedIcon />}
              onClick={onGoLogin}
            >
              로그인
            </Button>
            <Button variant="outlined" fullWidth startIcon={<HomeOutlinedIcon />} onClick={onGoHome}>
              메인으로
            </Button>
          </Stack>
        </Stack>
      </GateShell>
    );
  }

  return (
    <GateShell>
      <Stack alignItems="center" spacing={2.5}>
        <IconCircle bgcolor="error.main">
          <LockOutlinedIcon sx={{ fontSize: 28, color: 'error.contrastText' }} aria-hidden />
        </IconCircle>
        <Stack spacing={0.75} alignItems="center" textAlign="center">
          <Typography variant="h6" fontWeight={700}>
            접근 권한 없음
          </Typography>
          <Typography variant="body2" color="text.secondary">
            관리자 권한이 있는 계정만 이 페이지에 접근할 수 있습니다.
            <br />
            다른 계정으로 로그인했는지 확인해 주세요.
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width="100%">
          <Button variant="contained" fullWidth startIcon={<HomeOutlinedIcon />} onClick={onGoHome}>
            메인으로
          </Button>
          <Button variant="outlined" fullWidth startIcon={<LoginOutlinedIcon />} onClick={onGoLogin}>
            다른 계정으로 로그인
          </Button>
        </Stack>
      </Stack>
    </GateShell>
  );
}
