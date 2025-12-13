'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import { useSignup, useSendEmailVerification, useVerifyEmailCode, useCheckUserIdDuplicate } from '@/hooks/api';
import { isEmpty } from '@/shared/utils/util';
import { isValidEmail, isValidPassword } from '@/shared/utils/validation';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import type { SignupParams } from '@/types';

export default function SignupPage() {
  const router = useRouter();

  // 회원가입 폼 데이터
  const [signupFormData, setSignupFormData] = useState({
    user_id: '',
    password: '',
    password_confirm: '',
    user_name: '',
    email: '',
    verification_code: '',
  });

  // 이메일 도메인 관련 상태
  const [emailId, setEmailId] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [isCustomDomain, setIsCustomDomain] = useState(false);

  // 이메일 도메인 목록
  const emailDomains = [
    'naver.com',
    'gmail.com',
    'daum.net',
    'hanmail.net',
    'korea.com',
    'nate.com',
    '직접 입력',
  ];

  // 이메일 인증 상태
  const [emailVerified, setEmailVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 아이디 중복체크 상태
  const [userIdChecked, setUserIdChecked] = useState(false);
  const [userIdAvailable, setUserIdAvailable] = useState<boolean | null>(null);
  const [lastCheckedUserId, setLastCheckedUserId] = useState<string>('');

  // 비밀번호 검증 상태
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [passwordConfirmMatch, setPasswordConfirmMatch] = useState<boolean | null>(null);

  // 아이디 변경 시 중복체크 상태 초기화
  useEffect(() => {
    if (signupFormData.user_id !== lastCheckedUserId) {
      setUserIdChecked(false);
      setUserIdAvailable(null);
    }
  }, [signupFormData.user_id, lastCheckedUserId]);

  // 비밀번호 검증
  useEffect(() => {
    if (signupFormData.password) {
      const validation = isValidPassword(signupFormData.password);
      setPasswordErrors(validation.errors);
    } else {
      setPasswordErrors([]);
    }
  }, [signupFormData.password]);

  // 비밀번호 확인 일치 여부
  useEffect(() => {
    if (signupFormData.password_confirm) {
      setPasswordConfirmMatch(signupFormData.password === signupFormData.password_confirm);
    } else {
      setPasswordConfirmMatch(null);
    }
  }, [signupFormData.password, signupFormData.password_confirm]);

  // 이메일 주소 조합
  useEffect(() => {
    let fullEmail = '';
    if (emailId) {
      if (isCustomDomain && customDomain) {
        fullEmail = `${emailId}@${customDomain}`;
      } else if (emailDomain && emailDomain !== '직접 입력') {
        fullEmail = `${emailId}@${emailDomain}`;
      }
    }
    setSignupFormData((prev) => ({ ...prev, email: fullEmail }));
    if (fullEmail !== signupFormData.email) {
      setEmailVerified(false);
      setCodeSent(false);
    }
  }, [emailId, emailDomain, customDomain, isCustomDomain]);

  // 이메일 인증 코드 발송 Mutation
  const sendCodeMutation = useSendEmailVerification({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        const message = res.dev_code 
          ? `인증 코드가 발송되었습니다. (개발 모드: ${res.dev_code})`
          : (res.message || '인증 코드가 발송되었습니다.');
        showToast.success(message);
        setCodeSent(true);
        setCountdown(300); // 5분 (300초)
      } else {
        throw new Error(res.message || '인증 코드 발송에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('인증 코드 발송 실패', error);
      showToast.error(error.message || '인증 코드 발송에 실패했습니다.');
    },
  });

  // 이메일 인증 코드 확인 Mutation
  const verifyCodeMutation = useVerifyEmailCode({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('이메일 인증이 완료되었습니다.');
        setEmailVerified(true);
        setCodeSent(false);
        setCountdown(0);
      } else {
        throw new Error(res.message || '인증 코드가 일치하지 않습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('인증 코드 확인 실패', error);
      showToast.error(error.message || '인증 코드가 일치하지 않습니다.');
    },
  });

  // 아이디 중복체크 Mutation
  const checkUserIdDuplicateMutation = useCheckUserIdDuplicate({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        const isDuplicate = res.isDuplicate ?? false;
        setUserIdAvailable(!isDuplicate);
        setUserIdChecked(true);
        setLastCheckedUserId(signupFormData.user_id);
        if (isDuplicate) {
          showToast.error('이미 사용 중인 아이디입니다.');
        } else {
          showToast.success('사용 가능한 아이디입니다.');
        }
      } else {
        throw new Error(res.message || '아이디 중복체크에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('아이디 중복체크 실패', error);
      showToast.error(error.message || '아이디 중복체크에 실패했습니다.');
      setUserIdChecked(false);
      setUserIdAvailable(null);
    },
  });

  // 회원가입 Mutation
  const signupMutation = useSignup({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('회원가입이 완료되었습니다. 승인 대기 중입니다.');
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else {
        throw new Error(res.message || '회원가입에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('회원가입 실패', error, { context: 'SignupPage' });
      showToast.error(error.message || '회원가입에 실패했습니다.');
    },
  });

  // 카운트다운 타이머
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 이메일 인증 코드 발송
  const handleSendCode = () => {
    if (isEmpty(signupFormData.email)) {
      showToast.error('이메일을 입력해주세요.');
      return;
    }
    if (!isValidEmail(signupFormData.email)) {
      showToast.error('올바른 이메일 형식이 아닙니다.');
      return;
    }
    sendCodeMutation.mutate({ email: signupFormData.email });
  };

  // 아이디 중복체크
  const handleCheckUserId = () => {
    if (isEmpty(signupFormData.user_id)) {
      showToast.error('아이디를 입력해주세요.');
      return;
    }
    if (signupFormData.user_id.length < 3) {
      showToast.error('아이디는 최소 3자 이상이어야 합니다.');
      return;
    }
    checkUserIdDuplicateMutation.mutate({ user_id: signupFormData.user_id });
  };

  // 이메일 인증 코드 확인
  const handleVerifyCode = () => {
    if (isEmpty(signupFormData.verification_code)) {
      showToast.error('인증 코드를 입력해주세요.');
      return;
    }
    verifyCodeMutation.mutate({
      email: signupFormData.email,
      code: signupFormData.verification_code,
    });
  };

  // 회원가입 유효성 검사
  const validateSignup = () => {
    const errors: string[] = [];

    if (isEmpty(signupFormData.user_id)) {
      errors.push('아이디를 입력해주세요.');
    } else if (!userIdChecked) {
      errors.push('아이디 중복체크를 완료해주세요.');
    } else if (userIdAvailable === false) {
      errors.push('이미 사용 중인 아이디입니다.');
    }

    if (isEmpty(signupFormData.password)) {
      errors.push('비밀번호를 입력해주세요.');
    } else {
      const passwordValidation = isValidPassword(signupFormData.password);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    if (isEmpty(signupFormData.password_confirm)) {
      errors.push('비밀번호 확인을 입력해주세요.');
    } else if (signupFormData.password !== signupFormData.password_confirm) {
      errors.push('비밀번호가 일치하지 않습니다.');
    }

    if (isEmpty(signupFormData.user_name)) {
      errors.push('닉네임을 입력해주세요.');
    }

    if (isEmpty(signupFormData.email)) {
      errors.push('이메일을 입력해주세요.');
    } else if (!isValidEmail(signupFormData.email)) {
      errors.push('올바른 이메일 형식이 아닙니다.');
    }

    if (!emailVerified) {
      errors.push('이메일 인증을 완료해주세요.');
    }

    if (errors.length > 0) {
      showToast.error(errors[0]);
      return false;
    }

    return true;
  };

  // 유효성 검사 결과 메시지 생성
  const getValidationMessages = () => {
    const messages: string[] = [];

    if (signupFormData.user_id && !userIdChecked) {
      messages.push('아이디 중복체크를 완료해주세요.');
    } else if (userIdChecked && userIdAvailable === false) {
      messages.push('이미 사용 중인 아이디입니다.');
    }

    if (signupFormData.password && passwordErrors.length > 0) {
      messages.push(...passwordErrors);
    }

    if (signupFormData.password_confirm && passwordConfirmMatch === false) {
      messages.push('비밀번호가 일치하지 않습니다.');
    }

    if (signupFormData.email && !isValidEmail(signupFormData.email)) {
      messages.push('올바른 이메일 형식이 아닙니다.');
    }

    if (signupFormData.email && !emailVerified) {
      messages.push('이메일 인증을 완료해주세요.');
    }

    return messages;
  };

  // 회원가입 처리
  const handleSignup = () => {
    if (!validateSignup()) return;

    const params: SignupParams = {
      user_id: signupFormData.user_id,
      password: signupFormData.password,
      user_name: signupFormData.user_name,
      email: signupFormData.email,
    };

    signupMutation.mutate(params);
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
      <Card
        sx={{
          width: '100%',
          maxWidth: 500,
          borderRadius: { xs: 1.5, md: 2.5 },
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5, md: 5 } }}>
          {/* 타이틀 영역 */}
          <Box sx={{ textAlign: 'center', mb: { xs: 3, md: 4 } }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: { xs: 60, md: 80 },
                height: { xs: 60, md: 80 },
                mb: { xs: 2, md: 2.5 },
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': {
                    transform: 'scale(1)',
                    boxShadow: '0 0 0 0 rgba(102, 126, 234, 0.7)',
                  },
                  '50%': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 0 0 20px rgba(102, 126, 234, 0)',
                  },
                },
              }}
            >
              <Typography sx={{ color: 'white', fontSize: { xs: 30, md: 40 } }}>+</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#2d3748', mb: 1, fontSize: { xs: '1.75rem', md: '2.125rem' } }}>
              회원가입
            </Typography>
            <Typography sx={{ color: '#718096', fontSize: { xs: 14, md: 16 } }}>
              새 계정을 만들어 시작하세요
            </Typography>
          </Box>

          {/* 회원가입 폼 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2.5 } }}>
            <Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  label="아이디"
                  placeholder="아이디를 입력하세요 (최소 3자)"
                  value={signupFormData.user_id}
                  onChange={(e) => {
                    setSignupFormData({ ...signupFormData, user_id: e.target.value });
                    setUserIdChecked(false);
                    setUserIdAvailable(null);
                  }}
                  disabled={signupMutation.isPending}
                  sx={{ flex: 1 }}
                  required
                  error={userIdChecked && userIdAvailable === false}
                  InputProps={{
                    endAdornment: userIdChecked && userIdAvailable !== null ? (
                      <InputAdornment position="end">
                        {userIdAvailable ? (
                          <CheckCircleOutlineIcon sx={{ color: 'success.main' }} />
                        ) : (
                          <CancelIcon sx={{ color: 'error.main' }} />
                        )}
                      </InputAdornment>
                    ) : null,
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleCheckUserId}
                  disabled={
                    signupMutation.isPending ||
                    isEmpty(signupFormData.user_id) ||
                    signupFormData.user_id.length < 3 ||
                    checkUserIdDuplicateMutation.isPending
                  }
                  sx={{ 
                    minWidth: 100,
                    height: 56,
                    flexShrink: 0,
                  }}
                >
                  {checkUserIdDuplicateMutation.isPending ? '확인 중...' : '중복체크'}
                </Button>
              </Box>
            </Box>

              <TextField
                label="비밀번호"
                placeholder="비밀번호를 입력하세요 (8자 이상, 대소문자, 숫자, 특수문자 포함)"
                type="password"
                value={signupFormData.password}
                onChange={(e) =>
                  setSignupFormData({ ...signupFormData, password: e.target.value })
                }
                disabled={signupMutation.isPending}
                fullWidth
                required
                error={passwordErrors.length > 0}
                helperText={
                  signupFormData.password && passwordErrors.length > 0
                    ? passwordErrors[0]
                    : '8자 이상, 대문자, 소문자, 숫자, 특수문자 포함'
                }
              />

              <TextField
                label="비밀번호 확인"
                placeholder="비밀번호를 다시 입력하세요"
                type="password"
                value={signupFormData.password_confirm}
                onChange={(e) =>
                  setSignupFormData({ ...signupFormData, password_confirm: e.target.value })
                }
                onKeyUp={(e) => {
                  if (e.key === 'Enter') {
                    handleSignup();
                  }
                }}
                disabled={signupMutation.isPending}
                fullWidth
                required
                error={passwordConfirmMatch === false}
                helperText={
                  passwordConfirmMatch === false
                    ? '비밀번호가 일치하지 않습니다.'
                    : passwordConfirmMatch === true
                    ? '비밀번호가 일치합니다.'
                    : ''
                }
              />

              <TextField
                label="닉네임"
                placeholder="닉네임을 입력하세요"
                value={signupFormData.user_name}
                onChange={(e) =>
                  setSignupFormData({ ...signupFormData, user_name: e.target.value })
                }
                disabled={signupMutation.isPending}
                fullWidth
                required
              />

              {/* 이메일 입력 및 인증 */}
              <Box>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 1.5, sm: 1 }, 
                  alignItems: { xs: 'stretch', sm: 'flex-start' }
                }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flex: 1, width: { xs: '100%', sm: 'auto' }, minWidth: 0 }}>
                    <TextField
                      label="이메일"
                      placeholder="이메일"
                      type="text"
                      value={emailId}
                      onChange={(e) => {
                        setEmailId(e.target.value);
                      }}
                      disabled={signupMutation.isPending || emailVerified}
                      sx={{ flex: 1, minWidth: 0 }}
                      required
                    />
                    <Typography
                      sx={{
                        alignSelf: 'center',
                        color: 'text.secondary',
                        fontSize: { xs: 16, sm: 18 },
                        fontWeight: 500,
                        px: 0.5,
                        pt: { xs: emailVerified ? 2.5 : 2.5, sm: 0 },
                        flexShrink: 0,
                        minWidth: 'fit-content',
                      }}
                    >
                      @
                    </Typography>
                    {isCustomDomain ? (
                      <TextField
                        placeholder="도메인 입력"
                        type="text"
                        value={customDomain}
                        onChange={(e) => {
                          setCustomDomain(e.target.value);
                        }}
                        disabled={signupMutation.isPending || emailVerified}
                        sx={{ flex: 1, minWidth: 0 }}
                        required
                      />
                    ) : (
                      <FormControl 
                        sx={{ 
                          flex: 1, 
                          minWidth: { xs: 0, sm: 120 },
                          '& .MuiInputBase-root': {
                            minWidth: { xs: 'unset', sm: 120 }
                          }
                        }} 
                        disabled={signupMutation.isPending || emailVerified}
                      >
                        <InputLabel>도메인</InputLabel>
                        <Select
                          value={emailDomain}
                          onChange={(e) => {
                            const domain = e.target.value;
                            setEmailDomain(domain);
                            setIsCustomDomain(domain === '직접 입력');
                            if (domain !== '직접 입력') {
                              setCustomDomain('');
                            }
                          }}
                          label="도메인"
                        >
                          {emailDomains.map((domain) => (
                            <MenuItem key={domain} value={domain}>
                              {domain}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                  {!emailVerified ? (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleSendCode}
                      disabled={
                        signupMutation.isPending ||
                        isEmpty(emailId) ||
                        isEmpty(emailDomain) ||
                        (isCustomDomain && isEmpty(customDomain)) ||
                        isEmpty(signupFormData.email) ||
                        !isValidEmail(signupFormData.email) ||
                        sendCodeMutation.isPending ||
                        countdown > 0
                      }
                      sx={{ 
                        minWidth: { xs: '100%', sm: 100 }, 
                        height: { xs: 40, sm: 56 },
                        width: { xs: '100%', sm: 'auto' },
                        flexShrink: 0,
                      }}
                    >
                      {countdown > 0
                        ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`
                        : '인증코드 발송'}
                    </Button>
                  ) : (
                    <Box 
                      sx={{ 
                        minWidth: { xs: '100%', sm: 100 }, 
                        height: { xs: 40, sm: 56 },
                        width: { xs: '100%', sm: 'auto' },
                        flexShrink: 0,
                      }} 
                    />
                  )}
                </Box>
                {emailVerified && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="인증완료"
                      color="success"
                      size="small"
                      sx={{ 
                        height: 28,
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        '& .MuiChip-icon': {
                          fontSize: '1.125rem'
                        }
                      }}
                    />
                  </Box>
                )}
                {codeSent && !emailVerified && (
                  <Box sx={{ mt: 1.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                    <TextField
                      label="인증 코드"
                      placeholder="인증 코드를 입력하세요"
                      value={signupFormData.verification_code}
                      onChange={(e) =>
                        setSignupFormData({ ...signupFormData, verification_code: e.target.value })
                      }
                      disabled={signupMutation.isPending || verifyCodeMutation.isPending}
                      size="small"
                      sx={{ flex: 1 }}
                      onKeyUp={(e) => {
                        if (e.key === 'Enter') {
                          handleVerifyCode();
                        }
                      }}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleVerifyCode}
                      disabled={
                        signupMutation.isPending ||
                        isEmpty(signupFormData.verification_code) ||
                        verifyCodeMutation.isPending
                      }
                      sx={{ 
                        minWidth: { xs: '100%', sm: 80 },
                        width: { xs: '100%', sm: 'auto' }
                      }}
                    >
                      {verifyCodeMutation.isPending ? '확인 중...' : '확인'}
                    </Button>
                  </Box>
                )}
              </Box>

            {/* 유효성 검사 메시지 */}
            {getValidationMessages().length > 0 && (
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  bgcolor: 'error.light',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'error.main',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'error.main' }}>
                  다음 항목을 확인해주세요:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {getValidationMessages().map((message, index) => (
                    <Typography
                      key={index}
                      component="li"
                      variant="body2"
                      sx={{ color: 'error.dark', mb: 0.5 }}
                    >
                      {message}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSignup}
              disabled={signupMutation.isPending || getValidationMessages().length > 0}
              sx={{
                mt: 1,
                height: 48,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              {signupMutation.isPending ? '가입 중...' : '회원가입'}
            </Button>
            </Box>

          {/* 로그인 링크 */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography sx={{ color: '#718096', fontSize: 14 }}>
              이미 계정이 있으신가요?{' '}
              <Button
                variant="text"
                onClick={() => router.push('/login')}
                sx={{
                  textTransform: 'none',
                  color: '#667eea',
                  fontWeight: 600,
                  p: 0,
                  minWidth: 'auto',
                }}
              >
                로그인
              </Button>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

