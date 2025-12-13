import type { CodeGroups, SearchData, SearchDataValue } from '@/shared/types/util';

/**
 * 값이 null, undefined 또는 빈 문자열인지 확인하는 함수
 */
export const isEmpty = (value: unknown): boolean => {
  if (typeof value === "undefined" || value == undefined || value == null || value === "") return true;
  return false;
}

/**
 * 값이 유효한지 확인하는 함수
 */
export const hasValue = (value: unknown): boolean => {
  if (isEmpty(value)) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return false;
  return true;
}

/**
 * 값이 없을 경우 기본값을 반환하는 함수
 */
export const nvl = <T>(value: unknown, defaultValue: T): T => {
  return hasValue(value) ? (value as T) : defaultValue;
}

interface CodeItem {
  cd: string;
  cd_nm: string;
  up_cd?: string;
}

interface CodeResponse {
  [key: string]: CodeItem[];
}

type ApiPostFunction = (url: string, data: unknown) => Promise<CodeResponse>;

export const getCommonCodeArray = async (
  codeGroups: CodeGroups,
  apiPost?: ApiPostFunction
): Promise<CodeGroups> => {
  const { apiClient } = await import('@/shared/lib/api/client');
  const postFn = apiPost || apiClient.post.bind(apiClient);
  
  for (const codeGroup in codeGroups) {
    const schData = {
      cd_grp_no: codeGroup,
    };
    const response = await postFn(`/comm/comm-cd`, schData);
 
    const dataArray = response[codeGroup] || [];

    codeGroups[codeGroup] = {
      cd: dataArray.map((item: CodeItem) => item.cd),
      cd_nm: dataArray.map((item: CodeItem) => item.cd_nm),
      up_cd: dataArray.map((item: CodeItem) => item.up_cd || ''),
    };
  }
  return codeGroups;
};

export interface HierarchyCodeData {
  keys: Array<[string, string]>;
  values: string[];
  tags: string[];
}

export const getCommonCodeArrayToHierarchy = async (
  codeGroup: string,
  apiPost?: ApiPostFunction
): Promise<HierarchyCodeData> => {
  const { apiClient } = await import('@/shared/lib/api/client');
  const postFn = apiPost || apiClient.post.bind(apiClient);
  
  const schData = {
    cd_grp_no: codeGroup
  };
  const response = await postFn(`/comm/comm-cd`, schData);
  
  const dataArray = response[codeGroup] || [];
  
  const returnData: HierarchyCodeData = {  
    keys: [],
    values: [],
    tags: []
  };
  returnData.tags = dataArray.map((item: CodeItem) => item.cd);
  returnData.values = dataArray.map((item: CodeItem) => item.cd_nm);
  returnData.keys = dataArray.map((item: CodeItem) => [item.up_cd || '', item.cd]);
  return returnData;
}

/**
 * 검색 데이터 추출
 */
export const searchDataExtraction = (schDatas: SearchData): Record<string, unknown> => {
  const extractedData: Record<string, unknown> = {};

  for (const key in schDatas) {
    const value = schDatas[key];
    if (!value && value !== 0) continue;

    if (typeof value === 'object' && value !== null && 'value' in value) {
      const searchDataValue = value as SearchDataValue;
      extractedData[key] = searchDataValue.value !== undefined 
        ? searchDataValue.value 
        : value;
    } else {
      extractedData[key] = value;
    }
  }

  return extractedData;
};

/**
 * RTA 레이팅 색상 계산 (Vue와 동일한 로직)
 * @param rating 레이팅 값 (number, string 또는 undefined)
 * @returns 색상 코드
 */
export const getRatingColor = (rating: number | string | undefined): string => {
  if (rating === undefined || rating === null) return '#999';
  const ratingNum = typeof rating === 'string' ? parseInt(rating, 10) : Math.floor(rating);
  if (isNaN(ratingNum)) return '#999';
  
  if (ratingNum >= 4000) return '#ff3e00';
  if (ratingNum >= 3000) return '#00baad';
  if (ratingNum >= 2000) return '#ffc300';
  return '#999';
};

/**
 * RTA 레이팅 별 개수 계산 (Vue와 동일한 로직)
 * onesDigit를 사용하고 최대 3개까지만 표시
 * @param rating 레이팅 값 (number, string 또는 undefined)
 * @returns 별 개수 (0~3)
 */
export const getRatingStars = (rating: number | string | undefined): number => {
  if (rating === undefined || rating === null) return 0;
  const ratingNum = typeof rating === 'string' ? parseInt(rating, 10) : Math.floor(rating);
  if (isNaN(ratingNum)) return 0;
  
  const onesDigit = ratingNum % 10;
  return Math.min(Math.max(onesDigit, 0), 3); // 0~3 범위로 제한
};

