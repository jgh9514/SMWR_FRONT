'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';

import { alpha } from '@mui/material/styles';
import StarIcon from '@mui/icons-material/Star';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getRenderableImageUrl, resolveSkillEffectImageUrl } from '@/shared/utils/image';
import { useMonsterInfoContext } from '@/features/siege/context/MonsterInfoContext';
import { detailContextFrom } from '@/features/siege/components/MonsterDetailContent';
import type { MonsterSkill, MonsterSkillEffectRow, MonsterStatCohortBounds } from '@/features/siege/hooks/useMonsterInfo';

const STAT_META: Record<string, { color: string }> = {
  hp:  { color: '#4caf50' },
  atk: { color: '#ef5350' },
  def: { color: '#42a5f5' },
  spd: { color: '#26c6da' },
  cr:  { color: '#ffa726' },
  cd:  { color: '#ff7043' },
  res: { color: '#ab47bc' },
  acc: { color: '#66bb6a' },
};

function fmt(value: number, suffix?: string): string {
  const s = new Intl.NumberFormat('ko-KR').format(value);
  return suffix ? `${s}${suffix}` : s;
}

function barPercentTriplet(base: number, maxLvl: number, raw: number) {
  const hi = Math.max(maxLvl, raw, base);
  const lo = Math.min(base, maxLvl);
  if (hi <= lo) return 100;
  return Math.min(100, Math.max(0, ((maxLvl - lo) / (hi - lo)) * 100));
}

