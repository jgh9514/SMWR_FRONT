'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useMonsterList } from '@/features/siege/hooks/useSiegeList';
import { useApiQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import { apiClient } from '@/shared/lib/api/client';
import { parseMonsterElemental } from '@/shared/utils/monsterElemental';
import { getRenderableImageUrl, inlineImagesForHtml2Canvas } from '@/shared/utils/image';
import { monsterAwakenStepDigit } from '@/features/siege/lib/monsterIdEvolution';
import { isAuthenticated } from '@/shared/utils/auth';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';
import type { AttributeType } from '@/features/siege/types/monster';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TierRow {
  id: string;
  label: string;
  color: string;
  monsterIds: string[];
}

interface DragInfo {
  monsterId: string;
  from: 'pool' | 'tier';
  fromTierId?: string;
}

type DropTarget = { type: 'tier'; tierId: string } | { type: 'pool' };

interface TouchPending {
  monsterId: string;
  from: 'pool' | 'tier';
  fromTierId?: string;
  startX: number;
  startY: number;
  monster: MonsterOption;
}

interface TouchGhost {
  monster: MonsterOption;
  x: number;
  y: number;
}

const TOUCH_DRAG_THRESHOLD_PX = 10;
const TIER_DROP_ZONE_ATTR = 'data-tier-drop-zone';

function findTierDropTarget(clientX: number, clientY: number): DropTarget | null {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;
  const zone = el.closest(`[${TIER_DROP_ZONE_ATTR}]`);
  if (!zone) return null;
  const value = zone.getAttribute(TIER_DROP_ZONE_ATTR);
  if (value === 'pool') return { type: 'pool' };
  if (value?.startsWith('tier:')) return { type: 'tier', tierId: value.slice(5) };
  return null;
}

function applyMonsterMove(prev: TierRow[], info: DragInfo, target: DropTarget): TierRow[] {
  if (target.type === 'pool') {
    if (info.from === 'pool') return prev;
    return prev.map((t) =>
      t.id === info.fromTierId ? { ...t, monsterIds: t.monsterIds.filter((id) => id !== info.monsterId) } : t,
    );
  }
  const next = prev.map((t) => ({ ...t, monsterIds: [...t.monsterIds] }));
  if (info.from === 'tier' && info.fromTierId) {
    const src = next.find((t) => t.id === info.fromTierId);
    if (src) src.monsterIds = src.monsterIds.filter((id) => id !== info.monsterId);
  }
  const dst = next.find((t) => t.id === target.tierId);
  if (dst && !dst.monsterIds.includes(info.monsterId)) dst.monsterIds.push(info.monsterId);
  return next;
}

interface SavedTierList {
  id: number;
  user_id: string;
  title: string;
  tier_data: string;
  created_at: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_TIERS: TierRow[] = [
  { id: 'ss', label: 'SS', color: '#dc3545', monsterIds: [] },
  { id: 's', label: 'S', color: '#fd7e14', monsterIds: [] },
  { id: 'a', label: 'A', color: '#6f42c1', monsterIds: [] },
  { id: 'b', label: 'B', color: '#0d6efd', monsterIds: [] },
  { id: 'c', label: 'C', color: '#0dcaf0', monsterIds: [] },
];

const PRESET_COLORS = [
  '#dc3545', '#fd7e14', '#ffc107', '#198754',
  '#0d6efd', '#6f42c1', '#0dcaf0', '#adb5bd',
];

const ELEMENTS: AttributeType[] = ['fire', 'water', 'wind', 'light', 'dark'];

const ELEMENT_ICON: Record<AttributeType, string> = {
  fire: 'https://static.lucksack.gg/images/elements/fire.png',
  water: 'https://static.lucksack.gg/images/elements/water.png',
  wind: 'https://static.lucksack.gg/images/elements/wind.png',
  light: 'https://static.lucksack.gg/images/elements/light.png',
  dark: 'https://static.lucksack.gg/images/elements/dark.png',
};

const ELEMENT_LABEL: Record<AttributeType, string> = {
  fire: '불', water: '물', wind: '바람', light: '빛', dark: '어둠',
};

const STAR_FILTERS = [2, 3, 4, 5] as const;

const HISTORY_QUERY_KEY = ['tier-list-history'];

// ─── Codec ────────────────────────────────────────────────────────────────────

function encodeTiers(tiers: TierRow[]): string {
  const compact = tiers.map((t) => ({ l: t.label, c: t.color, m: t.monsterIds }));
  return btoa(encodeURIComponent(JSON.stringify(compact)));
}

function decodeTiers(encoded: string): TierRow[] | null {
  try {
    const raw = JSON.parse(decodeURIComponent(atob(encoded))) as Array<{
      l: string; c: string; m: string[];
    }>;
    return raw.map((item, i) => ({
      id: `tier-${i}-${item.l}`,
      label: item.l,
      color: item.c,
      monsterIds: item.m,
    }));
  } catch {
    return null;
  }
}

function tiersToJson(tiers: TierRow[]): string {
  return JSON.stringify(tiers.map((t) => ({ l: t.label, c: t.color, m: t.monsterIds })));
}

function jsonToTiers(json: string): TierRow[] | null {
  try {
    const raw = JSON.parse(json) as Array<{ l: string; c: string; m: string[] }>;
    return raw.map((item, i) => ({
      id: `tier-${i}-${item.l}`,
      label: item.l,
      color: item.c,
      monsterIds: item.m,
    }));
  } catch {
    return null;
  }
}

// ─── MonsterIcon ──────────────────────────────────────────────────────────────

function MonsterIcon({
  monster, size = 44, draggable = false, onDragStart, onTouchDragStart, onRemove, dimmed = false,
}: {
  monster: MonsterOption;
  size?: number;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onTouchDragStart?: (e: React.TouchEvent) => void;
  onRemove?: () => void;
  dimmed?: boolean;
}) {
  const imgUrl = getRenderableImageUrl(monster.image_url);
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onTouchStart={onTouchDragStart}
      title={monster.kr_name || monster.un_name}
      style={{
        position: 'relative', width: size, height: size, flexShrink: 0,
        cursor: draggable ? 'grab' : 'default',
        touchAction: draggable ? 'none' : undefined,
        opacity: dimmed ? 0.35 : 1,
        transition: 'opacity 0.12s',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgUrl}
        alt={monster.kr_name || monster.un_name}
        width={size} height={size}
        style={{ borderRadius: 6, display: 'block', objectFit: 'contain', width: size, height: size }}
      />
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            position: 'absolute', top: -6, right: -6,
            width: 16, height: 16, borderRadius: '50%',
            background: 'rgba(220,53,69,0.9)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: '#fff', lineHeight: 1, padding: 0,
          }}
          aria-label={`${monster.kr_name} 제거`}
        >×</button>
      )}
    </div>
  );
}

