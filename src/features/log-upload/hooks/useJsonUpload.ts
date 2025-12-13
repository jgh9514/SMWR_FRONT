/**
 * JSON 업로드 관련 Hook
 */

import { useApiMutation } from '@/hooks/api/useApiMutation';
import { apiClient } from '@/shared/lib/api/client';
import { SiegeUploadResponse, ArenaUploadResponse } from '@/types';
import type {
  SiegeItem,
  SiegeValidationResponse,
  SiegeSaveRequest,
} from '@/features/log-upload/types/log-upload';

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
 * JSON 문자열인지 확인하는 유틸리티 함수
 */
const isJSON = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * 파일에서 log_list 추출하는 유틸리티 함수
 */
const extractLogList = (jsonData: any): any[] => {
  if (Array.isArray(jsonData)) {
    return jsonData;
  } else if (jsonData.log_list && Array.isArray(jsonData.log_list)) {
    return jsonData.log_list;
  } else {
    return [jsonData];
  }
};

/**
 * 점령전 validation (중복 체크) Mutation
 */
export const useSiegeValidation = (
  options?: Parameters<typeof useApiMutation<SiegeValidationResponse, File>>[0],
) => {
  return useApiMutation<SiegeValidationResponse, File>({
    mutationFn: async (file: File) => {
      // 파일을 읽어서 JSON으로 파싱
      const text = await readFileAsText(file);
      const jsonData = JSON.parse(text);
      const logList = extractLogList(jsonData);
      
      // Validation API 호출 (중복 체크만 수행)
      const payload = {
        log_list: logList,
      };
      
      const response = await apiClient.post<SiegeValidationResponse>(
        '/summonerswar/siege-validate',
        payload,
      );
      
      // 파일에서 기본 정보 추출 (백엔드가 반환하지 않는 경우)
      if (!response.siegeItems || response.siegeItems.length === 0) {
        const siegeItems: SiegeItem[] = [];
        let totalBattleCount = 0;
        
        logList.forEach((item: any, index: number) => {
          const guildInfoList = item.guild_info_list || [];
          const battleLogList = item.battle_log_list || [];
          
          if (guildInfoList.length > 0) {
            const firstGuildInfo = guildInfoList[0];
            const battleCount = battleLogList.length;
            totalBattleCount += battleCount;
            
            // 3파전 길드 정보 추출 (1등, 2등, 3등)
            const guilds = guildInfoList.map((guildInfo: any) => ({
              guildId: guildInfo.guild_id?.toString(),
              guildName: guildInfo.guild_name?.toString(),
              rating: guildInfo.rating_id,
              matchRank: guildInfo.match_rank?.toString(),
            }));
            
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
  options?: Parameters<typeof useApiMutation<SiegeUploadResponse, SiegeSaveRequest>>[0],
) => {
  return useApiMutation<SiegeUploadResponse, SiegeSaveRequest>({
    mutationFn: async (request: SiegeSaveRequest) => {
      const response = await apiClient.post<SiegeUploadResponse>(
        '/summonerswar/siege-upload',
        request,
      );
      
      return response;
    },
    ...options,
  });
};

/**
 * 점령전 로그 업로드 Mutation (하위 호환성을 위해 유지)
 * @deprecated useSiegeValidation과 useSiegeSave를 사용하세요
 */
export const useSiegeUpload = (
  options?: Parameters<typeof useApiMutation<SiegeUploadResponse, File>>[0],
) => {
  return useApiMutation<SiegeUploadResponse, File>({
    mutationFn: async (file: File) => {
      // 파일을 읽어서 JSON으로 파싱
      const text = await readFileAsText(file);
      const jsonData = JSON.parse(text);
      const logList = extractLogList(jsonData);
      
      const payload = {
        log_list: logList,
      };
      
      const response = await apiClient.post<any>('/summonerswar/siege-upload', payload);
      
      // 파일에서 통계 계산
      const siegeItems: SiegeItem[] = [];
      let totalBattleCount = 0;
      
      logList.forEach((item: any, index: number) => {
        const guildInfoList = item.guild_info_list || [];
        const battleLogList = item.battle_log_list || [];
        
        if (guildInfoList.length > 0) {
          const firstGuildInfo = guildInfoList[0];
          const battleCount = battleLogList.length;
          totalBattleCount += battleCount;
          
          // 3파전 길드 정보 추출 (1등, 2등, 3등)
          const guilds = guildInfoList.map((guildInfo: any) => ({
            guildId: guildInfo.guild_id?.toString(),
            guildName: guildInfo.guild_name?.toString(),
            rating: guildInfo.rating_id,
            matchRank: guildInfo.match_rank?.toString(),
          }));
          
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

/**
 * 실레나 로그 업로드 Mutation
 * 원본 Vue 파일의 로직을 따라줌:
 * 1. 파일을 줄 단위로 파싱
 * 2. getRankerRtpvpReplayList 명령어만 추출
 * 3. rid 기준으로 중복 제거
 */
export const useArenaUpload = (
  options?: Parameters<typeof useApiMutation<ArenaUploadResponse, File>>[0],
) => {
  return useApiMutation<ArenaUploadResponse, File>({
    mutationFn: async (file: File) => {
      // 파일을 텍스트로 읽기
      const text = await readFileAsText(file);
      
      // 줄 단위로 분리
      const jsonArray = text.split('\r\n');
      const jsonObjects: any[] = [];
      const uniqueObjects: Record<string, boolean> = {};
      
      // 각 줄을 파싱하여 실레나 데이터 추출
      jsonArray.forEach((item) => {
        if (isJSON(item)) {
          try {
            const jsonData = JSON.parse(item);
            // getRankerRtpvpReplayList 명령어인 경우만 추출
            if (
              jsonData.command === 'getRankerRtpvpReplayList' &&
              jsonData.ranker_replay_list !== undefined
            ) {
              jsonData.ranker_replay_list.forEach((obj: any) => {
                // rid 기준으로 중복 제거
                if (!uniqueObjects[obj.rid]) {
                  uniqueObjects[obj.rid] = true;
                  jsonObjects.push(obj);
                }
              });
            }
          } catch (e) {
            // JSON 파싱 실패 시 무시
          }
        }
      });
      
      // 백엔드가 기대하는 형식으로 변환
      const payload = {
        arenaJson: jsonObjects,
      };
      
      return apiClient.post<ArenaUploadResponse>('/summonerswar/rta-upload', payload);
    },
    ...options,
  });
};

