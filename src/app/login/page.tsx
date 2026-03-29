'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useLogin } from '@/hooks/api';
import { isEmpty } from '@/shared/utils/util';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import { containsSqlInjection } from '@/shared/utils/validation';
import { clearForceLoggedOut, getAuthTokenFromCookie } from '@/shared/utils/auth';
import { COOKIE_CHECK_RETRY_DELAY_MS, COOKIE_CHECK_MAX_RETRIES } from '@/shared/constants/validation';
import LoginIcon from '@mui/icons-material/Login';
import FindAccountPopup from '@/components/popup/FindAccountPopup';
import type { LoginParams } from '@/types';

/** 로그인 성공·이미 로그인된 상태로 진입 시 이동 경로 (returnUrl 미사용) */
const MAIN_PATH = '/';

export default function LoginPage() {
  const router = useRouter();
  const [frmDatas, setFrmDatas] = useState({
    user_id: '',
    user_pw: '',
  });
  const [rememberLogin, setRememberLogin] = useState(false);
  const [findAccountPopupOpen, setFindAccountPopupOpen] = useState(false);

  const validation = () => {
    if (isEmpty(frmDatas.user_id)) {
      showToast.error('아이디를 입력해주세요.');
      return false;
    }
    if (isEmpty(frmDatas.user_pw)) {
      showToast.error('비밀번호를 입력해주세요.');
      return false;
    }

    // SQL Injection 검사
    if (containsSqlInjection(frmDatas.user_id) || containsSqlInjection(frmDatas.user_pw)) {
      showToast.error('입력값에 허용되지 않은 문자가 포함되어 있습니다.');
      return false;
    }

    // Rate Limiting은 백엔드에서 처리 (429 에러)
    return true;
  };


  // 페이지 로드 시 저장된 아이디 및 자동 로그인 설정 불러오기
  const loadSavedLoginInfo = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // 저장된 아이디 불러오기
    const savedUserId = localStorage.getItem('saved_user_id');
    if (savedUserId) {
      setFrmDatas({
        user_id: savedUserId,
        user_pw: '',
      });
    }

    // 저장된 자동 로그인 설정 불러오기 (설정 페이지와 동기화)
    const savedRememberLogin = localStorage.getItem('remember_login');
    if (savedRememberLogin === 'true') {
      setRememberLogin(true);
    }

    // 쿠키에 토큰이 있으면 홈으로 리다이렉트 (API 호출 없이 쿠키만 확인)
    // 단, 방금 로그인한 경우는 제외 (로그인 성공 후 리다이렉트 로직이 처리함)
    const loginJustCompleted = sessionStorage.getItem('loginJustCompleted');
    if (loginJustCompleted === 'true') {
      sessionStorage.removeItem('loginJustCompleted');
      return; // 방금 로그인한 경우는 리다이렉트하지 않음
    }
    
    const token = getAuthTokenFromCookie();
    if (token) {
      router.push(MAIN_PATH);
    }
  }, [router]);

  // 아이디 및 자동 로그인 설정 저장 (설정 페이지와 동기화)
  // 자동 로그인은 WAS 쿠키 기반으로 처리
  const saveLoginInfo = async () => {
    try {
      if (typeof window !== 'undefined') {
        if (rememberLogin) {
          // 자동 로그인 활성화: 아이디와 설정 저장
          localStorage.setItem('saved_user_id', frmDatas.user_id);
          localStorage.setItem('remember_login', 'true');
        } else {
          // 자동 로그인 비활성화: 아이디와 설정 삭제
          localStorage.removeItem('saved_user_id');
          localStorage.removeItem('remember_login');
        }
      }
    } catch (error) {
      logger.error('로그인 정보 저장 실패', error, { context: 'LoginPage' });
    }
  };

  // 로그인 Mutation
  const loginMutation = useLogin({
    onSuccess: async (res) => {
      if (res && res.result === 'SUCCESS' && res.userInfo) {
        if (typeof window !== 'undefined') {
          // 이전에 로그아웃 강제 플래그가 남아있으면 제거
          clearForceLoggedOut();
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userInfo', JSON.stringify(res.userInfo));
          // 로그인 성공 플래그 설정 (쿠키 확인 우회용)
          sessionStorage.setItem('loginJustCompleted', 'true');
        }

        await saveLoginInfo();
        // 로그인 성공 시 토스트 메시지 제거 (조용히 처리)

        // 쿠키가 설정될 때까지 대기
        let retryCount = 0;
        const checkCookie = () => {
          const cookies = document.cookie.split(';');
          const tokenCookie = cookies.find((c) => {
            const trimmed = c.trim();
            return trimmed.startsWith('SMW-Authorization=') || trimmed.startsWith('SMW_AUTHORIZATION=');
          });
          
          if (tokenCookie || retryCount >= COOKIE_CHECK_MAX_RETRIES) {
            setTimeout(() => {
              router.push(MAIN_PATH);
            }, COOKIE_CHECK_RETRY_DELAY_MS);
          } else {
            retryCount++;
            setTimeout(checkCookie, COOKIE_CHECK_RETRY_DELAY_MS);
          }
        };
        
        checkCookie();
      } else {
        let errorMessage = '로그인에 실패했습니다.';
        if (res && res.result === 'NOUSRINFO') {
          errorMessage = '사용자 정보를 찾을 수 없습니다.';
        } else if (res && res.result === 'LOCKUSRINFO') {
          errorMessage = '계정이 잠겨있습니다.';
        } else if (res && res.result === 'PWDNOTMATCHED') {
          errorMessage = '비밀번호가 일치하지 않습니다.';
        }
        throw new Error(errorMessage);
      }
    },
    onError: (error: unknown) => {
      logger.error('로그인 실패', error, { context: 'LoginPage' });

      showToast.error(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    },
  });

  const login = async () => {
    if (!validation()) return;

    const loginParams: LoginParams = {
      user_id: frmDatas.user_id,
      password: frmDatas.user_pw,
      auto_login: rememberLogin ? 'true' : 'false',
    };

    loginMutation.mutate(loginParams);
  };

  useEffect(() => {
    loadSavedLoginInfo();
  }, [loadSavedLoginInfo]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2.5,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 450,
          borderRadius: 2.5,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        <CardContent sx={{ p: 5 }}>
          {/* 로고 또는 타이틀 영역 */}
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 80,
                mb: 2.5,
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
              <LoginIcon sx={{ color: 'white', fontSize: 40 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#2d3748', mb: 1 }}>
              환영합니다
            </Typography>
            <Typography sx={{ color: '#718096', fontSize: 16 }}>
              계정에 로그인하세요
            </Typography>
          </Box>

          {/* 로그인 폼 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="아이디"
              placeholder="아이디를 입력하세요"
              value={frmDatas.user_id}
              onChange={(e) => setFrmDatas({ ...frmDatas, user_id: e.target.value })}
              disabled={loginMutation.isPending}
              fullWidth
            />

            <TextField
              label="비밀번호"
              placeholder="비밀번호를 입력하세요"
              type="password"
              value={frmDatas.user_pw}
              onChange={(e) => setFrmDatas({ ...frmDatas, user_pw: e.target.value })}
              onKeyUp={(e) => {
                if (e.key === 'Enter') {
                  login();
                }
              }}
              disabled={loginMutation.isPending}
              fullWidth
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberLogin}
                    onChange={(e) => setRememberLogin(e.target.checked)}
                    disabled={loginMutation.isPending}
                  />
                }
                label="자동 로그인"
              />
              <Button
                variant="text"
                onClick={() => setFindAccountPopupOpen(true)}
                disabled={loginMutation.isPending}
                sx={{
                  textTransform: 'none',
                  color: '#718096',
                  fontSize: 14,
                  p: 0,
                  minWidth: 'auto',
                  '&:hover': {
                    color: '#667eea',
                  },
                }}
              >
                아이디/비밀번호 찾기
              </Button>
            </Box>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={login}
              disabled={loginMutation.isPending}
              sx={{
                mt: 1,
                height: 48,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              {loginMutation.isPending ? '로그인 중...' : '로그인'}
            </Button>
          </Box>

          {/* 회원가입 링크 */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography sx={{ color: '#718096', fontSize: 14 }}>
              계정이 없으신가요?{' '}
              <Button
                variant="text"
                onClick={() => router.push('/signup')}
                sx={{
                  textTransform: 'none',
                  color: '#667eea',
                  fontWeight: 600,
                  p: 0,
                  minWidth: 'auto',
                }}
              >
                회원가입
              </Button>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* 아이디/비밀번호 찾기 팝업 */}
      <FindAccountPopup open={findAccountPopupOpen} onClose={() => setFindAccountPopupOpen(false)} />
    </Box>
  );
}
