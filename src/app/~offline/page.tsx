'use client';

import { Box, Button, Container, Paper, Typography } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useRouter } from 'next/navigation';

export default function OfflinePage() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={24} sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
          <WifiOffIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            네트워크에 연결할 수 없습니다
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            인터넷 연결을 확인한 뒤 다시 시도해 주세요.
          </Typography>
          <Button variant="contained" onClick={() => router.push('/')}>
            홈으로
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
