/**
 * 댓글 관련 타입 정의
 */

export type BoardType = 'NOTICE' | 'INQUIRY';

export interface Comment {
  comment_id: string;
  board_type: BoardType;
  board_id: string;
  parent_comment_id?: string | null;
  user_id: string;
  user_name?: string;
  content: string;
  del_yn: string;
  crt_date: string;
  mdf_date?: string;
  crt_user_id?: string;
  mdf_user_id?: string;
  recommend_count?: number;
  not_recommend_count?: number;
  my_vote?: string;
  replies?: Comment[]; // 대댓글 목록
}

export interface CommentListParams {
  board_type: BoardType;
  board_id: string;
}

export interface CommentListResponse {
  list: Comment[];
}

export interface CommentSaveParams {
  board_type: BoardType;
  board_id: string;
  parent_comment_id?: string;
  content: string;
}

export interface CommentUpdateParams {
  comment_id: string;
  content: string;
}

export interface CommentDeleteParams {
  comment_id: string;
}

export interface CommentResponse {
  result: string;
  message?: string;
  comment_id?: string;
}

export type CommentVoteType = 'UP' | 'DOWN' | 'CLEAR';

export interface CommentVoteParams {
  comment_id: string;
  vote: CommentVoteType;
}

