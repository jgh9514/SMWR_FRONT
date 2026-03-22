'use client';

import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Container,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import { getRenderableImageUrl } from '@/shared/utils/image';
import type { MonsterInfoResponse, MonsterSkill } from '@/features/siege/hooks/useMonsterInfo';

interface MonsterDetailContentProps {
  monsterInfo: MonsterInfoResponse;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value);
}

export default function MonsterDetailContent({ monsterInfo }: MonsterDetailContentProps) {
  const {
    kr_name,
    un_name,
    monster_elemental,
    star,
    arousal_type,
    image_url,
    max_lvl_hp,
    max_lvl_attack,
    max_lvl_defense,
    speed,
    crit_rate,
    crit_damage,
    resistance,
    accuracy,
    leader_skill_description,
    leader_icon,
    skills,
  } = monsterInfo;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PageHeader title={kr_name} backPath="/monster-search" />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
            <Avatar
              src={getRenderableImageUrl(image_url)}
              alt={kr_name}
              sx={{
                width: { xs: 100, md: 150 },
                height: { xs: 100, md: 150 },
                boxShadow: 2,
                border: '2px solid',
                borderColor: 'divider',
              }}
              variant="rounded"
            >
              {kr_name.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={monster_elemental} size="small" />
                <Chip label={`${star}성`} size="small" />
                {arousal_type && <Chip label={arousal_type} size="small" />}
                {un_name && un_name !== kr_name && (
                  <Chip label={un_name} size="small" variant="outlined" />
                )}
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                <StatItem label="체력" value={formatNumber(max_lvl_hp)} />
                <StatItem label="공격력" value={formatNumber(max_lvl_attack)} />
                <StatItem label="방어력" value={formatNumber(max_lvl_defense)} />
                <StatItem label="속도" value={formatNumber(speed)} />
                <StatItem label="치명" value={`${crit_rate}%`} />
                <StatItem label="치명피해" value={`${crit_damage}%`} />
                <StatItem label="저항" value={`${resistance}%`} />
                <StatItem label="명중" value={`${accuracy}%`} />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {leader_skill_description && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              리더 스킬
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              {leader_icon && (
                <Box
                  component="img"
                  src={getRenderableImageUrl(leader_icon)}
                  alt="리더 스킬"
                  sx={{
                    width: 48,
                    height: 48,
                    border: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                  }}
                />
              )}
              <Typography variant="body1">{leader_skill_description}</Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            스킬 ({skills?.length ?? 0}개)
          </Typography>
          {skills && skills.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>스킬</TableCell>
                    <TableCell>설명</TableCell>
                    <TableCell align="right">쿨타임</TableCell>
                    <TableCell align="center">패시브</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {skills.map((skill: MonsterSkill) => (
                    <TableRow key={skill.skill_id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {skill.icon_path && (
                            <Avatar
                              src={getRenderableImageUrl(skill.icon_path)}
                              alt={skill.skill_name}
                              sx={{ width: 32, height: 32 }}
                              variant="rounded"
                            />
                          )}
                          <Typography variant="body2" fontWeight={500}>
                            {skill.skill_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {skill.skill_description}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {skill.passive ? '-' : `${skill.cooltime}턴`}
                      </TableCell>
                      <TableCell align="center">
                        {skill.passive ? <Chip label="패시브" size="small" /> : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">
              스킬 정보가 없습니다.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}