// ─── HoverBtn ─────────────────────────────────────────────────────────────────

function HoverBtn({
  children, style, hoverStyle, onClick, disabled,
}: {
  children: React.ReactNode;
  style: React.CSSProperties;
  hoverStyle: React.CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ ...style, ...(hov && !disabled ? hoverStyle : {}), ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
    >
      {children}
    </button>
  );
}

function CtrlBtn({ children, onClick, disabled, title }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title} disabled={disabled}
      style={{
        background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
        padding: 3, borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.25 : 1,
      }}
    >{children}</button>
  );
}

// ─── SaveModal ────────────────────────────────────────────────────────────────

function SaveModal({
  onClose, onSave, defaultTitle,
}: {
  onClose: () => void;
  onSave: (title: string) => void;
  defaultTitle: string;
}) {
  const [title, setTitle] = useState(defaultTitle);
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1e293b', borderRadius: 12, padding: 24,
          width: 320, border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f1f5f9' }}>티어리스트 저장</h3>
        <div>
          <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>제목</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSave(title); if (e.key === 'Escape') onClose(); }}
            maxLength={200}
            placeholder="내 티어리스트"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '8px 12px',
              color: '#e2e8f0', fontSize: 14, outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '7px 16px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
          }}>취소</button>
          <button onClick={() => onSave(title)} style={{
            padding: '7px 16px', borderRadius: 7, border: 'none',
            background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>저장</button>
        </div>
      </div>
    </div>
  );
}

// ─── HistoryPanel ─────────────────────────────────────────────────────────────

