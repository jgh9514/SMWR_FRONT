'use client';

import { useState, useCallback } from 'react';

interface UseServerPaginationOptions {
  initialPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
}

interface UseServerPaginationReturn {
  currentPage: number;
  itemsPerPage: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  reset: () => void;
  paginationParams: {
    paging: number;
    offset: number;
  };
}

/**
 * 서버 사이드 페이지네이션 훅
 * @param options - 페이지네이션 옵션
 */
export function useServerPagination(
  options: UseServerPaginationOptions = {},
): UseServerPaginationReturn {
  const {
    initialPage = 1,
    itemsPerPage = 10,
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);

  const setPage = useCallback((page: number) => {
    if (page >= 1) {
      setCurrentPage(page);
    }
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    // totalItems가 있으면 계산, 없으면 현재 페이지 유지
    if (options.totalItems) {
      const totalPages = Math.ceil(options.totalItems / itemsPerPage);
      setCurrentPage(totalPages);
    }
  }, [options.totalItems, itemsPerPage]);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  const paginationParams = {
    paging: itemsPerPage,
    offset: currentPage,
  };

  return {
    currentPage,
    itemsPerPage,
    setPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    reset,
    paginationParams,
  };
}

