'use client';

import { Box, Button, Card, CardContent, Container, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

export default function ConditionPage() {
  const router = useRouter();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/admin')} startIcon={<ArrowBackIcon />}>
            목록
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '20px', md: '24px' } }}>
            검색 조건 관리
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              검색 조건 관리 기능
            </Typography>
            <Typography variant="body2" color="text.secondary">
              개발 중입니다
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
