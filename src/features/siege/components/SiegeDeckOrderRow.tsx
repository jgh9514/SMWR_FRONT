'use client';

import { useCallback, useState } from 'react';
import { Avatar, Box, Chip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { getMonsterImageUrl } from '@/shared/utils/image';

export type SiegeDeckOrderItem = {
  id: string;
  label: string;
  imageUrl?: string;
  /** 1순위 등 순위 칩 라벨 */
  rankLabel?: string;
  /** 리더(L) 등 추가 배지 */
  leader?: boolean;
};

type SiegeDeckOrderRowProps = {
  items: SiegeDeckOrderItem[];
  onReorder?: (orderedIds: string[]) => void;
  disabled?: boolean;
  helperText?: string;
};

export function reorderArray<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [picked] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, picked);
  return next;
}

export function SiegeDeckOrderRow({ items, onReorder, disabled = false, helperText }: SiegeDeckOrderRowProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const isInteractive = !disabled && Boolean(onReorder) && items.length > 1;

  const handleDragStart = useCallback((event: React.DragEvent<HTMLElement>, id: string) => {
    if (!isInteractive) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  }, [isInteractive]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLElement>, index: number) => {
    if (!isInteractive) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, [isInteractive]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLElement>, targetIndex: number) => {
      if (!isInteractive || !onReorder) return;
      event.preventDefault();

      const sourceId = event.dataTransfer.getData('text/plain') || draggedId;
      if (!sourceId) {
        setDraggedId(null);
        setDragOverIndex(null);
        return;
      }

      const sourceIndex = items.findIndex((item) => item.id === sourceId);
      if (sourceIndex < 0 || sourceIndex === targetIndex) {
        setDraggedId(null);
        setDragOverIndex(null);
        return;
      }

      const nextIds = reorderArray(
        items.map((item) => item.id),
        sourceIndex,
        targetIndex,
      );
      onReorder(nextIds);
      setDraggedId(null);
      setDragOverIndex(null);
    },
    [draggedId, isInteractive, items, onReorder],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <Box>
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {helperText}
        </Typography>
      )}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.75, sm: 1 },
          flexWrap: 'nowrap',
          overflowX: 'auto',
          p: 0.75,
          borderRadius: 1.5,
          bgcolor: (t) => alpha(t.palette.action.hover, 0.25),
        }}
        role="list"
        aria-label="몬스터 순서"
      >
        {items.map((item, index) => {
          const isDragging = draggedId === item.id;
          const isDropTarget = dragOverIndex === index && draggedId !== item.id;

          return (
            <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 }, flexShrink: 0 }}>
              {index > 0 && (
                <ChevronRightIcon sx={{ color: 'text.disabled', fontSize: { xs: 20, sm: 24 }, flexShrink: 0 }} />
              )}
              <Box
                role="listitem"
                draggable={isInteractive}
                onDragStart={(event) => handleDragStart(event, item.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(event) => handleDragOver(event, index)}
                onDrop={(event) => handleDrop(event, index)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  minWidth: { xs: 72, sm: 84 },
                  p: 0.75,
                  borderRadius: 1.5,
                  border: '2px solid',
                  borderColor: isDropTarget ? 'primary.main' : isDragging ? 'warning.main' : 'transparent',
                  bgcolor: isDropTarget ? (t) => alpha(t.palette.primary.main, 0.08) : 'transparent',
                  opacity: isDragging ? 0.55 : 1,
                  cursor: isInteractive ? 'grab' : 'default',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease, opacity 0.15s ease',
                  '&:active': isInteractive ? { cursor: 'grabbing' } : undefined,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {isInteractive && (
                    <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled' }} aria-hidden />
                  )}
                  <Chip
                    label={item.rankLabel ?? `${index + 1}순위`}
                    size="small"
                    color={index === 0 ? 'warning' : 'default'}
                    sx={{ height: 20 }}
                  />
                </Box>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={item.imageUrl ? getMonsterImageUrl(item.imageUrl) : undefined}
                    alt={item.label}
                    sx={{
                      width: { xs: 52, sm: 64 },
                      height: { xs: 52, sm: 64 },
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: index === 0 ? 'warning.main' : 'divider',
                      bgcolor: 'background.paper',
                      pointerEvents: 'none',
                      '& img': { objectFit: 'contain' },
                    }}
                  />
                  {item.leader && (
                    <Chip
                      label="L"
                      size="small"
                      color="warning"
                      sx={{
                        position: 'absolute',
                        top: 2,
                        left: 2,
                        height: 18,
                        minWidth: 18,
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        '& .MuiChip-label': { px: 0.5 },
                      }}
                    />
                  )}
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ maxWidth: 84, fontSize: '0.68rem', textAlign: 'center' }}
                >
                  {item.label}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
