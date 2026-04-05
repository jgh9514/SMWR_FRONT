'use client';

import { Box, Button, Typography, Alert } from '@mui/material';
import Link from 'next/link';
import { useUserGuild } from '@/features/auth/hooks/useAuth';
import { isAuthenticated } from '@/shared/utils/auth';

type Props = {
  children: React.ReactNode;
  /** 길드 없을 때만 표시할 제목 */
  title?: string;
};

/**
 * 점령전 전적·최근 점령 등 길드 소속이 필요한 화면용.
 */
export default function GuildRequiredGate({ children, title = '길드 가입이 필요합니다' }: Props) {
  const loggedIn = isAuthenticated();
  const { data: guild, isLoading, isFetched } = useUserGuild();

  if (!loggedIn) {
    return (
      <Box sx={{ p: 3, maxWidth: 560, mx: 'auto' }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          이 기능은 로그인 후 길드에 소속된 소환사만 이용할 수 있습니다.
        </Alert>
        <Button component={Link} href="/login" variant="contained">
          로그인
        </Button>
      </Box>
    );
  }

  if (isLoading || !isFetched) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">길드 정보를 확인하는 중…</Typography>
      </Box>
    );
  }

  const hasGuild = !!(guild?.guild_id ?? guild?.guild_name);
  if (!hasGuild) {
    return (
      <Box sx={{ p: 3, maxWidth: 640, mx: 'auto' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography fontWeight={700}>{title}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            전적·길드 기반 점령전 기능은 길드에 가입한 뒤 이용할 수 있습니다. 길드 모집 게시판에서 길드를 찾거나 길드 가입 신청을 이용해 주세요.
          </Typography>
        </Alert>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button component={Link} href="/guild-recruitment" variant="contained">
            길드원 모집 보기
          </Button>
          <Button component={Link} href="/guild-application" variant="outlined">
            길드 가입 신청
          </Button>
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
}
