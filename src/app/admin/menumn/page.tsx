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
import { useMenuList, useMenuSave, useMenuRoleList, useMenuRoleSave, useRoleList } from '@/hooks/api';
import { showToast, confirm } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import MenuPopup from '@/components/popup/MenuPopup';
import type { MenuRoleItem } from '@/features/admin/hooks/useMenu';
import type { MenuItem } from '@/types';

export default function MenuManagementPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [selectedRolesOverride, setSelectedRolesOverride] = useState<string[] | null>(null);
  const [menuPopupOpen, setMenuPopupOpen] = useState(false);
  const [menuPopupMode, setMenuPopupMode] = useState<'new' | 'edit'>('new');
  const [menuPopupData, setMenuPopupData] = useState<{ menuId: string | null; upMenuId: string | null }>({
    menuId: null,
    upMenuId: null,
  });

  const menuHeaders = useMemo(() => {
    const cols = [
      { title: '레벨', key: 'menu_lv', align: 'center' as const },
      { title: '메뉴 ID', key: 'menu_id', align: 'center' as const },
      { title: '메뉴명', key: 'menu_nm', align: 'left' as const },
      { title: 'URL', key: 'menu_url', align: 'left' as const },
      { title: '사용여부', key: 'usg_yn', align: 'center' as const },
      { title: '액션', key: 'actions', align: 'center' as const },
    ];

    if (mobile) {
      return cols.filter((col) => !['menu_lv', 'menu_id', 'menu_url', 'usg_yn'].includes(col.key));
    }
    return cols;
  }, [mobile]);

  const roleHeaders = [
    { title: '권한 ID', key: 'role_id', align: 'center' as const },
    { title: '권한명', key: 'role_nm', align: 'left' as const },
  ];

  const { data: menuResponse = [], refetch: refetchMenu } = useMenuList();
  const { data: roleList = [] } = useRoleList({});
  const { data: menuRoleResponse = [], refetch: refetchMenuRole } = useMenuRoleList(selectedMenuId);

  const menuList = useMemo(
    () =>
      [...menuResponse].sort((a, b) => {
        if (a.srt_path && b.srt_path) {
          return a.srt_path.localeCompare(b.srt_path);
        }
        return 0;
      }),
    [menuResponse],
  );

  const selectedRolesFromMenu = useMemo(
    () => menuRoleResponse.filter((role) => role.rolechk === 'Y').map((role) => role.role_id),
    [menuRoleResponse],
  );

  const selectedRoles = selectedRolesOverride ?? selectedRolesFromMenu;

  const menuSaveMutation = useMenuSave({
    onSuccess: () => {
      showToast.success('삭제되었습니다.');
      refetchMenu();
    },
    onError: (error: Error) => {
      logger.error('메뉴 삭제 실패', error);
      showToast.error('삭제에 실패했습니다.');
    },
  });

  const menuRoleSaveMutation = useMenuRoleSave({
    onSuccess: () => {
      showToast.success('저장되었습니다.');
      refetchMenuRole();
    },
    onError: (error: Error) => {
      logger.error('메뉴 권한 저장 실패', error);
      showToast.error('저장에 실패했습니다.');
    },
  });

  const handleMenuClick = (item: MenuItem) => {
    setSelectedMenuId(item.menu_id);
    setSelectedRolesOverride(null);
  };

  const handleOpenNew = () => {
    setMenuPopupMode('new');
    setMenuPopupData({ menuId: null, upMenuId: null });
    setMenuPopupOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setMenuPopupMode('edit');
    setMenuPopupData({ menuId: item.menu_id, upMenuId: item.up_menu_id || null });
    setMenuPopupOpen(true);
  };

  const handleDeleteMenu = async (item: MenuItem) => {
    const res = await confirm('삭제하시겠습니까?');
    if (!res) return;

    menuSaveMutation.mutate({
      insertRow: [],
      updateRow: [],
      deleteRow: [item],
    });
  };

  const handleMenuPopupClose = (saved?: boolean) => {
    setMenuPopupOpen(false);
    if (saved) {
      refetchMenu();
    }
  };

  const handleSave = async () => {
    if (!selectedMenuId) {
      showToast.error('메뉴를 선택해주세요.');
      return;
    }

    const res = await confirm('저장하시겠습니까?');
    if (!res) return;

    const saveData: MenuRoleItem[] = roleList.map((role) => ({
      ...role,
      rolechk: selectedRoles.includes(role.role_id) ? 'Y' : 'N',
    }));

    menuRoleSaveMutation.mutate({
      menu_id: selectedMenuId,
      roleList: saveData,
    });
  };

  const toggleSelectRole = (roleId: string) => {
    setSelectedRolesOverride((prev) => {
      const current = prev ?? selectedRoles;
      return current.includes(roleId)
        ? current.filter((value) => value !== roleId)
        : [...current, roleId];
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
            메뉴 관리
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          {/* 메뉴 목록 */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(60% - 8px)' } }}>
            <Card>
              <CardHeader
                title="메뉴 목록"
                action={
                  <Button size="small" variant="contained" color="primary" onClick={handleOpenNew}>
                    대메뉴 추가
                  </Button>
                }
              />
              <CardContent>
                <TableContainer>
                  <Table size={mobile ? 'small' : 'medium'}>
                    <TableHead>
                      <TableRow>
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
                          <TableCell colSpan={menuHeaders.length} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              데이터가 없습니다
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        menuList.map((row) => (
                          <TableRow
                            key={row.menu_id}
                            onClick={() => handleMenuClick(row)}
                            sx={{ cursor: 'pointer' }}
                            hover
                            selected={selectedMenuId === row.menu_id}
                          >
                            {!mobile && <TableCell align="center">{row.menu_lv}</TableCell>}
                            {!mobile && <TableCell align="center">{row.menu_id}</TableCell>}
                            <TableCell align="left">
                              <Box sx={{ pl: row.menu_lv ? row.menu_lv * 2 : 0 }}>
                                {row.menu_nm}
                              </Box>
                            </TableCell>
                            {!mobile && <TableCell align="left">{row.menu_url}</TableCell>}
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
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEdit(row);
                                  }}
                                >
                                  수정
                                </Button>
                                <Button
                                  size="small"
                                  variant="text"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMenu(row);
                                  }}
                                >
                                  삭제
                                </Button>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>

          {/* 메뉴 권한 */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(40% - 8px)' } }}>
            <Card>
              <CardHeader title="메뉴 권한" />
              <CardContent>
                {selectedMenuId ? (
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
                      메뉴를 선택해주세요
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>

        <MenuPopup
          open={menuPopupOpen}
          onClose={handleMenuPopupClose}
          menuId={menuPopupData.menuId}
          upMenuId={menuPopupData.upMenuId}
          mode={menuPopupMode}
        />
      </Container>
    </Box>
  );
}
