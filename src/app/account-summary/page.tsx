'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  LinearProgress,
  Typography,
  Alert,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/shared/utils/auth';
import { showToast } from '@/shared/lib/notification';
import { validateFile } from '@/shared/utils/security';
import DataTable from '@/shared/ui/data-table/DataTable';
import type { TableColumn } from '@/shared/ui/data-table/DataTable';
import {
  useAccountSummaryUpload,
  useAccountSummaryImportList,
} from '@/hooks/api';
import type { ImportListItem } from '@/features/account-summary/types/account-summary';

export default function AccountSummaryPage() {
  const router = useRouter();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const loggedIn = isClient && isAuthenticated();

  const importListQuery = useAccountSummaryImportList({ enabled: loggedIn });

  const uploadMutation = useAccountSummaryUpload({
    onSuccess: () => {
      showToast.success('계정 JSON이 저장되었습니다.');
      setSelectedFile(null);
      importListQuery.refetch();
    },
    onError: (error: Error) => {
      showToast.error(error.message || '업로드에 실패했습니다.');
    },
  });

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const v = validateFile(file, {
      allowedExtensions: ['json'],
      maxSizeBytes: 10 * 1024 * 1024,
    });
    if (!v.valid) {
      showToast.error(v.error || '유효하지 않은 파일입니다.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      showToast.error('JSON 파일을 선택해주세요.');
      return;
    }
    uploadMutation.mutate(selectedFile);
  };

  const importColumns = useMemo<TableColumn<ImportListItem>[]>(
    () => [
      { title: '임포트ID', key: 'import_id' },
      { title: '업로드일시', key: 'uploaded_at' },
      { title: '닉네임', key: 'wizard_name', hideOnMobile: true },
      { title: '몬스터', key: 'unit_count' },
      { title: '룬', key: 'rune_count' },
      { title: '파일', key: 'source_filename', hideOnMobile: true },
    ],
    [],
  );

  if (!isClient) return null;

  if (!loggedIn) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          계정 요약 기능은 로그인 후 사용할 수 있습니다.
        </Alert>
        <Button variant="contained" onClick={() => router.push('/login')} startIcon={<UploadFileIcon />}>
          로그인하러 가기
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          계정 요약 (이력)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          먼저 업로드 이력을 확인하고, 원하는 항목을 클릭하면 상세(요약/몬스터/룬) 화면으로 이동합니다.
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="JSON 업로드" />
        <CardContent>
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              bgcolor: 'background.default',
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
              SWEX JSON 파일을 선택하세요
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              최대 10MB, 확장자 .json
            </Typography>

            <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
              파일 선택
              <input
                type="file"
                hidden
                accept=".json,application/json"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
            </Button>

            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                선택됨: <b>{selectedFile.name}</b> ({(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)
              </Typography>
            )}

            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={handleUpload} disabled={uploadMutation.isPending || !selectedFile}>
                {uploadMutation.isPending ? '업로드 중...' : '업로드 & 저장'}
              </Button>
            </Box>

            {uploadMutation.isPending && <LinearProgress sx={{ mt: 2 }} />}
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="업로드 이력" />
        <CardContent>
          {importListQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
          {importListQuery.data?.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              아직 저장된 계정 JSON이 없습니다. 먼저 업로드해주세요.
            </Alert>
          )}
          <DataTable<ImportListItem>
            columns={importColumns}
            data={importListQuery.data || []}
            emptyMessage="업로드 이력이 없습니다."
            size="small"
            getRowKey={(row) => row.import_id}
            onRowClick={(row) => router.push(`/account-summary/${row.import_id}`)}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            행을 클릭하면 상세(요약/몬스터/룬) 화면으로 이동합니다.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}