function barPercentRatio(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

function pctInCohort(value: number, min: number, max: number) {
  if (max <= min) return 100;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function rowWithCohort(
  cohort: MonsterStatCohortBounds | null | undefined,
  cMinKey: keyof MonsterStatCohortBounds,
  cMaxKey: keyof MonsterStatCohortBounds,
  value: number,
  fbMin: number,
  fbMax: number,
  fbPct: number,
) {
  const lo = cohort?.[cMinKey];
  const hi = cohort?.[cMaxKey];
  if (lo != null && hi != null && typeof lo === 'number' && typeof hi === 'number' && hi >= lo) {
    return { min: lo, max: hi, pct: pctInCohort(value, lo, hi) };
  }
  return { min: fbMin, max: fbMax, pct: fbPct };
}

function sumSkillUps(skills: MonsterSkill[] | undefined) {
  if (!skills?.length) return 0;
  return skills.reduce((acc, s) => {
    const ml = s.max_level;
    if (ml == null || Number.isNaN(Number(ml))) return acc;
    return acc + Math.max(0, Number(ml) - 1);
  }, 0);
}

function monsterSkillOrder(s: MonsterSkill) {
  const slot = s.slot;
  if (slot != null && !Number.isNaN(Number(slot))) return Number(slot);
  const v = s.skill_order ?? s.skillOrder;
  return v == null || Number.isNaN(Number(v)) ? 999 : Number(v);
}

function effectOrder(e: MonsterSkillEffectRow) {
  const v = e.effect_order ?? e.effectOrder;
  return v == null || Number.isNaN(Number(v)) ? 999 : Number(v);
}

function parseSkillLevelLines(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const s = raw.trim();
  try {
    const p = JSON.parse(s) as unknown;
    if (Array.isArray(p)) return p.map(String);
    if (typeof p === 'string') return [p];
  } catch { /* noop */ }
  return s.split(/\r?\n/).filter(Boolean);
}

// ── StatBar ────────────────────────────────────────────────────────────────────

function StatBar({
  statKey, label, value, min, max, pct, suffix,
}: {
  statKey: string; label: string; value: number; min: number; max: number; pct: number; suffix?: string;
}) {
  const meta = STAT_META[statKey] ?? { color: '#90a4ae' };
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '72px 1fr 58px', sm: '80px 1fr 64px' }, gap: { xs: 1, sm: 1.25 }, alignItems: 'center', py: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{
          width: 6, height: 6, borderRadius: '50%', bgcolor: meta.color, flexShrink: 0,
          boxShadow: `0 0 4px ${alpha(meta.color, 0.55)}`,
        }} />
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
          {label}
        </Typography>
      </Box>
      <Tooltip title={`Min ${fmt(min)}  —  Max ${fmt(max)}`} placement="top" arrow>
        <Box sx={{ height: 6, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden', cursor: 'default', position: 'relative' }}>
          <Box sx={{
            position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`,
            background: `linear-gradient(90deg, ${meta.color} 0%, ${alpha(meta.color, 0.55)} 100%)`,
            borderRadius: 4,
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </Box>
      </Tooltip>
      <Typography variant="caption" fontWeight={700} textAlign="right"
        sx={{ fontVariantNumeric: 'tabular-nums', color: meta.color, fontSize: '0.8rem', letterSpacing: '-0.01em' }}>
        {fmt(value, suffix)}
      </Typography>
    </Box>
  );
}

// ── SkillCard ──────────────────────────────────────────────────────────────────

function SkillCard({ skill, isLeader = false, leaderDesc = '', leaderIcon }: {
  skill?: MonsterSkill; isLeader?: boolean; leaderDesc?: string; leaderIcon?: string;
}) {
  const [open, setOpen] = useState(false);

  if (isLeader) {
    const iconSrc = leaderIcon ? getRenderableImageUrl(leaderIcon) : '/images/default-monster.png';
    return (
      <Card variant="outlined" sx={(t) => ({ borderRadius: 0, height: '100%', bgcolor: t.palette.mode === 'dark' ? 'transparent' : 'common.white' })}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box component="img" src={iconSrc} alt=""
              sx={{ width: 48, height: 48, flexShrink: 0, borderRadius: 0, bgcolor: 'action.hover', objectFit: 'contain', border: '1px solid', borderColor: 'divider' }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: '0.85rem' }}>리더 스킬</Typography>
                <Chip label="리더" size="small" color="warning"
                  sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700, '& .MuiChip-label': { px: 0.75 } }} />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, fontSize: '0.8125rem' }}>
                {leaderDesc}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!skill) return null;
  const levelLines = parseSkillLevelLines(skill.level_progress_description);
  const effects = [...(skill.effects ?? [])].sort((a, b) => effectOrder(a) - effectOrder(b));
  const iconSrc = (skill.icon_path || skill.iconPath)
    ? getRenderableImageUrl(skill.icon_path || skill.iconPath || '')
    : '/images/default-monster.png';
  const isAwaken = skill.slot === 3;
  const isPassive = /패시브|passive/i.test(skill.skill_description ?? '');

  return (
    <Card
      variant="outlined"
      sx={(t) => ({
        borderRadius: 2,
        height: '100%',
        borderColor: isAwaken ? alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.4 : 0.35) : 'divider',
        bgcolor: t.palette.mode === 'dark'
          ? (isAwaken ? alpha(t.palette.primary.main, 0.05) : 'transparent')
          : 'common.white',
      })}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          {/* icon */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Box component="img" src={iconSrc} alt=""
              sx={{
                width: 48, height: 48,
                borderRadius: 1.5,
                objectFit: 'contain',
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            {isAwaken && (
              <Box sx={{
                position: 'absolute', bottom: -3, right: -3,
                width: 16, height: 16,
                bgcolor: 'primary.main',
                borderRadius: '50%',
                border: '1.5px solid',
                borderColor: 'background.paper',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <StarIcon sx={{ fontSize: 9, color: '#fff' }} />
              </Box>
            )}
          </Box>

          {/* body */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* effect icons */}
            {effects.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 0.6 }}>
                {effects.slice(0, 6).map((ef) => {
                  const url = resolveSkillEffectImageUrl(ef);
                  const label = ef.effect_name?.trim() || ef.effectName?.trim() || (ef.effect_id != null ? `#${ef.effect_id}` : 'FX');
                  const title = ef.effect_description?.trim() || ef.effect_remark?.trim() || ef.effectRemark?.trim() || label;
                  const key = `${ef.skill_id}-${ef.effect_id}-${ef.effect_order}`;
                  if (url) {
                    return (
                      <Tooltip key={key} title={title} placement="top" arrow>
                        <Box sx={{ width: 20, height: 20, backgroundImage: `url(${url})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', flexShrink: 0, cursor: 'default' }} />
                      </Tooltip>
                    );
                  }
                  return (
                    <Chip key={key} size="small" label={label} title={title}
                      sx={{ height: 17, fontSize: '0.6rem', color: '#fff', bgcolor: '#052576', '& .MuiChip-label': { px: 0.6 } }} />
                  );
                })}
                {effects.length > 6 && (
                  <Typography variant="caption" color="text.disabled" sx={{ alignSelf: 'center', fontSize: '0.68rem' }}>+{effects.length - 6}</Typography>
                )}
              </Stack>
            )}

            {/* name + badges */}
            <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" sx={{ mb: 0.4 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: '0.85rem', lineHeight: 1.3 }}>
                {skill.skill_name}
              </Typography>
              {isAwaken && <Chip label="각성" size="small" color="primary" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, '& .MuiChip-label': { px: 0.6 } }} />}
              {isPassive && <Chip label="패시브" size="small" sx={{ height: 16, fontSize: '0.58rem', '& .MuiChip-label': { px: 0.6 } }} />}
            </Stack>

            {/* description */}
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, fontSize: '0.8125rem' }}>
              {skill.skill_description}
            </Typography>

            {skill.remark && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.4 }}>{skill.remark}</Typography>
            )}
            {skill.multiplier_formula && (
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.4, fontFamily: 'monospace', fontSize: '0.72rem' }}>
                배율: {skill.multiplier_formula}
              </Typography>
            )}

            {/* level up lines */}
            {levelLines.length > 0 && (
              <Box sx={{ mt: 0.75 }}>
                <Stack direction="row" alignItems="center" spacing={0.25} sx={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setOpen((v) => !v)}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.72rem' }}>
                    스킬 강화 ({levelLines.length}단계)
                  </Typography>
                  <IconButton size="small" aria-expanded={open} aria-label="스킬 강화 상세 펼치기" sx={{ p: 0.2 }}>
                    <ExpandMoreIcon sx={{ fontSize: 13, transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                  </IconButton>
                </Stack>
                <Collapse in={open}>
                  <Box sx={{ mt: 0.5, pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                    {levelLines.map((line, i) => (
                      <Typography key={i} variant="caption" component="div" color="text.secondary" sx={{ lineHeight: 1.55, fontSize: '0.75rem' }}>{line}</Typography>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── main ───────────────────────────────────────────────────────────────────────

export default function MonsterDetailStatClient() {
  const { monsterInfo, devilmonImageUrl } = useMonsterInfoContext();
  const {
    monster_id,
    max_lvl_hp, max_lvl_attack, max_lvl_defense, speed, crit_rate, crit_damage, resistance, accuracy,
    base_hp, base_attack, base_defense, raw_hp, raw_attack, raw_defense,
    leader_skill_description, leader_icon, skills,
    awaken_bonus, skill_ups_to_max,
  } = monsterInfo;

  const dctx = detailContextFrom(monsterInfo);
  const statCohort = dctx?.stat_cohort;

  const skillUpsTotal = skill_ups_to_max != null && !Number.isNaN(Number(skill_ups_to_max))
    ? Number(skill_ups_to_max) : sumSkillUps(skills);

  const statRows = useMemo(() => {
    const hpPct  = barPercentTriplet(base_hp, max_lvl_hp, raw_hp);
    const atkPct = barPercentTriplet(base_attack, max_lvl_attack, raw_attack);
    const defPct = barPercentTriplet(base_defense, max_lvl_defense, raw_defense);
    const spdLo = 86, spdHi = 126;
    const spdPct = Math.min(100, Math.max(0, ((speed - spdLo) / Math.max(1, spdHi - spdLo)) * 100));
    const crPct  = Math.min(100, Math.max(0, ((crit_rate - 15) / 15) * 100));
    const cdPct  = crit_damage >= 50 ? 100 : Math.min(100, (crit_damage / 50) * 100);
    const resPct = Math.min(100, Math.max(0, ((resistance - 15) / 25) * 100));
    const accPct = barPercentRatio(accuracy, 25);

    const hp  = rowWithCohort(statCohort, 'cohort_min_hp',          'cohort_max_hp',          max_lvl_hp,     Math.min(base_hp, raw_hp),        Math.max(max_lvl_hp, raw_hp),        hpPct);
    const atk = rowWithCohort(statCohort, 'cohort_min_attack',      'cohort_max_attack',      max_lvl_attack,  Math.min(base_attack, raw_attack),  Math.max(max_lvl_attack, raw_attack),  atkPct);
    const def = rowWithCohort(statCohort, 'cohort_min_defense',     'cohort_max_defense',     max_lvl_defense, Math.min(base_defense, raw_defense), Math.max(max_lvl_defense, raw_defense), defPct);
    const spd = rowWithCohort(statCohort, 'cohort_min_speed',       'cohort_max_speed',       speed,           spdLo, spdHi, spdPct);
    const cr  = rowWithCohort(statCohort, 'cohort_min_crit_rate',   'cohort_max_crit_rate',   crit_rate,       15,    30,    crPct);
    const cd  = rowWithCohort(statCohort, 'cohort_min_crit_damage', 'cohort_max_crit_damage', crit_damage,     50,    50,    cdPct);
    const res = rowWithCohort(statCohort, 'cohort_min_resistance',  'cohort_max_resistance',  resistance,      15,    40,    resPct);
    const acc = rowWithCohort(statCohort, 'cohort_min_accuracy',    'cohort_max_accuracy',    accuracy,        0,     25,    accPct);

    return [
      { key: 'hp',  label: 'HP',         value: max_lvl_hp,     ...hp,  suffix: undefined as string | undefined },
      { key: 'atk', label: 'Attack',     value: max_lvl_attack, ...atk, suffix: undefined as string | undefined },
      { key: 'def', label: 'Defense',    value: max_lvl_defense,...def, suffix: undefined as string | undefined },
      { key: 'spd', label: 'Speed',      value: speed,          ...spd, suffix: undefined as string | undefined },
      { key: 'cr',  label: 'Crit Rate',  value: crit_rate,      ...cr,  suffix: '%' as string | undefined },
      { key: 'cd',  label: 'Crit Dmg',   value: crit_damage,    ...cd,  suffix: '%' as string | undefined },
      { key: 'res', label: 'Resistance', value: resistance,     ...res, suffix: '%' as string | undefined },
      { key: 'acc', label: 'Accuracy',   value: accuracy,       ...acc, suffix: '%' as string | undefined },
    ];
  }, [base_hp, max_lvl_hp, raw_hp, base_attack, max_lvl_attack, raw_attack, base_defense, max_lvl_defense, raw_defense, speed, crit_rate, crit_damage, resistance, accuracy, statCohort]);

  const sortedSkills = useMemo(
    () => [...(skills ?? [])].sort((a, b) => monsterSkillOrder(a) - monsterSkillOrder(b)),
    [skills],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

      {/* ── Stats + Skills ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 280px) 1fr' }, gap: { xs: 2, md: 3 }, alignItems: 'start' }}>

        {/* 왼쪽: Stats */}
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: '0.825rem' }}>
              Base Stats <Typography component="span" variant="caption" color="text.disabled">(Lv.Max)</Typography>
            </Typography>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          {statRows.map((row) => (
            <StatBar key={row.key} statKey={row.key} label={row.label} value={row.value} min={row.min} max={row.max} pct={row.pct} suffix={row.suffix} />
          ))}

          {/* 부가 정보 */}
          {(skillUpsTotal > 0 || awaken_bonus) && (
            <>
              <Divider sx={{ mt: 1.5, mb: 1.5 }} />
              <Stack spacing={0.75}>
                {skillUpsTotal > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.72rem' }}>최대 스킬업</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Box component="img" src={devilmonImageUrl} alt="" sx={{ width: 16, height: 16, objectFit: 'contain', borderRadius: 0.5 }} />
                      <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.78rem' }}>×{skillUpsTotal}</Typography>
                    </Stack>
                  </Box>
                )}
              </Stack>
            </>
          )}

          {awaken_bonus && (
            <Box sx={(t) => ({
              mt: 1.5,
              pt: 1.25,
              px: 1.25,
              pb: 1.25,
              borderRadius: 1.5,
              bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              border: '1px solid',
              borderColor: 'divider',
            })}>
              <Typography variant="caption" fontWeight={700} color="primary.main"
                sx={{ display: 'block', mb: 0.4, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.67rem' }}>
                각성 보너스
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.78rem', display: 'block' }}>
                {awaken_bonus}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* 오른쪽: Skills */}
        <Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            {leader_skill_description && (
              <SkillCard isLeader leaderDesc={leader_skill_description} leaderIcon={leader_icon ?? undefined} />
            )}
            {sortedSkills.map((skill) => (
              <SkillCard key={skill.skill_id} skill={skill} />
            ))}
          </Box>

          {!leader_skill_description && sortedSkills.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>스킬 정보가 없습니다.</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
