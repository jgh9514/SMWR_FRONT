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
import Link from 'next/link';
import { AttributeElementIcon } from '@/shared/ui';
import { getRenderableImageUrl, resolveSkillEffectImageUrl } from '@/shared/utils/image';
import { useMonsterInfoContext } from '@/features/siege/context/MonsterInfoContext';
import { monsterAwakenStepDigit } from '@/features/siege/lib/monsterIdEvolution';
import {
  getMonsterAttribute,
  HEADER_GRADIENT,
  detailContextFrom,
  slimToOption,
  infoToMonsterStub,
} from '@/features/siege/components/MonsterDetailContent';
import type { MonsterSkill, MonsterSkillEffectRow, MonsterStatCohortBounds } from '@/features/siege/hooks/useMonsterInfo';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';
import type { AttributeType } from '@/features/siege/types/monster';

// ── stat color map ────────────────────────────────────────────────────────────

const STAT_META: Record<string, { color: string; icon: string }> = {
  hp:  { color: '#4caf50', icon: '❤️' },
  atk: { color: '#ef5350', icon: '⚔️' },
  def: { color: '#42a5f5', icon: '🛡️' },
  spd: { color: '#26c6da', icon: '💨' },
  cr:  { color: '#ffa726', icon: '🎯' },
  cd:  { color: '#ff7043', icon: '💥' },
  res: { color: '#ab47bc', icon: '🔮' },
  acc: { color: '#66bb6a', icon: '🎲' },
};

// ── helpers ───────────────────────────────────────────────────────────────────

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

const ATTR_KO: Record<AttributeType, string> = { fire: '불', water: '물', wind: '바람', light: '빛', dark: '어둠' };

// ── StatBar ───────────────────────────────────────────────────────────────────

