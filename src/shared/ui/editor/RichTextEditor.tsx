/**
 * 리치 텍스트 에디터 컴포넌트 (Tiptap 기반)
 * XSS 방지를 위한 sanitization 포함
 */

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { useMemo, useEffect, useSyncExternalStore } from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { sanitizeHtml } from './RichTextDisplay';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  sx?: SxProps<Theme>;
  minHeight?: number;
}

/**
 * 에디터에서 나온 HTML을 sanitize하여 반환
 */
const sanitizeEditorContent = (html: string): string => {
  // 빈 내용 처리
  if (!html || html.trim() === '' || html === '<p></p>') {
    return '';
  }

  return sanitizeHtml(html);
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
  readOnly = false,
  sx,
  minHeight = 300,
}: RichTextEditorProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // 초기값도 sanitize
  const sanitizedValue = useMemo(() => {
    if (!value) return '';
    return sanitizeHtml(value);
  }, [value]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      TextStyle,
      Color,
    ],
    content: sanitizedValue,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const sanitized = sanitizeEditorContent(html);
      onChange(sanitized);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
        style: `min-height: ${minHeight}px;`,
      },
    },
  });

  // 외부에서 value가 변경되면 에디터 내용 업데이트
  useEffect(() => {
    if (editor && sanitizedValue !== editor.getHTML()) {
      editor.commands.setContent(sanitizedValue);
    }
  }, [sanitizedValue, editor]);

  // 에디터 스타일
  const editorSx = useMemo(
    () => ({
      bgcolor: 'background.paper',
      color: 'text.primary',
      '& .ProseMirror': {
        fontSize: '16px',
        fontFamily: 'inherit',
        minHeight: `${minHeight}px`,
        padding: '12px',
        outline: 'none',
        backgroundColor: 'inherit',
        color: 'inherit',
        borderBottom: '1px solid',
        borderLeft: '1px solid',
        borderRight: '1px solid',
        borderColor: 'divider',
        borderRadius: readOnly ? '4px' : '0 0 4px 4px',
        '&.is-editor-empty:first-child::before': {
          content: `"${placeholder}"`,
          float: 'left',
          color: 'text.secondary',
          pointerEvents: 'none',
          height: 0,
        },
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
        ...(readOnly && {
          border: 'none',
          padding: 0,
        }),
      },
      '& .tiptap-toolbar': {
        borderTop: '1px solid',
        borderLeft: '1px solid',
        borderRight: '1px solid',
        borderColor: 'divider',
        borderRadius: '4px 4px 0 0',
        padding: '8px',
        display: 'flex',
        gap: '4px',
        flexWrap: 'wrap',
        backgroundColor: 'inherit',
        ...(readOnly && {
          display: 'none',
        }),
      },
      ...sx,
    }),
    [minHeight, readOnly, sx, placeholder]
  );

  // 서버 사이드에서는 placeholder만 렌더링 (Hydration 오류 방지)
  if (!isClient || !editor) {
    return (
      <Box sx={editorSx}>
        {!readOnly && <div className="tiptap-toolbar" />}
        <Box
          sx={{
            minHeight: `${minHeight}px`,
            padding: '12px',
            color: 'text.secondary',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: readOnly ? '4px' : '0 0 4px 4px',
          }}
        >
          {placeholder}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={editorSx}>
      {!readOnly && (
        <div className="tiptap-toolbar">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: editor.isActive('heading', { level: 1 }) ? 'rgba(128,128,128,0.3)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: editor.isActive('heading', { level: 2 }) ? 'rgba(128,128,128,0.3)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: editor.isActive('heading', { level: 3 }) ? 'rgba(128,128,128,0.3)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: editor.isActive('bold') ? 'rgba(128,128,128,0.3)' : 'transparent',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: editor.isActive('italic') ? 'rgba(128,128,128,0.3)' : 'transparent',
              cursor: 'pointer',
              fontStyle: 'italic',
            }}
          >
            I
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: editor.isActive('underline') ? 'rgba(128,128,128,0.3)' : 'transparent',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            U
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: editor.isActive('strike') ? 'rgba(128,128,128,0.3)' : 'transparent',
              cursor: 'pointer',
              textDecoration: 'line-through',
            }}
          >
            S
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: editor.isActive('bulletList') ? 'rgba(128,128,128,0.3)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            •
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: editor.isActive('orderedList') ? 'rgba(128,128,128,0.3)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            1.
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: editor.isActive({ textAlign: 'left' }) ? 'rgba(128,128,128,0.3)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: editor.isActive({ textAlign: 'center' }) ? 'rgba(128,128,128,0.3)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            ↔
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: editor.isActive({ textAlign: 'right' }) ? 'rgba(128,128,128,0.3)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            →
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                const url = window.prompt('링크 URL을 입력하세요:');
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }
            }}
            className={editor.isActive('link') ? 'is-active' : ''}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: editor.isActive('link') ? 'rgba(128,128,128,0.3)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            🔗
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                const url = window.prompt('이미지 URL을 입력하세요:');
                if (url) {
                  editor.chain().focus().setImage({ src: url }).run();
                }
              }
            }}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            🖼️
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            🧹
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </Box>
  );
}
