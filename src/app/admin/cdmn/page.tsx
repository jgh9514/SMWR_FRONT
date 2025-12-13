'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useCodeSave, useCodeGroupList, useCodeList } from '@/features/admin/hooks/useCode';
import { isEmpty, searchDataExtraction } from '@/shared/utils/util';
import { useCommonCodes, useCommonCodeHierarchy } from '@/features/admin/hooks/useCommonCode';
import { showToast, confirm } from '@/shared/lib/notification';
import ListWrapper from '@/shared/ui/list-wrapper/ListWrapper';
import type { CodeGroup, CodeItem, CodeSaveRequest, CommonCodeList, BsnsDtlCd } from '@/types';
import type { CodeGroupSearchData, CodeSearchData } from '@/features/admin/types/search';

export default function PreferenceCdmnPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));

  const initialCodeGroups: CommonCodeList = {
    CO00000001: {
      cd: [],
      cd_nm: [],
    },
  };
  
  const { data: codeListData = initialCodeGroups } = useCommonCodes(initialCodeGroups);
  const codeList = codeListData;

  const [bsnsDtlCd, setBsnsDtlCd] = useState<BsnsDtlCd>({
    id: 'bsnsDtlCd',
    levels: 2,
    tags: [],
    keys: [] as Array<[string, string]>,
    values: [],
  });

  const [schDatas, setSchDatas] = useState<CodeGroupSearchData>({});
  const [cdSchDatas, setCdSchDatas] = useState<CodeSearchData>({});

  const [cdGrpItems, setCdGrpItems] = useState<CodeGroup[]>([]);
  const [cdItems, setCdItems] = useState<CodeItem[]>([]);
  const [selectedCdGrpIds, setSelectedCdGrpIds] = useState<string[]>([]);
  const [selectedCdIds, setSelectedCdIds] = useState<string[]>([]);
  const [selectedCdGrpItem, setSelectedCdGrpItem] = useState<CodeGroup | null>(null);

  const [cdGrpDialogOpen, setCdGrpDialogOpen] = useState(false);
  const [cdDialogOpen, setCdDialogOpen] = useState(false);
  const [editingCdGrp, setEditingCdGrp] = useState<CodeGroup | any>({});
  const [editingCd, setEditingCd] = useState<CodeItem | any>({});

  const idCounterRef = useRef(0);

  const codeSaveMutation = useCodeSave();
  
  // 코드 그룹 목록 조회 Query (동적 파라미터 사용)
  const codeGroupListQuery = useCodeGroupList(schDatas);
  
  // 코드 목록 조회 Query (동적 파라미터 사용)
  const codeListQuery = useCodeList(cdSchDatas);

  const bsnsCdOptions = useMemo(
    () =>
      codeList.CO00000001.cd.map((cd, index) => ({
        value: cd,
        label: codeList.CO00000001.cd_nm[index],
      })),
    [codeList],
  );

  const cdGrpHeaders = useMemo(() => {
    const headers: { title: string; key: keyof CodeGroup | string; align?: string }[] = [
      { title: '업무', key: 'bsns_cd', align: 'center' },
    ];

    if (!mobile) {
      headers.push({
        title: '상세업무',
        key: 'dtl_bsns_cd',
        align: 'center',
      });
    }

    headers.push(
      { title: '코드그룹', key: 'cd_grp_no', align: 'center' },
      { title: '코드그룹명', key: 'cd_grp_nm', align: 'left' },
    );

    return headers;
  }, [mobile]);

  const cdHeaders = useMemo(() => {
    const headers: { title: string; key: keyof CodeItem | string; align?: string }[] = [
      { title: '코드값', key: 'cd', align: 'center' },
      { title: '코드명', key: 'cd_nm', align: 'left' },
      { title: '정렬순서', key: 'srt_sn', align: 'center' },
    ];

    if (!mobile) {
      headers.push(
        { title: 'BUFF1', key: 'buf_fst_txt', align: 'center' },
        { title: 'BUFF2', key: 'buf_snd_txt', align: 'center' },
        { title: 'BUFF3', key: 'buf_trd_txt', align: 'center' },
        { title: 'BUFF4', key: 'buf_fth_txt', align: 'center' },
        { title: 'BUFF5', key: 'buf_ffh_txt', align: 'center' },
      );
    }

    return headers;
  }, [mobile]);

  const getBsnsCdNm = (bsnsCd: string) => {
    const option = bsnsCdOptions.find((opt) => opt.value === bsnsCd);
    return option ? option.label : '';
  };

  const getFilteredDtlBsnsCd = (bsnsCdValue: string) => {
    if (!bsnsCdValue || bsnsCdValue === 'CO') return [];

    const filtered: { label: string; value: string }[] = [];
    for (let i = 0; i < bsnsDtlCd.tags.length; i += 1) {
      const tag = bsnsDtlCd.tags[i];
      const parts = tag.split('\t');
      if (parts[0] === bsnsCdValue) {
        filtered.push({
          label: bsnsDtlCd.values[i],
          value: parts[1],
        });
      }
    }
    return filtered;
  };

  const getDtlBsnsCdNm = (bsnsCdValue: string, dtlBsnsCd: string) => {
    if (!bsnsCdValue || bsnsCdValue === 'CO' || !dtlBsnsCd) return '';
    const filtered = getFilteredDtlBsnsCd(bsnsCdValue);
    const option = filtered.find((opt) => opt.value === dtlBsnsCd);
    return option ? option.label : '';
  };

  const handleBsnsCdChangeOnEditingGrp = (value: string) => {
    setEditingCdGrp((prev: any) => ({
      ...prev,
      bsns_cd: value,
      dtl_bsns_cd: '',
    }));
  };

  const handleCdGrpRowClick = async (item: CodeGroup) => {
    if (isEmpty(item.cd_grp_no)) return;
    setSelectedCdGrpItem(item);
        setCdSchDatas((prev: CodeSearchData) => ({
          ...prev,
          cd_grp_no: item.cd_grp_no,
        }));
    await cdSearch('cdGrp', item.cd_grp_no, item.bsns_cd);
  };

  const addGrp = () => {
    const newId = `new_${idCounterRef.current++}`;
    setEditingCdGrp({
      id: newId,
      cd_grp_no: '',
      bsns_cd: '',
      dtl_bsns_cd: '',
      cd_grp_nm: '',
      row_status: 'C',
    });
    setCdGrpDialogOpen(true);
  };

  const editGrp = (item: CodeGroup) => {
    setEditingCdGrp({ ...item });
    setCdGrpDialogOpen(true);
  };

  const closeCdGrpDialog = () => {
    setCdGrpDialogOpen(false);
    setEditingCdGrp({});
  };

  const saveCdGrp = async () => {
    if (isEmpty(editingCdGrp.bsns_cd)) {
      showToast.error('업무코드를 선택해주세요.');
      return;
    }
    if (isEmpty(editingCdGrp.cd_grp_nm)) {
      showToast.error('코드 그룹명을 입력해주세요.');
      return;
    }
    if (editingCdGrp.cd_grp_nm && editingCdGrp.cd_grp_nm.length > 100) {
      showToast.error('코드 그룹명은 100자 이하로 입력해주세요.');
      return;
    }
    if (editingCdGrp.bsns_cd !== 'CO' && isEmpty(editingCdGrp.dtl_bsns_cd)) {
      showToast.error('상세 업무를 선택해주세요.');
      return;
    }

    const res = await confirm('저장하시겠습니까?');
    if (!res) return;

    const formData: any = {};

    if (editingCdGrp.row_status === 'C') {
      formData.insertGrpRow = [editingCdGrp];
      formData.updateGrpRow = [];
    } else {
      formData.insertGrpRow = [];
      formData.updateGrpRow = [editingCdGrp];
    }
    formData.deleteGrpRow = [];
    formData.insertRow = [];
    formData.updateRow = [];
    formData.deleteRow = [];

    codeSaveMutation.mutate(formData, {
      onSuccess: () => {
        showToast.success('저장되었습니다.');
        closeCdGrpDialog();
        cdGrpSearch('save');
      },
      onError: (error) => {
        console.error('코드 그룹 저장 실패:', error);
        showToast.error('저장 중 오류가 발생했습니다.');
      },
    });
  };

  const delGrp = async () => {
    if (selectedCdGrpIds.length === 0) {
      showToast.error('삭제할 데이터가 없습니다.');
      return;
    }

    const res = await confirm('삭제하시겠습니까?');
    if (!res) return;

    const deleteItems = selectedCdGrpIds
      .map((id) => cdGrpItems.find((i) => i.id === id))
      .filter((item): item is CodeGroup => !!item);

    const formData = {
      insertGrpRow: [] as CodeGroup[],
      updateGrpRow: [] as CodeGroup[],
      deleteGrpRow: deleteItems,
      insertRow: [] as CodeItem[],
      updateRow: [] as CodeItem[],
      deleteRow: [] as CodeItem[],
    };

    codeSaveMutation.mutate(formData, {
      onSuccess: () => {
        showToast.success('삭제되었습니다.');
        setSelectedCdGrpIds([]);
        setCdItems([]);
        setSelectedCdGrpItem(null);
        cdGrpSearch('save');
      },
      onError: (error) => {
        console.error('코드 그룹 삭제 실패:', error);
        showToast.error('삭제 중 오류가 발생했습니다.');
      },
    });
  };

  const addCd = () => {
    if (!selectedCdGrpItem) {
      showToast.error('코드 그룹을 먼저 선택해주세요.');
      return;
    }
    const newId = `new_${idCounterRef.current++}`;
    setEditingCd({
      id: newId,
      cd: '',
      cd_nm: '',
      srt_sn: '',
      buf_fst_txt: '',
      buf_snd_txt: '',
      buf_trd_txt: '',
      buf_fth_txt: '',
      buf_ffh_txt: '',
      row_status: 'C',
    });
    setCdDialogOpen(true);
  };

  const editCd = (item: CodeItem) => {
    setEditingCd({ ...item });
    setCdDialogOpen(true);
  };

  const closeCdDialog = () => {
    setCdDialogOpen(false);
    setEditingCd({});
  };

  const saveCd = async () => {
    if (isEmpty(editingCd.cd)) {
      showToast.error('코드값을 입력해주세요.');
      return;
    }
    if (editingCd.cd && editingCd.cd.length > 20) {
      showToast.error('코드값은 20자 이하로 입력해주세요.');
      return;
    }
    if (/\s/g.test(editingCd.cd)) {
      showToast.error('코드값에 공백문자는 사용할 수 없습니다.');
      return;
    }
    if (!/^[A-Za-z0-9+]*$/.test(editingCd.cd)) {
      showToast.error('코드값은 영문, 숫자만 입력해주세요.');
      return;
    }
    if (isEmpty(editingCd.cd_nm)) {
      showToast.error('코드명을 입력해주세요.');
      return;
    }
    if (editingCd.cd_nm && editingCd.cd_nm.length > 600) {
      showToast.error('코드명은 600자 이하로 입력해주세요.');
      return;
    }
    if (isEmpty(editingCd.srt_sn)) {
      showToast.error('정렬 순서를 입력해주세요.');
      return;
    }
    if (!/^[0-9]*$/.test(String(editingCd.srt_sn))) {
      showToast.error('정렬 순서는 숫자만 입력해주세요.');
      return;
    }
    if (editingCd.srt_sn && String(editingCd.srt_sn).length > 9) {
      showToast.error('정렬 순서는 9자리 이하로 입력해주세요.');
      return;
    }
    if (editingCd.buf_fst_txt && editingCd.buf_fst_txt.length > 200) {
      showToast.error('BUFF1은 200자 이하로 입력해주세요.');
      return;
    }
    if (editingCd.buf_snd_txt && editingCd.buf_snd_txt.length > 200) {
      showToast.error('BUFF2은 200자 이하로 입력해주세요.');
      return;
    }
    if (editingCd.buf_trd_txt && editingCd.buf_trd_txt.length > 200) {
      showToast.error('BUFF3은 200자 이하로 입력해주세요.');
      return;
    }
    if (editingCd.buf_fth_txt && editingCd.buf_fth_txt.length > 200) {
      showToast.error('BUFF4은 200자 이하로 입력해주세요.');
      return;
    }
    if (editingCd.buf_ffh_txt && editingCd.buf_ffh_txt.length > 200) {
      showToast.error('BUFF5은 200자 이하로 입력해주세요.');
      return;
    }

    const res = await confirm('저장하시겠습니까?');
    if (!res) return;

    if (!selectedCdGrpItem) {
      showToast.error('코드 그룹이 선택되지 않았습니다.');
      return;
    }

    const formData: any = {
      insertGrpRow: [],
      updateGrpRow: [],
      deleteGrpRow: [],
      bsns_cd: selectedCdGrpItem.bsns_cd,
      cd_grp_no: selectedCdGrpItem.cd_grp_no,
    };

    if (editingCd.row_status === 'C') {
      formData.insertRow = [editingCd];
      formData.updateRow = [];
    } else {
      formData.insertRow = [];
      formData.updateRow = [editingCd];
    }
    formData.deleteRow = [];

    codeSaveMutation.mutate(formData, {
      onSuccess: () => {
        showToast.success('저장되었습니다.');
        closeCdDialog();
        cdSearch('save');
      },
      onError: (error) => {
        console.error('코드 저장 실패:', error);
        showToast.error('저장 중 오류가 발생했습니다.');
      },
    });
  };

  const delCd = async () => {
    if (selectedCdIds.length === 0) {
      showToast.error('삭제할 데이터가 없습니다.');
      return;
    }
    if (!selectedCdGrpItem) {
      showToast.error('코드 그룹이 선택되지 않았습니다.');
      return;
    }

    const res = await confirm('삭제하시겠습니까?');
    if (!res) return;

    const deleteItems = selectedCdIds
      .map((id) => cdItems.find((i) => i.id === id))
      .filter((item): item is CodeItem => !!item);

    const formData = {
      insertGrpRow: [] as CodeGroup[],
      updateGrpRow: [] as CodeGroup[],
      deleteGrpRow: [] as CodeGroup[],
      insertRow: [] as CodeItem[],
      updateRow: [] as CodeItem[],
      deleteRow: deleteItems,
      bsns_cd: selectedCdGrpItem.bsns_cd,
      cd_grp_no: selectedCdGrpItem.cd_grp_no,
    };

    codeSaveMutation.mutate(formData, {
      onSuccess: () => {
        showToast.success('삭제되었습니다.');
        setSelectedCdIds([]);
        cdSearch('save');
      },
      onError: (error) => {
        console.error('코드 삭제 실패:', error);
        showToast.error('삭제 중 오류가 발생했습니다.');
      },
    });
  };

  const cdGrpSearch = async (type?: 'save') => {
    const searchData = searchDataExtraction(schDatas);
    
    // React Query hook 사용 (파라미터 변경 시 자동으로 새로운 쿼리 생성)
    const result = await codeGroupListQuery.refetch();
    if (!result.data) {
      showToast.error('코드 그룹 목록을 불러오는데 실패했습니다.');
      return;
    }
    const rows: CodeGroup[] = result.data;

    const mapped = rows.map((row, index) => ({
      ...row,
      id: row.cd_grp_no || `grp_${index}`,
      row_status: row.row_status || '',
    })) as CodeGroup[];

    setCdGrpItems(mapped);

    if (type !== 'save') {
      setCdItems([]);
      setSelectedCdGrpItem(null);
    }

    if (type === 'save' && selectedCdGrpItem) {
      const item = mapped.find((i) => i.cd_grp_no === selectedCdGrpItem.cd_grp_no);
      if (item) {
        setSelectedCdGrpItem(item);
        setCdSchDatas((prev: Record<string, unknown>) => ({
          ...prev,
          cd_grp_no: item.cd_grp_no,
        }));
        await cdSearch('cdGrp', item.cd_grp_no, item.bsns_cd);
      }
    }
  };

  const cdSearch = async (type?: 'cdGrp' | 'save', grpNo?: string, bsnsCdValue?: string) => {
    const targetCdGrpNo = grpNo ?? cdSchDatas.cd_grp_no;
    if (isEmpty(targetCdGrpNo)) return;

    const cdSearchData = searchDataExtraction({
      ...cdSchDatas,
      cd_grp_no: targetCdGrpNo,
    });
    
    // React Query hook 사용 (파라미터 변경 시 자동으로 새로운 쿼리 생성)
    const result = await codeListQuery.refetch();
    if (!result.data) {
      showToast.error('코드 목록을 불러오는데 실패했습니다.');
      return;
    }
    const cdRows: CodeItem[] = result.data;

    const mapped = cdRows.map((row, index) => ({
      ...row,
      id: row.cd ? `cd_${row.cd}_${index}` : `cd_${index}`,
      row_status: row.row_status || '',
    })) as CodeItem[];

    setCdItems(mapped);
  };

  const { data: hierarchyData } = useCommonCodeHierarchy('CO00000002');
  
  useEffect(() => {
    if (hierarchyData) {
      setBsnsDtlCd((prev) => ({
        ...prev,
        keys: hierarchyData.keys,
        values: hierarchyData.values,
        tags: hierarchyData.tags,
      }));
    }
  }, [hierarchyData]);

  const toggleSelectGrp = (id: string) => {
    setSelectedCdGrpIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const toggleSelectCd = (id: string) => {
    setSelectedCdIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const cdGrpDialogTitle = editingCdGrp.row_status === 'C' ? '코드 그룹 추가' : '코드 그룹 수정';
  const cdDialogTitle = editingCd.row_status === 'C' ? '코드 추가' : '코드 수정';

  return (
    <ListWrapper>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          {/* 코드 그룹 목록 */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(41.667% - 8px)' } }}>
            <Card>
              <CardHeader
                title="코드 그룹 목록"
                action={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="contained" color="primary" onClick={addGrp}>
                      추가
                    </Button>
                    <Button size="small" variant="contained" color="error" onClick={delGrp}>
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
                        {cdGrpHeaders.map((h) => (
                          <TableCell key={h.key as string} align={h.align as any}>
                            {h.title}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cdGrpItems.map((row) => {
                        const rowId = row.id || '';
                        const isSelected = selectedCdGrpIds.includes(rowId);
                        const isActive = selectedCdGrpItem && selectedCdGrpItem.id === rowId;
                        return (
                          <TableRow
                            key={rowId}
                            onClick={() => handleCdGrpRowClick(row)}
                            sx={{
                              cursor: 'pointer',
                              backgroundColor: isActive
                                ? 'rgba(25, 118, 210, 0.18)'
                                : isSelected
                                ? 'rgba(25, 118, 210, 0.08)'
                                : 'transparent',
                              '&:hover': {
                                backgroundColor: isActive
                                  ? 'rgba(25, 118, 210, 0.25)'
                                  : 'rgba(0, 0, 0, 0.04)',
                              },
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isSelected}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectGrp(rowId);
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">{getBsnsCdNm(row.bsns_cd || '')}</TableCell>
                            {!mobile && (
                              <TableCell align="center">
                                {getDtlBsnsCdNm(row.bsns_cd || '', row.dtl_bsns_cd || '')}
                              </TableCell>
                            )}
                            <TableCell align="center">{row.cd_grp_no}</TableCell>
                            <TableCell>
                              <Button
                                variant="text"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editGrp(row);
                                }}
                                sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                              >
                                {row.cd_grp_nm}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>

          {/* 코드 목록 */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(58.333% - 8px)' } }}>
            <Card>
              <CardHeader
                title="코드 목록"
                action={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={addCd}
                      disabled={!selectedCdGrpItem}
                    >
                      추가
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      onClick={delCd}
                      disabled={!selectedCdGrpItem}
                    >
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
                        {cdHeaders.map((h) => (
                          <TableCell key={h.key as string} align={h.align as any}>
                            {h.title}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cdItems.map((row) => {
                        const isSelected = selectedCdIds.includes(row.id);
                        return (
                          <TableRow key={row.id} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleSelectCd(row.id)}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                variant="text"
                                color="primary"
                                onClick={() => editCd(row)}
                                sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                              >
                                {row.cd}
                              </Button>
                            </TableCell>
                            <TableCell>{row.cd_nm}</TableCell>
                            <TableCell align="center">{row.srt_sn}</TableCell>
                            {!mobile && (
                              <>
                                <TableCell align="center">{row.buf_fst_txt}</TableCell>
                                <TableCell align="center">{row.buf_snd_txt}</TableCell>
                                <TableCell align="center">{row.buf_trd_txt}</TableCell>
                                <TableCell align="center">{row.buf_fth_txt}</TableCell>
                                <TableCell align="center">{row.buf_ffh_txt}</TableCell>
                              </>
                            )}
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

        {/* 코드 그룹 편집 다이얼로그 */}
        <Dialog open={cdGrpDialogOpen} onClose={closeCdGrpDialog} fullScreen={mobile} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">{cdGrpDialogTitle}</Typography>
              <IconButton onClick={closeCdGrpDialog} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>업무</InputLabel>
                <Select
                  value={editingCdGrp.bsns_cd || ''}
                  onChange={(e) => handleBsnsCdChangeOnEditingGrp(e.target.value)}
                  disabled={editingCdGrp.row_status !== 'C'}
                  label="업무"
                >
                  {bsnsCdOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {!mobile && (
                <FormControl fullWidth>
                  <InputLabel>상세업무</InputLabel>
                  <Select
                    value={editingCdGrp.dtl_bsns_cd || ''}
                    onChange={(e) =>
                      setEditingCdGrp((prev: any) => ({
                        ...prev,
                        dtl_bsns_cd: e.target.value,
                      }))
                    }
                    disabled={
                      !editingCdGrp.bsns_cd ||
                      editingCdGrp.bsns_cd === 'CO' ||
                      editingCdGrp.row_status !== 'C'
                    }
                    label="상세업무"
                  >
                    {getFilteredDtlBsnsCd(editingCdGrp.bsns_cd || '').map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {editingCdGrp.row_status !== 'C' && (
                <TextField
                  label="코드그룹"
                  value={editingCdGrp.cd_grp_no || ''}
                  InputProps={{ readOnly: true }}
                  fullWidth
                />
              )}

              <TextField
                label="코드그룹명"
                value={editingCdGrp.cd_grp_nm || ''}
                onChange={(e) =>
                  setEditingCdGrp((prev: any) => ({
                    ...prev,
                    cd_grp_nm: e.target.value,
                  }))
                }
                inputProps={{ maxLength: 100 }}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCdGrpDialog}>취소</Button>
            <Button onClick={saveCdGrp} variant="contained" color="primary">
              저장
            </Button>
          </DialogActions>
        </Dialog>

        {/* 코드 편집 다이얼로그 */}
        <Dialog open={cdDialogOpen} onClose={closeCdDialog} fullScreen={mobile} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">{cdDialogTitle}</Typography>
              <IconButton onClick={closeCdDialog} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                  <TextField
                    label="코드값"
                    value={editingCd.cd || ''}
                    onChange={(e) =>
                      setEditingCd((prev: any) => ({
                        ...prev,
                        cd: e.target.value,
                      }))
                    }
                    inputProps={{ maxLength: 20 }}
                    InputProps={{ readOnly: editingCd.row_status !== 'C' }}
                    fullWidth
                  />
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                  <TextField
                    label="정렬순서"
                    type="number"
                    value={editingCd.srt_sn || ''}
                    onChange={(e) =>
                      setEditingCd((prev: any) => ({
                        ...prev,
                        srt_sn: e.target.value,
                      }))
                    }
                    fullWidth
                  />
                </Box>
              </Box>
              <Box>
                <TextField
                  label="코드명"
                  value={editingCd.cd_nm || ''}
                  onChange={(e) =>
                    setEditingCd((prev: any) => ({
                      ...prev,
                      cd_nm: e.target.value,
                    }))
                  }
                  inputProps={{ maxLength: 600 }}
                  fullWidth
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                  <TextField
                    label="BUFF1"
                    value={editingCd.buf_fst_txt || ''}
                    onChange={(e) =>
                      setEditingCd((prev: any) => ({
                        ...prev,
                        buf_fst_txt: e.target.value,
                      }))
                    }
                    inputProps={{ maxLength: 200 }}
                    fullWidth
                  />
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                  <TextField
                    label="BUFF2"
                    value={editingCd.buf_snd_txt || ''}
                    onChange={(e) =>
                      setEditingCd((prev: any) => ({
                        ...prev,
                        buf_snd_txt: e.target.value,
                      }))
                    }
                    inputProps={{ maxLength: 200 }}
                    fullWidth
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                  <TextField
                    label="BUFF3"
                    value={editingCd.buf_trd_txt || ''}
                    onChange={(e) =>
                      setEditingCd((prev: any) => ({
                        ...prev,
                        buf_trd_txt: e.target.value,
                      }))
                    }
                    inputProps={{ maxLength: 200 }}
                    fullWidth
                  />
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                  <TextField
                    label="BUFF4"
                    value={editingCd.buf_fth_txt || ''}
                    onChange={(e) =>
                      setEditingCd((prev: any) => ({
                        ...prev,
                        buf_fth_txt: e.target.value,
                      }))
                    }
                    inputProps={{ maxLength: 200 }}
                    fullWidth
                  />
                </Box>
              </Box>
              <Box>
                <TextField
                  label="BUFF5"
                  value={editingCd.buf_ffh_txt || ''}
                  onChange={(e) =>
                    setEditingCd((prev: any) => ({
                      ...prev,
                      buf_ffh_txt: e.target.value,
                    }))
                  }
                  inputProps={{ maxLength: 200 }}
                  fullWidth
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCdDialog}>취소</Button>
            <Button onClick={saveCd} variant="contained" color="primary">
              저장
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ListWrapper>
  );
}
