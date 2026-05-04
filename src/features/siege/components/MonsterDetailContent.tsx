'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
  Chip,
  Container,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import StarIcon from '@mui/icons-material/Star';
import { AttributeElementIcon } from '@/shared/ui';
import { getRenderableImageUrl } from '@/shared/utils/image';
import type {
  MonsterInfoResponse,
  MonsterDetailSlimRow,
} from '@/features/siege/hooks/useMonsterInfo';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';
import type { AttributeType } from '@/features/siege/types/monster';
import { monsterAwakenStepDigit } from '@/features/siege/lib/monsterIdEvolution';
import { MonsterInfoContext } from '@/features/siege/context/MonsterInfoContext';

// ── helpers re-exported for sub-pages ────────────────────────────────────────

export function infoToMonsterStub(info: MonsterInfoResponse): MonsterOption {
  return {
    monster_id: info.monster_id,
    kr_name: info.kr_name,
    un_name: info.un_name,
    image_url: info.image_url,
    monster_elemental: info.monster_elemental,
    star: info.star,
  };
}

export function slimToOption(row: MonsterDetailSlimRow | null | undefined): MonsterOption | undefined {
  if (!row?.monster_id) return undefined;
  return {
    monster_id: String(row.monster_id),
    kr_name: row.kr_name ?? '',
    un_name: row.un_name ?? '',
    image_url: row.image_url ?? '',
    monster_elemental: row.monster_elemental,
    star: row.star,
  };
}

const ATTR_ORDER: AttributeType[] = ['fire', 'water', 'wind', 'light', 'dark'];
export function isAttr(e: string): e is AttributeType {
  return (ATTR_ORDER as readonly string[]).includes(e);
}

export function getMonsterAttribute(elemental: string | undefined): AttributeType | null {
  if (!elemental?.trim()) return null;
  const e = elemental.trim().toLowerCase();
  if (e === '1' || e === 'fire' || e === '불') return 'fire';
  if (e === '2' || e === 'water' || e === '물') return 'water';
  if (e === '3' || e === 'wind' || e === '바람') return 'wind';
  if (e === '4' || e === 'light' || e === '빛') return 'light';
  if (e === '5' || e === 'dark' || e === '어둠') return 'dark';
  return null;
}

export const HEADER_GRADIENT: Record<AttributeType, string> = {
  fire:  'linear-gradient(135deg, #b71c1c 0%, #e53935 60%, #ff8a80 100%)',
  water: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 60%, #64b5f6 100%)',
  wind:  'linear-gradient(135deg, #1b5e20 0%, #2e7d32 60%, #81c784 100%)',
  light: 'linear-gradient(135deg, #e65100 0%, #f9a825 60%, #fff59d 100%)',
  dark:  'linear-gradient(135deg, #1a0030 0%, #4a148c 60%, #ba68c8 100%)',
};

const ATTR_KO: Record<AttributeType, string> = {
  fire: '화염', water: '물', wind: '바람', light: '빛', dark: '어둠',
};

const ARCHETYPE_TO_KO: Record<string, string> = {
  attack: '공격형', defense: '방어형', hp: '체력형', support: '지원형',
};

export function detailContextFrom(info: MonsterInfoResponse) {
  if (info.detail_context) return info.detail_context;
  return (info as unknown as Record<string, unknown>)['detailContext'] as typeof info.detail_context | undefined;
}

function formatUpdatedRelativeKo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 0) return '방금';
  if (days === 0) {
    const hours = Math.floor(diffMs / 3600000);
    return hours <= 0 ? '방금' : `${hours}시간 전`;
  }
  if (days === 1) return '1일 전';
  return `${days}일 전`;
}

// ── tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { label: '개요', sub: '' },
  { label: '스탯', sub: 'stat' },
  { label: '상성', sub: 'matchup' },
  { label: '상위 플레이어', sub: 'players' },
];

// ── component ─────────────────────────────────────────────────────────────────

interface MonsterDetailContentProps {
  monsterInfo: MonsterInfoResponse;
  devilmonImageUrl: string;
  children: React.ReactNode;
  infoUpdatedAt?: string | null;
}

