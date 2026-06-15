'use client';

import { TextField, type TextFieldProps } from '@mui/material';

type DeckStatNumberFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'type' | 'inputMode'> & {
  value: number;
  onChange: (value: number) => void;
};

/** 덱 스탯 입력 — 기본 0일 때 type=number는 "0" 뒤 입력 시 "040000"처럼 leading zero가 생김 */
export default function DeckStatNumberField({ value, onChange, ...rest }: DeckStatNumberFieldProps) {
  return (
    <TextField
      {...rest}
      type="text"
      inputMode="numeric"
      value={value === 0 ? '' : String(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        if (digits === '') {
          onChange(0);
          return;
        }
        onChange(Number(digits));
      }}
    />
  );
}
