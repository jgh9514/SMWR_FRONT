'use client';

import { Box, Button, Container, Typography, Paper } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import { useRouter } from 'next/navigation';

export default function Error403() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          animation: 'pulse 3s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': {
              opacity: 1,
              transform: 'scale(1)',
            },
            '50%': {
              opacity: 0.8,
              transform: 'scale(1.05)',
            },
          },
        },
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: { xs: 4, sm: 6 },
            borderRadius: 4,
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              mb: 4,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f5576c 0%, #d32f2f 100%)',
                mb: 3,
                animation: 'shake 2s ease-in-out infinite',
                boxShadow: '0 10px 30px rgba(245, 87, 108, 0.3)',
                '@keyframes shake': {
                  '0%, 100%': {
                    transform: 'translateX(0)',
                  },
                  '25%': {
                    transform: 'translateX(-10px)',
                  },
                  '75%': {
                    transform: 'translateX(10px)',
                  },
                },
              }}
            >
              <BlockIcon sx={{ fontSize: 60, color: 'white' }} />
            </Box>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '80px', sm: '120px' },
                fontWeight: 900,
                background: 'linear-gradient(135deg, #f5576c 0%, #d32f2f 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
                lineHeight: 1,
              }}
            >
              403
            </Typography>
          </Box>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: 'text.primary',
            }}
          >
            접근 권한이 없습니다
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mb: 4,
              fontSize: '1.1rem',
              lineHeight: 1.7,
            }}
          >
            이 페이지에 접근할 권한이 없습니다.
            <br />
            관리자에게 문의하시거나 홈으로 돌아가주세요.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/')}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #f5576c 0%, #d32f2f 100%)',
              boxShadow: '0 4px 15px rgba(245, 87, 108, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                boxShadow: '0 6px 20px rgba(245, 87, 108, 0.5)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            홈으로 이동
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}

