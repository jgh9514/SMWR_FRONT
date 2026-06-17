'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Avatar,
  Stack,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Collapse,
  Skeleton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCommentList, useSaveComment, useUpdateComment, useDeleteComment, useCommentVote } from '@/hooks/api';
import type { CommentVoteType } from '@/features/community/types/comment';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import { getApiResultMessage, isApiSuccess } from '@/shared/lib/api/result';
import { handleApiError } from '@/shared/lib/error-handler';
import type { Comment, BoardType, CommentSaveParams } from '@/features/community/types/comment';
import { MAX_COMMENT_LENGTH } from '@/shared/constants/validation';
import type { UserInfo } from '@/features/auth/types/auth';

function blurFocusedMenuItem() {
  if (typeof document === 'undefined') return;
  const run = () => {
    const el = document.activeElement;
    if (el instanceof HTMLElement) {
      el.blur();
    }
  };
  run();
  queueMicrotask(run);
}

interface CommentSectionProps {
  boardType: BoardType;
  boardId: string;
  userInfo?: UserInfo;
}

type CommentWithReplies = Omit<Comment, 'replies'> & { replies: CommentWithReplies[] };

function countAllReplies(comment: CommentWithReplies): number {
  return comment.replies.reduce((total, child) => total + 1 + countAllReplies(child), 0);
}

function getPlainText(content: string): string {
  if (!/<[a-z][\s\S]*>/i.test(content)) return content;
  return content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function getAvatarLetter(comment: Comment): string {
  return (comment.user_name?.[0] || comment.user_id?.[0] || 'U').toUpperCase();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}주 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

// ── 댓글 입력창 ──────────────────────────────────────────────
interface CommentInputProps {
  userInfo?: UserInfo;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  cancelLabel?: string;
  autoFocus?: boolean;
  isLoading?: boolean;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
  compact?: boolean;
}

function CommentInput({
  userInfo,
  placeholder = '댓글 추가...',
  initialValue = '',
  submitLabel = '등록',
  cancelLabel = '취소',
  autoFocus = false,
  isLoading = false,
  onSubmit,
  onCancel,
  compact = false,
}: CommentInputProps) {
  const [text, setText] = useState(initialValue);
  const [focused, setFocused] = useState(autoFocus);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      // 커서를 텍스트 끝으로 이동
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      showToast.error('내용을 입력해주세요.');
      return;
    }
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      showToast.error(`${MAX_COMMENT_LENGTH}자 이내로 입력해주세요.`);
      return;
    }
    onSubmit(trimmed);
    setText('');
    setFocused(false);
  };

  const handleCancel = () => {
    setText('');
    setFocused(false);
    onCancel?.();
  };

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      {!compact && (
        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', flexShrink: 0, mt: 0.5 }}>
          {userInfo ? (userInfo.user_name?.[0] || userInfo.user_id?.[0] || 'U').toUpperCase() : '?'}
        </Avatar>
      )}
      <Box sx={{ flex: 1 }}>
        <TextField
          inputRef={inputRef}
          multiline
          minRows={focused ? 3 : 1}
          maxRows={8}
          fullWidth
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          inputProps={{ maxLength: MAX_COMMENT_LENGTH }}
          variant="standard"
          size="small"
          sx={{
            '& .MuiInputBase-root': { fontSize: '0.9rem' },
            '& .MuiInput-underline:before': { borderBottomColor: 'divider' },
          }}
        />
        <Collapse in={focused || !!text.trim()}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {text.length} / {MAX_COMMENT_LENGTH}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={handleCancel} disabled={isLoading}>
                {cancelLabel}
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleSubmit}
                disabled={isLoading || !text.trim()}
                startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
                sx={{ borderRadius: 5, px: 2 }}
              >
                {submitLabel}
              </Button>
            </Stack>
          </Stack>
        </Collapse>
      </Box>
    </Stack>
  );
}

