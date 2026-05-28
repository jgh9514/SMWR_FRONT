'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
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
  Paper,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSiegeValidation, useSiegeSave } from '@/hooks/api';
import { extractSiegeLogListFromFileText } from '@/features/log-upload/utils/extractSiegeLogList';
import type {
  SiegeSaveRequest,
  SiegeValidationResponse,
} from '@/features/log-upload/types/log-upload';
import { showToast } from '@/shared/lib/notification';
import { validateFile } from '@/shared/utils/security';
import { logger } from '@/shared/lib/logger';
import type { UserInfo } from '@/features/auth/types/auth';
import type { SiegeUploadResponse } from '@/types';

const LOG_UPLOAD_MAX_FILE_BYTES = 32 * 1024 * 1024;

export default function LogUploadPage() {
  const router = useRouter();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const userInfo = useMemo<UserInfo | null>(() => {
    if (!isClient) return null;
    const storedUserInfo = localStorage.getItem('userInfo');
    if (!storedUserInfo) return null;

    try {
      return JSON.parse(storedUserInfo) as UserInfo;
    } catch (error) {
      logger.error('사용자 정보 파싱 실패', error);
      return null;
    }
  }, [isClient]);

  const isAdmin = userInfo?.roles?.some((role) => role.role_id === 'RL0001') || false;
  const isGuildLeaderOrManager = userInfo?.guild_role === 'LEADER' || userInfo?.guild_role === 'MANAGER';
  const hasGuild = !!userInfo?.guild_id;
  const canUploadSiege = isAdmin || (hasGuild && isGuildLeaderOrManager);

  const [files, setFiles] = useState<File[]>([]);
  const [siegeValidationResult, setSiegeValidationResult] = useState<SiegeValidationResponse | null>(null);
  const [siegeResult, setSiegeResult] = useState<SiegeUploadResponse | null>(null);
  const [siegeOptions, setSiegeOptions] = useState<Record<string, 'skip' | 'overwrite'>>({});
  const [logListData, setLogListData] = useState<unknown[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];

    for (const file of selectedFiles) {
      const validation = validateFile(file, {
        allowedExtensions: ['json', 'txt'],
        allowedMimeTypes: ['application/json', 'text/plain'],
        maxSizeBytes: LOG_UPLOAD_MAX_FILE_BYTES,
      });

      if (!validation.valid) {
        showToast.error(validation.error || '파일 검증에 실패했습니다.');
        e.target.value = '';
        return;
      }
    }

    setFiles(selectedFiles);
  };

  const handleFileRemove = () => {
    setFiles([]);
    setSiegeValidationResult(null);
    setSiegeResult(null);
    setSiegeOptions({});
    setLogListData([]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!e.dataTransfer.files?.length) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
      const validation = validateFile(file, {
        allowedExtensions: ['json', 'txt'],
        allowedMimeTypes: ['application/json', 'text/plain'],
        maxSizeBytes: LOG_UPLOAD_MAX_FILE_BYTES,
      });

      if (!validation.valid) {
        showToast.error(validation.error || '파일 검증에 실패했습니다.');
        return;
      }
    }

    setFiles(droppedFiles);
  };

  const siegeValidationMutation = useSiegeValidation({
    onSuccess: (data: SiegeValidationResponse) => {
      setSiegeValidationResult(data);
      const options: Record<string, 'skip' | 'overwrite'> = {};
      data.siegeItems?.forEach((item) => {
        if (item.isDuplicate && item.index !== undefined) {
          options[String(item.index)] = 'skip';
        }
      });
      setSiegeOptions(options);
      showToast.success('점령전 검증이 완료되었습니다. 중복 항목을 확인해주세요.');
    },
    onError: (error: Error) => {
      logger.error('점령전 검증 실패', error, { context: 'LogUploadPage' });
      showToast.error(error.message || '점령전 검증에 실패했습니다.');
    },
  });

  const siegeSaveMutation = useSiegeSave({
    onSuccess: (data: SiegeUploadResponse) => {
      setSiegeResult(data);
      setSiegeValidationResult(null);
      showToast.success('점령전 로그가 저장되었습니다.');
    },
    onError: (error: Error) => {
      logger.error('점령전 저장 실패', error, { context: 'LogUploadPage' });
      showToast.error('점령전 저장에 실패했습니다.');
    },
  });

  const handleSiegeValidation = async () => {
    if (files.length === 0) {
      showToast.error('파일을 선택해주세요.');
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const logList = extractSiegeLogListFromFileText(text);
        if (logList.length === 0) {
          showToast.error(
            'GetGuildSiegeBattleLog 전투 로그가 없습니다. 랭킹(GetGuildSiegeRankingInfo)만 있거나 Response JSON이 잘렸는지 확인해 주세요.',
          );
          setLogListData([]);
          return;
        }
        setLogListData(logList);
        siegeValidationMutation.mutate(file);
      } catch (error) {
        showToast.error('파일을 읽는 중 오류가 발생했습니다.');
        logger.error('파일 읽기 실패', error);
      }
    };
    reader.readAsText(file);
  };

  const handleSiegeSave = () => {
    if (logListData.length === 0) {
      showToast.error('검증을 먼저 수행해주세요.');
      return;
    }

    const request: SiegeSaveRequest = {
      log_list: logListData,
      siegeOptions,
    };

    siegeSaveMutation.mutate(request);
  };

  const handleSiegeOptionChange = (index: number, option: 'skip' | 'overwrite') => {
    setSiegeOptions((prev) => ({
      ...prev,
      [String(index)]: option,
    }));
  };

  if (!canUploadSiege) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          점령전 로그 업로드는 관리자 또는 길드장/매니저만 가능합니다.
        </Alert>
        <Button variant="outlined" onClick={() => router.push('/')}>
          메인으로 돌아가기
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            점령전 로그 업로드
          </Typography>
          <Typography variant="body2" color="text.secondary">
            점령전 JSON·TXT 로그 파일을 업로드하여 데이터를 수집합니다. (관리자 / 길드장·매니저)
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="업로드 안내" />
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            업로드 후 결과 요약과 상세 로그를 아래에서 확인할 수 있습니다.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • JSON 또는 TXT 형식의 점령전 로그 파일을 업로드하세요.
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                점령전 로그
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Guild Siege
              </Typography>
            </Box>
          }
        />
        <CardContent>
          <Paper
            variant="outlined"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            sx={{
              p: 3,
              mb: 2,
              textAlign: 'center',
              cursor: 'pointer',
              border: '2px dashed',
              borderColor: dragActive ? 'primary.main' : files.length > 0 ? 'success.main' : 'divider',
              backgroundColor: dragActive
                ? 'action.hover'
                : files.length > 0
                  ? 'success.light'
                  : 'background.paper',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
              },
            }}
            onClick={() => {
              const input = document.getElementById('siege-file-input') as HTMLInputElement;
              input?.click();
            }}
          >
            <input
              id="siege-file-input"
              type="file"
              accept=".json,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {files.length === 0 ? (
              <>
                <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  파일을 선택하거나 여기에 드래그하세요
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  JSON 또는 TXT 파일만 업로드 가능합니다
                </Typography>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <InsertDriveFileIcon sx={{ color: 'success.main' }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {files[0].name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  ({(files[0].size / 1024).toFixed(2)} KB)
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileRemove();
                  }}
                  sx={{ ml: 1 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Paper>

          {!siegeValidationResult && (
            <>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleSiegeValidation}
                disabled={siegeValidationMutation.isPending || files.length === 0}
                startIcon={<FileUploadIcon />}
                size="large"
              >
                {siegeValidationMutation.isPending ? '검증 중...' : '점령전 검증'}
              </Button>
              {siegeValidationMutation.isPending && <LinearProgress sx={{ mt: 2 }} />}
            </>
          )}

          {siegeValidationResult && !siegeResult && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                점령전 검증 결과
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                  <Typography variant="caption" color="text.secondary">
                    인식된 점령전
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {siegeValidationResult.totalSiegeCount ?? '-'} 건
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                  <Typography variant="caption" color="text.secondary">
                    인식된 결투
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {siegeValidationResult.totalBattleCount ?? '-'} 건
                  </Typography>
                </Box>
              </Box>

              {siegeValidationResult.siegeItems && siegeValidationResult.siegeItems.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                    점령전별 상세 정보
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ maxWidth: '100%', overflowX: 'auto' }}
                  >
                    <Table size="small" sx={{ minWidth: 1000 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, minWidth: 60 }}>번호</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>점령전 ID</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 400 }}>길드 정보 (1등/2등/3등)</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>결투 기록</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>상태</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>처리</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {siegeValidationResult.siegeItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                {item.matchId || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {item.guilds && item.guilds.length > 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
                                  {item.guilds.map((guild, idx) => (
                                    <Box
                                      key={idx}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.75,
                                        p: 0.75,
                                        borderRadius: 1,
                                        bgcolor: idx === 0 ? 'success.light' : idx === 1 ? 'info.light' : 'warning.light',
                                        minWidth: 120,
                                      }}
                                    >
                                      <Chip
                                        label={guild.matchRank || `${idx + 1}등`}
                                        size="small"
                                        color={idx === 0 ? 'success' : idx === 1 ? 'info' : 'warning'}
                                        sx={{ minWidth: 45, fontSize: '0.75rem' }}
                                      />
                                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                        {guild.guildName || '-'}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  길드 정보 없음
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${item.battleCount ?? 0}건`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {item.isDuplicate ? (
                                <Chip icon={<WarningIcon />} label="중복" size="small" color="warning" />
                              ) : (
                                <Chip icon={<CheckCircleIcon />} label="신규" size="small" color="success" />
                              )}
                            </TableCell>
                            <TableCell>
                              {item.isDuplicate && item.index !== undefined ? (
                                <RadioGroup
                                  row
                                  value={siegeOptions[item.index] || 'skip'}
                                  onChange={(e) =>
                                    handleSiegeOptionChange(item.index!, e.target.value as 'skip' | 'overwrite')
                                  }
                                >
                                  <FormControlLabel value="skip" control={<Radio size="small" />} label="넘기기" />
                                  <FormControlLabel value="overwrite" control={<Radio size="small" />} label="덮어쓰기" />
                                </RadioGroup>
                              ) : (
                                <Chip icon={<CheckCircleIcon />} label="저장 예정" size="small" color="success" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  onClick={handleSiegeSave}
                  disabled={siegeSaveMutation.isPending}
                  startIcon={<CheckCircleIcon />}
                  size="large"
                >
                  {siegeSaveMutation.isPending ? '저장 중...' : '점령전 저장'}
                </Button>
                {siegeSaveMutation.isPending && <LinearProgress sx={{ mt: 2 }} />}
              </Box>
            </Box>
          )}

          {siegeResult && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                점령전 저장 결과
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                  <Typography variant="caption" color="text.secondary">
                    인식된 점령전
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {siegeResult.totalSiegeCount ?? '-'} 건
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                  <Typography variant="caption" color="text.secondary">
                    저장된 점령전
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {siegeResult.insertedSiegeCount ?? '-'} 건
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                  <Typography variant="caption" color="text.secondary">
                    인식된 결투
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {siegeResult.totalBattleCount ?? '-'} 건
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                  <Typography variant="caption" color="text.secondary">
                    저장된 결투
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {siegeResult.insertedBattleCount ?? '-'} 건
                  </Typography>
                </Box>
              </Box>

              {siegeResult.siegeItems && siegeResult.siegeItems.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                    점령전별 상세 정보
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>번호</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>길드명</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>점령전 ID</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>결투 기록</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>상태</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>처리</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {siegeResult.siegeItems.map((item, index) => {
                          const firstGuild = item.guilds && item.guilds.length > 0 ? item.guilds[0] : null;
                          const guildName = firstGuild?.guildName || '-';
                          const matchId = item.matchId || '-';

                          return (
                            <TableRow key={index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {guildName}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                  {matchId}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={`${item.battleCount ?? 0}건`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                {item.isDuplicate ? (
                                  <Chip icon={<WarningIcon />} label="중복" size="small" color="warning" />
                                ) : (
                                  <Chip icon={<CheckCircleIcon />} label="신규" size="small" color="success" />
                                )}
                              </TableCell>
                              <TableCell>
                                {item.isDuplicate ? (
                                  <RadioGroup row value={item.status === 'overwrite' ? 'overwrite' : 'skip'} onChange={() => {}}>
                                    <FormControlLabel value="skip" control={<Radio size="small" />} label="넘기기" />
                                    <FormControlLabel value="overwrite" control={<Radio size="small" />} label="덮어쓰기" />
                                  </RadioGroup>
                                ) : (
                                  <Chip icon={<CheckCircleIcon />} label="저장됨" size="small" color="success" />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
