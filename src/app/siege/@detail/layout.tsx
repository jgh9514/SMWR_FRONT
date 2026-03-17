'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Drawer, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function SiegeDetailSlotLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasContent = children != null;

  const close = () => {
    router.back();
  };

  return (
    <Drawer
      anchor="right"
      open={hasContent}
      onClose={close}
      transitionDuration={260}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: '100vw',
          maxWidth: '100vw',
          overflow: 'auto',
        },
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          상세
        </Typography>
        <IconButton onClick={close} aria-label="닫기">
          <CloseIcon />
        </IconButton>
      </Box>

      {children}
    </Drawer>
  );
}

