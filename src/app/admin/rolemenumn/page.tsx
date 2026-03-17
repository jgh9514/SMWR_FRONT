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
import { useRoleList, useRoleMenuList, useRoleMenuSave } from '@/hooks/api';
import { searchDataExtraction } from '@/shared/utils/util';
import { showToast, confirm } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import type { SearchData } from '@/shared/types/util';
import type { RoleItem, MenuItem } from '@/types';

type RoleScopedMenuItem = MenuItem & { rolechk?: 'Y' | 'N' };

export default function RoleMenuManagementPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  const [schDatas, setSchDatas] = useState<SearchData>({});
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedMenusOverride, setSelectedMenusOverride] = useState<string[] | null>(null);

  const roleHeaders = [{ title: '권한명', key: 'role_nm', align: 'left' as const }];

  const menuHeaders = useMemo(() => {
    const cols = [
      { title: '레벨', key: 'menu_lv', align: 'center' as const },
      { title: '메뉴번호', key: 'menu_id', align: 'center' as const },
      { title: '메뉴명', key: 'menu_nm', align: 'left' as const },
    ];

    if (mobile) {
      return cols.filter((col) => col.key !== 'menu_lv');
    }
    return cols;
  }, [mobile]);

  const { data: roleList = [] } = useRoleList({});

  const roleMenuParams = useMemo(() => {
    if (!selectedRoleId) return {};
    return searchDataExtraction({ ...schDatas, role_id: selectedRoleId });
  }, [schDatas, selectedRoleId]);

  const { data: menuList = [], refetch: refetchRoleMenu } = useRoleMenuList(roleMenuParams);
  const typedMenuList = menuList as RoleScopedMenuItem[];
  const selectedMenusFromRole = useMemo(
    () => typedMenuList.filter((menu) => menu.rolechk === 'Y').map((menu) => menu.menu_id),
    [typedMenuList],
  );
  const selectedMenus = selectedMenusOverride ?? selectedMenusFromRole;

  const roleMenuSaveMutation = useRoleMenuSave({
    onSuccess: () => {
      showToast.success('저장되었습니다.');
      refetchRoleMenu();
    },
    onError: (error: Error) => {
      logger.error('권한 메뉴 저장 실패', error);
      showToast.error('저장에 실패했습니다.');
    },
  });

  const handleRoleClick = (item: RoleItem) => {
    setSelectedRoleId(item.role_id);
    setSelectedMenusOverride(null);
    setSchDatas((prev) => ({ ...prev, role_id: item.role_id }));
  };

  const handleSave = async () => {
    if (!selectedRoleId) {
      showToast.error('권한을 선택해주세요.');
      return;
    }

    const res = await confirm('저장하시겠습니까?');
    if (!res) return;

    const saveData: RoleScopedMenuItem[] = typedMenuList.map((menu) => ({
      ...menu,
      rolechk: selectedMenus.includes(menu.menu_id) ? 'Y' : 'N',
    }));

    roleMenuSaveMutation.mutate({
      role_id: selectedRoleId,
      menuList: saveData,
    });
  };

  const toggleSelectMenu = (menuId: string) => {
    setSelectedMenusOverride((prev) => {
      const current = prev ?? selectedMenus;
      return current.includes(menuId)
        ? current.filter((value) => value !== menuId)
        : [...current, menuId];
    });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/admin')} startIcon={<ArrowBackIcon />}>
            목록
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '20px', md: '24px' } }}>
            권한별 메뉴 관리
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          {/* 권한 목록 */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(30% - 8px)' } }}>
            <Card>
              <CardHeader title="권한 목록" />
              <CardContent>
                <TableContainer>
                  <Table size={mobile ? 'small' : 'medium'}>
                    <TableHead>
                      <TableRow>
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
                          <TableCell align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              데이터가 없습니다
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        roleList.map((row) => (
                          <TableRow
                            key={row.role_id}
                            onClick={() => handleRoleClick(row)}
                            sx={{ cursor: 'pointer' }}
                            hover
                            selected={selectedRoleId === row.role_id}
                          >
                            <TableCell align="left">{row.role_nm}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>

          {/* 권한 메뉴 */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(70% - 8px)' } }}>
            <Card>
              <CardHeader title="권한 메뉴" />
              <CardContent>
                {selectedRoleId ? (
                  <>
                    <TableContainer>
                      <Table size={mobile ? 'small' : 'medium'}>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox" />
                            {menuHeaders.map((h) => (
                              <TableCell key={h.key} align={h.align}>
                                {h.title}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {menuList.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={menuHeaders.length + 1} align="center" sx={{ py: 4 }}>
                                <Typography variant="body2" color="text.secondary">
                                  데이터가 없습니다
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            menuList.map((row) => {
                              const isSelected = selectedMenus.includes(row.menu_id);
                              return (
                                <TableRow key={row.menu_id} hover>
                                  <TableCell padding="checkbox">
                                    <Checkbox
                                      checked={isSelected}
                                      onChange={() => toggleSelectMenu(row.menu_id)}
                                    />
                                  </TableCell>
                                  {!mobile && <TableCell align="center">{row.menu_lv}</TableCell>}
                                  <TableCell align="center">{row.menu_id}</TableCell>
                                  <TableCell align="left">
                                    <Box sx={{ pl: row.menu_lv ? row.menu_lv * 2 : 0 }}>
                                      {row.menu_nm}
                                    </Box>
                                  </TableCell>
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
                      권한을 선택해주세요
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
