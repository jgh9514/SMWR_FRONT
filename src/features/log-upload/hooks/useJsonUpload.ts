/**
 * JSON 업로드 관련 Hook
 */

export { extractSiegeLogListFromFileText } from '@/features/log-upload/utils/extractSiegeLogList';
export {
  extractRankerReplayItemsFromLogText,
  type ArenaReplayItem,
} from '@/features/log-upload/utils/extractRankerRtpvpReplayList';

import { useApiMutation } from '@/hooks/api/useApiMutation';
import { apiClient } from '@/shared/lib/api/client';
import { RTA_UPLOAD_TIMEOUT_MS } from '@/shared/constants';
import { SiegeUploadResponse, ArenaUploadResponse } from '@/types';
import type {
  SiegeItem,
  SiegeValidationResponse,
  SiegeSaveRequest,
  GuildInfo,
} from '@/features/log-upload/types/log-upload';
import {
  extractSiegeLogListFromFileText,
  type RawGuildInfo,
} from '@/features/log-upload/utils/extractSiegeLogList';
import {
  chunkArray,
  remapSiegeOptionsForChunk,
  SIEGE_LOG_CHUNK_SIZE,
} from '@/features/log-upload/utils/siegeUploadChunks';
import {
  extractRankerReplayItemsFromLogText,
  normalizeRidKey,
  type ArenaReplayItem,
} from '@/features/log-upload/utils/extractRankerRtpvpReplayList';

/** 실레나 rta-upload 요청 분할 — 청크가 크면 한 요청이 30초를 넘겨 조용히 끊길 수 있어 작게 유지 */
export const RTA_UPLOAD_CHUNK_SIZE = 15;

export type ArenaUploadInput =
  | File
  | {
      /** 단일 또는 여러 로그 파일 — 전부 읽어 `\n`으로 이어 붙인 뒤 추출 */
      file?: File | File[];
      /** 붙여 넣기 버퍼 등 병합 */
      extraText?: string;
      /** 세션에 기록된 rid는 업로드 목록에서 제외 */
      skipLocalUploadedRids?: boolean;
      /** skipLocalUploadedRids 일 때 사용 (이 페이지 메모리, 새로고침 시 초기화) */
      skipUploadedRidSet?: Set<string>;
      /** 업로드 성공 시(fail===0) 응답에 recordedRids 포함 */
      recordRidsOnFullSuccess?: boolean;
    };

/**
 * 파일을 읽어서 텍스트로 반환하는 유틸리티 함수
 */
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsText(file);
  });
};

/**
 * 파일에서 log_list 추출하는 유틸리티 함수
 */
const toGuildInfo = (guildInfo: RawGuildInfo): GuildInfo => ({
  guildId: guildInfo.guild_id?.toString(),
  guildName: guildInfo.guild_name?.toString(),
  rating: guildInfo.rating_id,
  matchRank: guildInfo.match_rank?.toString(),
});

/**
 * 점령전 validation (중복 체크) Mutation
 */
export const useSiegeValidation = (
  options?: Omit<Parameters<typeof useApiMutation<SiegeValidationResponse, File>>[0], 'mutationFn'>,
) => {
  return useApiMutation<SiegeValidationResponse, File>({
    mutationFn: async (file: File) => {
      const text = await readFileAsText(file);
      const logList = extractSiegeLogListFromFileText(text);
      if (logList.length === 0) {
        throw new Error(
          'GetGuildSiegeBattleLog 형식의 전투 로그가 없습니다. 랭킹 응답만 있거나 파일 형식을 확인해 주세요.',
        );
      }

      // Validation API 호출 (중복 체크만 수행)
      const chunks = chunkArray(logList, SIEGE_LOG_CHUNK_SIZE);
      let response: SiegeValidationResponse;

      if (chunks.length === 1) {
        response = await apiClient.post<SiegeValidationResponse>('/summonerswar/siege-validate', {
          log_list: logList,
        });
      } else {
        let totalBattleCount = 0;
        const siegeItemsMerged: SiegeItem[] = [];
        for (let c = 0; c < chunks.length; c++) {
          const base = c * SIEGE_LOG_CHUNK_SIZE;
          const chunk = chunks[c];
          const part = await apiClient.post<SiegeValidationResponse>('/summonerswar/siege-validate', {
            log_list: chunk,
          });
          totalBattleCount += part.totalBattleCount ?? 0;
          const items = part.siegeItems ?? [];
          for (const it of items) {
            const idx = it.index;
            siegeItemsMerged.push({
              ...it,
              index: idx !== undefined ? base + idx : undefined,
            });
          }
        }
        response = {
          totalSiegeCount: logList.length,
          totalBattleCount,
          siegeItems: siegeItemsMerged,
        };
      }

      // 파일에서 기본 정보 추출 (백엔드가 반환하지 않는 경우)
      if (!response.siegeItems || response.siegeItems.length === 0) {
        const siegeItems: SiegeItem[] = [];
        let totalBattleCount = 0;
        
        logList.forEach((item, index) => {
          const guildInfoList = item.guild_info_list || [];
          const battleLogList = item.battle_log_list || [];
          
          if (guildInfoList.length > 0) {
            const firstGuildInfo = guildInfoList[0];
            const battleCount = battleLogList.length;
            totalBattleCount += battleCount;
            
            // 3파전 길드 정보 추출 (1등, 2등, 3등)
            const guilds = guildInfoList.map(toGuildInfo);
            
            siegeItems.push({
              siegeId: firstGuildInfo.siege_id?.toString(),
              matchId: firstGuildInfo.match_id?.toString(),
              timestamp: firstGuildInfo.log_timestamp?.toString(),
              battleCount,
              isDuplicate: false, // 백엔드에서 확인 필요
              status: 'pending',
              index,
              guilds,
            });
          }
        });
        
        return {
          totalSiegeCount: logList.length,
          totalBattleCount,
          siegeItems,
        };
      }
      
      return response;
    },
    ...options,
  });
};