// ── MoreVert 메뉴 ─────────────────────────────────────────────
interface CommentMenuProps {
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function CommentMenu({ isOwner, onEdit, onDelete }: CommentMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const pendingActionRef = useRef<'edit' | 'delete' | null>(null);

  const handleClose = useCallback(() => {
    setAnchor(null);
  }, []);

  const handleMenuExited = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action === 'edit') onEdit();
    else if (action === 'delete') onDelete();
  }, [onEdit, onDelete]);

  if (!isOwner) return null;

  return (
    <>
      <IconButton
        size="small"
        sx={{ color: 'text.secondary', flexShrink: 0 }}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        <MoreVertIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={handleClose}
        disableScrollLock
        disableEnforceFocus
        disableRestoreFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionProps={{
          onExiting: blurFocusedMenuItem,
          onExited: handleMenuExited,
        }}
      >
        <MenuItem
          onClick={() => {
            pendingActionRef.current = 'edit';
            handleClose();
          }}
        >
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>수정</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            pendingActionRef.current = 'delete';
            handleClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>삭제</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

const COMMENT_AVATAR = 36;
const REPLY_AVATAR = 24;
const THREAD_RAIL_WIDTH = 2;
const AVATAR_GAP = 12;
const REPLY_CONTENT_OFFSET = REPLY_AVATAR + AVATAR_GAP;
const ROOT_AVATAR_CENTER = COMMENT_AVATAR / 2;
const REPLY_AVATAR_CENTER = REPLY_AVATAR / 2;
/** 세로선 왼쪽 X — 답글 아바타 열 기준 (최상위 댓글 아바타 중심) */
const ROOT_TO_REPLY_BRANCH_OFFSET =
  ROOT_AVATAR_CENTER - THREAD_RAIL_WIDTH / 2 - (COMMENT_AVATAR + AVATAR_GAP);
/** 세로선 왼쪽 X — 자식 답글 아바타 열 기준 (부모 답글 아바타 중심) */
const NESTED_REPLY_BRANCH_OFFSET =
  REPLY_AVATAR_CENTER - THREAD_RAIL_WIDTH / 2 - REPLY_CONTENT_OFFSET;
const THREAD_CORNER_SIZE = 10;
const THREAD_TOGGLE_MID_Y = 14;
const REPLIES_SKELETON_MS = 320;

function isTargetInSubtree(node: CommentWithReplies, targetId: string): boolean {
  if (node.comment_id === targetId) return true;
  return node.replies.some((child) => isTargetInSubtree(child, targetId));
}

/** 스레드 세로선 — 마지막 L자(토글/숨기기) midY에서 끊김 */
function ThreadVerticalRail({ branchOffsetPx }: { branchOffsetPx: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: branchOffsetPx,
        top: 0,
        bottom: THREAD_TOGGLE_MID_Y,
        width: THREAD_RAIL_WIDTH,
        bgcolor: 'divider',
        borderRadius: 1,
        pointerEvents: 'none',
      }}
    />
  );
}

function ThreadLCorner({ branchOffsetPx, midY }: { branchOffsetPx: number; midY: number }) {
  const armWidth = REPLY_AVATAR_CENTER - branchOffsetPx;
  if (armWidth <= THREAD_RAIL_WIDTH) return null;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: branchOffsetPx,
        top: midY - THREAD_CORNER_SIZE,
        width: armWidth,
        height: THREAD_CORNER_SIZE,
        borderLeft: THREAD_RAIL_WIDTH,
        borderBottom: THREAD_RAIL_WIDTH,
        borderStyle: 'solid',
        borderColor: 'divider',
        borderBottomLeftRadius: THREAD_CORNER_SIZE,
        boxSizing: 'border-box',
        pointerEvents: 'none',
      }}
    />
  );
}

