'use client';

import type { ReactNode } from 'react';
import { Button, Container, Typography } from '@mui/material';
import Link from 'next/link';
import MonsterDetailContent from '@/features/siege/components/MonsterDetailContent';
import MonsterDetailLoadingSkeleton from '@/features/siege/components/MonsterDetailLoadingSkeleton';
import { DEVILMON_MONSTER_ID } from '@/features/siege/lib/devilmon';
import { useMonsterInfo } from '@/features/siege/hooks/useMonsterInfo';
import { getMonsterImageUrl } from '@/shared/utils/image';

export default function MonsterDetailShell({
  detail,
  children,
}: {
  detail: string;
  children: ReactNode;
}) {
  const monsterId = detail?.trim() ?? '';
  const { data: monsterInfo, isLoading, isError } = useMonsterInfo(monsterId || null);
  const { data: devilmonInfo } = useMonsterInfo(DEVILMON_MONSTER_ID);

  if (!monsterId) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography color="text.secondary">잘못된 몬스터 ID입니다.</Typography>
      </Container>
    );
  }

  if (isLoading) {
    return <MonsterDetailLoadingSkeleton />;
  }

  if (isError || !monsterInfo) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h6" gutterBottom>
          몬스터를 찾을 수 없습니다
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          ID {monsterId}에 해당하는 몬스터 정보가 없습니다.
        </Typography>
        <Button component={Link} href="/monster-search" variant="outlined" size="small">
          몬스터 검색으로
        </Button>
      </Container>
    );
  }

  const devilmonUrl = devilmonInfo?.image_url?.trim();
  const devilmonImageUrl = devilmonUrl
    ? getMonsterImageUrl(devilmonUrl)
    : getMonsterImageUrl('/images/default-monster.png');

  return (
    <MonsterDetailContent monsterInfo={monsterInfo} devilmonImageUrl={devilmonImageUrl}>
      {children}
    </MonsterDetailContent>
  );
}
