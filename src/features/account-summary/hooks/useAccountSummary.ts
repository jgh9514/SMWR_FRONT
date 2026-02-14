import { useApiMutation } from '@/hooks/api/useApiMutation';
import { useApiQuery } from '@/hooks/api/useApiQuery';
import axiosInstance from '@/shared/lib/axios';
import type { ApiResponse } from '@/shared/lib/api/types';
import type {
  AccountSummaryUploadResult,
  LatestImportResponse,
  ImportListItem,
  ImportDetailResponse,
  PagedItems,
  SwexMonsterItem,
  SwexMonsterCatalogItem,
  SwexRuneItem,
  RuneScoreSummaryResponse,
} from '@/features/account-summary/types/account-summary';

export const useAccountSummaryUpload = (
  options?: Omit<Parameters<typeof useApiMutation<AccountSummaryUploadResult, File>>[0], 'mutationFn'>,
) => {
  return useApiMutation<AccountSummaryUploadResult, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('json_file', file);
      // 백엔드: /api/v1/summonerswar/account-summary/upload
      // apiClient는 result=FAIL도 throw하지 않아서 "성공처럼 보이는" 문제가 생길 수 있어
      // 여기서는 직접 ApiResponse를 검사해서 FAIL이면 예외로 처리한다.
      const res = await axiosInstance.post<ApiResponse<AccountSummaryUploadResult>>(
        '/summonerswar/account-summary/upload',
        formData,
      );

      const body = res.data as ApiResponse<AccountSummaryUploadResult> | AccountSummaryUploadResult;
      if (body && typeof body === 'object' && 'result' in body) {
        if (body.result !== 'SUCCESS') {
          const message = (body as any).message || '업로드에 실패했습니다.';
          throw new Error(message);
        }
        if ((body as any).data) {
          return (body as any).data as AccountSummaryUploadResult;
        }
      }

      return body as AccountSummaryUploadResult;
    },
    ...options,
  });
};

export const useLatestAccountSummaryImport = (options?: { enabled?: boolean }) => {
  return useApiQuery<LatestImportResponse>({
    queryKey: ['/summonerswar/account-summary/latest'],
    queryFn: async () => {
      const res = await axiosInstance.post<ApiResponse<LatestImportResponse> | LatestImportResponse>(
        '/summonerswar/account-summary/latest',
        {},
      );
      // latest는 wrapper 없이도 내려오므로 그대로 반환
      return res.data as LatestImportResponse;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useAccountSummaryImportList = (options?: { enabled?: boolean }) => {
  return useApiQuery<ImportListItem[]>({
    queryKey: ['/summonerswar/account-summary/import-list'],
    queryFn: async () => {
      const res = await axiosInstance.post<ApiResponse<ImportListItem[]> | ImportListItem[]>(
        '/summonerswar/account-summary/import-list',
        {},
      );
      return res.data as ImportListItem[];
    },
    enabled: options?.enabled ?? true,
  });
};

export const useAccountSummaryImportDetail = (
  params: { import_id: number },
  options?: { enabled?: boolean },
) => {
  return useApiQuery<ImportDetailResponse>({
    queryKey: ['/summonerswar/account-summary/import-detail', params],
    queryFn: async () => {
      const res = await axiosInstance.post<ApiResponse<ImportDetailResponse> | ImportDetailResponse>(
        '/summonerswar/account-summary/import-detail',
        params,
      );
      return res.data as ImportDetailResponse;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useSwexMonsterList = (
  params: { import_id?: number; limit?: number; offset?: number },
  options?: { enabled?: boolean },
) => {
  return useApiQuery<PagedItems<SwexMonsterItem>>({
    queryKey: ['/summonerswar/account-summary/monster-list', params],
    queryFn: async () => {
      const res = await axiosInstance.post<ApiResponse<PagedItems<SwexMonsterItem>> | PagedItems<SwexMonsterItem>>(
        '/summonerswar/account-summary/monster-list',
        params,
      );
      return res.data as PagedItems<SwexMonsterItem>;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useSwexMonsterCatalog = (
  params: { import_id?: number; limit?: number; offset?: number; monster_elemental?: string; keyword?: string },
  options?: { enabled?: boolean },
) => {
  return useApiQuery<PagedItems<SwexMonsterCatalogItem>>({
    queryKey: ['/summonerswar/account-summary/monster-catalog', params],
    queryFn: async () => {
      const res = await axiosInstance.post<
        ApiResponse<PagedItems<SwexMonsterCatalogItem>> | PagedItems<SwexMonsterCatalogItem>
      >('/summonerswar/account-summary/monster-catalog', params);
      return res.data as PagedItems<SwexMonsterCatalogItem>;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useSwexRuneList = (
  params: { import_id?: number; limit?: number; offset?: number },
  options?: { enabled?: boolean },
) => {
  return useApiQuery<PagedItems<SwexRuneItem>>({
    queryKey: ['/summonerswar/account-summary/rune-list', params],
    queryFn: async () => {
      const res = await axiosInstance.post<ApiResponse<PagedItems<SwexRuneItem>> | PagedItems<SwexRuneItem>>(
        '/summonerswar/account-summary/rune-list',
        params,
      );
      return res.data as PagedItems<SwexRuneItem>;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useRuneScoreSummary = (
  params: { import_id: number },
  options?: { enabled?: boolean },
) => {
  return useApiQuery<RuneScoreSummaryResponse>({
    queryKey: ['/summonerswar/account-summary/rune-score-summary', params],
    queryFn: async () => {
      const res = await axiosInstance.post<ApiResponse<RuneScoreSummaryResponse> | RuneScoreSummaryResponse>(
        '/summonerswar/account-summary/rune-score-summary',
        params,
      );
      return res.data as RuneScoreSummaryResponse;
    },
    enabled: options?.enabled ?? true,
  });
};


