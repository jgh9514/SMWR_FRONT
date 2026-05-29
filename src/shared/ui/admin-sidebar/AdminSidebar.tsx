'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Typography,
  Divider,
  Toolbar,
  alpha,
  useTheme,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import LanguageIcon from '@mui/icons-material/Language';
import HistoryIcon from '@mui/icons-material/History';
import GroupIcon from '@mui/icons-material/Group';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PetsIcon from '@mui/icons-material/Pets';
import DashboardIcon from '@mui/icons-material/Dashboard';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import type { MenuCategory, AdminMenuItem } from '@/features/admin/types/admin';
import { ADMIN_DRAWER_WIDTH } from '@/shared/ui/admin-layout/constants';

interface MenuItemWithIcon extends AdminMenuItem {
  icon: React.ReactNode;
}

interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItemWithIcon[];
}

interface AdminSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const menuCategories: MenuCategoryWithItems[] = [
  {
    title: '사용자 및 권한 관리',
    items: [
      {
        title: '사용자 관리',
        description: '시스템 사용자 목록 조회',
        icon: <PeopleIcon />,
        path: '/admin/userlist',
        color: '#1976d2',
      },
      {
        title: '권한 관리',
        description: '시스템 권한 생성 및 관리',
        icon: <SecurityIcon />,
        path: '/admin/rolemn',
        color: '#d32f2f',
      },
      {
        title: '권한별 사용자',
        description: '권한에 할당된 사용자 관리',
        icon: <PeopleIcon />,
        path: '/admin/roleuserlist',
        color: '#ed6c02',
      },
    ],
  },
  {
    title: '다국어',
    items: [
      {
        title: '다국어 관리',
        description: '다국어 텍스트 관리',
        icon: <LanguageIcon />,
        path: '/admin/mlangmn',
        color: '#1976d2',
      },
    ],
  },
  {
    title: '이력 및 길드 관리',
    items: [
      {
        title: '로그인 이력',
        description: '사용자 로그인 이력 조회',
        icon: <HistoryIcon />,
        path: '/admin/loginhislist',
        color: '#388e3c',
      },
      {
        title: 'API 이력',
        description: 'API 호출 이력 조회',
        icon: <HistoryIcon />,
        path: '/admin/apihislist',
        color: '#e64a19',
      },
      {
        title: '길드 신청 관리',
        description: '길드 생성 신청 목록 조회 및 승인',
        icon: <GroupIcon />,
        path: '/admin/guildapplication',
        color: '#9c27b0',
      },
    ],
  },
  {
    title: '시스템 관리',
    items: [
      {
        title: '배치 관리',
        description: '배치 작업 수동 실행 및 관리',
        icon: <PlayCircleOutlineIcon />,
        path: '/admin/batch',
        color: '#1976d2',
      },
      {
        title: '몬스터 관리',
        description: '몬스터 정보 조회 및 수정',
        icon: <PetsIcon />,
        path: '/admin/monster',
        color: '#9c27b0',
      },
      {
        title: '쿼리 성능',
        description: '느린 쿼리/실행중 쿼리 모니터링',
        icon: <QueryStatsIcon />,
        path: '/admin/query-perf',
        color: '#455a64',
      },
    ],
  },
];

const drawerPaperSx = {
  width: ADMIN_DRAWER_WIDTH,
  boxSizing: 'border-box',
  borderRight: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.default',
  backgroundImage: 'none',
  overflowY: 'auto' as const,
};

export default function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const [manuallyOpenCategories, setManuallyOpenCategories] = useState<Record<string, boolean>>({});
  const openCategories = useMemo(() => {
    const currentCategory = menuCategories.find((category) =>
      category.items.some((item) => item.path === pathname),
    );
    if (!currentCategory) {
      return manuallyOpenCategories;
    }

    return {
      ...manuallyOpenCategories,
      [currentCategory.title]: true,
    };
  }, [manuallyOpenCategories, pathname]);

  const handleCategoryToggle = (categoryTitle: string) => {
    setManuallyOpenCategories((prev) => ({
      ...prev,
      [categoryTitle]: !prev[categoryTitle],
    }));
  };

  const handleMenuItemClick = (path: string) => {
    router.push(path);
    onMobileClose();
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        sx={{
          minHeight: '64px !important',
          borderBottom: '1px solid',
          borderColor: 'divider',
          background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.12)} 0%, transparent 60%)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DashboardIcon sx={{ fontSize: 18, color: 'primary.contrastText' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary' }}>
            관리 메뉴
          </Typography>
        </Box>
      </Toolbar>

      <List>
        <ListItem disablePadding>
          <ListItemButton
            selected={pathname === '/admin'}
            onClick={() => handleMenuItemClick('/admin')}
          >
            <ListItemIcon>
              <DashboardIcon color={pathname === '/admin' ? 'primary' : 'action'} />
            </ListItemIcon>
            <ListItemText primary="대시보드" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />

      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <List>
          {menuCategories.map((category) => (
            <Box key={category.title}>
              <ListItemButton
                onClick={() => handleCategoryToggle(category.title)}
                sx={{
                  py: 1.5,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {category.title}
                    </Typography>
                  }
                />
                {openCategories[category.title] ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </ListItemButton>
              <Collapse in={openCategories[category.title]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {category.items.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                      <ListItemButton
                        key={item.path}
                        selected={isActive}
                        onClick={() => handleMenuItemClick(item.path)}
                        sx={{
                          pl: 3,
                          py: 1,
                          mx: 1,
                          mb: 0.5,
                          borderRadius: 1.5,
                          '&.Mui-selected': {
                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                          },
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Box sx={{ color: isActive ? 'primary.main' : 'action.active', display: 'flex' }}>
                            {item.icon}
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: isActive ? 700 : 400, fontSize: '0.875rem', color: isActive ? 'primary.main' : 'text.primary' }}
                            >
                              {item.title}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', display: 'block' }}>
                              {item.description}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          ))}
        </List>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          zIndex: (t) => t.zIndex.drawer,
          '& .MuiDrawer-paper': drawerPaperSx,
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: ADMIN_DRAWER_WIDTH,
          flexShrink: 0,
          zIndex: (t) => t.zIndex.drawer,
          '& .MuiDrawer-paper': {
            ...drawerPaperSx,
            position: 'fixed',
            height: '100vh',
            top: 0,
            left: 0,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}
