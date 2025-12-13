'use client';

import { Box, Button, Card, CardContent, Container, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function CogPage() {
  const router = useRouter();

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        설정
      </Typography>
      <Container>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => router.push('/log-upload')}
                fullWidth
              >
                JSON 데이터 추가
              </Button>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  버전 0.0.1
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  최신 버전
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

