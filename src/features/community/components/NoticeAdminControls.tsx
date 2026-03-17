'use client';

import type { MouseEvent } from 'react';
import { Box, Button, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Notice } from '@/features/community/types/community';

interface NoticeAdminControlsProps {
  isAdmin: boolean;
  mode: 'toolbar' | 'row';
  notice?: Notice;
  onCreate?: () => void;
  onEdit: (notice?: Notice) => void;
  onDelete: (noticeId: string) => void;
}

export default function NoticeAdminControls({
  isAdmin,
  mode,
  notice,
  onCreate,
  onEdit,
  onDelete,
}: NoticeAdminControlsProps) {
  if (!isAdmin) {
    return null;
  }

  const stopNavigation = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  if (mode === 'toolbar') {
    return (
      <Button variant="contained" onClick={onCreate} startIcon={<AddIcon />}>
        공지사항 작성
      </Button>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
      <IconButton
        size="small"
        color="primary"
        onClick={(event) => {
          stopNavigation(event);
          onEdit(notice);
        }}
        title="수정"
      >
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        color="error"
        onClick={(event) => {
          stopNavigation(event);
          if (notice?.notice_id) {
            onDelete(notice.notice_id);
          }
        }}
        title="삭제"
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
