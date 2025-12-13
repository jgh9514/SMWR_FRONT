'use client';

import { Box, Button, Container, Typography, Paper } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useRouter } from 'next/navigation';

export default function Error401() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            },
            '50%': {
              opacity: 0.7,
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
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)',
                mb: 3,
                animation: 'float 3s ease-in-out infinite',
                boxShadow: '0 10px 30px rgba(255, 107, 107, 0.3)',
                '@keyframes float': {
                  '0%, 100%': {
                    transform: 'translateY(0px)',
                  },
                  '50%': {
                    transform: 'translateY(-20px)',
                  },
                },
              }}
            >
              <LockIcon sx={{ fontSize: 60, color: 'white' }} />
            </Box>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '80px', sm: '120px' },
                fontWeight: 900,
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
                lineHeight: 1,
              }}
            >
              401
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
            인증이 필요합니다
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
            이 페이지에 접근하려면 로그인이 필요합니다.
            <br />
            로그인 후 다시 시도해주세요.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/login')}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)',
              boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #ff5252 0%, #ff8c00 100%)',
                boxShadow: '0 6px 20px rgba(255, 107, 107, 0.5)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            로그인 페이지로 이동
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}

