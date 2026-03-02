'use client';

import { Box, Skeleton, Typography } from '@mui/material';

interface LoadingStateProps {
  message?: string;
  size?: number;
}

export default function LoadingState({ message, size = 40 }: LoadingStateProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
      <Skeleton variant="circular" width={size} height={size} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
}

