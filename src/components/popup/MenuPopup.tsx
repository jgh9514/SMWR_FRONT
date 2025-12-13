'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useMenuSave } from '@/features/admin/hooks/useMenu';
import { showToast } from '@/shared/lib/notification';
import type { MenuItem, SaveRequest } from '@/types';

interface MenuPopupProps {
  open: boolean;
  onClose: (saved?: boolean) => void;
  menuId?: string | null;
  upMenuId?: string | null;
  mode?: 'new' | 'edit';
}

export default function MenuPopup({ open, onClose, menuId, upMenuId, mode: propMode }: MenuPopupProps) {
  const [form, setForm] = useState({
    menu_id: '',
    up_menu_id: null as string | null,
    menu_nm: '',
    menu_url: '',
    usg_yn: 'Y',
  });
  const [mode, setMode] = useState<'new' | 'edit'>(propMode || 'new');

  const menuSaveMutation = useMenuSave({
    onSuccess: () => {
      showToast.success('저장되었습니다.');
      onClose(true);
    },
    onError: (error) => {
      console.error('메뉴 저장 실패:', error);
      showToast.error('저장 중 오류가 발생했습니다.');
    },
  });

  const useYnItems = [
    { text: '사용', value: 'Y' },
    { text: '미사용', value: 'N' },
  ];

  useEffect(() => {
    if (open) {
      setMode(propMode || 'new');
      setForm({
        menu_id: menuId || '',
        up_menu_id: upMenuId || null,
        menu_nm: '',
        menu_url: '',
        usg_yn: 'Y',
      });
      // TODO: edit 모드일 때 상세 조회
    }
  }, [open, menuId, upMenuId, propMode]);

  const handleSave = () => {
    if (!form.menu_id || !form.menu_nm) {
      showToast.error('필수값을 입력해주세요.');
      return;
    }

    const payload: SaveRequest<MenuItem> = {
      insertRow: [],
      updateRow: [],
      deleteRow: [],
    };

    const menuItem: MenuItem = {
      menu_id: form.menu_id,
      menu_nm: form.menu_nm,
      menu_url: form.menu_url,
      menu_lv: 1,
      usg_yn: form.usg_yn,
      up_menu_id: form.up_menu_id || undefined,
    };

    if (mode === 'new') {
      payload.insertRow = [menuItem];
    } else {
      payload.updateRow = [menuItem];
    }

    menuSaveMutation.mutate(payload);
  };

  const handleCancel = () => {
    onClose(false);
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{mode === 'edit' ? '메뉴 수정' : '대메뉴 추가'}</span>
        <IconButton onClick={handleCancel} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="메뉴 ID"
            value={form.menu_id}
            onChange={(e) => setForm({ ...form, menu_id: e.target.value })}
            disabled={mode === 'edit'}
            size="small"
            fullWidth
          />
          <TextField
            label="메뉴명"
            value={form.menu_nm}
            onChange={(e) => setForm({ ...form, menu_nm: e.target.value })}
            size="small"
            fullWidth
          />
          <TextField
            label="URL"
            value={form.menu_url}
            onChange={(e) => setForm({ ...form, menu_url: e.target.value })}
            size="small"
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel>사용여부</InputLabel>
            <Select
              value={form.usg_yn}
              label="사용여부"
              onChange={(e) => setForm({ ...form, usg_yn: e.target.value })}
            >
              {useYnItems.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.text}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>취소</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={menuSaveMutation.isPending}
        >
          {menuSaveMutation.isPending ? '저장 중...' : '저장'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

