'use client';

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LayersIcon from '@mui/icons-material/Layers';
import HubIcon from '@mui/icons-material/Hub';
import ExtensionIcon from '@mui/icons-material/Extension';

const TECH_FRONT = [
  'Next.js 16 (App Router)',
  'React · TypeScript',
  'MUI · Emotion',
  '@tanstack/react-query',
  'Recoil',
  'Axios',
  'PWA (@ducanh2912/next-pwa)',
  'TipTap · Recharts',
];

const FEATURES = [
  {
    title: '점령전·전적',
    body: '시즌·길드 기준 전투 로그를 바탕으로 덱 검색, 최근 점령전, 전적 통계를 제공합니다.',
  },
  {
    title: 'RTA(실레나)',
    body: '실레나 전투 데이터 분석과 몬스터별 픽률·승률 등 통계 화면을 제공합니다.',
  },
  {
    title: '몬스터·커뮤니티',
    body: '몬스터 검색, 공지사항, 길드 연동 기능 등 커뮤니티·운영 도구를 포함합니다.',
  },
  {
    title: '관리·운영',
    body: '역할·메뉴·API 관리, 배치, 로그 업로드 등 관리자 기능을 지원합니다.',
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
          <Typography
            variant="overline"
            color="primary"
            sx={{ letterSpacing: 0.12, fontWeight: 700 }}
          >
            Portfolio · Project overview
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mt: 0.5, mb: 1 }}>
            전투 로그 분석 시스템
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
            서머너즈워 점령전·실레나(RTA) 전투 데이터를 수집·분석하고, 길드·커뮤니티 기능과 함께 제공하는
            웹 애플리케이션입니다. 본 페이지는 포트폴리오·제출용으로 서비스 목적과 기술 구성을 요약합니다.
          </Typography>
        </Box>

        <Stack spacing={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                <HubIcon color="primary" />
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                  서비스 개요
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                로그 업로드·백엔드 API와 연동하여 전투 기록을 저장하고, 프론트엔드에서 검색·차트·게시판
                형태로 소비할 수 있도록 구성되어 있습니다. 인증·길드·알림 등 사용자 단 기능과 관리자
                도구가 함께 포함된 풀스택 성격의 프로젝트입니다.
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                <LayersIcon color="primary" />
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                  프론트엔드 기술 스택
                </Typography>
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                {TECH_FRONT.map((t) => (
                  <Chip key={t} label={t} size="small" variant="outlined" />
                ))}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                모노레포의 경우 동일 저장소의 <strong>SMWR_WAS</strong>(Spring Boot)와 REST API로 통신합니다.
                배포·컨테이너 구성은 저장소 내 k8s·CI 문서를 참고하세요.
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                <ExtensionIcon color="primary" />
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                  주요 기능 영역
                </Typography>
              </Stack>
              <Stack divider={<Divider flexItem />} spacing={2}>
                {FEATURES.map((f) => (
                  <Box key={f.title}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                      {f.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {f.body}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
