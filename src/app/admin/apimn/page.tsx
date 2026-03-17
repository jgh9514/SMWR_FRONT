'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Container,
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
import { useRouter } from 'next/navigation';
import { useApiList, useRoleList, useApiRoleList, useApiRoleSave } from '@/hooks/api';
import { searchDataExtraction } from '@/shared/utils/util';
import { useCommonCodes } from '@/features/admin/hooks/useCommonCode';
import type { ApiRoleItem } from '@/features/admin/hooks/useApi';
import { showToast, confirm } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import type { SearchData } from '@/shared/types/util';
import type { ApiItem } from '@/types';

export default function ApiManagementPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  const [schDatas] = useState<SearchData>({});
  const [selectedApis, setSelectedApis] = useState<string[]>([]);
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [selectedRolesOverride, setSelectedRolesOverride] = useState<string[] | null>(null);

  const apiHeaders = useMemo(() => {
    const cols = [
      { title: 'API ID', key: 'api_id', align: 'center' as const },
      { title: '업무구분', key: 'bsns_cd', align: 'center' as const },
      { title: 'API 명', key: 'api_txt', align: 'left' as const },
      { title: 'API URL', key: 'api_url', align: 'left' as const },
      { title: '사용여부', key: 'usg_yn', align: 'center' as const },
    ];

    if (mobile) {
      return cols.filter((col) => !['api_id', 'bsns_cd', 'api_url', 'usg_yn'].includes(col.key));
    }
    return cols;
  }, [mobile]);

  const roleHeaders = [
    { title: '권한 ID', key: 'role_id', align: 'center' as const },
    { title: '권한명', key: 'role_nm', align: 'left' as const },
  ];

  const searchParams = useMemo(() => {
    return searchDataExtraction(schDatas);
  }, [schDatas]);

  const { data: apiList = [] } = useApiList(searchParams);
  const { data: roleList = [] } = useRoleList({});
  const { data: apiRoleResponse = [], refetch: refetchApiRole } = useApiRoleList(selectedApiId);

  const selectedRolesFromApi = useMemo(
    () => apiRoleResponse.filter((role) => role.rolechk === 'Y').map((role) => role.role_id),
    [apiRoleResponse],
  );

  const selectedRoles = selectedRolesOverride ?? selectedRolesFromApi;

  const apiRoleSaveMutation = useApiRoleSave({
    onSuccess: () => {
      showToast.success('저장되었습니다.');
      refetchApiRole();
    },
    onError: (error: unknown) => {
      logger.error('API 권한 저장 실패', error, { context: 'ApiManagementPage' });
      showToast.error('저장에 실패했습니다.');
    },
  });

  const handleApiClick = (item: ApiItem) => {
    setSelectedApiId(item.api_id);
    setSelectedRolesOverride(null);
  };

  const handleAdd = () => {
    showToast.info('개발 중입니다.');
  };

  const handleDelete = async () => {
    if (selectedApis.length === 0) {
      showToast.error('삭제할 데이터가 없습니다.');
      return;
    }
    showToast.info('개발 중입니다.');
  };

  const handleSave = async () => {
    if (!selectedApiId) {
      showToast.error('API를 선택해주세요.');
      return;
    }

    const res = await confirm('저장하시겠습니까?');
    if (!res) return;

    const saveData: ApiRoleItem[] = roleList.map((role) => ({
      ...role,
      rolechk: selectedRoles.includes(role.role_id) ? 'Y' : 'N',
    }));

    apiRoleSaveMutation.mutate({
      api_id: selectedApiId,
      roleList: saveData,
    });
  };

  const toggleSelectApi = (apiId: string) => {
    setSelectedApis((prev) =>
      prev.includes(apiId) ? prev.filter((v) => v !== apiId) : [...prev, apiId],
    );
  };

  const toggleSelectRole = (roleId: string) => {
    setSelectedRolesOverride((prev) => {
      const current = prev ?? selectedRoles;
      return current.includes(roleId)
        ? current.filter((value) => value !== roleId)
        : [...current, roleId];
    });
  };

  const initialCodeGroups = {
    CO00000001: { cd: [], cd_nm: [] },
  };
  useCommonCodes(initialCodeGroups);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/admin')} startIcon={<ArrowBackIcon />}>
            목록
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '20px', md: '24px' } }}>
            API 관리
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          {/* API 목록 */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(60% - 8px)' } }}>
            <Card>
              <CardHeader
                title="API 목록"
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
                        {apiHeaders.map((h) => (
                          <TableCell key={h.key} align={h.align}>
                            {h.title}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {apiList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={apiHeaders.length + 1} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              데이터가 없습니다
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        apiList.map((row) => {
                          const isSelected = selectedApis.includes(row.api_id);
                          return (
                            <TableRow
                              key={row.api_id}
                              onClick={() => handleApiClick(row)}
                              sx={{ cursor: 'pointer' }}
                              hover
                              selected={selectedApiId === row.api_id}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={isSelected}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectApi(row.api_id);
                                  }}
                                />
                              </TableCell>
                              {!mobile && <TableCell align="center">{row.api_id}</TableCell>}
                              {!mobile && <TableCell align="center">{row.bsns_cd}</TableCell>}
                              <TableCell align="left">{row.api_txt}</TableCell>
                              {!mobile && <TableCell align="left">{row.api_url}</TableCell>}
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
          </Box>

          {/* API 권한 목록 */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(40% - 8px)' } }}>
            <Card>
              <CardHeader title="API 권한 목록" />
              <CardContent>
                {selectedApiId ? (
                  <>
                    <TableContainer>
                      <Table size={mobile ? 'small' : 'medium'}>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox" />
                            {roleHeaders.map((h) => (
                              <TableCell key={h.key} align={h.align}>
                                {h.title}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {roleList.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={roleHeaders.length + 1} align="center" sx={{ py: 4 }}>
                                <Typography variant="body2" color="text.secondary">
                                  데이터가 없습니다
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            roleList.map((row) => {
                              const isSelected = selectedRoles.includes(row.role_id);
                              return (
                                <TableRow key={row.role_id} hover>
                                  <TableCell padding="checkbox">
                                    <Checkbox
                                      checked={isSelected}
                                      onChange={() => toggleSelectRole(row.role_id)}
                                    />
                                  </TableCell>
                                  <TableCell align="center">{row.role_id}</TableCell>
                                  <TableCell align="left">{row.role_nm}</TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="contained" color="primary" onClick={handleSave}>
                        저장
                      </Button>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      API를 선택해주세요
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
