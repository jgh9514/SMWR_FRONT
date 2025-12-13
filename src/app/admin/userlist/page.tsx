'use client';

import { useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
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
import { useUserList } from '@/hooks/api';
import { searchDataExtraction } from '@/shared/utils/util';
import type { UserItem } from '@/features/admin/types/admin';

export default function UserListPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  const schDatas = useMemo(() => ({}), []);

  const searchParams = useMemo(() => {
    return searchDataExtraction(schDatas);
  }, [schDatas]);

  const { data: userList = [] } = useUserList(searchParams);

  const headers = useMemo(() => {
    const baseHeaders = [
      { title: '사용자 ID', key: 'user_id', align: 'center' as const },
      { title: '사용자명', key: 'user_nm', align: 'center' as const },
      { title: '사용여부', key: 'usg_yn', align: 'center' as const },
      { title: '삭제여부', key: 'del_yn', align: 'center' as const },
      { title: '언어 코드', key: 'lang_cd', align: 'center' as const },
    ];

    return baseHeaders.filter((col) => {
      if (mobile && ['lang_cd'].includes(col.key)) return false;
      return true;
    });
  }, [mobile]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/admin')} startIcon={<ArrowBackIcon />}>
            목록
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '20px', md: '24px' } }}>
            사용자 목록
          </Typography>
        </Box>

        <Card>
          <CardHeader title="사용자 목록" />
          <CardContent>
            <TableContainer>
              <Table size={mobile ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    {headers.map((h) => (
                      <TableCell key={h.key} align={h.align}>
                        {h.title}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={headers.length} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          데이터가 없습니다
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    userList.map((row, index) => (
                      <TableRow key={row.user_id || index} hover>
                        <TableCell align="center">{row.user_id}</TableCell>
                        <TableCell align="center">{row.user_nm}</TableCell>
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
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            sx={{
                              color: row.del_yn === 'Y' ? 'error.main' : 'text.secondary',
                              fontWeight: 600,
                            }}
                          >
                            {row.del_yn}
                          </Typography>
                        </TableCell>
                        {!mobile && <TableCell align="center">{row.lang_cd}</TableCell>}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
