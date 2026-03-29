'use client';

/**
 * 네이버 SmartEditor2 (npm: smarteditor2)
 * 정적 리소스: `yarn install` 시 postinstall로 public/smarteditor2 에 복사됨
 */

import { useEffect, useImperativeHandle, forwardRef, useRef, useState, useCallback } from 'react';
import { Alert, Box, Button, CircularProgress, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { logger } from '@/shared/lib/logger';

export const NAVER_SMART_EDITOR_TEXTAREA_ID = 'notice-se2-ir';

export type NaverSmartEditorHandle = {
  getHtml: () => string;
};

type Se2Editor = {
  exec: (cmd: string, args?: unknown[]) => void;
  getIR: () => string;
};

type EditorsRef = unknown[] & {
  getById?: Record<string, Se2Editor>;
};

function isHuskyEzCreatorReady(): boolean {
  const w = window as Window & {
    nhn?: { husky?: { EZCreator?: { createInIFrame?: unknown } } };
  };
  return typeof w.nhn?.husky?.EZCreator?.createInIFrame === 'function';
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (isHuskyEzCreatorReady()) {
        resolve();
        return;
      }
      existing.remove();
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.charset = 'utf-8';
    s.onload = () => {
      if (isHuskyEzCreatorReady()) {
        resolve();
        return;
      }
      s.remove();
      reject(new Error(`스크립트는 로드됐지만 HuskyEZCreator를 찾을 수 없습니다: ${src}`));
    };
    s.onerror = () => reject(new Error(`스크립트 로드 실패: ${src}`));
    document.head.appendChild(s);
  });
}

interface NaverSmartEditorProps {
  initialHtml: string;
  minHeight?: number;
  /** 에디터 준비 완료 여부(저장 버튼 비활성 등에 사용) */
  onReadyChange?: (ready: boolean) => void;
}

const NAVER_SE2_SCRIPT = '/smarteditor2/js/service/HuskyEZCreator.js';
const NAVER_SE2_SKIN = '/smarteditor2/SmartEditor2Skin.html';

