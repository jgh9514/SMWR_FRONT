'use client';

import { Box, Container, Typography } from '@mui/material';

export default function TermsPageClient() {
  return (
    <Container maxWidth="md" sx={{ py: 4, pb: 6 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
        이용약관
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        최종 수정일: 서비스 운영 정책에 따라 변경될 수 있습니다.
      </Typography>

      <Box sx={{ typography: 'body2', color: 'text.primary', '& p': { mb: 2 }, lineHeight: 1.7 }}>
        <Typography component="p">
          본 서비스는 팬·커뮤니티가 제공하는 비공식 도구입니다. 게임 데이터·이미지 등의 권리는
          원저작권자에게 있습니다. 이용자는 서비스 이용 시 관련 법령 및 게임 이용약관을 준수해야 합니다.
        </Typography>
        <Typography component="p">
          서비스는 예고 없이 변경·중단될 수 있으며, 이에 따른 손해에 대해 운영자는 고의 또는 중대한 과실이
          없는 한 책임을 지지 않습니다.
        </Typography>
      </Box>
    </Container>
  );
}
