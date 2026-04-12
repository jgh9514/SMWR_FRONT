'use client';

import { RtaSeasonsProvider } from '@/features/rta/context/RtaSeasonsContext';

export default function RtaSeasonsLayoutClient({ children }: { children: React.ReactNode }) {
  return <RtaSeasonsProvider>{children}</RtaSeasonsProvider>;
}
