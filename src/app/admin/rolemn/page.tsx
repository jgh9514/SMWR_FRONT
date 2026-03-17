'use client';

import { useMemo, useState, useCallback } from 'react';
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
  Container,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useRouter } from 'next/navigation';
import { useRoleList, useRoleSave } from '@/hooks/api';
import { isEmpty, searchDataExtraction } from '@/shared/utils/util';
import { useCommonCodes } from '@/features/admin/hooks/useCommonCode';
import { showToast, confirm } from '@/shared/lib/notification';
import { PageHeader, LoadingState, EmptyState } from '@/shared/ui';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { logger } from '@/shared/lib/logger';
import type { RoleItem, SaveRequest } from '@/types';
import type { SearchData, CodeListData, EditingItem } from '@/shared/types/admin';

type RoleEditingItem = EditingItem & {
  role_id?: string;
  role_nm?: string;
  role_desc?: string;
  bsns_cd?: string;
  usr_cnt?: number | string;
  usg_yn?: string;
  srt_sn?: string;
};

export default function RoleManagementPage() {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const [schDatas] = useState<SearchData>({});
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleDialog, setRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleEditingItem>({});

  const initialCodeGroups: CodeListData = {
    CO00000001: { cd: [], cd_nm: [] },
    CO00000004: { cd: [], cd_nm: [] },
  };
  
  const { data: codeListData = initialCodeGroups } = useCommonCodes(initialCodeGroups);
  const codeList = codeListData;

  const bsnsCdOptions = useMemo(() => {
    const codeData = codeList.CO00000001;
    if (!codeData) return [];
    return codeData.cd.map((cd: string, index: number) => ({
      value: cd,
      label: codeData.cd_nm[index] || '',
    }));
  }, [codeList]);

  const usgYnOptions = useMemo(() => {
    const codeData = codeList.CO00000004;
    if (!codeData) return [];
    return codeData.cd.map((cd: string, index: number) => ({
      value: cd,
      label: codeData.cd_nm[index] || '',
    }));
  }, [codeList]);

  const getBsnsCdNm = useCallback(
    (bsnsCd: string) => {
      const option = bsnsCdOptions.find((opt) => opt.value === bsnsCd);
      return option ? option.label : '';
    },
    [bsnsCdOptions],
  );

  const headers = useMemo(() => {
    const cols = [
      { title: '권한 ID', key: 'role_id', align: 'center' as const },
      { title: '권한명', key: 'role_nm', align: 'left' as const },
      { title: '업무구분', key: 'bsns_cd', align: 'center' as const },
      { title: '사용자수', key: 'usr_cnt', align: 'center' as const },
      { title: '사용여부', key: 'usg_yn', align: 'center' as const },
      { title: '정렬순서', key: 'srt_sn', align: 'center' as const },
    ];

    if (isMobile) {
      return cols.filter((col) => !['role_id', 'bsns_cd', 'srt_sn'].includes(col.key));
    }
    return cols;
  }, [isMobile]);

  const roleDialogTitle = editingRole.row_status === 'C' ? '권한 추가' : '권한 수정';

  const searchParams = useMemo(() => {
    return searchDataExtraction(schDatas);
  }, [schDatas]);

  const { data: roleResponse = [], refetch: refetchRole, isLoading } = useRoleList(searchParams);

  const roleList = useMemo<RoleItem[]>(() => {
    return roleResponse.map((row) => ({
      ...row,
      row_status: row.row_status || '',
    }));
  }, [roleResponse]);

  const roleSaveMutation = useRoleSave({
    onSuccess: () => {
      showToast.success('저장되었습니다.');
      setSelectedRoles([]);
      refetchRole();
    },
    onError: (error: unknown) => {
      logger.error('권한 저장 실패', error, { context: 'RoleManagementPage' });
      showToast.error('저장에 실패했습니다.');
    },
  });

  const handleAdd = useCallback(() => {
    setEditingRole({
      role_id: '',
      role_nm: '',
      bsns_cd: '',
      usr_cnt: '0',
      usg_yn: 'Y',
      srt_sn: '',
      row_status: 'C',
    } as RoleEditingItem);
    setRoleDialog(true);
  }, []);

  const handleEdit = useCallback((item: RoleItem) => {
    setEditingRole({ ...item, row_status: 'U' });
    setRoleDialog(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (selectedRoles.length === 0) {
      showToast.error('삭제할 데이터가 없습니다.');
      return;
    }

    const res = await confirm('삭제하시겠습니까?');
    if (!res) return;

    const deleteItems = selectedRoles
      .map((id) => roleList.find((i) => i.role_id === id))
      .filter((item): item is RoleItem => !!item);

    const formData: SaveRequest<RoleItem> = {
      insertRow: [],
      updateRow: [],
      deleteRow: deleteItems,
    };

    roleSaveMutation.mutate(formData);
  }, [selectedRoles, roleList, roleSaveMutation]);

  const handleCloseDialog = useCallback(() => {
    setRoleDialog(false);
    setEditingRole({});
  }, []);

  const handleSaveRole = useCallback(async () => {
    const roleNm = editingRole.role_nm as string | undefined;
    const bsnsCd = editingRole.bsns_cd as string | undefined;
    const srtSn = editingRole.srt_sn as string | undefined;

    if (isEmpty(roleNm)) {
      showToast.error('권한명을 입력해 주세요.');
      return;
    }
    if (isEmpty(bsnsCd)) {
      showToast.error('업무구분을 선택해 주세요.');
      return;
    }
    if (isEmpty(srtSn)) {
      showToast.error('정렬순서를 입력해 주세요.');
      return;
    }
    if (!/^[0-9]*$/.test(srtSn || '')) {
      showToast.error('정렬순서는 숫자만 입력해주세요.');
      return;
    }

    const res = await confirm('저장하시겠습니까?');
    if (!res) return;

    const roleItem: RoleItem = {
      role_id: (editingRole.role_id as string) || '',
      role_nm: roleNm || '',
      bsns_cd: bsnsCd || '',
      usr_cnt: typeof editingRole.usr_cnt === 'number' ? editingRole.usr_cnt : parseInt((editingRole.usr_cnt as string) || '0', 10),
      usg_yn: (editingRole.usg_yn as string) || 'Y',
      srt_sn: srtSn || '',
      row_status: editingRole.row_status || '',
    };

    const formData: SaveRequest<RoleItem> = {
      insertRow: editingRole.row_status === 'C' ? [roleItem] : [],
      updateRow: editingRole.row_status === 'C' ? [] : [roleItem],
      deleteRow: [],
    };

    roleSaveMutation.mutate(formData);
    handleCloseDialog();
  }, [editingRole, roleSaveMutation, handleCloseDialog]);

  const handleGoUserList = useCallback(
    (item: RoleItem) => {
      router.push(`/admin/roleuserlist?role_id=${item.role_id}&role_nm=${item.role_nm}`);
    },
    [router],
  );

  const toggleSelectRole = useCallback((roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((v) => v !== roleId) : [...prev, roleId],
    );
  }, []);


  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        <PageHeader
          title="권한 관리"
          backPath="/admin"
          actions={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button size="small" variant="contained" color="primary" onClick={handleAdd} aria-label="권한 추가">
                추가
              </Button>
              <Button size="small" variant="contained" color="error" onClick={handleDelete} aria-label="권한 삭제">
                삭제
              </Button>
            </Box>
          }
        />

        {isLoading ? (
          <LoadingState message="데이터를 불러오는 중..." />
        ) : (
          <Card>
            <CardHeader title="권한 목록" />
            <CardContent>
              <TableContainer>
                <Table size={isMobile ? 'small' : 'medium'} aria-label="권한 목록 테이블">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedRoles.length === roleList.length && roleList.length > 0}
                          indeterminate={selectedRoles.length > 0 && selectedRoles.length < roleList.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles(roleList.map((r) => r.role_id));
                            } else {
                              setSelectedRoles([]);
                            }
                          }}
                          aria-label="전체 선택"
                        />
                      </TableCell>
                      {headers.map((h) => (
                        <TableCell key={h.key} align={h.align}>
                          {h.title}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roleList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={headers.length + 1} align="center" sx={{ border: 'none', py: 0 }}>
                          <EmptyState message="권한 데이터가 없습니다" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      roleList.map((row) => {
                        const isSelected = selectedRoles.includes(row.role_id);
                        return (
                          <TableRow key={row.role_id} hover selected={isSelected}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleSelectRole(row.role_id)}
                                aria-label={`${row.role_nm} 선택`}
                              />
                            </TableCell>
                            {!isMobile && <TableCell align="center">{row.role_id}</TableCell>}
                            <TableCell align="left">
                              <Button
                                variant="text"
                                color="primary"
                                onClick={() => handleEdit(row)}
                                sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                                aria-label={`${(row as RoleItem).role_nm} 수정`}
                              >
                                {(row as RoleItem).role_nm}
                              </Button>
                            </TableCell>
                            {!isMobile && <TableCell align="center">{getBsnsCdNm((row as RoleItem).bsns_cd || '')}</TableCell>}
                            <TableCell align="center">
                              {(row as RoleItem).role_id ? (
                                <Button
                                  variant="text"
                                  color="primary"
                                  onClick={() => handleGoUserList(row as RoleItem)}
                                  sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                                  aria-label={`${(row as RoleItem).role_nm}의 사용자 목록 보기`}
                                >
                                  {(row as RoleItem).usr_cnt}
                                </Button>
                              ) : (
                                (row as RoleItem).usr_cnt
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <Typography
                                variant="body2"
                                sx={{
                                  color: (row as RoleItem).usg_yn === 'Y' ? 'success.main' : 'text.secondary',
                                  fontWeight: 600,
                                }}
                                aria-label={`사용여부: ${(row as RoleItem).usg_yn}`}
                              >
                                {(row as RoleItem).usg_yn}
                              </Typography>
                            </TableCell>
                            {!isMobile && <TableCell align="center">{(row as RoleItem).srt_sn}</TableCell>}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        <Dialog
          open={roleDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          aria-labelledby="role-dialog-title"
          aria-describedby="role-dialog-description"
        >
          <DialogTitle id="role-dialog-title">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">{roleDialogTitle}</Typography>
              <IconButton onClick={handleCloseDialog} size="small" aria-label="다이얼로그 닫기">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent id="role-dialog-description">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              {(editingRole.role_id as string | undefined) && editingRole.row_status !== 'C' && (
                <TextField
                  label="권한 ID"
                  value={(editingRole.role_id as string) || ''}
                  InputProps={{ readOnly: true }}
                  fullWidth
                  aria-label="권한 ID (읽기 전용)"
                />
              )}
              <TextField
                label="권한명"
                value={(editingRole.role_nm as string) || ''}
                onChange={(e) =>
                  setEditingRole((prev) => ({
                    ...prev,
                    role_nm: e.target.value,
                  }))
                }
                inputProps={{ maxLength: 300 }}
                fullWidth
                required
                aria-required="true"
                aria-label="권한명 입력"
              />
              <FormControl fullWidth required>
                <InputLabel>업무구분</InputLabel>
                <Select
                  value={(editingRole.bsns_cd as string) || ''}
                  onChange={(e) =>
                    setEditingRole((prev) => ({
                      ...prev,
                      bsns_cd: e.target.value,
                    }))
                  }
                  label="업무구분"
                  aria-label="업무구분 선택"
                >
                  {bsnsCdOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>사용여부</InputLabel>
                <Select
                  value={(editingRole.usg_yn as string) || 'Y'}
                  onChange={(e) =>
                    setEditingRole((prev) => ({
                      ...prev,
                      usg_yn: e.target.value,
                    }))
                  }
                  label="사용여부"
                  aria-label="사용여부 선택"
                >
                  {usgYnOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="정렬순서"
                type="number"
                value={(editingRole.srt_sn as string) || ''}
                onChange={(e) =>
                  setEditingRole((prev) => ({
                    ...prev,
                    srt_sn: e.target.value,
                  }))
                }
                fullWidth
                required
                aria-required="true"
                aria-label="정렬순서 입력"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} aria-label="취소">
              취소
            </Button>
            <Button onClick={handleSaveRole} variant="contained" color="primary" aria-label="저장">
              저장
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
