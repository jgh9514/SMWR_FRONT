'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  IconButton,
  Avatar,
  Stack,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ReplyIcon from '@mui/icons-material/Reply';
import SendIcon from '@mui/icons-material/Send';
import { useCommentList, useSaveComment, useUpdateComment, useDeleteComment } from '@/hooks/api';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import type { Comment, BoardType, CommentSaveParams } from '@/features/community/types/comment';
import { RichTextDisplay } from '@/shared/ui/editor/RichTextDisplay';
import { validateAndSanitizeInput } from '@/shared/utils/validation';
import { MAX_COMMENT_LENGTH } from '@/shared/constants/validation';
import type { UserInfo } from '@/features/auth/types/auth';

const RichTextEditor = dynamic(() => import('@/shared/ui/editor/RichTextEditor'), {
  ssr: false,
  loading: () => <Box sx={{ minHeight: 180 }} />,
});

interface CommentSectionProps {
  boardType: BoardType;
  boardId: string;
  userInfo?: UserInfo;
}

export default function CommentSection({ boardType, boardId, userInfo }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // 댓글 목록 조회
  const commentListQuery = useCommentList(
    { board_type: boardType, board_id: boardId },
    {
      refetchOnWindowFocus: false,
    },
  );

  // 댓글 등록 Mutation
  const saveCommentMutation = useSaveComment({
    onSuccess: () => {
      showToast.success('댓글이 등록되었습니다.');
      setNewComment('');
      setReplyingToCommentId(null);
      setReplyContent('');
      commentListQuery.refetch();
    },
    onError: (error: Error) => {
      logger.error('댓글 등록 실패', error);
      showToast.error(error.message || '댓글 등록에 실패했습니다.');
    },
  });

  // 댓글 수정 Mutation
  const updateCommentMutation = useUpdateComment({
    onSuccess: () => {
      showToast.success('댓글이 수정되었습니다.');
      setEditingCommentId(null);
      setEditContent('');
      commentListQuery.refetch();
    },
    onError: (error: Error) => {
      logger.error('댓글 수정 실패', error);
      showToast.error(error.message || '댓글 수정에 실패했습니다.');
    },
  });

  // 댓글 삭제 Mutation
  const deleteCommentMutation = useDeleteComment({
    onSuccess: () => {
      showToast.success('댓글이 삭제되었습니다.');
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
      commentListQuery.refetch();
    },
    onError: (error: Error) => {
      logger.error('댓글 삭제 실패', error);
      showToast.error(error.message || '댓글 삭제에 실패했습니다.');
    },
  });

  // 댓글 목록을 계층 구조로 변환
  const organizedComments = useMemo(() => {
    if (!commentListQuery.data?.list) return [];

    const comments = commentListQuery.data.list;
    const commentMap = new Map<string, Comment & { replies: Comment[] }>();
    const rootComments: (Comment & { replies: Comment[] })[] = [];

    // 모든 댓글을 맵에 추가
    comments.forEach((comment) => {
      commentMap.set(comment.comment_id, { ...comment, replies: [] });
    });

    // 댓글을 부모-자식 관계로 구성
    comments.forEach((comment) => {
      const commentWithReplies = commentMap.get(comment.comment_id)!;
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  }, [commentListQuery.data]);

  // 댓글 등록 핸들러
  const handleSaveComment = () => {
    try {
      const sanitizedContent = validateAndSanitizeInput(newComment.trim(), MAX_COMMENT_LENGTH);
      if (!sanitizedContent || sanitizedContent === '<p><br></p>') {
        showToast.error('댓글 내용을 입력해주세요.');
        return;
      }

      const params: CommentSaveParams = {
        board_type: boardType,
        board_id: boardId,
        content: sanitizedContent,
      };

      saveCommentMutation.mutate(params);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '입력값 검증에 실패했습니다.';
      showToast.error(errorMessage);
    }
  };

  // 대댓글 등록 핸들러
  const handleSaveReply = (parentCommentId: string) => {
    try {
      const sanitizedContent = validateAndSanitizeInput(replyContent.trim(), 1000);
      if (!sanitizedContent || sanitizedContent === '<p><br></p>') {
        showToast.error('댓글 내용을 입력해주세요.');
        return;
      }

      const params: CommentSaveParams = {
        board_type: boardType,
        board_id: boardId,
        parent_comment_id: parentCommentId,
        content: sanitizedContent,
      };

      saveCommentMutation.mutate(params);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '입력값 검증에 실패했습니다.';
      showToast.error(errorMessage);
    }
  };

  // 댓글 수정 핸들러
  const handleUpdateComment = () => {
    if (!editingCommentId) return;

    try {
      const sanitizedContent = validateAndSanitizeInput(editContent.trim(), 1000);
      if (!sanitizedContent || sanitizedContent === '<p><br></p>') {
        showToast.error('댓글 내용을 입력해주세요.');
        return;
      }

      updateCommentMutation.mutate({
        comment_id: editingCommentId,
        content: sanitizedContent,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '입력값 검증에 실패했습니다.';
      showToast.error(errorMessage);
    }
  };

  // 댓글 삭제 핸들러
  const handleDeleteComment = () => {
    if (!commentToDelete) return;
    deleteCommentMutation.mutate({ comment_id: commentToDelete });
  };

  // 수정 모드 시작
  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment.comment_id);
    setEditContent(comment.content);
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  // 댓글 아이템 렌더링
  const renderComment = (comment: Comment & { replies?: Comment[] }, isReply = false) => {
    const isOwner = userInfo?.user_id === comment.user_id;
    const isEditing = editingCommentId === comment.comment_id;
    const isReplying = replyingToCommentId === comment.comment_id;

    return (
      <Box key={comment.comment_id} sx={{ ml: isReply ? 4 : 0, mb: 2 }}>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {comment.user_name?.[0] || comment.user_id[0] || 'U'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {comment.user_name || comment.user_id}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {comment.crt_date
                    ? new Date(comment.crt_date).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </Typography>
              </Stack>

              {isEditing ? (
                <Box sx={{ mb: 2 }}>
                  <RichTextEditor
                    value={editContent}
                    onChange={setEditContent}
                    placeholder="댓글을 수정하세요..."
                  />
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" variant="contained" onClick={handleUpdateComment}>
                      수정
                    </Button>
                    <Button size="small" variant="outlined" onClick={handleCancelEdit}>
                      취소
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <>
                  <RichTextDisplay content={comment.content} />
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    {!isReply && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setReplyingToCommentId(comment.comment_id);
                          setReplyContent('');
                        }}
                      >
                        <ReplyIcon fontSize="small" />
                      </IconButton>
                    )}
                    {isOwner && (
                      <>
                        <IconButton size="small" onClick={() => handleStartEdit(comment)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setCommentToDelete(comment.comment_id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Stack>
                </>
              )}

              {/* 대댓글 입력 폼 */}
              {isReplying && (
                <Box sx={{ mt: 2, ml: 2 }}>
                  <RichTextEditor
                    value={replyContent}
                    onChange={setReplyContent}
                    placeholder="대댓글을 입력하세요..."
                  />
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" variant="contained" onClick={() => handleSaveReply(comment.comment_id)}>
                      등록
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setReplyingToCommentId(null);
                        setReplyContent('');
                      }}
                    >
                      취소
                    </Button>
                  </Stack>
                </Box>
              )}

              {/* 대댓글 목록 */}
              {comment.replies && comment.replies.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {comment.replies.map((reply) => renderComment(reply, true))}
                </Box>
              )}
            </Box>
          </Stack>
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        댓글 ({commentListQuery.data?.list?.length || 0})
      </Typography>

      {/* 댓글 입력 폼 */}
      {userInfo ? (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <RichTextEditor
            value={newComment}
            onChange={setNewComment}
            placeholder="댓글을 입력하세요..."
          />
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button variant="contained" startIcon={<SendIcon />} onClick={handleSaveComment}>
              등록
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          댓글을 작성하려면 로그인이 필요합니다.
        </Alert>
      )}

      {/* 댓글 목록 */}
      {commentListQuery.isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : commentListQuery.isError ? (
        <Alert severity="error">댓글을 불러오는 중 오류가 발생했습니다.</Alert>
      ) : organizedComments.length === 0 ? (
        <Alert severity="info">아직 댓글이 없습니다.</Alert>
      ) : (
        <Box>{organizedComments.map((comment) => renderComment(comment))}</Box>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>댓글 삭제</DialogTitle>
        <DialogContent>
          <Typography>정말 이 댓글을 삭제하시겠습니까?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeleteComment} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

