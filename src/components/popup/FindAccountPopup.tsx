'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useFindUserId, useFindPassword } from '@/features/auth/hooks/useAuth';
import { showToast } from '@/shared/lib/notification';
import { isEmpty } from '@/shared/utils/util';
import { validateAndSanitizeInput } from '@/shared/utils/validation';

interface FindAccountPopupProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`find-account-tabpanel-${index}`}
      aria-labelledby={`find-account-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function FindAccountPopup({ open, onClose }: FindAccountPopupProps) {
  const [tabValue, setTabValue] = useState(0);
  const [findUserIdEmail, setFindUserIdEmail] = useState('');
  const [findPasswordUserId, setFindPasswordUserId] = useState('');
  const [findPasswordEmail, setFindPasswordEmail] = useState('');
  const [foundUserId, setFoundUserId] = useState<string | null>(null);

  const findUserIdMutation = useFindUserId({
    onSuccess: (res) => {
      if (res.result === 'SUCCESS' && res.user_id) {
        setFoundUserId(res.user_id);
        showToast.success('아이디를 찾았습니다.');
      } else {
        showToast.error(res.message || '아이디를 찾을 수 없습니다.');
      }
    },
    onError: (error: Error) => {
      showToast.error(error.message || '아이디 찾기에 실패했습니다.');
    },
  });

  const findPasswordMutation = useFindPassword({
    onSuccess: (res) => {
      if (res.result === 'SUCCESS') {
        showToast.success(res.message || '비밀번호 재설정 링크가 이메일로 발송되었습니다.');
        handleClose();
      } else {
        showToast.error(res.message || '비밀번호 찾기에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      showToast.error(error.message || '비밀번호 찾기에 실패했습니다.');
    },
  });

  const handleClose = () => {
    setTabValue(0);
    setFindUserIdEmail('');
    setFindPasswordUserId('');
    setFindPasswordEmail('');
    setFoundUserId(null);
    onClose();
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setFoundUserId(null);
  };

  const handleFindUserId = () => {
    if (isEmpty(findUserIdEmail)) {
      showToast.error('이메일을 입력해주세요.');
      return;
    }
    try {
      const sanitizedEmail = validateAndSanitizeInput(findUserIdEmail);
      findUserIdMutation.mutate({ email: sanitizedEmail });
    } catch {
      showToast.error('입력값에 허용되지 않은 문자가 포함되어 있습니다.');
    }
  };

  const handleFindPassword = () => {
    if (isEmpty(findPasswordUserId)) {
      showToast.error('아이디를 입력해주세요.');
      return;
    }
    if (isEmpty(findPasswordEmail)) {
      showToast.error('이메일을 입력해주세요.');
      return;
    }
    try {
      const sanitizedUserId = validateAndSanitizeInput(findPasswordUserId);
      const sanitizedEmail = validateAndSanitizeInput(findPasswordEmail);
      findPasswordMutation.mutate({ user_id: sanitizedUserId, email: sanitizedEmail });
    } catch {
      showToast.error('입력값에 허용되지 않은 문자가 포함되어 있습니다.');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>아이디/비밀번호 찾기</span>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="아이디/비밀번호 찾기 탭">
            <Tab label="아이디 찾기" />
            <Tab label="비밀번호 찾기" />
          </Tabs>
        </Box>

        {/* 아이디 찾기 탭 */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" sx={{ color: '#718096', mb: 1 }}>
              가입 시 등록한 이메일 주소를 입력해주세요.
            </Typography>

            {foundUserId ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                  아이디를 찾았습니다
                </Typography>
                <Typography variant="body2">아이디: {foundUserId}</Typography>
              </Alert>
            ) : (
              <>
                <TextField
                  label="이메일"
                  placeholder="이메일을 입력하세요"
                  type="email"
                  value={findUserIdEmail}
                  onChange={(e) => setFindUserIdEmail(e.target.value)}
                  disabled={findUserIdMutation.isPending}
                  fullWidth
                  onKeyUp={(e) => {
                    if (e.key === 'Enter') {
                      handleFindUserId();
                    }
                  }}
                />

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleFindUserId}
                  disabled={findUserIdMutation.isPending}
                  sx={{
                    mt: 1,
                    height: 48,
                    fontWeight: 600,
                    textTransform: 'none',
                  }}
                >
                  {findUserIdMutation.isPending ? '조회 중...' : '아이디 찾기'}
                </Button>
              </>
            )}
          </Box>
        </TabPanel>

        {/* 비밀번호 찾기 탭 */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" sx={{ color: '#718096', mb: 1 }}>
              아이디와 가입 시 등록한 이메일 주소를 입력해주세요.
              <br />
              비밀번호 재설정 링크가 이메일로 발송됩니다.
            </Typography>

            <TextField
              label="아이디"
              placeholder="아이디를 입력하세요"
              value={findPasswordUserId}
              onChange={(e) => setFindPasswordUserId(e.target.value)}
              disabled={findPasswordMutation.isPending}
              fullWidth
            />

            <TextField
              label="이메일"
              placeholder="이메일을 입력하세요"
              type="email"
              value={findPasswordEmail}
              onChange={(e) => setFindPasswordEmail(e.target.value)}
              disabled={findPasswordMutation.isPending}
              fullWidth
              onKeyUp={(e) => {
                if (e.key === 'Enter') {
                  handleFindPassword();
                }
              }}
            />

            <Button
              variant="contained"
              fullWidth
              onClick={handleFindPassword}
              disabled={findPasswordMutation.isPending}
              sx={{
                mt: 1,
                height: 48,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              {findPasswordMutation.isPending ? '처리 중...' : '비밀번호 찾기'}
            </Button>
          </Box>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
}

