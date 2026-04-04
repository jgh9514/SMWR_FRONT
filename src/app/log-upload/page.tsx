'use client';

import { useMemo, useState, useSyncExternalStore, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  Checkbox,
  TextField,
  FormGroup,
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  useSiegeValidation,
  useSiegeSave,
  useArenaUpload,
  extractRankerReplayItemsFromLogText,
} from '@/hooks/api';
import { extractSiegeLogListFromFileText } from '@/features/log-upload/utils/extractSiegeLogList';
import type {
  SiegeSaveRequest,
  SiegeValidationResponse,
} from '@/features/log-upload/types/log-upload';
import { showToast } from '@/shared/lib/notification';
import { validateFile } from '@/shared/utils/security';
import { logger } from '@/shared/lib/logger';
import type { UserInfo } from '@/features/auth/types/auth';
import type { SiegeUploadResponse, ArenaUploadResponse } from '@/types';

/** 로그 파일 선택·드롭 최대 크기 (실레나 대용량, WAS `max-http-post-size`·multipart와 맞춤) */
const LOG_UPLOAD_MAX_FILE_BYTES = 32 * 1024 * 1024;

function LogUploadContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uploadType = searchParams.get('type') || 'all'; // 'rta', 'siege', 'all'
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

  // 권한 체크
  const canUploadRta = isAdmin;
  const canUploadSiege = isAdmin || (hasGuild && isGuildLeaderOrManager);

  const [files, setFiles] = useState<File[]>([]);
  const [files2, setFiles2] = useState<File[]>([]);
  const [siegeValidationResult, setSiegeValidationResult] = useState<SiegeValidationResponse | null>(null);
  const [siegeResult, setSiegeResult] = useState<SiegeUploadResponse | null>(null);
  const [arenaResult, setArenaResult] = useState<ArenaUploadResponse | null>(null);
  const [arenaPasteText, setArenaPasteText] = useState('');
  /** 붙여 넣기·파일 이어붙이기용 (메모리만, 새로고침 시 초기화) */
  const [arenaBufferText, setArenaBufferText] = useState('');
  /** 이번 탭에서 «실패 0건이면 rid 기록»으로 누적한 rid (메모리만) */
  const [arenaUploadedRids, setArenaUploadedRids] = useState<Set<string>>(() => new Set());
  const [arenaSkipLocalRids, setArenaSkipLocalRids] = useState(false);
  const [arenaRecordRids, setArenaRecordRids] = useState(false);

  const arenaBufferReplayCount = useMemo(() => {
    if (!arenaBufferText.trim()) return 0;
    try {
      return extractRankerReplayItemsFromLogText(arenaBufferText).length;
    } catch {
      return 0;
    }
  }, [arenaBufferText]);
  const [siegeOptions, setSiegeOptions] = useState<Record<string, 'skip' | 'overwrite'>>({});
  const [logListData, setLogListData] = useState<unknown[]>([]);
  const [dragActive, setDragActive] = useState<{ siege: boolean; arena: boolean }>({
    siege: false,
    arena: false,
  });

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'siege' | 'arena') => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    
    // 파일 검증
    for (const file of selectedFiles) {
      const validation = validateFile(file, {
        allowedExtensions: type === 'arena' ? ['json', 'txt', 'log'] : ['json', 'txt'],
        allowedMimeTypes: type === 'arena' ? [] : ['application/json', 'text/plain'],
        maxSizeBytes: LOG_UPLOAD_MAX_FILE_BYTES,
      });

      if (!validation.valid) {
        showToast.error(validation.error || '파일 검증에 실패했습니다.');
        e.target.value = ''; // 파일 선택 초기화
        return;
      }
    }

    if (type === 'siege') {
      setFiles(selectedFiles);
    } else {
      setFiles2(selectedFiles);
    }
  };

  // 파일 제거 핸들러
  const handleFileRemove = (type: 'siege' | 'arena') => {
    if (type === 'siege') {
      setFiles([]);
      // 파일 제거 시 검증 결과 및 관련 상태 초기화
      setSiegeValidationResult(null);
      setSiegeResult(null);
      setSiegeOptions({});
      setLogListData([]);
    } else {
      setFiles2([]);
      setArenaResult(null);
    }
  };

  const handleArenaAppendBuffer = () => {
    const t = arenaPasteText.trim();
    if (!t) {
      showToast.error('추가할 텍스트를 붙여 넣어 주세요.');
      return;
    }
    const add = t.trimEnd() + (t.endsWith('\n') ? '' : '\n');
    setArenaBufferText((prev) => prev + (prev && !prev.endsWith('\n') ? '\n' : '') + add);
    setArenaPasteText('');
    showToast.success('버퍼에 추가했습니다.');
  };

  const handleArenaClearBuffer = () => {
    setArenaBufferText('');
    showToast.success('버퍼를 비웠습니다.');
  };

  const handleArenaDownloadBuffer = () => {
    const t = arenaBufferText;
    if (!t.trim()) {
      showToast.error('버퍼가 비어 있습니다.');
      return;
    }
    const blob = new Blob([t], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rta-ranker-buffer-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast.success('버퍼 내용을 파일로 저장했습니다.');
  };

  const handleArenaClearRidCache = () => {
    setArenaUploadedRids(new Set());
    showToast.success('세션 rid 기록을 비웠습니다.');
  };

  const handleArenaLoadFileToBuffer = async () => {
    if (files2.length === 0) {
      showToast.error('먼저 파일을 선택하세요.');
      return;
    }
    const texts = await Promise.all(files2.map((f) => f.text()));
    const joined = texts.join('\n');
    const add = joined.trimEnd() + (joined.endsWith('\n') ? '' : '\n');
    setArenaBufferText((prev) => prev + (prev && !prev.endsWith('\n') ? '\n' : '') + add);
    showToast.success(
      files2.length === 1
        ? '선택한 파일 내용을 버퍼에 이어 붙였습니다.'
        : `선택한 ${files2.length}개 파일 내용을 순서대로 버퍼에 이어 붙였습니다.`,
    );
  };

  // 드래그 앤 드롭 핸들러
  const handleDrag = (e: React.DragEvent, type: 'siege' | 'arena') => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive((prev) => ({ ...prev, [type]: true }));
    } else if (e.type === 'dragleave') {
      setDragActive((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'siege' | 'arena') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [type]: false }));

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      
      // 파일 검증
      for (const file of droppedFiles) {
        const validation = validateFile(file, {
          allowedExtensions: type === 'arena' ? ['json', 'txt', 'log'] : ['json', 'txt'],
          allowedMimeTypes: type === 'arena' ? [] : ['application/json', 'text/plain'],
          maxSizeBytes: LOG_UPLOAD_MAX_FILE_BYTES,
        });

        if (!validation.valid) {
          showToast.error(validation.error || '파일 검증에 실패했습니다.');
          return;
        }
      }

      if (type === 'siege') {
        setFiles(droppedFiles);
      } else {
        setFiles2(droppedFiles);
      }
    }
  };

  // 점령전 Validation Mutation (중복 체크)
  const siegeValidationMutation = useSiegeValidation({
    onSuccess: (data: SiegeValidationResponse) => {
      setSiegeValidationResult(data);
      // 중복된 항목들은 기본적으로 'skip'으로 설정
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

  // 점령전 저장 Mutation
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

  // 실레나 업로드 Mutation
  const arenaUploadMutation = useArenaUpload({
    onSuccess: (data: ArenaUploadResponse) => {
      setArenaResult(data);
      if (data.recordedRids?.length) {
        setArenaUploadedRids((prev) => {
          const next = new Set(prev);
          for (const r of data.recordedRids!) {
            if (r) next.add(r);
          }
          return next;
        });
      }
      showToast.success('실레나 로그가 업로드되었습니다.');
    },
    onError: (error: Error) => {
      logger.error('실레나 업로드 실패', error, { context: 'LogUploadPage' });
      const msg =
        /timeout|ECONNABORTED/i.test(String((error as Error & { code?: string }).message)) ||
        (error as Error & { code?: string }).code === 'ECONNABORTED'
          ? '실레나 업로드가 시간 초과로 끊겼습니다. 네트워크·서버 부하를 확인하거나 잠시 후 다시 시도해 주세요.'
          : '실레나 업로드에 실패했습니다.';
      showToast.error(msg);
    },
  });

  // 점령전 검증 처리
  const handleSiegeValidation = async () => {
    if (files.length === 0) {
      showToast.error('파일을 선택해주세요.');
      return;
    }

    // 파일을 읽어서 log_list 추출
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

  // 점령전 저장 처리
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

  // 점령전 옵션 변경
  const handleSiegeOptionChange = (index: number, option: 'skip' | 'overwrite') => {
    setSiegeOptions((prev) => ({
      ...prev,
      [String(index)]: option,
    }));
  };

  // 실레나 업로드 처리 (파일 + 로컬 NDJSON 버퍼 병합, 청크 업로드)
  const handleArenaUpload = () => {
    const extra = arenaBufferText;
    const hasFiles = files2.length > 0;
    if (!hasFiles && !extra.trim()) {
      showToast.error('파일을 선택하거나 버퍼에 로그를 추가해 주세요.');
      return;
    }

    arenaUploadMutation.mutate({
      file: hasFiles ? (files2.length === 1 ? files2[0] : files2) : undefined,
      extraText: extra.trim() ? extra : undefined,
      skipLocalUploadedRids: arenaSkipLocalRids,
      skipUploadedRidSet: arenaUploadedRids,
      recordRidsOnFullSuccess: arenaRecordRids,
    });
  };

  // 권한 없으면 접근 차단
  if (uploadType === 'rta' && !canUploadRta) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          실레나 로그 업로드는 관리자만 가능합니다.
        </Alert>
        <Button variant="outlined" onClick={() => router.push('/')}>
          메인으로 돌아가기
        </Button>
      </Container>
    );
  }

  if (uploadType === 'siege' && !canUploadSiege) {
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

  const showRtaUpload = uploadType === 'rta' || uploadType === 'all';
  const showSiegeUpload = uploadType === 'siege' || uploadType === 'all';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 헤더 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            전투 로그 업로드
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {uploadType === 'rta' && '실레나 로그 파일을 업로드하여 데이터를 수집합니다. (관리자 전용)'}
            {uploadType === 'siege' && '점령전 로그 파일을 업로드하여 데이터를 수집합니다. (관리자/길드장/매니저 전용)'}
            {uploadType === 'all' && '점령전 / 실레나 JSON 로그 파일을 업로드하여 데이터를 수집합니다.'}
          </Typography>
        </CardContent>
      </Card>

      {/* 업로드 안내 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="업로드 안내" />
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            업로드 후 결과 요약과 상세 로그를 아래에서 확인할 수 있습니다.
          </Typography>
          {showSiegeUpload && (
            <Typography variant="body2" color="text.secondary">
              • 점령전 로그: JSON 또는 TXT 형식의 파일을 업로드하세요.
            </Typography>
          )}
            {showRtaUpload && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: showSiegeUpload ? 1 : 0 }}>
              • 실레나: 프록시 로그(API Command / Response) 또는 NDJSON. getRankerRtpvpReplayList·getRtpvpRatingReplayList 응답을 추출합니다.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* 왼쪽: 업로드 영역 */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 100%' } }}>
          {/* 점령전 로그 */}
          {showSiegeUpload && canUploadSiege && (
            <Card sx={{ mb: 3 }}>
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
                {/* 파일 선택 영역 */}
                <Paper
                  variant="outlined"
                  onDragEnter={(e) => handleDrag(e, 'siege')}
                  onDragLeave={(e) => handleDrag(e, 'siege')}
                  onDragOver={(e) => handleDrag(e, 'siege')}
                  onDrop={(e) => handleDrop(e, 'siege')}
                  sx={{
                    p: 3,
                    mb: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '2px dashed',
                    borderColor: dragActive.siege ? 'primary.main' : files.length > 0 ? 'success.main' : 'divider',
                    backgroundColor: dragActive.siege
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
                    onChange={(e) => handleFileSelect(e, 'siege')}
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
                          handleFileRemove('siege');
                        }}
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Paper>

                {/* 검증 버튼 */}
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
                    {siegeValidationMutation.isPending && <LinearProgress sx={{ mb: 2 }} />}
                  </>
                )}

                {/* 검증 결과 표시 */}
                {siegeValidationResult && !siegeResult && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                      점령전 검증 결과
                    </Typography>
                    
                    {/* 전체 통계 */}
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

                    {/* 점령전별 상세 정보 */}
                    {siegeValidationResult.siegeItems && siegeValidationResult.siegeItems.length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                          점령전별 상세 정보
                        </Typography>
                        <TableContainer 
                          component={Paper} 
                          variant="outlined"
                          sx={{ 
                            maxWidth: '100%',
                            overflowX: 'auto',
                          }}
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
                                      <Chip
                                        icon={<WarningIcon />}
                                        label="중복"
                                        size="small"
                                        color="warning"
                                      />
                                    ) : (
                                      <Chip
                                        icon={<CheckCircleIcon />}
                                        label="신규"
                                        size="small"
                                        color="success"
                                      />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {item.isDuplicate && item.index !== undefined ? (
                                      <RadioGroup
                                        row
                                        value={siegeOptions[item.index] || 'skip'}
                                        onChange={(e) =>
                                          handleSiegeOptionChange(
                                            item.index!,
                                            e.target.value as 'skip' | 'overwrite',
                                          )
                                        }
                                      >
                                        <FormControlLabel
                                          value="skip"
                                          control={<Radio size="small" />}
                                          label="넘기기"
                                        />
                                        <FormControlLabel
                                          value="overwrite"
                                          control={<Radio size="small" />}
                                          label="덮어쓰기"
                                        />
                                      </RadioGroup>
                                    ) : (
                                      <Chip
                                        icon={<CheckCircleIcon />}
                                        label="저장 예정"
                                        size="small"
                                        color="success"
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}

                    {/* 저장 버튼 (검증 결과 아래) */}
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

                {/* 저장 결과 표시 */}
                {siegeResult && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                      점령전 저장 결과
                    </Typography>
                    
                    {/* 전체 통계 */}
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

                    {/* 점령전별 상세 정보 */}
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
                                        <Chip
                                          icon={<WarningIcon />}
                                          label="중복"
                                          size="small"
                                          color="warning"
                                        />
                                      ) : (
                                        <Chip
                                          icon={<CheckCircleIcon />}
                                          label="신규"
                                          size="small"
                                          color="success"
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {item.isDuplicate ? (
                                        <RadioGroup
                                          row
                                          value={item.status === 'overwrite' ? 'overwrite' : 'skip'}
                                          onChange={() => {
                                            // 상태 업데이트 로직 (추후 구현)
                                          }}
                                        >
                                          <FormControlLabel
                                            value="skip"
                                            control={<Radio size="small" />}
                                            label="넘기기"
                                          />
                                          <FormControlLabel
                                            value="overwrite"
                                            control={<Radio size="small" />}
                                            label="덮어쓰기"
                                          />
                                        </RadioGroup>
                                      ) : (
                                        <Chip
                                          icon={<CheckCircleIcon />}
                                          label="저장됨"
                                          size="small"
                                          color="success"
                                        />
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
          )}

          {/* 실레나 로그 */}
          {showRtaUpload && canUploadRta && (
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      실레나 로그
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      RTA (관리자 전용)
                    </Typography>
                  </Box>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  붙여 넣기 버퍼에 로그를 이어 붙인 뒤 파일과 합쳐 업로드합니다. 이 탭을 닫거나 새로고침하면 버퍼·rid 기록이
                  초기화됩니다.
                </Typography>

                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    로그 버퍼 (메모리)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    추출 예상: {arenaBufferReplayCount}건 (rid 기준) · 세션 rid 기록: {arenaUploadedRids.size}개
                  </Typography>
                  <TextField
                    multiline
                    minRows={3}
                    fullWidth
                    size="small"
                    placeholder="프록시 로그 일부를 붙여 넣은 뒤 «버퍼에 추가»"
                    value={arenaPasteText}
                    onChange={(e) => setArenaPasteText(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    <Button size="small" variant="outlined" onClick={handleArenaAppendBuffer}>
                      버퍼에 추가
                    </Button>
                    <Button size="small" variant="outlined" onClick={handleArenaLoadFileToBuffer} disabled={files2.length === 0}>
                      선택 파일 → 버퍼에 이어 붙이기
                    </Button>
                    <Button size="small" color="warning" onClick={handleArenaClearBuffer}>
                      버퍼 비우기
                    </Button>
                    <Button size="small" variant="text" onClick={handleArenaDownloadBuffer}>
                      버퍼 다운로드(.txt)
                    </Button>
                    <Button size="small" variant="text" color="secondary" onClick={handleArenaClearRidCache}>
                      rid 기록만 비우기
                    </Button>
                  </Box>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={arenaSkipLocalRids}
                          onChange={(e) => setArenaSkipLocalRids(e.target.checked)}
                          size="small"
                        />
                      }
                      label="세션에 기록된 rid는 제외 («실패 0건이면 rid 기록»을 켠 경우에만 누적)"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={arenaRecordRids}
                          onChange={(e) => setArenaRecordRids(e.target.checked)}
                          size="small"
                        />
                      }
                      label="이번 업로드가 실패 0건이면 rid를 세션에 기록 (새로고침 전까지 유지)"
                    />
                  </FormGroup>
                </Paper>

                {/* 파일 선택 영역 */}
                <Paper
                  variant="outlined"
                  onDragEnter={(e) => handleDrag(e, 'arena')}
                  onDragLeave={(e) => handleDrag(e, 'arena')}
                  onDragOver={(e) => handleDrag(e, 'arena')}
                  onDrop={(e) => handleDrop(e, 'arena')}
                  sx={{
                    p: 3,
                    mb: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '2px dashed',
                    borderColor: dragActive.arena ? 'secondary.main' : files2.length > 0 ? 'success.main' : 'divider',
                    backgroundColor: dragActive.arena
                      ? 'action.hover'
                      : files2.length > 0
                        ? 'success.light'
                        : 'background.paper',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: 'secondary.main',
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={() => {
                    const input = document.getElementById('arena-file-input') as HTMLInputElement;
                    input?.click();
                  }}
                >
                  <input
                    id="arena-file-input"
                    type="file"
                    accept=".txt,.log,.json"
                    multiple
                    onChange={(e) => handleFileSelect(e, 'arena')}
                    style={{ display: 'none' }}
                  />
                  {files2.length === 0 ? (
                    <>
                      <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        파일을 선택하거나 여기에 드래그하세요
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        TXT / LOG / JSON (NDJSON 가능)
                      </Typography>
                    </>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <InsertDriveFileIcon sx={{ color: 'success.main' }} />
                      <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'center' }}>
                        {files2.length === 1
                          ? files2[0].name
                          : `${files2.length}개 파일 — ${files2
                              .slice(0, 2)
                              .map((f) => f.name)
                              .join(', ')}${files2.length > 2 ? ` 외 ${files2.length - 2}개` : ''}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        (
                        {files2.length === 1
                          ? `${(files2[0].size / 1024).toFixed(2)} KB`
                          : `${(files2.reduce((s, f) => s + f.size, 0) / 1024).toFixed(2)} KB 합계`}
                        )
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileRemove('arena');
                        }}
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Paper>

                {/* 업로드 버튼 */}
                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  onClick={handleArenaUpload}
                  disabled={
                    arenaUploadMutation.isPending || (files2.length === 0 && !arenaBufferText.trim())
                  }
                  startIcon={<FileUploadIcon />}
                  size="large"
                >
                  {arenaUploadMutation.isPending ? '업로드 중...' : '실레나 업로드 (파일+버퍼 병합)'}
                </Button>
                {arenaUploadMutation.isPending && <LinearProgress sx={{ mb: 2 }} />}
                {arenaResult && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                      실레나 처리 결과
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(33.333% - 12px)' } }}>
                        <Typography variant="caption" color="text.secondary">
                          성공(저장)
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {arenaResult.success ?? 0} 건
                        </Typography>
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(33.333% - 12px)' } }}>
                        <Typography variant="caption" color="text.secondary">
                          중복/실패
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {arenaResult.fail ?? 0} 건
                        </Typography>
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(33.333% - 12px)' } }}>
                        <Typography variant="caption" color="text.secondary">
                          총 전투 수
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {(arenaResult.success ?? 0) + (arenaResult.fail ?? 0)} 건
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default function LogUploadPage() {
  return (
    <Suspense fallback={
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>로딩 중...</Typography>
      </Container>
    }>
      <LogUploadContent />
    </Suspense>
  );
}