const NaverSmartEditor = forwardRef<NaverSmartEditorHandle, NaverSmartEditorProps>(function NaverSmartEditor(
  { initialHtml, minHeight = 400, onReadyChange },
  ref,
) {
  const editorsRef = useRef<EditorsRef | null>(null);
  const initialRef = useRef(initialHtml);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const effectGenerationRef = useRef(0);
  const [editorReady, setEditorReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const handleRetry = useCallback(() => {
    setLoadError(null);
    setEditorReady(false);
    setRetryNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    initialRef.current = initialHtml;
  }, [initialHtml]);

  useEffect(() => {
    onReadyChange?.(editorReady);
  }, [editorReady, onReadyChange]);

  useImperativeHandle(ref, () => ({
    getHtml: () => {
      const list = editorsRef.current;
      const ed = list?.getById?.[NAVER_SMART_EDITOR_TEXTAREA_ID];
      if (ed) {
        try {
          ed.exec('UPDATE_CONTENTS_FIELD', []);
        } catch {
          /* noop */
        }
        try {
          return ed.getIR() || '';
        } catch {
          /* noop */
        }
      }
      const ta = textareaRef.current;
      return ta?.value?.trim() ? ta.value : '';
    },
  }));

  useEffect(() => {
    const effectId = ++effectGenerationRef.current;
    let cancelled = false;
    let loadTimeoutId: ReturnType<typeof setTimeout> | undefined;

    async function init() {
      setEditorReady(false);
      setLoadError(null);

      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const scriptUrl = `${base}${NAVER_SE2_SCRIPT}`;

      try {
        const head = await fetch(scriptUrl, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
        if (head && !head.ok && head.status !== 405) {
          setLoadError(
            `에디터 정적 파일을 찾을 수 없습니다 (HTTP ${head.status}). SMWR_FRONT에서 yarn install 후 public/smarteditor2가 생겼는지 확인하세요.`,
          );
          return;
        }
      } catch {
        /* HEAD 미지원 시 무시하고 스크립트 로드로 판단 */
      }
      if (cancelled || effectId !== effectGenerationRef.current) return;

      try {
        await loadScriptOnce(NAVER_SE2_SCRIPT);
      } catch (e) {
        logger.error('[NaverSmartEditor] HuskyEZCreator 로드 실패', e);
        setLoadError(
          '네이버 스마트에디터 스크립트를 불러오지 못했습니다. 프로젝트 루트에서 yarn install( postinstall으로 public/smarteditor2 복사 )을 실행했는지 확인하세요.',
        );
        return;
      }
      if (cancelled || effectId !== effectGenerationRef.current) return;

      type HuskyWin = Window & {
        nhn?: { husky?: { EZCreator?: { createInIFrame: (opts: Record<string, unknown>) => void } } };
      };
      const EZCreator = (window as HuskyWin).nhn?.husky?.EZCreator;
      if (!EZCreator?.createInIFrame) {
        setLoadError('에디터 초기화 모듈(nhn.husky.EZCreator)을 찾을 수 없습니다.');
        return;
      }

      const ta = textareaRef.current;
      if (!ta) {
        setLoadError('에디터 입력 영역을 찾을 수 없습니다.');
        return;
      }

      ta.value = initialRef.current || '';

      const oEditors: EditorsRef = [] as EditorsRef;
      editorsRef.current = oEditors;

      loadTimeoutId = setTimeout(() => {
        if (cancelled || effectId !== effectGenerationRef.current) return;
        setLoadError((prev) => prev ?? '에디터 로딩이 너무 오래 걸립니다. 브라우저 콘솔 오류와 public/smarteditor2 경로를 확인하세요.');
      }, 25000);

      EZCreator.createInIFrame({
        oAppRef: oEditors,
        elPlaceHolder: ta,
        sSkinURI: NAVER_SE2_SKIN,
        htParams: {
          bUseToolbar: true,
          bUseVerticalResizer: true,
          bUseModeChanger: true,
          I18N_LOCALE: 'ko_KR',
        },
        fOnAppLoad: () => {
          if (cancelled || effectId !== effectGenerationRef.current) return;
          if (loadTimeoutId) clearTimeout(loadTimeoutId);
          setEditorReady(true);
          const html = initialRef.current;
          if (!html?.trim()) return;
          const ed = oEditors.getById?.[NAVER_SMART_EDITOR_TEXTAREA_ID];
          if (ed) {
            try {
              ed.exec('SET_IR', [html]);
            } catch {
              try {
                ed.exec('PASTE_HTML', [html]);
              } catch {
                /* noop */
              }
            }
          }
        },
        fCreator: 'createSEditor2',
      });
    }

    void init();

    return () => {
      cancelled = true;
      if (loadTimeoutId) clearTimeout(loadTimeoutId);
      editorsRef.current = null;
      const ta = textareaRef.current;
      if (ta?.nextElementSibling?.tagName === 'IFRAME') {
        ta.nextElementSibling.remove();
      }
    };
  }, [retryNonce]);

  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',
        width: '100%',
        minHeight,
        overflow: 'hidden',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
      aria-busy={!editorReady && !loadError}
    >
      {loadError && (
        <Alert
          severity="error"
          sx={{ m: 2, alignItems: 'flex-start' }}
          action={
            <Button color="inherit" size="small" onClick={handleRetry} startIcon={<RefreshRoundedIcon />}>
              다시 시도
            </Button>
          }
        >
          <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
            {loadError}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.92, lineHeight: 1.5 }}>
            로컬에서는 <code>yarn install</code>로 <code>public/smarteditor2</code>가 생성되는지 확인하세요. 배포 환경에서는 정적 파일이 포함됐는지 Dockerfile을 확인하세요.
          </Typography>
        </Alert>
      )}
      <textarea
        ref={textareaRef}
        id={NAVER_SMART_EDITOR_TEXTAREA_ID}
        name={NAVER_SMART_EDITOR_TEXTAREA_ID}
        title="공지 본문"
        style={{
          display: 'none',
          width: '100%',
          minHeight,
          minWidth: '100%',
        }}
        defaultValue=""
        aria-hidden
      />
      {!editorReady && !loadError && (
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={2}
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            px: 3,
            py: 4,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <LinearProgress
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              borderRadius: 0,
            }}
          />
          <ArticleOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.85 }} aria-hidden />
          <Box sx={{ textAlign: 'center', maxWidth: 360 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              에디터를 불러오는 중
            </Typography>
            <Typography variant="body2" color="text.secondary">
              처음 로드할 때만 잠시 걸릴 수 있습니다. 잠시만 기다려 주세요.
            </Typography>
          </Box>
          <CircularProgress size={36} thickness={4} aria-label="에디터 로딩 중" />
        </Stack>
      )}
    </Paper>
  );
});

export default NaverSmartEditor;