/**
 * 점령전 저장 Mutation (선택한 옵션과 함께)
 */
export const useSiegeSave = (
  options?: Omit<Parameters<typeof useApiMutation<SiegeUploadResponse, SiegeSaveRequest>>[0], 'mutationFn'>,
) => {
  return useApiMutation<SiegeUploadResponse, SiegeSaveRequest>({
    mutationFn: async (request: SiegeSaveRequest) => {
      const list = request.log_list ?? [];
      const chunks = chunkArray(list, SIEGE_LOG_CHUNK_SIZE);

      if (chunks.length === 1) {
        return apiClient.post<SiegeUploadResponse>('/summonerswar/siege-upload', request);
      }

      let insertedSiegeCount = 0;
      let insertedBattleCount = 0;
      let totalBattleCountSum = 0;
      let last: SiegeUploadResponse | undefined;

      for (let c = 0; c < chunks.length; c++) {
        const base = c * SIEGE_LOG_CHUNK_SIZE;
        const chunk = chunks[c];
        const payload: SiegeSaveRequest = {
          log_list: chunk,
          siegeOptions: remapSiegeOptionsForChunk(request.siegeOptions, base, chunk.length),
        };
        last = await apiClient.post<SiegeUploadResponse>('/summonerswar/siege-upload', payload);
        insertedSiegeCount += last.insertedSiegeCount ?? 0;
        insertedBattleCount += last.insertedBattleCount ?? 0;
        totalBattleCountSum += last.totalBattleCount ?? 0;
      }

      return {
        ...last,
        totalSiegeCount: list.length,
        totalBattleCount: totalBattleCountSum,
        insertedSiegeCount,
        insertedBattleCount,
      } as SiegeUploadResponse;
    },
    ...options,
  });
};

/**
 * 점령전 로그 업로드 Mutation (하위 호환성을 위해 유지)
 * @deprecated useSiegeValidation과 useSiegeSave를 사용하세요
 */
export const useSiegeUpload = (
  options?: Omit<Parameters<typeof useApiMutation<SiegeUploadResponse, File>>[0], 'mutationFn'>,
) => {
  return useApiMutation<SiegeUploadResponse, File>({
    mutationFn: async (file: File) => {
      const text = await readFileAsText(file);
      const logList = extractSiegeLogListFromFileText(text);
      if (logList.length === 0) {
        throw new Error(
          'GetGuildSiegeBattleLog 형식의 전투 로그가 없습니다. 랭킹 응답만 있거나 파일 형식을 확인해 주세요.',
        );
      }

      const payload = {
        log_list: logList,
      };

      const response = await apiClient.post<SiegeUploadResponse>('/summonerswar/siege-upload', payload);
      
      // 파일에서 통계 계산
      const siegeItems: SiegeItem[] = [];
      let totalBattleCount = 0;
      
      logList.forEach((item, index) => {
        const guildInfoList = item.guild_info_list || [];
        const battleLogList = item.battle_log_list || [];
        
        if (guildInfoList.length > 0) {
          const firstGuildInfo = guildInfoList[0];
          const battleCount = battleLogList.length;
          totalBattleCount += battleCount;
          
          // 3파전 길드 정보 추출 (1등, 2등, 3등)
          const guilds = guildInfoList.map(toGuildInfo);
          
          siegeItems.push({
            siegeId: firstGuildInfo.siege_id?.toString(),
            matchId: firstGuildInfo.match_id?.toString(),
            timestamp: firstGuildInfo.log_timestamp?.toString(),
            battleCount,
            isDuplicate: false,
            status: 'pending',
            index,
            guilds,
          });
        }
      });
      
      if (response && typeof response === 'object' && 'totalSiegeCount' in response) {
        return {
          ...response,
          siegeItems,
        } as SiegeUploadResponse;
      }
      
      return {
        totalSiegeCount: logList.length,
        insertedSiegeCount: logList.length,
        totalBattleCount,
        insertedBattleCount: totalBattleCount,
        siegeItems,
      } as SiegeUploadResponse;
    },
    ...options,
  });
};

