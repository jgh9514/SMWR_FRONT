'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
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
  fire:  'linear-gradient(120deg, #0d0d0d 0%, #4a0a0a 40%, #b71c1c 100%)',
  water: 'linear-gradient(120deg, #0a0d1a 0%, #0d2a4a 40%, #0d47a1 100%)',
  wind:  'linear-gradient(120deg, #0a0f0a 0%, #0f2e10 40%, #1b5e20 100%)',
  light: 'linear-gradient(120deg, #1a1200 0%, #3d2a00 40%, #7a5500 100%)',
  dark:  'linear-gradient(120deg, #0a0010 0%, #1a0030 40%, #4a148c 100%)',
};

export const ATTR_GLOW: Record<AttributeType, string> = {
  fire:  '#ff4d4d',
  water: '#4da6ff',
  wind:  '#4dff88',
  light: '#ffd740',
  dark:  '#cc66ff',
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
  const grad = attr ? HEADER_GRADIENT[attr] : 'linear-gradient(120deg, #0d0d0d 0%, #1c2226 40%, #37474f 100%)';
  const glow = attr ? ATTR_GLOW[attr] : '#90a4ae';
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
            minHeight: { xs: 130, sm: 170 },
          }}
        >
          {/* radial spotlight behind image */}
          <Box
            sx={{
              position: 'absolute',
              right: { xs: -20, sm: 0 },
              top: 0,
              width: { xs: 240, sm: 320, md: 380 },
              height: '100%',
              pointerEvents: 'none',
              background: `radial-gradient(ellipse at 60% 40%, ${glow}28 0%, ${glow}0d 45%, transparent 70%)`,
            }}
          />
          {/* bottom fade */}
          <Box
            sx={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.35) 100%)',
            }}
          />

          {/* main content row */}
          <Box
            sx={{
              position: 'relative',
              px: { xs: 2, sm: 3 },
              py: { xs: 2.5, sm: 3 },
              display: 'flex',
              gap: { xs: 2, sm: 3 },
              alignItems: 'stretch',
            }}
          >
            {/* 왼쪽: 몬스터 이미지 */}
            <Box
              sx={{
                flexShrink: 0,
                width: { xs: 100, sm: 130, md: 150 },
                height: { xs: 100, sm: 130, md: 150 },
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  width: '85%', height: '85%',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${glow}50 0%, ${glow}15 50%, transparent 72%)`,
                  filter: 'blur(10px)',
                  pointerEvents: 'none',
                }}
              />
              <Box
                component="img"
                src={getRenderableImageUrl(image_url)}
                alt={kr_name}
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  filter: `drop-shadow(0 0 20px ${glow}85) drop-shadow(0 6px 14px rgba(0,0,0,0.6))`,
                }}
              />
            </Box>

            {/* 가운데: 이름 + 각성 체인 */}
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {/* 이름 — 크게 */}
              <Typography
                component="h1"
                fontWeight={900}
                sx={{
                  color: '#fff',
                  lineHeight: 1.0,
                  letterSpacing: '-0.03em',
                  textShadow: `0 2px 16px rgba(0,0,0,0.6), 0 0 60px ${glow}40`,
                  fontSize: { xs: '1.5rem', sm: '2.2rem', md: '2.6rem' },
                  mb: 0.4,
                }}
              >
                {kr_name}
              </Typography>

              {/* 서브: 영문 · 아키타입 · 별 */}
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.25 }}>
                {un_name && un_name !== kr_name && (
                  <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', fontStyle: 'italic', letterSpacing: 0.2 }}>
                    {un_name}
                  </Typography>
                )}
                {un_name && un_name !== kr_name && archetypeKo && (
                  <Typography aria-hidden="true" sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>·</Typography>
                )}
                {archetypeKo && (
                  <Typography sx={{ color: glow, fontSize: '0.75rem', fontWeight: 700, opacity: 0.9 }}>
                    {archetypeKo}
                  </Typography>
                )}
                {starCount > 0 && (
                  <>
                    <Typography aria-hidden="true" sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>·</Typography>
                    <Stack direction="row" spacing={0.1}>
                      {Array.from({ length: starCount }).map((_, i) => (
                        <StarIcon key={i} sx={{ fontSize: 13, color: '#FFD740', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                      ))}
                    </Stack>
                  </>
                )}
              </Stack>

              {/* 각성 체인 — 이름 아래 */}
              {evolution && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  {[
                    evolution.normalM && { monster: evolution.normalM, active: awakenStep === 0 },
                    evolution.awakenM && { monster: evolution.awakenM, active: awakenStep === 1 },
                    evolution.secondM && { monster: evolution.secondM, active: awakenStep === 2 },
                  ].filter(Boolean).map((item, idx, arr) => (
                    <Stack key={idx} direction="row" alignItems="center" spacing={0.5}>
                      <Tooltip title={item!.monster.kr_name} placement="top" arrow>
                        <Link href={`/monster-detail/${item!.monster.monster_id}`} style={{ textDecoration: 'none' }}>
                          <Box
                            component="img"
                            src={getRenderableImageUrl(item!.monster.image_url)}
                            alt={item!.monster.kr_name}
                            sx={{
                              width: { xs: 34, sm: 40 },
                              height: { xs: 34, sm: 40 },
                              objectFit: 'contain',
                              borderRadius: 1.5,
                              bgcolor: 'rgba(0,0,0,0.3)',
                              border: item!.active ? `2px solid ${glow}` : '1.5px solid rgba(255,255,255,0.12)',
                              boxShadow: item!.active ? `0 0 10px ${glow}60` : 'none',
                              display: 'block',
                              transition: 'transform 0.15s, box-shadow 0.15s',
                              '&:hover': { transform: 'scale(1.1)', boxShadow: `0 0 14px ${glow}80` },
                              '&:focus-visible': { outline: `2px solid ${glow}`, outlineOffset: 2 },
                            }}
                          />
                        </Link>
                      </Tooltip>
                      {idx < arr.length - 1 && (
                        <Typography aria-hidden="true" sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem', userSelect: 'none' }}>›</Typography>
                      )}
                    </Stack>
                  ))}
                </Stack>
              )}

              {recentSub && (
                <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem', mt: 1 }}>
                  {recentSub}
                </Typography>
              )}
            </Box>

          </Box>

          {/* 형제 속성 — 히어로 카드 하단 (xs/sm 공통) */}
          {siblingElements.length > 0 && (
            <Box
              sx={{
                px: { xs: 2, sm: 3 },
                pt: 0,
                pb: { xs: 1.5, sm: 2 },
                borderTop: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  mb: 1,
                  mt: 1.25,
                }}
              >
                속성별
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(auto-fill, minmax(130px, 1fr))', sm: 'repeat(auto-fill, minmax(140px, 1fr))' },
                  gap: { xs: 1, sm: 1.5 },
                }}
              >
                {siblingElements.map(({ attr: sAttr, monster: sm }) => (
                  <Link key={sAttr} href={`/monster-detail/${sm.monster_id}`} style={{ textDecoration: 'none' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1,
                        py: 0.5,
                        borderRadius: 1.5,
                        border: '1px solid rgba(255,255,255,0.1)',
                        bgcolor: 'rgba(0,0,0,0.25)',
                        transition: 'background-color 0.15s, border-color 0.15s',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.07)',
                          borderColor: 'rgba(255,255,255,0.22)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          width: { xs: 36, sm: 40 },
                          height: { xs: 36, sm: 40 },
                          borderRadius: 1,
                          flexShrink: 0,
                          backgroundImage: `url(${getRenderableImageUrl(sm.image_url)})`,
                          backgroundSize: '80%',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      >
                        <Box sx={{ position: 'absolute', bottom: 0, right: 0, lineHeight: 0 }}>
                          <AttributeElementIcon attribute={sAttr} size={12} titleAccess={ATTR_KO[sAttr]} />
                        </Box>
                      </Box>
                      <Typography
                        noWrap
                        sx={{
                          color: 'rgba(255,255,255,0.75)',
                          fontSize: { xs: '0.72rem', sm: '0.8rem' },
                          fontWeight: 500,
                          maxWidth: { xs: 56, sm: 72 },
                          lineHeight: 1.2,
                        }}
                      >
                        {sm.kr_name}
                      </Typography>
                    </Box>
                  </Link>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* ── tab nav ── */}
        <Box
          component="nav"
          sx={(t) => ({
            borderBottom: '1px solid',
            borderColor: 'divider',
            mb: { xs: 2, sm: 2.5 },
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
