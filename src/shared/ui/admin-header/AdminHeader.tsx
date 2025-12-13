'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useLogout } from '@/features/auth/hooks/useAuth';

export default function AdminHeader() {
  const router = useRouter();
  const logoutMutation = useLogout();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        try {
          setUserInfo(JSON.parse(storedUserInfo));
        } catch (error) {
          console.error('사용자 정보 파싱 실패', error);
        }
      }
    }
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await logoutMutation.mutateAsync({});
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 실패', error);
    }
  };

  const handleDashboard = () => {
    handleMenuClose();
    router.push('/admin');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'primary.main',
        boxShadow: 2,
        width: `calc(100% - ${280}px)`,
        ml: `${280}px`,
      }}
    >
      <Toolbar>
        <DashboardIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          관리자 시스템
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            size="large"
            edge="end"
            aria-label="account menu"
            aria-controls="admin-menu"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {userInfo?.user_name?.[0]?.toUpperCase() || 'A'}
            </Avatar>
          </IconButton>

          <Menu
            id="admin-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem disabled>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountCircleIcon fontSize="small" />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {userInfo?.user_name || '관리자'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {userInfo?.user_id || ''}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleDashboard}>
              <DashboardIcon fontSize="small" sx={{ mr: 1 }} />
              대시보드
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              로그아웃
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

