'use client';

import { Avatar, Box, Tooltip, Typography } from '@mui/material';
import type { DeckMonsterRuneDisplay } from '@/features/siege/types/rune';

interface RuneIconRowProps {
  runes: DeckMonsterRuneDisplay[];
  emptyLabel?: string;
  iconSize?: number;
}

export default function RuneIconRow({
  runes,
  emptyLabel = '룬 정보 없음',
  iconSize = 28,
}: RuneIconRowProps) {
  if (runes.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
      {runes.map((rune) => (
        <Tooltip
          key={rune.runeId}
          title={`${rune.nameKo} (${rune.requiredPieces}피스)`}
          arrow
        >
          <Avatar
            src={rune.imageUrl ?? undefined}
            alt={rune.nameKo}
            variant="rounded"
            sx={{
              width: iconSize,
              height: iconSize,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              p: 0.25,
              '& img': { objectFit: 'contain' },
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );
}
