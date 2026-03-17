'use client';

import { useMemo, useState, Suspense } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Container,
  FormControl,
  MenuItem,
  Select,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRoleList, useUserRoleList, useUserRoleSave } from '@/hooks/api';
import { isEmpty, searchDataExtraction } from '@/shared/utils/util';
import { showToast, confirm } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import type { SearchData } from '@/shared/types/util';
import type { UserRoleItem, SaveRequest } from '@/types';

function RoleUserListContent() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoleNm = searchParams.get('role_nm') || undefined;

  const [userRoleListOverride, setUserRoleListOverride] = useState<UserRoleItem[] | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const schDatas = useMemo<SearchData>(
    () => (initialRoleNm ? { role_nm: initialRoleNm } : {}),
    [initialRoleNm],
  );

  const { data: roleResponse = [] } = useRoleList({});

  const roleList = useMemo(
    () => ({
      cd: ['', ...roleResponse.map((item) => item.role_id)],
      cd_nm: ['SELECT', ...roleResponse.map((item) => item.role_nm)],
    }),
    [roleResponse],
  );

  const roleOptions = useMemo(() => {
    return roleList.cd.map((cd, index) => ({
      value: cd,
      label: roleList.cd_nm[index],
    }));
  }, [roleList]);

  const headers = useMemo(() => {
    const cols = [
      { title: '권한ID', key: 'role_id', align: 'center' as const },
      { title: '권한명', key: 'role_nm', align: 'center' as const },
      { title: '사번', key: 'emp_no', align: 'center' as const },
      { title: '이름', key: 'usr_nm', align: 'center' as const },
      { title: '부서', key: 'dept_nm', align: 'center' as const },
      { title: '사용여부', key: 'usg_yn', align: 'center' as const },
    ];

    if (mobile) {
      return cols.filter((col) => !['role_id', 'emp_no', 'usg_yn'].includes(col.key));
    }
    return cols;
  }, [mobile]);

  const searchParamsForApi = useMemo(() => {
    return searchDataExtraction(schDatas);
  }, [schDatas]);

  const { data: userRoleResponse = [], refetch: refetchUserRole } = useUserRoleList(searchParamsForApi);
  const userRoleListBase = useMemo(
    () =>
      userRoleResponse.map((row) => ({
        ...row,
        row_status: row.row_status || '',
      })),
    [userRoleResponse],
  );
  const userRoleList = userRoleListOverride ?? userRoleListBase;

  const saveMutation = useUserRoleSave({
    onSuccess: () => {
      showToast.success('저장되었습니다.');
      setUserRoleListOverride(null);
      refetchUserRole();
    },
    onError: (error: Error) => {
      logger.error('저장 실패', error);
      showToast.error('저장에 실패했습니다.');
    },
  });

  const handleAdd = () => {
    setUserRoleListOverride((prev) => [
      {
        user_id: '',
        usr_id: '',
        role_tp_nm: '',
        role_nm: '',
        role_id: '',
        emp_no: '',
        usr_nm: '',
        dept_nm: '',
        usg_yn: 'Y',
        row_status: 'C',
      },
      ...(prev ?? userRoleList),
    ]);
  };

  const handleDelete = async () => {
    if (selectedUsers.length === 0) {
      showToast.error('삭제할 데이터가 없습니다.');
      return;
    }

    const res = await confirm('삭제하시겠습니까?');
    if (!res) return;

    setUserRoleListOverride((prev) =>
      (prev ?? userRoleList).filter((entry) => entry.usr_id && !selectedUsers.includes(entry.usr_id)),
    );
    setSelectedUsers([]);
  };

  const handleRoleChange = (index: number, roleId: string) => {
    const role = roleOptions.find((r) => r.value === roleId);
    if (!role) return;

    setUserRoleListOverride((prev) => {
      const current = [...(prev ?? userRoleList)];
      const item = current[index];
      if (!item) return current;

      current[index] = {
        ...item,
        role_nm: role.label,
        role_id: roleId,
        row_status: item.row_status || 'U',
      };
      return current;
    });
  };

  const handleSelectUser = () => {
    showToast.info('사용자 선택 기능은 개발 중입니다.');
  };

  const handleSave = async () => {
    for (let i = 0; i < userRoleList.length; i++) {
      const item = userRoleList[i];

      if (isEmpty(item.role_id)) {
        showToast.error('권한을 선택해주세요.');
        return;
      }

      if (isEmpty(item.emp_no)) {
        showToast.error('사용자를 선택해 주세요.');
        return;
      }
    }

    const res = await confirm('저장하시겠습니까?');
    if (!res) return;

    const insertRow = userRoleList.filter((item) => item.row_status === 'C');
    const updateRow = userRoleList.filter((item) => item.row_status === 'U');

    const formData: SaveRequest<UserRoleItem> = {
      insertRow,
      updateRow,
      deleteRow: [],
    };

    saveMutation.mutate(formData);
  };

  const toggleSelectUser = (usrId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(usrId) ? prev.filter((v) => v !== usrId) : [...prev, usrId],
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/admin/rolemn')} startIcon={<ArrowBackIcon />}>
            목록
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '20px', md: '24px' } }}>
            권한별 사용자 관리
          </Typography>
        </Box>

        <Card>
          <CardHeader
            title="권한별 사용자 목록"
            action={
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button size="small" variant="contained" color="primary" onClick={handleAdd}>
                  추가
                </Button>
                <Button size="small" variant="contained" color="error" onClick={handleDelete}>
                  삭제
                </Button>
              </Box>
            }
          />
          <CardContent>
            <TableContainer>
              <Table size={mobile ? 'small' : 'medium'}>
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
                  {userRoleList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={headers.length + 1} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          데이터가 없습니다
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    userRoleList.map((row, index) => {
                      const usrId = row.usr_id || '';
                      const isSelected = selectedUsers.includes(usrId);
                      const isNew = row.row_status === 'C';
                      return (
                        <TableRow key={usrId || index} hover selected={isSelected}>
                          <TableCell padding="checkbox">
                            <Checkbox checked={isSelected} onChange={() => toggleSelectUser(usrId)} />
                          </TableCell>
                          {!mobile && (
                            <TableCell align="center">
                              {isNew ? (
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                  <Select
                                    value={row.role_id || ''}
                                    onChange={(e) => handleRoleChange(index, e.target.value)}
                                  >
                                    {roleOptions.map((opt) => (
                                      <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              ) : (
                                row.role_id
                              )}
                            </TableCell>
                          )}
                          <TableCell align="center">
                            {isNew ? (
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                  value={row.role_id || ''}
                                  onChange={(e) => handleRoleChange(index, e.target.value)}
                                >
                                  {roleOptions.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            ) : (
                              row.role_nm
                            )}
                          </TableCell>
                          {!mobile && <TableCell align="center">{row.emp_no}</TableCell>}
                          <TableCell align="center">
                            {isNew ? (
                              <Button variant="text" size="small" onClick={handleSelectUser}>
                                {row.usr_nm || '사용자 선택'}
                              </Button>
                            ) : (
                              row.usr_nm
                            )}
                          </TableCell>
                          <TableCell align="center">{row.dept_nm}</TableCell>
                          {!mobile && (
                            <TableCell align="center">
                              <Typography
                                variant="body2"
                                sx={{
                                  color: row.usg_yn === 'Y' ? 'success.main' : 'text.secondary',
                                  fontWeight: 600,
                                }}
                              >
                                {row.usg_yn}
                              </Typography>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="outlined" onClick={() => router.push('/admin/rolemn')}>
            목록
          </Button>
          <Button variant="contained" color="primary" onClick={handleSave}>
            저장
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default function RoleUserListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RoleUserListContent />
    </Suspense>
  );
}