function HistoryPanel({
  loggedIn,
  onLoad,
}: {
  loggedIn: boolean;
  onLoad: (tiers: TierRow[]) => void;
}) {
  const qc = useQueryClient();
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const { data: historyItems = [], isLoading } = useApiQuery<SavedTierList[]>({
    queryKey: HISTORY_QUERY_KEY,
    queryFn: () => apiClient.post('/summonerswar/tier-list/list', {}),
    enabled: loggedIn,
    staleTime: 30_000,
  });

  const deleteMutation = useApiPostMutation<unknown, { id: number }>(
    '/summonerswar/tier-list/delete',
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
        toast.success('삭제되었습니다.');
      },
      onError: () => toast.error('삭제에 실패했습니다.'),
    },
  );

  const renameMutation = useApiPostMutation<unknown, { id: number; title: string; tier_data: string }>(
    '/summonerswar/tier-list/update',
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
        setRenamingId(null);
        toast.success('이름이 변경되었습니다.');
      },
      onError: () => toast.error('이름 변경에 실패했습니다.'),
    },
  );

  const handleLoad = (item: SavedTierList) => {
    const tiers = jsonToTiers(item.tier_data);
    if (!tiers) { toast.error('티어 데이터를 불러올 수 없습니다.'); return; }
    onLoad(tiers);
    toast.success(`"${item.title}" 불러왔습니다.`);
  };

  const handleDelete = (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    deleteMutation.mutate({ id });
  };

  const startRename = (item: SavedTierList) => {
    setRenamingId(item.id);
    setRenameValue(item.title);
  };

  const commitRename = (item: SavedTierList) => {
    const title = renameValue.trim();
    if (!title || title === item.title) { setRenamingId(null); return; }
    renameMutation.mutate({ id: item.id, title, tier_data: item.tier_data });
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return s; }
  };

  if (!loggedIn) {
    return (
      <div style={{
        borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)', padding: 20,
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
          히스토리를 저장하려면&nbsp;
          <a href="/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>로그인</a>
          이 필요합니다.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(255,255,255,0.02)',
    }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
          저장된 티어리스트 ({historyItems.length})
        </span>
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {isLoading ? (
          <p style={{ padding: '16px', textAlign: 'center', color: '#475569', fontSize: 13, margin: 0 }}>로딩 중...</p>
        ) : historyItems.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: 'rgba(148,163,184,0.4)', fontSize: 13, margin: 0 }}>
            저장된 티어리스트가 없습니다.
          </p>
        ) : (
          historyItems.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {renamingId === item.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(item);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    maxLength={200}
                    style={{
                      width: '100%', fontSize: 13, background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(59,130,246,0.5)', borderRadius: 6,
                      color: '#e2e8f0', padding: '2px 8px', outline: 'none',
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                  {formatDate(item.updated_at)}
                </div>
              </div>
              {renamingId === item.id ? (
                <>
                  <button
                    onClick={() => commitRename(item)}
                    style={{
                      padding: '4px 10px', fontSize: 12, borderRadius: 6,
                      border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.1)',
                      color: '#4ade80', cursor: 'pointer', flexShrink: 0,
                    }}
                  >확인</button>
                  <button
                    onClick={() => setRenamingId(null)}
                    style={{
                      padding: '4px 8px', fontSize: 12, borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                      color: '#64748b', cursor: 'pointer', flexShrink: 0,
                    }}
                  >취소</button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleLoad(item)}
                    style={{
                      padding: '4px 10px', fontSize: 12, borderRadius: 6,
                      border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.1)',
                      color: '#60a5fa', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >불러오기</button>
                  <button
                    onClick={() => startRename(item)}
                    style={{
                      padding: '4px 8px', fontSize: 12, borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                      color: '#94a3b8', cursor: 'pointer', flexShrink: 0,
                    }}
                  >수정</button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      padding: '4px 8px', fontSize: 12, borderRadius: 6,
                      border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
                      color: '#f87171', cursor: 'pointer', flexShrink: 0,
                    }}
                  >삭제</button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── TierRowItem ──────────────────────────────────────────────────────────────

interface TierRowItemProps {
  tier: TierRow;
  isFirst: boolean;
  isLast: boolean;
  monsterById: Record<string, MonsterOption>;
  isDragOver: boolean;
  isEditing: boolean;
  editLabel: string;
  editColor: string;
  onEditLabelChange: (v: string) => void;
  onEditColorChange: (v: string) => void;
  onStartEdit: () => void;
  onApplyEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemoveMonster: (id: string) => void;
  onDragStart: (e: React.DragEvent, monsterId: string, from: 'pool' | 'tier', tierId?: string) => void;
  onTouchDragStart: (e: React.TouchEvent, monsterId: string, from: 'pool' | 'tier', tierId?: string) => void;
  touchDraggingId: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

function TierRowItem({
  tier, isFirst, isLast, monsterById, isDragOver,
  isEditing, editLabel, editColor,
  onEditLabelChange, onEditColorChange,
  onStartEdit, onApplyEdit, onCancelEdit,
  onDelete, onMoveUp, onMoveDown,
  onRemoveMonster, onDragStart, onTouchDragStart, touchDraggingId, onDragOver, onDragLeave, onDrop,
}: TierRowItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        border: `1px solid ${isDragOver ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 8,
        background: isDragOver ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        transition: 'border-color 0.15s, background 0.15s',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Label column */}
      <div style={{
        position: 'relative', minWidth: 80, width: 80, flexShrink: 0, alignSelf: 'stretch',
        display: 'grid', placeItems: 'center',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backgroundColor: tier.color, padding: '0 6px',
      }}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', width: '100%', padding: 4 }}>
            <input
              autoFocus value={editLabel} onChange={(e) => onEditLabelChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onApplyEdit(); if (e.key === 'Escape') onCancelEdit(); }}
              maxLength={4}
              style={{
                width: '100%', textAlign: 'center',
                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 4, color: '#fff', fontSize: 13, fontWeight: 700,
                padding: '2px 4px', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => onEditColorChange(c)} style={{
                  width: 16, height: 16, borderRadius: 3, background: c, padding: 0,
                  border: editColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer', flexShrink: 0,
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={onApplyEdit} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.8)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>저장</button>
              <button onClick={onCancelEdit} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer' }}>취소</button>
            </div>
          </div>
        ) : (
          <>
            <span style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#fff', fontSize: 16, lineHeight: 1,
              letterSpacing: '0.05em', textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              textAlign: 'center', wordBreak: 'break-all', margin: 0, padding: '0 6px',
              pointerEvents: 'none',
            }}>{tier.label}</span>
            {hovered && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', borderRadius: 7,
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
                  <CtrlBtn onClick={onMoveUp} disabled={isFirst} title="위로">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="m18 15-6-6-6 6" /></svg>
                  </CtrlBtn>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <CtrlBtn onClick={onStartEdit} title="라벨/색상 변경">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <path d="M14 17H5" /><path d="M19 7h-9" />
                      <circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
                    </svg>
                  </CtrlBtn>
                  <CtrlBtn onClick={onDelete} title="티어 삭제">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                      <path d="M10 11v6" /><path d="M14 11v6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </CtrlBtn>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 2 }}>
                  <CtrlBtn onClick={onMoveDown} disabled={isLast} title="아래로">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                  </CtrlBtn>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drop zone */}
      <div
        {...{ [TIER_DROP_ZONE_ATTR]: `tier:${tier.id}` }}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        style={{
          flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          gap: 6, padding: 8, minHeight: 64,
        }}
      >
        {tier.monsterIds.length === 0 ? (
          <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.35)', paddingLeft: 8 }}>
            여기에 몬스터를 드롭하세요
          </span>
        ) : (
          tier.monsterIds.map((mid) => {
            const monster = monsterById[mid];
            if (!monster) return null;
            return (
              <MonsterIcon
                key={mid} monster={monster} size={44} draggable
                dimmed={touchDraggingId === mid}
                onDragStart={(e) => onDragStart(e, mid, 'tier', tier.id)}
                onTouchDragStart={(e) => onTouchDragStart(e, mid, 'tier', tier.id)}
                onRemove={() => onRemoveMonster(mid)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TierListClient() {
  const [tiers, setTiers] = useState<TierRow[]>(DEFAULT_TIERS.map((t) => ({ ...t })));
  const [searchText, setSearchText] = useState('');
  const [elementFilter, setElementFilter] = useState<AttributeType | null>(null);
  const [starFilter, setStarFilter] = useState<number | null>(5);
  const [only2A, setOnly2A] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');
  const [dragOverTierId, setDragOverTierId] = useState<string | null>(null);
  const [dragOverPool, setDragOverPool] = useState(false);
  const [touchGhost, setTouchGhost] = useState<TouchGhost | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const dragInfo = useRef<DragInfo | null>(null);
  const touchPendingRef = useRef<TouchPending | null>(null);
  const touchGhostRef = useRef<TouchGhost | null>(null);
  const tierListRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: monsters = [], isLoading } = useMonsterList({});

  // Auth check
  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, []);

  // Load state from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get('state');
    if (state) {
      const decoded = decodeTiers(state);
      if (decoded) setTiers(decoded);
    }
  }, []);

  // ── Save mutation ─────────────────────────────────────────────────────────

  const saveMutation = useApiPostMutation<{ data: number }, { title: string; tier_data: string }>(
    '/summonerswar/tier-list/save',
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
        toast.success('저장되었습니다!');
        setShowSaveModal(false);
      },
      onError: () => toast.error('저장에 실패했습니다.'),
    },
  );

  // ── Derived state ─────────────────────────────────────────────────────────

  const placedIds = useMemo(
    () => new Set(tiers.flatMap((t) => t.monsterIds)),
    [tiers],
  );

  const filteredPool = useMemo(() => {
    return monsters.filter((m) => {
      if (placedIds.has(m.monster_id)) return false;
      if (elementFilter && parseMonsterElemental(m.monster_elemental) !== elementFilter) return false;
      if (starFilter !== null && m.star !== starFilter) return false;
      if (only2A && (m.awaken_level ?? monsterAwakenStepDigit(m.monster_id) ?? 0) < 2) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        if (
          !m.kr_name?.toLowerCase().includes(q) &&
          !m.un_name?.toLowerCase().includes(q) &&
          !m.modified_kr_name?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [monsters, placedIds, elementFilter, starFilter, only2A, searchText]);

  const monsterById = useMemo<Record<string, MonsterOption>>(() => {
    const map: Record<string, MonsterOption> = {};
    monsters.forEach((m) => { map[m.monster_id] = m; });
    return map;
  }, [monsters]);

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (e: React.DragEvent, monsterId: string, from: 'pool' | 'tier', fromTierId?: string) => {
      dragInfo.current = { monsterId, from, fromTierId };
      e.dataTransfer.effectAllowed = 'move';
    }, [],
  );

  const handleDragOver = useCallback((e: React.DragEvent, tierId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTierId(tierId);
    setDragOverPool(false);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverTierId(null);
    setDragOverPool(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toTierId: string) => {
    e.preventDefault();
    setDragOverTierId(null);
    setDragOverPool(false);
    const info = dragInfo.current;
    if (!info) return;
    dragInfo.current = null;
    setTiers((prev) => applyMonsterMove(prev, info, { type: 'tier', tierId: toTierId }));
  }, []);

  const handleDropToPool = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPool(false);
    const info = dragInfo.current;
    if (!info || info.from === 'pool') { dragInfo.current = null; return; }
    dragInfo.current = null;
    setTiers((prev) => applyMonsterMove(prev, info, { type: 'pool' }));
  }, []);

  const clearTouchDragUi = useCallback(() => {
    touchPendingRef.current = null;
    touchGhostRef.current = null;
    setTouchGhost(null);
    setDragOverTierId(null);
    setDragOverPool(false);
  }, []);

  const updateTouchDropHighlight = useCallback((clientX: number, clientY: number) => {
    const target = findTierDropTarget(clientX, clientY);
    if (target?.type === 'tier') {
      setDragOverTierId(target.tierId);
      setDragOverPool(false);
    } else if (target?.type === 'pool') {
      setDragOverTierId(null);
      setDragOverPool(true);
    } else {
      setDragOverTierId(null);
      setDragOverPool(false);
    }
  }, []);

  const handleMonsterTouchStart = useCallback(
    (e: React.TouchEvent, monsterId: string, from: 'pool' | 'tier', fromTierId?: string) => {
      if ((e.target as HTMLElement).closest('button')) return;
      if (e.touches.length !== 1) return;
      const monster = monsterById[monsterId];
      if (!monster) return;
      const touch = e.touches[0];
      touchPendingRef.current = {
        monsterId,
        from,
        fromTierId,
        startX: touch.clientX,
        startY: touch.clientY,
        monster,
      };
    },
    [monsterById],
  );

  useEffect(() => {
    touchGhostRef.current = touchGhost;
  }, [touchGhost]);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const pending = touchPendingRef.current;
      const ghost = touchGhostRef.current;

      if (!pending && !ghost) return;

      const touch = e.touches[0];
      if (!touch) return;

      if (pending && !ghost) {
        const dx = touch.clientX - pending.startX;
        const dy = touch.clientY - pending.startY;
        if (dx * dx + dy * dy < TOUCH_DRAG_THRESHOLD_PX * TOUCH_DRAG_THRESHOLD_PX) return;
        e.preventDefault();
        dragInfo.current = {
          monsterId: pending.monsterId,
          from: pending.from,
          fromTierId: pending.fromTierId,
        };
        const nextGhost: TouchGhost = { monster: pending.monster, x: touch.clientX, y: touch.clientY };
        touchPendingRef.current = null;
        touchGhostRef.current = nextGhost;
        setTouchGhost(nextGhost);
        updateTouchDropHighlight(touch.clientX, touch.clientY);
        return;
      }

      if (ghost) {
        e.preventDefault();
        const nextGhost: TouchGhost = { ...ghost, x: touch.clientX, y: touch.clientY };
        touchGhostRef.current = nextGhost;
        setTouchGhost(nextGhost);
        updateTouchDropHighlight(touch.clientX, touch.clientY);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const pending = touchPendingRef.current;
      const ghost = touchGhostRef.current;

      if (!pending && !ghost) return;

      if (pending && !ghost) {
        touchPendingRef.current = null;
        return;
      }

      const info = dragInfo.current;
      const touch = e.changedTouches[0];
      if (info && touch) {
        const target = findTierDropTarget(touch.clientX, touch.clientY);
        if (target) {
          setTiers((prev) => applyMonsterMove(prev, info, target));
        }
      }

      dragInfo.current = null;
      clearTouchDragUi();
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [clearTouchDragUi, updateTouchDropHighlight]);

  // ── Tier management ───────────────────────────────────────────────────────

  const addTier = useCallback(() => {
    const id = `tier-${Date.now()}`;
    setTiers((prev) => [...prev, {
      id, label: `T${prev.length + 1}`,
      color: PRESET_COLORS[prev.length % PRESET_COLORS.length], monsterIds: [],
    }]);
  }, []);

  const deleteTier = useCallback((tierId: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== tierId));
  }, []);

  const moveTier = useCallback((tierId: string, dir: -1 | 1) => {
    setTiers((prev) => {
      const idx = prev.findIndex((t) => t.id === tierId);
      if (idx < 0) return prev;
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  const removeMonsterFromTier = useCallback((tierId: string, monsterId: string) => {
    setTiers((prev) =>
      prev.map((t) =>
        t.id === tierId ? { ...t, monsterIds: t.monsterIds.filter((id) => id !== monsterId) } : t,
      ),
    );
  }, []);

  const startEdit = useCallback((tier: TierRow) => {
    setEditingTierId(tier.id);
    setEditLabel(tier.label);
    setEditColor(tier.color);
  }, []);

  const applyEdit = useCallback(() => {
    if (!editingTierId) return;
    setTiers((prev) =>
      prev.map((t) =>
        t.id === editingTierId ? { ...t, label: editLabel.trim() || t.label, color: editColor } : t,
      ),
    );
    setEditingTierId(null);
  }, [editingTierId, editLabel, editColor]);

  const clearAll = useCallback(() => setTiers((prev) => prev.map((t) => ({ ...t, monsterIds: [] }))), []);

  const resetAll = useCallback(() => setTiers(DEFAULT_TIERS.map((t) => ({ ...t }))), []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleShare = useCallback(() => {
    const encoded = encodeTiers(tiers);
    const url = `${window.location.origin}${window.location.pathname}?state=${encoded}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('링크가 클립보드에 복사되었습니다!'))
      .catch(() => window.prompt('아래 링크를 복사하세요', url));
  }, [tiers]);

  const handleExportPng = useCallback(async () => {
    if (!tierListRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading('이미지 생성 중...');
    const hiddenButtons: HTMLElement[] = [];
    let restoreImages: (() => void) | null = null;
    try {
      const { toPng } = await import('html-to-image');
      const root = tierListRef.current;

      // 버튼 숨김 (캡처 전 실제 DOM에서)
      root.querySelectorAll('button').forEach((btn) => {
        (btn as HTMLElement).style.visibility = 'hidden';
        hiddenButtons.push(btn as HTMLElement);
      });

      // 이미지 pre-inline: html2canvas의 onclone은 async를 await하지 않아
      // 이미지 인라인 완료 전에 캡처되는 문제가 있음 — 실제 DOM에서 먼저 await
      restoreImages = await inlineImagesForHtml2Canvas(root);

      const dataUrl = await toPng(root, {
        backgroundColor: '#0f172a',
        pixelRatio: 2,
        skipFonts: false,
      });

      const link = document.createElement('a');
      link.download = 'tier-list.png';
      link.href = dataUrl;
      link.click();
      toast.dismiss(toastId);
      toast.success('PNG로 저장되었습니다!');
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('이미지 생성에 실패했습니다.');
    } finally {
      hiddenButtons.forEach((btn) => { btn.style.visibility = ''; });
      restoreImages?.();
      setIsExporting(false);
    }
  }, []);

  const handleSave = useCallback((title: string) => {
    saveMutation.mutate({ title: title.trim() || '내 티어리스트', tier_data: tiersToJson(tiers) });
  }, [tiers, saveMutation]);

  const handleLoadHistory = useCallback((loaded: TierRow[]) => {
    setTiers(loaded);
  }, []);

  // ── Style helpers ─────────────────────────────────────────────────────────

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 12px', fontSize: 12, fontWeight: 500, borderRadius: 6,
    cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
    transition: 'background 0.15s, color 0.15s',
  };
  const btnHover = { background: 'rgba(255,255,255,0.08)', color: '#e2e8f0' };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 24, color: '#e2e8f0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 12, background: 'rgba(52,211,153,0.1)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5h10" /><path d="M11 12h10" /><path d="M11 19h10" />
            <path d="M4 4h1v5" /><path d="M4 9h2" />
            <path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02" />
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Tier List Maker</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>서머너즈워 몬스터 티어표를 만들고 공유해보세요</p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <HoverBtn style={btnBase} hoverStyle={btnHover} onClick={addTier}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" /><path d="M12 5v14" />
          </svg>
          티어 추가
        </HoverBtn>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <HoverBtn style={btnBase} hoverStyle={btnHover} onClick={handleExportPng} disabled={isExporting}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="m7 10 5 5 5-5" />
            </svg>
            {isExporting ? '생성 중...' : 'PNG 내보내기'}
          </HoverBtn>
          <HoverBtn style={btnBase} hoverStyle={btnHover} onClick={handleShare}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" />
              <line x1="8" x2="16" y1="12" y2="12" />
            </svg>
            링크 공유
          </HoverBtn>
          {loggedIn && (
            <>
              <HoverBtn style={{ ...btnBase, borderColor: 'rgba(59,130,246,0.4)', color: '#60a5fa' }} hoverStyle={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd' }} onClick={() => setShowHistoryModal(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                  <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="12" x2="15" y2="14" />
                </svg>
                불러오기
              </HoverBtn>
              <HoverBtn style={{ ...btnBase, borderColor: 'rgba(59,130,246,0.4)', color: '#60a5fa' }} hoverStyle={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd' }} onClick={() => setShowSaveModal(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                히스토리 저장
              </HoverBtn>
            </>
          )}
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <HoverBtn style={{ ...btnBase, border: 'none' }} hoverStyle={btnHover} onClick={clearAll}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21" />
              <path d="m5.082 11.09 8.828 8.828" />
            </svg>
            초기화
          </HoverBtn>
          <HoverBtn style={{ ...btnBase, border: 'none', color: '#f87171' }} hoverStyle={{ ...btnHover, color: '#fca5a5' }} onClick={resetAll}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
            리셋
          </HoverBtn>
        </div>
      </div>

      {/* Tier rows */}
      <div ref={tierListRef} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tiers.map((tier, idx) => (
          <TierRowItem
            key={tier.id} tier={tier}
            isFirst={idx === 0} isLast={idx === tiers.length - 1}
            monsterById={monsterById} isDragOver={dragOverTierId === tier.id}
            isEditing={editingTierId === tier.id}
            editLabel={editLabel} editColor={editColor}
            onEditLabelChange={setEditLabel} onEditColorChange={setEditColor}
            onStartEdit={() => startEdit(tier)} onApplyEdit={applyEdit}
            onCancelEdit={() => setEditingTierId(null)}
            onDelete={() => deleteTier(tier.id)}
            onMoveUp={() => moveTier(tier.id, -1)} onMoveDown={() => moveTier(tier.id, 1)}
            onRemoveMonster={(mid) => removeMonsterFromTier(tier.id, mid)}
            onDragStart={handleDragStart}
            onTouchDragStart={handleMonsterTouchStart}
            touchDraggingId={touchGhost?.monster.monster_id ?? null}
            onDragOver={(e) => handleDragOver(e, tier.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, tier.id)}
          />
        ))}
      </div>

      {/* Monster Pool */}
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 13, color: '#64748b', fontWeight: 500 }}>몬스터 풀</h3>
        <div
          style={{
            borderRadius: 12,
            border: `1px solid ${dragOverPool ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
            background: dragOverPool ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragOverPool(true);
            setDragOverTierId(null);
          }}
          onDragLeave={() => setDragOverPool(false)}
          onDrop={handleDropToPool}
        >
          {/* Filters */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 280 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"
                  style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}>
                  <path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />
                </svg>
                <input
                  value={searchText} onChange={(e) => setSearchText(e.target.value)}
                  placeholder="몬스터 검색..."
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                    padding: '5px 10px 5px 30px', color: '#e2e8f0', fontSize: 13,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              {/* Element filter */}
              <div style={{ display: 'flex', gap: 6 }}>
                {ELEMENTS.map((el) => (
                  <button key={el} title={ELEMENT_LABEL[el]}
                    onClick={() => setElementFilter(elementFilter === el ? null : el)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: elementFilter === el ? '1px solid rgba(255,255,255,0.3)' : 'none',
                      background: elementFilter === el ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: elementFilter && elementFilter !== el ? 0.4 : 1,
                      transition: 'all 0.15s', padding: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ELEMENT_ICON[el]} alt={el} width={18} height={18} style={{ objectFit: 'contain' }} />
                  </button>
                ))}
              </div>
              {/* Star filter */}
              <div style={{ display: 'flex', gap: 4 }}>
                {STAR_FILTERS.map((s) => (
                  <button key={s} onClick={() => setStarFilter(starFilter === s ? null : s)} style={{
                    display: 'flex', alignItems: 'center', gap: 2,
                    padding: '3px 8px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: starFilter === s ? '1px solid rgba(245,158,11,0.6)' : 'none',
                    background: starFilter === s ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)',
                    color: starFilter === s ? '#fbbf24' : '#94a3b8', transition: 'all 0.15s',
                  }}>
                    {s}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
                    </svg>
                  </button>
                ))}
              </div>
              {/* 2A toggle */}
              <button onClick={() => { setOnly2A((v) => { if (!v) setStarFilter(null); return !v; }); }} title="2차 각성 몬스터만 보기" style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                textTransform: 'uppercase', borderRadius: 6, cursor: 'pointer',
                border: only2A ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
                background: only2A ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)',
                color: only2A ? '#e2e8f0' : '#64748b', transition: 'all 0.15s',
              }}>2A</button>
            </div>
            <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{isLoading ? '로딩 중...' : `${filteredPool.length}마리`}</span>
              {(elementFilter || starFilter !== null || only2A || searchText) && (
                <button
                  onClick={() => { setElementFilter(null); setStarFilter(5); setOnly2A(false); setSearchText(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 12, padding: 0 }}
                >필터 초기화</button>
              )}
            </div>
          </div>
          {/* Grid */}
          <div
            {...{ [TIER_DROP_ZONE_ATTR]: 'pool' }}
            style={{ padding: 10, display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 320, overflowY: 'auto', minHeight: 80 }}
          >
            {isLoading ? (
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '24px 0', color: '#475569', fontSize: 13 }}>로딩 중...</div>
            ) : filteredPool.length === 0 ? (
              <p style={{ width: '100%', textAlign: 'center', color: 'rgba(148,163,184,0.4)', fontSize: 13, padding: '24px 0', margin: 0 }}>몬스터가 없습니다</p>
            ) : (
              filteredPool.map((m) => (
                <MonsterIcon
                  key={m.monster_id}
                  monster={m}
                  size={44}
                  draggable
                  dimmed={touchGhost?.monster.monster_id === m.monster_id}
                  onDragStart={(e) => handleDragStart(e, m.monster_id, 'pool')}
                  onTouchDragStart={(e) => handleMonsterTouchStart(e, m.monster_id, 'pool')}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* History modal */}
      {showHistoryModal && (
        <div
          onClick={() => setShowHistoryModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1e293b', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.1)',
              padding: 24, width: 420, maxWidth: '90vw',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: '#e2e8f0', fontWeight: 600 }}>저장된 티어리스트</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#64748b', fontSize: 18, lineHeight: 1, padding: 4,
                }}
              >×</button>
            </div>
            <HistoryPanel loggedIn={loggedIn} onLoad={(tiers) => { handleLoadHistory(tiers); setShowHistoryModal(false); }} />
          </div>
        </div>
      )}

      {/* Save modal */}
      {showSaveModal && (
        <SaveModal
          defaultTitle="내 티어리스트"
          onClose={() => setShowSaveModal(false)}
          onSave={handleSave}
        />
      )}

      {/* Touch drag ghost */}
      {touchGhost && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            left: touchGhost.x,
            top: touchGhost.y,
            transform: 'translate(-50%, -50%)',
            zIndex: 10000,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.45))',
          }}
        >
          <MonsterIcon monster={touchGhost.monster} size={48} />
        </div>
      )}

    </div>
  );
}
