'use client';

import { ReactNode } from 'react';
import { Box, Fade } from '@mui/material';

interface ListWrapperProps {
  children: ReactNode;
}

export default function ListWrapper({ children }: ListWrapperProps) {
  return (
    <Fade in timeout={500}>
      <Box>{children}</Box>
    </Fade>
  );
}

