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
    return this.extractData(response.data);
  }

  /**
   * GET 요청
   */
  async get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await axiosInstance.get<ApiResponse<T>>(url, { params });
    return this.extractData(response.data);
  }

  /**
   * PUT 요청
   */
  async put<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await axiosInstance.put<ApiResponse<T>>(url, data);
    return this.extractData(response.data);
  }

  /**
   * DELETE 요청
   */
  async delete<T = unknown>(url: string, data?: unknown): Promise<T> {
    // DELETE 요청에서 body를 전송하기 위해 data 옵션 사용
    const response = await axiosInstance.delete<ApiResponse<T>>(url, { data });
    return this.extractData(response.data);
  }

  /**
   * 응답 데이터 추출
   */
  private extractData<T>(response: ApiResponse<T> | T): T {
    // 배열이 직접 반환된 경우 (예: 길드 검색)
    if (Array.isArray(response)) {
      return response as unknown as T;
    }

    // ApiResponse 형식인 경우
    if (typeof response === 'object' && response !== null && 'result' in response) {
      const apiResponse = response as ApiResponse<T>;
      // result가 SUCCESS인 경우 data 반환
      if (apiResponse.result === 'SUCCESS' && apiResponse.data !== undefined) {
        return apiResponse.data;
      }

      // data가 직접 있는 경우
      if (apiResponse.data !== undefined) {
        return apiResponse.data;
      }

      // 전체 응답 반환 (result만 있는 경우)
      return response as unknown as T;
    }

    // 그 외의 경우 (직접 데이터 반환)
    return response as unknown as T;
  }
}

export const apiClient = new ApiClient();

