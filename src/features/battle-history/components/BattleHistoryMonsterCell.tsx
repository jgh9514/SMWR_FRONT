'use client';

import { Avatar, Box } from '@mui/material';
import { getRenderableImageUrl } from '@/shared/utils/image';

type Props = {
  urls: (string | undefined)[];
  borderColor: string;
  size?: number;
  justifyContent?: 'flex-start' | 'center' | 'flex-end';
};

export default function BattleHistoryMonsterCell({
  urls,
  borderColor,
  size = 36,
  justifyContent = 'center',
}: Props) {
  const monsters = urls.filter(Boolean) as string[];
  if (monsters.length === 0) {
    return (
      <Box component="span" sx={{ color: 'text.disabled', typography: 'caption' }}>
        —
      </Box>
    );
  }
  return (
    <Box sx={{ display: 'flex', gap: 0.5, justifyContent, flexWrap: 'nowrap' }}>
      {monsters.map((url, i) => (
        <Avatar
          key={`${url}-${i}`}
          src={getRenderableImageUrl(url)}
          alt=""
          sx={{
            width: size,
            height: size,
            border: '2px solid',
            borderColor,
          }}
        />
      ))}
    </Box>
  );
}
