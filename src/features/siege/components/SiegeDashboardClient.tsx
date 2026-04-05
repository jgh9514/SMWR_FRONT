'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Typography,
} from '@mui/material';
import CastleIcon from '@mui/icons-material/Castle';
import HistoryIcon from '@mui/icons-material/History';
import BarChartIcon from '@mui/icons-material/BarChart';
import GroupIcon from '@mui/icons-material/Group';
import { PageBanner, PageHeader } from '@/shared/ui';

const cards: Array<{
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}> = [
  {
    title: '전체 점령전',
    description: '매치·길드·몬스터 기준으로 점령전 데이터를 탐색합니다.',
    href: '/siege',
    icon: <CastleIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
  },
  {
    title: '최근 점령전',
    description: '내 길드 기준 최근 점령전 이력을 확인합니다. (길드 가입 필요)',
    href: '/recent-siege',
    icon: <HistoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
  },
  {
    title: '전적 조회',
    description: '시즌·소환사별 점령전 전적을 조회합니다. (길드 가입 필요)',
    href: '/battle-history',
    icon: <BarChartIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
  },
  {
    title: '길드원 모집',
    description: '길드명·서버·전시즌 등급을 올리고 길드원을 모집합니다.',
    href: '/guild-recruitment',
    icon: <GroupIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
  },
];

export default function SiegeDashboardClient() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 2, md: 6 } }}>
      <PageBanner />
      <Container sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, md: 3 } }}>
        <PageHeader title="점령전 대시보드" />
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
          점령전 관련 메뉴로 바로 이동할 수 있습니다. 최근 점령전·전적 조회는 길드 가입 후 이용할 수 있습니다.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 2,
            mt: 3,
          }}
        >
          {cards.map((c) => (
            <Card key={c.href} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardActionArea component={Link} href={c.href} sx={{ alignItems: 'stretch', height: '100%' }}>
                <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box sx={{ flexShrink: 0, pt: 0.5 }}>{c.icon}</Box>
                  <Box>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {c.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {c.description}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
