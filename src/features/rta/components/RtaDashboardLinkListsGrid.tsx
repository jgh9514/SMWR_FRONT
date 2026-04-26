'use client';

import type { ReactNode, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  useRtaDashboardPreviewSolo,
  useRtaDashboardPreviewDuo,
  useRtaDashboardPreviewTrio,
  useRtaDashboardPreviewSummoner,
} from '@/features/rta/hooks/useRtaData';
import type { DuoComboStat, MonsterStats, RtaSummonerRankingRow, TrioComboStat } from '@/features/rta/types/rta';
import { getRenderableImageUrl, getSwexPlayerImageUrl } from '@/shared/utils/image';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';

const MONSTER_STATS_PATHS = {
  solo: '/rta/monster-stats/solo',
  duo: '/rta/monster-stats/duo',
  trio: '/rta/monster-stats/trio',
} as const;

const SUMMONER_RANKING_PATH = '/rta/summoner-ranking';
const MONSTER_DETAIL_BASE = '/monster-detail';

type PreviewBlock = { type?: string; rows?: unknown } | null | undefined;

function linkPreviewRows<T>(block: PreviewBlock, expected: 'solo' | 'duo' | 'trio'): T[] {
  if (block == null) return [];
  if (!Array.isArray((block as { rows?: unknown }).rows)) return [];
  const rows = (block as { type?: string; rows: unknown[] }).rows;
  const type = (block as { type?: string }).type;
  if (type != null && type !== expected) return [];
  return rows as T[];
}

/** 메인 4열 패널: 행 5개 동일 높이 · 카드(헤더+목록) 스트레치 */
const DASH_LIST_ROW_PX = 48;
const DASH_LIST_BODY_PX = 5 * DASH_LIST_ROW_PX;

function rtaMonsterDetailHref(monsterId: string | undefined | null): string | undefined {
  const id = monsterId != null ? String(monsterId).trim() : '';
  if (!id) return undefined;
  return `${MONSTER_DETAIL_BASE}/${encodeURIComponent(id)}`;
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatPct2(n: number): string {
  return `${toNum(n, 0).toFixed(2)}%`;
}

/** 메인 몬스터 미리보기: 경기 수(또는 솔로 픽 횟수) · 승률 */
function formatMonsterMatchWinLine(count: number, winRate: number) {
  return `경기수 ${toNum(count, 0).toLocaleString()} | 승률 ${formatPct2(winRate)}`;
}

function comboMonsterImageUrl(row: DuoComboStat | TrioComboStat, slot: 1 | 2 | 3): string | undefined {
  let v: string | undefined;
  if (slot === 1) v = row.monster_image_1;
  else if (slot === 2) v = row.monster_image_2;
  else v = (row as TrioComboStat).monster_image_3;
  if (v != null && String(v).trim() !== '') return String(v);
  return undefined;
}

const ROW_SX = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1,
  width: '100%',
  height: DASH_LIST_ROW_PX,
  minHeight: DASH_LIST_ROW_PX,
  maxHeight: DASH_LIST_ROW_PX,
  py: 0,
  px: { xs: 1, sm: 1.25 },
  boxSizing: 'border-box' as const,
  borderRadius: 0,
  borderBottom: '1px solid',
  borderColor: 'divider',
  overflow: 'hidden',
  flexShrink: 0,
  '&:last-of-type': { borderBottom: 'none' },
} as const;

type PanelProps = {
  title: string;
  detailHref: string;
  children: ReactNode;
};

function DashboardPreviewPanel({ title, detailHref, children }: PanelProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <Box
        sx={{
          px: 1.75,
          pt: 1.75,
          pb: 1.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          minHeight: 0,
        }}
      >
        <Typography variant="subtitle2" fontWeight={800} noWrap title={title} sx={{ minWidth: 0 }}>
          {title}
        </Typography>
      </Box>
      <Box
        sx={{
          px: 0,
          py: 0,
          flex: 1,
          minHeight: DASH_LIST_BODY_PX,
          height: DASH_LIST_BODY_PX,
          maxHeight: DASH_LIST_BODY_PX,
          overflow: 'hidden',
        }}
      >
        {children}
      </Box>
      <Box
        sx={{
          px: 1.75,
          py: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Button
          component={Link}
          href={detailHref}
          size="small"
          variant="text"
          endIcon={<ChevronRightIcon sx={{ fontSize: 18 }} />}
          sx={{ fontWeight: 700, px: 0.5 }}
        >
          더보기
        </Button>
      </Box>
    </Paper>
  );
}

function rowSkeletons() {
  return (
    <Stack spacing={0}>
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={DASH_LIST_ROW_PX}
          sx={{ borderRadius: 0, transform: 'none', width: '100%' }}
        />
      ))}
    </Stack>
  );
}

