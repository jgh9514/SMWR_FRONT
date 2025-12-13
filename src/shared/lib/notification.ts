'use client';

import React from 'react';
import toast from 'react-hot-toast';
import { TOAST_DURATION_MS } from '@/shared/constants';

/**
 * 토스트 알림 유틸리티
 */
export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      duration: TOAST_DURATION_MS,
      position: 'top-center',
    });
  },
  error: (message: string) => {
    toast.error(message, {
      duration: TOAST_DURATION_MS,
      position: 'top-center',
    });
  },
  info: (message: string) => {
    toast(message, {
      duration: TOAST_DURATION_MS,
      position: 'top-center',
      icon: 'ℹ️',
    });
  },
};

/**
 * Confirm 다이얼로그 유틸리티
 * Promise 기반으로 동작하여 async/await와 함께 사용 가능
 * 
 * @param title - 확인 다이얼로그 제목
 * @param content - 확인 다이얼로그 내용 (선택)
 * @returns Promise<boolean> - 확인 시 true, 취소 시 false
 */
export const confirm = (title: string, content?: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const displayMessage = content ? `${title}\n${content}` : title;
    
    toast(
      (t) =>
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '280px' } },
          React.createElement('div', { style: { whiteSpace: 'pre-line', lineHeight: '1.5' } }, displayMessage),
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
            React.createElement(
              'button',
              {
                onClick: () => {
                  toast.dismiss(t.id);
                  resolve(false);
                },
                style: {
                  padding: '8px 16px',
                  border: '1px solid #d0d0d0',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                },
              },
              '취소'
            ),
            React.createElement(
              'button',
              {
                onClick: () => {
                  toast.dismiss(t.id);
                  resolve(true);
                },
                style: {
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  background: '#1976d2',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                },
              },
              '확인'
            )
          )
        ),
      {
        duration: Infinity,
        position: 'top-center',
        style: {
          padding: '16px',
        },
      }
    );
  });
};