export default function MonsterDetailContent({
  monsterInfo,
  devilmonImageUrl,
  children,
  infoUpdatedAt = null,
}: MonsterDetailContentProps) {
  const pathname = usePathname();
  const { monster_id, monster_elemental, kr_name, un_name, image_url, archetype, natural_stars, star } = monsterInfo;

  const baseHref = `/monster-detail/${monster_id}`;

  const activeTabIndex = useMemo(() => {
    const segs = pathname.split('/');
    const last = segs[segs.length - 1];
    const idx = TABS.findIndex((t) => t.sub === last || (t.sub === '' && segs.length <= 3));
    return idx >= 0 ? idx : 0;
  }, [pathname]);

  const attr = getMonsterAttribute(monster_elemental);
  const grad = attr ? HEADER_GRADIENT[attr] : 'linear-gradient(135deg, #37474f 0%, #546e7a 60%, #90a4ae 100%)';
  const awakenStep = monsterAwakenStepDigit(monster_id) ?? 0;
  const stub = infoToMonsterStub(monsterInfo);
  const dctx = detailContextFrom(monsterInfo);

  const starCount = natural_stars != null && natural_stars > 0
    ? Math.min(6, natural_stars)
    : Math.min(6, star ?? 0);

  const archetypeKo = archetype
    ? (ARCHETYPE_TO_KO[archetype] ?? ARCHETYPE_TO_KO[archetype.toLowerCase()] ?? archetype)
    : null;

  const recentSub = infoUpdatedAt?.trim()
    ? formatUpdatedRelativeKo(infoUpdatedAt)
    : null;

  const evolution = useMemo(() => {
    const ev = dctx?.evolution;
    if (!ev) return null;
    const normalM  = slimToOption(ev.normal)           ?? (awakenStep === 0 ? stub : undefined);
    const awakenM  = slimToOption(ev.awakened)         ?? (awakenStep === 1 ? stub : undefined);
    const secondM  = slimToOption(ev.second_awakening) ?? (awakenStep === 2 ? stub : undefined);
    if (!normalM && !awakenM && !secondM) return null;
    return { normalM, awakenM, secondM };
  }, [dctx, awakenStep, stub]);

  const siblingElements = useMemo(() => {
    const raw = dctx?.siblings;
    if (!raw?.length) return [];
    const out: { attr: AttributeType; monster: MonsterOption }[] = [];
    for (const s of raw) {
      const m = slimToOption(s.monster);
      if (!m) continue;
      const el = typeof s.element === 'string' ? s.element : '';
      if (!isAttr(el)) continue;
      out.push({ attr: el, monster: m });
    }
    return out;
  }, [dctx]);

  return (
    <MonsterInfoContext.Provider value={{ monsterInfo, devilmonImageUrl }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 1.5, md: 2 }, pb: { xs: 2, md: 3 } }}>

        {/* ── back link ── */}
        <Box
          component={Link}
          href="/monster-search"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            mb: 1.5,
            color: 'text.secondary',
            textDecoration: 'none',
            fontSize: '0.8125rem',
            fontWeight: 600,
            opacity: 0.8,
            transition: 'opacity 0.15s',
            '&:hover': { opacity: 1, color: 'text.primary' },
          }}
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 12 }} />
          몬스터 검색
        </Box>

        {/* ── hero card ── */}
        <Box
          sx={{
            mb: 0,
            borderRadius: { xs: 2, sm: 3 },
            overflow: 'hidden',
            background: grad,
            position: 'relative',
          }}
        >
          {/* subtle noise/shimmer overlay */}
          <Box
            sx={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.22) 100%)',
            }}
          />

          <Box
            sx={{
              position: 'relative',
              px: { xs: 2, sm: 3 },
              pt: { xs: 2.5, sm: 3 },
              pb: siblingElements.length > 0 ? { xs: 1.5, sm: 2 } : { xs: 2.5, sm: 3 },
              display: 'flex',
              gap: { xs: 2, sm: 3 },
              alignItems: 'flex-start',
            }}
          >
            {/* monster image */}
            <Box
              sx={{
                flexShrink: 0,
                width: { xs: 88, sm: 110, md: 128 },
                height: { xs: 88, sm: 110, md: 128 },
                borderRadius: 2.5,
                bgcolor: 'rgba(0,0,0,0.18)',
                border: '2px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(2px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              }}
            >
              <Box
                component="img"
                src={getRenderableImageUrl(image_url)}
                alt={kr_name}
                sx={{
                  width: '85%',
                  height: '85%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))',
                }}
              />
            </Box>

            {/* text info */}
            <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
              {/* attribute + archetype chips */}
              <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mb: 1 }}>
                {attr && (
                  <Chip
                    size="small"
                    icon={<AttributeElementIcon attribute={attr} size={14} />}
                    label={`${ATTR_KO[attr]}속성`}
                    sx={{
                      height: 22,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      bgcolor: 'rgba(255,255,255,0.18)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.25)',
                      '& .MuiChip-icon': { color: 'inherit', ml: 0.5 },
                    }}
                  />
                )}
                {archetypeKo && (
                  <Chip
                    size="small"
                    label={archetypeKo}
                    sx={{
                      height: 22,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      bgcolor: 'rgba(0,0,0,0.22)',
                      color: 'rgba(255,255,255,0.85)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  />
                )}
              </Stack>

              {/* name */}
              <Typography
                variant="h5"
                component="h1"
                fontWeight={800}
                sx={{
                  color: '#fff',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  fontSize: { xs: '1.35rem', sm: '1.65rem' },
                  mb: 0.25,
                }}
              >
                {kr_name}
              </Typography>

              {/* english name */}
              {un_name && un_name !== kr_name && (
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8125rem', mb: 0.75, letterSpacing: 0.2 }}
                >
                  {un_name}
                </Typography>
              )}

              {/* stars */}
              <Stack direction="row" spacing={0.2} sx={{ mb: 0.75 }}>
                {Array.from({ length: starCount }).map((_, i) => (
                  <StarIcon key={i} sx={{ fontSize: { xs: 16, sm: 18 }, color: '#FFD740', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }} />
                ))}
              </Stack>

              {/* updated at */}
              {recentSub && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>
                  데이터 업데이트: {recentSub}
                </Typography>
              )}
            </Box>
          </Box>

          {/* evolution strip */}
          {evolution && (
            <Box
              sx={{
                position: 'relative',
                px: { xs: 2, sm: 3 },
                pb: { xs: 1, sm: 1.25 },
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: 0.5, mr: 0.5 }}
              >
                진화
              </Typography>
              {[
                evolution.normalM && { monster: evolution.normalM, label: '노말', active: awakenStep === 0 },
                evolution.awakenM && { monster: evolution.awakenM, label: '1차', active: awakenStep === 1 },
                evolution.secondM && { monster: evolution.secondM, label: '2차', active: awakenStep === 2 },
              ].filter(Boolean).map((item, idx, arr) => (
                <Box key={item!.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title={item!.monster.kr_name} placement="top" arrow>
                    <Link href={`/monster-detail/${item!.monster.monster_id}`} style={{ textDecoration: 'none' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Box
                          component="img"
                          src={getRenderableImageUrl(item!.monster.image_url)}
                          alt={item!.monster.kr_name}
                          sx={{
                            width: 40,
                            height: 40,
                            objectFit: 'contain',
                            borderRadius: 1.5,
                            bgcolor: 'rgba(0,0,0,0.22)',
                            border: item!.active ? '2px solid rgba(255,255,255,0.85)' : '1.5px solid rgba(255,255,255,0.2)',
                            display: 'block',
                            transition: 'transform 0.15s, border-color 0.15s',
                            '&:hover': { transform: 'scale(1.1)', borderColor: 'rgba(255,255,255,0.55)' },
                          }}
                        />
                        <Typography variant="caption" sx={{
                          display: 'block', mt: 0.25, fontSize: '0.62rem',
                          color: item!.active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                          fontWeight: item!.active ? 700 : 400,
                        }}>
                          {item!.label}
                        </Typography>
                      </Box>
                    </Link>
                  </Tooltip>
                  {idx < arr.length - 1 && (
                    <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', userSelect: 'none', mb: 1.5 }}>→</Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* sibling elements strip */}
          {siblingElements.length > 0 && (
            <Box
              sx={{
                position: 'relative',
                px: { xs: 2, sm: 3 },
                pb: { xs: 1.5, sm: 2 },
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: 0.5, mr: 0.5 }}
              >
                같은 몬스터
              </Typography>
              {siblingElements.map(({ attr: sAttr, monster: sm }) => (
                <Tooltip key={sAttr} title={sm.kr_name} placement="top" arrow>
                  <Link href={`/monster-detail/${sm.monster_id}`} style={{ textDecoration: 'none' }}>
                    <Box
                      sx={{
                        position: 'relative',
                        width: 44,
                        height: 44,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(0,0,0,0.22)',
                        border: '1.5px solid rgba(255,255,255,0.2)',
                        backgroundImage: `url(${getRenderableImageUrl(sm.image_url)})`,
                        backgroundSize: '80%',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        transition: 'transform 0.15s, border-color 0.15s',
                        '&:hover': { transform: 'scale(1.1)', borderColor: 'rgba(255,255,255,0.55)' },
                      }}
                    >
                      <Box sx={{ position: 'absolute', bottom: 2, right: 2, lineHeight: 0 }}>
                        <AttributeElementIcon attribute={sAttr} size={14} />
                      </Box>
                    </Box>
                  </Link>
                </Tooltip>
              ))}
            </Box>
          )}
        </Box>

        {/* ── tab nav ── */}
        <Box
          component="nav"
          sx={(t) => ({
            borderBottom: '1px solid',
            borderColor: 'divider',
            mb: 2.5,
            bgcolor: 'background.paper',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            mx: { xs: -2, sm: 0 },
            px: { xs: 2, sm: 0 },
            boxShadow: `0 1px 0 ${alpha(t.palette.divider, 1)}`,
          })}
        >
          <Tabs
            value={activeTabIndex}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 46,
              '& .MuiTabs-indicator': {
                height: 2.5,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTabs-scrollButtons.Mui-disabled': { opacity: 0.3 },
            }}
          >
            {TABS.map((t, i) => (
              <Tab
                key={t.sub}
                component={Link}
                href={t.sub ? `${baseHref}/${t.sub}` : baseHref}
                scroll={false}
                value={i}
                disableRipple
                label={t.label}
                sx={{
                  minHeight: 46,
                  textTransform: 'none',
                  fontWeight: activeTabIndex === i ? 700 : 500,
                  fontSize: '0.875rem',
                  letterSpacing: 0,
                  color: 'text.secondary',
                  opacity: 1,
                  px: { xs: 1.5, sm: 2 },
                  '&.Mui-selected': { color: 'primary.main', fontWeight: 700 },
                }}
              />
            ))}
          </Tabs>
        </Box>

        {children}
      </Container>
    </MonsterInfoContext.Provider>
  );
}
