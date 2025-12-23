'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Typography,
  Avatar,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Divider,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useMonsterInfo } from '@/features/siege/hooks/useMonsterInfo';
import { getMonsterImageUrl } from '@/shared/utils/image';

export default function MonsterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const theme = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const mobileQuery = useMediaQuery(theme.breakpoints.down('md'));
  const mobile = isMounted ? mobileQuery : false;

  // 클라이언트 마운트 확인
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // URL에서 monster_id 추출
  const monsterId = params?.detail as string | undefined;

  // 몬스터 기본 정보 조회
  const {
    data: monsterInfo,
    isLoading: isLoadingInfo,
    isFetching: isFetchingInfo,
    isError: isErrorInfo,
    error: errorInfo,
    refetch: refetchInfo,
  } = useMonsterInfo(monsterId || null);

  const goBack = () => {
    router.push('/monster-search');
  };

  // 초기화 전이거나 초기 로딩 중
  if (!isMounted || (isLoadingInfo && !monsterInfo)) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // 에러 발생
  if (isErrorInfo) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="error" sx={{ mb: 1 }}>
              데이터를 불러오는 중 오류가 발생했습니다
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {errorInfo instanceof Error ? errorInfo.message : '알 수 없는 오류가 발생했습니다.'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="outlined" onClick={() => refetchInfo()} color="primary">
                다시 시도
              </Button>
              <Button variant="outlined" onClick={goBack} startIcon={<ArrowBackIcon />}>
                뒤로가기
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // 데이터 없음
  if (!monsterInfo && !isLoadingInfo && !isFetchingInfo) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              데이터를 찾을 수 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              요청하신 몬스터 정보가 존재하지 않거나 조회할 수 없습니다.
            </Typography>
            <Button variant="outlined" onClick={goBack} startIcon={<ArrowBackIcon />}>
              뒤로가기
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // 데이터 없으면 렌더링하지 않음
  if (!monsterInfo) {
    return null;
  }

  // 속성별 색상 매핑
  const getElementColor = (elemental: string) => {
    const element = elemental?.toLowerCase();
    if (element === 'fire' || element === '불') return '#e74c3c';
    if (element === 'water' || element === '물') return '#3498db';
    if (element === 'wind' || element === '바람') return '#2ecc71';
    if (element === 'light' || element === '빛') return '#f39c12';
    if (element === 'dark' || element === '어둠') return '#9b59b6';
    return '#95a5a6';
  };

  // 스탯 카드 컴포넌트
  const StatCard = ({ label, value }: { label: string; value: string | number }) => (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        textAlign: 'center',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 2,
        },
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {label}
      </Typography>
    </Paper>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        {/* 헤더 */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={goBack}
            startIcon={<ArrowBackIcon />}
            size={mobile ? 'small' : 'medium'}
          >
            뒤로가기
          </Button>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, fontSize: { xs: '24px', md: '32px' } }}
          >
            몬스터 상세 정보
          </Typography>
        </Box>

        {/* 메인 컨텐츠 */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            alignItems: 'flex-start',
          }}
        >
          {/* 좌측: 기본 정보 */}
          <Box sx={{ width: { xs: '100%', md: '400px' }, flexShrink: 0 }}>
            <Card sx={{ boxShadow: 3, borderRadius: 3, overflow: 'hidden' }}>
              <CardHeader
                title="기본 정보"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  py: 2,
                }}
                titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
              />
              <CardContent sx={{ p: 3 }}>
                {/* 몬스터 이미지 */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                  <Avatar
                    src={getMonsterImageUrl(monsterInfo.image_url)}
                    sx={{
                      width: { xs: 140, md: 180 },
                      height: { xs: 140, md: 180 },
                      border: `4px solid ${getElementColor(monsterInfo.monster_elemental)}`,
                      boxShadow: 4,
                    }}
                  />
                </Box>

                {/* 몬스터 이름 */}
                <Typography
                  variant="h5"
                  sx={{
                    textAlign: 'center',
                    fontWeight: 700,
                    mb: 0.5,
                  }}
                >
                  {monsterInfo.kr_name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: 'center',
                    color: 'text.secondary',
                    mb: 3,
                  }}
                >
                  {monsterInfo.un_name}
                </Typography>

                {/* 속성 및 별 개수 */}
                <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 3 }}>
                  <Chip
                    label={monsterInfo.monster_elemental}
                    sx={{
                      bgcolor: getElementColor(monsterInfo.monster_elemental),
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label={`${monsterInfo.star}★`}
                    sx={{
                      bgcolor: 'text.primary',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                  {monsterInfo.arousal_type && (
                    <Chip
                      label={monsterInfo.arousal_type}
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  )}
                </Stack>

                {/* 리더 스킬 */}
                {monsterInfo.leader_skill_description && (
                  <Paper
                    elevation={0}
                    sx={{
                      mt: 3,
                      p: 2,
                      bgcolor: 'background.default',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      {monsterInfo.leader_icon && (
                        <Avatar
                          src={getMonsterImageUrl(monsterInfo.leader_icon)}
                          sx={{ width: 32, height: 32 }}
                        />
                      )}
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        리더 스킬
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.7 }}>
                      {monsterInfo.leader_skill_description}
                    </Typography>
                  </Paper>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* 우측: 스탯 및 스킬 정보 */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* 스탯 정보 */}
            <Card sx={{ mb: 3, boxShadow: 3, borderRadius: 3, overflow: 'hidden' }}>
              <CardHeader
                title="스탯 정보"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  py: 2,
                }}
                titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
              />
              <CardContent sx={{ p: 3 }}>
                {/* 기본 스탯 */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    기본 스탯 (레벨 1)
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                      gap: 2,
                    }}
                  >
                    <StatCard label="HP" value={monsterInfo.base_hp?.toLocaleString() || '-'} />
                    <StatCard
                      label="공격력"
                      value={monsterInfo.base_attack?.toLocaleString() || '-'}
                    />
                    <StatCard
                      label="방어력"
                      value={monsterInfo.base_defense?.toLocaleString() || '-'}
                    />
                    <StatCard label="속도" value={monsterInfo.speed || '-'} />
                    <StatCard label="치명타율" value={`${monsterInfo.crit_rate || '-'}%`} />
                    <StatCard label="치명타 피해" value={`${monsterInfo.crit_damage || '-'}%`} />
                    <StatCard label="저항" value={`${monsterInfo.resistance || '-'}%`} />
                    <StatCard label="명중률" value={`${monsterInfo.accuracy || '-'}%`} />
                  </Box>
                </Box>

                {/* 최대 레벨 스탯 */}
                {monsterInfo.max_lvl_hp && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                        최대 레벨 스탯
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)' },
                          gap: 2,
                        }}
                      >
                        <StatCard
                          label="HP"
                          value={monsterInfo.max_lvl_hp?.toLocaleString() || '-'}
                        />
                        <StatCard
                          label="공격력"
                          value={monsterInfo.max_lvl_attack?.toLocaleString() || '-'}
                        />
                        <StatCard
                          label="방어력"
                          value={monsterInfo.max_lvl_defense?.toLocaleString() || '-'}
                        />
                      </Box>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 스킬 정보 */}
            <Card sx={{ boxShadow: 3, borderRadius: 3, overflow: 'hidden' }}>
              <CardHeader
                title="스킬 정보"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  py: 2,
                }}
                titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
              />
              <CardContent sx={{ p: 3 }}>
                {!monsterInfo.skills || monsterInfo.skills.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      스킬 정보가 없습니다
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {monsterInfo.skills.map((skill, index) => (
                      <Paper
                        key={skill.skill_id || index}
                        elevation={0}
                        sx={{
                          p: 2.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: 3,
                            borderColor: 'primary.main',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                          {/* 스킬 아이콘 */}
                          {skill.icon_path && (
                            <Avatar
                              src={getMonsterImageUrl(skill.icon_path)}
                              sx={{
                                width: { xs: 56, md: 64 },
                                height: { xs: 56, md: 64 },
                                border: '2px solid',
                                borderColor: 'primary.main',
                                flexShrink: 0,
                              }}
                            />
                          )}
                          {/* 스킬 정보 */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {skill.skill_name || `스킬 ${skill.slot || index + 1}`}
                              </Typography>
                              <Chip
                                label={`슬롯 ${skill.slot || index + 1}`}
                                size="small"
                                variant="outlined"
                              />
                              {skill.passive && (
                                <Chip label="패시브" size="small" color="secondary" />
                              )}
                              {skill.aoe && <Chip label="광역" size="small" color="error" />}
                            </Box>
                            {skill.skill_description && (
                              <Typography
                                variant="body2"
                                sx={{ color: 'text.primary', lineHeight: 1.7, mb: 1.5 }}
                              >
                                {skill.skill_description}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1.5 }}>
                              {skill.cooltime !== null && skill.cooltime !== undefined && (
                                <Chip
                                  label={`쿨타임: ${skill.cooltime}턴`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                              {skill.hits && (
                                <Chip
                                  label={`타격 수: ${skill.hits}회`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                              {skill.max_level && (
                                <Chip
                                  label={`최대 레벨: ${skill.max_level}`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                            {skill.level_progress_description && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  mt: 1.5,
                                  color: 'text.secondary',
                                  fontStyle: 'italic',
                                }}
                              >
                                {skill.level_progress_description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
