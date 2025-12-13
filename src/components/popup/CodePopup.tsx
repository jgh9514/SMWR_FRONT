'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useCodePopupList } from '@/features/admin/hooks/useCodeRelation';
import { showToast } from '@/shared/lib/notification';
import type { CodeItem } from '@/types';

interface CodePopupProps {
  open: boolean;
  onClose: (data?: CodeItem[]) => void;
}

export default function CodePopup({ open, onClose }: CodePopupProps) {
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  const codePopupListQuery = useCodePopupList({});

  const headers = [
    { title: '코드그룹', key: 'cd_grp_no', align: 'center' as const },
    { title: '코드그룹명', key: 'cd_grp_nm', align: 'left' as const },
    { title: '코드', key: 'cd', align: 'center' as const },
    { title: '코드명', key: 'cd_nm', align: 'left' as const },
  ];

  const codeList = codePopupListQuery.data || [];

  const onRowClick = (item: CodeItem) => {
    const index = selectedCodes.indexOf(item.cd);
    if (index > -1) {
      setSelectedCodes((prev) => prev.filter((c) => c !== item.cd));
    } else {
      setSelectedCodes((prev) => [...prev, item.cd]);
    }
  };

  const handleClose = () => {
    setSelectedCodes([]);
    onClose();
  };

  const returnData = () => {
    if (selectedCodes.length > 0) {
      const data = codeList.filter((item) => selectedCodes.includes(item.cd));
      handleClose();
      onClose(data);
    } else {
      showToast.error('선택할 항목이 없습니다.');
    }
  };

  const toggleSelectCode = (cd: string) => {
    setSelectedCodes((prev) =>
      prev.includes(cd) ? prev.filter((c) => c !== cd) : [...prev, cd],
    );
  };

  useEffect(() => {
    if (open) {
      codePopupListQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>코드 목록</span>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, mb: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => codePopupListQuery.refetch()}
            disabled={codePopupListQuery.isLoading}
          >
            {codePopupListQuery.isLoading ? '조회 중...' : '검색'}
          </Button>
        </Box>
        {codePopupListQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography>조회 중...</Typography>
          </Box>
        ) : codePopupListQuery.isError ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography color="error">조회 중 오류가 발생했습니다.</Typography>
          </Box>
        ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                {headers.map((h) => (
                  <TableCell key={h.key} align={h.align}>
                    {h.title}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {codeList.map((row) => {
                const isSelected = selectedCodes.includes(row.cd);
                return (
                  <TableRow
                    key={`${row.cd_grp_no}_${row.cd}`}
                    onClick={() => onRowClick(row)}
                    sx={{ cursor: 'pointer' }}
                    hover
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSelectCode(row.cd)}
                      />
                    </TableCell>
                    <TableCell align="center">{row.cd_grp_no}</TableCell>
                    <TableCell align="left">{row.cd_grp_nm}</TableCell>
                    <TableCell align="center">{row.cd}</TableCell>
                    <TableCell align="left">{row.cd_nm}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>취소</Button>
        <Button onClick={returnData} variant="contained" color="primary">
          선택
        </Button>
      </DialogActions>
    </Dialog>
  );
}

