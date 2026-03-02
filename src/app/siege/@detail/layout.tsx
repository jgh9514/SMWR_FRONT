'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Drawer, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function SiegeDetailSlotLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasContent = children != null;

  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<ReactNode>(null);
  const hasContentRef = useRef(hasContent);
  hasContentRef.current = hasContent;

  useEffect(() => {
    if (hasContent) {
      setContent(children);
      // mount 후 open=true로 바꿔야 슬라이드 인이 자연스럽습니다.
      setOpen(true);
      return;
    }
    // 라우트가 빠질 때(뒤로가기 포함) Drawer를 닫기만 하고,
    // 내용은 닫힘 애니메이션이 끝날 때 제거합니다.
    setOpen(false);
  }, [children, hasContent]);

  const close = () => {
    setOpen(false);
    // 닫힘 애니메이션 후 history back (URL도 함께 복구)
    setTimeout(() => router.back(), 220);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={close}
      transitionDuration={260}
      ModalProps={{ keepMounted: true }}
      SlideProps={{
        onExited: () => {
          // 기본 슬롯으로 돌아온 뒤에만 컨텐츠 제거
          if (!hasContentRef.current) {
            setContent(null);
          }
        },
      }}
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

      {content}
    </Drawer>
  );
}

