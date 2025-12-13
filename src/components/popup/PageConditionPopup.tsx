'use client';

import { useState } from 'react';
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
import { showToast } from '@/shared/lib/notification';

interface PageConditionPopupProps {
  open: boolean;
  onClose: (saved?: boolean) => void;
}

export default function PageConditionPopup({ open, onClose }: PageConditionPopupProps) {
  const [mode, setMode] = useState<'page' | 'condition'>('page');
  const [pageForm, setPageForm] = useState({
    page_id: '',
    page_nm: '',
    page_url: '',
  });
  const [conditionForm, setConditionForm] = useState({
    page_id: '',
    cond_id: '',
    cond_nm: '',
    cond_tp_cd: '',
    mdat_yn: 'N',
  });

  const condTypeItems = [
    { text: 'INPUT', value: 'INPUT' },
    { text: 'SELECT', value: 'SELECT' },
    { text: 'DATE', value: 'DATE' },
  ];

  const mdatYnItems = [
    { text: 'Y', value: 'Y' },
    { text: 'N', value: 'N' },
  ];

  const handleOpen = (openMode: 'page' | 'condition', payload?: { page_id?: string }) => {
    setMode(openMode);
    setPageForm({ page_id: '', page_nm: '', page_url: '' });
    setConditionForm({
      page_id: payload?.page_id || '',
      cond_id: '',
      cond_nm: '',
      cond_tp_cd: '',
      mdat_yn: 'N',
    });
  };

  const handleSave = async () => {
    if (mode === 'page') {
      if (!pageForm.page_id || !pageForm.page_nm) {
        showToast.error('필수값을 입력해주세요.');
        return;
      }
    } else {
      if (!conditionForm.page_id) {
        showToast.error('화면을 먼저 선택해주세요.');
        return;
      }
      if (!conditionForm.cond_id || !conditionForm.cond_nm) {
        showToast.error('필수값을 입력해주세요.');
        return;
      }
    }

    // TODO: API 호출
    showToast.info('개발 중입니다.');
    onClose(true);
  };

  const handleCancel = () => {
    onClose(false);
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{mode === 'page' ? '화면 추가' : '검색조건 추가'}</span>
        <IconButton onClick={handleCancel} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {mode === 'page' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }}>
                  <TextField
                    label="화면 ID"
                    value={pageForm.page_id}
                    onChange={(e) => setPageForm({ ...pageForm, page_id: e.target.value })}
                    size="small"
                    fullWidth
                  />
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }}>
                  <TextField
                    label="화면명"
                    value={pageForm.page_nm}
                    onChange={(e) => setPageForm({ ...pageForm, page_nm: e.target.value })}
                    size="small"
                    fullWidth
                  />
                </Box>
              </Box>
              <Box>
                <TextField
                  label="화면 URL"
                  value={pageForm.page_url}
                  onChange={(e) => setPageForm({ ...pageForm, page_url: e.target.value })}
                  size="small"
                  fullWidth
                />
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }}>
                  <TextField
                    label="조건 ID"
                    value={conditionForm.cond_id}
                    onChange={(e) => setConditionForm({ ...conditionForm, cond_id: e.target.value })}
                    size="small"
                    fullWidth
                  />
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }}>
                  <TextField
                    label="조건명"
                    value={conditionForm.cond_nm}
                    onChange={(e) => setConditionForm({ ...conditionForm, cond_nm: e.target.value })}
                    size="small"
                    fullWidth
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>조건 타입</InputLabel>
                    <Select
                      value={conditionForm.cond_tp_cd}
                      label="조건 타입"
                      onChange={(e) => setConditionForm({ ...conditionForm, cond_tp_cd: e.target.value })}
                    >
                      {condTypeItems.map((item) => (
                        <MenuItem key={item.value} value={item.value}>
                          {item.text}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>필수여부</InputLabel>
                    <Select
                      value={conditionForm.mdat_yn}
                      label="필수여부"
                      onChange={(e) => setConditionForm({ ...conditionForm, mdat_yn: e.target.value })}
                    >
                      {mdatYnItems.map((item) => (
                        <MenuItem key={item.value} value={item.value}>
                          {item.text}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>취소</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
}

