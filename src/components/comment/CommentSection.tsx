'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
import { useCommentList, useSaveComment, useUpdateComment, useDeleteComment } from '@/hooks/api';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import type { Comment, BoardType, CommentSaveParams } from '@/features/community/types/comment';
import { MAX_COMMENT_LENGTH } from '@/shared/constants/validation';
import type { UserInfo } from '@/features/auth/types/auth';

interface CommentSectionProps {
  boardType: BoardType;
  boardId: string;
  userInfo?: UserInfo;
}

type CommentWithReplies = Comment & { replies: Comment[] };

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
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onEdit();
          }}
        >
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>수정</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onDelete();
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

// ── 단일 댓글 아이템 ──────────────────────────────────────────
interface CommentItemProps {
  comment: CommentWithReplies;
  userInfo?: UserInfo;
  isReply?: boolean;
  parentCommentId?: string;
  // 대댓글에서 답글 제출 완료 시 부모에게 replies 펼치기 요청
  onReplySaved?: () => void;
  onSaveReply: (parentId: string, text: string) => void;
  onUpdate: (commentId: string, text: string) => void;
  onDelete: (commentId: string) => void;
  isMutating?: boolean;
}

function CommentItem({
  comment,
  userInfo,
  isReply = false,
  parentCommentId,
  onReplySaved,
  onSaveReply,
  onUpdate,
  onDelete,
  isMutating = false,
}: CommentItemProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyInitial, setReplyInitial] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwner = userInfo?.user_id === comment.user_id;
  const replyCount = comment.replies?.length ?? 0;
  const displayName = comment.user_name || comment.user_id || '익명';

  const handleReplyClick = () => {
    setReplyInitial(`@${displayName} `);
    setShowReplyInput(true);
    if (!isReply) setShowReplies(true);
  };

  const handleReplySubmit = (text: string) => {
    const targetParentId = isReply ? (parentCommentId ?? comment.comment_id) : comment.comment_id;
    onSaveReply(targetParentId, text);
    setShowReplyInput(false);
    setReplyInitial('');
    if (isReply) {
      onReplySaved?.();   // 부모에게 replies 펼치기 요청
    } else {
      setShowReplies(true);
    }
  };

  const handleUpdateSubmit = (text: string) => {
    onUpdate(comment.comment_id, text);
    setIsEditing(false);
  };

  const avatarSize = isReply ? 28 : 36;
  const hasSubThread = !isReply && (replyCount > 0 || showReplyInput);
  const hasReplies = !isReply && replyCount > 0;
  const connH = 22;
  const connW = avatarSize / 2 + 14;

  return (
    <Box>
      {/* ── 댓글 본문 행 ── */}
      <Stack direction="row" spacing={1.5}>

        {/* #author-thumbnail: 아바타 + continuation */}
        <Box
          sx={{
            width: avatarSize,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar
            sx={{ width: avatarSize, height: avatarSize, bgcolor: 'primary.main', mt: 0.25 }}
          >
            {getAvatarLetter(comment)}
          </Avatar>

          {/* div.threadline > div.continuation */}
          {hasReplies && (
            <Box
              sx={(theme) => ({
                flex: 1,
                width: 2,
                bgcolor: theme.palette.divider,
              })}
            />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* 작성자 / 날짜 */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(comment.crt_date)}
            </Typography>
          </Stack>

          {/* 본문 / 수정 입력 */}
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

          {/* 액션 버튼 */}
          {!isEditing && (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
              <IconButton size="small" sx={{ color: 'text.secondary' }}>
                <ThumbUpOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton size="small" sx={{ color: 'text.secondary' }}>
                <ThumbDownOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
              {userInfo && (
                <Button
                  size="small"
                  sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 700, minWidth: 0, px: 1, borderRadius: 5 }}
                  onClick={handleReplyClick}
                >
                  답글
                </Button>
              )}
            </Stack>
          )}

          {/* 대댓글에서만 인라인 답글 입력창 표시 */}
          {isReply && (
            <Collapse in={showReplyInput}>
              <Box sx={{ mt: 1.5 }}>
                <CommentInput
                  userInfo={userInfo}
                  placeholder={`@${displayName}에게 답글...`}
                  initialValue={replyInitial}
                  submitLabel="답글 등록"
                  autoFocus
                  isLoading={isMutating}
                  onSubmit={handleReplySubmit}
                  onCancel={() => {
                    setShowReplyInput(false);
                    setReplyInitial('');
                  }}
                />
              </Box>
            </Collapse>
          )}

        </Box>

        <CommentMenu
          isOwner={isOwner}
          onEdit={() => setIsEditing(true)}
          onDelete={() => setShowDeleteDialog(true)}
        />
      </Stack>

      {/* ── yt-sub-thread ──
          ytSubThreadThreadline(왼쪽) + ytSubThreadSubThreadContent(오른쪽) 형제 구조.
          threadline은 content 전체 높이에 걸쳐 하나의 선을 그린다.
      */}
      {hasSubThread && (
        <Box sx={{ display: 'flex' }}>

          {/* ytSubThreadThreadline */}
          <Box
            sx={{
              width: avatarSize,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              pl: `${avatarSize / 2 - 1}px`,
            }}
          >
            {/* ytSubThreadConnection — L-curve */}
            <Box
              sx={(theme) => ({
                width: `${connW}px`,
                height: `${connH}px`,
                flexShrink: 0,
                borderLeft: `2px solid ${theme.palette.divider}`,
                borderBottom: `2px solid ${theme.palette.divider}`,
                borderBottomLeftRadius: '12px',
              })}
            />

            {/* ytSubThreadContinuation — 펼침 시 대댓글 옆으로 세로선 */}
            {(showReplies || showReplyInput) && (
              <Box
                sx={(theme) => ({
                  width: 2,
                  flex: 1,
                  minHeight: 8,
                  bgcolor: theme.palette.divider,
                })}
              />
            )}

            {/* ytSubThreadShadow — 펼쳤을 때만 하단 페이드 */}
            {(showReplies || showReplyInput) && (
              <Box
                sx={(theme) => ({
                  width: 2,
                  height: '20px',
                  flexShrink: 0,
                  background: `linear-gradient(to bottom, ${theme.palette.divider}, transparent)`,
                })}
              />
            )}
          </Box>

          {/* ytSubThreadSubThreadContent */}
          <Box sx={{ flex: 1, pl: 1.5 }}>
            {/* 대댓글 목록 */}
            <Collapse in={showReplies}>
              <Stack spacing={2.5} sx={{ mb: 1 }}>
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.comment_id}
                    comment={{ ...reply, replies: [] }}
                    userInfo={userInfo}
                    isReply
                    parentCommentId={comment.comment_id}
                    onReplySaved={() => setShowReplies(true)}
                    onSaveReply={onSaveReply}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    isMutating={isMutating}
                  />
                ))}
              </Stack>
            </Collapse>

            {/* 답글 토글 버튼 (replies가 있을 때만) — replies 아래 */}
            {hasReplies && (
              <Button
                size="small"
                startIcon={showReplies ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                onClick={() => setShowReplies((v) => !v)}
                sx={{ fontSize: '0.8rem', color: 'primary.main', fontWeight: 700, px: 1, borderRadius: 5 }}
              >
                답글 {replyCount}개
              </Button>
            )}

            {/* 최상위 댓글 답글 입력창 — replies 아래 */}
            <Collapse in={showReplyInput}>
              <Box sx={{ mt: 1.5 }}>
                <CommentInput
                  userInfo={userInfo}
                  placeholder={`@${displayName}에게 답글...`}
                  initialValue={replyInitial}
                  submitLabel="답글 등록"
                  autoFocus
                  isLoading={isMutating}
                  onSubmit={handleReplySubmit}
                  onCancel={() => {
                    setShowReplyInput(false);
                    setReplyInitial('');
                  }}
                />
              </Box>
            </Collapse>
          </Box>
        </Box>
      )}

      {/* 삭제 확인 다이얼로그 */}
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
  );
}

