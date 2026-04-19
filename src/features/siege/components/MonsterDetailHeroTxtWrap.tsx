'use client';

import { Box, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import type { AttributeType } from '@/features/siege/types/monster';
import AttributeElementIcon from '@/shared/ui/attribute-element-icon/AttributeElementIcon';
import { getRenderableImageUrl } from '@/shared/utils/image';

/** 속성 라벨 — 예: 화염속성, 물속성 */
const ELEMENT_ATTR_KO: Record<AttributeType, string> = {
  fire: '화염',
  water: '물',
  wind: '바람',
  light: '빛',
  dark: '어둠',
};

/** WAS archetype(영문)·소문자 변형 → 한글 타입 */
const ARCHETYPE_TO_KO: Record<string, string> = {
  attack: '공격형',
  defense: '방어형',
  hp: '체력형',
  support: '지원형',
};

function formatArchetypeKo(raw?: string | null): string {
  if (raw == null || String(raw).trim() === '') return '—';
  const t = String(raw).trim();
  const lower = t.toLowerCase();
  return ARCHETYPE_TO_KO[t] ?? ARCHETYPE_TO_KO[lower] ?? t;
}

function formatUpdatedRelativeKo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = Date.now();
  const diffMs = now - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 0) return '방금';
  if (days === 0) {
    const hours = Math.floor(diffMs / 3600000);
    if (hours <= 0) return '방금';
    return `${hours}시간 전`;
  }
  if (days === 1) return '1일 전';
  return `${days}일 전`;
}

export interface MonsterDetailHeroTxtWrapProps {
  /** 좌측 썸네일 */
  imageUrl?: string | null;
  krName: string;
  attr: AttributeType | null;
  /** attr 없을 때 표시용 원문 */
  monsterElemental: string;
  archetype?: string | null;
  naturalStarCount: number;
  /** ISO 8601 등 — 있으면 "최근 업데이트: N일 전" 표시 */
  infoUpdatedAt?: string | null;
}

/**
 * 게임 상세 상단과 유사한 `txt-wrap` 레이아웃.
 * - attr: 속성 아이콘 + OO속성
 * - type: 타입 아이콘 + 공격형·방어형 등 (archetype)
 */
export default function MonsterDetailHeroTxtWrap({
  imageUrl,
  krName,
  attr,
  monsterElemental,
  archetype,
  naturalStarCount,
  infoUpdatedAt,
}: MonsterDetailHeroTxtWrapProps) {
  const elementLine =
    attr != null ? `${ELEMENT_ATTR_KO[attr]}속성` : (monsterElemental ? String(monsterElemental) : '—');
  const typeLine = formatArchetypeKo(archetype);
  const stars = Math.min(6, Math.max(0, naturalStarCount));
  const recentSub =
    infoUpdatedAt && String(infoUpdatedAt).trim() !== ''
      ? formatUpdatedRelativeKo(infoUpdatedAt)
      : '—';

  return (
    <Box
      className="monster-detail-hero-row"
      sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}
    >
      <Box
        className="monster-detail-hero-thumb"
        sx={{
          width: { xs: 72, sm: 88 },
          height: { xs: 72, sm: 88 },
          flexShrink: 0,
          borderRadius: 1.5,
          border: '2px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          backgroundImage: imageUrl ? `url(${getRenderableImageUrl(imageUrl)})` : undefined,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          boxShadow: 1,
        }}
        aria-hidden={!imageUrl}
      />
      <Box className="monster-detail-txt-wrap txt-wrap" sx={{ flex: 1, minWidth: 0 }}>
        <Box className="monster-detail-info info" sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 2, rowGap: 0.75, mb: 1 }}>
          <Box className="monster-detail-attr attr" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            {attr ? (
              <Box component="i" className={`monster-detail-attr-icon ${attr}`} sx={{ lineHeight: 0, display: 'inline-flex' }}>
                <AttributeElementIcon attribute={attr} size={22} titleAccess={elementLine} />
              </Box>
            ) : null}
            <Box component="em" className="monster-detail-attr-label" sx={{ fontStyle: 'normal', fontWeight: 700, fontSize: '0.9375rem' }}>
              {elementLine}
            </Box>
          </Box>
          <Box className="monster-detail-type job" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <Box component="i" className="monster-detail-type-icon manauser" sx={{ lineHeight: 0, display: 'inline-flex', opacity: 0.85 }}>
              <CategoryOutlinedIcon sx={{ fontSize: 22 }} aria-hidden />
            </Box>
            <Box component="em" sx={{ fontStyle: 'normal', fontWeight: 600, fontSize: '0.9375rem', color: 'text.secondary' }}>
              {typeLine}
            </Box>
          </Box>
        </Box>

        <Box
          className="monster-detail-name-wrap name-wrap"
          sx={{
            display: 'inline-flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            alignItems: 'center',
            columnGap: 0.75,
            rowGap: 0,
            mb: 0.5,
            maxWidth: '100%',
          }}
        >
          <Typography
            component="em"
            className="hero-name"
            noWrap
            sx={{
              fontStyle: 'normal',
              fontWeight: 800,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              lineHeight: 1.3,
              letterSpacing: '-0.02em',
              minWidth: 0,
              flex: '1 1 auto',
            }}
          >
            {krName}
          </Typography>
          <Box
            component="span"
            className={`monster-detail-grade grade${stars}`}
            data-grade={stars}
            sx={{
              display: 'inline-flex',
              flexShrink: 0,
              alignItems: 'center',
              gap: 0.15,
              lineHeight: 0,
            }}
            aria-label={`${stars}성`}
          >
            {Array.from({ length: stars }).map((_, i) => (
              <StarIcon key={i} sx={{ fontSize: 20, color: '#FFBC1F' }} />
            ))}
          </Box>
        </Box>

        <Box
          component="div"
          className="monster-detail-recently recently"
          sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.35 }}
        >
          최근 업데이트: {recentSub}
        </Box>
      </Box>
    </Box>
  );
}
