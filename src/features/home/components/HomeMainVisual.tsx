'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Autocomplete,
  Avatar,
  Box,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useRtaSummonerSearch } from '@/features/rta/hooks/useRtaData';
import type { RtaSummonerSearchHit } from '@/features/rta/types/rta';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import { SITE_NAME_DISPLAY } from '@/shared/lib/seo';

function pickWizardId(row: RtaSummonerSearchHit): string {
  const w = row.wizard_id;
  return w != null ? String(w).trim() : '';
}

function pickWizardName(row: RtaSummonerSearchHit): string {
  return String(row.wizard_name ?? '').trim() || '—';
}

function pickChannelUid(row: RtaSummonerSearchHit): string | undefined {
  const u = row.channel_uid;
  if (u == null || u === '') return undefined;
  return String(u).trim();
}

function countryFlagSrc(country: string | undefined): string | null {
  const c = (country ?? '').trim();
  if (!c || c === '—') return null;
  if (!/^[a-z]{2}$/i.test(c)) return null;
  return `https://flagcdn.com/w20/${c.toLowerCase()}.png`;
}

/** 홈 히어로: 메인 배너 + RTA 소환사 검색(집계·기본 시즌, 서버 결정). */
export default function HomeMainVisual() {
  const router = useRouter();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

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
    <Box
      className="main-visual"
      sx={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        color: 'common.white',
        py: { xs: 3.5, md: 5 },
        background: (t) =>
          t.palette.mode === 'dark'
            ? 'linear-gradient(155deg, #0b1220 0%, #1a1f35 40%, #12324d 100%)'
            : 'linear-gradient(155deg, #0a1628 0%, #122a4a 45%, #163d62 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(circle at 20% 20%, ${theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(96, 165, 250, 0.2)'} 0%, transparent 50%),
            radial-gradient(circle at 80% 60%, ${theme.palette.mode === 'dark' ? 'rgba(34, 211, 238, 0.08)' : 'rgba(125, 211, 252, 0.12)'} 0%, transparent 45%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Container
        className="inner"
        maxWidth="md"
        sx={{ position: 'relative', zIndex: 1, px: { xs: 2, sm: 3 } }}
      >
        <Stack spacing={{ xs: 2.5, md: 3.5 }} alignItems="center" textAlign="center">
          <Box>
            <Typography
              component="h1"
              className="game-bi"
              sx={{
                fontWeight: 900,
                letterSpacing: { xs: '0.04em', md: '0.08em' },
                fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
                lineHeight: 1.1,
                textTransform: 'uppercase',
                background: (t) =>
                  `linear-gradient(180deg, ${t.palette.common.white} 0%, ${t.palette.mode === 'dark' ? 'rgba(226, 232, 240, 0.85)' : 'rgba(226, 232, 255, 0.92)'} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 40px rgba(99, 102, 241, 0.35)',
              }}
            >
              {SITE_NAME_DISPLAY}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mt: 1.25,
                color: 'rgba(255,255,255,0.72)',
                fontWeight: 500,
                fontSize: { xs: '0.8rem', md: '0.9rem' },
                maxWidth: 420,
                mx: 'auto',
              }}
            >
              RTA 랭킹·몬스터·점령전 — 소환사 닉으로 바로 이동
            </Typography>
          </Box>

          <Box
            id="main-search-box"
            sx={{
              width: '100%',
              maxWidth: 640,
            }}
          >
            <Box className="searchbox-wrap" sx={{ width: '100%' }}>
                <Autocomplete<RtaSummonerSearchHit, false, false, false>
                  size={isMdUp ? 'medium' : 'small'}
                  fullWidth
                  options={options}
                  loading={isFetching}
                  filterOptions={(x) => x}
                  getOptionLabel={(o) => pickWizardName(o)}
                  isOptionEqualToValue={(a, b) => pickWizardId(a) === pickWizardId(b)}
                  inputValue={input}
                  onInputChange={(_, v) => setInput(v)}
                  onChange={handleSelect}
                  value={null}
                  blurOnSelect
                  noOptionsText="결과 없음"
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 0.5,
                        bgcolor: 'rgba(15, 23, 42, 0.98)',
                        color: 'rgba(255,255,255,0.92)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        '& .MuiAutocomplete-option': { fontSize: '0.875rem' },
                      },
                    },
                  }}
                  renderOption={(props, option) => {
                    const { key, ...other } = props;
                    const wid = pickWizardId(option);
                    const nm = pickWizardName(option);
                    const ch = pickChannelUid(option);
                    const flag = countryFlagSrc(option.country);
                    return (
                      <Box
                        component="li"
                        key={key}
                        {...other}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, px: 1 }}
                      >
                        <Avatar
                          src={getSwexPlayerImageUrl(ch ?? wid)}
                          alt=""
                          sx={{ width: 32, height: 32, flexShrink: 0 }}
                        />
                        <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
                          {nm}
                        </Typography>
                        {flag ? (
                          <Box
                            component="img"
                            src={flag}
                            alt=""
                            sx={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 0.5, flexShrink: 0 }}
                          />
                        ) : null}
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      className="search-input"
                      placeholder="소환사 닉네임"
                      aria-label="RTA 소환사 검색"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <SearchIcon sx={{ color: 'action.active', mr: 0.5, ml: 0.25, fontSize: 24 }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                        endAdornment: (
                          <>
                            {isFetching ? <CircularProgress color="inherit" size={18} sx={{ mr: 1 }} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255,255,255,0.98)',
                          borderRadius: 1,
                          fontSize: '0.95rem',
                        },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.12)' },
                        '& .MuiInputBase-input::placeholder': { opacity: 0.55 },
                      }}
                    />
                  )}
                />
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
