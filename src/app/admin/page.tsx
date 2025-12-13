'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ApiIcon from '@mui/icons-material/Api';
import CodeIcon from '@mui/icons-material/Code';
import LanguageIcon from '@mui/icons-material/Language';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import TrafficIcon from '@mui/icons-material/Traffic';
import ArticleIcon from '@mui/icons-material/Article';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PetsIcon from '@mui/icons-material/Pets';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useDashboardStats } from '@/features/admin/hooks/useDashboard';
import { PageHeader } from '@/shared/ui';
import { useResponsive } from '@/shared/hooks';

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
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1px solid ${color}30`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '24px', md: '32px' },
                color: color,
              }}
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
                <TrendingUpIcon
                  sx={{
                    fontSize: 16,
                    color: trend >= 0 ? 'success.main' : 'error.main',
                    mr: 0.5,
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: trend >= 0 ? 'success.main' : 'error.main',
                    fontWeight: 600,
                  }}
                >
                  {trend >= 0 ? '+' : ''}
                  {trend}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              width: { xs: 48, md: 56 },
              height: { xs: 48, md: 56 },
              borderRadius: 2,
              background: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ color, fontSize: { xs: 28, md: 32 } }}>{icon}</Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}


export default function AdminPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const responsive = useResponsive();
  const isMobile = isMounted ? responsive.isMobile : false;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 대시보드 통계 조회
  const { data: dashboardData, isLoading, isError, error } = useDashboardStats();

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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <PageHeader title="대시보드" />

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
                color="#1976d2"
                subtitle={`전체: ${(dashboardData.stats.totalUsers ?? 0).toLocaleString('ko-KR')}명`}
              />
              <StatCard
                title="오늘 로그인"
                value={dashboardData.stats.todayLogins ?? 0}
                icon={<TrafficIcon />}
                color="#2e7d32"
                subtitle={`전체 사용자: ${(dashboardData.stats.totalUsers ?? 0).toLocaleString('ko-KR')}명`}
              />
              <StatCard
                title="오늘 게시글"
                value={dashboardData.stats.todayPosts ?? 0}
                icon={<ArticleIcon />}
                color="#ed6c02"
                subtitle="공지사항 + 문의"
              />
              <StatCard
                title="오늘 길드 신청"
                value={dashboardData.stats.todayGuildApplications ?? 0}
                icon={<AssignmentIcon />}
                color="#9c27b0"
                subtitle="오늘 생성된 신청"
              />
            </Box>

            {/* 차트 섹션 */}
            {isMounted && chartData.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 3,
                  mb: 4,
                }}
              >
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                      일별 가입자 추이
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="가입자" stroke="#1976d2" fill="#1976d2" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                        일별 로그인 추이
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="로그인" stroke="#2e7d32" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                        일별 활동 통계
                      </Typography>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="가입자" fill="#1976d2" />
                          <Bar dataKey="로그인" fill="#2e7d32" />
                          <Bar dataKey="게시글" fill="#ed6c02" />
                          <Bar dataKey="길드 신청" fill="#9c27b0" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            )}

            {/* 최근 활동 테이블 */}
            {isMounted && chartData.length > 0 && (
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    최근 7일 통계 요약
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>날짜</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            가입자
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            로그인
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            게시글
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            길드 신청
                          </TableCell>
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
