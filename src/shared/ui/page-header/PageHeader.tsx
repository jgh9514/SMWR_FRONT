'use client';

import { Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title?: string;
  backPath?: string;
  onBack?: () => void;
  actions?: ReactNode;
}

export default function PageHeader({ title, backPath, onBack, actions }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backPath) {
      router.push(backPath);
    }
  };

  return (
    <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {(backPath || onBack) && (
          <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBackIcon />} size="small">
            목록
          </Button>
        )}
        {title ? (
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '20px', md: '24px' } }}>
            {title}
          </Typography>
        ) : null}
      </Box>
      {actions && <Box>{actions}</Box>}
    </Box>
  );
}

