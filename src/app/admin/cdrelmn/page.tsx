'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useParentCodeList, useCodeRelList, useCodeRelSave, useCodePopupList } from '@/hooks/api';
import { isEmpty, searchDataExtraction } from '@/shared/utils/util';
import { showToast, confirm } from '@/shared/lib/notification';
import ListWrapper from '@/shared/ui/list-wrapper/ListWrapper';
import type { ParentItem, ChildItem, PopupItem } from '@/types';

export default function PreferenceCdrelmnPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));

  const [schDatas, setSchDatas] = useState<any>({});
  const [schChildrenDatas, setSchChildrenDatas] = useState<any>({});
  const [childList, setChildList] = useState<ChildItem[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [selectedParent, setSelectedParent] = useState<ParentItem | null>(null);

  const [cdDialog, setCdDialog] = useState(false);
  const [cdPopupSchDatas, setCdPopupSchDatas] = useState<any>({});
  const [selectedPopupCodes, setSelectedPopupCodes] = useState<string[]>([]);

  const parentHeaders = useMemo(() => {
    const cols = [
      { title: '코드그룹', key: 'cd_grp_no', align: 'center' as const },
      { title: '코드그룹명', key: 'cd_grp_nm', align: 'left' as const },
      { title: '코드', key: 'cd', align: 'center' as const },
      { title: '코드명', key: 'cd_nm', align: 'left' as const },
    ];

    if (mobile) {
      return cols.filter((col) => col.key !== 'cd_grp_nm');
    }
    return cols;
  }, [mobile]);

  const childHeaders = useMemo(() => {
    const cols = [
      { title: '코드그룹', key: 'cd_grp_no', align: 'center' as const },
      { title: '코드그룹명', key: 'cd_grp_nm', align: 'left' as const },
      { title: '코드', key: 'cd', align: 'center' as const },
      { title: '코드명', key: 'cd_nm', align: 'left' as const },
    ];

    if (mobile) {
      return cols.filter((col) => col.key !== 'cd_grp_nm');
    }
    return cols;
  }, [mobile]);

  const cdPopupHeaders = useMemo(() => {
    const cols = [
      { title: '코드그룹', key: 'cd_grp_no', align: 'center' as const },
      { title: '코드그룹명', key: 'cd_grp_nm', align: 'left' as const },
      { title: '코드', key: 'cd', align: 'center' as const },
      { title: '코드명', key: 'cd_nm', align: 'left' as const },
    ];

    if (mobile) {
      return cols.filter((col) => col.key !== 'cd_grp_nm');
    }
    return cols;
  }, [mobile]);

  // 부모 코드 목록 조회 파라미터
  const parentSearchParams = useMemo(() => {
    return searchDataExtraction(schDatas);
  }, [schDatas]);

  // 부모 코드 목록 조회
  const { data: parentList = [], refetch: refetchParent } = useParentCodeList(parentSearchParams, false);

  // 자식 코드 목록 조회 파라미터
  const childSearchParams = useMemo(() => {
    return searchDataExtraction(schChildrenDatas);
  }, [schChildrenDatas]);

  // 자식 코드 목록 조회
  const { data: childResponse = [], refetch: refetchChild } = useCodeRelList(childSearchParams);

  // 자식 코드 목록 상태 업데이트
  useEffect(() => {
    if (childResponse.length > 0) {
      setChildList(
        childResponse.map((row: any, idx: number) => ({
          ...row,
          id: `${row.cd_grp_no}_${row.cd}_${idx}`,
        })),
      );
    } else {
      setChildList([]);
    }
  }, [childResponse]);

  const onParentClick = (item: ParentItem) => {
    setSelectedParent(item);
    setSchChildrenDatas((prev: any) => ({
      ...prev,
      up_cd_grp_no: item.cd_grp_no,
      up_cd: item.cd,
    }));
  };

  // 부모 클릭 시 자식 목록 조회
  useEffect(() => {
    if (selectedParent) {
      refetchChild();
    }
  }, [selectedParent, schChildrenDatas]);

  const add = () => {
    if (!selectedParent) {
      showToast.error('부모코드목록에서 코드를 선택해주세요.');
      return;
    }
    setCdDialog(true);
  };

  // 코드 팝업 조회 파라미터
  const cdPopupParams = useMemo(() => {
    return searchDataExtraction(cdPopupSchDatas);
  }, [cdPopupSchDatas]);

  // 코드 팝업 조회
  const { data: cdPopupResponse = [], refetch: refetchCdPopup } = useCodePopupList(cdPopupParams, false);

  // 코드 팝업 목록 상태 업데이트
  const cdPopupList = useMemo(() => {
    return cdPopupResponse.map((row: any, idx: number) => ({
      ...row,
      id: `${row.cd_grp_no}_${row.cd}_${idx}`,
    }));
  }, [cdPopupResponse]);

  const closeCdDialog = () => {
    setCdDialog(false);
    setCdPopupSchDatas({});
    setSelectedPopupCodes([]);
  };

  const returnCdPopupData = () => {
    if (selectedPopupCodes.length === 0) {
      showToast.error('선택할 항목이 없습니다.');
      return;
    }

    const returnData = cdPopupList.filter((item) => selectedPopupCodes.includes(item.id));

    for (let i = 0; i < returnData.length; i++) {
      const exists = childList.some(
        (c) => c.cd_grp_no === returnData[i].cd_grp_no && c.cd === returnData[i].cd,
      );

      if (!exists) {
        setChildList((prev) => [
          ...prev,
          {
            ...returnData[i],
            id: `${returnData[i].cd_grp_no}_${returnData[i].cd}_${Date.now()}_${i}`,
            row_status: 'C',
          },
        ]);
      }
    }

    showToast.success('중복된 데이터를 제외 후 추가되었습니다.');
    closeCdDialog();
  };

  const del = async () => {
    if (selectedChildren.length === 0) {
      showToast.error('삭제할 데이터가 없습니다.');
      return;
    }

    const res = await confirm('삭제하시겠습니까?');
    if (!res) return;

    setChildList((prev) => prev.filter((item) => item.id && !selectedChildren.includes(item.id)));
    setSelectedChildren([]);
  };

  const save = async () => {
    if (!selectedParent) {
      showToast.error('부모코드목록에서 코드를 선택해주세요.');
      return;
    }

    const res = await confirm('저장하시겠습니까?');
    if (!res) return;

    const formData = {
      insertRow: childList.filter((item) => item.row_status === 'C'),
      updateRow: [],
      deleteRow: [],
      up_cd_grp_no: selectedParent.cd_grp_no,
      up_cd: selectedParent.cd,
    };

    cdRelSaveMutation.mutate(formData);
  };

  // 코드 관계 저장 Mutation
  const cdRelSaveMutation = useCodeRelSave({
    onSuccess: (response) => {
      if (response.result === 'Success') {
        showToast.success('저장되었습니다.');
        refetchParent();
        refetchChild();
      } else if (response.result === 'OverlapFail') {
        showToast.error('이미 존재하는 키입니다.');
      } else {
        showToast.error('오류가 발생했습니다.');
      }
    },
    onError: (error: Error) => {
      console.error('코드 관계 저장 실패:', error);
      showToast.error('저장에 실패했습니다.');
    },
  });

  const toggleSelectChild = (id: string) => {
    setSelectedChildren((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const toggleSelectPopup = (id: string) => {
    setSelectedPopupCodes((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  return (
    <ListWrapper>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          {/* 부모 코드 목록 */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }}>
            <Card>
              <CardHeader title="부모 코드 목록" />
              <CardContent>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {parentHeaders.map((h) => (
                          <TableCell key={h.key} align={h.align}>
                            {h.title}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parentList.map((row, index) => (
                        <TableRow
                          key={`${row.cd_grp_no}_${row.cd}_${index}`}
                          onClick={() => onParentClick(row)}
                          sx={{ cursor: 'pointer' }}
                          hover
                        >
                          <TableCell align="center">{row.cd_grp_no}</TableCell>
                          {!mobile && <TableCell align="left">{row.cd_grp_nm}</TableCell>}
                          <TableCell align="center">{row.cd}</TableCell>
                          <TableCell align="left">{row.cd_nm}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>

          {/* 자식 코드 목록 */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }}>
            <Card>
              <CardHeader
                title="자식 코드 목록"
                action={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="contained" color="primary" onClick={add}>
                      추가
                    </Button>
                    <Button size="small" variant="contained" color="error" onClick={del}>
                      삭제
                    </Button>
                  </Box>
                }
              />
              <CardContent>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" />
                        {childHeaders.map((h) => (
                          <TableCell key={h.key} align={h.align}>
                            {h.title}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {childList.map((row) => {
                        const rowId = row.id || '';
                        const isSelected = selectedChildren.includes(rowId);
                        return (
                          <TableRow key={rowId} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleSelectChild(rowId)}
                              />
                            </TableCell>
                            <TableCell align="center">{row.cd_grp_no}</TableCell>
                            {!mobile && <TableCell align="left">{row.cd_grp_no}</TableCell>}
                            <TableCell align="center">{row.cd}</TableCell>
                            <TableCell align="left">{row.cd_nm}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" color="primary" onClick={save}>
            저장
          </Button>
        </Box>

        {/* 코드 선택 팝업 */}
        <Dialog open={cdDialog} onClose={closeCdDialog} fullScreen={mobile} maxWidth="lg" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">코드 목록</Typography>
              <IconButton onClick={closeCdDialog} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
                  <Button variant="outlined" onClick={() => refetchCdPopup()}>
                    검색
                  </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    {cdPopupHeaders.map((h) => (
                      <TableCell key={h.key} align={h.align}>
                        {h.title}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cdPopupList.map((row) => {
                    const isSelected = selectedPopupCodes.includes(row.id);
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleSelectPopup(row.id)}
                          />
                        </TableCell>
                        <TableCell align="center">{row.cd_grp_no}</TableCell>
                        {!mobile && <TableCell align="left">{row.cd_grp_nm}</TableCell>}
                        <TableCell align="center">{row.cd}</TableCell>
                        <TableCell align="left">{row.cd_nm}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCdDialog}>취소</Button>
            <Button onClick={returnCdPopupData} variant="contained" color="primary">
              선택
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ListWrapper>
  );
}

