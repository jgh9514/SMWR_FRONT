'use client';

import { useMemo } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import type { SiegeMapBaseRow, SiegeMapGuildRow } from '@/features/siege/map/types/siegeMap';
import { useSiegeMapLayoutMaster } from '@/features/siege/map/hooks/useSiegeMap';
import {
  buildLayoutMapFromMaster,
  getSiegeBaseLayout,
  isSiegeHqBase,
  normalizeLayoutMasterImages,
  POS_GUILD_COLORS,
  resolveSiegeBaseImage,
} from '@/features/siege/map/lib/siegeBaseLayout';
import { SIEGE_MAP_ASPECT, SIEGE_MAP_WIDTH } from '@/features/siege/map/lib/siegeMapConfig';
import { siegeRingKindLabel } from '@/features/siege/map/lib/siegeDeckSlots';
import { mergeSiegeBasesWithAllSlots } from '@/features/siege/map/lib/mergeSiegeBases';
import { formatRemainMmSs } from '@/features/siege/map/lib/formatSiegeMap';
import SiegeMapBackground from '@/features/siege/map/components/SiegeMapBackground';
import SiegeMapBaseMarker from '@/features/siege/map/components/SiegeMapBaseMarker';

type SiegeMapBoardProps = {
  guilds: SiegeMapGuildRow[];
  bases: SiegeMapBaseRow[];
  capturedAt?: number;
  onBaseClick?: (baseNumber: number) => void;
  /** 데이터 없을 때도 39거점 슬롯 표시 */
  showAllSlots?: boolean;
};

function guildColorById(guilds: SiegeMapGuildRow[], guildId: string): string {
  if (!guildId) {
    return 'rgba(255,255,255,0.25)';
  }
  const g = guilds.find((x) => String(x.guild_id) === String(guildId));
  if (!g) {
    return '#9e9e9e';
  }
  return POS_GUILD_COLORS[g.pos_id] ?? '#9e9e9e';
}

export default function SiegeMapBoard({
  guilds,
  bases,
  capturedAt,
  onBaseClick,
  showAllSlots = true,
}: SiegeMapBoardProps) {
  const layoutMasterQuery = useSiegeMapLayoutMaster();
  const layoutMap = useMemo(
    () => buildLayoutMapFromMaster(layoutMasterQuery.data?.layouts),
    [layoutMasterQuery.data?.layouts],
  );
  const baseImages = useMemo(
    () => normalizeLayoutMasterImages(layoutMasterQuery.data?.images),
    [layoutMasterQuery.data?.images],
  );

  const guildByPos = new Map(guilds.map((g) => [g.pos_id, g]));

  const displayBases = useMemo(() => {
    if (!showAllSlots) {
      return bases;
    }
    return mergeSiegeBasesWithAllSlots(bases);
  }, [bases, showAllSlots]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: SIEGE_MAP_WIDTH,
        aspectRatio: SIEGE_MAP_ASPECT,
        mx: 'auto',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#0d1b2a',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      }}
    >
      <SiegeMapBackground />

      {/* 상단 3길드 */}
      <Box
        sx={{
          position: 'absolute',
          inset: '0 0 auto 0',
          minHeight: '14%',
          bgcolor: 'rgba(0,0,0,0.72)',
          zIndex: 3,
          px: 1,
          py: 0.75,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.75 }}>
          {[1, 2, 3].map((pos) => {
            const g = guildByPos.get(pos);
            const color = POS_GUILD_COLORS[pos] ?? '#fff';
            const unitCap = (g?.play_member_count ?? 25) * 30;
            return (
              <Box
                key={pos}
                sx={{
                  px: 1,
                  py: 0.75,
                  bgcolor: color,
                  color: pos === 3 ? '#111' : '#fff',
                  borderRadius: 1,
                  minHeight: 52,
                }}
              >
                <Typography variant="caption" fontWeight={700} noWrap>
                  {g?.guild_name ?? `—`}
                </Typography>
                <Typography variant="caption" sx={{ float: 'right', fontWeight: 700 }}>
                  {g?.match_score != null ? Math.round(Number(g.match_score)).toLocaleString() : '—'}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', opacity: 0.92, fontSize: '0.7rem' }}>
                  {g?.play_member_count ?? '—'}명 · +{g?.match_score_increment ?? 0}/min
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                  공격 {g?.attack_count ?? 0} ({g?.attack_unit_count ?? 0}/{unitCap})
                </Typography>
              </Box>
            );
          })}
        </Box>
        {capturedAt != null && (
          <Typography
            variant="caption"
            color="grey.500"
            sx={{ display: 'block', textAlign: 'right', mt: 0.5, fontSize: '0.65rem' }}
          >
            {new Date(capturedAt * 1000).toLocaleString('ko-KR')}
          </Typography>
        )}
      </Box>

      {/* 거점 39 */}
      {displayBases.map((base) => {
        const layout = getSiegeBaseLayout(base.base_number, layoutMap);
        const empty = base.base_status < 0 || !base.guild_id;
        const color = guildColorById(guilds, String(base.guild_id));
        const isHq = isSiegeHqBase(layout, base.base_type);
        const selectable = !isHq && !empty;
        const remain = empty ? null : formatRemainMmSs(base.remain_sec);
        const baseImage = resolveSiegeBaseImage(
          baseImages,
          layout,
          empty ? 0 : base.base_status,
        );

        return (
          <Tooltip
            key={base.base_number}
            title={
              isHq
                ? `본진 (슬롯 ${layout.slotNo}) · 선택 불가`
                : empty
                  ? `슬롯 ${layout.slotNo} · ${siegeRingKindLabel(layout.ringKind)} · 데이터 없음`
                  : `슬롯 ${layout.slotNo} · ${siegeRingKindLabel(layout.ringKind)} · 상태 ${base.base_status}${remain ? ` · ${remain}` : ''}`
            }
          >
            <Box
              role={onBaseClick && selectable ? 'button' : undefined}
              tabIndex={onBaseClick && selectable ? 0 : undefined}
              onClick={() => {
                if (selectable) {
                  onBaseClick?.(base.base_number);
                }
              }}
              onKeyDown={(e) => {
                if (onBaseClick && selectable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onBaseClick(base.base_number);
                }
              }}
              sx={{
                position: 'absolute',
                top: `${layout.top}%`,
                left: `${layout.left}%`,
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                cursor: onBaseClick && selectable ? 'pointer' : 'default',
                zIndex: 2,
                opacity: empty ? 0.45 : 1,
              }}
            >
              <SiegeMapBaseMarker
                layout={layout}
                zone={layout.zone}
                slotNo={layout.slotNo}
                displayWidth={baseImage.displayWidth}
                displayHeight={baseImage.displayHeight}
                baseStatus={base.base_status}
                color={color}
                empty={empty}
                isHq={isHq}
                imageUrl={baseImage.imagePath}
              />
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}
