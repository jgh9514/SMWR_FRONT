'use client';

import { Box, Button, Container, Typography, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useRouter } from 'next/navigation';

export default function Error500() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          animation: 'rotate 20s linear infinite',
          '@keyframes rotate': {
            '0%': {
              transform: 'rotate(0deg)',
            },
            '100%': {
              transform: 'rotate(360deg)',
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
                background: 'linear-gradient(135deg, #f5576c 0%, #4facfe 100%)',
                mb: 3,
                animation: 'pulse 2s ease-in-out infinite',
                boxShadow: '0 10px 30px rgba(245, 87, 108, 0.3)',
                '@keyframes pulse': {
                  '0%, 100%': {
                    opacity: 1,
                    transform: 'scale(1)',
                  },
                  '50%': {
                    opacity: 0.8,
                    transform: 'scale(1.1)',
                  },
                },
              }}
            >
              <ErrorOutlineIcon
                sx={{
                  fontSize: 60,
                  color: 'white',
                  animation: 'shake 3s ease-in-out infinite',
                  '@keyframes shake': {
                    '0%, 100%': {
                      transform: 'translateX(0)',
                    },
                    '10%, 30%, 50%, 70%, 90%': {
                      transform: 'translateX(-5px)',
                    },
                    '20%, 40%, 60%, 80%': {
                      transform: 'translateX(5px)',
                    },
                  },
                }}
              />
            </Box>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '80px', sm: '120px' },
                fontWeight: 900,
                background: 'linear-gradient(135deg, #f5576c 0%, #4facfe 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
                lineHeight: 1,
              }}
            >
              500
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
            서버 오류가 발생했습니다
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
            일시적인 문제가 발생했습니다.
            <br />
            잠시 후 다시 시도해주시거나 관리자에게 문의해주세요.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => window.location.reload()}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 2,
                borderColor: '#4facfe',
                color: '#4facfe',
                '&:hover': {
                  borderColor: '#2196f3',
                  color: '#2196f3',
                  backgroundColor: 'rgba(79, 172, 254, 0.1)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              새로고침
            </Button>
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
                background: 'linear-gradient(135deg, #f5576c 0%, #4facfe 100%)',
                boxShadow: '0 4px 15px rgba(245, 87, 108, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #e53935 0%, #2196f3 100%)',
                  boxShadow: '0 6px 20px rgba(245, 87, 108, 0.5)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              홈으로 이동
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

