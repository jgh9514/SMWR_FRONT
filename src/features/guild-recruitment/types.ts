export interface GuildRecruitmentListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface GuildRecruitmentRow {
  post_id: number | string;
  user_id?: string;
  guild_name: string;
  server_name: string;
  last_season_grade: string;
  thumbnail_url?: string;
  content_preview?: string;
  crt_date?: string;
  upt_date?: string;
  user_name?: string;
}

export interface GuildRecruitmentListResponse {
  list: GuildRecruitmentRow[];
  total: number;
  page: number;
  limit: number;
}

export interface GuildRecruitmentDetail extends GuildRecruitmentRow {
  content: string;
}

export interface GuildRecruitmentSaveParams {
  post_id?: string | number;
  guild_name: string;
  server_name: string;
  last_season_grade: string;
  thumbnail_url?: string;
  content: string;
}

export interface GuildRecruitmentSaveResponse {
  result: string;
  message?: string;
  post_id?: string | number;
}

export interface GuildRecruitmentImageUploadResponse {
  result: string;
  url?: string;
  message?: string;
}
