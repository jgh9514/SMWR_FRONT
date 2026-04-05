'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useRtaSummonerSearch } from '@/features/rta/hooks/useRtaData';
import type { RtaSummonerSearchHit } from '@/features/rta/types/rta';

function pickWizardId(row: RtaSummonerSearchHit): string {
  const w = row.wizardId ?? row.wizard_id;
  return w != null ? String(w).trim() : '';
}

function pickWizardName(row: RtaSummonerSearchHit): string {
  return String(row.wizardName ?? row.wizard_name ?? '').trim() || '—';
}

/**
 * 글로벌 헤더용 RTA 소환사 검색 (집계 랭킹 기준). 기본 시즌은 서버가 결정.
 */
export default function RtaSummonerSearchHeader() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isFetching } = useRtaSummonerSearch(debounced, null);

  const options = useMemo(() => data?.results ?? [], [data]);

  const handleSelect = useCallback(
    (_: unknown, v: RtaSummonerSearchHit | null) => {
      if (!v) return;
      const id = pickWizardId(v);
      if (!id) return;
      router.push(`/rta/player/${encodeURIComponent(id)}`);
      setInput('');
      setDebounced('');
    },
    [router],
  );

  return (
    <Autocomplete<RtaSummonerSearchHit, false, false, false>
      size="small"
      options={options}
      loading={isFetching}
      filterOptions={(x) => x}
      getOptionLabel={(o) => {
        const id = pickWizardId(o);
        const nm = pickWizardName(o);
        return `${nm} (${id})`;
      }}
      isOptionEqualToValue={(a, b) => pickWizardId(a) === pickWizardId(b)}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      onChange={handleSelect}
      value={null}
      blurOnSelect
      noOptionsText="결과 없음"
      sx={{
        width: { xs: 148, sm: 228 },
        maxWidth: '36vw',
        minWidth: 0,
        flexShrink: 1,
      }}
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'rgba(30, 41, 59, 0.98)',
            color: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(255,255,255,0.1)',
            '& .MuiAutocomplete-option': { fontSize: '0.875rem' },
          },
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="소환사 검색"
          aria-label="RTA 소환사 검색"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)', mr: 0.5, ml: 0.25, fontSize: 20 }} />
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {isFetching ? (
                  <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: 'rgba(255,255,255,0.9)',
              fontSize: '0.8125rem',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.45)' },
              '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.55)' },
            },
            '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.45)' },
          }}
        />
      )}
    />
  );
}
