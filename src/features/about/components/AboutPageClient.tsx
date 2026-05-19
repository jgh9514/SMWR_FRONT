'use client';

import NextLink from 'next/link';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CastleIcon from '@mui/icons-material/Castle';
import PetsIcon from '@mui/icons-material/Pets';
import ForumIcon from '@mui/icons-material/Forum';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { SITE_NAME_DISPLAY } from '@/shared/lib/seo';

type ServiceBlock = {
  title: string;
  icon: React.ReactNode;
  description: string;
  links: { label: string; href: string }[];
};

const SERVICES: ServiceBlock[] = [
  {
    title: 'RTA · 실레나',
    icon: <SportsEsportsIcon color="primary" />,
    description:
      '수집된 리플레이 기준으로 대시보드, 소환사 랭킹, 플레이어별 전적·시너지·픽/밴 통계, 몬스터별 픽률·승률·조합 등을 제공합니다.',
    links: [
      { label: 'RTA 홈', href: '/rta' },
      { label: '소환사 랭킹', href: '/rta/summoner-ranking' },
      { label: '몬스터 통계', href: '/rta/monster-stats' },
      { label: '티어·컷', href: '/rta/rank-cutoffs' },
    ],
  },
  {
    title: '점령전',
    icon: <CastleIcon color="primary" />,
    description:
      '점령전 로그를 바탕으로 덱·전적을 검색하고, 시즌·길드 단위로 전투를 살펴볼 수 있습니다.',
    links: [
      { label: '점령전', href: '/siege' },
      { label: '최근 점령전', href: '/recent-siege' },
      { label: '점령전 지도', href: '/siege/map' },
      { label: '지도 히스토리', href: '/siege/map/history' },
    ],
  },
  {
    title: '몬스터',
    icon: <PetsIcon color="primary" />,
    description: '몬스터 검색으로 스킬·스탯·이미지를 확인하고, 상세 페이지에서 추가 정보를 볼 수 있습니다.',
    links: [{ label: '몬스터 검색', href: '/monster-search' }],
  },
  {
    title: '커뮤니티 · 공지',
    icon: <ForumIcon color="primary" />,
    description: '공지사항과 길드 모집 게시판으로 소식을 확인할 수 있습니다.',
    links: [
      { label: '공지사항', href: '/notice' },
      { label: '길드 모집', href: '/guild-recruitment' },
    ],
  },
  {
    title: '데이터 · 계정 (로그인)',
    icon: <CloudUploadIcon color="primary" />,
    description:
      '로그인 후 전투 로그 업로드, 계정·길드 설정, 전투 이력 등 개인화 기능을 이용할 수 있습니다.',
    links: [
      { label: '로그 업로드', href: '/log-upload' },
      { label: '전투 이력', href: '/battle-history' },
      { label: '설정', href: '/settings' },
    ],
  },
];

export default function AboutPageClient() {
  const router = useRouter();

  return (
    <Box sx={{ py: { xs: 3, md: 5 }, pb: { xs: 6, md: 8 } }}>
      <Container maxWidth="md">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/')}
          sx={{ mb: 3 }}
          color="inherit"
        >
          홈으로
        </Button>

        <Box sx={{ mb: 4 }}>
          <Typography variant="overline" color="primary" sx={{ letterSpacing: 0.12, fontWeight: 700 }}>
            서비스 소개
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mt: 0.5, mb: 1 }}>
            {SITE_NAME_DISPLAY}에서 제공하는 기능
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680, lineHeight: 1.75 }}>
            이 사이트는 서머너즈워 플레이를 돕기 위한{' '}
            <strong>데이터 조회·통계·커뮤니티</strong> 기능을 모아 두었습니다. 아래에서 영역별로 어떤
            화면과 메뉴가 있는지 확인한 뒤, 바로 이동해 보세요.
          </Typography>
        </Box>

        <Stack spacing={2.5}>
          {SERVICES.map((block) => (
            <Card key={block.title} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack direction="row" alignItems="flex-start" gap={1.25} sx={{ mb: 1.5 }}>
                  <Box sx={{ pt: 0.25 }}>{block.icon}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 800, mb: 1 }}>
                      {block.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75, mb: 2 }}>
                      {block.description}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {block.links.map((l) => (
                        <Button
                          key={l.href}
                          component={NextLink}
                          href={l.href}
                          size="small"
                          variant="outlined"
                          endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                        >
                          {l.label}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 4, lineHeight: 1.65 }}>
          제공 범위·데이터 출처는 수집·집계 방식에 따라 달라질 수 있습니다. 자세한 안내는 각 화면의 도움말·공지를
          참고해 주세요.
        </Typography>
      </Container>
    </Box>
  );
}