/** 답글 토글(보기) — 아바타 열 + L자 + 버튼 */
function ThreadBranchRow({
  branchOffsetPx,
  children,
}: {
  branchOffsetPx: number;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box
        sx={{
          width: REPLY_AVATAR,
          flexShrink: 0,
          position: 'relative',
          alignSelf: 'stretch',
          minHeight: 28,
        }}
      >
        <ThreadLCorner branchOffsetPx={branchOffsetPx} midY={THREAD_TOGGLE_MID_Y} />
      </Box>
      <Box sx={{ ml: 1.5, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

/** 답글 숨기기 — 버튼 왼쪽 정렬, L자만 아바타 열에 겹침 */
function ThreadHideRow({
  branchOffsetPx,
  children,
}: {
  branchOffsetPx: number;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ position: 'relative', mt: 1.5 }}>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: REPLY_AVATAR,
          height: 28,
          pointerEvents: 'none',
        }}
      >
        <ThreadLCorner branchOffsetPx={branchOffsetPx} midY={THREAD_TOGGLE_MID_Y} />
      </Box>
      {children}
    </Box>
  );
}

function ReplyAvatarColumn({
  comment,
  size,
  showBranch,
  branchOffsetPx,
}: {
  comment: Comment;
  size: number;
  showBranch: boolean;
  branchOffsetPx: number;
}) {
  const midY = size / 2 + 2;

  return (
    <Box
      sx={{
        width: size,
        flexShrink: 0,
        position: 'relative',
        alignSelf: 'stretch',
        pt: '2px',
      }}
    >
      {showBranch && <ThreadLCorner branchOffsetPx={branchOffsetPx} midY={midY} />}
      <Avatar
        sx={{
          width: size,
          height: size,
          bgcolor: 'primary.main',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {getAvatarLetter(comment)}
      </Avatar>
    </Box>
  );
}

interface CommentVoteButtonsProps {
  comment: Comment;
  disabled?: boolean;
  canVote: boolean;
  onVote: (commentId: string, vote: CommentVoteType) => void;
}

function CommentVoteButtons({ comment, disabled = false, canVote, onVote }: CommentVoteButtonsProps) {
  const myV = String(comment.my_vote ?? '').trim().toUpperCase();
  const upN = Number(comment.recommend_count ?? 0);
  const downN = Number(comment.not_recommend_count ?? 0);

  const handleVote = (vote: CommentVoteType) => {
    if (!canVote) {
      showToast.error('로그인이 필요합니다.');
      return;
    }
    onVote(comment.comment_id, vote);
  };

  return (
    <Stack direction="row" alignItems="center" spacing={0.25}>
      <IconButton
        size="small"
        sx={{ color: myV === 'UP' ? 'primary.main' : 'text.secondary' }}
        disabled={disabled}
        onClick={() => handleVote(myV === 'UP' ? 'CLEAR' : 'UP')}
        aria-label="추천"
      >
        <ThumbUpOutlinedIcon sx={{ fontSize: 16 }} />
      </IconButton>
      {upN > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 12, mr: 0.5 }}>
          {upN}
        </Typography>
      )}
      <IconButton
        size="small"
        sx={{ color: myV === 'DOWN' ? 'error.main' : 'text.secondary' }}
        disabled={disabled}
        onClick={() => handleVote(myV === 'DOWN' ? 'CLEAR' : 'DOWN')}
        aria-label="비추천"
      >
        <ThumbDownOutlinedIcon sx={{ fontSize: 16 }} />
      </IconButton>
      {downN > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 12 }}>
          {downN}
        </Typography>
      )}
    </Stack>
  );
}

