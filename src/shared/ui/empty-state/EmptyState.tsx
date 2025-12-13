'use client';

import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface EmptyStateProps {
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ message = '데이터가 없습니다', icon, action }: EmptyStateProps) {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      {icon && <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>{icon}</Box>}
      <Typography variant="body2" color="text.secondary" sx={{ mb: action ? 2 : 0 }}>
        {message}
      </Typography>
      {action && <Box>{action}</Box>}
    </Box>
  );
}

