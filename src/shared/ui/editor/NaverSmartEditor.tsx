'use client';

/**
 * 네이버 SmartEditor2 (npm: smarteditor2)
 * 정적 리소스: postinstall로 public/smarteditor2 에 복사됨
 */

import { useEffect, useImperativeHandle, forwardRef, useRef, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';

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

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.charset = 'utf-8';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`스크립트 로드 실패: ${src}`));
    document.head.appendChild(s);
  });
}

interface NaverSmartEditorProps {
  initialHtml: string;
  minHeight?: number;
}

const NaverSmartEditor = forwardRef<NaverSmartEditorHandle, NaverSmartEditorProps>(function NaverSmartEditor(
  { initialHtml, minHeight = 400 },
  ref,
) {
  const editorsRef = useRef<EditorsRef | null>(null);
  const initialRef = useRef(initialHtml);
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    initialRef.current = initialHtml;
  }, [initialHtml]);

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
      const ta = document.getElementById(NAVER_SMART_EDITOR_TEXTAREA_ID) as HTMLTextAreaElement | null;
      return ta?.value?.trim() ? ta.value : '';
    },
  }));

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setEditorReady(false);
      try {
        await loadScriptOnce('/smarteditor2/js/service/HuskyEZCreator.js');
      } catch {
        return;
      }
      if (cancelled) return;

      type HuskyWin = Window & {
        nhn?: { husky?: { EZCreator?: { createInIFrame: (opts: Record<string, unknown>) => void } } };
      };
      const EZCreator = (window as HuskyWin).nhn?.husky?.EZCreator;
      if (!EZCreator?.createInIFrame) return;

      const ta = document.getElementById(NAVER_SMART_EDITOR_TEXTAREA_ID) as HTMLTextAreaElement | null;
      if (!ta) return;

      ta.value = initialRef.current || '';

      const oEditors: EditorsRef = [] as EditorsRef;
      editorsRef.current = oEditors;

      EZCreator.createInIFrame({
        oAppRef: oEditors,
        elPlaceHolder: NAVER_SMART_EDITOR_TEXTAREA_ID,
        sSkinURI: '/smarteditor2/SmartEditor2Skin.html',
        htParams: {
          bUseToolbar: true,
          bUseVerticalResizer: true,
          bUseModeChanger: true,
          I18N_LOCALE: 'ko_KR',
        },
        fOnAppLoad: () => {
          if (cancelled) return;
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
      editorsRef.current = null;
      const ta = document.getElementById(NAVER_SMART_EDITOR_TEXTAREA_ID);
      if (ta?.nextElementSibling?.tagName === 'IFRAME') {
        ta.nextElementSibling.remove();
      }
    };
  }, []);

  return (
    <Box sx={{ position: 'relative', width: '100%', minHeight }}>
      <textarea
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
      />
      {!editorReady && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: 'background.paper',
            zIndex: 2,
          }}
        >
          <CircularProgress size={32} />
        </Box>
      )}
    </Box>
  );
});

export default NaverSmartEditor;
