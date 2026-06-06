'use client';

import { CircularProgress, Box } from '@mui/material';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
import type { ReactNode } from 'react';

function SeasonsGate({ children }: { children: ReactNode }) {
  const { data: seasonsData, isLoading } = useRtaSeasonsContext();
  if (isLoading || !seasonsData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }
  return <>{children}</>;
}

export default function RtaSeasonsLayoutClient({ children }: { children: ReactNode }) {
  return <SeasonsGate>{children}</SeasonsGate>;
}
