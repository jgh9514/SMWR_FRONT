'use client';

import { CircularProgress, Box } from '@mui/material';
import { RtaSeasonsProvider, useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
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
  return (
    <RtaSeasonsProvider>
      <SeasonsGate>{children}</SeasonsGate>
    </RtaSeasonsProvider>
  );
}
