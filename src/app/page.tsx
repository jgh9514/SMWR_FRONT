'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Container, Typography, Divider, Alert } from '@mui/material';
import { useRouter } from 'next/navigation';
import CastleIcon from '@mui/icons-material/Castle';
import HistoryIcon from '@mui/icons-material/History';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import BarChartIcon from '@mui/icons-material/BarChart';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import ForumIcon from '@mui/icons-material/Forum';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import GroupIcon from '@mui/icons-material/Group';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { logger } from '@/shared/lib/logger';
import { useGuildApplicationList } from '@/hooks/api';
import { Chip } from '@mui/material';
import { isAuthenticated } from '@/shared/utils/auth';

interface MenuCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

const MenuCard = React.memo<MenuCardProps>(({ title, description, icon, onClick, color }) => {
  return (
    <Card
      sx={{
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: 6,
          borderColor: color,
        },
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${title} 메뉴로 이동`}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            width: { xs: 48, md: 64 },
            height: { xs: 48, md: 64 },
            borderRadius: 2,
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
          aria-hidden="true"
        >
          <Box sx={{ color, fontSize: { xs: 28, md: 36 } }}>{icon}</Box>
        </Box>
        <Typography
          variant="h6"
          component="h3"
          sx={{
            fontWeight: 700,
            mb: 1,
            fontSize: { xs: '16px', md: '20px' },
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: { xs: '13px', md: '14px' },
            flex: 1,
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
});

MenuCard.displayName = 'MenuCard';

interface MenuItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

interface Section {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  items: MenuItem[];
}

export default function Home() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const responsive = useResponsive();
  const isMobile = isMounted ? responsive.isMobile : false;
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 로그인 상태일 때만 userInfo 가져오기
      if (isAuthenticated()) {
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
          try {
            setUserInfo(JSON.parse(storedUserInfo));
          } catch (error) {
            logger.error('사용자 정보 파싱 실패', error);
          }
        }
      } else {
        // 로그인하지 않은 경우 userInfo 초기화
        setUserInfo(null);
      }
    }
  }, []);

  // 길드 신청 목록 조회
  const guildApplicationListQuery = useGuildApplicationList({
    enabled: true,
  });

  // 현재 사용자의 길드 생성 신청 찾기 (길드가 없는 경우)
  const myGuildApplication = guildApplicationListQuery.data?.find(
    (app: any) => app.user_id === userInfo?.user_id && !app.guild_id && app.status === 'PENDING'
  );

  const hasGuild = isAuthenticated() && !!userInfo?.guild_id; // 로그인 상태일 때만 길드 정보 사용
  const isAdmin = isAuthenticated() && (userInfo?.roles?.some((role: any) => role.role_id === 'RL0001') || false);
  const isGuildLeaderOrManager = isAuthenticated() && (userInfo?.guild_role === 'LEADER' || userInfo?.guild_role === 'MANAGER');

  const getStatusLabel = (status?: string) => {
    if (status === 'APPROVED') return '승인';
    if (status === 'REJECTED') return '반려';
    if (status === 'PENDING') return '대기';
    return '알 수 없음';
  };

  const getStatusColor = (status?: string) => {
    if (status === 'APPROVED') return 'success';
    if (status === 'REJECTED') return 'error';
    if (status === 'PENDING') return 'warning';
    return 'default';
  };

  const sections: Section[] = useMemo(
    () => {
      // RTA 섹션 아이템
      const rtaItems = [
        {
          title: 'RTA 분석',
          description: '실레나 전투 데이터를 분석하세요',
          icon: <SportsEsportsIcon />,
          path: '/rta',
          color: '#d32f2f',
        },
        {
          title: 'RTA 몬스터별 통계',
          description: '몬스터별 픽률, 승률, 선픽율, 벤율을 확인하세요',
          icon: <BarChartIcon />,
          path: '/rta/monster-stats',
          color: '#e91e63',
        },
      ];

      // 관리자만 실레나 로그 업로드 가능
      if (isAdmin) {
        rtaItems.push({
          title: '실레나 로그 업로드',
          description: '실레나 로그 파일을 업로드하세요 (관리자 전용)',
          icon: <UploadFileIcon />,
          path: '/log-upload?type=rta',
          color: '#c62828',
        });
      }

      // Siege 섹션 아이템
      const siegeItems: MenuItem[] = [];
      if (hasGuild) {
        siegeItems.push(
          {
            title: '전체 점령전',
            description: '시즌별 공방덱 통계를 확인하세요',
            icon: <CastleIcon />,
            path: '/siege',
            color: '#1976d2',
          },
          {
            title: '최근 점령전',
            description: '최신 점령전 데이터를 확인하세요',
            icon: <HistoryIcon />,
            path: '/recent-siege',
            color: '#2e7d32',
          },
          {
            title: '전적 조회',
            description: '시즌별 공성률 통계를 확인하세요',
            icon: <BarChartIcon />,
            path: '/battle-history',
            color: '#ed6c02',
          },
        );

        // 관리자 또는 길드장/매니저만 점령전 로그 업로드 가능
        if (isAdmin || isGuildLeaderOrManager) {
          siegeItems.push({
            title: '점령전 로그 업로드',
            description: '점령전 로그 파일을 업로드하세요',
            icon: <UploadFileIcon />,
            path: '/log-upload?type=siege',
            color: '#1565c0',
          });
        }

        // 길드장/매니저만 길드 관리 가능
        if (isGuildLeaderOrManager) {
          siegeItems.push({
            title: '길드 관리',
            description: '길드 정보 및 멤버를 관리하세요',
            icon: <GroupIcon />,
            path: '/guild-management',
            color: '#9c27b0',
          });
        }
      }

      return [
        {
          title: 'RTA (실레나)',
          description: '실레나 전투 데이터 분석',
          icon: <SportsEsportsIcon />,
          color: '#d32f2f',
          items: rtaItems,
        },
        {
          title: 'Siege (점령전)',
          description: '점령전 전투 데이터 분석',
          icon: <CastleIcon />,
          color: '#1976d2',
          items: siegeItems,
        },
        {
          title: '커뮤니티',
          description: '게임 정보 공유 및 소통',
          icon: <ForumIcon />,
          color: '#9c27b0',
          items: [
            {
              title: '공지사항',
              description: '시스템 공지사항을 확인하세요',
              icon: <AnnouncementIcon />,
              path: '/notice',
              color: '#9c27b0',
            },
            {
              title: '1대1 문의',
              description: '문의사항을 등록하고 답변을 확인하세요',
              icon: <QuestionAnswerIcon />,
              path: '/inquiry',
              color: '#9c27b0',
            },
          ],
        },
        {
          title: '가이드',
          description: '시스템 사용 가이드',
          icon: <MenuBookIcon />,
          color: '#616161',
          items: [
            {
              title: '사용 가이드',
              description: '시스템 사용 방법을 확인하세요',
              icon: <MenuBookIcon />,
              path: '/guide',
              color: '#616161',
            },
            {
              title: '몬스터 검색',
              description: '몬스터 정보를 검색하세요',
              icon: <SearchIcon />,
              path: '/monster-search',
              color: '#0288d1',
            },
          ],
        },
      ];
    },
    [hasGuild, isAdmin, isGuildLeaderOrManager],
  );

  const handleMenuClick = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="lg">
        <Box
          component="header"
          sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}
          role="banner"
        >
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 1,
              fontSize: { xs: '28px', md: '40px' },
            }}
          >
            전투 로그 분석 시스템
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              fontSize: { xs: '14px', md: '16px' },
            }}
          >
            점령전과 실레나 전투 데이터를 분석하고 관리하세요
          </Typography>
        </Box>


        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
            },
            gap: { xs: 4, md: 4 },
          }}
        >
          {sections.map((section) => (
            <Card
              key={section.title}
              sx={{
                p: { xs: 2, md: 3 },
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  boxShadow: 4,
                  borderColor: `${section.color}50`,
                },
              }}
            >
              {/* 섹션 헤더 */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  mb: 3,
                  pb: 2,
                  borderBottom: '2px solid',
                  borderColor: `${section.color}30`,
                }}
              >
                <Box
                  sx={{
                    width: { xs: 40, md: 48 },
                    height: { xs: 40, md: 48 },
                    borderRadius: 2,
                    background: `${section.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: section.color,
                  }}
                >
                  <Box sx={{ fontSize: { xs: 24, md: 28 } }}>{section.icon}</Box>
                </Box>
                <Box>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: '18px', md: '22px' },
                      color: section.color,
                    }}
                  >
                    {section.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '12px', md: '13px' } }}>
                    {section.description}
                  </Typography>
                </Box>
              </Box>

              {/* 섹션 메뉴 아이템 */}
              {section.items.length > 0 ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(2, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  {section.items.map((item) => (
                    <MenuCard
                      key={item.path}
                      title={item.title}
                      description={item.description}
                      icon={item.icon}
                      onClick={() => handleMenuClick(item.path)}
                      color={item.color}
                    />
                  ))}
                </Box>
              ) : myGuildApplication ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 4,
                    px: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                    길드 생성 신청 중
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      길드명
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {myGuildApplication.guild_name || '정보 없음'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={getStatusLabel(myGuildApplication.status)}
                      color={getStatusColor(myGuildApplication.status) as any}
                      size="small"
                    />
                  </Box>
                  {myGuildApplication.crt_date && (
                    <Typography variant="caption" color="text.secondary">
                      신청일: {isMounted ? new Date(myGuildApplication.crt_date).toLocaleDateString('ko-KR') : '-'}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 4,
                    px: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                  }}
                >
                  <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                    길드 가입이 필요합니다
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    점령전 기능을 사용하려면 먼저 길드에 가입해주세요.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => router.push('/settings')}
                    startIcon={<GroupIcon />}
                  >
                    길드 가입하기
                  </Button>
                </Box>
              )}
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
