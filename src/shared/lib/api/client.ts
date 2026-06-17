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
   * - { result, message } 형태(ApiResult)는 unwrap 하지 않음
   * - { result, data } 래퍼만 data 페이로드 unwrap (data가 null이면 전체 반환)
   */
  private extractData<T>(response: ApiResponse<T> | T): T {
    if (Array.isArray(response)) {
      return response as unknown as T;
    }

    if (typeof response === 'object' && response !== null && 'result' in response) {
      // result 필드가 있으면 ApiResult·복합 응답 — unwrap 하지 않음 (isApiSuccess 판별 유지)
      return response as unknown as T;
    }

    return response as T;
  }
}

export const apiClient = new ApiClient();

