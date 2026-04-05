'use client';

import NextLink from 'next/link';
import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { SITE_NAME_DISPLAY } from '@/shared/lib/seo';

const linkSx = {
  color: 'text.secondary',
  fontSize: '0.8125rem',
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline', color: 'text.primary' },
} as const;

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        py: 3,
        px: 2,
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Box>
            <Typography
              component="span"
              variant="subtitle2"
              sx={{ fontWeight: 800, letterSpacing: 0.02, color: 'text.primary' }}
            >
              {SITE_NAME_DISPLAY}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              © {year}
            </Typography>
          </Box>

          <Stack
            direction="row"
            component="nav"
            aria-label="푸터 링크"
            flexWrap="wrap"
            justifyContent="center"
            useFlexGap
            spacing={2}
            sx={{ columnGap: 2, rowGap: 1 }}
          >
            <Link component={NextLink} href="/about" sx={linkSx}>
              소개
            </Link>
            <Link component={NextLink} href="/inquiry" sx={linkSx}>
              문의
            </Link>
            <Link component={NextLink} href="/privacy" sx={linkSx}>
              개인정보 처리방침
            </Link>
            <Link component={NextLink} href="/terms" sx={linkSx}>
              이용약관
            </Link>
            <Link component={NextLink} href="/privacy#cookies" sx={linkSx}>
              쿠키 안내
            </Link>
          </Stack>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ maxWidth: 560, lineHeight: 1.65, opacity: 0.92 }}
          >
            서머너즈 워는 Com2uS의 상표입니다. {SITE_NAME_DISPLAY}는 팬·커뮤니티 프로젝트이며 Com2uS와 제휴하거나
            공식적으로 보증받지 않습니다.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