async function postArenaChunks(items: ArenaReplayItem[]): Promise<ArenaUploadResponse> {
  let success = 0;
  let fail = 0;
  for (let i = 0; i < items.length; i += RTA_UPLOAD_CHUNK_SIZE) {
    const chunk = items.slice(i, i + RTA_UPLOAD_CHUNK_SIZE);
    const r = await apiClient.post<ArenaUploadResponse>(
      '/summonerswar/rta-upload',
      { arenaJson: chunk },
      { timeout: RTA_UPLOAD_TIMEOUT_MS },
    );
    success += r.success ?? 0;
    fail += r.fail ?? 0;
  }
  return { success, fail };
}

/**
 * 실레나 로그 업로드 Mutation
 * - getRankerRtpvpReplayList / getRtpvpRatingReplayList 추출 (NDJSON / API Command+Response)
 * - rid 기준 파일 내 중복 제거
 * - 청크 업로드(버퍼링)
 * - 옵션: 세션 rid 집합 제외, 전체 성공 시 recordedRids 반환
 */
export const useArenaUpload = (
  options?: Omit<Parameters<typeof useApiMutation<ArenaUploadResponse, ArenaUploadInput>>[0], 'mutationFn'>,
) => {
  return useApiMutation<ArenaUploadResponse, ArenaUploadInput>({
    mutationFn: async (input: ArenaUploadInput) => {
      let text = '';
      let recordRids = false;
      let skipLocal = false;
      let sessionSkipSet: Set<string> | undefined;

      if (input instanceof File) {
        text = await readFileAsText(input);
      } else {
        if (!input.file && !(input.extraText && input.extraText.trim())) {
          throw new Error('파일을 선택하거나 버퍼에 로그를 추가해 주세요.');
        }
        recordRids = input.recordRidsOnFullSuccess === true;
        skipLocal = input.skipLocalUploadedRids === true;
        sessionSkipSet = input.skipUploadedRidSet;
        const parts: string[] = [];
        if (input.file) {
          const files = Array.isArray(input.file) ? input.file : [input.file];
          for (const f of files) {
            parts.push(await readFileAsText(f));
          }
        }
        if (input.extraText?.trim()) {
          parts.push(input.extraText);
        }
        text = parts.join('\n');
      }

      if (!text.trim()) {
        throw new Error('로그 내용이 비어 있습니다. 파일을 선택하거나 버퍼를 채워 주세요.');
      }

      let items = extractRankerReplayItemsFromLogText(text);
      if (items.length === 0) {
        throw new Error(
          'getRankerRtpvpReplayList / getRtpvpRatingReplayList 데이터가 없습니다. 프록시 로그(Response) 또는 NDJSON을 확인해 주세요.',
        );
      }

      if (skipLocal) {
        const s = sessionSkipSet ?? new Set<string>();
        items = items.filter((it) => {
          const id = normalizeRidKey(it.rid);
          return id !== '' && !s.has(id);
        });
      }
      if (items.length === 0) {
        throw new Error(
          '업로드할 신규 전투가 없습니다. (세션에 기록된 rid와 모두 겹치거나 중복만 있음)',
        );
      }

      const result = await postArenaChunks(items);

      if (recordRids && (result.fail ?? 0) === 0 && items.length > 0) {
        const recordedRids = items.map((x) => normalizeRidKey(x.rid)).filter((id) => id !== '');
        return { ...result, recordedRids };
      }

      return result;
    },
    ...options,
  });
};

