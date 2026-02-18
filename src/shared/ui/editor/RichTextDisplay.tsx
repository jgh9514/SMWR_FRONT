'use client';

/**
 * 리치 텍스트(HTML) 표시 전용 컴포넌트
 * - Tiptap(에디터) 의존성을 분리해서 "게시판 목록/상세" 초기 번들 무게를 줄임
 */

import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Box, type SxProps, type Theme } from '@mui/material';

/**
 * HTML 콘텐츠를 sanitize하여 XSS 공격 방지
 */
export const sanitizeHtml = (html: string): string => {
  if (typeof window === 'undefined') {
    // 클라이언트 컴포넌트이지만, 안전하게 SSR 경로도 방어
    return html;
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'h1',
      'h2',
      'h3',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'span',
      'div',
      'blockquote',
    ],
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'src',
      'alt',
      'style',
      'class',
      'color',
      'background-color',
      'text-align',
    ],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ['target', 'rel'],
    ADD_TAGS: ['rel'],
  });
};

/**
 * 에디터로 작성된 HTML 콘텐츠를 안전하게 렌더링하는 컴포넌트
 */
export function RichTextDisplay({ content, sx }: { content: string; sx?: SxProps<Theme> }) {
  const sanitizedContent = useMemo(() => {
    if (!content) return '';
    return sanitizeHtml(content);
  }, [content]);

  return (
    <Box
      sx={{
        '& p': {
          marginBottom: '0.5em',
          '&:last-child': {
            marginBottom: 0,
          },
        },
        '& img': {
          maxWidth: '100%',
          height: 'auto',
        },
        '& a': {
          color: '#1976d2',
          textDecoration: 'underline',
          '&:hover': {
            textDecoration: 'none',
          },
        },
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}