type GridProps = {
  seasonCode: string;
  seasonId: number | null;
  embedded?: boolean;
};

/**
 * 랭크 컷 하단 — 상위 5건, 순위(번호) 없이 한 줄 요약
 */
export default function RtaDashboardLinkListsGrid({ seasonCode, seasonId, embedded = false }: GridProps) {
  const router = useRouter();

  const soloQ = useRtaDashboardPreviewSolo(seasonCode, seasonId, 5);
  const duoQ = useRtaDashboardPreviewDuo(seasonCode, seasonId, 5);
  const trioQ = useRtaDashboardPreviewTrio(seasonCode, seasonId, 5);
  const rankQ = useRtaDashboardPreviewSummoner(seasonCode, seasonId, 5);

  const soloRows = linkPreviewRows<MonsterStats>(soloQ.data, 'solo');
  const duoRows = linkPreviewRows<DuoComboStat>(duoQ.data, 'duo');
  const trioRows = linkPreviewRows<TrioComboStat>(trioQ.data, 'trio');
  const rankRows: RtaSummonerRankingRow[] = rankQ.data?.rankings?.slice(0, 5) ?? [];

  const navigateToProfile = (href: string, openInNewTab = false) => {
    if (openInNewTab && typeof window !== 'undefined') {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    router.push(href);
  };

  const handleRowClick = (e: ReactMouseEvent<HTMLElement>, href: string) => {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey) {
      navigateToProfile(href, true);
      return;
    }
    router.push(href);
  };

  const handleRowAuxClick = (e: ReactMouseEvent<HTMLElement>, href: string) => {
    if (e.button === 1) {
      e.preventDefault();
      navigateToProfile(href, true);
    }
  };

  const handleRowKeyDown = (e: ReactKeyboardEvent<HTMLElement>, href: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigateToProfile(href, e.metaKey || e.ctrlKey);
    }
  };

  return (
    <Box
      component="section"
      aria-label="RTA 몬스터 통계·소환사 랭킹 요약"
      sx={{
        mt: embedded ? 2 : 3,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
        gap: 2,
        width: '100%',
        alignItems: 'stretch',
        '& > *': { minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', height: '100%' },
      }}
    >
      <Box>
      <DashboardPreviewPanel title="솔로 몬스터 통계" detailHref={MONSTER_STATS_PATHS.solo}>
        {soloQ.isPending && !soloQ.data
          ? rowSkeletons()
          : soloQ.error
            ? (
                <Typography color="error" variant="body2">
                  {soloQ.error.message || '불러오지 못했습니다.'}
                </Typography>
              )
            : soloRows.length === 0
              ? (
                  <Typography variant="body2" color="text.secondary">
                    데이터가 없습니다.
                  </Typography>
                )
              : (
                  <Stack component="ul" spacing={0} sx={{ m: 0, p: 0, listStyle: 'none', width: '100%' }}>
                    {soloRows.map((r) => {
                      const href = rtaMonsterDetailHref(r.monster_id) ?? null;
                      const face = (
                        <Avatar
                          src={getRenderableImageUrl(r.monster_image)}
                          alt=""
                          variant="rounded"
                          imgProps={{ loading: 'lazy' as const }}
                          sx={{ width: 36, height: 36, flexShrink: 0, border: '1px solid', borderColor: 'divider' }}
                        />
                      );
                      return (
                        <Box
                          key={r.monster_id ?? r.monster_name}
                          component="li"
                          role={href ? 'link' : undefined}
                          tabIndex={href ? 0 : -1}
                          onClick={href ? (e) => handleRowClick(e, href) : undefined}
                          onAuxClick={href ? (e) => handleRowAuxClick(e, href) : undefined}
                          onKeyDown={href ? (e) => handleRowKeyDown(e, href) : undefined}
                          aria-label={href ? '몬스터 상세' : undefined}
                          sx={[
                            ROW_SX,
                            ...(href
                              ? [
                                  {
                                    cursor: 'pointer' as const,
                                    '&:hover': { bgcolor: 'action.hover' },
                                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
                                  },
                                ]
                              : []),
                          ]}
                        >
                          {face}
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0, textAlign: 'right' }}
                          >
                            {formatMonsterMatchWinLine(toNum(r.pick_count), toNum(r.win_rate))}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
      </DashboardPreviewPanel>
      </Box>

      <Box>
      <DashboardPreviewPanel title="듀오 몬스터 통계" detailHref={MONSTER_STATS_PATHS.duo}>
        {duoQ.isPending && !duoQ.data
          ? rowSkeletons()
          : duoQ.error
            ? (
                <Typography color="error" variant="body2">
                  {duoQ.error.message || '불러오지 못했습니다.'}
                </Typography>
              )
            : duoRows.length === 0
              ? (
                  <Typography variant="body2" color="text.secondary">
                    데이터가 없습니다.
                  </Typography>
                )
              : (
                  <Stack component="ul" spacing={0} sx={{ m: 0, p: 0, listStyle: 'none', width: '100%' }}>
                    {duoRows.map((r) => {
                      const h1 = rtaMonsterDetailHref(r.monster_id_1);
                      const h2 = rtaMonsterDetailHref(r.monster_id_2);
                      const href = (h1 || h2) ?? null;
                      const thumb = (img: string | undefined) => (
                        <Avatar
                          src={getRenderableImageUrl(img)}
                          alt=""
                          variant="rounded"
                          imgProps={{ loading: 'lazy' as const }}
                          sx={{ width: 32, height: 32, border: '1px solid', borderColor: 'divider' }}
                        />
                      );
                      return (
                        <Box
                          key={`${r.monster_id_1}-${r.monster_id_2}`}
                          component="li"
                          role={href ? 'link' : undefined}
                          tabIndex={href ? 0 : -1}
                          onClick={href ? (e) => handleRowClick(e, href) : undefined}
                          onAuxClick={href ? (e) => handleRowAuxClick(e, href) : undefined}
                          onKeyDown={href ? (e) => handleRowKeyDown(e, href) : undefined}
                          aria-label={href ? '몬스터 상세' : undefined}
                          sx={[
                            ROW_SX,
                            ...(href
                              ? [
                                  {
                                    cursor: 'pointer' as const,
                                    '&:hover': { bgcolor: 'action.hover' },
                                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
                                  },
                                ]
                              : []),
                          ]}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, minWidth: 0 }}>
                            {thumb(comboMonsterImageUrl(r, 1))}
                            {thumb(comboMonsterImageUrl(r, 2))}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {formatMonsterMatchWinLine(toNum(r.match_count), toNum(r.win_rate))}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
      </DashboardPreviewPanel>
      </Box>

      <Box>
      <DashboardPreviewPanel title="트리오 몬스터 통계" detailHref={MONSTER_STATS_PATHS.trio}>
        {trioQ.isPending && !trioQ.data
          ? rowSkeletons()
          : trioQ.error
            ? (
                <Typography color="error" variant="body2">
                  {trioQ.error.message || '불러오지 못했습니다.'}
                </Typography>
              )
            : trioRows.length === 0
              ? (
                  <Typography variant="body2" color="text.secondary">
                    데이터가 없습니다.
                  </Typography>
                )
              : (
                  <Stack component="ul" spacing={0} sx={{ m: 0, p: 0, listStyle: 'none', width: '100%' }}>
                    {trioRows.map((r) => {
                      const h1 = rtaMonsterDetailHref(r.monster_id_1);
                      const h2 = rtaMonsterDetailHref(r.monster_id_2);
                      const h3 = rtaMonsterDetailHref(r.monster_id_3);
                      const href = (h1 || h2 || h3) ?? null;
                      const thumb = (slot: 1 | 2 | 3) => {
                        const src = getRenderableImageUrl(comboMonsterImageUrl(r, slot));
                        return (
                          <Avatar
                            src={src}
                            alt=""
                            variant="rounded"
                            imgProps={{ loading: 'lazy' as const }}
                            sx={{ width: 28, height: 28, border: '1px solid', borderColor: 'divider' }}
                          />
                        );
                      };
                      return (
                        <Box
                          key={`${r.monster_id_1}-${r.monster_id_2}-${r.monster_id_3}`}
                          component="li"
                          role={href ? 'link' : undefined}
                          tabIndex={href ? 0 : -1}
                          onClick={href ? (e) => handleRowClick(e, href) : undefined}
                          onAuxClick={href ? (e) => handleRowAuxClick(e, href) : undefined}
                          onKeyDown={href ? (e) => handleRowKeyDown(e, href) : undefined}
                          aria-label={href ? '몬스터 상세' : undefined}
                          sx={[
                            ROW_SX,
                            ...(href
                              ? [
                                  {
                                    cursor: 'pointer' as const,
                                    '&:hover': { bgcolor: 'action.hover' },
                                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
                                  },
                                ]
                              : []),
                          ]}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexShrink: 0, minWidth: 0, flexWrap: 'nowrap' }}>
                            {thumb(1)}
                            {thumb(2)}
                            {thumb(3)}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {formatMonsterMatchWinLine(toNum(r.match_count), toNum(r.win_rate))}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
      </DashboardPreviewPanel>
      </Box>

      <Box>
      <DashboardPreviewPanel title="소환사 랭킹" detailHref={SUMMONER_RANKING_PATH}>
        {rankQ.isPending && !rankQ.data
          ? rowSkeletons()
          : rankQ.error
            ? (
                <Typography color="error" variant="body2">
                  {rankQ.error.message || '불러오지 못했습니다.'}
                </Typography>
              )
            : rankRows.length === 0
              ? (
                  <Typography variant="body2" color="text.secondary">
                    데이터가 없습니다.
                  </Typography>
                )
              : (
                  <Stack component="ul" spacing={0} sx={{ m: 0, p: 0, listStyle: 'none', width: '100%' }}>
                    {rankRows.map((row) => {
                      const wid = row.wizard_id != null ? String(row.wizard_id).trim() : '';
                      const name = (row.wizard_name && String(row.wizard_name).trim() !== '' ? row.wizard_name : wid) || '—';
                      const href = wid ? `/rta/player/${encodeURIComponent(wid)}` : null;
                      const score = toNum(row.score, 0);
                      const c = row.country && String(row.country).trim() !== '' ? String(row.country).trim() : '—';
                      return (
                        <Box
                          key={wid || name}
                          component="li"
                          role={href ? 'link' : undefined}
                          tabIndex={href ? 0 : -1}
                          onClick={href ? (e) => handleRowClick(e, href) : undefined}
                          onAuxClick={href ? (e) => handleRowAuxClick(e, href) : undefined}
                          onKeyDown={href ? (e) => handleRowKeyDown(e, href) : undefined}
                          sx={[
                            ROW_SX,
                            ...(href
                              ? [
                                  {
                                    cursor: 'pointer' as const,
                                    '&:hover': { bgcolor: 'action.hover' },
                                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
                                  },
                                ]
                              : []),
                          ]}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1, mr: 1 }}>
                            <Box
                              component="img"
                              alt=""
                              src={getSwexPlayerImageUrl(row.channel_uid ?? wid ?? null)}
                              loading="lazy"
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                flexShrink: 0,
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            />
                            {c !== '—' && /^[a-z]{2}$/i.test(c) ? (
                              <Box
                                component="img"
                                src={`https://flagcdn.com/w20/${c.toLowerCase()}.png`}
                                alt=""
                                sx={{ width: 18, height: 12, objectFit: 'cover', borderRadius: 0.25, flexShrink: 0 }}
                              />
                            ) : null}
                            <Typography variant="body2" fontWeight={800} noWrap title={wid ? `${name} (${wid})` : name} sx={{ minWidth: 0 }}>
                              {name}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                            <RtaRatingStarIcons rating={row.rating_id != null ? Number(row.rating_id) : undefined} size={12} />
                            <Typography component="span" variant="body2" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {score.toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
      </DashboardPreviewPanel>
      </Box>
    </Box>
  );
}
