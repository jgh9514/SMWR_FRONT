'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Container,
  Alert,
  IconButton,
  Paper,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useGuildApplication } from '@/hooks/api';
import { isEmpty } from '@/shared/utils/util';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import { validateFile } from '@/shared/utils/security';
import GroupIcon from '@mui/icons-material/Group';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export default function GuildApplicationPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        try {
          setUserInfo(JSON.parse(storedUserInfo));
        } catch (error) {
          logger.error('사용자 정보 파싱 실패', error);
        }
      }
    }
  }, []);

  // 길드 신청 폼 데이터
  const [guildFormData, setGuildFormData] = useState({
    guild_name: '',
    json_file: null as File | null,
    image_file: null as File | null,
  });

  // 길드 생성 신청 Mutation
  const guildCreateMutation = useGuildApplication({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('길드 생성 신청이 완료되었습니다. 관리자 승인 대기 중입니다.');
        setTimeout(() => {
          router.push('/settings');
        }, 1500);
      } else {
        throw new Error(res.message || '길드 생성 신청에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('길드 생성 신청 실패', error);
      showToast.error(error.message || '길드 생성 신청에 실패했습니다.');
    },
  });

  const handleCreateGuild = () => {
    if (isEmpty(guildFormData.guild_name)) {
      showToast.error('길드명을 입력해주세요.');
      return;
    }

    if (!guildFormData.json_file) {
      showToast.error('JSON 파일을 업로드해주세요.');
      return;
    }

    if (!guildFormData.image_file) {
      showToast.error('이미지 파일을 업로드해주세요.');
      return;
    }

    if (!userInfo?.user_id) {
      showToast.error('사용자 정보를 찾을 수 없습니다.');
      return;
    }

    guildCreateMutation.mutate({
      guild_name: guildFormData.guild_name,
      json_file: guildFormData.json_file,
      image_file: guildFormData.image_file,
    } as any);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: { xs: 1, sm: 2, md: 2.5 },
      }}
    >
      <Container maxWidth="sm" sx={{ width: '100%' }}>
        <Card
          sx={{
            width: '100%',
            borderRadius: { xs: 1.5, md: 2.5 },
            boxShadow: { xs: '0 4px 20px rgba(0, 0, 0, 0.2)', md: '0 20px 60px rgba(0, 0, 0, 0.3)' },
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3, md: 5 } }}>
            {/* 헤더 */}
            <Box sx={{ mb: { xs: 2, md: 3 } }}>
              <Button
                variant="text"
                startIcon={<ArrowBackIcon />}
                onClick={() => router.push('/settings')}
                sx={{ 
                  mb: { xs: 1, md: 2 },
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  px: { xs: 0.5, md: 1 },
                }}
              >
                설정으로 돌아가기
              </Button>
            </Box>

            {/* 타이틀 영역 */}
            <Box sx={{ textAlign: 'center', mb: { xs: 2.5, md: 4 } }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: { xs: 60, md: 80 },
                  height: { xs: 60, md: 80 },
                  mb: { xs: 1.5, md: 2.5 },
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '50%',
                }}
              >
                <GroupIcon sx={{ color: 'white', fontSize: { xs: 30, md: 40 } }} />
              </Box>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#2d3748', 
                  mb: { xs: 0.5, md: 1 },
                  fontSize: { xs: '1.5rem', md: '2.125rem' },
                }}
              >
                길드 생성 신청
              </Typography>
              <Typography 
                sx={{ 
                  color: '#718096', 
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  px: { xs: 1, md: 0 },
                }}
              >
                새 길드를 생성하고 길드장이 됩니다. 관리자 승인 후 길드가 생성됩니다.
              </Typography>
            </Box>

            {/* 안내 메시지 */}
            <Alert severity="info" sx={{ mb: { xs: 2, md: 3 }, fontSize: { xs: '0.875rem', md: '1rem' } }}>
              길드 생성 신청 시 JSON 파일과 이미지 파일을 업로드해주세요. 관리자 승인 후 길드가 생성됩니다.
            </Alert>

            {/* 길드 신청 폼 */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2.5 } }}>
              <TextField
                label="길드명"
                placeholder="길드명을 입력하세요"
                value={guildFormData.guild_name}
                onChange={(e) =>
                  setGuildFormData({ ...guildFormData, guild_name: e.target.value })
                }
                disabled={guildCreateMutation.isPending}
                fullWidth
                required
                onKeyUp={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateGuild();
                  }
                }}
              />

              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mb: { xs: 0.75, md: 1 }, 
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', md: '0.875rem' },
                  }}
                >
                  JSON 파일 <span style={{ color: 'red' }}>*</span>
                </Typography>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      // 파일 검증
                      const validation = validateFile(file, {
                        allowedExtensions: ['json'],
                        allowedMimeTypes: ['application/json'],
                        maxSizeBytes: 10 * 1024 * 1024, // 10MB
                      });

                      if (!validation.valid) {
                        showToast.error(validation.error || '파일 검증에 실패했습니다.');
                        e.target.value = '';
                        return;
                      }

                      setGuildFormData({ ...guildFormData, json_file: file });
                    }
                  }}
                  disabled={guildCreateMutation.isPending}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
                {guildFormData.json_file && (
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      mt: 0.5, 
                      display: 'block',
                      fontSize: { xs: '0.75rem', md: '0.75rem' },
                    }}
                  >
                    선택된 파일: {guildFormData.json_file.name}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mb: { xs: 0.75, md: 1 }, 
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', md: '0.875rem' },
                  }}
                >
                  이미지 파일 (한 장) <span style={{ color: 'red' }}>*</span>
                </Typography>
                {!guildFormData.image_file ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: { xs: 2, md: 3 },
                      textAlign: 'center',
                      border: '2px dashed',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.selected',
                      },
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          // 파일 검증
                          const validation = validateFile(file, {
                            allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
                            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                            maxSizeBytes: 5 * 1024 * 1024, // 5MB
                          });

                          if (!validation.valid) {
                            showToast.error(validation.error || '파일 검증에 실패했습니다.');
                            e.target.value = '';
                            return;
                          }

                          setGuildFormData({ ...guildFormData, image_file: file });
                        }
                      };
                      input.click();
                    }}
                  >
                    <CloudUploadIcon sx={{ fontSize: { xs: 36, md: 48 }, color: 'text.secondary', mb: { xs: 0.75, md: 1 } }} />
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: { xs: 0.25, md: 0.5 },
                        fontSize: { xs: '0.875rem', md: '0.875rem' },
                      }}
                    >
                      이미지를 클릭하여 업로드
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.75rem', md: '0.75rem' } }}
                    >
                      PNG, JPG, GIF 등 이미지 파일 (한 장만)
                    </Typography>
                  </Paper>
                ) : (
                  <Box>
                    <Paper
                      variant="outlined"
                      sx={{
                        position: 'relative',
                        p: { xs: 1.5, md: 2 },
                        borderRadius: { xs: 1.5, md: 2 },
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          maxHeight: { xs: '250px', md: '400px' },
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          overflow: 'hidden',
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                        }}
                      >
                        <img
                          src={URL.createObjectURL(guildFormData.image_file)}
                          alt="미리보기"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '250px',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => {
                            setGuildFormData({ ...guildFormData, image_file: null });
                          }}
                          disabled={guildCreateMutation.isPending}
                          sx={{
                            position: 'absolute',
                            top: { xs: 4, md: 8 },
                            right: { xs: 4, md: 8 },
                            bgcolor: 'background.paper',
                            boxShadow: 2,
                            '&:hover': {
                              bgcolor: 'error.main',
                              color: 'error.contrastText',
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ mt: { xs: 0.75, md: 1 }, display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1 }, flexWrap: 'wrap' }}>
                        <ImageIcon sx={{ fontSize: { xs: 14, md: 16 }, color: 'text.secondary', flexShrink: 0 }} />
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ 
                            flex: 1,
                            minWidth: 0,
                            fontSize: { xs: '0.75rem', md: '0.75rem' },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {guildFormData.image_file.name} ({(guildFormData.image_file.size / 1024).toFixed(2)} KB)
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setGuildFormData({ ...guildFormData, image_file: null });
                          }}
                          disabled={guildCreateMutation.isPending}
                          sx={{ 
                            fontSize: { xs: '0.75rem', md: '0.875rem' },
                            px: { xs: 1, md: 2 },
                          }}
                        >
                          변경
                        </Button>
                      </Box>
                    </Paper>
                  </Box>
                )}
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleCreateGuild}
                disabled={
                  isEmpty(guildFormData.guild_name) ||
                  !guildFormData.json_file ||
                  !guildFormData.image_file ||
                  guildCreateMutation.isPending
                }
                sx={{
                  mt: { xs: 1.5, md: 2 },
                  py: { xs: 1.25, md: 1.5 },
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  },
                }}
              >
                {guildCreateMutation.isPending ? '신청 중...' : '길드 생성 신청'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

