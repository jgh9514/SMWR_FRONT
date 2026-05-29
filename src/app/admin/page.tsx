'use client';

import { useMemo, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import TrafficIcon from '@mui/icons-material/Traffic';
import ArticleIcon from '@mui/icons-material/Article';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useAdminOpsOverview, useDashboardStats } from '@/features/admin/hooks/useDashboard';
import { PageHeader } from '@/shared/ui';
import AdminOpsOverviewPanel from '@/features/admin/components/AdminOpsOverviewPanel';

const AdminDashboardCharts = dynamic(
  () => import('@/features/admin/components/AdminDashboardCharts'),
  {
    ssr: false,
    loading: () => null,
  },
);

interface StatCardPropsLocal {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  subtitle?: string;
}

function StatCard({ title, value, icon, color, trend, subtitle }: StatCardPropsLocal) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        background: (t) => `linear-gradient(135deg, ${t.palette.background.paper} 0%, ${t.palette.background.default} 100%)`,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: color,
          boxShadow: `0 0 0 1px ${color}40, 0 8px 32px rgba(0,0,0,0.3)`,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block' }}>
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', md: '2rem' }, color, fontVariantNumeric: 'tabular-nums' }}
            >
              {typeof value === 'number' ? value.toLocaleString('ko-KR') : value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUpIcon sx={{ fontSize: 14, color: trend >= 0 ? 'success.main' : 'error.main', mr: 0.5 }} />
                <Typography variant="caption" sx={{ color: trend >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}>
                  {trend >= 0 ? '+' : ''}{trend}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              width: { xs: 44, md: 52 },
              height: { xs: 44, md: 52 },
              borderRadius: 2,
              bgcolor: `${color}1a`,
              border: `1px solid ${color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Box sx={{ color, fontSize: { xs: 24, md: 28 }, display: 'flex' }}>{icon}</Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}


export default function AdminPage() {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // 대시보드 통계 조회
  const { data: dashboardData, isLoading, isError, error } = useDashboardStats();
  const {
    data: opsOverview,
    isLoading: isOpsLoading,
    isError: isOpsError,
    error: opsError,
    refetch: refetchOpsOverview,
  } = useAdminOpsOverview();

  // 차트 데이터 포맷팅
  const chartData = useMemo(() => {
    if (!dashboardData?.dailyStats) return [];
    return dashboardData.dailyStats.map((item) => ({
      date: item.date.substring(5), // MM-DD 형식
      가입자: item.signups ?? 0,
      로그인: item.logins ?? 0,
      게시글: item.posts ?? 0,
      '길드 신청': item.guildApplications ?? 0,
    }));
  }, [dashboardData]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', justifyContent: 'center' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 }, width: '100%' }}>
        <PageHeader title="대시보드" />

        <AdminOpsOverviewPanel
          data={opsOverview}
          isLoading={isOpsLoading}
          isError={isOpsError}
          errorMessage={opsError instanceof Error ? opsError.message : '알 수 없는 오류'}
          onRefresh={() => {
            void refetchOpsOverview();
          }}
        />

        {/* 통계 카드 섹션 */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            통계 데이터를 불러올 수 없습니다. {error instanceof Error ? error.message : '알 수 없는 오류'}
          </Alert>
        ) : dashboardData ? (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 3,
                mb: 4,
              }}
            >
              <StatCard
                title="오늘 가입자"
                value={dashboardData.stats.todaySignups ?? 0}
                icon={<PersonAddIcon />}
                color="#38bdf8"
                subtitle={`전체: ${(dashboardData.stats.totalUsers ?? 0).toLocaleString('ko-KR')}명`}
              />
              <StatCard
                title="오늘 로그인"
                value={dashboardData.stats.todayLogins ?? 0}
                icon={<TrafficIcon />}
                color="#10b981"
                subtitle={`전체 사용자: ${(dashboardData.stats.totalUsers ?? 0).toLocaleString('ko-KR')}명`}
              />
              <StatCard
                title="오늘 게시글"
                value={dashboardData.stats.todayPosts ?? 0}
                icon={<ArticleIcon />}
                color="#f59e0b"
                subtitle="공지사항 + 문의"
              />
              <StatCard
                title="오늘 길드 신청"
                value={dashboardData.stats.todayGuildApplications ?? 0}
                icon={<AssignmentIcon />}
                color="#a855f7"
                subtitle="오늘 생성된 신청"
              />
            </Box>

            {/* 차트 섹션 */}
            {isClient && chartData.length > 0 && <AdminDashboardCharts chartData={chartData} />}

            {/* 최근 활동 테이블 */}
            {isClient && chartData.length > 0 && (
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    최근 7일 통계 요약
                  </Typography>
                  <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['날짜', '가입자', '로그인', '게시글', '길드 신청'].map((h, i) => (
                            <TableCell
                              key={h}
                              align={i === 0 ? 'left' : 'right'}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                letterSpacing: '0.04em',
                                color: 'text.secondary',
                                bgcolor: 'action.hover',
                                borderBottom: '2px solid',
                                borderColor: 'divider',
                              }}
                            >
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {chartData.slice(-7).reverse().map((row, index) => (
                          <TableRow key={index} hover>
                            <TableCell>{row.date}</TableCell>
                            <TableCell align="right">{(row.가입자 ?? 0).toLocaleString('ko-KR')}</TableCell>
                            <TableCell align="right">{(row.로그인 ?? 0).toLocaleString('ko-KR')}</TableCell>
                            <TableCell align="right">{(row.게시글 ?? 0).toLocaleString('ko-KR')}</TableCell>
                            <TableCell align="right">{(row['길드 신청'] ?? 0).toLocaleString('ko-KR')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </Container>
    </Box>
  );
}