// ── 메인 CommentSection ───────────────────────────────────────
export default function CommentSection({ boardType, boardId, userInfo }: CommentSectionProps) {
  const commentListQuery = useCommentList(
    { board_type: boardType, board_id: boardId },
    { refetchOnWindowFocus: false },
  );

  const saveCommentMutation = useSaveComment({
    onSuccess: () => {
      showToast.success('댓글이 등록되었습니다.');
      commentListQuery.refetch();
    },
    onError: (error: Error) => {
      logger.error('댓글 등록 실패', error);
      showToast.error(error.message || '댓글 등록에 실패했습니다.');
    },
  });

  const updateCommentMutation = useUpdateComment({
    onSuccess: () => {
      showToast.success('댓글이 수정되었습니다.');
      commentListQuery.refetch();
    },
    onError: (error: Error) => {
      logger.error('댓글 수정 실패', error);
      showToast.error(error.message || '댓글 수정에 실패했습니다.');
    },
  });

  const deleteCommentMutation = useDeleteComment({
    onSuccess: () => {
      showToast.success('댓글이 삭제되었습니다.');
      commentListQuery.refetch();
    },
    onError: (error: Error) => {
      logger.error('댓글 삭제 실패', error);
      showToast.error(error.message || '댓글 삭제에 실패했습니다.');
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
    deleteCommentMutation.isPending;

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
