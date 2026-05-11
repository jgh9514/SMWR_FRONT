'use client';

import { Fragment, useCallback, useMemo, useState, type ReactNode } from 'react';
import { Box, Button, Menu, Stack, Typography } from '@mui/material';
import { RTA_SELECT_MENU_PROPS, blurFocusedMenuItem } from '@/features/rta/rtaMenuModalProps';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import type { RtaRatingGradeRule } from '@/features/rta/types/rta';
import { getRtaTierShortLabel } from '@/shared/utils/util';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';

export const TIER_MENU_BLOCKS = [
  { slots: ['Ch1', 'Ch2', 'Ch3'] as const, allKey: 'CH_ALL', allLabel: 'Ch 전체' },
  { slots: ['F1', 'F2', 'F3'] as const, allKey: 'F_ALL', allLabel: 'F 전체' },
  { slots: ['C1', 'C2', 'C3'] as const, allKey: 'C_ALL', allLabel: 'C 전체' },
  { slots: ['P1', 'P2', 'P3'] as const, allKey: 'P_ALL', allLabel: 'P 전체' },
  { slots: ['G1', 'G2', 'G3'] as const, allKey: 'G_ALL', allLabel: 'G 전체' },
] as const;

export const BULK_TIER_LABEL: Record<string, string> = {
  CH_ALL: 'Ch 전체',
  F_ALL: 'F 전체',
  C_ALL: 'C 전체',
  P_ALL: 'P 전체',
  G_ALL: 'G 전체',
};

function isLegendRatingId(ratingId: number): boolean {
  return getRtaTierShortLabel(ratingId).startsWith('L');
}

function tierRuleMap(rules: RtaRatingGradeRule[]): Map<string, RtaRatingGradeRule> {
  return new Map(rules.map((r) => [getRtaTierShortLabel(r.ratingId), r]));
}

export function tierSelectionSummary(value: string, byTier: Map<string, RtaRatingGradeRule>): ReactNode {
  if (!value) return '전체 티어 합산';
  const bulk = BULK_TIER_LABEL[value];
  if (bulk) return bulk;
  const r = byTier.get(value);
  return (
    <Stack direction="row" alignItems="center" gap={1} component="span">
      {r ? <RtaRatingStarIcons rating={r.ratingId} size={16} gap={1} /> : null}
      <Typography component="span" variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}

export default function RtaTierFilterMenu({
  value,
  onChange,
  rules,
  disabled,
  hideBulkOptions = false,
}: {
  value: string;
  onChange: (next: string) => void;
  rules: RtaRatingGradeRule[];
  disabled?: boolean;
  hideBulkOptions?: boolean;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const visibleRules = useMemo(() => rules.filter((r) => !isLegendRatingId(r.ratingId)), [rules]);
  const byTier = useMemo(() => tierRuleMap(visibleRules), [visibleRules]);

  const handleClose = useCallback(() => {
    blurFocusedMenuItem();
    setAnchorEl(null);
  }, []);
  const handleSelect = useCallback(
    (next: string) => {
      blurFocusedMenuItem();
      onChange(next);
      setAnchorEl(null);
    },
    [onChange],
  );

  return (
    <>
      <Button
        type="button"
        variant="outlined"
        color="inherit"
        disabled={disabled}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={<KeyboardArrowDownIcon sx={{ opacity: 0.7 }} />}
        sx={{
          justifyContent: 'space-between',
          textAlign: 'left',
          py: 1,
          px: 1.5,
          minWidth: { xs: '100%', sm: 280 },
          maxWidth: '100%',
          borderColor: 'divider',
          bgcolor: 'common.white',
          '&:hover': { bgcolor: 'common.white' },
        }}
      >
        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>{tierSelectionSummary(value, byTier)}</Box>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        {...RTA_SELECT_MENU_PROPS}
        slotProps={{
          ...RTA_SELECT_MENU_PROPS.slotProps,
          paper: { sx: { maxWidth: 'min(100vw - 24px, 440px)', width: '100%' } },
        }}
      >
        <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${hideBulkOptions ? 3 : 4}, minmax(0, 1fr))`, gap: 0.75 }}>
            {!hideBulkOptions && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Button
                  fullWidth
                  size="small"
                  variant={value === '' ? 'contained' : 'outlined'}
                  onClick={() => handleSelect('')}
                >
                  전체 티어 합산
                </Button>
              </Box>
            )}
            {TIER_MENU_BLOCKS.map((block) => (
              <Fragment key={block.allKey}>
                {block.slots.map((k) => {
                  const r = byTier.get(k);
                  return (
                    <Button
                      key={k}
                      size="small"
                      variant={value === k ? 'contained' : 'outlined'}
                      disabled={!r}
                      onClick={() => r && handleSelect(k)}
                      sx={{
                        minHeight: 56,
                        flexDirection: 'column',
                        gap: 0.25,
                        py: 0.75,
                        fontSize: '0.7rem',
                        lineHeight: 1.2,
                      }}
                    >
                      {r ? <RtaRatingStarIcons rating={r.ratingId} size={14} gap={1} /> : null}
                      {k}
                    </Button>
                  );
                })}
                {!hideBulkOptions && (
                  <Button
                    size="small"
                    variant={value === block.allKey ? 'contained' : 'outlined'}
                    onClick={() => handleSelect(block.allKey)}
                    sx={{ minHeight: 56, flexDirection: 'column', justifyContent: 'center', py: 0.75, fontSize: '0.7rem' }}
                  >
                    {block.allLabel}
                  </Button>
                )}
              </Fragment>
            ))}
          </Box>
        </Box>
      </Menu>
    </>
  );
}
