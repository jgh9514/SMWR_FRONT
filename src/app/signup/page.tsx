'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  Typography,
  InputAdornment,
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
import { useSignup, useLogin, useSendEmailVerification, useVerifyEmailCode, useCheckUserIdDuplicate } from '@/hooks/api';
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
  const [resendCooldown, setResendCooldown] = useState(0); // 재발송 쿨다운(초)

  // 아이디 중복체크 상태
  const [userIdChecked, setUserIdChecked] = useState(false);
  const [userIdAvailable, setUserIdAvailable] = useState<boolean | null>(null);
  const [lastCheckedUserId, setLastCheckedUserId] = useState<string>('');

  // 비밀번호 검증 상태
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [passwordConfirmMatch, setPasswordConfirmMatch] = useState<boolean | null>(null);
  const [showValidationMessages, setShowValidationMessages] = useState(false);

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
        setResendCooldown(10); // 과도한 재발송 방지(10초)
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
        showToast.success('회원가입이 완료되었습니다.');
        // 회원가입 직후 바로 로그인 시도
        loginMutation.mutate({
          user_id: signupFormData.user_id,
          password: signupFormData.password,
          auto_login: 'false',
        });
      } else {
        throw new Error(res.message || '회원가입에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('회원가입 실패', error, { context: 'SignupPage' });
      showToast.error(error.message || '회원가입에 실패했습니다.');
    },
  });

  // 회원가입 후 즉시 로그인
  const loginMutation = useLogin({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS' && res.userInfo) {
        if (typeof window !== 'undefined') {
          // 로그인 상태 저장
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userInfo', JSON.stringify(res.userInfo));
          sessionStorage.setItem('loginJustCompleted', 'true');
        }
        router.push('/');
      } else {
        // 자동 로그인 실패 시 로그인 화면으로
        router.push('/login');
      }
    },
    onError: () => {
      router.push('/login');
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

  // 재발송 쿨다운 타이머
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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

  // 이메일 인증 코드 재발송
  const handleResendCode = () => {
    if (emailVerified) return;
    if (sendCodeMutation.isPending) return;
    if (resendCooldown > 0) return;
    handleSendCode();
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
    // 유효성에 막힐 때만 메시지 박스가 보이도록: 시도 시점부터 노출
    setShowValidationMessages(true);
    if (!validateSignup()) return;

    const params: SignupParams = {
      user_id: signupFormData.user_id,
      password: signupFormData.password,
      email: signupFormData.email,
    };

    signupMutation.mutate(params);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f6f7fb',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        py: { xs: 4, md: 8 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 8px 30px rgba(16, 24, 40, 0.08)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* 타이틀 영역 */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: 'text.primary',
                letterSpacing: '-0.02em',
              }}
            >
              회원가입
            </Typography>
            <Typography sx={{ color: 'text.secondary', mt: 0.75, fontSize: 14, lineHeight: 1.5 }}>
              이메일 인증 후 계정을 만들 수 있어요.
            </Typography>
          </Box>

          {/* 회원가입 폼 */}
          <Box
            component="form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              handleSignup();
            }}
            sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2.5 } }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.5 }}>
              계정 정보
            </Typography>
            <Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  label="아이디"
                  placeholder="아이디를 입력하세요 (최소 3자)"
                  name="signup_user_id"
                  autoComplete="new-username"
                  value={signupFormData.user_id}
                  onChange={(e) => {
                    setSignupFormData({ ...signupFormData, user_id: e.target.value });
                    setUserIdChecked(false);
                    setUserIdAvailable(null);
                  }}
                  disabled={signupMutation.isPending}
                  sx={{ flex: 1 }}
                  size="medium"
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
                    borderRadius: 2,
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
                name="signup_password"
                autoComplete="new-password"
                value={signupFormData.password}
                onChange={(e) =>
                  setSignupFormData({ ...signupFormData, password: e.target.value })
                }
                disabled={signupMutation.isPending}
                fullWidth
                required
                size="medium"
                error={passwordErrors.length > 0}
                helperText={
                  signupFormData.password && passwordErrors.length > 0
                    ? passwordErrors[0]
                    : '8자 이상, 대문자, 소문자, 숫자, 특수문자 포함'
                }
              />
              {/* 비밀번호 규칙 체크리스트 (실시간) */}
              <Box
                sx={{
                  mt: 1,
                  px: 1,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 0.75,
                }}
              >
                {(() => {
                  const pw = signupFormData.password || '';
                  const rules = [
                    { key: 'upper', label: '영어 대문자', ok: /[A-Z]/.test(pw) },
                    { key: 'lower', label: '영어 소문자', ok: /[a-z]/.test(pw) },
                    { key: 'number', label: '숫자', ok: /[0-9]/.test(pw) },
                    {
                      key: 'special',
                      label: '특수문자',
                      ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
                    },
                    { key: 'len', label: '8자 이상', ok: pw.length >= 8 },
                  ];

                  return rules.map((r) => (
                    <Box
                      key={r.key}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        minWidth: 0,
                      }}
                    >
                      {r.ok ? (
                        <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
                      ) : (
                        <CancelIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: r.ok ? 'success.main' : 'text.secondary',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {r.label}
                      </Typography>
                    </Box>
                  ));
                })()}
              </Box>

              <TextField
                label="비밀번호 확인"
                placeholder="비밀번호를 다시 입력하세요"
                type="password"
                name="signup_password_confirm"
                autoComplete="new-password"
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
                size="medium"
                error={passwordConfirmMatch === false}
                helperText={
                  passwordConfirmMatch === false
                    ? '비밀번호가 일치하지 않습니다.'
                    : passwordConfirmMatch === true
                    ? '비밀번호가 일치합니다.'
                    : ''
                }
              />

              {/* 이메일 입력 및 인증 */}
              <Box>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                  이메일 인증
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 24px minmax(0, 1fr) auto' },
                    columnGap: { xs: 0, sm: 1 },
                    rowGap: { xs: 1.25, sm: 0 },
                    alignItems: { xs: 'stretch', sm: 'center' },
                  }}
                >
                  <TextField
                    label="이메일"
                    placeholder="이메일"
                    type="text"
                    value={emailId}
                    onChange={(e) => {
                      setEmailId(e.target.value);
                    }}
                    disabled={signupMutation.isPending || emailVerified}
                    sx={{ minWidth: 0 }}
                    size="medium"
                    required
                  />

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.secondary',
                      fontSize: 18,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    @
                  </Box>

                  {isCustomDomain ? (
                    <TextField
                      label="도메인"
                      placeholder="도메인 입력"
                      type="text"
                      value={customDomain}
                      onChange={(e) => {
                        setCustomDomain(e.target.value);
                      }}
                      disabled={signupMutation.isPending || emailVerified}
                      sx={{ minWidth: 0 }}
                      size="medium"
                      required
                    />
                  ) : (
                    <FormControl
                      size="medium"
                      sx={{ minWidth: 0 }}
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

                  {!emailVerified ? (
                    <Button
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
                        (codeSent && countdown > 0) // 최초 발송 후에는 아래 '재발송' 버튼 사용
                      }
                      sx={{
                        minWidth: { xs: '100%', sm: 110 },
                        width: { xs: '100%', sm: 'auto' },
                        height: 56,
                        flexShrink: 0,
                        borderRadius: 2,
                        mt: { xs: 0.5, sm: 0 },
                      }}
                    >
                      {countdown > 0 ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}` : '인증코드 발송'}
                    </Button>
                  ) : (
                    <Box sx={{ height: 56, mt: { xs: 0.5, sm: 0 } }} />
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
                  <Box
                    sx={{
                      mt: 1.5,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto auto' },
                      gap: 1,
                      alignItems: { xs: 'stretch', sm: 'center' },
                    }}
                  >
                    <TextField
                      label="인증 코드"
                      placeholder="인증 코드를 입력하세요"
                      value={signupFormData.verification_code}
                      onChange={(e) =>
                        setSignupFormData({ ...signupFormData, verification_code: e.target.value })
                      }
                      disabled={signupMutation.isPending || verifyCodeMutation.isPending}
                      size="medium"
                      sx={{ minWidth: 0 }}
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
                        minWidth: { xs: '100%', sm: 88 },
                        width: { xs: '100%', sm: 'auto' },
                        height: 56,
                        borderRadius: 2,
                      }}
                    >
                      {verifyCodeMutation.isPending ? '확인 중...' : '확인'}
                    </Button>
                    <Button
                      variant="text"
                      onClick={handleResendCode}
                      disabled={
                        signupMutation.isPending ||
                        isEmpty(signupFormData.email) ||
                        !isValidEmail(signupFormData.email) ||
                        sendCodeMutation.isPending ||
                        resendCooldown > 0
                      }
                      sx={{ 
                        minWidth: { xs: '100%', sm: 110 },
                        width: { xs: '100%', sm: 'auto' },
                        whiteSpace: 'nowrap',
                        height: 56,
                        borderRadius: 2,
                      }}
                    >
                      {sendCodeMutation.isPending
                        ? '재발송...'
                        : resendCooldown > 0
                        ? `재발송 (${resendCooldown}s)`
                        : '재발송'}
                    </Button>
                  </Box>
                )}
              </Box>

            {/* 유효성 검사 메시지 */}
            {showValidationMessages && getValidationMessages().length > 0 && (
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'error.main',
                  boxShadow: 2,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: 'error.main' }}>
                  다음 항목을 확인해주세요:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {getValidationMessages().map((message, index) => (
                    <Typography
                      key={index}
                      component="li"
                      variant="body2"
                      sx={{ color: 'text.primary', mb: 0.5, lineHeight: 1.4 }}
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
              disabled={signupMutation.isPending}
              sx={{
                mt: 1,
                height: 52,
                fontWeight: 800,
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              {signupMutation.isPending ? '가입 중...' : '회원가입'}
            </Button>
            </Box>

          {/* 로그인 링크 */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
              이미 계정이 있으신가요?{' '}
              <Button
                variant="text"
                onClick={() => router.push('/login')}
                sx={{
                  textTransform: 'none',
                  color: 'primary.main',
                  fontWeight: 800,
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

