'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
  Button,
  Container,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AttributeElementIcon } from '@/shared/ui';
import { getRenderableImageUrl } from '@/shared/utils/image';
import type {
  MonsterInfoResponse,
  MonsterDetailSlimRow,
} from '@/features/siege/hooks/useMonsterInfo';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';
import type { AttributeType } from '@/features/siege/types/monster';
import MonsterDetailHeroTxtWrap from '@/features/siege/components/MonsterDetailHeroTxtWrap';
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
  fire: 'linear-gradient(135deg, #b71c1c 0%, #ff8a80 100%)',
  water: 'linear-gradient(135deg, #1565c0 0%, #81d4fa 100%)',
  wind: 'linear-gradient(135deg, #2e7d32 0%, #a5d6a7 100%)',
  light: 'linear-gradient(135deg, #f9a825 0%, #fff9c4 100%)',
  dark: 'linear-gradient(135deg, #4a148c 0%, #ce93d8 100%)',
};

export function detailContextFrom(info: MonsterInfoResponse) {
  if (info.detail_context) return info.detail_context;
  return (info as unknown as Record<string, unknown>)['detailContext'] as typeof info.detail_context | undefined;
}

// ── tab nav ───────────────────────────────────────────────────────────────────

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
  const { monster_id, monster_elemental } = monsterInfo;

  const baseHref = `/monster-detail/${monster_id}`;

  const activeTabIndex = useMemo(() => {
    const segs = pathname.split('/');
    const last = segs[segs.length - 1];
    const idx = TABS.findIndex((t) => t.sub === last || (t.sub === '' && segs.length <= 3));
    return idx >= 0 ? idx : 0;
  }, [pathname]);

  const attr = getMonsterAttribute(monster_elemental);
  const awakenStep = monsterAwakenStepDigit(monster_id) ?? 0;
  const stub = infoToMonsterStub(monsterInfo);
  const dctx = detailContextFrom(monsterInfo);
  const ev = dctx?.evolution;
  const normalM = slimToOption(ev?.normal) ?? (awakenStep === 0 ? stub : undefined);
  const awakenedM = slimToOption(ev?.awakened) ?? (awakenStep === 1 ? stub : undefined);
  const secondM = slimToOption(ev?.second_awakening) ?? (awakenStep === 2 ? stub : undefined);

  const siblingElements = useMemo(() => {
    const raw = detailContextFrom(monsterInfo)?.siblings;
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
  }, [monsterInfo]);

  const naturalStarCount = monsterInfo.natural_stars != null && monsterInfo.natural_stars > 0
    ? Math.min(6, monsterInfo.natural_stars)
    : Math.min(6, monsterInfo.star ?? 0);

  return (
    <MonsterInfoContext.Provider value={{ monsterInfo, devilmonImageUrl }}>
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
        <Button
          component={Link}
          href="/monster-search"
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          몬스터 검색
        </Button>

        <MonsterDetailHeroTxtWrap
          imageUrl={monsterInfo.image_url}
          krName={monsterInfo.kr_name}
          attr={attr}
          monsterElemental={monster_elemental}
          archetype={monsterInfo.archetype}
          naturalStarCount={naturalStarCount}
          infoUpdatedAt={infoUpdatedAt}
        />

        {/* evolution quick-links in hero (stat tab shows full evolution card) */}
        {(normalM || awakenedM || secondM) ? null : null}

        {siblingElements.length > 0 ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'text.secondary' }}>
              같은 몬스터 · 다른 속성
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              {siblingElements.map(({ attr: sAttr, monster: sm }) => (
                <Link key={sAttr} href={`/monster-detail/${sm.monster_id}`} style={{ textDecoration: 'none' }} title={sm.kr_name}>
                  <Box
                    sx={{
                      position: 'relative',
                      width: 72,
                      height: 72,
                      borderRadius: 1.5,
                      border: '2px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      backgroundImage: `url(${getRenderableImageUrl(sm.image_url)})`,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      transition: 'transform 0.15s',
                      '&:hover': { transform: 'scale(1.05)' },
                    }}
                  >
                    <Box sx={{ position: 'absolute', bottom: 4, right: 4, lineHeight: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}>
                      <AttributeElementIcon attribute={sAttr} size={22} />
                    </Box>
                  </Box>
                </Link>
              ))}
            </Box>
          </Box>
        ) : null}

        <Box
          component="nav"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            mb: 2,
            '& .MuiTabs-scrollButtons.Mui-disabled': { opacity: 0.35 },
          }}
        >
          <Tabs
            value={activeTabIndex}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: { xs: 44, sm: 48 },
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
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
                  minHeight: { xs: 44, sm: 48 },
                  textTransform: 'none',
                  fontWeight: activeTabIndex === i ? 700 : 600,
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                  color: 'text.secondary',
                  opacity: 1,
                  '&.Mui-selected': { color: 'primary.main' },
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
