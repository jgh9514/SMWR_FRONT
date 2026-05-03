'use client';

import { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
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

// ── helpers ───────────────────────────────────────────────────────────────────

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function barPercentTriplet(base: number, maxLvl: number, raw: number): number {
  const hi = Math.max(maxLvl, raw, base);
  const lo = Math.min(base, maxLvl);
  if (hi <= lo) return 100;
  return Math.min(100, Math.max(0, ((maxLvl - lo) / (hi - lo)) * 100));
}

function barPercentRatio(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

function pctInCohort(value: number, min: number, max: number): number {
  if (max <= min) return 100;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function rowWithCohort(
  cohort: MonsterStatCohortBounds | null | undefined,
  cMinKey: keyof MonsterStatCohortBounds,
  cMaxKey: keyof MonsterStatCohortBounds,
  value: number,
  fallbackMin: number,
  fallbackMax: number,
  fallbackPct: number,
): { min: number; max: number; pct: number } {
  const lo = cohort?.[cMinKey];
  const hi = cohort?.[cMaxKey];
  if (lo != null && hi != null && typeof lo === 'number' && typeof hi === 'number' && hi >= lo) {
    return { min: lo, max: hi, pct: pctInCohort(value, lo, hi) };
  }
  return { min: fallbackMin, max: fallbackMax, pct: fallbackPct };
}

function sumSkillUps(skills: MonsterSkill[] | undefined): number {
  if (!skills?.length) return 0;
  return skills.reduce((acc, s) => {
    const ml = s.max_level;
    if (ml == null || Number.isNaN(Number(ml))) return acc;
    return acc + Math.max(0, Number(ml) - 1);
  }, 0);
}

function monsterSkillDisplayOrder(s: MonsterSkill): number {
  const slot = s.slot;
  if (slot != null && !Number.isNaN(Number(slot))) return Number(slot);
  const v = s.skill_order ?? s.skillOrder;
  if (v == null || Number.isNaN(Number(v))) return 999;
  return Number(v);
}

function monsterEffectDisplayOrder(e: MonsterSkillEffectRow): number {
  const v = e.effect_order ?? e.effectOrder;
  if (v == null || Number.isNaN(Number(v))) return 999;
  return Number(v);
}

function parseSkillLevelLines(raw: string | null | undefined): string[] {
  if (raw == null || String(raw).trim() === '') return [];
  const s = String(raw).trim();
  try {
    const parsed = JSON.parse(s) as unknown;
    if (Array.isArray(parsed)) return parsed.map((x) => String(x));
    if (typeof parsed === 'string') return [parsed];
  } catch {
    /* JSON 아님 */
  }
  return s.split(/\r?\n/).filter(Boolean);
}

const attributeLabelsKo: Record<AttributeType, string> = {
  fire: '불', water: '물', wind: '바람', light: '빛', dark: '어둠',
};
const attributeLabelsEn: Record<AttributeType, string> = {
  fire: 'Fire', water: 'Water', wind: 'Wind', light: 'Light', dark: 'Dark',
};

// ── sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, fontSize: '0.8125rem', py: 0.4 }}>
      <Typography component="span" fontWeight={700} sx={{ fontSize: '0.8125rem' }}>{label}:</Typography>
      <Box sx={{ textAlign: 'right', minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

function StatBarCell({ value, min, max, pct, suffix, formatMinMax }: {
  value: number; min: number; max: number; pct: number; suffix?: string; formatMinMax?: boolean;
}) {
  const display = suffix !== undefined ? `${formatNumber(value)}${suffix}` : formatNumber(value);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
      <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>{display}</Typography>
      <Box sx={{ width: '100%', maxWidth: 120, height: 6, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 3, transition: 'width 0.4s' }} />
      </Box>
      {formatMinMax !== false ? (
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', fontVariantNumeric: 'tabular-nums' }}>
          {formatNumber(min)} ~ {formatNumber(max)}
        </Typography>
      ) : null}
    </Box>
  );
}

function EvolutionStage({ label, monster }: { label: string; monster?: MonsterOption }) {
  if (!monster?.monster_id) {
    return (
      <Box sx={{ textAlign: 'center', width: 88 }}>
        <Box sx={{ width: 72, height: 72, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1, mx: 'auto', border: '1px dashed rgba(255,255,255,0.5)' }} />
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.9, color: 'inherit' }}>{label}</Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ textAlign: 'center', width: 88 }}>
      <Link href={`/monster-detail/${monster.monster_id}`} style={{ textDecoration: 'none' }}>
        <Box
          component="img"
          src={getRenderableImageUrl(monster.image_url)}
          alt={monster.kr_name}
          sx={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 1, bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', transition: 'transform 0.15s', '&:hover': { transform: 'scale(1.07)' } }}
        />
      </Link>
      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#fff', opacity: 0.9 }}>{label}</Typography>
      <Typography variant="caption" sx={{ display: 'block', color: '#fff', opacity: 0.75, fontSize: '0.65rem' }}>{monster.kr_name}</Typography>
    </Box>
  );
}

// ── main component ────────────────────────────────────────────────────────────

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
  const headerGradient = attr != null ? HEADER_GRADIENT[attr] : 'linear-gradient(135deg, #455a64 0%, #90a4ae 100%)';
  const naturalStarCount = natural_stars != null && natural_stars > 0 ? Math.min(6, natural_stars) : Math.min(6, star ?? 0);

  const awakenStep = monsterAwakenStepDigit(monster_id) ?? 0;
  const stub = infoToMonsterStub(monsterInfo);
  const dctx = detailContextFrom(monsterInfo);
  const ev = dctx?.evolution;
  const normalM = slimToOption(ev?.normal) ?? (awakenStep === 0 ? stub : undefined);
  const awakenedM = slimToOption(ev?.awakened) ?? (awakenStep === 1 ? stub : undefined);
  const secondM = slimToOption(ev?.second_awakening) ?? (awakenStep === 2 ? stub : undefined);

  const skillUpsTotal = skill_ups_to_max != null && !Number.isNaN(Number(skill_ups_to_max))
    ? Number(skill_ups_to_max) : sumSkillUps(skills);

  const statCohort = dctx?.stat_cohort;

  const statRows = useMemo(() => {
    const hpPct = barPercentTriplet(base_hp, max_lvl_hp, raw_hp);
    const atkPct = barPercentTriplet(base_attack, max_lvl_attack, raw_attack);
    const defPct = barPercentTriplet(base_defense, max_lvl_defense, raw_defense);
    const spdLo = 86, spdHi = 126;
    const spdPct = Math.min(100, Math.max(0, ((speed - spdLo) / Math.max(1, spdHi - spdLo)) * 100));
    const crPct = Math.min(100, Math.max(0, ((crit_rate - 15) / 15) * 100));
    const cdPct = crit_damage >= 50 ? 100 : Math.min(100, (crit_damage / 50) * 100);
    const resPct = Math.min(100, Math.max(0, ((resistance - 15) / 25) * 100));
    const accPct = barPercentRatio(accuracy, 25);

    const hp = rowWithCohort(statCohort, 'cohort_min_hp', 'cohort_max_hp', max_lvl_hp, Math.min(base_hp, raw_hp), Math.max(max_lvl_hp, raw_hp), hpPct);
    const atk = rowWithCohort(statCohort, 'cohort_min_attack', 'cohort_max_attack', max_lvl_attack, Math.min(base_attack, raw_attack), Math.max(max_lvl_attack, raw_attack), atkPct);
    const def = rowWithCohort(statCohort, 'cohort_min_defense', 'cohort_max_defense', max_lvl_defense, Math.min(base_defense, raw_defense), Math.max(max_lvl_defense, raw_defense), defPct);
    const spd = rowWithCohort(statCohort, 'cohort_min_speed', 'cohort_max_speed', speed, spdLo, spdHi, spdPct);
    const cr = rowWithCohort(statCohort, 'cohort_min_crit_rate', 'cohort_max_crit_rate', crit_rate, 15, 30, crPct);
    const cd = rowWithCohort(statCohort, 'cohort_min_crit_damage', 'cohort_max_crit_damage', crit_damage, 50, 50, cdPct);
    const res = rowWithCohort(statCohort, 'cohort_min_resistance', 'cohort_max_resistance', resistance, 15, 40, resPct);
    const acc = rowWithCohort(statCohort, 'cohort_min_accuracy', 'cohort_max_accuracy', accuracy, 0, 25, accPct);

    return [
      { key: 'hp', label: 'HP', labelEn: 'HP', value: max_lvl_hp, ...hp, suffix: undefined as string | undefined, formatMinMax: true },
      { key: 'atk', label: '공격력', labelEn: 'Attack', value: max_lvl_attack, ...atk, suffix: undefined as string | undefined, formatMinMax: true },
      { key: 'def', label: '방어력', labelEn: 'Defense', value: max_lvl_defense, ...def, suffix: undefined as string | undefined, formatMinMax: true },
      { key: 'spd', label: '속도', labelEn: 'Speed', value: speed, ...spd, suffix: undefined as string | undefined, formatMinMax: true },
      { key: 'cr', label: '치명', labelEn: 'Crit Rate', value: crit_rate, ...cr, suffix: '%' as string | undefined, formatMinMax: true },
      { key: 'cd', label: '치피', labelEn: 'Crit Dmg', value: crit_damage, ...cd, suffix: '%' as string | undefined, formatMinMax: true },
      { key: 'res', label: '저항', labelEn: 'Resistance', value: resistance, ...res, suffix: '%' as string | undefined, formatMinMax: true },
      { key: 'acc', label: '정확', labelEn: 'Accuracy', value: accuracy, ...acc, suffix: '%' as string | undefined, formatMinMax: true },
    ];
  }, [base_hp, max_lvl_hp, raw_hp, base_attack, max_lvl_attack, raw_attack, base_defense, max_lvl_defense, raw_defense, speed, crit_rate, crit_damage, resistance, accuracy, statCohort]);

  const skillsSortedBySlot = useMemo(() => {
    if (!skills?.length) return [];
    return [...skills].sort((a, b) => monsterSkillDisplayOrder(a) - monsterSkillDisplayOrder(b));
  }, [skills]);

  return (
    <>
      <Paper elevation={0} sx={{ overflow: 'hidden', borderRadius: 2, mb: 2 }}>
        <Box sx={{ color: '#fff', background: headerGradient, p: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 3 }, alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.35)', fontSize: { xs: '1.35rem', md: '1.75rem' }, lineHeight: 1.25 }}>
                <Box component="span" sx={{ opacity: 0.95, fontWeight: 600 }}>{attr ? `${attributeLabelsEn[attr]} ` : ''}{un_name ? `${un_name} ` : ''}</Box>
                <Box component="span" sx={{ fontWeight: 500 }}>{kr_name}</Box>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {Array.from({ length: naturalStarCount }).map((_, i) => (
                  <StarIcon key={i} sx={{ fontSize: 20, color: '#FFDD33' }} />
                ))}
                {archetype ? (
                  <Typography component="span" variant="body2" sx={{ opacity: 0.95, fontWeight: 600 }}>{archetype}</Typography>
                ) : null}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <EvolutionStage label="노말" monster={normalM} />
              <EvolutionStage label="1차 각성" monster={awakenedM} />
              {secondM != null ? <EvolutionStage label="2차 각성" monster={secondM} /> : null}
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 3 }, alignItems: 'flex-start' }}>
        {/* 좌측: 요약 + 스탯 테이블 */}
        <Paper variant="outlined" sx={{ width: { xs: '100%', md: '33.333%' }, flexShrink: 0, p: { xs: 1.5, md: 2 }, borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 2, pt: 1 }}>
            <Box component="img" src={getRenderableImageUrl(image_url)} alt={kr_name}
              sx={{ width: { xs: 120, sm: 140 }, height: { xs: 120, sm: 140 }, objectFit: 'contain', borderRadius: 1, boxShadow: 1 }} />
          </Box>

          <InfoRow label="이름"><Typography component="span" variant="body2" fontWeight={600}>{kr_name}</Typography></InfoRow>
          {un_name && un_name !== kr_name ? (
            <InfoRow label="영문"><Typography component="span" variant="body2" color="text.secondary">{un_name}</Typography></InfoRow>
          ) : null}
          <InfoRow label="속성">
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, justifyContent: 'flex-end' }}>
              {attr ? <AttributeElementIcon attribute={attr} size={16} titleAccess={attributeLabelsKo[attr]} /> : null}
              <Typography component="span" variant="body2">{attr ? `${attributeLabelsKo[attr]} (${attributeLabelsEn[attr]})` : monster_elemental}</Typography>
            </Box>
          </InfoRow>
          {archetype ? <InfoRow label="아키타입"><Typography component="span" variant="body2">{archetype}</Typography></InfoRow> : null}
          {family_id != null && String(family_id).trim() !== '' ? (
            <InfoRow label="가문"><Typography component="span" variant="body2">{String(family_id)}</Typography></InfoRow>
          ) : null}
          <InfoRow label="자연 별">
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
              {Array.from({ length: naturalStarCount }).map((_, i) => <StarIcon key={i} sx={{ fontSize: 18, color: '#FFDD33' }} />)}
            </Box>
          </InfoRow>
          {arousal_type ? <InfoRow label="각성"><Typography component="span" variant="body2">{arousal_type}</Typography></InfoRow> : null}
          <InfoRow label="최대 스킬업">
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <Box component="img" src={devilmonImageUrl} alt="" sx={{ width: 22, height: 22, borderRadius: 0.5, objectFit: 'contain' }} />
              <Typography component="span" variant="body2" fontWeight={600}>×{skillUpsTotal}</Typography>
            </Box>
          </InfoRow>
          {awaken_bonus ? (
            <>
              <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mt: 1.5, mb: 0.5 }}>각성 보너스</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.45 }}>{awaken_bonus}</Typography>
            </>
          ) : null}
          <Box sx={{ my: 1 }}><hr style={{ border: 0, borderTop: '1px solid', opacity: 0.12, margin: 0 }} /></Box>
          {statCohort ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, lineHeight: 1.35 }}>
              막대 구간: 같은 별·각성 단계 몬스터 중 최소(Min)~최대(Max), 현재 값의 위치입니다.
            </Typography>
          ) : null}
          <TableContainer>
            <Table size="small" sx={{ '& .MuiTableCell-root': { fontSize: '0.8125rem', py: 0.75 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell align="center" sx={{ width: '38%', fontWeight: 700 }}>Stat</TableCell>
                  <TableCell align="center" sx={{ width: '62%', fontWeight: 700 }}>Base</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statRows.map((row) => (
                  <TableRow key={row.key} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{row.labelEn}</TableCell>
                    <TableCell align="right">
                      <StatBarCell value={row.value} min={row.min} max={row.max} pct={row.pct} suffix={row.suffix} formatMinMax={row.formatMinMax} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* 우측: 스킬 */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
                스킬{(() => { const n = (leader_skill_description ? 1 : 0) + (skills?.length ?? 0); return n > 0 ? ` (${n}개)` : ''; })()}
              </Typography>
              {leader_skill_description || skillsSortedBySlot.length > 0 ? (
                <Grid container spacing={2}>
                  {leader_skill_description ? (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, height: '100%' }}>
                        <Box component="img"
                          src={leader_icon ? getRenderableImageUrl(leader_icon) : '/images/default-monster.png'}
                          alt=""
                          sx={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography component="h5" variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>리더 스킬</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>{leader_skill_description}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ) : null}
                  {skillsSortedBySlot.map((skill: MonsterSkill) => {
                    const levelLines = parseSkillLevelLines(skill.level_progress_description);
                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 3 }} key={skill.skill_id}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, height: '100%' }}>
                          <Box component="img"
                            src={skill.icon_path || skill.iconPath ? getRenderableImageUrl(skill.icon_path || skill.iconPath || '') : '/images/default-monster.png'}
                            alt=""
                            sx={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0, borderRadius: 1, bgcolor: 'action.hover' }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            {skill.effects && skill.effects.length > 0 ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', mb: 0.5 }}>
                                {[...skill.effects]
                                  .sort((a, b) => monsterEffectDisplayOrder(a) - monsterEffectDisplayOrder(b))
                                  .map((ef: MonsterSkillEffectRow) => {
                                    const url = resolveSkillEffectImageUrl(ef);
                                    const label = ef.effect_name?.trim() || ef.effectName?.trim() || (ef.effect_id != null ? `#${ef.effect_id}` : '') || 'FX';
                                    const titleHint = ef.effect_description?.trim() || ef.effect_remark?.trim() || ef.effectRemark?.trim() || label;
                                    const key = `${ef.skill_id}-${ef.effect_id}-${ef.effect_order}`;
                                    if (url) {
                                      return <Box key={key} title={titleHint} sx={{ width: 28, height: 28, borderRadius: 0.5, backgroundImage: `url(${url})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', flexShrink: 0 }} />;
                                    }
                                    return (
                                      <Chip key={key} size="small" label={label} title={titleHint}
                                        sx={{ height: 22, maxWidth: 140, fontSize: '0.65rem', color: '#fff', bgcolor: '#052576', borderRadius: '5px', border: 'none', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' } }}
                                      />
                                    );
                                  })}
                              </Box>
                            ) : null}
                            {skill.slot === 3 ? <Chip label="각성" size="small" sx={{ mb: 0.5, height: 20, fontSize: '0.65rem' }} /> : null}
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                              <Typography component="h5" variant="subtitle1" sx={{ fontWeight: 700 }}>{skill.skill_name}</Typography>
                              {skill.swarfarm_url ? (
                                <Typography component="a" variant="caption" href={skill.swarfarm_url} target="_blank" rel="noopener noreferrer" sx={{ opacity: 0.75, textDecoration: 'underline' }}>API</Typography>
                              ) : null}
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>{skill.skill_description}</Typography>
                            {skill.remark ? <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>{skill.remark}</Typography> : null}
                            {skill.multiplier_formula ? <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.secondary', fontWeight: 500 }}>배율: {skill.multiplier_formula}</Typography> : null}
                            {levelLines.length > 0 ? (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>스킬 강화</Typography>
                                {levelLines.map((line, i) => (
                                  <Typography key={i} variant="caption" component="div" color="text.secondary" sx={{ lineHeight: 1.45 }}>{line}</Typography>
                                ))}
                              </Box>
                            ) : null}
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">스킬 정보가 없습니다.</Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </>
  );
}