function ReplyThreadSkeleton({ count }: { count: number }) {
  const rows = Math.max(1, Math.min(count, 3));
  return (
    <Box sx={{ mt: 1.5 }} aria-hidden>
      <Stack spacing={2.5}>
        {Array.from({ length: rows }, (_, i) => (
          <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
            <Skeleton variant="circular" width={REPLY_AVATAR} height={REPLY_AVATAR} sx={{ flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="28%" height={18} />
              <Skeleton variant="text" width="72%" height={16} sx={{ mt: 0.5 }} />
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// ── 답글 본문 (아바타·연결선 제외) ───────────────────────────
interface ReplyContentProps {
  comment: Comment;
  userInfo?: UserInfo;
  isMutating?: boolean;
  canVote: boolean;
  onVote: (commentId: string, vote: CommentVoteType) => void;
  onReply: () => void;
  onUpdate: (commentId: string, text: string) => void;
  onDelete: (commentId: string) => void;
}

function ReplyContent({
  comment,
  userInfo,
  isMutating = false,
  canVote,
  onVote,
  onReply,
  onUpdate,
  onDelete,
}: ReplyContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwner = userInfo?.user_id === comment.user_id;
  const displayName = comment.user_name || comment.user_id || '익명';

  const handleUpdateSubmit = (text: string) => {
    onUpdate(comment.comment_id, text);
    setIsEditing(false);
  };

  return (
    <>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
            {displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(comment.crt_date)}
          </Typography>
        </Stack>

        {isEditing ? (
          <Box sx={{ mt: 0.5 }}>
            <CommentInput
              userInfo={userInfo}
              placeholder="댓글 수정..."
              initialValue={getPlainText(comment.content)}
              submitLabel="저장"
              autoFocus
              compact
              isLoading={isMutating}
              onSubmit={handleUpdateSubmit}
              onCancel={() => setIsEditing(false)}
            />
          </Box>
        ) : (
          <Typography
            variant="body2"
            sx={{ mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}
          >
            {getPlainText(comment.content)}
          </Typography>
        )}

        {!isEditing && (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
            <CommentVoteButtons
              comment={comment}
              disabled={isMutating}
              canVote={canVote}
              onVote={onVote}
            />
            {userInfo && (
              <Button
                size="small"
                sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 700, minWidth: 0, px: 1, borderRadius: 5 }}
                onClick={onReply}
              >
                답글
              </Button>
            )}
          </Stack>
        )}
      </Box>

      <CommentMenu
        isOwner={isOwner}
        onEdit={() => setIsEditing(true)}
        onDelete={() => setShowDeleteDialog(true)}
      />

      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>댓글 삭제</DialogTitle>
        <DialogContent>
          <Typography>이 댓글을 삭제하시겠습니까?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>취소</Button>
          <Button
            color="error"
            variant="contained"
            disabled={isMutating}
            onClick={() => {
              onDelete(comment.comment_id);
              setShowDeleteDialog(false);
            }}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

interface ThreadReplySharedProps {
  userInfo?: UserInfo;
  isMutating?: boolean;
  canVote: boolean;
  onVote: (commentId: string, vote: CommentVoteType) => void;
  replyTargetId: string | null;
  replyInitial: string;
  onReplyTo: (comment: Comment) => void;
  onReplySubmit: (text: string) => void;
  onReplyCancel: () => void;
  onUpdate: (commentId: string, text: string) => void;
  onDelete: (commentId: string) => void;
}

interface ThreadReplyNodeProps extends ThreadReplySharedProps {
  comment: CommentWithReplies;
  branchOffsetPx: number;
}

function ThreadReplyNode({
  comment,
  branchOffsetPx,
  userInfo,
  isMutating = false,
  canVote,
  onVote,
  replyTargetId,
  replyInitial,
  onReplyTo,
  onReplySubmit,
  onReplyCancel,
  onUpdate,
  onDelete,
}: ThreadReplyNodeProps) {
  const [showChildReplies, setShowChildReplies] = useState(false);
  const [childRevealReady, setChildRevealReady] = useState(false);

  const displayName = comment.user_name || comment.user_id || '익명';
  const isReplyingHere = replyTargetId === comment.comment_id;
  const hasChildren = comment.replies.length > 0;
  const childReplyCount = countAllReplies(comment);

  useEffect(() => {
    if (replyTargetId && isTargetInSubtree(comment, replyTargetId)) {
      setShowChildReplies(true);
    }
  }, [replyTargetId, comment]);

  useEffect(() => {
    if (!showChildReplies || !hasChildren) {
      setChildRevealReady(false);
      return;
    }
    setChildRevealReady(false);
    const timer = window.setTimeout(() => setChildRevealReady(true), REPLIES_SKELETON_MS);
    return () => window.clearTimeout(timer);
  }, [showChildReplies, hasChildren, childReplyCount]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'stretch', position: 'relative' }}>
      <ReplyAvatarColumn
        comment={comment}
        size={REPLY_AVATAR}
        showBranch
        branchOffsetPx={branchOffsetPx}
      />

      <Box sx={{ flex: 1, minWidth: 0, ml: 1.5 }}>
        <Stack direction="row" spacing={0} alignItems="flex-start">
          <ReplyContent
            comment={comment}
            userInfo={userInfo}
            isMutating={isMutating}
            canVote={canVote}
            onVote={onVote}
            onReply={() => onReplyTo(comment)}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </Stack>

        {isReplyingHere && (
          <Box sx={{ mt: 1.5, ml: `${REPLY_CONTENT_OFFSET}px` }}>
            <CommentInput
              key={`reply-${comment.comment_id}`}
              userInfo={userInfo}
              placeholder={`@${displayName}에게 답글...`}
              initialValue={replyInitial}
              submitLabel="답글 등록"
              autoFocus
              compact
              isLoading={isMutating}
              onSubmit={onReplySubmit}
              onCancel={onReplyCancel}
            />
          </Box>
        )}

        {hasChildren && (
          <Box sx={{ position: 'relative', mt: 1.5 }}>
            <ThreadVerticalRail branchOffsetPx={NESTED_REPLY_BRANCH_OFFSET} />

            {!showChildReplies && (
              <ThreadBranchRow branchOffsetPx={NESTED_REPLY_BRANCH_OFFSET}>
                <Button
                  size="small"
                  startIcon={<KeyboardArrowDownIcon />}
                  onClick={() => setShowChildReplies(true)}
                  sx={{
                    fontSize: '0.8rem',
                    color: 'primary.main',
                    fontWeight: 700,
                    px: 1,
                    borderRadius: 5,
                  }}
                >
                  {`답글 ${childReplyCount}개`}
                </Button>
              </ThreadBranchRow>
            )}

            {showChildReplies && (
              <>
                {!childRevealReady ? (
                  <ReplyThreadSkeleton count={childReplyCount} />
                ) : (
                  <Stack spacing={2.5}>
                    {comment.replies.map((child) => (
                      <ThreadReplyNode
                        key={child.comment_id}
                        comment={child}
                        branchOffsetPx={NESTED_REPLY_BRANCH_OFFSET}
                        userInfo={userInfo}
                        isMutating={isMutating}
                        canVote={canVote}
                        onVote={onVote}
                        replyTargetId={replyTargetId}
                        replyInitial={replyInitial}
                        onReplyTo={onReplyTo}
                        onReplySubmit={onReplySubmit}
                        onReplyCancel={onReplyCancel}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                      />
                    ))}
                  </Stack>
                )}

                <ThreadHideRow branchOffsetPx={NESTED_REPLY_BRANCH_OFFSET}>
                  <Button
                    size="small"
                    startIcon={<KeyboardArrowUpIcon />}
                    onClick={() => setShowChildReplies(false)}
                    sx={{
                      fontSize: '0.8rem',
                      color: 'primary.main',
                      fontWeight: 700,
                      px: 1,
                      borderRadius: 5,
                    }}
                  >
                    답글 숨기기
                  </Button>
                </ThreadHideRow>
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

interface ReplyThreadProps extends ThreadReplySharedProps {
  replies: CommentWithReplies[];
  onClose: () => void;
}

function ReplyThread({
  replies,
  userInfo,
  isMutating = false,
  canVote,
  onVote,
  replyTargetId,
  replyInitial,
  onReplyTo,
  onReplySubmit,
  onReplyCancel,
  onUpdate,
  onDelete,
  onClose,
}: ReplyThreadProps) {
  return (
    <Box sx={{ position: 'relative', mt: 1.5 }}>
      <ThreadVerticalRail branchOffsetPx={ROOT_TO_REPLY_BRANCH_OFFSET} />
      <Stack spacing={2.5}>
        {replies.map((reply) => (
          <ThreadReplyNode
            key={reply.comment_id}
            comment={reply}
            branchOffsetPx={ROOT_TO_REPLY_BRANCH_OFFSET}
            userInfo={userInfo}
            isMutating={isMutating}
            canVote={canVote}
            onVote={onVote}
            replyTargetId={replyTargetId}
            replyInitial={replyInitial}
            onReplyTo={onReplyTo}
            onReplySubmit={onReplySubmit}
            onReplyCancel={onReplyCancel}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </Stack>

      <ThreadHideRow branchOffsetPx={ROOT_TO_REPLY_BRANCH_OFFSET}>
        <Button
          size="small"
          startIcon={<KeyboardArrowUpIcon />}
          onClick={onClose}
          sx={{
            fontSize: '0.8rem',
            color: 'primary.main',
            fontWeight: 700,
            px: 1,
            borderRadius: 5,
          }}
        >
          답글 숨기기
        </Button>
      </ThreadHideRow>
    </Box>
  );
}

// ── 단일 댓글 아이템 ──────────────────────────────────────────
interface CommentItemProps {
  comment: CommentWithReplies;
  userInfo?: UserInfo;
  canVote: boolean;
  onVote: (commentId: string, vote: CommentVoteType) => void;
  onSaveReply: (parentId: string, text: string) => void;
  onUpdate: (commentId: string, text: string) => void;
  onDelete: (commentId: string) => void;
  isMutating?: boolean;
}

function CommentItem({
  comment,
  userInfo,
  canVote,
  onVote,
  onSaveReply,
  onUpdate,
  onDelete,
  isMutating = false,
}: CommentItemProps) {
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyInitial, setReplyInitial] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  const [repliesRevealReady, setRepliesRevealReady] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwner = userInfo?.user_id === comment.user_id;
  const replyCount = countAllReplies(comment);
  const displayName = comment.user_name || comment.user_id || '익명';
  const hasReplies = replyCount > 0;
  const isReplyingToRoot = replyTargetId === comment.comment_id;

  useEffect(() => {
    if (!showReplies || !hasReplies) {
      setRepliesRevealReady(false);
      return;
    }
    setRepliesRevealReady(false);
    const timer = window.setTimeout(() => setRepliesRevealReady(true), REPLIES_SKELETON_MS);
    return () => window.clearTimeout(timer);
  }, [showReplies, hasReplies, replyCount]);

  const openReplies = () => setShowReplies(true);
  const closeReplies = () => {
    setShowReplies(false);
    setRepliesRevealReady(false);
    setReplyTargetId(null);
    setReplyInitial('');
  };

  const cancelReply = () => {
    setReplyTargetId(null);
    setReplyInitial('');
  };

  const startReplyTo = (target: Comment) => {
    const name = target.user_name || target.user_id || '익명';
    setReplyTargetId(target.comment_id);
    setReplyInitial(`@${name} `);
    openReplies();
  };

  const startReplyToRoot = () => {
    setReplyTargetId(comment.comment_id);
    setReplyInitial(`@${displayName} `);
    if (hasReplies) openReplies();
  };

  const handleReplySubmit = (text: string) => {
    if (!replyTargetId) return;
    onSaveReply(replyTargetId, text);
    cancelReply();
    openReplies();
  };

  const handleUpdateSubmit = (text: string) => {
    onUpdate(comment.comment_id, text);
    setIsEditing(false);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
      <Box
        sx={{
          width: COMMENT_AVATAR,
          flexShrink: 0,
          position: 'relative',
          alignSelf: 'stretch',
        }}
      >
        <Avatar
          sx={{
            width: COMMENT_AVATAR,
            height: COMMENT_AVATAR,
            bgcolor: 'primary.main',
            mt: 0.25,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {getAvatarLetter(comment)}
        </Avatar>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, ml: 1.5 }}>
        <Stack direction="row" spacing={0} alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(comment.crt_date)}
            </Typography>
          </Stack>

          {isEditing ? (
            <Box sx={{ mt: 0.5 }}>
              <CommentInput
                userInfo={userInfo}
                placeholder="댓글 수정..."
                initialValue={getPlainText(comment.content)}
                submitLabel="저장"
                autoFocus
                compact
                isLoading={isMutating}
                onSubmit={handleUpdateSubmit}
                onCancel={() => setIsEditing(false)}
              />
            </Box>
          ) : (
            <Typography
              variant="body2"
              sx={{ mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}
            >
              {getPlainText(comment.content)}
            </Typography>
          )}

          {!isEditing && (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
              <CommentVoteButtons
                comment={comment}
                disabled={isMutating}
                canVote={canVote}
                onVote={onVote}
              />
              {userInfo && (
                <Button
                  size="small"
                  sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 700, minWidth: 0, px: 1, borderRadius: 5 }}
                  onClick={startReplyToRoot}
                >
                  답글
                </Button>
              )}
            </Stack>
          )}

          </Box>

          <CommentMenu
            isOwner={isOwner}
            onEdit={() => setIsEditing(true)}
            onDelete={() => setShowDeleteDialog(true)}
          />
        </Stack>

        {hasReplies && !showReplies && (
          <Box sx={{ position: 'relative', mt: 0.75 }}>
            <ThreadVerticalRail branchOffsetPx={ROOT_TO_REPLY_BRANCH_OFFSET} />
            <ThreadBranchRow branchOffsetPx={ROOT_TO_REPLY_BRANCH_OFFSET}>
              <Button
                size="small"
                startIcon={<KeyboardArrowDownIcon />}
                onClick={openReplies}
                sx={{
                  fontSize: '0.8rem',
                  color: 'primary.main',
                  fontWeight: 700,
                  px: 1,
                  borderRadius: 5,
                }}
              >
                {`답글 ${replyCount}개`}
              </Button>
            </ThreadBranchRow>
          </Box>
        )}

      {showReplies && hasReplies && (
        <>
          {!repliesRevealReady ? (
            <Box sx={{ position: 'relative' }}>
              <ThreadVerticalRail branchOffsetPx={ROOT_TO_REPLY_BRANCH_OFFSET} />
              <ReplyThreadSkeleton count={replyCount} />
            </Box>
          ) : (
            <ReplyThread
              replies={comment.replies}
              userInfo={userInfo}
              isMutating={isMutating}
              canVote={canVote}
              onVote={onVote}
              replyTargetId={replyTargetId}
              replyInitial={replyInitial}
              onReplyTo={startReplyTo}
              onReplySubmit={handleReplySubmit}
              onReplyCancel={cancelReply}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onClose={closeReplies}
            />
          )}
        </>
      )}

      <Collapse in={isReplyingToRoot}>
        <Box sx={{ mt: 1.5, ml: `${REPLY_CONTENT_OFFSET}px` }}>
          <CommentInput
            key={`root-reply-${comment.comment_id}`}
            userInfo={userInfo}
            placeholder={`@${displayName}에게 답글...`}
            initialValue={replyInitial}
            submitLabel="답글 등록"
            autoFocus
            compact
            isLoading={isMutating}
            onSubmit={handleReplySubmit}
            onCancel={cancelReply}
          />
        </Box>
      </Collapse>

      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>댓글 삭제</DialogTitle>
        <DialogContent>
          <Typography>이 댓글을 삭제하시겠습니까?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>취소</Button>
          <Button
            color="error"
            variant="contained"
            disabled={isMutating}
            onClick={() => {
              onDelete(comment.comment_id);
              setShowDeleteDialog(false);
            }}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}

// ── 메인 CommentSection ───────────────────────────────────────
export default function CommentSection({ boardType, boardId, userInfo }: CommentSectionProps) {
  const commentListQuery = useCommentList(
    { board_type: boardType, board_id: boardId },
    { refetchOnWindowFocus: false },
  );

  const saveCommentMutation = useSaveComment({
    onSuccess: (res) => {
      if (isApiSuccess(res)) {
        showToast.success(getApiResultMessage(res, '댓글이 등록되었습니다.'));
        commentListQuery.refetch();
      } else {
        showToast.error(getApiResultMessage(res, '댓글 등록에 실패했습니다.'));
      }
    },
    onError: (error: Error) => {
      logger.error('댓글 등록 실패', error);
      showToast.error(handleApiError(error).message || '댓글 등록에 실패했습니다.');
    },
  });

  const updateCommentMutation = useUpdateComment({
    onSuccess: (res) => {
      if (isApiSuccess(res)) {
        showToast.success(getApiResultMessage(res, '댓글이 수정되었습니다.'));
        commentListQuery.refetch();
      } else {
        showToast.error(getApiResultMessage(res, '댓글 수정에 실패했습니다.'));
      }
    },
    onError: (error: Error) => {
      logger.error('댓글 수정 실패', error);
      showToast.error(handleApiError(error).message || '댓글 수정에 실패했습니다.');
    },
  });

  const deleteCommentMutation = useDeleteComment({
    onSuccess: (res) => {
      if (isApiSuccess(res)) {
        showToast.success(getApiResultMessage(res, '댓글이 삭제되었습니다.'));
        commentListQuery.refetch();
      } else {
        showToast.error(getApiResultMessage(res, '댓글 삭제에 실패했습니다.'));
      }
    },
    onError: (error: Error) => {
      logger.error('댓글 삭제 실패', error);
      showToast.error(handleApiError(error).message || '댓글 삭제에 실패했습니다.');
    },
  });

  const commentVoteMutation = useCommentVote({
    onSuccess: (res) => {
      if (!isApiSuccess(res)) {
        showToast.error(getApiResultMessage(res, '투표 처리에 실패했습니다.'));
        return;
      }
      commentListQuery.refetch();
    },
    onError: (error: Error) => {
      logger.error('댓글 투표 실패', error);
      showToast.error(handleApiError(error).message || '투표 처리에 실패했습니다.');
    },
  });

  const organizedComments = useMemo((): CommentWithReplies[] => {
    if (!commentListQuery.data?.list) return [];
    const comments = commentListQuery.data.list;
    const map = new Map<string, CommentWithReplies>();
    const roots: CommentWithReplies[] = [];

    comments.forEach((c) => map.set(c.comment_id, { ...c, replies: [] }));
    comments.forEach((c) => {
      const node = map.get(c.comment_id)!;
      if (c.parent_comment_id) {
        map.get(c.parent_comment_id)?.replies.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }, [commentListQuery.data]);

  const isMutating =
    saveCommentMutation.isPending ||
    updateCommentMutation.isPending ||
    deleteCommentMutation.isPending ||
    commentVoteMutation.isPending;

  const canVote = Boolean(userInfo?.user_id);

  const handleVote = (commentId: string, vote: CommentVoteType) => {
    commentVoteMutation.mutate({ comment_id: commentId, vote });
  };

  const handleNewComment = (text: string) => {
    saveCommentMutation.mutate({
      board_type: boardType,
      board_id: boardId,
      content: text,
    } as CommentSaveParams);
  };

  const handleSaveReply = (parentId: string, text: string) => {
    saveCommentMutation.mutate({
      board_type: boardType,
      board_id: boardId,
      parent_comment_id: parentId,
      content: text,
    } as CommentSaveParams);
  };

  const handleUpdate = (commentId: string, text: string) => {
    updateCommentMutation.mutate({ comment_id: commentId, content: text });
  };

  const handleDelete = (commentId: string) => {
    deleteCommentMutation.mutate({ comment_id: commentId });
  };

  const totalCount = commentListQuery.data?.list?.length ?? 0;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
        댓글 {totalCount > 0 ? totalCount : ''}
      </Typography>

      {userInfo ? (
        <Box sx={{ mb: 4 }}>
          <CommentInput
            userInfo={userInfo}
            placeholder="댓글 추가..."
            isLoading={saveCommentMutation.isPending}
            onSubmit={handleNewComment}
          />
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          댓글을 작성하려면 로그인이 필요합니다.
        </Alert>
      )}

      {commentListQuery.isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : commentListQuery.isError ? (
        <Alert severity="error">댓글을 불러오는 중 오류가 발생했습니다.</Alert>
      ) : organizedComments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
        </Typography>
      ) : (
        <Stack spacing={3}>
          {organizedComments.map((comment) => (
            <CommentItem
              key={comment.comment_id}
              comment={comment}
              userInfo={userInfo}
              canVote={canVote}
              onVote={handleVote}
              onSaveReply={handleSaveReply}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              isMutating={isMutating}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
