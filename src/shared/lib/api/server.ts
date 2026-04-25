import 'server-only';

import { cache } from 'react';
import type {
  BattleItem,
  RecordDetailParams,
  RecordListParams,
  SeasonItem,
  UserItem,
} from '@/features/battle-history/types/battle-history';
import type { Notice, NoticeListParams, NoticeListResponse } from '@/features/community/types/community';
import type { MonsterDetail, RtaMonsterStatsResponse, RtaPlayerSummary } from '@/features/rta/types/rta';
import type { MonsterInfoResponse } from '@/features/siege/hooks/useMonsterInfo';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';
import { DEVILMON_MONSTER_ID } from '@/features/siege/lib/devilmon';
import { normalizeMonsterList } from '@/features/siege/lib/normalizeMonsterOption';
import { getMonsterImageUrl } from '@/shared/utils/image';
import type { ApiResponse } from './types';

export const PUBLIC_REVALIDATE_SECONDS = {
  monsterCatalog: 60 * 60 * 24,
  monsterDetail: 60 * 60 * 24,
  rtaStats: 60 * 10,
  rtaDetail: 60 * 10,
  battleHistory: 60 * 10,
  noticeList: 60 * 5,
  noticeDetail: 60 * 5,
} as const;

/** 몬스터 목록 API + monster-search 페이지 ISR — 별·목록 갱신 반영 */
export const MONSTER_LIST_REVALIDATE_SECONDS = 60 * 10;

const NOTICE_STATIC_PAGE_SIZE = 100;
const NOTICE_STATIC_MAX_PAGES = 10;

function normalizeApiBaseUrl(baseUrl: string): string {
  if (baseUrl.endsWith('/api/v1')) {
    return baseUrl;
  }

  if (baseUrl.includes('/api/v1')) {
    return baseUrl.replace(/\/$/, '');
  }

  return `${baseUrl.replace(/\/$/, '')}/api/v1`;
}

function getServerApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8080/api/v1';
  }

  return 'http://smw-app-service:8080/api/v1';
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getServerApiBaseUrl()}${normalizedPath}`;
}

function extractApiData<T>(response: ApiResponse<T> | T): T {
  if (Array.isArray(response)) {
    return response as T;
  }

  if (typeof response === 'object' && response !== null && 'result' in response) {
    const apiResponse = response as ApiResponse<T>;

    if (apiResponse.result === 'SUCCESS' && apiResponse.data !== undefined) {
      return apiResponse.data;
    }

    if (apiResponse.data !== undefined) {
      return apiResponse.data;
    }
  }

  return response as T;
}

type ServerApiPostOptions = {
  /**
   * POST는 Next Data Cache에 revalidate가 잘 안 먹는 경우가 있어,
   * 실시간에 가까운 통계 API에는 `no-store`를 쓴다.
   */
  cache?: 'no-store';
};

async function serverApiPost<T>(
  path: string,
  body: unknown,
  revalidate: number,
  options?: ServerApiPostOptions,
): Promise<T> {
  const useNoStore = options?.cache === 'no-store';
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(body ?? {}),
    ...(useNoStore ? { cache: 'no-store' as const } : { next: { revalidate } }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API 요청에 실패했습니다. (${response.status})`);
  }

  const json = (await response.json()) as ApiResponse<T> | T;
  return extractApiData(json);
}

function parseRecentMatches(detail: MonsterDetail): MonsterDetail {
  return {
    ...detail,
    recent_matches: (detail.recent_matches ?? []).map((match) => ({
      ...match,
      my_team: typeof match.my_team === 'string' ? JSON.parse(match.my_team) : match.my_team,
      opponent_team:
        typeof match.opponent_team === 'string' ? JSON.parse(match.opponent_team) : match.opponent_team,
    })),
  };
}

export async function getMonsterListData(): Promise<MonsterOption[]> {
  const raw = await serverApiPost<unknown[]>(
    '/summonerswar/monster-list',
    {},
    MONSTER_LIST_REVALIDATE_SECONDS,
  );
  return normalizeMonsterList(raw);
}

