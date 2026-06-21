/**
 * API 클라이언트
 */

import type { AxiosRequestConfig } from 'axios';
import axiosInstance from '@/shared/lib/axios';
import type { ApiResponse } from './types';

class ApiClient {
  /**
   * POST 요청 (timeout 등 axios 설정이 필요하면 config 전달)
   */
  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.post<ApiResponse<T>>(url, data, config);
    return this.extractData(response.data, response.status);
  }

  /**
   * GET 요청
   */
  async get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await axiosInstance.get<ApiResponse<T>>(url, { params });
    return this.extractData(response.data, response.status);
  }

  /**
   * PUT 요청
   */
  async put<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await axiosInstance.put<ApiResponse<T>>(url, data);
    return this.extractData(response.data, response.status);
  }

  /**
   * DELETE 요청
   */
  async delete<T = unknown>(url: string, data?: unknown): Promise<T> {
    // DELETE 요청에서 body를 전송하기 위해 data 옵션 사용
    const response = await axiosInstance.delete<ApiResponse<T>>(url, { data });
    return this.extractData(response.data, response.status);
  }

  /**
   * 응답 데이터 추출
   * - `result` / `success` 필드가 있으면 ApiResult·{ result, data } 래퍼 — unwrap 하지 않음
   * - `{ result: "SUCCESS", data: null }` 에서 data:null 만 반환하면 isApiSuccess가 깨짐 → 절대 unwrap 금지
   * - plain string "SUCCESS" / 배열 / Map 은 그대로 반환
   */
  private extractData<T>(response: ApiResponse<T> | T, httpStatus?: number): T {
    if (response === '' || response === null || response === undefined) {
      if (httpStatus != null && httpStatus >= 200 && httpStatus < 300) {
        return { result: 'SUCCESS' } as unknown as T;
      }
      return response as T;
    }

    if (typeof response === 'string') {
      const trimmed = response.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return this.extractData(JSON.parse(trimmed) as ApiResponse<T> | T, httpStatus);
        } catch {
          // plain text (예: "SUCCESS")
        }
      }
      return response as unknown as T;
    }

    if (Array.isArray(response)) {
      return response as unknown as T;
    }

    if (typeof response === 'object' && response !== null) {
      if ('result' in response || 'success' in response) {
        return response as unknown as T;
      }
    }

    return response as T;
  }
}

export const apiClient = new ApiClient();