function StatBar({
  statKey, label, value, min, max, pct, suffix,
}: {
  statKey: string; label: string; value: number; min: number; max: number; pct: number; suffix?: string;
}) {
  const meta = STAT_META[statKey] ?? { color: '#90a4ae', icon: '•' };
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr 68px', gap: 1.5, alignItems: 'center', py: 0.65 }}>
      {/* label with color dot */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: meta.color, flexShrink: 0, boxShadow: `0 0 5px ${alpha(meta.color, 0.5)}` }} />
        <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
          {label}
        </Typography>
      </Box>

      {/* bar */}
      <Tooltip title={`Min ${fmt(min)}  —  Max ${fmt(max)}`} placement="top" arrow>
        <Box
          sx={{
            height: 7,
            bgcolor: 'action.hover',
            borderRadius: 4,
            overflow: 'hidden',
            cursor: 'default',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute', left: 0, top: 0,
              height: '100%',
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${meta.color} 0%, ${alpha(meta.color, 0.5)} 100%)`,
              borderRadius: 4,
              transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </Box>
      </Tooltip>

      {/* value */}
      <Typography
        variant="body2"
        fontWeight={700}
        textAlign="right"
        sx={{ fontVariantNumeric: 'tabular-nums', color: meta.color, fontSize: '0.8125rem' }}
      >
        {fmt(value, suffix)}
      </Typography>
    </Box>
  );
}

// ── EvolutionStage ────────────────────────────────────────────────────────────

function EvolutionStage({ label, monster }: { label: string; monster?: MonsterOption }) {
  const isEmpty = !monster?.monster_id;
  return (
    <Box sx={{ textAlign: 'center', minWidth: 56 }}>
      {isEmpty ? (
        <Box
          sx={(t) => ({
            width: 52, height: 52,
            bgcolor: t.palette.action.hover,
            borderRadius: 2,
            mx: 'auto',
            border: '1.5px dashed',
            borderColor: 'divider',
          })}
        />
      ) : (
        <Link href={`/monster-detail/${monster!.monster_id}`} style={{ textDecoration: 'none' }}>
          <Box
            component="img"
            src={getRenderableImageUrl(monster!.image_url)}
            alt={monster!.kr_name}
            sx={(t) => ({
              width: 52, height: 52,
              objectFit: 'contain',
              borderRadius: 2,
              bgcolor: t.palette.action.hover,
              border: '1.5px solid',
              borderColor: 'divider',
              display: 'block',
              mx: 'auto',
              transition: 'transform 0.15s, box-shadow 0.15s',
              '&:hover': { transform: 'scale(1.08)', boxShadow: 3 },
            })}
          />
        </Link>
      )}
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5, fontSize: '0.68rem', letterSpacing: 0.3 }}>
        {label}
      </Typography>
      {!isEmpty && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, fontSize: '0.7rem', lineHeight: 1.2, mt: 0.15 }}>
          {monster!.kr_name}
        </Typography>
      )}
    </Box>
  );
}

// ── SkillCard ─────────────────────────────────────────────────────────────────

function SkillCard({ skill, isLeader = false, leaderDesc = '', leaderIcon }: { skill?: MonsterSkill; isLeader?: boolean; leaderDesc?: string; leaderIcon?: string }) {
  const [open, setOpen] = useState(false);
  if (isLeader) {
    const iconSrc = leaderIcon ? getRenderableImageUrl(leaderIcon) : '/images/default-monster.png';
    return (
      <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              component="img"
              src={iconSrc}
              alt=""
              sx={{ width: 52, height: 52, flexShrink: 0, borderRadius: 1.5, bgcolor: 'action.hover', objectFit: 'contain', border: '1px solid', borderColor: 'divider' }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={800}>리더 스킬</Typography>
                <Chip label="리더" size="small" color="warning" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.8125rem' }}>{leaderDesc}</Typography>
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
        borderColor: isAwaken ? (t.palette.mode === 'dark' ? 'primary.dark' : 'primary.light') : 'divider',
      })}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          {/* skill icon */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Box
              component="img"
              src={iconSrc}
              alt=""
              sx={{
                width: 52, height: 52,
                borderRadius: 1.5,
                objectFit: 'contain',
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            {isAwaken && (
              <Box
                sx={{
                  position: 'absolute', bottom: -4, right: -4,
                  width: 18, height: 18,
                  bgcolor: 'primary.main',
                  borderRadius: '50%',
                  border: '1.5px solid',
                  borderColor: 'background.paper',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <StarIcon sx={{ fontSize: 11, color: '#fff' }} />
              </Box>
            )}
          </Box>

          {/* content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* badges row */}
            {effects.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 0.75 }}>
                {effects.slice(0, 6).map((ef) => {
                  const url = resolveSkillEffectImageUrl(ef);
                  const label = ef.effect_name?.trim() || ef.effectName?.trim() || (ef.effect_id != null ? `#${ef.effect_id}` : 'FX');
                  const title = ef.effect_description?.trim() || ef.effect_remark?.trim() || ef.effectRemark?.trim() || label;
                  const key = `${ef.skill_id}-${ef.effect_id}-${ef.effect_order}`;
                  if (url) {
                    return (
                      <Tooltip key={key} title={title} placement="top" arrow>
                        <Box
                          sx={{
                            width: 22, height: 22,
                            backgroundImage: `url(${url})`,
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            flexShrink: 0,
                            cursor: 'default',
                          }}
                        />
                      </Tooltip>
                    );
                  }
                  return (
                    <Chip key={key} size="small" label={label} title={title}
                      sx={{ height: 18, fontSize: '0.6rem', color: '#fff', bgcolor: '#052576', '& .MuiChip-label': { px: 0.75 } }}
                    />
                  );
                })}
                {effects.length > 6 && (
                  <Typography variant="caption" color="text.disabled" sx={{ alignSelf: 'center' }}>+{effects.length - 6}</Typography>
                )}
              </Stack>
            )}

            {/* skill name + type */}
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.3 }}>{skill.skill_name}</Typography>
              {isAwaken && <Chip label="각성" size="small" color="primary" sx={{ height: 17, fontSize: '0.6rem', fontWeight: 700 }} />}
              {isPassive && <Chip label="패시브" size="small" sx={{ height: 17, fontSize: '0.6rem' }} />}
            </Stack>

            {/* description */}
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.8125rem' }}>
              {skill.skill_description}
            </Typography>

            {skill.remark && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>{skill.remark}</Typography>
            )}
            {skill.multiplier_formula && (
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace' }}>
                배율: {skill.multiplier_formula}
              </Typography>
            )}

            {/* level up expand */}
            {levelLines.length > 0 && (
              <Box sx={{ mt: 0.75 }}>
                <Stack direction="row" alignItems="center" spacing={0.25} sx={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setOpen((v) => !v)}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>스킬 강화 ({levelLines.length}단계)</Typography>
                  <IconButton size="small" sx={{ p: 0.25 }}>
                    <ExpandMoreIcon sx={{ fontSize: 14, transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                  </IconButton>
                </Stack>
                <Collapse in={open}>
                  <Box sx={{ mt: 0.5, pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                    {levelLines.map((line, i) => (
                      <Typography key={i} variant="caption" component="div" color="text.secondary" sx={{ lineHeight: 1.55 }}>{line}</Typography>
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

// ── main ──────────────────────────────────────────────────────────────────────

export default function MonsterDetailStatClient() {
  const { monsterInfo, devilmonImageUrl } = useMonsterInfoContext();
  const {
    monster_id, kr_name, un_name, monster_elemental, star, arousal_type, image_url,
    max_lvl_hp, max_lvl_attack, max_lvl_defense, speed, crit_rate, crit_damage, resistance, accuracy,
    base_hp, base_attack, base_defense, raw_hp, raw_attack, raw_defense,
    leader_skill_description, leader_icon, skills, archetype, natural_stars, awaken_bonus,
    skill_ups_to_max, family_id,
  } = monsterInfo;

  const attr = getMonsterAttribute(monster_elemental);
  const starCount = natural_stars != null && natural_stars > 0 ? Math.min(6, natural_stars) : Math.min(6, star ?? 0);

  const awakenStep = monsterAwakenStepDigit(monster_id) ?? 0;
  const stub = infoToMonsterStub(monsterInfo);
  const dctx = detailContextFrom(monsterInfo);
  const ev = dctx?.evolution;
  const normalM  = slimToOption(ev?.normal)           ?? (awakenStep === 0 ? stub : undefined);
  const awakenM  = slimToOption(ev?.awakened)         ?? (awakenStep === 1 ? stub : undefined);
  const secondM  = slimToOption(ev?.second_awakening) ?? (awakenStep === 2 ? stub : undefined);
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

    const hp  = rowWithCohort(statCohort, 'cohort_min_hp',         'cohort_max_hp',         max_lvl_hp,    Math.min(base_hp, raw_hp),       Math.max(max_lvl_hp, raw_hp),       hpPct);
    const atk = rowWithCohort(statCohort, 'cohort_min_attack',     'cohort_max_attack',     max_lvl_attack, Math.min(base_attack, raw_attack), Math.max(max_lvl_attack, raw_attack), atkPct);
    const def = rowWithCohort(statCohort, 'cohort_min_defense',    'cohort_max_defense',    max_lvl_defense,Math.min(base_defense, raw_defense),Math.max(max_lvl_defense, raw_defense),defPct);
    const spd = rowWithCohort(statCohort, 'cohort_min_speed',      'cohort_max_speed',      speed,          spdLo, spdHi, spdPct);
    const cr  = rowWithCohort(statCohort, 'cohort_min_crit_rate',  'cohort_max_crit_rate',  crit_rate,      15,    30,    crPct);
    const cd  = rowWithCohort(statCohort, 'cohort_min_crit_damage','cohort_max_crit_damage',crit_damage,    50,    50,    cdPct);
    const res = rowWithCohort(statCohort, 'cohort_min_resistance', 'cohort_max_resistance', resistance,     15,    40,    resPct);
    const acc = rowWithCohort(statCohort, 'cohort_min_accuracy',   'cohort_max_accuracy',   accuracy,       0,     25,    accPct);

    return [
      { key: 'hp',  label: 'HP',          value: max_lvl_hp,      ...hp,  suffix: undefined as string | undefined },
      { key: 'atk', label: 'Attack',      value: max_lvl_attack,  ...atk, suffix: undefined as string | undefined },
      { key: 'def', label: 'Defense',     value: max_lvl_defense, ...def, suffix: undefined as string | undefined },
      { key: 'spd', label: 'Speed',       value: speed,           ...spd, suffix: undefined as string | undefined },
      { key: 'cr',  label: 'Crit Rate',   value: crit_rate,       ...cr,  suffix: '%' as string | undefined },
      { key: 'cd',  label: 'Crit Dmg',    value: crit_damage,     ...cd,  suffix: '%' as string | undefined },
      { key: 'res', label: 'Resistance',  value: resistance,      ...res, suffix: '%' as string | undefined },
      { key: 'acc', label: 'Accuracy',    value: accuracy,        ...acc, suffix: '%' as string | undefined },
    ];
  }, [base_hp, max_lvl_hp, raw_hp, base_attack, max_lvl_attack, raw_attack, base_defense, max_lvl_defense, raw_defense, speed, crit_rate, crit_damage, resistance, accuracy, statCohort]);

  const sortedSkills = useMemo(
    () => [...(skills ?? [])].sort((a, b) => monsterSkillOrder(a) - monsterSkillOrder(b)),
    [skills],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>

      {/* ── Evolution quick-links ── */}
      {(normalM || awakenM || secondM) && (
        <Box
          sx={(t) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            p: 1.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            width: 'fit-content',
          })}
        >
          <Typography variant="caption" fontWeight={600} color="text.disabled" sx={{ letterSpacing: 0.4 }}>
            진화
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <EvolutionStage label="노말" monster={normalM} />
            <EvolutionStage label="1차 각성" monster={awakenM} />
            {secondM && <EvolutionStage label="2차 각성" monster={secondM} />}
          </Stack>
        </Box>
      )}

      {/* ── Info + Stats + Skills grid ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: { xs: 2, md: 3 }, alignItems: 'start' }}>

        {/* ── Left column: portrait + info + stats ── */}
        <Stack spacing={2}>

          {/* portrait card */}
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {/* portrait with attribute gradient background */}
            <Box
              sx={{
                background: attr
                  ? HEADER_GRADIENT[attr]
                  : 'linear-gradient(135deg, #37474f 0%, #546e7a 100%)',
                py: 2.5,
                display: 'flex',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* subtle overlay */}
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.25) 100%)', pointerEvents: 'none' }} />
              <Box
                component="img"
                src={getRenderableImageUrl(image_url)}
                alt={kr_name}
                sx={{
                  position: 'relative',
                  width: 120,
                  height: 120,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.45))',
                }}
              />
            </Box>

            {/* info rows */}
            <Box sx={{ p: 2 }}>
              <Stack spacing={0} divider={<Divider sx={{ opacity: 0.5 }} />}>
                <InfoLine label="이름" value={kr_name} bold />
                {un_name && un_name !== kr_name && <InfoLine label="영문" value={un_name} />}
                <InfoLine label="속성">
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    {attr && <AttributeElementIcon attribute={attr} size={14} />}
                    <Typography variant="body2">{attr ? ATTR_KO[attr] : monster_elemental}</Typography>
                  </Stack>
                </InfoLine>
                {archetype && <InfoLine label="아키타입" value={archetype} />}
                {family_id != null && String(family_id).trim() && <InfoLine label="가문" value={String(family_id)} />}
                <InfoLine label="별">
                  <Stack direction="row" spacing={0.2}>
                    {Array.from({ length: starCount }).map((_, i) => <StarIcon key={i} sx={{ fontSize: 15, color: '#FFDD33' }} />)}
                  </Stack>
                </InfoLine>
                {arousal_type && <InfoLine label="각성 단계" value={arousal_type} />}
                <InfoLine label="최대 스킬업">
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box component="img" src={devilmonImageUrl} alt="" sx={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 0.5 }} />
                    <Typography variant="body2" fontWeight={700}>×{skillUpsTotal}</Typography>
                  </Stack>
                </InfoLine>
              </Stack>

              {awaken_bonus && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    각성 보너스
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.8125rem' }}>{awaken_bonus}</Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* stats card */}
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800}>Base Stats (Lv.Max)</Typography>
              {statCohort && (
                <Tooltip title="막대 구간은 같은 별·각성 단계 몬스터 중 최솟값~최댓값입니다. 호버하면 수치를 확인할 수 있습니다." placement="top" arrow>
                  <Typography variant="caption" color="text.disabled" sx={{ cursor: 'default', textDecoration: 'underline dotted' }}>vs cohort</Typography>
                </Tooltip>
              )}
            </Stack>
            <Divider sx={{ mb: 1 }} />
            {statRows.map((row) => (
              <StatBar key={row.key} statKey={row.key} label={row.label} value={row.value} min={row.min} max={row.max} pct={row.pct} suffix={row.suffix} />
            ))}
          </Paper>
        </Stack>

        {/* ── Right column: skills ── */}
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={800}>
              스킬
              {(() => {
                const n = (leader_skill_description ? 1 : 0) + (sortedSkills.length);
                return n > 0 ? <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.75, fontWeight: 400 }}>{n}개</Typography> : null;
              })()}
            </Typography>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.5,
            }}
          >
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

// ── InfoLine (small helper) ───────────────────────────────────────────────────

function InfoLine({
  label,
  value,
  bold,
  children,
}: {
  label: string;
  value?: string;
  bold?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 0.6 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ flexShrink: 0 }}>{label}</Typography>
      {children ?? (
        <Typography variant="body2" fontWeight={bold ? 700 : 400} textAlign="right" sx={{ minWidth: 0 }}>{value}</Typography>
      )}
    </Box>
  );
}