/** WAS는 미존재 시 빈 Map `{}`를 200으로 줄 수 있어, 필드 검증 없이 쓰면 상세 UI가 런타임 오류 남 */
function isValidMonsterInfoPayload(data: unknown): data is MonsterInfoResponse {
  if (data == null || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  const id = o.monster_id ?? o.monsterId;
  return id != null && String(id).trim() !== '';
}

/**
 * generateMetadata·페이지 본문이 같은 요청에서 동일 몬스터를 부를 때 fetch 1회로 합친다.
 */
export const getMonsterInfoData = cache(async (monsterId: string): Promise<MonsterInfoResponse | null> => {
  const trimmed = monsterId?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const data = await serverApiPost<MonsterInfoResponse>(
      '/summonerswar/monster/info',
      { monster_id: trimmed },
      PUBLIC_REVALIDATE_SECONDS.monsterDetail,
    );
    if (!isValidMonsterInfoPayload(data)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
});

/** 몬스터 목록에 없어도 `/monster/info`로 데빌몬 아이콘 URL 확보 — DB `image_url` → CloudFront(S3)와 동일하게 해석 */
export const getDevilmonImageUrlForSearch = cache(async (): Promise<string> => {
  const info = await getMonsterInfoData(DEVILMON_MONSTER_ID);
  const url = info?.image_url;
  if (url != null && String(url).trim() !== '') {
    return getMonsterImageUrl(url);
  }
  return getMonsterImageUrl('/images/default-monster.png');
});

export type GetRtaMonsterStatsParams = {
  /** 페이지 크기(기본 20, 최대 500) */
  limit?: number;
  statsOffset?: number;
  duoOffset?: number;
  trioOffset?: number;
  seasonCode?: string | null;
  ratingId?: number | null;
  ratingIds?: number[] | null;
};

export async function getRtaMonsterStatsData(
  params: GetRtaMonsterStatsParams = {},
): Promise<RtaMonsterStatsResponse> {
  const { limit = 20, statsOffset = 0, duoOffset = 0, trioOffset = 0, seasonCode, ratingId, ratingIds } = params;
  const body: Record<string, unknown> = {
    limit,
    stats_offset: statsOffset,
    duo_offset: duoOffset,
    trio_offset: trioOffset,
  };
  const c = seasonCode?.trim();
  if (c) body.seasonCode = c;
  if (ratingId != null && ratingId > 0) body.ratingId = ratingId;
  if (ratingIds != null && ratingIds.length > 0) body.ratingIds = ratingIds;
  return serverApiPost<RtaMonsterStatsResponse>(
    '/rta/monster-stats',
    body,
    PUBLIC_REVALIDATE_SECONDS.rtaStats,
    { cache: 'no-store' },
  );
}

/** 레이아웃·generateMetadata에서 동일 요청 1회로 묶기 */
export const getRtaPlayerSummaryData = cache(async (wizardId: string): Promise<RtaPlayerSummary | null> => {
  const id = wizardId?.trim();
  if (!id) {
    return null;
  }
  try {
    const path = `/rta/player/${encodeURIComponent(id)}/summary`;
    return await serverApiPost<RtaPlayerSummary>(path, {}, PUBLIC_REVALIDATE_SECONDS.rtaDetail, {
      cache: 'no-store',
    });
  } catch {
    return null;
  }
});

export async function getRtaMonsterDetailData(
  monsterId: number,
  seasonCode?: string | null,
): Promise<MonsterDetail | null> {
  if (!Number.isFinite(monsterId) || monsterId <= 0) {
    return null;
  }

  try {
    const body: Record<string, unknown> = { monster_id: monsterId };
    const c = seasonCode?.trim();
    if (c) body.seasonCode = c;
    const detail = await serverApiPost<MonsterDetail>(
      '/rta/monster-detail',
      body,
      PUBLIC_REVALIDATE_SECONDS.rtaDetail,
      { cache: 'no-store' },
    );
    return parseRecentMatches(detail);
  } catch {
    return null;
  }
}

export async function getSeasonListData(): Promise<SeasonItem[]> {
  return serverApiPost<SeasonItem[]>(
    '/summonerswar/season-list',
    {},
    PUBLIC_REVALIDATE_SECONDS.battleHistory,
  );
}

export async function getBattleHistoryListData(
  params: RecordListParams = { paging: 20, offset: 0 },
): Promise<UserItem[]> {
  const body = {
    paging: params.paging ?? 20,
    offset: params.offset ?? 0,
    ...(params.season_no != null && params.season_no !== '' && { season_no: params.season_no }),
  };
  return serverApiPost<UserItem[]>(
    '/summonerswar/record-list',
    body,
    PUBLIC_REVALIDATE_SECONDS.battleHistory,
  );
}

export async function getBattleHistoryDetailData(
  params: RecordDetailParams,
): Promise<BattleItem[]> {
  const body = {
    wizard_id: params.wizard_id,
    paging: params.paging,
    offset: params.offset,
    ...(params.season_no != null && params.season_no !== '' && { season_no: params.season_no }),
  };
  return serverApiPost<BattleItem[]>(
    '/summonerswar/record-detail',
    body,
    PUBLIC_REVALIDATE_SECONDS.battleHistory,
  );
}

export async function getNoticeListData(
  params: NoticeListParams = { page: 1, limit: 10 },
): Promise<NoticeListResponse> {
  return serverApiPost<NoticeListResponse>(
    '/community/notice/list',
    params,
    PUBLIC_REVALIDATE_SECONDS.noticeList,
  );
}

export async function getNoticeStaticListData(): Promise<Notice[]> {
  const firstPage = await getNoticeListData({
    page: 1,
    limit: NOTICE_STATIC_PAGE_SIZE,
  });

  const totalPages = Math.min(
    Math.max(Math.ceil(firstPage.total / Math.max(firstPage.limit, 1)), 1),
    NOTICE_STATIC_MAX_PAGES,
  );

  if (totalPages === 1) {
    return firstPage.list;
  }

  const additionalPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      getNoticeListData({
        page: index + 2,
        limit: firstPage.limit,
      }).catch(() => ({
        list: [],
        total: firstPage.total,
        page: index + 2,
        limit: firstPage.limit,
      })),
    ),
  );

  const deduped = new Map<string, Notice>();

  [...firstPage.list, ...additionalPages.flatMap((page) => page.list)].forEach((notice) => {
    if (notice.notice_id) {
      deduped.set(notice.notice_id, notice);
    }
  });

  return Array.from(deduped.values());
}

export async function getNoticeDetailData(noticeId: string): Promise<Notice | null> {
  if (!noticeId) {
    return null;
  }

  try {
    return await serverApiPost<Notice>(
      '/community/notice/detail',
      { notice_id: noticeId },
      PUBLIC_REVALIDATE_SECONDS.noticeDetail,
    );
  } catch {
    return null;
  }
}
